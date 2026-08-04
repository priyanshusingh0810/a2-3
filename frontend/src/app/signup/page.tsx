'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { SignUpCard } from "@/components/ui/sign-up-card";

const SignUpDemo = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain at least one letter and one number.');
      return;
    }

    setLoading(true);
    try {
      // 1. Register new user
      await api.post('/auth/register', { email, password });
      
      // 2. Login to get JWT tokens
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('a3_access_token', res.data.access_token);
      localStorage.setItem('a3_refresh_token', res.data.refresh_token);
      
      // 3. Redirect to main dashboard
      router.push('/');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let msg = 'Registration failed. Please check your credentials.';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail.map((d: any) => d.msg?.replace('Value error, ', '') || d.detail || String(d)).join('. ');
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      setError('Google Client ID is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.');
      return;
    }

    setError('');
    setGoogleLoading(true);

    // Timeout guard to prevent infinite loading spinner if popup is closed
    const timeoutGuard = setTimeout(() => {
      setGoogleLoading(false);
    }, 12000);

    try {
      const google = (window as any).google;
      if (!google || !google.accounts || !google.accounts.oauth2) {
        clearTimeout(timeoutGuard);
        throw new Error('Google Identity Services script failed to load. Please refresh and try again.');
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
              setError(err.response?.data?.detail || err.message || 'Google authentication failed.');
            } finally {
              setGoogleLoading(false);
            }
          } else {
            setGoogleLoading(false);
          }
        },
        error_callback: (err: any) => {
          clearTimeout(timeoutGuard);
          setError(err.message || 'Google OAuth prompt was closed or cancelled.');
          setGoogleLoading(false);
        }
      });

      client.requestAccessToken();
    } catch (err: any) {
      clearTimeout(timeoutGuard);
      setError(err.message || 'Failed to initialize Google OAuth.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex w-full h-screen justify-center items-center bg-black">
      <SignUpCard 
        nameProp={name}
        setNameProp={setName}
        emailProp={email}
        setEmailProp={setEmail}
        passwordProp={password}
        setPasswordProp={setPassword}
        confirmPasswordProp={confirmPassword}
        setConfirmPasswordProp={setConfirmPassword}
        isLoadingProp={loading}
        onSubmitProp={handleSubmit}
        onGoogleSubmitProp={handleGoogleAuth} 
        isGoogleLoadingProp={googleLoading}
        authErrorProp={error}
        onSwitchToLogin={() => router.push('/sign-in-demo')}
      />
    </div>
  );
};

export default SignUpDemo;

