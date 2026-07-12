"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Laptop } from "lucide-react";

export function ThemeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const currentTheme = theme || resolvedTheme || 'light';

  const cycleTheme = () => {
    if (currentTheme === 'light') {
      setTheme('dark');
    } else if (currentTheme === 'dark') {
      setTheme('apple');
    } else {
      setTheme('light');
    }
  };

  const getThemeInfo = () => {
    switch (currentTheme) {
      case 'light':
        return { icon: <Sun size={15} style={{color:'var(--primary)'}} />, label: "Formula Light", next: "Dark" };
      case 'dark':
        return { icon: <Moon size={15} style={{color:'#60a5fa'}} />, label: "WebGL Dark", next: "Apple White" };
      case 'apple':
        return { icon: <Laptop size={15} style={{color:'var(--foreground)'}} />, label: "Apple White", next: "Formula Light" };
      default:
        return { icon: <Sun size={15} />, label: "Formula Light", next: "Dark" };
    }
  };

  const { icon, label, next } = getThemeInfo();

  return (
    <button
      onClick={cycleTheme}
      className="p-2 rounded-lg transition-all flex items-center justify-center"
      style={{
        color: 'var(--muted-foreground)',
        background: 'transparent',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--nav-button-bg)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      aria-label="Toggle theme"
      title={`Current: ${label}. Click to switch to ${next}.`}
    >
      {icon}
    </button>
  );
}
