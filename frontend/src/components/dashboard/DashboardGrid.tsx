"use client";

import React from "react";
import { Activity, Cpu, HardDrive, Database, Clock, Layers } from "lucide-react";

interface DashboardGridProps {
  systemMetrics?: {
    cpuUsagePct?: number;
    memoryUsedMb?: number;
    runningJobsCount?: number;
  };
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({ systemMetrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium uppercase tracking-wider">CPU Usage</span>
          <Cpu className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-100">{systemMetrics?.cpuUsagePct ?? 12}%</span>
          <span className="text-xs text-emerald-400 font-medium">Local Engine</span>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium uppercase tracking-wider">RAM Usage</span>
          <HardDrive className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-100">{systemMetrics?.memoryUsedMb ?? 1420} MB</span>
          <span className="text-xs text-slate-400">Optimal</span>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium uppercase tracking-wider">Active Jobs</span>
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-100">{systemMetrics?.runningJobsCount ?? 0}</span>
          <span className="text-xs text-slate-400">Idle / Ready</span>
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium uppercase tracking-wider">Local Storage</span>
          <Database className="w-4 h-4 text-purple-400" />
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-100">Encrypted</span>
          <span className="text-xs text-purple-400">AES-256</span>
        </div>
      </div>
    </div>
  );
};
