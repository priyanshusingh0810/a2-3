import './globals.css';
import React from 'react';
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export const metadata: Metadata = {
  title: {
    default: 'A3 - Autonomous AI Data Analyst Platform',
    template: '%s | A3 Analytics',
  },
  description: 'Upload datasets, profile data quality, run forecasting, chat with AI, and generate executive reports — all locally and privately.',
  keywords: ['data analytics', 'AI analyst', 'data visualization', 'forecasting', 'autonomous analytics'],
  openGraph: {
    title: 'A3 - Autonomous AI Data Analyst Platform',
    description: 'A local-first, privacy-focused autonomous data analytics platform powered by AI agents.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

