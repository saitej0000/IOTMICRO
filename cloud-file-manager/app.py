"""
================================================================================
Cloud-Based Improved File Handling and Duplication Removal Using MD5
College-Level IoT and Cloud Virtualization Micro Project Main Streamlit Application
================================================================================
"""

import os
import streamlit as st
from dotenv import load_dotenv

# Load environment configuration
load_dotenv()

from services.hashing import calculate_md5, calculate_sha256, get_content_fingerprint
from services.cloud_storage import get_storage_service
from services.database_service import get_database_service
from services.file_service import FileManagementService
from services.analytics import AnalyticsService
from services.auth_service import AuthService
from iot.simulator import IoTSensorSimulator, generate_sensor_payload

from components.dashboard import render_dashboard
from components.upload import render_upload_section
from components.file_list import render_file_list
from components.charts import render_charts

# Streamlit Page Config
st.set_page_config(
    page_title="MD5 Cloud File Deduplication & Storage Optimization",
    page_icon="☁️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize Session State
if "mode" not in st.session_state:
    st.session_state.mode = os.getenv("APP_MODE", "local")

if "db_service" not in st.session_state:
    # Try connecting to Supabase if configured
    supabase_url = os.getenv("SUPABASE_URL", "")
    supabase_key = os.getenv("SUPABASE_KEY", "")
    supabase_client = None

    if st.session_state.mode == "cloud" and supabase_url and supabase_key:
        try:
            from supabase import create_client
            supabase_client = create_client(supabase_url, supabase_key)
            st.session_state.db_service = get_database_service(supabase_client, mode="cloud")
            st.session_state.storage_service = get_storage_service(supabase_client, mode="cloud")
            st.session_state.auth_service = AuthService(supabase_client, mode="cloud")
        except Exception as e:
            st.warning(f"Could not connect to Supabase: {str(e)}. Operating in Local Sandbox Mode.")
            st.session_state.mode = "local"

    if st.session_state.mode == "local" or "db_service" not in st.session_state:
        st.session_state.db_service = get_database_service(mode="local")
        st.session_state.storage_service = get_storage_service(mode="local")
        st.session_state.auth_service = AuthService(mode="local")

if "file_service" not in st.session_state:
    st.session_state.file_service = FileManagementService(
        db_service=st.session_state.db_service,
        storage_service=st.session_state.storage_service,
        max_size_mb=int(os.getenv("MAX_FILE_SIZE_MB", "50"))
    )

if "iot_simulator" not in st.session_state:
    st.session_state.iot_simulator = IoTSensorSimulator()


# --- SIDEBAR NAVIGATION ---
st.sidebar.title("☁️ Cloud File Deduplication")
st.sidebar.caption("Using MD5 & Supabase Cloud Storage")

menu = st.sidebar.radio(
    "Navigation",
    [
        "Home Dashboard",
        "Upload Files",
        "My Files",
        "Duplicate Detection",
        "Storage Analytics",
        "Search Files",
        "IoT Device Simulation",
        "Settings & About Project"
    ]
)

st.sidebar.markdown("---")

# User Session Switcher
curr_user = st.session_state.auth_service.get_current_user()
if curr_user:
    st.sidebar.write(f"Logged in: **{curr_user.get('name', curr_user['id'])}**")
    if st.session_state.mode == "local":
        user_choice = st.sidebar.selectbox("Switch Demo User (Test Isolation)", ["Student 1", "Student 2"])
        if user_choice == "Student 1" and curr_user["id"] != "demo-user-iot-01":
            st.session_state.auth_service.switch_demo_user(1)
            st.rerun()
        elif user_choice == "Student 2" and curr_user["id"] != "demo-user-iot-02":
            st.session_state.auth_service.switch_demo_user(2)
            st.rerun()

st.sidebar.markdown(f"**Execution Mode:** `{st.session_state.mode.upper()}`")


# --- MAIN VIEW ROUTING ---
if menu == "Home Dashboard":
    render_dashboard(
        st.session_state.file_service,
        st.session_state.auth_service,
        st.session_state.db_service
    )

elif menu == "Upload Files":
    render_upload_section(
        st.session_state.file_service,
        st.session_state.auth_service
    )

elif menu == "My Files":
    render_file_list(
        st.session_state.file_service,
        st.session_state.auth_service,
        st.session_state.db_service
    )

elif menu == "Duplicate Detection":
    st.title("MD5 Duplicate Detection Inspector")
    st.markdown(
        "Demonstrates how raw byte contents are evaluated using the MD5 cryptographic digest. "
        "Files with completely different names or timestamps but identical byte content generate the exact same 32-character hex hash."
    )
    
    col_a, col_b = st.columns(2)
    with col_a:
        st.subheader("File A")
        file_a = st.file_uploader("Upload First File", key="test_dup_a")
    with col_b:
        st.subheader("File B")
        file_b = st.file_uploader("Upload Second File", key="test_dup_b")

    if file_a and file_b:
        bytes_a = file_a.read()
        bytes_b = file_b.read()

        hash_a = calculate_md5(bytes_a)
        hash_b = calculate_md5(bytes_b)

        sha_a = calculate_sha256(bytes_a)
        sha_b = calculate_sha256(bytes_b)

        st.markdown("### Hash Verification Comparison")
        st.write(f"**File A:** `{file_a.name}` ({len(bytes_a)} bytes) | MD5: `{hash_a}`")
        st.write(f"**File B:** `{file_b.name}` ({len(bytes_b)} bytes) | MD5: `{hash_b}`")

        if hash_a == hash_b:
            st.success("✅ **DUPLICATE MATCH CONFIRMED!** Both files contain identical byte contents. In this cloud storage architecture, only 1 physical copy is stored in the Supabase bucket.")
        else:
            st.info("ℹ️ **DISTINCT FILES.** The MD5 hashes differ. Each file will be stored as an independent physical object.")

        with st.expander("Cryptographic Details & Collision Analysis"):
            st.write(f"**File A SHA-256:** `{sha_a}`")
            st.write(f"**File B SHA-256:** `{sha_b}`")
            st.markdown(
                "**MD5 Collision Notice:** While MD5 provides high-speed deduplication (128-bit hash), theoretical collisions exist in malicious attack vectors. "
                "For mission-critical production systems, SHA-256 or dual-hash verification (MD5 + file size check + SHA-256) ensures cryptographic non-repudiation."
            )

elif menu == "Storage Analytics":
    owner_id = st.session_state.auth_service.get_current_user()["id"]
    user_files = st.session_state.db_service.list_user_files(owner_id)
    render_charts(user_files)

elif menu == "Search Files":
    st.title("Search & Filter Repository")
    owner_id = st.session_state.auth_service.get_current_user()["id"]
    files = st.session_state.db_service.list_user_files(owner_id)

    query = st.text_input("Enter search keywords, filename, or MD5 hash prefix:")
    if query:
        matches = [
            f for f in files 
            if query.lower() in f["original_filename"].lower() or query.lower() in f.get("md5_hash", "").lower()
        ]
        st.write(f"Found **{len(matches)}** matching file(s):")
        for m in matches:
            st.write(f"- **{m['original_filename']}** | Size: {AnalyticsService.format_bytes(m.get('file_size', 0))} | Hash: `{m.get('md5_hash')}` | Duplicate: `{m.get('is_duplicate')}`")
    else:
        st.info("Type a query above to search through your registered files.")

elif menu == "IoT Device Simulation":
    st.title("IoT Environmental Sensor Simulation")
    st.markdown(
        "Demonstrates the real-world micro-project objective: simulated IoT sensor nodes emit periodic telemetry logs. "
        "When readings repeat or sensor data is unchanged, the cloud deduplication engine removes redundant copies before cloud storage."
    )

    owner_id = st.session_state.auth_service.get_current_user()["id"]

    c_iot1, c_iot2 = st.columns([1, 1])
    with c_iot1:
        device = st.selectbox("Select IoT Sensor Node", st.session_state.iot_simulator.device_ids)
        fmt = st.selectbox("Log Format", ["json", "csv", "txt"])
        repeat_last = st.checkbox("Repeat Previous Reading (Force Duplicate Test)", value=False)
        
        if st.button("Generate & Transmit IoT Log", type="primary"):
            fname, log_bytes = st.session_state.iot_simulator.create_telemetry_file(
                device_id=device,
                file_format=fmt,
                repeat_previous=repeat_last
            )
            
            res = st.session_state.file_service.process_file_upload(
                owner_id=owner_id,
                filename=fname,
                file_bytes=log_bytes,
                mime_type=f"application/{fmt}"
            )
            
            if res["is_duplicate"]:
                st.warning(f"**DUPLICATE IOT LOG DETECTED!** Saved {AnalyticsService.format_bytes(res['storage_saved_bytes'])} cloud storage.")
            else:
                st.success(f"**NEW IOT LOG STORED!** Transmitted {AnalyticsService.format_bytes(res['file_size'])} to storage.")
                
            st.json(log_bytes.decode("utf-8") if fmt == "json" else {"raw_log": log_bytes.decode("utf-8")})

    with c_iot2:
        st.subheader("Simulated Device Telemetry Specs")
        st.markdown(
            "- **Target Architecture:** Edge sensor node transmitting over MQTT/HTTPS  \n"
            "- **Parameters:** Temperature (°C), Relative Humidity (%), Atmospheric Pressure (hPa), Battery %  \n"
            "- **Deduplication Advantage:** Periodic static telemetry heartbeats are deduplicated, avoiding runaway cloud storage costs."
        )

elif menu == "Settings & About Project":
    st.title("Settings & Project Documentation")
    st.markdown(
        "### Cloud-Based Improved File Handling and Duplication Removal Using MD5  \n"
        "**Degree/Program:** B.Tech Computer Science / Information Technology / IoT & Cloud Specialization  \n"
        "**Topic:** Cloud Virtualization, Storage Optimization, and Cryptographic Hash-Based Content Addressing."
    )

    st.subheader("Backend Configuration")
    st.write(f"Current Mode: **{st.session_state.mode}**")
    st.write("To enable live Supabase Cloud storage, set `SUPABASE_URL` and `SUPABASE_KEY` in `.env`.")

    with st.expander("PostgreSQL Schema & RLS Setup Instructions"):
        st.code("""
-- Run database/schema.sql in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS file_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    md5_hash VARCHAR(32) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    reference_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_owner_md5 UNIQUE (owner_id, md5_hash)
);
        """, language="sql")
