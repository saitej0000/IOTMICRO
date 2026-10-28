# Database Design & Security Specification: Supabase PostgreSQL

## 1. Relational Entity-Relationship Diagram

```
+------------------------+             1:N              +--------------------------+
|     file_contents      | --------------------------< |        user_files        |
+------------------------+                              +--------------------------+
| PK id (UUID)           |                              | PK id (UUID)             |
|    owner_id (UUID)     |                              |    owner_id (UUID)       |
|    md5_hash (VARCHAR32)|                              |    original_filename     |
|    file_size (BIGINT)  |                              | FK content_id (UUID)     |
|    storage_path (TEXT) |                              |    mime_type             |
|    reference_count     |                              |    upload_date           |
|    created_at          |                              |    is_duplicate (BOOL)   |
+------------------------+                              +--------------------------+
       UNIQUE(owner_id, md5_hash)

+------------------------+
|     upload_events      |
+------------------------+
| PK id (UUID)           |
|    owner_id (UUID)     |
|    filename (TEXT)     |
|    event_type (VARCHAR)|
|    file_size (BIGINT)  |
|    md5_hash (VARCHAR32)|
|    created_at          |
+------------------------+
```

## 2. Table Schemas & Constraints

### `file_contents`
Stores content-addressable physical metadata deduplicated per owner namespace.
- `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
- `owner_id UUID NOT NULL`: Scopes deduplication to authenticated user.
- `md5_hash VARCHAR(32) NOT NULL`: Exact 32-character hexadecimal digest.
- `file_size BIGINT NOT NULL CHECK (file_size >= 0)`: Stored byte count.
- `storage_path TEXT NOT NULL`: Supabase bucket object key (`{owner_id}/{md5_hash}`).
- `reference_count INTEGER NOT NULL DEFAULT 1 CHECK (reference_count >= 0)`: Active references.
- `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
- `CONSTRAINT uq_owner_md5 UNIQUE (owner_id, md5_hash)`

### `user_files`
Stores user-facing logical file references.
- `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
- `owner_id UUID NOT NULL`
- `original_filename VARCHAR(255) NOT NULL`
- `content_id UUID NOT NULL REFERENCES file_contents(id) ON DELETE RESTRICT`
- `mime_type VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream'`
- `upload_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
- `is_duplicate BOOLEAN NOT NULL DEFAULT FALSE`

### `upload_events`
Audit trail of all file actions and telemetry uploads.
- `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
- `owner_id UUID NOT NULL`
- `filename VARCHAR(255) NOT NULL`
- `event_type VARCHAR(50) NOT NULL`: Values: `UPLOAD_NEW`, `UPLOAD_DUPLICATE`, `FILE_RENAMED`, `FILE_DELETED`, `CONTENT_PURGED`
- `file_size BIGINT NOT NULL`
- `md5_hash VARCHAR(32)`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

## 3. Row Level Security (RLS) Strategy

Row Level Security is enabled on all tables:
```sql
ALTER TABLE file_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_events ENABLE ROW LEVEL SECURITY;
```

Each policy inspects the Supabase JWT token `auth.uid()`:
- `USING (auth.uid() = owner_id)` for SELECT / DELETE operations.
- `WITH CHECK (auth.uid() = owner_id)` for INSERT / UPDATE operations.
This guarantees strict cryptographic and logical isolation between student/user accounts.
