import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Interactive glassmorphism sign-up card component with 3D hover effects.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
