'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  type, 
  message, 
  onClose, 
  duration = 4000 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const config = {
    success: {
      icon: <CheckCircle2 size={16} className="text-emerald-400" />,
      border: 'border-emerald-500/20 bg-emerald-500/5',
      accent: 'bg-emerald-500'
    },
    warning: {
      icon: <AlertTriangle size={16} className="text-amber-400" />,
      border: 'border-amber-500/20 bg-amber-500/5',
      accent: 'bg-amber-500'
    },
    error: {
      icon: <XCircle size={16} className="text-red-400" />,
      border: 'border-red-500/20 bg-red-500/5',
      accent: 'bg-red-500'
    },
    info: {
      icon: <Info size={16} className="text-blue-400" />,
      border: 'border-blue-500/20 bg-blue-500/5',
      accent: 'bg-blue-500'
    }
  };

  const active = config[type] || config.info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 250, damping: 22 }}
      className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-3.5 px-4 py-3.5 rounded-xl border glass-panel ${active.border} shadow-xl max-w-sm`}
    >
      <div className="shrink-0">{active.icon}</div>
      <p className="text-xs font-semibold text-slate-200 leading-normal flex-grow pr-4 select-none">
        {message}
      </p>
      <button 
        onClick={onClose} 
        className="p-1 rounded-md text-slate-500 hover:text-slate-200 hover:bg-slate-800/40 transition shrink-0"
      >
        <X size={13} />
      </button>
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${active.accent} opacity-60 rounded-b-xl animate-[toast-progress_linear]`} style={{ animationDuration: `${duration}ms` }} />
    </motion.div>
  );
};
