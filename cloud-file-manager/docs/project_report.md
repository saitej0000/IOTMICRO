# B.Tech Project Report: Cloud-Based Improved File Handling and Duplication Removal Using MD5

**Course:** B.Tech Micro Project (IoT and Cloud Virtualization)  
**Academic Year:** 2025–2026  
**Project Domain:** Cloud Computing, Distributed File Systems, Cryptographic Hashing & IoT Edge Ingestion  

---

## 1. Abstract

In cloud computing environments and IoT sensor networks, massive quantities of duplicate data are continuously generated and transmitted to cloud storage repositories. Conventional cloud file systems store each uploaded file independently, resulting in severe storage wastage, redundant network bandwidth consumption, and escalating cloud hosting costs. 

This project, titled **“Cloud-Based Improved File Handling and Duplication Removal Using MD5”**, designs and develops a high-performance content-addressable file management system. By computing a 128-bit MD5 cryptographic hash from uploaded file bytes prior to committing data to physical storage, the system determines whether identical content already exists within the user's namespace. When duplicate content is detected, the physical upload is eliminated, and an atomic metadata reference is created pointing to the existing cloud storage object. 

The system is integrated with **Supabase PostgreSQL** for relational metadata and reference tracking, **Supabase Cloud Storage** for object persistence, and an interactive **Streamlit dashboard** for storage optimization analytics. An IoT simulation engine demonstrates edge-to-cloud telemetry ingestion where repeated sensor readings achieve over 75% cloud storage savings.

---

## 2. Introduction

With the proliferation of cloud-native applications and IoT sensor nodes, cloud repositories face unprecedented data duplication. Studies show that between 40% and 70% of enterprise and IoT backup data comprises redundant or identical files. 

Data deduplication is a specialized data compression technique for eliminating duplicate copies of repeating data. Content-based deduplication using cryptographic digests (such as MD5 and SHA-256) identifies redundant files regardless of filename, directory location, or upload timestamp.

---

## 3. Problem Statement

Traditional cloud file storage platforms suffer from:
1. **Redundant Storage Allocation:** Identical files saved under different names consume linear storage space.
2. **Bandwidth Inefficiency:** Uploading identical payloads strains edge gateways and network links.
3. **Reference Inconsistency:** In naive systems, deleting one file might break other references or leave orphaned files.
4. **Lack of Transparent Metrics:** End users and cloud administrators lack visibility into logical vs. physical storage usage.

---

## 4. Project Objectives

1. Develop a reliable, server-side MD5 hashing engine to fingerprint uploaded files from raw bytes.
2. Prevent redundant file copies from consuming physical storage in cloud buckets.
3. Implement reference-counted metadata in PostgreSQL ensuring data integrity upon rename or deletion.
4. Provide a dual-mode architecture: Production Supabase Cloud and Offline Local Sandbox for evaluation and grading.
5. Create an IoT telemetry simulator demonstrating real-world sensor log deduplication.
6. Deliver storage optimization analytics (logical storage, physical storage, bytes saved, optimization ratio).

---

## 5. Existing System vs. Proposed System

| Feature | Existing Conventional Cloud Systems | Proposed MD5 Deduplication System |
| :--- | :--- | :--- |
| **Storage Strategy** | Multi-copy storage: each upload writes a physical file | Single-instance storage: unique content saved once |
| **Duplicate Detection** | None or naive filename matching | 128-bit MD5 hash calculation on raw bytes |
| **Renaming Impact** | Requires duplicate storage or copy operations | Instant logical metadata update; zero storage overhead |
| **Deletion Mechanism** | Direct file deletion | Reference-counted: physical file only purged on final reference deletion |
| **IoT Sensor Support** | Repeated sensor logs flood cloud buckets | Repeated sensor logs reuse existing storage blobs |
| **Cost Efficiency** | High linear cost growth | Logarithmic/asymptotic cost curve |

---

## 6. System Requirements

### Hardware Requirements
- Processor: Intel Core i3 / AMD Ryzen 3 or higher
- RAM: 4 GB minimum (8 GB recommended)
- Storage: 1 GB free disk space
- Network: Broadband internet for cloud sync

### Software Requirements
- Operating System: Windows 10/11, Linux, or macOS
- Programming Language: Python 3.10+
- Web Framework: Streamlit 1.42+
- Cloud Database: Supabase PostgreSQL
- Cloud Object Storage: Supabase Storage (`files` private bucket)
- Development Environment: Visual Studio Code

---

## 7. System Architecture & Workflows

### Ingestion Data Flow
```
User / IoT Node ──> Upload File Bytes
                         │
                         ▼
             [ Compute 128-bit MD5 Hash ]
                         │
                         ▼
     [ Query PostgreSQL: file_contents(owner_id, md5) ]
                         │
          ┌──────────────┴──────────────┐
          │ (Found)                     │ (Not Found)
          ▼                             ▼
   [ Duplicate Detected ]       [ Brand New Object ]
          │                             │
          ├─ Increment ref_count        ├─ Upload bytes to Supabase Storage
          ├─ Create user_files ref      ├─ Insert file_contents record
          └─ Skip Storage Upload        └─ Insert user_files ref
                         │
                         ▼
       [ Log Event & Update Dashboard Analytics ]
```

---

## 8. MD5 Hashing Algorithm Explanation

MD5 (Message-Digest Algorithm 5) is a widely used cryptographic hash function developed by Ronald Rivest in 1991. It produces a 128-bit (16-byte) hash value, typically expressed as a 32-character hexadecimal number.

### Four Operational Steps of MD5:
1. **Padding Bits:** The message is padded with a single '1' bit followed by '0' bits until length $\equiv 448 \pmod{512}$.
2. **Append Length:** A 64-bit representation of the original length is appended to make the total length a multiple of 512 bits.
3. **Initialize MD Buffer:** A 4-word buffer ($A, B, C, D$) is initialized with predefined 32-bit hex constants.
4. **Process Message in 16-Word Blocks:** Four non-linear rounds of 16 operations each apply bitwise logic (F, G, H, I functions) across 64 steps.

### Collision Defense Note:
While MD5 is fast and ideal for deduplication in benign environments, MD5 is vulnerable to intentional collision attacks. For security-critical systems, our architecture provides a dual-hash verification mode combining MD5 with SHA-256 and byte-length checks.

---

## 9. Database Design

### 1. `file_contents`
- `id` (UUID PK): Unique identifier for the physical blob.
- `owner_id` (UUID): Account owner (enforces user-scoped deduplication).
- `md5_hash` (VARCHAR(32)): 32-character hexadecimal MD5 hash.
- `file_size` (BIGINT): Exact size in bytes.
- `storage_path` (TEXT): Path in Supabase bucket (`{owner_id}/{md5_hash}`).
- `reference_count` (INTEGER): Active logical pointers referencing this content.

### 2. `user_files`
- `id` (UUID PK): Unique logical file reference.
- `owner_id` (UUID): File owner.
- `original_filename` (VARCHAR(255)): Display filename.
- `content_id` (UUID FK): References `file_contents(id)`.
- `mime_type` (VARCHAR(128)): Media type.
- `upload_date` (TIMESTAMPTZ): Timestamp.
- `is_duplicate` (BOOLEAN): True if deduplicated at upload.

### 3. `upload_events`
- `id` (UUID PK): Audit log identifier.
- `owner_id` (UUID): User identifier.
- `filename` (VARCHAR(255)): Filename involved.
- `event_type` (VARCHAR(50)): Event code (`UPLOAD_NEW`, `UPLOAD_DUPLICATE`, etc.).
- `file_size` (BIGINT): Size in bytes.
- `created_at` (TIMESTAMPTZ): Event timestamp.

---

## 10. Automated Testing & Verification

Automated test suites were developed using Python's standard `unittest` and `pytest`:
1. `test_hashing.py`: Validates deterministic MD5 digests, collision-detection byte checks, and SHA-256 dual verification.
2. `test_deduplication.py`: Confirms that uploading the same file 3 times produces only 1 physical storage record and 3 logical user records.
3. `test_file_management.py`: Verifies rename preserving hash, download integrity, reference deletion preservation, and final cleanup.
4. `test_analytics.py`: Confirms exact mathematical correctness of storage savings and optimization percentages.

**Result: 17 of 17 tests passed with 100% pass rate.**

---

## 11. Viva Questions & Project Review Answers

Included in detail in `docs/viva_questions.md`.

---

## 12. Conclusion & Future Scope

The project successfully delivers a cloud-based file management system with MD5-driven deduplication, real-time analytics, and IoT telemetry ingestion. Future enhancements include:
- Client-side pre-hashing chunking (CDC - Content Defined Chunking)
- AES-256 encryption-at-rest with Convergent Encryption
- Cross-enterprise multi-tenant global deduplication with zero-knowledge proof.
