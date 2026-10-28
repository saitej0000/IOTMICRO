"""
My Files and File Management Component for Streamlit UI.
"""

import streamlit as st
from services.analytics import AnalyticsService


def render_file_list(file_service, auth_service, db_service):
    st.subheader("My Registered Files")
    
    current_user = auth_service.get_current_user()
    if not current_user:
        st.warning("Please sign in or select a demo user profile in the sidebar.")
        return

    owner_id = current_user["id"]
    files = db_service.list_user_files(owner_id)

    if not files:
        st.info("No files found in your repository. Upload files in the 'Upload Files' tab to get started.")
        return

    # Filter controls
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        search_query = st.text_input("Search filename or MD5 prefix", "")
    with col2:
        extensions = sorted(list({f["original_filename"].split(".")[-1].lower() for f in files if "." in f["original_filename"]}))
        filter_ext = st.selectbox("Filter Extension", ["All"] + extensions)
    with col3:
        sort_by = st.selectbox("Sort By", ["Date (Newest)", "Name (A-Z)", "Size (Largest)"])

    filtered = files
    if search_query:
        q = search_query.lower()
        filtered = [f for f in filtered if q in f["original_filename"].lower() or q in f.get("md5_hash", "").lower()]

    if filter_ext != "All":
        filtered = [f for f in filtered if f["original_filename"].lower().endswith(f".{filter_ext}")]

    if sort_by == "Name (A-Z)":
        filtered.sort(key=lambda x: x["original_filename"].lower())
    elif sort_by == "Size (Largest)":
        filtered.sort(key=lambda x: x.get("file_size", 0), reverse=True)
    else:
        filtered.sort(key=lambda x: x.get("upload_date", ""), reverse=True)

    st.markdown(f"Displaying **{len(filtered)}** of **{len(files)}** files.")

    for f in filtered:
        with st.expander(f"{'🔁 ' if f.get('is_duplicate') else '📄 '}{f['original_filename']} ({AnalyticsService.format_bytes(f.get('file_size', 0))})"):
            c_info1, c_info2 = st.columns(2)
            with c_info1:
                st.write(f"**MD5 Hash:** `{f.get('md5_hash', 'N/A')}`")
                st.write(f"**Reference Count:** `{f.get('reference_count', 1)}` active references")
            with c_info2:
                st.write(f"**Upload Date:** {f.get('upload_date', '')[:19].replace('T', ' ')}")
                st.write(f"**Is Duplicate Upload:** `{'Yes (Reused Stored Object)' if f.get('is_duplicate') else 'No (Initial Storage Object)'}`")

            # Actions: Download, Rename, Delete
            act_col1, act_col2, act_col3 = st.columns(3)
            
            with act_col1:
                try:
                    file_bytes, fname, mime = file_service.download_file(f["id"], owner_id)
                    st.download_button(
                        label=f"Download {fname}",
                        data=file_bytes,
                        file_name=fname,
                        mime=mime,
                        key=f"dl_{f['id']}"
                    )
                except Exception as e:
                    st.error(f"Download unavailable: {str(e)}")

            with act_col2:
                new_name = st.text_input("New name", value=f["original_filename"], key=f"rename_input_{f['id']}")
                if st.button("Rename File", key=f"btn_rename_{f['id']}"):
                    if new_name and new_name != f["original_filename"]:
                        file_service.rename_file(f["id"], owner_id, new_name)
                        st.success(f"Renamed to {new_name}")
                        st.rerun()

            with act_col3:
                if st.button("Delete Reference", key=f"btn_del_{f['id']}", type="secondary"):
                    res = file_service.delete_file(f["id"], owner_id)
                    st.success(res["message"])
                    st.rerun()
