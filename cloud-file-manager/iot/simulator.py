"""
IoT Sensor Node Simulator for Cloud Deduplication Demonstration.

Demonstrates Edge-to-Cloud ingestion scenario:
- Edge sensor nodes periodically emit log files.
- Many readings or heartbeats are identical or repeated when conditions are static.
- Without deduplication, cloud storage is flooded with redundant log files.
- With MD5 deduplication, duplicate logs reuse the existing storage object, saving cloud bandwidth and storage.
"""

import json
import random
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional


def generate_sensor_payload(
    device_id: str = "IOT-NODE-ALPHA-101",
    temperature: Optional[float] = None,
    humidity: Optional[float] = None,
    static_mode: bool = False
) -> Dict[str, Any]:
    """
    Generates a realistic IoT environmental sensor telemetry reading.
    In static_mode, values are fixed to generate deterministically identical files.
    """
    if static_mode:
        temp = 24.50
        hum = 55.20
        status = "NOMINAL"
        battery = 98.5
        timestamp = "2026-10-28T00:00:00Z"
    else:
        temp = temperature if temperature is not None else round(random.uniform(18.0, 36.5), 2)
        hum = humidity if humidity is not None else round(random.uniform(40.0, 85.0), 2)
        battery = round(random.uniform(82.0, 100.0), 1)
        status = "WARNING" if temp > 33.0 or hum > 80.0 else "NOMINAL"
        timestamp = datetime.now(timezone.utc).isoformat()

    return {
        "device_id": device_id,
        "device_type": "Environmental_Telemetry_Node",
        "timestamp": timestamp,
        "temperature_celsius": temp,
        "humidity_percentage": hum,
        "pressure_hpa": 1013.25,
        "battery_pct": battery,
        "sensor_status": status,
        "firmware_version": "v2.4.1",
        "transmission_channel": "MQTT_TLS"
    }


class IoTSensorSimulator:
    """Manages virtual IoT device instances and automated telemetry file generation."""

    def __init__(self, device_ids: Optional[List[str]] = None):
        self.device_ids = device_ids or [
            "IOT-NODE-01-LAB",
            "IOT-NODE-02-CHAMBER",
            "IOT-NODE-03-GATEWAY"
        ]
        self.history: List[Dict[str, Any]] = []

    def create_telemetry_file(
        self,
        device_id: str,
        file_format: str = "json",
        repeat_previous: bool = False
    ) -> tuple[str, bytes]:
        """
        Generates telemetry file bytes.
        If repeat_previous is True, generates an identical byte sequence to trigger duplicate detection!
        """
        filename = f"{device_id.lower()}_telemetry.{file_format}"

        if repeat_previous and self.history:
            # Re-emit the exact last payload to demonstrate 100% byte-identical duplicate detection
            payload = self.history[-1]
            filename = f"repeated_{filename}"
        else:
            payload = generate_sensor_payload(device_id=device_id)
            self.history.append(payload)

        if file_format == "json":
            file_bytes = json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")
        elif file_format == "csv":
            header = "device_id,timestamp,temperature_celsius,humidity_percentage,pressure_hpa,sensor_status\n"
            row = f"{payload['device_id']},{payload['timestamp']},{payload['temperature_celsius']},{payload['humidity_percentage']},{payload['pressure_hpa']},{payload['sensor_status']}\n"
            file_bytes = (header + row).encode("utf-8")
        else:
            text = f"DEVICE: {payload['device_id']}\nTIME: {payload['timestamp']}\nTEMP: {payload['temperature_celsius']} C\nHUM: {payload['humidity_percentage']} %\nSTATUS: {payload['sensor_status']}\n"
            file_bytes = text.encode("utf-8")

        return filename, file_bytes
