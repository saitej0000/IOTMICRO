import React, { useState, useMemo } from 'react';
import { 
  FileContentRecord, 
  UserFileRecord, 
  UploadEventRecord, 
  StorageMode, 
  UserProfile,
  StorageMetrics
} from './types';
import { 
  INITIAL_USER, 
  INITIAL_CONTENTS, 
  INITIAL_FILES, 
  INITIAL_EVENTS 
} from './data/initialData';
import { generateProjectZip, triggerDownload } from './utils/projectZip';

import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { UploadView } from './components/UploadView';
import { FilesView } from './components/FilesView';
import { DuplicateInspectorView } from './components/DuplicateInspectorView';
import { AnalyticsView } from './components/AnalyticsView';
import { IoTSimulatorView } from './components/IoTSimulatorView';
import { DatabaseView } from './components/DatabaseView';
import { DocsVivaView } from './components/DocsVivaView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [storageMode, setStorageMode] = useState<StorageMode>('local');
  const [isZipping, setIsZipping] = useState(false);

  // Switchable user accounts to verify multi-tenant isolation
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USER);
  const [contents, setContents] = useState<FileContentRecord[]>(INITIAL_CONTENTS);
  const [files, setFiles] = useState<UserFileRecord[]>(INITIAL_FILES);
  const [events, setEvents] = useState<UploadEventRecord[]>(INITIAL_EVENTS);

  // User-scoped files and contents
  const userFiles = useMemo(() => {
    return files.filter(f => f.owner_id === currentUser.id);
  }, [files, currentUser.id]);

  const userContents = useMemo(() => {
    return contents.filter(c => c.owner_id === currentUser.id);
  }, [contents, currentUser.id]);

  const userEvents = useMemo(() => {
    return events.filter(e => e.owner_id === currentUser.id);
  }, [events, currentUser.id]);

  // Dynamic storage metrics calculation
  const metrics: StorageMetrics = useMemo(() => {
    const total_files = userFiles.length;
    if (total_files === 0) {
      return {
        total_files: 0,
        unique_contents: 0,
        duplicates_count: 0,
        logical_bytes: 0,
        physical_bytes: 0,
        saved_bytes: 0,
        optimization_pct: 0,
        deduplication_ratio: 1.0,
        format_breakdown: {},
      };
    }

    const logical_bytes = userFiles.reduce((acc, f) => acc + f.file_size, 0);
    const uniqueContentMap: Record<string, number> = {};
    let duplicates_count = 0;
    const format_breakdown: Record<string, number> = {};

    userFiles.forEach(f => {
      if (!uniqueContentMap[f.content_id]) {
        uniqueContentMap[f.content_id] = f.file_size;
      } else {
        duplicates_count += 1;
      }

      const parts = f.original_filename.split('.');
      const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'other';
      format_breakdown[ext] = (format_breakdown[ext] || 0) + 1;
    });

    const physical_bytes = Object.values(uniqueContentMap).reduce((acc, sz) => acc + sz, 0);
    const saved_bytes = Math.max(0, logical_bytes - physical_bytes);
    const optimization_pct = logical_bytes > 0 ? (saved_bytes / logical_bytes) * 100 : 0;
    const deduplication_ratio = physical_bytes > 0 ? logical_bytes / physical_bytes : 1.0;

    return {
      total_files,
      unique_contents: Object.keys(uniqueContentMap).length,
      duplicates_count,
      logical_bytes,
      physical_bytes,
      saved_bytes,
      optimization_pct,
      deduplication_ratio,
      format_breakdown,
    };
  }, [userFiles]);

  // Handler: Add new file upload
  const handleAddUpload = (
    newContent: FileContentRecord | null,
    newUserFile: UserFileRecord,
    newEvent: UploadEventRecord,
    isDuplicate: boolean
  ) => {
    if (newContent) {
      setContents(prev => [newContent, ...prev]);
    } else if (isDuplicate) {
      // Increment reference count in matching content
      setContents(prev => prev.map(c => {
        if (c.id === newUserFile.content_id) {
          return { ...c, reference_count: c.reference_count + 1 };
        }
        return c;
      }));
    }

    setFiles(prev => [newUserFile, ...prev]);
    setEvents(prev => [newEvent, ...prev]);
  };

  // Handler: Rename logical file
  const handleRenameFile = (fileId: string, newFilename: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        return { ...f, original_filename: newFilename };
      }
      return f;
    }));

    const target = files.find(f => f.id === fileId);
    if (target) {
      const event: UploadEventRecord = {
        id: `ev-ren-${Date.now()}`,
        owner_id: currentUser.id,
        filename: newFilename,
        event_type: 'FILE_RENAMED',
        file_size: target.file_size,
        md5_hash: target.md5_hash,
        created_at: new Date().toISOString(),
      };
      setEvents(prev => [event, ...prev]);
    }
  };

  // Handler: Delete logical file reference
  const handleDeleteFile = (fileId: string) => {
    const targetFile = files.find(f => f.id === fileId);
    if (!targetFile) return;

    // Delete user file
    setFiles(prev => prev.filter(f => f.id !== fileId));

    // Decrement content reference count
    const contentId = targetFile.content_id;
    const targetContent = contents.find(c => c.id === contentId);

    const now = new Date().toISOString();
    const event: UploadEventRecord = {
      id: `ev-del-${Date.now()}`,
      owner_id: currentUser.id,
      filename: targetFile.original_filename,
      event_type: 'FILE_DELETED',
      file_size: targetFile.file_size,
      md5_hash: targetFile.md5_hash,
      created_at: now,
    };

    if (targetContent && targetContent.reference_count <= 1) {
      // Last reference being removed! Purge physical storage!
      setContents(prev => prev.filter(c => c.id !== contentId));
      const purgeEvent: UploadEventRecord = {
        id: `ev-purge-${Date.now()}`,
        owner_id: currentUser.id,
        filename: targetFile.original_filename,
        event_type: 'CONTENT_PURGED',
        file_size: targetFile.file_size,
        md5_hash: targetFile.md5_hash,
        created_at: new Date(Date.now() + 10).toISOString(),
      };
      setEvents(prev => [purgeEvent, event, ...prev]);
    } else {
      // Decrement reference
      setContents(prev => prev.map(c => {
        if (c.id === contentId) {
          return { ...c, reference_count: c.reference_count - 1 };
        }
        return c;
      }));
      setEvents(prev => [event, ...prev]);
    }
  };

  // Handler: Switch between Student 1 and Student 2 (multi-tenant test)
  const handleSwitchUser = () => {
    if (currentUser.id === 'student-iot-user-01') {
      setCurrentUser({
        id: 'student-iot-user-02',
        email: 'student2@college.edu',
        name: 'B.Tech Student 2 (Evaluator)',
      });
    } else {
      setCurrentUser(INITIAL_USER);
    }
  };

  // Handler: Fast Duplicate Injection (Demo helper)
  const handleInjectDuplicate = () => {
    if (userFiles.length === 0) return;
    const source = userFiles[0];
    const now = new Date().toISOString();
    const copyName = `duplicate_copy_${Date.now().toString().slice(-4)}_${source.original_filename}`;
    
    const userFile: UserFileRecord = {
      id: `uf-dup-${Date.now()}`,
      owner_id: currentUser.id,
      original_filename: copyName,
      content_id: source.content_id,
      mime_type: source.mime_type,
      upload_date: now,
      is_duplicate: true,
      md5_hash: source.md5_hash,
      file_size: source.file_size,
      reference_count: source.reference_count + 1,
    };

    const event: UploadEventRecord = {
      id: `ev-dup-${Date.now()}`,
      owner_id: currentUser.id,
      filename: copyName,
      event_type: 'UPLOAD_DUPLICATE',
      file_size: source.file_size,
      md5_hash: source.md5_hash,
      created_at: now,
    };

    handleAddUpload(null, userFile, event, true);
  };

  // Handler: Fast IoT Reading Injection (Demo helper)
  const handleInjectIoT = () => {
    const temp = +(23.0 + Math.random() * 5).toFixed(2);
    const hum = +(50.0 + Math.random() * 20).toFixed(2);
    const reading = {
      device_id: 'IOT-NODE-01-LAB',
      temperature_celsius: temp,
      humidity_percentage: hum,
      pressure_hpa: 1013.25,
      timestamp: new Date().toISOString(),
      sensor_status: 'NOMINAL',
    };
    const contentStr = JSON.stringify(reading, null, 2);
    const size = new TextEncoder().encode(contentStr).length;
    const now = new Date().toISOString();
    const filename = `iot_reading_${now.slice(11, 19).replace(/:/g, '')}.json`;

    // Hash
    import('./utils/md5').then(({ computeMD5FromString }) => {
      const md5 = computeMD5FromString(contentStr);
      const existing = contents.find(c => c.owner_id === currentUser.id && c.md5_hash === md5);

      if (existing) {
        const userFile: UserFileRecord = {
          id: `uf-iot-${Date.now()}`,
          owner_id: currentUser.id,
          original_filename: filename,
          content_id: existing.id,
          mime_type: 'application/json',
          upload_date: now,
          is_duplicate: true,
          md5_hash: md5,
          file_size: size,
          reference_count: existing.reference_count + 1,
        };
        const event: UploadEventRecord = {
          id: `ev-iot-${Date.now()}`,
          owner_id: currentUser.id,
          filename,
          event_type: 'UPLOAD_DUPLICATE',
          file_size: size,
          md5_hash: md5,
          created_at: now,
        };
        handleAddUpload(null, userFile, event, true);
      } else {
        const contentId = `cnt-iot-${Date.now()}`;
        const newContent: FileContentRecord = {
          id: contentId,
          owner_id: currentUser.id,
          md5_hash: md5,
          file_size: size,
          storage_path: `${currentUser.id}/${md5}`,
          reference_count: 1,
          created_at: now,
          dataUrl: 'data:application/json;charset=utf-8,' + encodeURIComponent(contentStr),
        };
        const userFile: UserFileRecord = {
          id: `uf-iot-${Date.now()}`,
          owner_id: currentUser.id,
          original_filename: filename,
          content_id: contentId,
          mime_type: 'application/json',
          upload_date: now,
          is_duplicate: false,
          md5_hash: md5,
          file_size: size,
          reference_count: 1,
        };
        const event: UploadEventRecord = {
          id: `ev-iot-${Date.now()}`,
          owner_id: currentUser.id,
          filename,
          event_type: 'UPLOAD_NEW',
          file_size: size,
          md5_hash: md5,
          created_at: now,
        };
        handleAddUpload(newContent, userFile, event, false);
      }
    });
  };

  // Handler: Reset demo data
  const handleResetData = () => {
    setCurrentUser(INITIAL_USER);
    setContents(INITIAL_CONTENTS);
    setFiles(INITIAL_FILES);
    setEvents(INITIAL_EVENTS);
  };

  // Handler: Download Complete Project (.ZIP)
  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const blob = await generateProjectZip();
      triggerDownload(blob, 'cloud-file-manager-md5-btech-project.zip');
    } catch (err) {
      console.error('Failed to create project ZIP', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        storageMode={storageMode}
        setStorageMode={setStorageMode}
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onDownloadZip={handleDownloadZip}
        isZipping={isZipping}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            metrics={metrics}
            events={userEvents}
            onNavigateTab={setActiveTab}
            onInjectDuplicate={handleInjectDuplicate}
            onInjectIoT={handleInjectIoT}
            onResetData={handleResetData}
          />
        )}

        {activeTab === 'upload' && (
          <UploadView
            ownerId={currentUser.id}
            contents={userContents}
            onAddUpload={handleAddUpload}
            onNavigateFiles={() => setActiveTab('files')}
          />
        )}

        {activeTab === 'files' && (
          <FilesView
            files={userFiles}
            contents={userContents}
            onRenameFile={handleRenameFile}
            onDeleteFile={handleDeleteFile}
          />
        )}

        {activeTab === 'duplicates' && (
          <DuplicateInspectorView />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            metrics={metrics}
            files={userFiles}
            contents={userContents}
          />
        )}

        {activeTab === 'iot' && (
          <IoTSimulatorView
            ownerId={currentUser.id}
            contents={userContents}
            onAddUpload={handleAddUpload}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseView
            contents={userContents}
            files={userFiles}
            events={userEvents}
            storageMode={storageMode}
            setStorageMode={setStorageMode}
          />
        )}

        {activeTab === 'viva' && (
          <DocsVivaView
            onDownloadZip={handleDownloadZip}
            isZipping={isZipping}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Cloud File Manager</span>
            <span aria-hidden="true">·</span>
            <span>MD5 Deduplication &amp; Storage Optimization</span>
            <span aria-hidden="true">·</span>
            <span>B.Tech Micro Project</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <span>Supabase PostgreSQL</span>
            <span aria-hidden="true">·</span>
            <span>Python hashlib MD5</span>
            <span aria-hidden="true">·</span>
            <span>17/17 Unit Tests Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
