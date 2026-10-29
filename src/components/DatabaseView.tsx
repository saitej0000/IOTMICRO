import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Table, 
  ShieldCheck, 
  Copy, 
  Check, 
  Server, 
  Key, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Layers
} from 'lucide-react';
import { FileContentRecord, UserFileRecord, UploadEventRecord, StorageMode } from '../types';
import { formatBytes } from '../utils/md5';
import { 
  SUPABASE_URL, 
  SUPABASE_KEY, 
  SUPABASE_BUCKET, 
  checkSupabaseHealth, 
  SupabaseHealthStatus 
} from '../utils/supabaseClient';

interface DatabaseViewProps {
  contents: FileContentRecord[];
  files: UserFileRecord[];
  events: UploadEventRecord[];
  storageMode: StorageMode;
  setStorageMode: (mode: StorageMode) => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  contents,
  files,
  events,
  storageMode,
  setStorageMode,
}) => {
  const [activeTable, setActiveTable] = useState<'contents' | 'files' | 'events'>('contents');
  const [copiedSql, setCopiedSql] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthStatus, setHealthStatus] = useState<SupabaseHealthStatus | null>(null);

  const runHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const status = await checkSupabaseHealth();
      setHealthStatus(status);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const schemaSql = `-- ============================================================================
-- Project: Cloud-Based Improved File Handling and Duplication Removal Using MD5
-- Run in Supabase SQL Editor: https://urndmxoqyyjjifrsrvno.supabase.co
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: file_contents (Single-instance physical content blobs)
CREATE TABLE IF NOT EXISTS file_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    md5_hash VARCHAR(32) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size >= 0),
    storage_path TEXT NOT NULL,
    reference_count INTEGER NOT NULL DEFAULT 1 CHECK (reference_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_owner_md5 UNIQUE (owner_id, md5_hash)
);

CREATE INDEX IF NOT EXISTS idx_file_contents_owner_md5 ON file_contents (owner_id, md5_hash);

-- 2. Table: user_files (Logical file references)
CREATE TABLE IF NOT EXISTS user_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_id UUID NOT NULL REFERENCES file_contents(id) ON DELETE RESTRICT,
    mime_type VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
    upload_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_user_files_owner ON user_files (owner_id);
CREATE INDEX IF NOT EXISTS idx_user_files_content ON user_files (content_id);

-- 3. Table: upload_events (Audit trail & deduplication telemetry)
CREATE TABLE IF NOT EXISTS upload_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    md5_hash VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE file_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_events ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Users view own content" ON file_contents FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users insert own content" ON file_contents FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users update own content" ON file_contents FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users delete own content" ON file_contents FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users view own files" ON user_files FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users insert own files" ON user_files FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users update own files" ON user_files FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users delete own files" ON user_files FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users view own events" ON upload_events FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users insert own events" ON upload_events FOR INSERT WITH CHECK (auth.uid() = owner_id);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Database Schema &amp; Supabase Cloud Integration
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Connected to your Supabase PostgreSQL database. Inspect live tables, verify cloud health, and copy schema scripts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySql}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedSql ? 'Schema Copied!' : 'Copy SQL Schema'}</span>
          </button>
        </div>
      </div>

      {/* Supabase Connection Details Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <span>Supabase Project:</span>
                <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-blue-700 font-semibold">
                  urndmxoqyyjjifrsrvno
                </code>
              </div>
              <div className="text-xs text-slate-500 mt-0.5 font-mono">
                Endpoint: {SUPABASE_URL}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={runHealthCheck}
              disabled={isCheckingHealth}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
              <span>{isCheckingHealth ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              onClick={() => setStorageMode(storageMode === 'cloud' ? 'local' : 'cloud')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                storageMode === 'cloud'
                  ? 'bg-blue-50 text-blue-800 border-blue-300 font-semibold'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
              }`}
            >
              Mode: {storageMode === 'cloud' ? 'Cloud Enabled' : 'Local Sandbox'}
            </button>
          </div>
        </div>

        {/* Live Health Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between">
            <span className="text-slate-600">Endpoint API:</span>
            {healthStatus?.connected ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="text-slate-500">Checking...</span>
            )}
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between">
            <span className="text-slate-600">file_contents table:</span>
            <span className={`font-semibold ${healthStatus?.tableContentsExists ? 'text-emerald-700' : 'text-slate-500'}`}>
              {healthStatus?.tableContentsExists ? 'Detected' : 'Pending SQL'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between">
            <span className="text-slate-600">user_files table:</span>
            <span className={`font-semibold ${healthStatus?.tableUserFilesExists ? 'text-emerald-700' : 'text-slate-500'}`}>
              {healthStatus?.tableUserFilesExists ? 'Detected' : 'Pending SQL'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between">
            <span className="text-slate-600">Storage &apos;files&apos; bucket:</span>
            <span className={`font-semibold ${healthStatus?.bucketExists ? 'text-emerald-700' : 'text-slate-500'}`}>
              {healthStatus?.bucketExists ? 'Ready' : 'Create Private'}
            </span>
          </div>
        </div>

        {/* Helpful setup tip */}
        <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              To initialize your Supabase tables, click <strong>&quot;Copy SQL Schema&quot;</strong> and run it in your Supabase SQL Editor.
            </span>
          </div>
          <a
            href="https://supabase.com/dashboard/project/urndmxoqyyjjifrsrvno/sql"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline whitespace-nowrap"
          >
            <span>Open Supabase SQL Editor</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Table Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTable('contents')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTable === 'contents'
              ? 'bg-indigo-600 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>file_contents ({contents.length} rows)</span>
        </button>

        <button
          onClick={() => setActiveTable('files')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTable === 'files'
              ? 'bg-indigo-600 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>user_files ({files.length} rows)</span>
        </button>

        <button
          onClick={() => setActiveTable('events')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTable === 'events'
              ? 'bg-indigo-600 text-white font-semibold'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>upload_events ({events.length} rows)</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          {activeTable === 'contents' && (
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold font-sans">
                  <th className="py-3 px-4">id (UUID)</th>
                  <th className="py-3 px-4">md5_hash (VARCHAR32)</th>
                  <th className="py-3 px-4">file_size</th>
                  <th className="py-3 px-4">storage_path</th>
                  <th className="py-3 px-4">reference_count</th>
                  <th className="py-3 px-4">created_at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {contents.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-400">{row.id}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{row.md5_hash}</td>
                    <td className="py-2.5 px-4 tabular-nums">{row.file_size} B ({formatBytes(row.file_size)})</td>
                    <td className="py-2.5 px-4 text-indigo-700">{row.storage_path}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">{row.reference_count}</td>
                    <td className="py-2.5 px-4 text-slate-500">{row.created_at.slice(0, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTable === 'files' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">id (UUID)</th>
                  <th className="py-3 px-4">original_filename</th>
                  <th className="py-3 px-4">content_id (FK)</th>
                  <th className="py-3 px-4">mime_type</th>
                  <th className="py-3 px-4">is_duplicate</th>
                  <th className="py-3 px-4">upload_date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-mono">
                {files.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-400">{row.id}</td>
                    <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">{row.original_filename}</td>
                    <td className="py-2.5 px-4 text-indigo-600">{row.content_id}</td>
                    <td className="py-2.5 px-4 text-slate-500">{row.mime_type}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        row.is_duplicate ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {String(row.is_duplicate)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">{row.upload_date.slice(0, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTable === 'events' && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="py-3 px-4">id</th>
                  <th className="py-3 px-4">event_type</th>
                  <th className="py-3 px-4">filename</th>
                  <th className="py-3 px-4">file_size</th>
                  <th className="py-3 px-4">md5_hash</th>
                  <th className="py-3 px-4">created_at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] font-mono">
                {events.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-slate-400">{row.id}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-slate-800">{row.event_type}</span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-900">{row.filename}</td>
                    <td className="py-2.5 px-4 tabular-nums">{formatBytes(row.file_size)}</td>
                    <td className="py-2.5 px-4 text-slate-500">{row.md5_hash ? `${row.md5_hash.slice(0, 12)}...` : '-'}</td>
                    <td className="py-2.5 px-4 text-slate-500">{row.created_at.slice(0, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
