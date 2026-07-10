'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { SignUpCard } from "@/components/ui/sign-up-card";

const SignUpDemo = () => {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleAuth = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      setError('Google Client ID is not configured. Please set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment variables.');
      return;
    }

    setError('');
    setGoogleLoading(true);

    try {
      const google = (window as any).google;
      if (!google || !google.accounts || !google.accounts.oauth2) {
        throw new Error('Google Identity Services script failed to load. Please refresh and try again.');
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              // Send access token to backend
              const res = await api.post('/auth/google', { access_token: tokenResponse.access_token });
              localStorage.setItem('a3_access_token', res.data.access_token);
              localStorage.setItem('a3_refresh_token', res.data.refresh_token);
              
              // Redirect to home dashboard
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
        error_callback: (error: any) => {
          setError(error.message || 'Google OAuth prompt error.');
          setGoogleLoading(false);
        }
      });

      client.requestAccessToken();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google OAuth.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex w-full h-screen justify-center items-center">
      <SignUpCard 
        onGoogleSubmitProp={handleGoogleAuth} 
        isGoogleLoadingProp={googleLoading}
        authErrorProp={error}
      />
    </div>
  );
};

export default SignUpDemo;

