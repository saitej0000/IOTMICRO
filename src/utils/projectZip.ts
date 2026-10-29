import JSZip from 'jszip';

export async function generateProjectZip(): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder('cloud-file-manager') || zip;

  // Root files
  root.file('requirements.txt', `streamlit==1.42.0
supabase==2.13.0
gotrue==2.11.2
postgrest==0.19.0
storage3==0.9.1
python-dotenv==1.0.1
pandas==2.2.3
altair==5.5.0
pytest==8.3.4
requests==2.32.3
pydantic==2.10.6
`);

  root.file('.env', `# Supabase Cloud Configuration
SUPABASE_URL=https://urndmxoqyyjjifrsrvno.supabase.co
SUPABASE_KEY=sb_publishable_Rhqcuv-fxEdcTaWlvh65Hw_P-eukDwh
SUPABASE_BUCKET=files
APP_MODE=cloud
MAX_FILE_SIZE_MB=50
ENABLE_SHA256_FALLBACK=false
`);

  root.file('.env.example', `# Supabase Cloud Configuration
SUPABASE_URL=https://urndmxoqyyjjifrsrvno.supabase.co
SUPABASE_KEY=sb_publishable_Rhqcuv-fxEdcTaWlvh65Hw_P-eukDwh
SUPABASE_BUCKET=files
APP_MODE=cloud
MAX_FILE_SIZE_MB=50
ENABLE_SHA256_FALLBACK=false
`);

  root.file('.gitignore', `venv/
.venv/
__pycache__/
*.py[cod]
.env
.env.local
.pytest_cache/
local_storage/
iot_logs/
.vscode/
`);

  root.file('README.md', `# Cloud-Based Improved File Handling and Duplication Removal Using MD5

## Quick Start on Windows using VS Code
1. Open folder in VS Code
2. Open PowerShell Terminal:
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   python -m venv venv
   .\\venv\\Scripts\\Activate.ps1
3. Install dependencies:
   pip install -r requirements.txt
4. Run verification tests:
   python tests/run_tests.py
5. Start Streamlit dashboard:
   streamlit run app.py
`);

  // Database
  const db = root.folder('database');
  if (db) {
    db.file('schema.sql', `-- Database Schema for Supabase PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE TABLE IF NOT EXISTS user_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_id UUID NOT NULL REFERENCES file_contents(id) ON DELETE RESTRICT,
    mime_type VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
    upload_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS upload_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    md5_hash VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
`);

    db.file('policies.sql', `-- Row Level Security (RLS) Policies
ALTER TABLE file_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own file contents" ON file_contents FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own file contents" ON file_contents FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own file contents" ON file_contents FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own file contents" ON file_contents FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view own files" ON user_files FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own files" ON user_files FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own files" ON user_files FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own files" ON user_files FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view own upload events" ON upload_events FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own upload events" ON upload_events FOR INSERT WITH CHECK (auth.uid() = owner_id);
`);
  }

  // App.py
  root.file('app.py', `import os
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

from services.hashing import calculate_md5, calculate_sha256
from services.cloud_storage import get_storage_service
from services.database_service import get_database_service
from services.file_service import FileManagementService
from services.analytics import AnalyticsService
from services.auth_service import AuthService
from iot.simulator import IoTSensorSimulator

st.set_page_config(page_title="MD5 Cloud File Deduplication", page_icon="☁️", layout="wide")
st.title("Cloud-Based Improved File Handling and Duplication Removal Using MD5")
st.info("College-level IoT and Cloud Virtualization Micro Project. Refer to README.md and docs/ for details.")
`);

  return await zip.generateAsync({ type: 'blob' });
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
