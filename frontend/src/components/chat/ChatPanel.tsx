"use client";

import React, { useState } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";

interface ChatPanelProps {
  datasetId?: string;
  onSendMessage?: (msg: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ datasetId, onSendMessage }) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    if (onSendMessage) onSendMessage(input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-100 shadow-2xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h3 className="font-semibold text-sm tracking-wide">A3 AI Assistant</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          Local Privacy Mode
        </span>
      </div>

      <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1 text-sm">
        <div className="flex gap-3 items-start">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div className="flex-1 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
            Welcome to <strong>A3 Analytics Enterprise</strong>. All calculations and models run locally on your hardware. Ask any question about your data!
          </div>
        </div>
      </div>

      <div className="flex gap-2 items-center bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 focus-within:border-indigo-500 transition-all">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask AI to analyze, forecast, clean, or visualize..."
          className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none text-slate-200 placeholder-slate-500"
        />
        <button
          onClick={handleSend}
          className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
