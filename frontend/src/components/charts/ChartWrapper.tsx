"use client";

import React from "react";
import DynamicPlot from "../chart-renderer";

interface ChartWrapperProps {
  data: any;
  layout?: any;
  title?: string;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({ data, layout, title }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-full">
      {title && <h4 className="text-sm font-semibold text-slate-200 mb-2">{title}</h4>}
      <div className="flex-1 w-full min-h-[300px]">
        <DynamicPlot plotlyJson={{ data: data || [], layout: layout || {} }} />
      </div>
    </div>
  );
};
