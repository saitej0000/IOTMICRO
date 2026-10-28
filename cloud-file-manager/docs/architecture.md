# Architecture Documentation: Cloud-Based File Handling & MD5 Deduplication

## 1. System High-Level Topology

```
+-------------------------------------------------------------------------+
|                              PRESENTATION LAYER                         |
|   +-----------------------------------------------------------------+   |
|   |   Streamlit Web Dashboard (Port 8501) / Interactive Web App     |   |
|   |   - Dashboard KPIs & Cards      - Duplicate Inspector & Hashes  |   |
|   |   - Multi-format File Uploader  - IoT Telemetry Node Simulator  |   |
|   |   - My Files Table & Actions    - Storage Optimization Charts   |   |
|   +-----------------------------------------------------------------+   |
+-------------------------------------------------------------------------+
                                    │
                                    │ (Python Service API Calls)
                                    ▼
+-------------------------------------------------------------------------+
|                               BUSINESS LAYER                            |
|   +-------------------+  +--------------------+  +------------------+   |
|   |  Hashing Engine   |  |  File Management   |  | Analytics Engine |   |
|   |  - 128-bit MD5    |  |  - Sanitization    |  | - Logical vs Phys|   |
|   |  - 256-bit SHA256 |  |  - Ref Counting    |  | - Optimization % |   |
|   |  - Byte Matcher   |  |  - Safe Garbage Coll| | - Ratio (Xx)     |   |
|   +-------------------+  +--------------------+  +------------------+   |
+-------------------------------------------------------------------------+
                    │                                   │
                    ▼                                   ▼
+-----------------------------------+   +---------------------------------+
|          PERSISTENCE LAYER        |   |           STORAGE LAYER         |
|   +---------------------------+   |   |   +-------------------------+   |
|   |    Supabase PostgreSQL    |   |   |   |     Supabase Storage    |   |
|   | - file_contents table     |   |   |   | - Private 'files' bucket|   |
|   | - user_files table        |   |   |   | - Content-addressed path|   |
|   | - upload_events table     |   |   |   |   {owner_id}/{md5_hash} |   |
|   | - Row Level Security (RLS)|   |   |   +-------------------------+   |
|   +---------------------------+   |   +---------------------------------+
+-----------------------------------+
```

## 2. Ingestion Decision State Machine

```
Upload Requested (file_bytes, filename)
      │
      ▼
Check constraints: (size > 0 && size <= MAX_SIZE_MB)
      │
      ▼
Compute MD5: digest = hashlib.md5(file_bytes).hexdigest()
      │
      ▼
SELECT * FROM file_contents WHERE owner_id = :uid AND md5_hash = :digest
      │
      ├───> MATCH FOUND?
      │        │
      │        ├── YES: [Duplicate Branch]
      │        │      1. UPDATE file_contents SET ref_count = ref_count + 1
      │        │      2. INSERT INTO user_files(..., content_id, is_duplicate=TRUE)
      │        │      3. INSERT INTO upload_events(..., type='UPLOAD_DUPLICATE')
      │        │      4. Return (Saved bytes = file_size, 0 cloud storage written)
      │        │
      │        └── NO:  [New Content Branch]
      │               1. UPLOAD bytes to Supabase Storage: /{uid}/{digest}
      │               2. INSERT INTO file_contents(..., ref_count=1)
      │               3. INSERT INTO user_files(..., is_duplicate=FALSE)
      │               4. INSERT INTO upload_events(..., type='UPLOAD_NEW')
      │               5. Return (Bytes uploaded = file_size)
```

## 3. Safe Deletion & Garbage Collection Workflow

```
Delete Request (user_file_id, owner_id)
      │
      ▼
Find target in user_files WHERE id = :user_file_id AND owner_id = :owner_id
      │
      ▼
DELETE FROM user_files WHERE id = :user_file_id
      │
      ▼
UPDATE file_contents SET ref_count = ref_count - 1 WHERE id = :content_id
      │
      ├── Remaining ref_count > 0?
      │        │
      │        └── YES: Do NOT touch Supabase Storage (other files share blob).
      │
      └── Remaining ref_count == 0?
               │
               └── YES: [Orphaned Content Cleanup]
                     1. DELETE FROM file_contents WHERE id = :content_id
                     2. Call Supabase Storage: remove(['{owner_id}/{md5_hash}'])
                     3. Log 'CONTENT_PURGED' in upload_events
```
