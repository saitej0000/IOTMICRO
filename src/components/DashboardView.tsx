import React from 'react';
import { 
  Files, 
  Database, 
  Copy, 
  TrendingUp, 
  HardDrive, 
  ArrowUpRight, 
  RefreshCw,
  Cpu,
  ShieldCheck,
  Zap,
  Layers,
  Sparkles
} from 'lucide-react';
import { StorageMetrics, UploadEventRecord } from '../types';
import { formatBytes } from '../utils/md5';

interface DashboardViewProps {
  metrics: StorageMetrics;
  events: UploadEventRecord[];
  onNavigateTab: (tab: string) => void;
  onInjectDuplicate: () => void;
  onInjectIoT: () => void;
  onResetData: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  events,
  onNavigateTab,
  onInjectDuplicate,
  onInjectIoT,
  onResetData,
}) => {
  // SVG Radial Gauge Calculations
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, metrics.optimization_pct) / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Visual Architectural Split Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 mb-2.5">
                <span className="tracking-wide uppercase text-[11px]">B.Tech IoT &amp; Cloud Virtualization</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>Content-Addressable Storage</span>
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-snug mb-3" style={{ textWrap: 'balance' }}>
                Cloud-Based Improved File Handling &amp; Duplication Removal Using MD5
              </h1>
              
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 max-w-xl">
                A single-instance cloud storage architecture that calculates 128-bit MD5 digests from uploaded bytes to detect and remove redundant data before committing to Supabase Cloud Storage.
              </p>
            </div>

            {/* Interactive Control Strip */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => onNavigateTab('upload')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
              >
                <span>Upload Files</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onInjectDuplicate}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-indigo-600" />
                <span>Simulate Duplicate Upload</span>
              </button>

              <button
                onClick={onInjectIoT}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5 text-blue-600" />
                <span>Emit IoT Telemetry Log</span>
              </button>

              <button
                onClick={onResetData}
                title="Reset repository to initial demo state"
                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs text-slate-400 hover:text-slate-700 transition-colors cursor-pointer ml-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="lg:col-span-5 relative bg-slate-900 min-h-[220px] lg:min-h-full overflow-hidden flex items-center justify-center">
            <img
              src="/src/assets/images/cloud_storage_datacenter_1793182678004.jpg"
              alt="Cloud Datacenter Infrastructure"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-85 transition-transform duration-700 hover:scale-105"
            />
            {/* Scrim Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent" />

            {/* Floating Glassmorphic Telemetry Badge */}
            <div className="relative z-10 m-4 p-3.5 rounded-xl bg-slate-950/75 backdrop-blur-md border border-white/10 text-white max-w-xs shadow-lg">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 pb-2 mb-2 border-b border-white/10">
                <span className="text-emerald-400">STORAGE OPTIMIZED</span>
                <span>{metrics.optimization_pct.toFixed(1)}% SAVED</span>
              </div>
              <div className="text-xs text-slate-200 leading-snug">
                Single-instance object storage prevents duplicate cloud allocations across active accounts and IoT telemetry streams.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: KPI Workstation Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Logical Files</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <Files className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {metrics.total_files}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span>Allocated logical entries</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Unique Stored Blobs</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Database className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {metrics.unique_contents}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Physical objects in bucket
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Duplicates Eliminated</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Copy className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
            {metrics.duplicates_count}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Reused existing hash entries
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Deduplication Ratio</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-indigo-600 font-mono tabular-nums">
            {metrics.deduplication_ratio.toFixed(2)}x
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Logical to physical ratio
          </div>
        </div>
      </div>

      {/* Row 2: Visual Storage Architecture & Radial Gauge */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Storage Footprint Optimization
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mathematical relationship between user-allocated logical capacity and actual physical storage
            </p>
          </div>
          <div className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
            Efficiency = (Saved Storage / Logical Storage) × 100
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-6 items-center">
          {/* Circular SVG Radial Gauge */}
          <div className="lg:col-span-4 flex items-center justify-center">
            <div className="relative flex items-center justify-center">
              <svg className="w-40 h-40 transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#4F46E5"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              {/* Center Metric Label */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                  {metrics.optimization_pct.toFixed(1)}%
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                  Saved Space
                </span>
              </div>
            </div>
          </div>

          {/* Right: Storage Category Cards */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div className="text-xs font-medium text-slate-500 mb-1">Logical Storage</div>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                {formatBytes(metrics.logical_bytes)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">If files were stored multi-copy</div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200/70">
              <div className="text-xs font-medium text-blue-800 mb-1">Physical Content</div>
              <div className="text-xl font-bold text-blue-700 font-mono tabular-nums">
                {formatBytes(metrics.physical_bytes)}
              </div>
              <div className="text-[11px] text-blue-600/80 mt-1">Actual stored cloud bytes</div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/70">
              <div className="text-xs font-medium text-emerald-800 mb-1">Storage Saved</div>
              <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums">
                {formatBytes(metrics.saved_bytes)}
              </div>
              <div className="text-[11px] text-emerald-600/80 mt-1">Spared bandwidth &amp; disk</div>
            </div>
          </div>
        </div>

        {/* Horizontal Visual Storage Gauge */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Storage Allocation Distribution</span>
            <span className="font-mono tabular-nums font-medium text-slate-900">
              {metrics.physical_bytes > 0 
                ? `${formatBytes(metrics.physical_bytes)} stored / ${formatBytes(metrics.logical_bytes)} allocated`
                : 'No files uploaded'}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
            <div 
              className="bg-indigo-600 h-full transition-all duration-500" 
              style={{ width: `${Math.min(100, metrics.logical_bytes > 0 ? (metrics.physical_bytes / metrics.logical_bytes) * 100 : 0)}%` }}
              title="Physical Stored Bytes"
            />
            <div 
              className="bg-emerald-400 h-full transition-all duration-500" 
              style={{ width: `${Math.min(100, metrics.optimization_pct)}%` }}
              title="Saved Storage via MD5 Deduplication"
            />
          </div>
          <div className="flex flex-wrap items-center gap-6 text-[11px] text-slate-500 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 inline-block" />
              <span>Physical Stored ({formatBytes(metrics.physical_bytes)})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" />
              <span>Saved Storage ({formatBytes(metrics.saved_bytes)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Live Ingestion Audit Trail */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              System Ingestion &amp; Event Stream
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time audit log from PostgreSQL <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">upload_events</code>
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('database')}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors cursor-pointer"
          >
            Inspect PostgreSQL Tables →
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {events.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No audit events logged yet. Upload files to observe live MD5 duplicate detection.
            </div>
          ) : (
            events.slice(0, 7).map((ev) => (
              <div key={ev.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold whitespace-nowrap shrink-0 ${
                    ev.event_type === 'UPLOAD_NEW'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200/70'
                      : ev.event_type === 'UPLOAD_DUPLICATE'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200/70'
                      : ev.event_type === 'FILE_DELETED'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200/70'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {ev.event_type}
                  </span>
                  <span className="font-medium text-slate-900 truncate max-w-[280px]" title={ev.filename}>
                    {ev.filename}
                  </span>
                  {ev.md5_hash && (
                    <span className="hidden sm:inline font-mono text-slate-400 text-[11px]">
                      hash:{ev.md5_hash.slice(0, 8)}...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-slate-500 shrink-0">
                  <span className="font-mono tabular-nums text-slate-700 font-medium">
                    {formatBytes(ev.file_size)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
