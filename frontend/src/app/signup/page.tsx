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
      setError('');
      setGoogleLoading(true);
      try {
        const demoEmail = 'demo_google_user@gmail.com';
        const demoPassword = 'GoogleOAuth_demo_google_user@gmail.com_demo_client_id';
        try {
          await api.post('/auth/register', { email: demoEmail, password: demoPassword });
        } catch (regErr) {}
        
        const res = await api.post('/auth/login', { email: demoEmail, password: demoPassword });
        localStorage.setItem('a3_access_token', res.data.access_token);
        localStorage.setItem('a3_refresh_token', res.data.refresh_token);
        router.push('/');
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to simulate Google Sign-In.');
      } finally {
        setGoogleLoading(false);
      }
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
              // Fetch user profile from google userinfo endpoint
              const userInfoRes = await fetch(
                `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${tokenResponse.access_token}`
              );
              if (!userInfoRes.ok) {
                throw new Error('Failed to fetch user info from Google.');
              }
              const googleUser = await userInfoRes.json();
              const { email } = googleUser;

              if (!email) {
                throw new Error('No email address returned from Google account.');
              }

              // Use a secure, deterministic password schema to register this email with our backend
              const googleUserPassword = `GoogleOAuth_${email}_${clientId}`;

              try {
                // Try registering user first
                await api.post('/auth/register', { email, password: googleUserPassword });
              } catch (regErr) {
                // Ignore if already registered
              }

              // Log in
              const res = await api.post('/auth/login', { email, password: googleUserPassword });
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

