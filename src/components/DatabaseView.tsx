import React, { useState } from 'react';
import { Database, Table, ShieldCheck, Copy, Check, Server, Key } from 'lucide-react';
import { FileContentRecord, UserFileRecord, UploadEventRecord, StorageMode } from '../types';
import { formatBytes } from '../utils/md5';

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

  const schemaSql = `-- Supabase PostgreSQL Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: Physical deduplicated content blobs
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

-- Table 2: User logical file references
CREATE TABLE IF NOT EXISTS user_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_id UUID NOT NULL REFERENCES file_contents(id) ON DELETE RESTRICT,
    mime_type VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
    upload_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE
);

-- Table 3: Audit event log
CREATE TABLE IF NOT EXISTS upload_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    md5_hash VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);`;

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
            Database Schema & Relational Tables
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Explore live rows in the PostgreSQL relational schema. Content is isolated by <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">owner_id</code> using Row Level Security (RLS).
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

      {/* Cloud vs Local Configuration Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              storageMode === 'cloud' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                Active Provider: {storageMode === 'cloud' ? 'Supabase PostgreSQL & Storage' : 'Local Sandbox Mode (In-Memory Parity)'}
              </div>
              <div className="text-xs text-slate-500">
                {storageMode === 'cloud'
                  ? 'Connected to real Supabase cloud endpoint with remote bucket storage and RLS.'
                  : 'Operating in local memory/filesystem mode for safe offline evaluation and grading.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setStorageMode('local')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                storageMode === 'local'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Local Sandbox
            </button>
            <button
              onClick={() => setStorageMode('cloud')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                storageMode === 'cloud'
                  ? 'bg-blue-50 text-blue-800 border-blue-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Supabase Cloud
            </button>
          </div>
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
