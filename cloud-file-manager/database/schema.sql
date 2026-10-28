-- ============================================================================
-- Project: Cloud-Based Improved File Handling and Duplication Removal Using MD5
-- Database Schema for Supabase PostgreSQL
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: file_contents
-- Stores unique physical content objects deduplicated by (owner_id, md5_hash)
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

CREATE INDEX IF NOT EXISTS idx_file_contents_owner_md5 
    ON file_contents (owner_id, md5_hash);

CREATE INDEX IF NOT EXISTS idx_file_contents_owner 
    ON file_contents (owner_id);

-- Table 2: user_files
-- Stores logical file entries/references created by users
CREATE TABLE IF NOT EXISTS user_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_id UUID NOT NULL REFERENCES file_contents(id) ON DELETE RESTRICT,
    mime_type VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
    upload_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_user_files_owner 
    ON user_files (owner_id);

CREATE INDEX IF NOT EXISTS idx_user_files_content 
    ON user_files (content_id);

CREATE INDEX IF NOT EXISTS idx_user_files_filename 
    ON user_files (owner_id, original_filename);

-- Table 3: upload_events
-- Audit trail and telemetry for file events and storage analytics
CREATE TABLE IF NOT EXISTS upload_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, 
    -- Event types: 'UPLOAD_NEW', 'UPLOAD_DUPLICATE', 'FILE_RENAMED', 'FILE_DELETED', 'CONTENT_PURGED'
    file_size BIGINT NOT NULL DEFAULT 0,
    md5_hash VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_upload_events_owner_date 
    ON upload_events (owner_id, created_at DESC);
