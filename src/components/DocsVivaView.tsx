import React, { useState } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  FileText, 
  Terminal, 
  Download, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Mic,
  Code2,
  FileCode
} from 'lucide-react';
import { VIVA_QUESTIONS, PRESENTATION_SCRIPT } from '../data/vivaData';

interface DocsVivaViewProps {
  onDownloadZip: () => void;
  isZipping: boolean;
}

const SAMPLE_CODE_SNIPPETS: Record<string, { filename: string; lang: string; desc: string; code: string }> = {
  hashing: {
    filename: 'services/hashing.py',
    lang: 'python',
    desc: 'Server-side 128-bit MD5 & 256-bit SHA-256 calculation with byte-level collision verification.',
    code: `import hashlib
from typing import Dict, Any

def calculate_md5(file_bytes: bytes) -> str:
    """Computes standard 128-bit MD5 hex digest from raw file bytes."""
    if not isinstance(file_bytes, (bytes, bytearray)):
        raise ValueError("Input must be binary bytes or bytearray.")
    return hashlib.md5(file_bytes).hexdigest().lower()

def calculate_sha256(file_bytes: bytes) -> str:
    """Computes 256-bit SHA-256 hex digest for cryptographic integrity verification."""
    if not isinstance(file_bytes, (bytes, bytearray)):
        raise ValueError("Input must be binary bytes or bytearray.")
    return hashlib.sha256(file_bytes).hexdigest().lower()

def verify_content_match(bytes_a: bytes, bytes_b: bytes) -> bool:
    """Direct byte comparison for zero false-positive collision check."""
    return bytes_a == bytes_b`
  },
  file_service: {
    filename: 'services/file_service.py',
    lang: 'python',
    desc: 'Core deduplication orchestration: checks hash, creates metadata reference, increments count, safe deletion.',
    code: `def process_file_upload(self, owner_id: str, filename: str, file_bytes: bytes, mime_type: str):
    # 1. Server-side MD5 computation
    md5_hash = calculate_md5(file_bytes)

    # 2. Query PostgreSQL within authenticated user scope
    existing_content = self.db.find_content_by_hash(owner_id, md5_hash)

    if existing_content:
        # DUPLICATE DETECTED: reuse existing storage object
        content_id = existing_content["id"]
        new_ref_count = self.db.increment_content_reference(content_id)
        user_file = self.db.create_user_file(owner_id, filename, content_id, mime_type, is_duplicate=True)
        self.db.log_event(owner_id, filename, "UPLOAD_DUPLICATE", len(file_bytes), md5_hash)
        return {"status": "DUPLICATE_DETECTED", "saved_bytes": len(file_bytes), "ref_count": new_ref_count}
    else:
        # NEW OBJECT: write once to Supabase Storage
        storage_path = self.storage.upload_content(owner_id, md5_hash, file_bytes)
        content_rec = self.db.create_content_record(owner_id, md5_hash, len(file_bytes), storage_path)
        user_file = self.db.create_user_file(owner_id, filename, content_rec["id"], mime_type, is_duplicate=False)
        self.db.log_event(owner_id, filename, "UPLOAD_NEW", len(file_bytes), md5_hash)
        return {"status": "NEW_UPLOAD", "saved_bytes": 0, "ref_count": 1}`
  },
  schema: {
    filename: 'database/schema.sql',
    lang: 'sql',
    desc: 'PostgreSQL relational schema with unique constraint on (owner_id, md5_hash).',
    code: `CREATE TABLE IF NOT EXISTS file_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    md5_hash VARCHAR(32) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size >= 0),
    storage_path TEXT NOT NULL,
    reference_count INTEGER NOT NULL DEFAULT 1 CHECK (reference_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_owner_md5 UNIQUE (owner_id, md5_hash)
);

CREATE TABLE IF NOT EXISTS user_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_id UUID NOT NULL REFERENCES file_contents(id) ON DELETE RESTRICT,
    mime_type VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
    upload_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE
);`
  },
  iot: {
    filename: 'iot/simulator.py',
    lang: 'python',
    desc: 'Simulated edge sensor node transmitting telemetry logs and testing repeat-reading deduplication.',
    code: `class IoTSensorSimulator:
    def create_telemetry_file(self, device_id: str, file_format: str = "json", repeat_previous: bool = False):
        if repeat_previous and self.history:
            payload = self.history[-1] # Deterministic repeat
        else:
            payload = generate_sensor_payload(device_id=device_id)
            self.history.append(payload)

        file_bytes = json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")
        return f"{device_id.lower()}_telemetry.json", file_bytes`
  }
};

export const DocsVivaView: React.FC<DocsVivaViewProps> = ({
  onDownloadZip,
  isZipping,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'viva' | 'pitch' | 'code' | 'vscode' | 'report'>('viva');
  const [vivaSearch, setVivaSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState('hashing');
  const [copiedCode, setCopiedCode] = useState(false);

  const filteredViva = VIVA_QUESTIONS.filter(q => {
    const matchesSearch = 
      q.question.toLowerCase().includes(vivaSearch.toLowerCase()) ||
      q.answer.toLowerCase().includes(vivaSearch.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || q.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(PRESENTATION_SCRIPT);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(SAMPLE_CODE_SNIPPETS[selectedSnippet].code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Viva Voce &amp; Project Documentation Studio
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Complete academic reference material, 15+ viva answers, oral defense pitch, code explorer, and Windows setup commands.
          </p>
        </div>

        <button
          onClick={onDownloadZip}
          disabled={isZipping}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isZipping ? 'Bundling ZIP...' : 'Export Complete VS Code Project (.ZIP)'}</span>
        </button>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('viva')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
            activeSubTab === 'viva' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>15+ Viva Questions</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pitch')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
            activeSubTab === 'pitch' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Oral Defense Pitch</span>
        </button>

        <button
          onClick={() => setActiveSubTab('code')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
            activeSubTab === 'code' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Python Code Explorer</span>
        </button>

        <button
          onClick={() => setActiveSubTab('vscode')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
            activeSubTab === 'vscode' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Windows &amp; VS Code Guide</span>
        </button>

        <button
          onClick={() => setActiveSubTab('report')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
            activeSubTab === 'report' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Project Report</span>
        </button>
      </div>

      {/* VIEW: Viva Q&A */}
      {activeSubTab === 'viva' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search viva questions and concepts..."
                value={vivaSearch}
                onChange={(e) => setVivaSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="Core Concepts">Core Concepts</option>
              <option value="Algorithms">Algorithms &amp; Hashes</option>
              <option value="Cloud & DB">Cloud &amp; PostgreSQL</option>
              <option value="Security & IoT">Security &amp; IoT</option>
            </select>
          </div>

          <div className="space-y-3">
            {filteredViva.map((q) => {
              const isExpanded = expandedId === q.id;
              return (
                <div key={q.id} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold font-mono flex items-center justify-center shrink-0">
                        {q.id}
                      </span>
                      <div>
                        <span className="text-xs font-semibold text-slate-900 block">
                          {q.question}
                        </span>
                        <span className="text-[10px] text-slate-400">Category: {q.category}</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>
                  {isExpanded && (
                    <div className="p-4 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                      <p className="mt-2.5">{q.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: Code Explorer */}
      {activeSubTab === 'code' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-slate-900">
                  {SAMPLE_CODE_SNIPPETS[selectedSnippet].filename}
                </span>
                <span className="text-xs text-slate-400 font-normal">
                  — {SAMPLE_CODE_SNIPPETS[selectedSnippet].desc}
                </span>
              </div>
              <button
                onClick={handleCopySnippet}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedCode ? 'Copied Snippet!' : 'Copy Module'}</span>
              </button>
            </div>

            {/* Snippet Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(SAMPLE_CODE_SNIPPETS).map(([key, data]) => (
                <button
                  key={key}
                  onClick={() => setSelectedSnippet(key)}
                  className={`px-3 py-1.5 text-xs rounded-lg font-mono transition-colors cursor-pointer ${
                    selectedSnippet === key
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {data.filename}
                </button>
              ))}
            </div>

            {/* Code Block Display */}
            <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-96">
              <pre className="leading-relaxed">
                {SAMPLE_CODE_SNIPPETS[selectedSnippet].code}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Presentation Pitch */}
      {activeSubTab === 'pitch' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-600" />
              <span>Recommended 2-Minute College Viva Presentation Script</span>
            </h2>
            <button
              onClick={handleCopyPitch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              {copiedPitch ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedPitch ? 'Copied Pitch!' : 'Copy Pitch Script'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Use this structured speech when the examiner asks: <em>&quot;Please give us a 2-minute overview of your project, its architecture, and real-world applicability.&quot;</em>
          </p>

          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line">
            {PRESENTATION_SCRIPT}
          </div>
        </div>
      )}

      {/* VIEW: Windows & VS Code Setup */}
      {activeSubTab === 'vscode' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4 text-xs text-slate-700">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-600" />
            <span>Windows &amp; VS Code Execution Instructions</span>
          </h2>

          <div className="space-y-3">
            <div>
              <div className="font-semibold text-slate-900 mb-1">Step 1: Open Terminal in PowerShell</div>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`# 1. Allow execution of PowerShell scripts if restricted
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# 2. Create Python virtual environment
python -m venv venv

# 3. Activate virtual environment
.\\venv\\Scripts\\Activate.ps1`}
              </pre>
            </div>

            <div>
              <div className="font-semibold text-slate-900 mb-1">Step 2: Install Dependencies</div>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`pip install -r requirements.txt`}
              </pre>
            </div>

            <div>
              <div className="font-semibold text-slate-900 mb-1">Step 3: Run Automated Verification Tests (17/17)</div>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`python tests/run_tests.py
# or using pytest:
pytest tests/`}
              </pre>
            </div>

            <div>
              <div className="font-semibold text-slate-900 mb-1">Step 4: Launch Streamlit Dashboard</div>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`streamlit run app.py`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: Project Report */}
      {activeSubTab === 'report' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              B.Tech Project Report Summary: Cloud-Based Improved File Handling and Duplication Removal Using MD5
            </h2>
            <div className="text-[11px] text-slate-400 mt-1">
              Course: B.Tech Micro Project (IoT &amp; Cloud Virtualization) · Academic Year: 2025–2026
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">1. Abstract</h3>
              <p>
                In cloud computing environments and IoT sensor networks, massive quantities of duplicate data are continuously generated and transmitted to cloud storage repositories. Conventional cloud file systems store each uploaded file independently, resulting in severe storage wastage, redundant network bandwidth consumption, and escalating cloud hosting costs. This project designs and develops a high-performance content-addressable file management system using MD5 cryptographic digests and Supabase Cloud Storage.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">2. Core Architectural Objectives</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Server-side 128-bit MD5 fingerprinting directly from uploaded binary content.</li>
                <li>Zero-trust client validation: client-provided hashes are never trusted.</li>
                <li>Atomic reference counting in PostgreSQL ensuring file deletions never break shared content.</li>
                <li>Automated storage garbage collection: physical objects are safely purged only when their last reference is deleted.</li>
                <li>IoT edge sensor simulation demonstrating over 70% storage savings on recurring telemetry.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">3. Automated Verification</h3>
              <p>
                The project contains 17 automated unit and integration tests covering hash determinism, single-copy persistence, multi-reference lifecycle, cross-user isolation, and analytical mathematical accuracy. All tests pass with a 100% pass rate.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
