import React from 'react';
import { BarChart3, PieChart, Layers, ArrowUpRight, CheckCircle2, TrendingUp } from 'lucide-react';
import { StorageMetrics, UserFileRecord, FileContentRecord } from '../types';
import { formatBytes } from '../utils/md5';

interface AnalyticsViewProps {
  metrics: StorageMetrics;
  files: UserFileRecord[];
  contents: FileContentRecord[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  metrics,
  files,
  contents,
}) => {
  const contentFreq: Record<string, { hash: string; name: string; size: number; count: number; saved: number }> = {};
  files.forEach(f => {
    const cid = f.content_id;
    if (!contentFreq[cid]) {
      contentFreq[cid] = {
        hash: f.md5_hash,
        name: f.original_filename,
        size: f.file_size,
        count: 0,
        saved: 0,
      };
    }
    contentFreq[cid].count += 1;
  });

  const topDuplicated = Object.values(contentFreq)
    .filter(item => item.count > 1)
    .map(item => ({
      ...item,
      saved: item.size * (item.count - 1),
    }))
    .sort((a, b) => b.saved - a.saved);

  const formatEntries = Object.entries(metrics.format_breakdown).sort((a, b) => b[1] - a[1]);
  const maxBytes = Math.max(metrics.logical_bytes, 1);

  // SVG Donut Calculations
  const radius = 55;
  const circ = 2 * Math.PI * radius;
  const storedPct = metrics.logical_bytes > 0 ? (metrics.physical_bytes / metrics.logical_bytes) : 1;
  const savedPct = metrics.logical_bytes > 0 ? (metrics.saved_bytes / metrics.logical_bytes) : 0;
  const storedDash = storedPct * circ;
  const savedDash = savedPct * circ;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
          Storage Optimization &amp; Deduplication Analytics
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Detailed metrics calculated dynamically from active database records. Distinguishes virtual user allocations from physical cloud storage consumption.
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium mb-1">Total Logical Size</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatBytes(metrics.logical_bytes)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{metrics.total_files} active user files</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium mb-1">Physical Content Stored</div>
          <div className="text-2xl font-bold text-blue-600 font-mono tabular-nums">
            {formatBytes(metrics.physical_bytes)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{metrics.unique_contents} unique storage objects</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium mb-1">Storage Saved via MD5</div>
          <div className="text-2xl font-bold text-emerald-600 font-mono tabular-nums">
            {formatBytes(metrics.saved_bytes)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{metrics.duplicates_count} duplicate uploads spared</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="text-xs text-slate-500 font-medium mb-1">Deduplication Ratio</div>
          <div className="text-2xl font-bold text-indigo-600 font-mono tabular-nums">
            {metrics.deduplication_ratio.toFixed(2)}:1
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{metrics.optimization_pct.toFixed(1)}% cloud reduction</div>
        </div>
      </div>

      {/* Donut Chart & Visual Comparison */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <span>Physical vs. Saved Storage Comparison</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Donut Chart Graphic */}
          <div className="lg:col-span-5 flex items-center justify-center py-2">
            <div className="relative flex items-center justify-center">
              <svg className="w-44 h-44 transform -rotate-90">
                {/* Physical Stored Arc */}
                <circle
                  cx="88"
                  cy="88"
                  r={radius}
                  stroke="#3B82F6"
                  strokeWidth="16"
                  strokeDasharray={`${storedDash} ${circ}`}
                  fill="transparent"
                  className="transition-all duration-700"
                />
                {/* Saved Arc */}
                <circle
                  cx="88"
                  cy="88"
                  r={radius}
                  stroke="#10B981"
                  strokeWidth="16"
                  strokeDasharray={`${savedDash} ${circ}`}
                  strokeDashoffset={-storedDash}
                  fill="transparent"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                  {metrics.optimization_pct.toFixed(1)}%
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  OPTIMIZATION
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Bars & Legend */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-400" />
                  <span>Logical Storage (If stored independently)</span>
                </div>
                <span className="font-mono tabular-nums">{formatBytes(metrics.logical_bytes)}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                  <span>Physical Cloud Storage (Supabase bucket)</span>
                </div>
                <span className="font-mono tabular-nums text-blue-600">{formatBytes(metrics.physical_bytes)}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (metrics.physical_bytes / maxBytes) * 100)}%` }} 
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span>Net Storage Saved (Single-Instance deduplication)</span>
                </div>
                <span className="font-mono tabular-nums text-emerald-600">{formatBytes(metrics.saved_bytes)}</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (metrics.saved_bytes / maxBytes) * 100)}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Format Distribution */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-600" />
            <span>File Format Distribution</span>
          </h2>

          <div className="space-y-3">
            {formatEntries.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">No files in repository</div>
            ) : (
              formatEntries.map(([ext, count]) => {
                const pct = ((count / metrics.total_files) * 100).toFixed(0);
                return (
                  <div key={ext} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700 uppercase">{ext}</span>
                      <span className="text-slate-500 font-mono tabular-nums">{count} files ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all" 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Deduplicated Files */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Top Deduplicated Content Blobs</span>
          </h2>

          <div className="space-y-3">
            {topDuplicated.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                No duplicate files currently exist. Upload duplicate files to see rankings.
              </div>
            ) : (
              topDuplicated.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between font-medium text-slate-800">
                    <span className="truncate max-w-[200px]" title={item.name}>{item.name}</span>
                    <span className="text-emerald-700 font-mono font-semibold">
                      +{formatBytes(item.saved)} saved
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-mono">
                    <span>hash: {item.hash.slice(0, 8)}...</span>
                    <span>{item.count} active references</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
