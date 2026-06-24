'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import react-plotly.js with SSR disabled
const Plot = dynamic(
  () => import('react-plotly.js').then((mod) => mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="flex h-64 w-full items-center justify-center rounded-xl bg-gray-900/40 border border-gray-800 animate-pulse">
        <div className="text-sm text-gray-500">Compiling interactive chart...</div>
      </div>
    )
  }
);

interface ChartRendererProps {
  plotlyJson: {
    data: any[];
    layout: any;
  };
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({ plotlyJson }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !plotlyJson) return null;

  // Make sure layout parameters adapt nicely to the container
  const responsiveLayout = {
    ...plotlyJson.layout,
    autosize: true,
    margin: plotlyJson.layout?.margin || { l: 40, r: 20, t: 40, b: 40 },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(4,4,8,0.4)',
    font: {
      color: '#9ca3af',
      family: 'Inter, system-ui, sans-serif',
      ...plotlyJson.layout?.font
    },
    xaxis: {
      gridcolor: 'rgba(255,255,255,0.04)',
      zerolinecolor: 'rgba(255,255,255,0.08)',
      ...plotlyJson.layout?.xaxis
    },
    yaxis: {
      gridcolor: 'rgba(255,255,255,0.04)',
      zerolinecolor: 'rgba(255,255,255,0.08)',
      ...plotlyJson.layout?.yaxis
    }
  };

  return (
    <div className="w-full h-full min-h-[300px]">
      <Plot
        data={plotlyJson.data}
        layout={responsiveLayout}
        useResizeHandler={true}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
        config={{
          responsive: true,
          displayModeBar: 'hover',
          displaylogo: false,
          modeBarButtonsToRemove: ['lasso2d', 'select2d']
        }}
      />
    </div>
  );
};

export default ChartRenderer;
