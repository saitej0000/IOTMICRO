export interface VivaItem {
  id: number;
  question: string;
  answer: string;
  category: 'Core Concepts' | 'Algorithms' | 'Cloud & DB' | 'Security & IoT';
}

export const VIVA_QUESTIONS: VivaItem[] = [
  {
    id: 1,
    question: "What is data deduplication, and why is it crucial in cloud computing?",
    category: "Core Concepts",
    answer: "Data deduplication is a specialized data compression technique that eliminates duplicate copies of repeating data. In cloud computing and IoT environments, multiple users or sensor nodes frequently upload identical files. Deduplication ensures that only a single physical copy is stored in cloud object storage, while multiple lightweight logical pointers refer to that single instance. This saves storage costs, reduces network bandwidth, and optimizes backup windows."
  },
  {
    id: 2,
    question: "Why did you choose MD5 for hashing, and what are its key properties?",
    category: "Algorithms",
    answer: "MD5 (Message-Digest Algorithm 5) produces a fixed 128-bit (16-byte) cryptographic digest, represented as a 32-character hexadecimal string. We chose MD5 because it is computationally lightweight, fast to compute on edge gateways and micro-controllers, and deterministic: identical bytes always yield the exact same hash."
  },
  {
    id: 3,
    question: "What is an MD5 hash collision, and how does your architecture address it?",
    category: "Algorithms",
    answer: "A hash collision occurs when two distinct inputs produce the exact same hash output. While theoretically possible in MD5, our architecture checks both the MD5 hash and the exact byte file size, and provides an optional byte-by-byte direct verification step and SHA-256 fallback before reusing an existing storage object."
  },
  {
    id: 4,
    question: "Explain the difference between Logical Storage and Physical Content Storage.",
    category: "Core Concepts",
    answer: "Logical Storage is the sum of the file sizes of all active file entries seen by the user in their dashboard. Physical Content Storage is the actual unique disk space consumed in the cloud storage bucket. Storage Saved = Logical Storage - Physical Storage. Optimization % = (Saved / Logical) * 100."
  },
  {
    id: 5,
    question: "How is reference counting used during file deletion?",
    category: "Cloud & DB",
    answer: "When content is uploaded, reference_count starts at 1. Each duplicate upload increments this count. When a user deletes a file, we delete the logical record from user_files and decrement reference_count: if reference_count > 0, the physical object is preserved because other files still point to it; if reference_count == 0, the system purges the physical file from the storage bucket."
  },
  {
    id: 6,
    question: "What happens when a user renames a file?",
    category: "Core Concepts",
    answer: "Renaming a file only updates the original_filename column in the user_files table. The underlying content_id, md5_hash, and physical storage object remain completely untouched. No network data is re-uploaded, and no storage is duplicated."
  },
  {
    id: 7,
    question: "Why do you calculate the MD5 hash on the server instead of trusting client input?",
    category: "Security & IoT",
    answer: "Trusting a client-provided hash violates zero-trust cloud security. A malicious client could submit the hash of a sensitive file they do not possess, gaining unauthorized access or corrupting system references. Computing the hash from the actual received bytes on the server guarantees authenticity."
  },
  {
    id: 8,
    question: "How does PostgreSQL prevent duplicate races during concurrent uploads?",
    category: "Cloud & DB",
    answer: "The PostgreSQL schema enforces a unique constraint: CONSTRAINT uq_owner_md5 UNIQUE (owner_id, md5_hash). If two identical uploads occur simultaneously, the database unique index ensures only one physical content record is committed."
  },
  {
    id: 9,
    question: "Why is deduplication scoped to each user instead of globally across all users in Version 1?",
    category: "Security & IoT",
    answer: "Cross-user global deduplication introduces security vulnerabilities such as Proof-of-Ownership attacks and information disclosure (where User B can deduce that User A has uploaded a specific file by seeing an instant upload or duplicate hit). User-scoped deduplication isolates each tenant securely."
  },
  {
    id: 10,
    question: "What role does Supabase play in your project architecture?",
    category: "Cloud & DB",
    answer: "Supabase provides Supabase PostgreSQL for relational metadata (file_contents, user_files, upload_events) with Row Level Security (RLS) policies, and Supabase Storage for S3-compatible private cloud buckets storing deduplicated binary objects under {owner_id}/{md5_hash}."
  },
  {
    id: 11,
    question: "How does the IoT simulation connect to the project theme?",
    category: "Security & IoT",
    answer: "IoT sensor nodes transmit periodic status logs. When environmental conditions are static (e.g., room temperature constant at 24°C), consecutive telemetry files have identical byte structures. Our IoT simulator demonstrates that repeated sensor logs are deduplicated automatically, saving bandwidth and cloud storage without losing time-series log history."
  },
  {
    id: 12,
    question: "How does Row Level Security (RLS) protect user data?",
    category: "Security & IoT",
    answer: "RLS policies in PostgreSQL inspect the authenticated user's token (auth.uid()). A user querying user_files can only see rows where owner_id = auth.uid(). Even if an attacker attempts an SQL injection or directly queries the API, the database engine enforces tenant isolation."
  },
  {
    id: 13,
    question: "What happens if cloud storage is down or credentials are not configured?",
    category: "Cloud & DB",
    answer: "The application implements a StorageProvider and DatabaseService abstraction. If cloud credentials are not supplied, the app runs in Local Demo Mode using local filesystem storage and in-memory/SQLite persistence, clearly labeled to prevent false claims."
  },
  {
    id: 14,
    question: "What metrics does your analytics module calculate?",
    category: "Core Concepts",
    answer: "1. Total files registered. 2. Unique content objects. 3. Duplicate uploads detected. 4. Logical storage bytes. 5. Physical content bytes. 6. Storage saved (bytes). 7. Storage optimization percentage. 8. Deduplication ratio (Logical / Physical)."
  },
  {
    id: 15,
    question: "What are the limitations of file-level deduplication compared to block/chunk-level deduplication?",
    category: "Algorithms",
    answer: "File-level deduplication only detects identical whole files. If a single byte in a 100 MB video changes, the entire file receives a different hash and must be re-stored. In contrast, chunk-level deduplication (e.g. Content-Defined Chunking) splits files into 4KB–64KB blocks, deduplicating unchanged blocks even if parts of the file were edited."
  }
];

export const PRESENTATION_SCRIPT = `Good morning respected examiners and mentor. Today I present our micro project: Cloud-Based Improved File Handling and Duplication Removal Using MD5.

In cloud virtualization and IoT systems, up to 70% of stored backup data consists of redundant, identical files. Conventional storage systems store each uploaded file independently, resulting in severe cloud storage waste and high financial costs.

Our project introduces an intelligent content-addressable storage manager. Whenever a file is uploaded—whether from an end user or an IoT telemetry node—our server computes a 128-bit MD5 cryptographic hash from the raw bytes. We query Supabase PostgreSQL to verify whether that hash exists in the user's namespace.

If it's a new file, we write it once to our private Supabase Storage bucket and create a metadata reference. If it's a duplicate—even under a different filename—we bypass the cloud upload completely and create an atomic metadata reference pointing to the existing stored object.

We also implement reference counting so that deleting one reference never destroys shared content, and deleting the last reference automatically purges the cloud object. Our live IoT simulator proves that repeating sensor logs can yield over 70% storage savings. All 17 automated unit tests passed with a 100% pass rate. Thank you, and I look forward to your questions.`;
