'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setMessage('');
    try {
      await login(email, password);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMessage(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setMessage('');
    try {
      await register(email, password);
      setMessage('Account created! You are now logged in.');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMessage(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="vl-login-bg fixed inset-0 z-50 grid place-items-center">
      <Card className="w-full max-w-[440px] mx-4 bg-white/12 backdrop-blur-[6px] border border-white/25 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <CardHeader className="text-center text-white pb-2">
          <div className="w-10 h-10 rounded-[10px] bg-white text-[#2563eb] font-extrabold text-lg grid place-items-center mx-auto mb-2">
            VL
          </div>
          <CardTitle className="text-2xl font-bold text-white">VideoLanka</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-white/95 text-[#0b1220] rounded-xl h-11"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-white/95 text-[#0b1220] rounded-xl h-11"
          />
          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-white text-[#2563eb] font-extrabold hover:bg-white/90 rounded-xl h-11"
          >
            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            Login
          </Button>
          <Button
            onClick={handleRegister}
            disabled={loading}
            variant="outline"
            className="w-full bg-white/20 text-white border-white/30 font-extrabold hover:bg-white/30 rounded-xl h-11"
          >
            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            Create Account
          </Button>
          {message && (
            <p className="text-sm text-center text-white/90">{message}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
