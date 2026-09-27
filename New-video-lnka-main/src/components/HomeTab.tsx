'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VideoData, EARNING_RATES } from '@/types';
import VideoPlayer from '@/components/VideoPlayer';
import { Heart, MessageSquare, Share2, Eye, Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function HomeTab({ vastUrl }: { vastUrl: string }) {
  const { user, refreshUserData } = useAuth();
  const [videos,  setVideos]  = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const q    = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      const items: VideoData[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as VideoData));
      setVideos(items);
    } catch (err) {
      console.error('Feed load error:', err);
      toast.error('Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const handleAction = async (action: 'view' | 'like' | 'comment' | 'share', video: VideoData) => {
    if (!user) return;

    // Prevent double-like
    if (action === 'like' && likedIds.has(video.id)) {
      toast('Already liked!'); return;
    }

    const vRef = doc(db, 'videos', video.id);
    const uRef = doc(db, 'users', user.uid);

    try {
      if (action === 'view') {
        await updateDoc(vRef, { views: increment(1) });
        await updateDoc(uRef, { 'kpis.views': increment(1), 'kpis.balance': increment(EARNING_RATES.VIEW) });
        toast.success(`+Rs.${EARNING_RATES.VIEW} earned for watching!`);

      } else if (action === 'like') {
        setLikedIds(prev => new Set([...prev, video.id]));
        await updateDoc(vRef, { likes: increment(1) });
        await updateDoc(uRef, { 'kpis.likes': increment(1), 'kpis.balance': increment(EARNING_RATES.LIKE) });
        toast.success(`+Rs.${EARNING_RATES.LIKE} earned for liking!`);

      } else if (action === 'comment') {
        const text = prompt('Write your comment:');
        if (!text?.trim()) return;
        await addDoc(collection(db, 'videos', video.id, 'comments'), {
          uid: user.uid, text: text.trim(), createdAt: serverTimestamp(),
        });
        await updateDoc(vRef, { comments: increment(1) });
        await updateDoc(uRef, { 'kpis.comments': increment(1), 'kpis.balance': increment(EARNING_RATES.COMMENT) });
        toast.success(`+Rs.${EARNING_RATES.COMMENT} earned for commenting!`);

      } else if (action === 'share') {
        const url = `${window.location.origin}?video=${video.id}`;
        if (navigator.share) {
          await navigator.share({ title: video.title, url });
        } else {
          await navigator.clipboard.writeText(url);
          toast.success('Share link copied!');
        }
        return;
      }

      await refreshUserData();
      await loadFeed();
    } catch (err) {
      console.error('Action error:', err);
      toast.error('Failed. Try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]" />
        <p className="text-sm text-[#64748b]">Loading videos…</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#e8f0fd] grid place-items-center">
          <Play className="h-8 w-8 text-[#2563eb]" />
        </div>
        <p className="font-semibold text-[#0b1220]">No videos yet</p>
        <p className="text-sm text-[#64748b]">Be the first to upload!</p>
        <button
          onClick={loadFeed}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#e5eefc] text-sm text-[#2563eb] hover:bg-[#f3f7ff]"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Refresh button */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#64748b]">{videos.length} videos</p>
        <button
          onClick={loadFeed}
          className="flex items-center gap-1.5 text-xs text-[#2563eb] hover:underline"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {videos.map((video) => (
        <div
          key={video.id}
          className="bg-white border border-[#e5eefc] rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Video/Image */}
          {video.type?.startsWith('video/') ? (
            <VideoPlayer
              src={video.url}
              vastUrl={vastUrl}
              onFirstPlay={() => handleAction('view', video)}
            />
          ) : video.type?.startsWith('image/') ? (
            <img src={video.url} alt={video.title} className="w-full object-cover max-h-72" />
          ) : null}

          {/* Info */}
          <div className="px-4 pt-3 pb-1">
            <h3 className="font-semibold text-[#0b1220] text-sm leading-snug">
              {video.title || 'Untitled'}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-[#94a3b8]">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{video.views}</span>
              <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{video.likes}</span>
              <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{video.comments}</span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-0 border-t border-[#f1f5f9] mt-2">
            {[
              { icon: <Heart className="h-4 w-4" />,         label: 'Like',    action: 'like'    as const, color: likedIds.has(video.id) ? 'text-red-500' : '' },
              { icon: <MessageSquare className="h-4 w-4" />, label: 'Comment', action: 'comment' as const, color: '' },
              { icon: <Share2 className="h-4 w-4" />,        label: 'Share',   action: 'share'   as const, color: '' },
            ].map((btn) => (
              <button
                key={btn.action}
                onClick={() => handleAction(btn.action, video)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors hover:bg-[#f3f7ff] ${btn.color || 'text-[#64748b]'}`}
              >
                {btn.icon} {btn.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
