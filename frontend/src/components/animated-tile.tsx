"use client";

import { motion } from "framer-motion";
import React from "react";

export function AnimatedTile({ 
  children, 
  className,
  delay = 0 
}: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: 'spring',
        stiffness: 260,
        damping: 22,
        delay: delay 
      }}
      whileHover={{ 
        scale: 1.012,
        y: -3,
        transition: { type: 'spring', stiffness: 400, damping: 25 }
      }}
      className={`glass-panel p-6 overflow-hidden relative group ${className || ""}`}
    >
      {/* Subtle shine sweep on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none z-10" />
      
      {/* Top highlight line for depth */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />
      
      {children}
    </motion.div>
  );
}
