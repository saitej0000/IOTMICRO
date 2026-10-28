import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, RefreshCw, FileText, ArrowRight, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { computeMD5FromBuffer, computeSHA256FromBuffer, formatBytes, readFileAsArrayBuffer, readFileAsDataURL } from '../utils/md5';
import { FileContentRecord, UserFileRecord, UploadEventRecord } from '../types';

interface UploadViewProps {
  ownerId: string;
  contents: FileContentRecord[];
  onAddUpload: (
    newContent: FileContentRecord | null,
    newUserFile: UserFileRecord,
    newEvent: UploadEventRecord,
    isDuplicate: boolean
  ) => void;
  onNavigateFiles: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  ownerId,
  contents,
  onAddUpload,
  onNavigateFiles,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentHashedName, setCurrentHashedName] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<Array<{
    filename: string;
    size: number;
    md5: string;
    sha256: string;
    isDuplicate: boolean;
    savedBytes: number;
    refCount: number;
  }>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);
    const results: typeof uploadResults = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentHashedName(file.name);
        
        if (file.size === 0) {
          throw new Error(`File "${file.name}" is empty (0 bytes). Empty files cannot be stored.`);
        }
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds maximum allowed limit of 50 MB.`);
        }

        const buffer = await readFileAsArrayBuffer(file);
        const dataUrl = await readFileAsDataURL(file);
        const md5Hash = computeMD5FromBuffer(buffer);
        const sha256Hash = await computeSHA256FromBuffer(buffer);

        const existing = contents.find(
          c => c.owner_id === ownerId && c.md5_hash === md5Hash
        );

        const now = new Date().toISOString();
        const userFileId = `uf-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        if (existing) {
          const updatedRefCount = existing.reference_count + 1;

          const userFile: UserFileRecord = {
            id: userFileId,
            owner_id: ownerId,
            original_filename: file.name,
            content_id: existing.id,
            mime_type: file.type || 'application/octet-stream',
            upload_date: now,
            is_duplicate: true,
            md5_hash: md5Hash,
            file_size: file.size,
            reference_count: updatedRefCount,
          };

          const event: UploadEventRecord = {
            id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            owner_id: ownerId,
            filename: file.name,
            event_type: 'UPLOAD_DUPLICATE',
            file_size: file.size,
            md5_hash: md5Hash,
            created_at: now,
          };

          onAddUpload(null, userFile, event, true);

          results.push({
            filename: file.name,
            size: file.size,
            md5: md5Hash,
            sha256: sha256Hash,
            isDuplicate: true,
            savedBytes: file.size,
            refCount: updatedRefCount,
          });
        } else {
          const contentId = `cnt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
          const storagePath = `${ownerId}/${md5Hash}`;

          const newContent: FileContentRecord = {
            id: contentId,
            owner_id: ownerId,
            md5_hash: md5Hash,
            sha256_hash: sha256Hash,
            file_size: file.size,
            storage_path: storagePath,
            reference_count: 1,
            created_at: now,
            dataUrl: dataUrl,
          };

          const userFile: UserFileRecord = {
            id: userFileId,
            owner_id: ownerId,
            original_filename: file.name,
            content_id: contentId,
            mime_type: file.type || 'application/octet-stream',
            upload_date: now,
            is_duplicate: false,
            md5_hash: md5Hash,
            file_size: file.size,
            reference_count: 1,
          };

          const event: UploadEventRecord = {
            id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            owner_id: ownerId,
            filename: file.name,
            event_type: 'UPLOAD_NEW',
            file_size: file.size,
            md5_hash: md5Hash,
            created_at: now,
          };

          onAddUpload(newContent, userFile, event, false);

          results.push({
            filename: file.name,
            size: file.size,
            md5: md5Hash,
            sha256: sha256Hash,
            isDuplicate: false,
            savedBytes: 0,
            refCount: 1,
          });
        }
      }

      setUploadResults(results);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during file upload processing.');
    } finally {
      setIsProcessing(false);
      setCurrentHashedName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleSimulateSyntheticFile = (filename: string, contentStr: string) => {
    const blob = new Blob([contentStr], { type: 'text/plain' });
    const file = new File([blob], filename, { type: 'text/plain' });
    processFiles([file]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
          File Ingestion &amp; Deduplication Engine
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Files are hashed directly from raw byte content on the server. If identical content already exists, redundant cloud storage is prevented.
        </p>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/60 scale-[1.005]'
            : 'border-slate-300 hover:border-slate-400 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />
        
        {isProcessing ? (
          <div className="py-4 space-y-3">
            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mx-auto" />
            <div className="text-sm font-semibold text-slate-800">
              Hashing &amp; Comparing with Cloud Storage...
            </div>
            <div className="text-xs font-mono text-indigo-600">
              {currentHashedName || 'Analyzing payload...'}
            </div>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center mb-4 shadow-xs">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Drag &amp; drop files here, or click to browse
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Supports PDF, DOCX, TXT, CSV, XLS, JPG, PNG, JSON, ZIP, and IoT sensor logs. Max 50 MB per file.
            </p>
            <span className="inline-block px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors">
              Browse Computer
            </span>
          </>
        )}
      </div>

      {/* Quick Test Samples */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 mb-3">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Interactive Test Ingestion Shortcuts</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => handleSimulateSyntheticFile('iot_weather_log_2026.json', '{"sensor":"dht22","temp":24.5,"humidity":60.0,"ts":"2026-10-28T03:00:00Z"}')}
            className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Upload IoT Weather Log (.json)
          </button>
          <button
            onClick={() => handleSimulateSyntheticFile('renamed_identical_weather_log.json', '{"sensor":"dht22","temp":24.5,"humidity":60.0,"ts":"2026-10-28T03:00:00Z"}')}
            className="px-3 py-1.5 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Upload Identical Content with Different Name (Duplicate Test)
          </button>
          <button
            onClick={() => handleSimulateSyntheticFile('lab_btech_microproject_report.txt', 'B.Tech Cloud Virtualization Micro Project 2026 - Academic Final Submission Documentation')}
            className="px-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Upload Lab Report (.txt)
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Processing Results */}
      {uploadResults.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Upload Processing Results ({uploadResults.length} file{uploadResults.length > 1 ? 's' : ''})
            </h3>
            <button
              onClick={onNavigateFiles}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <span>View in My Files</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {uploadResults.map((r, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border text-xs ${
                  r.isDuplicate
                    ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    {r.isDuplicate ? (
                      <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 font-semibold rounded text-[10px] font-mono whitespace-nowrap">
                        DUPLICATE DETECTED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-900 font-semibold rounded text-[10px] font-mono whitespace-nowrap">
                        NEW OBJECT STORED
                      </span>
                    )}
                    <span className="font-semibold text-sm">{r.filename}</span>
                    <span className="text-slate-500 font-mono">({formatBytes(r.size)})</span>
                  </div>

                  <div className="text-right">
                    <span className="font-medium">
                      {r.isDuplicate
                        ? `Saved ${formatBytes(r.savedBytes)} cloud storage · Reused blob (Refs: ${r.refCount})`
                        : `Written to cloud storage bucket (Refs: 1)`}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-black/5 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-600 font-mono">
                  <div>
                    <span className="text-slate-400">MD5: </span>
                    <span className="text-slate-800">{r.md5}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">SHA-256: </span>
                    <span className="text-slate-800">{r.sha256.slice(0, 16)}...</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
