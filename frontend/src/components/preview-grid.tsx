import React from 'react';

interface PreviewGridProps {
  columns: string[];
  rows: Record<string, any>[];
  columnsMeta?: Record<string, any>;
}

export const PreviewGrid: React.FC<PreviewGridProps> = ({ columns, rows, columnsMeta }) => {
  if (!columns || columns.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl bg-card border border-border">
        <div className="text-muted-foreground text-sm font-medium">No rows or columns to display.</div>
      </div>
    );
  }

  const getTypeBadgeClass = (type?: string) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('int') || t.includes('number') || t.includes('float') || t === 'integer') {
      return 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30';
    }
    if (t.includes('date') || t.includes('time')) {
      return 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30';
    }
    if (t.includes('bool')) {
      return 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30';
    }
    return 'text-muted-foreground bg-muted border border-border';
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto overflow-y-auto max-h-[450px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40 sticky top-0 z-10 backdrop-blur-sm">
              <th className="p-3 w-12 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">#</th>
              {columns.map((col) => {
                const type = columnsMeta?.[col]?.data_type || typeof rows[0]?.[col] || 'string';
                return (
                  <th key={col} className="p-3 font-bold text-foreground min-w-[150px] border-r border-border/40 last:border-r-0">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-semibold tracking-tight">{col}</span>
                      <span className={`text-[9px] uppercase font-mono py-0.5 px-2 rounded-md w-max ${getTypeBadgeClass(type)}`}>
                        {type}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row, idx) => (
              <tr 
                key={idx} 
                className="hover:bg-muted/30 transition-colors even:bg-muted/10"
              >
                <td className="p-3 text-muted-foreground font-mono font-medium text-center border-r border-border/40">{idx + 1}</td>
                {columns.map((col) => {
                  const val = row[col];
                  return (
                    <td 
                      key={col} 
                      className="p-3 text-foreground font-mono text-[11px] max-w-[300px] truncate border-r border-border/40 last:border-r-0"
                    >
                      {val === null || val === undefined ? (
                        <span className="text-rose-600 dark:text-rose-400 italic font-sans font-semibold text-[10px] bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-950/40">NULL</span>
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
