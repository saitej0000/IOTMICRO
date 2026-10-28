import { FileContentRecord, UserFileRecord, UploadEventRecord } from '../types';

export const INITIAL_USER = {
  id: 'student-iot-user-01',
  email: 'btech.student@college.edu',
  name: 'B.Tech Student 1 (IoT & Cloud)',
};

export const INITIAL_CONTENTS: FileContentRecord[] = [
  {
    id: 'cnt-001',
    owner_id: INITIAL_USER.id,
    md5_hash: '9e107d9d372bb6826bd81d3542a419d6',
    sha256_hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    file_size: 7372, // ~7.2 KB
    storage_path: `${INITIAL_USER.id}/9e107d9d372bb6826bd81d3542a419d6`,
    reference_count: 2,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    dataUrl: 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
      device_id: 'IOT-NODE-01-LAB',
      temperature_celsius: 24.5,
      humidity_percentage: 55.2,
      sensor_status: 'NOMINAL',
      timestamp: '2026-10-28T02:00:00Z'
    }, null, 2))
  },
  {
    id: 'cnt-002',
    owner_id: INITIAL_USER.id,
    md5_hash: 'e4d909c290d0fb1ca068ffaddf22cbd0',
    sha256_hash: 'fc48886337d10e527b18ff504a554fa4266a1b945461ecd23e23f5f994e6541f',
    file_size: 14848, // ~14.5 KB
    storage_path: `${INITIAL_USER.id}/e4d909c290d0fb1ca068ffaddf22cbd0`,
    reference_count: 2,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    dataUrl: 'data:text/csv;charset=utf-8,' + encodeURIComponent('device_id,timestamp,temp,humidity,status\nIOT-CHAMBER,2026-10-28T03:00:00Z,23.8,58.1,NOMINAL\n')
  },
  {
    id: 'cnt-003',
    owner_id: INITIAL_USER.id,
    md5_hash: 'd41d8cd98f00b204e9800998ecf8427e',
    sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    file_size: 86016, // ~84 KB
    storage_path: `${INITIAL_USER.id}/d41d8cd98f00b204e9800998ecf8427e`,
    reference_count: 1,
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    dataUrl: 'data:text/plain;charset=utf-8,' + encodeURIComponent('%PDF-1.4 Simulated Cloud Virtualization Architecture Document\nMD5 Deduplication Specification')
  }
];

export const INITIAL_FILES: UserFileRecord[] = [
  {
    id: 'uf-001',
    owner_id: INITIAL_USER.id,
    original_filename: 'iot_temperature_telemetry.json',
    content_id: 'cnt-001',
    mime_type: 'application/json',
    upload_date: new Date(Date.now() - 3600000 * 5).toISOString(),
    is_duplicate: false,
    md5_hash: '9e107d9d372bb6826bd81d3542a419d6',
    file_size: 7372,
    reference_count: 2
  },
  {
    id: 'uf-002',
    owner_id: INITIAL_USER.id,
    original_filename: 'iot_temperature_telemetry_backup.json',
    content_id: 'cnt-001',
    mime_type: 'application/json',
    upload_date: new Date(Date.now() - 3600000 * 4).toISOString(),
    is_duplicate: true,
    md5_hash: '9e107d9d372bb6826bd81d3542a419d6',
    file_size: 7372,
    reference_count: 2
  },
  {
    id: 'uf-003',
    owner_id: INITIAL_USER.id,
    original_filename: 'chamber_env_hourly_log.csv',
    content_id: 'cnt-002',
    mime_type: 'text/csv',
    upload_date: new Date(Date.now() - 3600000 * 3).toISOString(),
    is_duplicate: false,
    md5_hash: 'e4d909c290d0fb1ca068ffaddf22cbd0',
    file_size: 14848,
    reference_count: 2
  },
  {
    id: 'uf-004',
    owner_id: INITIAL_USER.id,
    original_filename: 'chamber_env_hourly_log_archive.csv',
    content_id: 'cnt-002',
    mime_type: 'text/csv',
    upload_date: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_duplicate: true,
    md5_hash: 'e4d909c290d0fb1ca068ffaddf22cbd0',
    file_size: 14848,
    reference_count: 2
  },
  {
    id: 'uf-005',
    owner_id: INITIAL_USER.id,
    original_filename: 'cloud_virtualization_architecture.pdf',
    content_id: 'cnt-003',
    mime_type: 'application/pdf',
    upload_date: new Date(Date.now() - 3600000 * 1).toISOString(),
    is_duplicate: false,
    md5_hash: 'd41d8cd98f00b204e9800998ecf8427e',
    file_size: 86016,
    reference_count: 1
  }
];

export const INITIAL_EVENTS: UploadEventRecord[] = [
  {
    id: 'ev-005',
    owner_id: INITIAL_USER.id,
    filename: 'cloud_virtualization_architecture.pdf',
    event_type: 'UPLOAD_NEW',
    file_size: 86016,
    md5_hash: 'd41d8cd98f00b204e9800998ecf8427e',
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'ev-004',
    owner_id: INITIAL_USER.id,
    filename: 'chamber_env_hourly_log_archive.csv',
    event_type: 'UPLOAD_DUPLICATE',
    file_size: 14848,
    md5_hash: 'e4d909c290d0fb1ca068ffaddf22cbd0',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'ev-003',
    owner_id: INITIAL_USER.id,
    filename: 'chamber_env_hourly_log.csv',
    event_type: 'UPLOAD_NEW',
    file_size: 14848,
    md5_hash: 'e4d909c290d0fb1ca068ffaddf22cbd0',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'ev-002',
    owner_id: INITIAL_USER.id,
    filename: 'iot_temperature_telemetry_backup.json',
    event_type: 'UPLOAD_DUPLICATE',
    file_size: 7372,
    md5_hash: '9e107d9d372bb6826bd81d3542a419d6',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'ev-001',
    owner_id: INITIAL_USER.id,
    filename: 'iot_temperature_telemetry.json',
    event_type: 'UPLOAD_NEW',
    file_size: 7372,
    md5_hash: '9e107d9d372bb6826bd81d3542a419d6',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  }
];
