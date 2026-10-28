-- ============================================================================
-- Project: Cloud-Based Improved File Handling and Duplication Removal Using MD5
-- Row Level Security (RLS) & Storage Access Policies for Supabase
-- ============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE file_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_events ENABLE ROW LEVEL SECURITY;

-- 2. Policies for file_contents
-- Users can only view and manage content records they own
CREATE POLICY "Users can view own file contents"
    ON file_contents FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own file contents"
    ON file_contents FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own file contents"
    ON file_contents FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own file contents"
    ON file_contents FOR DELETE
    USING (auth.uid() = owner_id);

-- 3. Policies for user_files
-- Users can only view, create, rename, and delete their own logical files
CREATE POLICY "Users can view own files"
    ON user_files FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own files"
    ON user_files FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own files (rename)"
    ON user_files FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own files"
    ON user_files FOR DELETE
    USING (auth.uid() = owner_id);

-- 4. Policies for upload_events
CREATE POLICY "Users can view own upload events"
    ON upload_events FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own upload events"
    ON upload_events FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- ============================================================================
-- 5. Supabase Storage Bucket Security (Storage bucket: 'files')
-- In Supabase Storage, objects have a 'name' typically formatted as '{owner_id}/{md5_hash}'
-- ============================================================================

-- Allow authenticated users to upload files to their own prefix folder
CREATE POLICY "Allow authenticated user upload to own prefix"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'files' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to read/download only their own objects
CREATE POLICY "Allow authenticated user download from own prefix"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'files' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow authenticated users to delete only their own objects
CREATE POLICY "Allow authenticated user delete from own prefix"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'files' AND 
        (storage.foldername(name))[1] = auth.uid()::text
    );
