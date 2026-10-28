import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  ShieldCheck, 
  FileCheck2, 
  Zap, 
  Layers, 
  FileText 
} from 'lucide-react';
import { computeMD5FromBuffer, computeSHA256FromBuffer, formatBytes, readFileAsArrayBuffer } from '../utils/md5';

export const DuplicateInspectorView: React.FC = () => {
  const [fileA, setFileA] = useState<{ name: string; size: number; md5: string; sha256: string; buffer: ArrayBuffer } | null>(null);
  const [fileB, setFileB] = useState<{ name: string; size: number; md5: string; sha256: string; buffer: ArrayBuffer } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Text quick tester
  const [textA, setTextA] = useState('B.Tech Cloud Virtualization Micro Project 2026');
  const [textB, setTextB] = useState('B.Tech Cloud Virtualization Micro Project 2026');

  const handleProcessFile = async (file: File, target: 'A' | 'B') => {
    setIsProcessing(true);
    try {
      const buffer = await readFileAsArrayBuffer(file);
      const md5 = computeMD5FromBuffer(buffer);
      const sha256 = await computeSHA256FromBuffer(buffer);
      const item = {
        name: file.name,
        size: file.size,
        md5,
        sha256,
        buffer,
      };
      if (target === 'A') setFileA(item);
      else setFileB(item);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const areBuffersIdentical = (bufA: ArrayBuffer, bufB: ArrayBuffer) => {
    if (bufA.byteLength !== bufB.byteLength) return false;
    const arrA = new Uint8Array(bufA);
    const arrB = new Uint8Array(bufB);
    for (let i = 0; i < arrA.length; i++) {
      if (arrA[i] !== arrB[i]) return false;
    }
    return true;
  };

  const isDuplicateMatch = fileA && fileB && fileA.md5 === fileB.md5;
  const isByteMatch = fileA && fileB && areBuffersIdentical(fileA.buffer, fileB.buffer);

  // Text hashes
  const textEnc = new TextEncoder();
  const textBufferA = textEnc.encode(textA).buffer;
  const textBufferB = textEnc.encode(textB).buffer;
  const textMd5A = computeMD5FromBuffer(textBufferA);
  const textMd5B = computeMD5FromBuffer(textBufferB);
  const isTextMatch = textMd5A === textMd5B;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
          MD5 Duplicate Detection & Hash Collision Inspector
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          Perform live side-by-side binary and text digest inspections. Demonstrates why identical contents with different filenames trigger single-instance storage.
        </p>
      </div>

      {/* Side-by-Side File Comparator */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-indigo-600" />
          <span>Binary File Comparator</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* File A Box */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="text-xs font-semibold text-slate-700 mb-2">Subject File A</div>
            <input
              type="file"
              onChange={(e) => e.target.files?.[0] && handleProcessFile(e.target.files[0], 'A')}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer mb-3"
            />
            {fileA ? (
              <div className="space-y-1.5 text-xs">
                <div className="font-medium text-slate-900 truncate">Filename: {fileA.name}</div>
                <div className="text-slate-500 font-mono">Size: {formatBytes(fileA.size)}</div>
                <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-800 break-all">
                  <span className="text-slate-400 block text-[10px]">MD5:</span>
                  {fileA.md5}
                </div>
                <div className="font-mono text-[10px] text-slate-500 break-all">
                  SHA-256: {fileA.sha256.slice(0, 32)}...
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">
                Select or upload file A
              </div>
            )}
          </div>

          {/* File B Box */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="text-xs font-semibold text-slate-700 mb-2">Subject File B</div>
            <input
              type="file"
              onChange={(e) => e.target.files?.[0] && handleProcessFile(e.target.files[0], 'B')}
              className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer mb-3"
            />
            {fileB ? (
              <div className="space-y-1.5 text-xs">
                <div className="font-medium text-slate-900 truncate">Filename: {fileB.name}</div>
                <div className="text-slate-500 font-mono">Size: {formatBytes(fileB.size)}</div>
                <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-800 break-all">
                  <span className="text-slate-400 block text-[10px]">MD5:</span>
                  {fileB.md5}
                </div>
                <div className="font-mono text-[10px] text-slate-500 break-all">
                  SHA-256: {fileB.sha256.slice(0, 32)}...
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">
                Select or upload file B
              </div>
            )}
          </div>
        </div>

        {/* Comparison Result Banner */}
        {fileA && fileB && (
          <div className={`mt-6 p-4 rounded-xl border text-xs ${
            isDuplicateMatch
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-3">
              {isDuplicateMatch ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-slate-400 shrink-0" />
              )}
              <div>
                <div className="font-bold text-sm">
                  {isDuplicateMatch ? 'Exact Duplicate Match Confirmed!' : 'Distinct Contents (No Duplicate)'}
                </div>
                <div className="text-[11px] mt-0.5">
                  {isDuplicateMatch
                    ? `Both files yield matching MD5 digest (${fileA.md5}). Byte-by-byte direct verification: ${isByteMatch ? 'PASS (100% Identical)' : 'COLLISION ALERT'}. The system creates a single storage object.`
                    : 'The MD5 hashes do not match. Each file will be stored independently in the cloud storage bucket.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live Text/Payload Hash Tester */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900 mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Interactive Avalanche Effect & Hashing Sandbox</span>
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Type or modify a single character in either box below. Observe how the 128-bit MD5 hex digest instantly shifts completely (avalanche effect).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Payload A:</label>
            <textarea
              value={textA}
              onChange={(e) => setTextA(e.target.value)}
              rows={3}
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="mt-1.5 font-mono text-[11px] text-slate-600 bg-slate-100 p-2 rounded">
              <span className="text-slate-400 text-[10px] block">MD5:</span>
              {textMd5A}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Payload B:</label>
            <textarea
              value={textB}
              onChange={(e) => setTextB(e.target.value)}
              rows={3}
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="mt-1.5 font-mono text-[11px] text-slate-600 bg-slate-100 p-2 rounded">
              <span className="text-slate-400 text-[10px] block">MD5:</span>
              {textMd5B}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">State Decision:</span>
          <span className={`font-semibold font-mono ${isTextMatch ? 'text-emerald-600' : 'text-slate-700'}`}>
            {isTextMatch ? 'MATCH (Deduplication Triggered)' : 'DIFFERENT (Two Storage Objects Created)'}
          </span>
        </div>
      </div>

      {/* Collision & Defense Architecture Notice */}
      <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-5 text-xs text-slate-600 leading-relaxed">
        <div className="flex items-center gap-2 font-semibold text-indigo-900 mb-1.5">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>MD5 Security & Collision Defense Strategy</span>
        </div>
        <p>
          While MD5 is fast and efficient for standard file deduplication in enterprise repositories and IoT edge nodes, theoretical collision attacks exist against ungrounded MD5 implementations. To guarantee absolute data integrity, this project's modular service architecture enforces:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700">
          <li><strong>Length Pre-Check:</strong> Files with differing byte sizes can never share an identical storage object.</li>
          <li><strong>Direct Byte Verification:</strong> Compares byte equality prior to database reference assignment.</li>
          <li><strong>Modular Cryptography:</strong> <code className="bg-white px-1 py-0.5 rounded border border-indigo-200">services/hashing.py</code> provides drop-in SHA-256 dual verification for mission-critical cloud deployments.</li>
        </ul>
      </div>
    </div>
  );
};
