"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Laptop } from "lucide-react";
import { motion } from "framer-motion";

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const currentTheme = theme || resolvedTheme || 'light';

  const OPTIONS = [
    { id: 'light', icon: Sun, label: 'Formula Light', activeColor: 'var(--primary)' },
    { id: 'dark', icon: Moon, label: 'WebGL Dark', activeColor: '#60a5fa' },
    { id: 'apple', icon: Laptop, label: 'Apple White', activeColor: 'var(--foreground)' },
  ];

  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-full relative" 
         style={{ background: 'var(--nav-pills-bg)', border: '1px solid var(--nav-pills-border)' }}>
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = currentTheme === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => setTheme(opt.id)}
            className="relative p-1.5 rounded-full flex items-center justify-center transition-all select-none outline-none"
            style={{
              width: 25,
              height: 25,
              cursor: 'pointer',
              color: isActive ? 'var(--nav-pill-active-color)' : 'var(--nav-pill-color)'
            }}
            title={opt.label}
          >
            {isActive && (
              <motion.div 
                layoutId="activeThemeOption" 
                className="absolute inset-0 rounded-full z-0 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"
                style={{ background: 'var(--nav-pill-active-bg)' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center" style={{ color: isActive ? opt.activeColor : 'inherit' }}>
              <Icon size={12} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
