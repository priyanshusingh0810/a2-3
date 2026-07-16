'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText, Database, ShieldAlert, ArrowRight, Keyboard, Activity } from 'lucide-react';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: any[];
  onSelectDataset: (id: string) => void;
  onNavigate: (tab: any) => void;
  onRunCeoMode: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  datasets,
  onSelectDataset,
  onNavigate,
  onRunCeoMode
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape, navigate on Arrow keys, select on Enter
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[activeIndex]) {
          filteredItems[activeIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Autofocus input
    setTimeout(() => inputRef.current?.focus(), 50);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, query]);

  // Command items definition
  const items = [
    // 1. Navigation items
    { id: 'nav_dash', label: 'Go to Dashboard', category: 'Navigation', icon: <Activity size={14} />, action: () => { onNavigate('dashboard'); onClose(); } },
    { id: 'nav_data', label: 'Go to Datasets Library', category: 'Navigation', icon: <Database size={14} />, action: () => { onNavigate('datasets'); onClose(); } },
    { id: 'nav_chat', label: 'Go to AI Chat Analyst', category: 'Navigation', icon: <Search size={14} />, action: () => { onNavigate('chat'); onClose(); } },
    { id: 'nav_fore', label: 'Go to Trend Forecasting', category: 'Navigation', icon: <ArrowRight size={14} />, action: () => { onNavigate('forecast'); onClose(); } },
    { id: 'nav_repo', label: 'Go to PDF Report Center', category: 'Navigation', icon: <FileText size={14} />, action: () => { onNavigate('reports'); onClose(); } },
    { id: 'nav_simu', label: 'Go to What-if Simulator', category: 'Navigation', icon: <Keyboard size={14} />, action: () => { onNavigate('simulations'); onClose(); } },
    
    // 2. Action items
    { id: 'act_ceo', label: 'Trigger CEO Mode Autonomous Analysis', category: 'Quick Actions', icon: <ShieldAlert size={14} className="text-indigo-400" />, action: () => { onRunCeoMode(); onClose(); } },
    
    // 3. Datasets items
    ...datasets.map((ds) => ({
      id: `dataset_${ds.id}`,
      label: `Switch to Dataset: ${ds.name}`,
      category: 'Select Dataset',
      icon: <Database size={14} className="text-teal-400" />,
      action: () => { onSelectDataset(ds.id); onClose(); }
    }))
  ];

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  // Reset index when query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm transition-all duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          ref={containerRef}
          className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[400px]"
        >
          {/* Header search bar */}
          <div className="flex items-center gap-3 px-4 border-b border-slate-800 shrink-0">
            <Search size={15} className="text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actions, files, or settings... (Arrow keys to navigate, Enter to select)"
              className="w-full py-4 text-xs bg-transparent text-slate-200 focus:outline-none placeholder:text-slate-500"
            />
            <span className="text-[10px] bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-slate-500 font-mono">ESC</span>
          </div>

          {/* Results list */}
          <div className="flex-grow overflow-y-auto p-2 space-y-3">
            {filteredItems.length > 0 ? (
              // Group items by category
              Object.entries(
                filteredItems.reduce((acc: any, item) => {
                  if (!acc[item.category]) acc[item.category] = [];
                  acc[item.category].push(item);
                  return acc;
                }, {})
              ).map(([category, catItems]: [string, any]) => (
                <div key={category} className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 px-3 tracking-wider select-none">
                    {category}
                  </span>
                  <div className="space-y-0.5">
                    {catItems.map((item: any) => {
                      // Calculate global index in filteredItems list to match activeIndex
                      const globalIdx = filteredItems.findIndex((x) => x.id === item.id);
                      const isActive = globalIdx === activeIndex;

                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all text-left ${
                            isActive
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={isActive ? 'text-white' : 'text-slate-500'}>
                              {item.icon}
                            </span>
                            <span className="truncate">{item.label}</span>
                          </div>
                          {isActive && (
                            <span className="text-[9px] font-mono bg-indigo-700/60 border border-indigo-500/20 px-2 py-0.5 rounded text-white flex items-center gap-1 select-none">
                              Select <Keyboard size={10} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-xs text-slate-500 py-12 select-none">
                No matching command patterns found.
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-slate-850 bg-slate-950/40 text-[9px] text-slate-500 flex items-center justify-between shrink-0 select-none">
            <span>Arrow keys to navigate • Enter to run • ESC to exit</span>
            <span>A3 Command Palette</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default CommandPalette;
