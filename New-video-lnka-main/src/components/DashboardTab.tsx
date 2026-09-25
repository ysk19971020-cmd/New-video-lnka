'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { VideoData, EARNING_RATES } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import VideoPlayer from '@/components/VideoPlayer';
import { Eye, ThumbsUp, MessageSquare, Users, Copy, Play, Heart, Share2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DashboardTab({ vastUrl }: { vastUrl: string }) {
  const { user, userData, refreshUserData } = useAuth();
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    try {
      const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      const items: VideoData[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as VideoData);
      });
      setVideos(items);
    } catch (err) {
      console.error('Feed load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const copyRefLink = () => {
    if (userData?.referralLink) {
      navigator.clipboard.writeText(userData.referralLink);
      toast.success('Referral link copied!');
    }
  };

  const handleVideoAction = async (action: 'view' | 'like' | 'comment' | 'share', videoId: string) => {
    if (!user) return;

    const vRef = doc(db, 'videos', videoId);
    const uRef = doc(db, 'users', user.uid);

    try {
      switch (action) {
        case 'view':
          await updateDoc(vRef, { views: increment(1) });
          await updateDoc(uRef, {
            'kpis.views': increment(1),
            'kpis.balance': increment(EARNING_RATES.VIEW),
          });
          toast.success(`Earned Rs.${EARNING_RATES.VIEW} for watching!`);
          break;
        case 'like':
          await updateDoc(vRef, { likes: increment(1) });
          await updateDoc(uRef, {
            'kpis.likes': increment(1),
            'kpis.balance': increment(EARNING_RATES.LIKE),
          });
          toast.success(`Earned Rs.${EARNING_RATES.LIKE} for liking!`);
          break;
        case 'comment': {
          const text = prompt('Write a comment:');
          if (text) {
            await addDoc(collection(db, 'videos', videoId, 'comments'), {
              uid: user.uid,
              text,
              createdAt: serverTimestamp(),
            });
            await updateDoc(vRef, { comments: increment(1) });
            await updateDoc(uRef, {
              'kpis.comments': increment(1),
              'kpis.balance': increment(EARNING_RATES.COMMENT),
            });
            toast.success(`Earned Rs.${EARNING_RATES.COMMENT} for commenting!`);
          }
          break;
        }
        case 'share': {
          const shareLink = `${window.location.origin}#video=${videoId}`;
          await navigator.clipboard.writeText(shareLink);
          toast.success('Share link copied!');
          break;
        }
      }

      await refreshUserData();
      await loadFeed();
    } catch (err) {
      console.error('Action error:', err);
      toast.error('Action failed. Please try again.');
    }
  };

  const kpis = userData?.kpis || { views: 0, likes: 0, comments: 0, refs: 0, balance: 0 };

  return (
    <div className="space-y-4">
      {/* Welcome & KPIs */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">ආයුබෝවන් 👋</CardTitle>
          <p className="text-sm text-[#64748b]">
            User: <span className="font-semibold">{user?.email}</span>
          </p>
        </CardHeader>
        <CardContent>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#f3f7ff] border border-[#e5eefc] p-3 rounded-xl text-center">
              <p className="text-xs text-[#64748b]">Balance (LKR)</p>
              <p className="text-lg font-bold mt-1">{kpis.balance.toFixed(2)}</p>
            </div>
            <div className="bg-[#f3f7ff] border border-[#e5eefc] p-3 rounded-xl text-center">
              <p className="text-xs text-[#64748b]">Views</p>
              <p className="text-lg font-bold mt-1">{kpis.views}</p>
            </div>
            <div className="bg-[#f3f7ff] border border-[#e5eefc] p-3 rounded-xl text-center">
              <p className="text-xs text-[#64748b]">Likes</p>
              <p className="text-lg font-bold mt-1">{kpis.likes}</p>
            </div>
            <div className="bg-[#f3f7ff] border border-[#e5eefc] p-3 rounded-xl text-center">
              <p className="text-xs text-[#64748b]">Referrals</p>
              <p className="text-lg font-bold mt-1">{kpis.refs}</p>
            </div>
          </div>

          {/* Referral Link */}
          <div className="mt-4">
            <p className="text-sm text-[#64748b] mb-1">Referral Link</p>
            <div className="flex gap-2">
              <Input
                value={userData?.referralLink || ''}
                readOnly
                className="flex-1 bg-white border-[#e5eefc] text-sm"
              />
              <Button variant="outline" size="sm" onClick={copyRefLink} className="border-[#e5eefc]">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Uploads Feed */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">මෑත Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]" />
            </div>
          ) : videos.length === 0 ? (
            <p className="text-sm text-[#64748b] text-center py-4">No uploads yet.</p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto vl-feed-scroll pr-1">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="border border-[#e5eefc] rounded-xl p-3 bg-white"
                >
                  <h4 className="font-semibold text-sm mb-1">{video.title || 'Untitled'}</h4>
                  <p className="text-xs text-[#64748b] mb-2">
                    {(video.type || 'file').split('/')[0]} • Likes {video.likes} • Views {video.views}
                  </p>

                  {video.type?.startsWith('image/') && (
                    <img
                      src={video.url}
                      alt={video.title}
                      className="max-w-full rounded-xl"
                    />
                  )}

                  {video.type?.startsWith('video/') && (
                    <div className="space-y-2">
                      <VideoPlayer
                        src={video.url}
                        vastUrl={vastUrl}
                        onFirstPlay={() => handleVideoAction('view', video.id)}
                      />
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs px-3 py-1 h-auto border-[#e5eefc]"
                          onClick={() => handleVideoAction('view', video.id)}
                        >
                          <Play className="h-3 w-3 mr-1" /> Watch
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs px-3 py-1 h-auto border-[#e5eefc]"
                          onClick={() => handleVideoAction('like', video.id)}
                        >
                          <Heart className="h-3 w-3 mr-1" /> Like
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs px-3 py-1 h-auto border-[#e5eefc]"
                          onClick={() => handleVideoAction('comment', video.id)}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" /> Comment
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-xs px-3 py-1 h-auto border-[#e5eefc]"
                          onClick={() => handleVideoAction('share', video.id)}
                        >
                          <Share2 className="h-3 w-3 mr-1" /> Share
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
