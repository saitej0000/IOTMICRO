"""
Home Dashboard Component for Streamlit UI.
"""

import streamlit as st
from services.analytics import AnalyticsService


def render_dashboard(file_service, auth_service, db_service):
    st.title("Cloud File Deduplication Dashboard")
    st.markdown(
        "**Project Title:** Cloud-Based Improved File Handling and Duplication Removal Using MD5  \n"
        "*College-level IoT and Cloud Virtualization Micro Project*"
    )

    current_user = auth_service.get_current_user()
    if not current_user:
        st.warning("Please sign in or select a demo user profile in the sidebar.")
        return

    owner_id = current_user["id"]
    user_files = db_service.list_user_files(owner_id)
    metrics = AnalyticsService.calculate_storage_metrics(user_files)

    # Mode Indicator
    mode_text = db_service.mode
    st.info(f"Active Backend Environment: **{mode_text}** | Active User: `{current_user.get('email', owner_id)}`")

    # Primary Metric Cards (Section 3.A & 3.G)
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric(label="Total Files Registered", value=metrics["total_files"])
    with c2:
        st.metric(label="Unique Stored Blobs", value=metrics["unique_contents"])
    with c3:
        st.metric(label="Duplicates Detected", value=metrics["duplicates_count"])
    with c4:
        st.metric(label="Optimization Ratio", value=f"{metrics['deduplication_ratio']}x")

    st.markdown("---")

    c5, c6, c7, c8 = st.columns(4)
    with c5:
        st.metric(label="Logical Storage (Allocated)", value=AnalyticsService.format_bytes(metrics["logical_bytes"]))
    with c6:
        st.metric(label="Physical Storage (Actual)", value=AnalyticsService.format_bytes(metrics["physical_bytes"]))
    with c7:
        st.metric(label="Storage Saved", value=AnalyticsService.format_bytes(metrics["saved_bytes"]))
    with c8:
        st.metric(label="Storage Saved %", value=f"{metrics['optimization_pct']}%")

    st.markdown("---")

    # Recent Activity Events
    st.subheader("Recent System Activity & Audit Trail")
    events = db_service.list_events(owner_id, limit=8)
    if events:
        for ev in events:
            ev_type = ev.get("event_type", "EVENT")
            fname = ev.get("filename", "")
            ts = ev.get("created_at", "")[:19].replace("T", " ")
            size_fmt = AnalyticsService.format_bytes(ev.get("file_size", 0))
            
            if ev_type == "UPLOAD_NEW":
                st.success(f"**[NEW UPLOAD]** `{fname}` ({size_fmt}) saved to storage at {ts}")
            elif ev_type == "UPLOAD_DUPLICATE":
                st.warning(f"**[DUPLICATE DETECTED]** `{fname}` matched existing hash `{ev.get('md5_hash', '')[:8]}...`! Reused storage object (Saved {size_fmt}).")
            elif ev_type == "FILE_RENAMED":
                st.info(f"**[RENAMED]** File reference updated to `{fname}` at {ts}")
            elif ev_type == "FILE_DELETED":
                st.error(f"**[DELETED]** File reference `{fname}` removed at {ts}")
            elif ev_type == "CONTENT_PURGED":
                st.info(f"**[STORAGE PURGED]** Last reference deleted; physical object removed from storage bucket.")
    else:
        st.info("No activity logged yet. Upload files to observe live MD5 duplicate detection.")
