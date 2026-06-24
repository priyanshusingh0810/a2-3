import React from 'react';

interface PreviewGridProps {
  columns: string[];
  rows: Record<string, any>[];
  columnsMeta?: Record<string, any>;
}

export const PreviewGrid: React.FC<PreviewGridProps> = ({ columns, rows, columnsMeta }) => {
  if (!columns || columns.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl bg-slate-800/30 border border-slate-700/50">
        <div className="text-gray-500 text-sm">No rows or columns to display.</div>
      </div>
    );
  }

  const getTypeColor = (type?: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('int') || t.includes('number') || t.includes('float') || t === 'integer') return 'text-teal-400 bg-teal-400/10 border border-teal-400/20';
    if (t.includes('date') || t.includes('time')) return 'text-indigo-400 bg-indigo-400/10 border border-indigo-400/20';
    if (t.includes('bool')) return 'text-amber-400 bg-amber-400/10 border border-amber-400/20';
    return 'text-slate-400 bg-slate-400/10 border border-slate-400/20';
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/30">
      <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-700/50 bg-slate-900 sticky top-0 z-10">
              <th className="p-3 w-12 text-gray-500 font-medium">#</th>
              {columns.map((col) => {
                const type = columnsMeta?.[col]?.data_type || typeof rows[0]?.[col] || 'string';
                return (
                  <th key={col} className="p-3 font-semibold text-gray-200 min-w-[150px]">
                    <div className="flex flex-col gap-1">
                      <span>{col}</span>
                      <span className={`text-[10px] uppercase font-mono py-0.5 px-1.5 rounded w-max ${getTypeColor(type)}`}>
                        {type}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr 
                key={idx} 
                className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors"
              >
                <td className="p-3 text-gray-600 font-mono text-xs">{idx + 1}</td>
                {columns.map((col) => {
                  const val = row[col];
                  return (
                    <td 
                      key={col} 
                      className="p-3 text-gray-300 font-mono text-xs max-w-[300px] truncate"
                    >
                      {val === null || val === undefined ? (
                        <span className="text-red-400/60 italic font-sans font-medium text-[11px] bg-red-500/5 px-1.5 py-0.5 rounded">NULL</span>
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PreviewGrid;
