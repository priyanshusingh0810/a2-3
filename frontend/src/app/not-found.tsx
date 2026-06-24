'use client';

import React from 'react';
import Link from 'next/link';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-6">
      <div className="text-center max-w-lg mx-auto">
        {/* Animated 404 number */}
        <div className="relative mb-8">
          <h1 className="text-[10rem] font-black leading-none tracking-tighter select-none"
            style={{
              background: 'linear-gradient(180deg, rgba(99,102,241,0.9) 0%, rgba(99,102,241,0.15) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            404
          </h1>
          {/* Subtle glow behind the number */}
          <div className="absolute inset-0 flex items-center justify-center -z-10">
            <div className="w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
          </div>
        </div>

        {/* Message */}
        <h2 className="section-heading text-2xl text-white mb-3">
          Page not found
        </h2>
        <p className="section-subtext text-sm leading-relaxed mb-10 max-w-sm mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Check the URL or navigate back to the dashboard.
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Home size={16} />
            Back to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn-ghost inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>

        {/* Footer hint */}
        <p className="text-xs text-slate-600 mt-16 select-none">
          A3 Autonomous Analytics Platform
        </p>
      </div>
    </div>
  );
}
