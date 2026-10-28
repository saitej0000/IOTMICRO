"""
Charts and Visual Analytics Component for Streamlit UI.
"""

import streamlit as st
import pandas as pd
from services.analytics import AnalyticsService


def render_charts(user_files):
    st.subheader("Storage Analytics & Optimization Breakdown")
    metrics = AnalyticsService.calculate_storage_metrics(user_files)

    if metrics["total_files"] == 0:
        st.info("Upload files to generate storage analytics visualizations.")
        return

    # 1. Storage Comparison (Logical vs Physical vs Saved)
    st.markdown("#### Logical vs. Physical Storage Consumption")
    storage_df = pd.DataFrame({
        "Storage Category": ["Logical (Allocated)", "Physical (Stored)", "Saved via MD5"],
        "Bytes": [metrics["logical_bytes"], metrics["physical_bytes"], metrics["saved_bytes"]],
        "Size": [
            AnalyticsService.format_bytes(metrics["logical_bytes"]),
            AnalyticsService.format_bytes(metrics["physical_bytes"]),
            AnalyticsService.format_bytes(metrics["saved_bytes"]),
        ]
    })
    st.bar_chart(data=storage_df, x="Storage Category", y="Bytes", color="Storage Category")

    # 2. File Format Distribution
    if metrics["format_breakdown"]:
        st.markdown("#### File Extension Distribution")
        fmt_df = pd.DataFrame([
            {"Extension": ext.upper(), "Count": count}
            for ext, count in metrics["format_breakdown"].items()
        ])
        st.bar_chart(data=fmt_df, x="Extension", y="Count")

    # 3. Top Duplicated Files Table
    if metrics["top_duplicated"]:
        st.markdown("#### Top Deduplicated Content Items")
        top_df = pd.DataFrame(metrics["top_duplicated"])
        top_df.rename(columns={
            "name": "Sample Filename",
            "hash": "MD5 Hash",
            "size": "Content Size (Bytes)",
            "count": "Total Active References"
        }, inplace=True)
        st.dataframe(top_df, use_container_width=True)
