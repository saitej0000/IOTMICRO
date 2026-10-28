# Cloud-Based Improved File Handling and Duplication Removal Using MD5

**College-Level B.Tech Micro Project in IoT and Cloud Virtualization**  
*Academic Project Package for Demonstration, Review, and Viva*

---

## 🚀 Quick Start on Windows using VS Code

### Step 1: Open Project in VS Code
Open VS Code, select **File -> Open Folder...**, and select the `cloud-file-manager` directory.

### Step 2: Create and Activate Python Virtual Environment
Open the VS Code Terminal (PowerShell) (`Ctrl + ~`):

```powershell
# If PowerShell script execution is restricted, run:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1
```

*(For Linux/macOS: `source venv/bin/activate`)*

### Step 3: Install Required Dependencies
```powershell
pip install -r requirements.txt
```

### Step 4: Run Automated Verification Tests
Verify all 17 unit tests pass out-of-the-box:
```powershell
python tests/run_tests.py
# or using pytest:
pytest tests/
```

### Step 5: Start the Streamlit Dashboard
```powershell
streamlit run app.py
```
The application will launch in your browser at `http://localhost:8501`.

---

## ☁️ Connecting to Supabase Cloud Storage & Database

By default, the application runs in **Local Demo Mode** (in-memory SQLite parity and local storage) so you can test and demonstrate without needing cloud keys immediately.

To connect live Supabase Cloud services:

### 1. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a free account.
2. Click **New Project**, name it `md5-cloud-dedup`, and set a database password.

### 2. Run Database Schema & Policies
1. In your Supabase Dashboard, open the **SQL Editor** tab.
2. Open `database/schema.sql` from this project, copy all lines, paste into the SQL editor, and click **Run**.
3. Next, copy all lines from `database/policies.sql`, paste, and click **Run**.

### 3. Create Storage Bucket
1. In Supabase Dashboard, navigate to **Storage**.
2. Click **New Bucket**.
3. Name the bucket `files` (all lowercase).
4. Keep the bucket **Private** (do not enable public bucket).

### 4. Configure `.env`
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Fill in your credentials from **Project Settings -> API**:
```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOi...
SUPABASE_BUCKET=files
APP_MODE=cloud
```

---

## 📁 Project Architecture & Directory Structure

```
cloud-file-manager/
├── app.py                     # Main Streamlit application
├── requirements.txt           # Python dependencies
├── .env.example               # Configuration template
├── .gitignore                 # Version control exclusions
├── README.md                  # This file
├── database/
│   ├── schema.sql             # PostgreSQL tables (file_contents, user_files, upload_events)
│   └── policies.sql           # Row Level Security (RLS) policies
├── services/
│   ├── __init__.py            # Services package exports
│   ├── hashing.py             # MD5 and SHA-256 calculation
│   ├── cloud_storage.py       # Supabase Storage & LocalStorage provider
│   ├── database_service.py    # PostgreSQL & LocalDatabase parity
│   ├── file_service.py        # Core deduplication orchestration & garbage collection
│   ├── analytics.py           # Storage calculations (logical vs physical)
│   └── auth_service.py        # Supabase Auth & session manager
├── components/
│   ├── __init__.py            # UI components exports
│   ├── dashboard.py           # Home KPI metric cards & activity feed
│   ├── upload.py              # File uploader with instant MD5 check
│   ├── file_list.py           # My Files table with download, rename, delete
│   └── charts.py              # Storage distribution charts
├── iot/
│   ├── __init__.py            # IoT package
│   └── simulator.py           # Virtual environmental sensor node generator
├── tests/
│   ├── __init__.py
│   ├── test_hashing.py        # Hashing unit tests
│   ├── test_deduplication.py  # Single-copy persistence tests
│   ├── test_file_management.py# Lifecycle & cleanup tests
│   ├── test_analytics.py      # Mathematical verification tests
│   └── run_tests.py           # Automated test suite runner (17 tests)
└── docs/
    ├── project_report.md      # Full B.Tech college micro project report
    ├── architecture.md        # System architecture & decision diagrams
    ├── database_design.md     # Relational schema & security specification
    └── viva_questions.md      # 15+ viva questions with answers & pitch
```

---

## 🛠️ Common Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Activate.ps1 cannot be loaded because running scripts is disabled` | Windows PowerShell execution policy | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in PowerShell |
| `ModuleNotFoundError: No module named 'streamlit'` | Virtual environment not activated | Ensure `(venv)` is visible in your prompt, then run `pip install -r requirements.txt` |
| `Storage bucket 'files' not found` | Bucket was not created in Supabase | Go to Supabase Dashboard -> Storage -> Create bucket named `files` (private) |
| `Permission denied on table user_files` | RLS enabled without authentication | Ensure user is signed in with email/password or use Local Demo mode |
