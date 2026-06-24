'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Component as SignInCard } from "@/components/ui/sign-in-card-2";

const DemoOne = () => {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleAuth = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      try {
        await api.post('/auth/register', { email: 'google-demo@a3.com', password: 'GoogleDemoPassword123!' });
      } catch (regErr) {
        // Ignore if already registered
      }
      const res = await api.post('/auth/login', { email: 'google-demo@a3.com', password: 'GoogleDemoPassword123!' });
      localStorage.setItem('a3_access_token', res.data.access_token);
      localStorage.setItem('a3_refresh_token', res.data.refresh_token);
      
      // Redirect to home dashboard
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google auth simulation failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex w-full h-screen justify-center items-center">
      <SignInCard 
        onGoogleSubmitProp={handleGoogleAuth} 
        isGoogleLoadingProp={googleLoading}
        authErrorProp={error}
      />
    </div>
  );
};

export default DemoOne;

