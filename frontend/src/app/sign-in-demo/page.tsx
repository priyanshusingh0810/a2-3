'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Component from "@/components/ui/modern-login-signup";

export default function DemoOne() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/');
  }, [router]);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { 
          email, 
          password, 
          remember_me: rememberMe 
        });
        localStorage.setItem('a3_access_token', res.data.access_token);
        localStorage.setItem('a3_refresh_token', res.data.refresh_token);
        router.push('/');
      } else {
        if (password !== confirmPassword) {
          setAuthError('Passwords do not match.');
          setLoading(false);
          return;
        }
        if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
          setAuthError('Password must contain at least one letter and one number.');
          setLoading(false);
          return;
        }
        await api.post('/auth/register', { email, password });
        const res = await api.post('/auth/login', { 
          email, 
          password, 
          remember_me: rememberMe 
        });
        localStorage.setItem('a3_access_token', res.data.access_token);
        localStorage.setItem('a3_refresh_token', res.data.refresh_token);
        router.push('/');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let msg = 'Authentication failed.';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail.map((d: any) => d.msg?.replace('Value error, ', '') || d.detail || String(d)).join('. ');
      } else if (err.message) {
        msg = err.message;
      }
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      setAuthError('Google Client ID is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.');
      return;
    }

    setAuthError('');
    setGoogleLoading(true);

    const timeoutGuard = setTimeout(() => {
      setGoogleLoading(false);
    }, 12000);

    try {
      const google = (window as any).google;
      if (!google || !google.accounts || !google.accounts.oauth2) {
        clearTimeout(timeoutGuard);
        throw new Error('Google Identity Services script missing.');
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (tokenResponse: any) => {
          clearTimeout(timeoutGuard);
          if (tokenResponse && tokenResponse.access_token) {
            try {
              const res = await api.post('/auth/google', { access_token: tokenResponse.access_token });
              localStorage.setItem('a3_access_token', res.data.access_token);
              localStorage.setItem('a3_refresh_token', res.data.refresh_token);
              router.push('/');
            } catch (err: any) {
              setAuthError(err.response?.data?.detail || err.message || 'Google auth failed.');
            } finally {
              setGoogleLoading(false);
            }
          } else {
            setGoogleLoading(false);
          }
        },
        error_callback: (err: any) => {
          clearTimeout(timeoutGuard);
          setGoogleLoading(false);
          setAuthError(err.message || 'Google OAuth prompt closed.');
        }
      });

      client.requestAccessToken();
    } catch (err: any) {
      clearTimeout(timeoutGuard);
      setAuthError(err.message || 'Failed to initialize Google OAuth.');
      setGoogleLoading(false);
    }
  };

  return (
    <Component 
      isLogin={isLogin}
      setIsLogin={setIsLogin}
      emailProp={email}
      setEmailProp={setEmail}
      passwordProp={password}
      setPasswordProp={setPassword}
      nameProp={name}
      setNameProp={setName}
      confirmPasswordProp={confirmPassword}
      setConfirmPasswordProp={setConfirmPassword}
      rememberMeProp={rememberMe}
      setRememberMeProp={setRememberMe}
      isLoadingProp={loading}
      onSubmitProp={handleSubmit}
      authErrorProp={authError}
      onGoogleSubmitProp={handleGoogleAuth}
      isGoogleLoadingProp={googleLoading}
    />
  );
}
