"use client";

import React, { useState } from "react";
import { Cpu, Check, Shield } from "lucide-react";

interface ModelSelectorProps {
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
}

const LOCAL_MODELS = [
  { id: "qwen2.5:latest", name: "Qwen 2.5 (Default)", provider: "Local Ollama", size: "7.2 GB" },
  { id: "llama3:latest", name: "Llama 3", provider: "Local Ollama", size: "4.7 GB" },
  { id: "deepseek-r1:latest", name: "DeepSeek R1", provider: "Local Ollama", size: "5.1 GB" },
  { id: "mistral:latest", name: "Mistral 7B", provider: "Local Ollama", size: "4.1 GB" },
  { id: "phi3:latest", name: "Phi 3", provider: "Local Ollama", size: "2.3 GB" },
];

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel = "qwen2.5:latest", onSelectModel }) => {
  const [current, setCurrent] = useState(selectedModel);

  const handleSelect = (id: string) => {
    setCurrent(id);
    if (onSelectModel) onSelectModel(id);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-100 max-w-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-base">Local AI Model Selection</h3>
          <p className="text-xs text-slate-400">All model inference is processed on-device. Zero data leaves localhost.</p>
        </div>
      </div>

      <div className="space-y-2">
        {LOCAL_MODELS.map((model) => (
          <button
            key={model.id}
            onClick={() => handleSelect(model.id)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
              current === model.id
                ? "bg-indigo-600/15 border-indigo-500 text-indigo-300"
                : "bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 text-slate-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-medium text-sm text-slate-200">{model.name}</div>
                <div className="text-xs text-slate-400">{model.provider} • {model.size}</div>
              </div>
            </div>
            {current === model.id && <Check className="w-4 h-4 text-indigo-400" />}
          </button>
        ))}
      </div>
    </div>
  );
};
