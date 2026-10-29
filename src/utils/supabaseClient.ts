import { createClient } from '@supabase/supabase-js';
import { FileContentRecord, UserFileRecord, UploadEventRecord } from '../types';

export const SUPABASE_URL = "https://urndmxoqyyjjifrsrvno.supabase.co";
export const SUPABASE_KEY = "sb_publishable_Rhqcuv-fxEdcTaWlvh65Hw_P-eukDwh";
export const SUPABASE_BUCKET = "files";

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

export interface SupabaseHealthStatus {
  connected: boolean;
  tableContentsExists: boolean;
  tableUserFilesExists: boolean;
  tableEventsExists: boolean;
  bucketExists: boolean;
  errorMessage?: string;
}

/**
 * Checks connectivity and verifies table presence in the user's Supabase project.
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
  const result: SupabaseHealthStatus = {
    connected: false,
    tableContentsExists: false,
    tableUserFilesExists: false,
    tableEventsExists: false,
    bucketExists: false,
  };

  try {
    // 1. Check basic endpoint connection
    const healthCheck = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: {
        apikey: SUPABASE_KEY,
      }
    });

    if (healthCheck.ok) {
      result.connected = true;
    }
  } catch (err: any) {
    result.errorMessage = err.message || 'Could not reach Supabase endpoint';
    return result;
  }

  // 2. Check tables in database
  try {
    const { error: err1 } = await supabase.from('file_contents').select('id').limit(1);
    result.tableContentsExists = !err1 || err1.code !== '42P01'; // 42P01 is relation does not exist

    const { error: err2 } = await supabase.from('user_files').select('id').limit(1);
    result.tableUserFilesExists = !err2 || err2.code !== '42P01';

    const { error: err3 } = await supabase.from('upload_events').select('id').limit(1);
    result.tableEventsExists = !err3 || err3.code !== '42P01';
  } catch (err) {
    console.warn('Table probe error', err);
  }

  // 3. Check storage bucket 'files'
  try {
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (!bErr && buckets) {
      result.bucketExists = buckets.some(b => b.name === SUPABASE_BUCKET);
    }
  } catch (err) {
    console.warn('Bucket probe error', err);
  }

  return result;
}

/**
 * Uploads a physical file to Supabase Cloud Storage bucket 'files'
 */
export async function uploadToSupabaseStorage(
  ownerId: string,
  md5Hash: string,
  fileBytes: ArrayBuffer,
  mimeType: string
): Promise<{ path: string; error?: string }> {
  const path = `${ownerId}/${md5Hash}`;
  try {
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(path, fileBytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
        return { path };
      }
      return { path, error: error.message };
    }
    return { path: data.path };
  } catch (err: any) {
    return { path, error: err.message };
  }
}
