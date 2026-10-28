# Viva Voce Questions & Answers: Cloud File Deduplication Using MD5

### Academic Level: B.Tech Computer Science / IoT & Cloud Virtualization
**Project Title:** Cloud-Based Improved File Handling and Duplication Removal Using MD5

---

## 15 Key Viva Questions & Answers

### Q1: What is data deduplication, and why is it crucial in cloud computing?
**Answer:** Data deduplication is a specialized data compression technique that eliminates redundant copies of identical data. In cloud computing and IoT environments, multiple users or automated sensor devices frequently upload identical files. Deduplication ensures that only a single physical copy of the data is stored in cloud object storage, while multiple lightweight logical pointers (metadata) refer to that single instance. This saves storage costs, reduces network bandwidth, and optimizes backup windows.

### Q2: Why did you choose MD5 for hashing, and what are its properties?
**Answer:** MD5 (Message-Digest Algorithm 5) produces a fixed 128-bit (16-byte) cryptographic digest, represented as a 32-character hexadecimal string. We chose MD5 because:
1. It is computationally lightweight, fast to compute on edge gateways and micro-controllers.
2. It provides deterministic fingerprints: identical bytes always yield the identical hash.
3. Even a 1-bit difference in input produces a completely different hash (avalanche effect).

### Q3: What is an MD5 hash collision, and how does your project address it?
**Answer:** A hash collision occurs when two different inputs produce the exact same hash output. While theoretically possible in MD5, in our architecture:
1. We check both the MD5 hash and the exact byte file size.
2. We include an optional byte-by-byte direct verification step before reusing an existing storage object.
3. Our service abstraction layer is designed to support SHA-256 (256-bit digest) alongside or in place of MD5 for cryptographic security.

### Q4: Explain the difference between "Logical Storage" and "Physical Storage".
**Answer:**
- **Logical Storage:** The sum of the file sizes of all active file entries seen by the user in their dashboard (e.g., if a user uploads five 10 MB files, logical storage is 50 MB).
- **Physical Storage:** The actual disk space consumed in the cloud storage bucket (e.g., if all five 10 MB files are duplicates, only one 10 MB object is stored physically).
- **Storage Saved:** $\text{Logical Storage} - \text{Physical Storage} = 50\text{ MB} - 10\text{ MB} = 40\text{ MB}$ (80% optimization).

### Q5: How is reference counting used during file deletion?
**Answer:** When content is first uploaded, its `reference_count` is set to 1 in the `file_contents` table. Each duplicate upload increments this count. When a user deletes a file, we delete the logical record from `user_files` and decrement the `reference_count` of the content record:
- If `reference_count > 0`: The underlying content blob in cloud storage is kept intact because other files still point to it.
- If `reference_count == 0`: This was the last reference. The system automatically purges the physical file from the Supabase Storage bucket and removes the database row (garbage collection).

### Q6: What happens when a user renames a file?
**Answer:** In our system, renaming a file only updates the `original_filename` column in the `user_files` table. The underlying `content_id`, `md5_hash`, and physical storage object remain untouched. No network data is re-uploaded, and no storage is duplicated.

### Q7: Why do you calculate the MD5 hash on the server instead of trusting client input?
**Answer:** Trusting a client-provided hash violates zero-trust cloud security principles. A malicious client could provide the hash of a sensitive file they do not possess, thereby gaining unauthorized access or corrupting system references. Computing the hash from the actual received bytes on the server guarantees authenticity.

### Q8: How does your database prevent duplicate races during concurrent uploads?
**Answer:** In our PostgreSQL schema, the `file_contents` table enforces a unique constraint:
`CONSTRAINT uq_owner_md5 UNIQUE (owner_id, md5_hash)`.
If two identical uploads occur simultaneously, the database unique index ensures only one physical content record is committed.

### Q9: Why is deduplication scoped to each user instead of globally across all users in Version 1?
**Answer:** Cross-user global deduplication introduces security vulnerabilities such as "Proof-of-Ownership" attacks and information disclosure (where User B can deduce that User A has uploaded a specific file by seeing an instant upload or duplicate hit). User-scoped deduplication isolates each tenant while still providing massive savings for repetitive user and device workloads.

### Q10: What role does Supabase play in your project architecture?
**Answer:** Supabase provides two core cloud capabilities:
1. **Supabase PostgreSQL:** Stores the relational schema (`file_contents`, `user_files`, `upload_events`) with Row Level Security (RLS) policies.
2. **Supabase Storage:** S3-compatible private cloud bucket (`files`) storing the deduplicated binary objects under `{owner_id}/{md5_hash}` paths.

### Q11: How does the IoT simulation connect to the project theme?
**Answer:** IoT sensor nodes in industrial chambers or smart buildings often transmit periodic status logs. When environmental conditions are static (e.g., room temperature constant at 24°C), consecutive telemetry files have identical byte structures. Our IoT simulator demonstrates that repeated sensor logs are deduplicated automatically, saving bandwidth and cloud storage without losing time-series log history.

### Q12: How does Row Level Security (RLS) protect user data?
**Answer:** RLS policies in PostgreSQL inspect the authenticated user's token (`auth.uid()`). A user querying `user_files` can only see rows where `owner_id = auth.uid()`. Even if an attacker attempts an SQL injection or directly queries the API, the database engine enforces tenant isolation at the row level.

### Q13: What happens if cloud storage is down or credentials are not configured?
**Answer:** The application implements a clear `StorageProvider` and `DatabaseService` abstraction. If cloud credentials are not supplied, the app runs in **Local Demo Mode** using local filesystem storage and in-memory/SQLite persistence. The UI clearly labels this as a local sandbox so reviewers are not misled.

### Q14: What metrics does your analytics module calculate?
**Answer:**
1. Total files registered ($N$).
2. Unique content objects ($U$).
3. Duplicate uploads detected ($D = N - U$).
4. Logical storage bytes ($S_L$).
5. Physical content bytes ($S_P$).
6. Storage saved ($S_{saved} = S_L - S_P$).
7. Storage optimization percentage ($O\% = \frac{S_{saved}}{S_L} \times 100$).
8. Deduplication ratio ($R = \frac{S_L}{S_P}$).

### Q15: What are the main limitations of file-level deduplication compared to chunk-level deduplication?
**Answer:** File-level deduplication only detects identical whole files. If a single byte in a 100 MB video or document changes, the entire file receives a different hash and must be re-stored. In contrast, chunk-level deduplication (e.g. Rabin fingerprinting or Content-Defined Chunking) splits files into 4KB–64KB blocks, deduplicating unchanged blocks even if parts of the file were edited.

---

## 2-Minute College Project Presentation Pitch

> "Good morning respected examiners and mentor. Today I present our micro project: **Cloud-Based Improved File Handling and Duplication Removal Using MD5**.
>
> In cloud virtualization and IoT systems, up to 70% of stored backup data consists of redundant, identical files. Conventional storage systems store each uploaded file independently, resulting in severe cloud storage waste and high financial costs.
>
> Our project introduces an intelligent content-addressable storage manager. Whenever a file is uploaded—whether from an end user or an IoT telemetry node—our server computes a 128-bit MD5 cryptographic hash from the raw bytes. We query Supabase PostgreSQL to verify whether that hash exists in the user's namespace.
>
> If it's a new file, we write it once to our private Supabase Storage bucket and create a metadata reference. If it's a duplicate—even under a different filename—we bypass the cloud upload completely and create an atomic metadata reference pointing to the existing stored object.
>
> We also implement reference counting so that deleting one reference never destroys shared content, and deleting the last reference automatically purges the cloud object. Our live IoT simulator proves that repeating sensor logs can yield over 70% storage savings. All 17 automated unit tests passed with a 100% pass rate. Thank you, and I look forward to your questions."
