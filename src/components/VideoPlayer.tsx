'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  vastUrl?: string;
  onAdComplete?: () => void;
  onFirstPlay?: () => void;
}

// VAST XML parser - extracts media file URL from VAST response
function parseVAST(xml: string): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');

    // Look for MediaFile in the VAST response
    const mediaFile = doc.querySelector('MediaFile');
    if (mediaFile?.textContent) {
      return mediaFile.textContent.trim();
    }

    // Try Creative > Linear > MediaFile
    const linearMediaFile = doc.querySelector('Linear MediaFile');
    if (linearMediaFile?.textContent) {
      return linearMediaFile.textContent.trim();
    }

    return null;
  } catch {
    return null;
  }
}

export default function VideoPlayer({ src, poster, vastUrl, onAdComplete, onFirstPlay }: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [adPlaying, setAdPlaying] = useState(false);
  const [adCountdown, setAdCountdown] = useState(7);
  const [adSkippable, setAdSkippable] = useState(false);
  const adTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasPlayedRef = useRef(false);

  const skipAd = useCallback(() => {
    setAdPlaying(false);
    setAdCountdown(7);
    setAdSkippable(false);
    if (adTimerRef.current) {
      clearInterval(adTimerRef.current);
      adTimerRef.current = null;
    }
    onAdComplete?.();
  }, [onAdComplete]);

  // Start ad countdown
  const startAdCountdown = useCallback(() => {
    setAdPlaying(true);
    setAdCountdown(7);
    setAdSkippable(false);

    adTimerRef.current = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          if (adTimerRef.current) clearInterval(adTimerRef.current);
          setAdSkippable(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Fetch and parse VAST ad
  const fetchVASTAd = useCallback(async () => {
    if (!vastUrl) return null;
    try {
      const response = await fetch(vastUrl);
      const xml = await response.text();
      return parseVAST(xml);
    } catch (err) {
      console.error('VAST fetch error:', err);
      return null;
    }
  }, [vastUrl]);

  // Initialize video.js player
  useEffect(() => {
    if (!videoRef.current) return;

    // Destroy existing player
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    const videoElement = document.createElement('video');
    videoElement.classList.add('video-js', 'vjs-big-play-centered');
    videoRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      controls: true,
      responsive: true,
      fluid: true,
      poster: poster,
      sources: [{ src, type: src.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4' }],
    });

    // Handle first play - trigger ad
    player.on('play', async () => {
      if (!hasPlayedRef.current && vastUrl) {
        hasPlayedRef.current = true;
        player.pause();

        // Fetch VAST ad
        const adMediaUrl = await fetchVASTAd();
        if (adMediaUrl) {
          // Play the ad video
          startAdCountdown();
          // After ad completes or is skipped, resume main video
        } else {
          // If no VAST ad media found, show countdown overlay
          startAdCountdown();
        }
      }
      onFirstPlay?.();
    });

    playerRef.current = player;

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      if (adTimerRef.current) {
        clearInterval(adTimerRef.current);
      }
    };
  }, [src, poster]);

  // When ad finishes, resume main video
  useEffect(() => {
    if (!adPlaying && hasPlayedRef.current && playerRef.current) {
      playerRef.current.play().catch(() => {});
    }
  }, [adPlaying]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#e5eefc]">
      {/* Ad Overlay */}
      {adPlaying && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/96">
          <div className="max-w-[90%] max-h-[90%] overflow-auto border-2 border-dashed border-[#2563eb] bg-white rounded-xl p-4 text-center">
            <p className="text-sm text-[#64748b]">
              Ad is playing… <span className="font-bold text-[#1e40af]">{adCountdown}</span>s
            </p>
            <div className="mt-3 flex gap-2 justify-center">
              <button
                onClick={skipAd}
                disabled={!adSkippable}
                className={`px-4 py-1.5 rounded-full border text-sm transition-all ${
                  adSkippable
                    ? 'border-[#e5eefc] bg-white text-[#0b1220] cursor-pointer hover:bg-gray-50'
                    : 'border-[#e5eefc] bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {adSkippable ? 'Skip Ad' : `Wait ${adCountdown}s`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video.js container */}
      <div ref={videoRef} className="w-full" />
    </div>
  );
}
