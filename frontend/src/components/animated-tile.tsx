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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        ease: [0.16, 1, 0.3, 1], // Custom apple-like easing
        delay: delay 
      }}
      whileHover={{ 
        scale: 1.015,
        y: -3,
        transition: { duration: 0.3, ease: "easeOut" }
      }}
      className={`glass-panel p-6 overflow-hidden relative group transition-shadow duration-300 hover:shadow-xl hover:shadow-black/20 ${className || ""}`}
    >
      {/* Subtle shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
      {children}
    </motion.div>
  );
}
