'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User, Camera, MapPin, Calendar, Mail, Lock,
  Save, LogOut, Copy, Share2, Loader2, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileTab() {
  const { user, userData, updateProfile, changeEmail, changePassword, logout } = useAuth();

  // ── Profile fields ────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(userData?.displayName || '');
  const [photoURL,    setPhotoURL]    = useState(userData?.photoURL    || '');
  const [birthday,    setBirthday]    = useState(userData?.birthday    || '');
  const [city,        setCity]        = useState(userData?.city        || '');
  const [gender,      setGender]      = useState<string>(userData?.gender || '');
  const [bio,         setBio]         = useState(userData?.bio         || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Photo upload ──────────────────────────────────────────────────────────
  const [photoFile,     setPhotoFile]     = useState<File | null>(null);
  const [photoPreview,  setPhotoPreview]  = useState<string>(userData?.photoURL || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Email change ──────────────────────────────────────────────────────────
  const [newEmail,       setNewEmail]       = useState('');
  const [emailPass,      setEmailPass]      = useState('');
  const [changingEmail,  setChangingEmail]  = useState(false);
  const [showEmailForm,  setShowEmailForm]  = useState(false);

  // ── Password change ───────────────────────────────────────────────────────
  const [currentPass,   setCurrentPass]   = useState('');
  const [newPass,       setNewPass]       = useState('');
  const [confirmPass,   setConfirmPass]   = useState('');
  const [changingPass,  setChangingPass]  = useState(false);
  const [showPassForm,  setShowPassForm]  = useState(false);

  // ── Photo file select ─────────────────────────────────────────────────────
  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleUploadPhoto = async () => {
    if (!photoFile || !user) return;
    setUploadingPhoto(true);
    try {
      const idToken  = await user.getIdToken(true);
      const formData = new FormData();
      formData.append('file', photoFile);
      formData.append('title', 'profile-photo');
      const res  = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setPhotoURL(data.url!);
      setPhotoPreview(data.url!);
      setPhotoFile(null);
      toast.success('Photo uploaded!');
    } catch (err) {
      toast.error((err as Error).message || 'Upload failed');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({ displayName, photoURL, birthday, city, gender: gender as 'male'|'female'|'other'|'', bio });
      toast.success('Profile saved!');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change email ──────────────────────────────────────────────────────────
  const handleChangeEmail = async () => {
    if (!newEmail.trim()) { toast.error('Enter new email'); return; }
    if (!emailPass.trim()) { toast.error('Enter current password'); return; }
    setChangingEmail(true);
    try {
      await changeEmail(newEmail.trim(), emailPass);
      toast.success('Email updated!');
      setNewEmail(''); setEmailPass(''); setShowEmailForm(false);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update email');
    } finally {
      setChangingEmail(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!currentPass) { toast.error('Enter current password'); return; }
    if (newPass.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPass !== confirmPass) { toast.error('Passwords do not match'); return; }
    setChangingPass(true);
    try {
      await changePassword(currentPass, newPass);
      toast.success('Password updated!');
      setCurrentPass(''); setNewPass(''); setConfirmPass(''); setShowPassForm(false);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to update password');
    } finally {
      setChangingPass(false);
    }
  };

  // ── Referral ──────────────────────────────────────────────────────────────
  const refLink = userData?.referralLink || '';
  const copyRef = () => { navigator.clipboard.writeText(refLink); toast.success('Referral link copied!'); };
  const shareRef = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Join VideoLanka', text: 'Join & earn money!', url: refLink });
    } else copyRef();
  };

  return (
    <div className="space-y-4">

      {/* ══ Profile Photo & Name ══════════════════════════════════════════════ */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-[#2563eb]" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-[#e8f0fd] border-2 border-[#2563eb] grid place-items-center">
                {photoPreview
                  ? <img src={photoPreview} alt="avatar" className="w-full h-full object-cover" />
                  : <User className="h-10 w-10 text-[#2563eb]" />
                }
              </div>
              <label
                htmlFor="photo-input"
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#2563eb] rounded-full grid place-items-center cursor-pointer hover:bg-[#1e40af]"
              >
                <Camera className="h-3 w-3 text-white" />
              </label>
              <input id="photo-input" type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{displayName || user?.email}</p>
              <p className="text-xs text-[#64748b]">{user?.email}</p>
              <p className="text-xs text-[#64748b] mt-0.5">Refs: {userData?.kpis.refs || 0} • Balance: Rs.{(userData?.kpis.balance || 0).toFixed(2)}</p>
              {photoFile && (
                <Button
                  size="sm"
                  onClick={handleUploadPhoto}
                  disabled={uploadingPhoto}
                  className="mt-2 h-7 text-xs bg-[#2563eb] text-white"
                >
                  {uploadingPhoto ? <Loader2 className="animate-spin h-3 w-3 mr-1" /> : <><Camera className="h-3 w-3 mr-1" /></>}
                  Upload Photo
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Fields */}
          <div className="grid gap-3">
            <div>
              <label className="text-xs font-medium text-[#374151] mb-1 block">Display Name</label>
              <Input placeholder="Your name" value={displayName} onChange={e => setDisplayName(e.target.value)} className="border-[#e5eefc]" />
            </div>

            <div>
              <label className="text-xs font-medium text-[#374151] mb-1 block">Bio</label>
              <Textarea
                placeholder="Tell us about yourself…"
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={2}
                className="border-[#e5eefc] text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[#374151] mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" />Birthday</label>
                <Input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="border-[#e5eefc] text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-[#374151] mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" />City</label>
                <Input placeholder="Colombo" value={city} onChange={e => setCity(e.target.value)} className="border-[#e5eefc] text-sm" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[#374151] mb-1 block">Gender</label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="border-[#e5eefc] text-sm">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male — පිරිමි</SelectItem>
                  <SelectItem value="female">Female — ගැහැනු</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="w-full bg-[#2563eb] hover:bg-[#1e40af] text-white"
          >
            {savingProfile
              ? <><Loader2 className="animate-spin h-4 w-4 mr-2" />Saving…</>
              : <><Save className="h-4 w-4 mr-2" />Save Profile</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* ══ Referral Link ════════════════════════════════════════════════════ */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">🔗 Your Referral Link</CardTitle>
          <p className="text-xs text-[#64748b]">Earn Rs.100 for every friend who registers!</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-[#f3f7ff] rounded-xl p-3 text-xs font-mono text-[#374151] break-all">
            {refLink || 'Loading…'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={copyRef} className="border-[#e5eefc] text-sm">
              <Copy className="h-4 w-4 mr-2" />Copy
            </Button>
            <Button onClick={shareRef} className="bg-[#2563eb] hover:bg-[#1e40af] text-white text-sm">
              <Share2 className="h-4 w-4 mr-2" />Share
            </Button>
          </div>
          <div className="flex justify-between text-xs text-[#64748b] bg-[#f3f7ff] rounded-lg px-3 py-2">
            <span>Total Referrals</span>
            <span className="font-bold text-[#2563eb]">{userData?.kpis.refs || 0}</span>
          </div>
        </CardContent>
      </Card>

      {/* ══ Email Change ═════════════════════════════════════════════════════ */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#2563eb]" />Email</span>
            <button
              onClick={() => setShowEmailForm(!showEmailForm)}
              className="text-xs text-[#2563eb] hover:underline"
            >
              {showEmailForm ? 'Cancel' : 'Change'}
            </button>
          </CardTitle>
          <p className="text-xs text-[#64748b]">{user?.email}</p>
        </CardHeader>
        {showEmailForm && (
          <CardContent className="space-y-3">
            <Input placeholder="New email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="border-[#e5eefc]" />
            <Input placeholder="Current password" type="password" value={emailPass} onChange={e => setEmailPass(e.target.value)} className="border-[#e5eefc]" />
            <Button
              onClick={handleChangeEmail}
              disabled={changingEmail}
              className="w-full bg-[#2563eb] hover:bg-[#1e40af] text-white"
            >
              {changingEmail ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Update Email
            </Button>
          </CardContent>
        )}
      </Card>

      {/* ══ Password Change ══════════════════════════════════════════════════ */}
      <Card className="border-[#e5eefc]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Lock className="h-4 w-4 text-[#2563eb]" />Password</span>
            <button
              onClick={() => setShowPassForm(!showPassForm)}
              className="text-xs text-[#2563eb] hover:underline"
            >
              {showPassForm ? 'Cancel' : 'Change'}
            </button>
          </CardTitle>
        </CardHeader>
        {showPassForm && (
          <CardContent className="space-y-3">
            <Input placeholder="Current password" type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} className="border-[#e5eefc]" />
            <Input placeholder="New password (min 6 chars)" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} className="border-[#e5eefc]" />
            <Input placeholder="Confirm new password" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} className="border-[#e5eefc]" />
            <Button
              onClick={handleChangePassword}
              disabled={changingPass}
              className="w-full bg-[#2563eb] hover:bg-[#1e40af] text-white"
            >
              {changingPass ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Update Password
            </Button>
          </CardContent>
        )}
      </Card>

      {/* ══ Logout ═══════════════════════════════════════════════════════════ */}
      <Card className="border-red-100">
        <CardContent className="pt-4 pb-4">
          <Button
            variant="outline"
            onClick={logout}
            className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
