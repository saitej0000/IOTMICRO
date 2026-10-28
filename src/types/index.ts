export type StorageMode = 'local' | 'cloud';

export interface FileContentRecord {
  id: string;
  owner_id: string;
  md5_hash: string;
  sha256_hash?: string;
  file_size: number;
  storage_path: string;
  reference_count: number;
  created_at: string;
  dataUrl?: string; // base64 or blob for in-browser download
}

export interface UserFileRecord {
  id: string;
  owner_id: string;
  original_filename: string;
  content_id: string;
  mime_type: string;
  upload_date: string;
  is_duplicate: boolean;
  md5_hash: string;
  file_size: number;
  reference_count: number;
}

export type EventType = 
  | 'UPLOAD_NEW' 
  | 'UPLOAD_DUPLICATE' 
  | 'FILE_RENAMED' 
  | 'FILE_DELETED' 
  | 'CONTENT_PURGED';

export interface UploadEventRecord {
  id: string;
  owner_id: string;
  filename: string;
  event_type: EventType;
  file_size: number;
  md5_hash: string;
  created_at: string;
}

export interface StorageMetrics {
  total_files: number;
  unique_contents: number;
  duplicates_count: number;
  logical_bytes: number;
  physical_bytes: number;
  saved_bytes: number;
  optimization_pct: number;
  deduplication_ratio: number;
  format_breakdown: Record<string, number>;
}

export interface IoTTelemetryPayload {
  device_id: string;
  device_type: string;
  timestamp: string;
  temperature_celsius: number;
  humidity_percentage: number;
  pressure_hpa: number;
  battery_pct: number;
  sensor_status: 'NOMINAL' | 'WARNING' | 'CALIBRATING';
  firmware_version: string;
  transmission_channel: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
}
