"use client";

import React, { useState } from "react";
import { Play, Plus, Trash2, FileText, Code, Database, Sparkles, Download } from "lucide-react";

interface Cell {
  id: string;
  type: "markdown" | "python" | "sql";
  code: string;
  output?: any;
  status: "idle" | "running" | "completed" | "error";
}

export const NotebookView: React.FC = () => {
  const [title, setTitle] = useState("Local Analytics Notebook");
  const [cells, setCells] = useState<Cell[]>([
    {
      id: "cell_1",
      type: "markdown",
      code: "# Enterprise Data Analysis\nInspect regional sales performance and anomaly distributions.",
      status: "completed",
    },
    {
      id: "cell_2",
      type: "python",
      code: "# Compute summary statistics\nimport pandas as pd\ndf_result = {'total_sales': 125000, 'region': 'North America'}",
      output: "{'total_sales': 125000, 'region': 'North America'}",
      status: "completed",
    },
    {
      id: "cell_3",
      type: "sql",
      code: "SELECT region, SUM(amount) AS total_revenue FROM sales GROUP BY region;",
      output: "[{'region': 'North America', 'total_revenue': 125000}]",
      status: "completed",
    },
  ]);

  const addCell = (type: "markdown" | "python" | "sql") => {
    const newCell: Cell = {
      id: `cell_${Date.now()}`,
      type,
      code: type === "markdown" ? "### New Section" : type === "python" ? "# Enter Python code\n" : "SELECT * FROM dataset;",
      status: "idle",
    };
    setCells([...cells, newCell]);
  };

  const updateCellCode = (id: string, code: string) => {
    setCells(cells.map((c) => (c.id === id ? { ...c, code } : c)));
  };

  const deleteCell = (id: string) => {
    setCells(cells.filter((c) => c.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-2xl">
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold bg-transparent focus:outline-none text-slate-100 border-b border-transparent focus:border-indigo-500"
          />
          <p className="text-xs text-slate-400 mt-1">Interactive local computational notebook</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => addCell("markdown")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            <FileText className="w-3.5 h-3.5" /> + Markdown
          </button>
          <button
            onClick={() => addCell("python")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            <Code className="w-3.5 h-3.5" /> + Python
          </button>
          <button
            onClick={() => addCell("sql")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
          >
            <Database className="w-3.5 h-3.5" /> + SQL
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {cells.map((cell, idx) => (
          <div key={cell.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between pb-2 mb-2 text-xs text-slate-400">
              <span className="font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                In [{idx + 1}] • {cell.type}
              </span>
              <button
                onClick={() => deleteCell(cell.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={cell.code}
              onChange={(e) => updateCellCode(cell.id, e.target.value)}
              rows={3}
              className="w-full bg-slate-950/70 p-3 rounded-lg font-mono text-sm border border-slate-800 focus:border-indigo-500 focus:outline-none text-slate-200"
            />

            {cell.output && (
              <div className="mt-3 pt-3 border-t border-slate-800 text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-emerald-400 overflow-x-auto">
                <span className="text-slate-500 font-semibold block mb-1">Out [{idx + 1}]:</span>
                <pre>{typeof cell.output === "string" ? cell.output : JSON.stringify(cell.output, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
