'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import VideoPlayer from '@/components/VideoPlayer';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function UploadTab({ vastUrl }: { vastUrl: string }) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);

  const handleUpload = useCallback(async () => {
    if (!file || !user) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    try {
      // Step 1: Get secure upload URL from our API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.error || 'Upload failed');
      }

      const { url } = await uploadRes.json();

      // Step 2: Save metadata to Firestore
      await addDoc(collection(db, 'videos'), {
        uid: user.uid,
        title: title || file.name,
        url,
        type: file.type,
        likes: 0,
        comments: 0,
        views: 0,
        createdAt: serverTimestamp(),
      });

      // Show preview
      if (file.type.startsWith('video/')) {
        setPreviewUrl(url);
        setPreviewType('video');
      } else if (file.type.startsWith('image/')) {
        setPreviewUrl(url);
        setPreviewType('image');
      }

      setTitle('');
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      toast.success('Upload complete!');
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [file, title, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setPreviewUrl(null);
    setPreviewType(null);
  };

  return (
    <Card className="border-[#e5eefc]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Video / Photo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-[#e5eefc]"
          />
          <div className="flex items-center gap-3">
            <Input
              id="file-input"
              type="file"
              accept="video/*,image/*"
              onChange={handleFileChange}
              className="border-[#e5eefc] file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-[#2563eb] file:text-white"
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="bg-[#2563eb] hover:bg-[#1e40af] text-white"
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </div>

        {/* Preview */}
        {previewUrl && previewType === 'video' && (
          <div className="mt-3">
            <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Upload successful! Preview:
            </div>
            <VideoPlayer src={previewUrl} vastUrl={vastUrl} />
          </div>
        )}

        {previewUrl && previewType === 'image' && (
          <div className="mt-3">
            <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Upload successful! Preview:
            </div>
            <img src={previewUrl} alt="Preview" className="max-w-full rounded-xl border border-[#e5eefc]" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
