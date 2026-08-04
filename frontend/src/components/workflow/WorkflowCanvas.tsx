"use client";

import React, { useState } from "react";
import { Play, ArrowRight, CheckCircle2, Clock, FileSpreadsheet, Sparkles, Sliders, HardDriveDownload } from "lucide-react";

interface Node {
  id: string;
  name: string;
  action: string;
  status: "idle" | "running" | "completed" | "error";
  durationMs?: number;
}

export const WorkflowCanvas: React.FC = () => {
  const [workflowTitle, setWorkflowTitle] = useState("Automated ETL & Reporting Pipeline");
  const [nodes, setNodes] = useState<Node[]>([
    { id: "node_1", name: "Ingest Sales CSV", action: "ingest_data", status: "completed", durationMs: 120 },
    { id: "node_2", name: "Clean & Impute Missing Data", action: "clean_data", status: "completed", durationMs: 450 },
    { id: "node_3", name: "Compute Statistics & Correlations", action: "run_stats", status: "completed", durationMs: 610 },
    { id: "node_4", name: "Generate Plotly Charts", action: "generate_charts", status: "completed", durationMs: 380 },
    { id: "node_5", name: "Build Executive PDF Report", action: "generate_pdf", status: "idle" },
    { id: "node_6", name: "Export Artifacts Package", action: "export_package", status: "idle" },
  ]);

  const [isRunning, setIsRunning] = useState(false);

  const handleRunWorkflow = () => {
    setIsRunning(true);
    setNodes(nodes.map((n) => ({ ...n, status: "running" })));
    setTimeout(() => {
      setNodes(nodes.map((n) => ({ ...n, status: "completed", durationMs: Math.floor(Math.random() * 500) + 100 })));
      setIsRunning(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-2xl">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
        <div>
          <input
            type="text"
            value={workflowTitle}
            onChange={(e) => setWorkflowTitle(e.target.value)}
            className="text-xl font-bold bg-transparent focus:outline-none text-slate-100 border-b border-transparent focus:border-indigo-500"
          />
          <p className="text-xs text-slate-400 mt-1">Reusable automated DAG workflow engine</p>
        </div>

        <button
          onClick={handleRunWorkflow}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          <Play className="w-4 h-4 fill-white" /> {isRunning ? "Executing Workflow..." : "Run Workflow"}
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto p-4 flex items-center gap-4 bg-slate-900/50 rounded-xl border border-slate-800/80">
        {nodes.map((node, idx) => (
          <React.Fragment key={node.id}>
            <div className={`min-w-[220px] bg-slate-900 border rounded-xl p-4 shadow-xl flex flex-col justify-between transition-all ${
              node.status === "running"
                ? "border-indigo-500 ring-2 ring-indigo-500/20"
                : node.status === "completed"
                ? "border-emerald-500/50"
                : "border-slate-800"
            }`}>
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Step {idx + 1}
                  </span>
                  {node.status === "completed" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {node.status === "running" && <Clock className="w-4 h-4 text-indigo-400 animate-spin" />}
                </div>
                <h4 className="font-semibold text-sm text-slate-100">{node.name}</h4>
                <p className="text-xs text-slate-400 font-mono mt-1">{node.action}</p>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>{node.status.toUpperCase()}</span>
                {node.durationMs && <span>{node.durationMs}ms</span>}
              </div>
            </div>

            {idx < nodes.length - 1 && (
              <ArrowRight className="w-6 h-6 text-slate-600 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
