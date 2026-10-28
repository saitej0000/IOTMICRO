"""
Upload Files Component for Streamlit UI.
"""

import streamlit as st
from services.hashing import calculate_md5, calculate_sha256
from services.analytics import AnalyticsService


def render_upload_section(file_service, auth_service):
    st.subheader("Upload & Deduplication Engine")
    st.markdown(
        "Upload any file (PDF, TXT, PNG, JPG, CSV, DOCX, ZIP). "
        "The system calculates the **MD5 hash from raw bytes** on the backend and skips uploading duplicate physical copies to cloud storage."
    )

    current_user = auth_service.get_current_user()
    if not current_user:
        st.warning("Please sign in or select a demo user profile in the sidebar.")
        return

    owner_id = current_user["id"]

    uploaded_files = st.file_uploader(
        "Choose files to upload",
        type=["pdf", "docx", "doc", "txt", "jpg", "jpeg", "png", "csv", "xlsx", "xls", "zip", "log", "json"],
        accept_multiple_files=True
    )

    if uploaded_files:
        st.markdown(f"Selected **{len(uploaded_files)}** file(s) for processing.")
        
        if st.button("Process & Upload All Files", type="primary"):
            for f in uploaded_files:
                file_bytes = f.read()
                filename = f.name
                
                try:
                    result = file_service.process_file_upload(
                        owner_id=owner_id,
                        filename=filename,
                        file_bytes=file_bytes,
                        mime_type=f.type
                    )
                    
                    if result["is_duplicate"]:
                        st.warning(
                            f"**DUPLICATE DETECTED:** `{filename}`  \n"
                            f"MD5 Hash: `{result['md5_hash']}`  \n"
                            f"Status: Reused existing cloud storage object! (Saved {AnalyticsService.format_bytes(result['storage_saved_bytes'])})  \n"
                            f"Reference Count: {result['reference_count']}"
                        )
                    else:
                        st.success(
                            f"**NEW OBJECT STORED:** `{filename}`  \n"
                            f"MD5 Hash: `{result['md5_hash']}`  \n"
                            f"Size: {AnalyticsService.format_bytes(result['file_size'])} written to storage bucket.  \n"
                            f"Reference Count: 1"
                        )
                except Exception as e:
                    st.error(f"Error processing `{filename}`: {str(e)}")
