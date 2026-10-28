import React, { useState } from 'react';
import { 
  Search, 
  Download, 
  Trash2, 
  Edit2, 
  File, 
  FileText, 
  FileCode, 
  FileSpreadsheet, 
  Image as ImageIcon,
  Check,
  X,
  Copy,
  Info
} from 'lucide-react';
import { UserFileRecord, FileContentRecord } from '../types';
import { formatBytes } from '../utils/md5';

interface FilesViewProps {
  files: UserFileRecord[];
  contents: FileContentRecord[];
  onRenameFile: (fileId: string, newFilename: string) => void;
  onDeleteFile: (fileId: string) => void;
}

export const FilesView: React.FC<FilesViewProps> = ({
  files,
  contents,
  onRenameFile,
  onDeleteFile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExt, setFilterExt] = useState('ALL');
  const [filterDuplicate, setFilterDuplicate] = useState('ALL');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFilename, setEditFilename] = useState('');

  // Extract all unique extensions
  const extensions = Array.from(
    new Set(
      files
        .map(f => {
          const parts = f.original_filename.split('.');
          return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'OTHER';
        })
    )
  ).sort();

  // Filter and sort
  const filteredFiles = files.filter(f => {
    const matchesSearch = 
      f.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.md5_hash.toLowerCase().includes(searchQuery.toLowerCase());

    const ext = f.original_filename.split('.').pop()?.toUpperCase() || 'OTHER';
    const matchesExt = filterExt === 'ALL' || ext === filterExt;

    const matchesDup = 
      filterDuplicate === 'ALL' || 
      (filterDuplicate === 'DUPLICATE' && f.is_duplicate) ||
      (filterDuplicate === 'ORIGINAL' && !f.is_duplicate);

    return matchesSearch && matchesExt && matchesDup;
  });

  filteredFiles.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.original_filename.localeCompare(b.original_filename);
    } else if (sortBy === 'size') {
      comparison = a.file_size - b.file_size;
    } else {
      comparison = new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime();
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'svg', 'webp'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4 text-sky-500" />;
    }
    if (['csv', 'xlsx', 'xls'].includes(ext || '')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
    }
    if (['json', 'py', 'ts', 'js', 'html', 'css'].includes(ext || '')) {
      return <FileCode className="w-4 h-4 text-amber-500" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) {
      return <FileText className="w-4 h-4 text-indigo-500" />;
    }
    return <File className="w-4 h-4 text-slate-400" />;
  };

  const handleStartRename = (file: UserFileRecord) => {
    setEditingId(file.id);
    setEditFilename(file.original_filename);
  };

  const handleSaveRename = (fileId: string) => {
    if (editFilename.trim()) {
      onRenameFile(fileId, editFilename.trim());
    }
    setEditingId(null);
  };

  const handleDownload = (file: UserFileRecord) => {
    const content = contents.find(c => c.id === file.content_id);
    let href = content?.dataUrl;
    
    if (!href) {
      // Fallback synthetic blob
      const blob = new Blob([`Content of ${file.original_filename} (MD5: ${file.md5_hash})`], { type: file.mime_type });
      href = URL.createObjectURL(blob);
    }

    const a = document.createElement('a');
    a.href = href;
    a.download = file.original_filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            My Registered Files
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Browse and manage all logical user references. Deleting a file reference decrements the content counter without breaking shared duplicates.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-900">{filteredFiles.length}</span> of <span className="font-semibold text-slate-900">{files.length}</span> files
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by filename or MD5 hash prefix..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Extension Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0 font-medium">Format:</label>
            <select
              value={filterExt}
              onChange={(e) => setFilterExt(e.target.value)}
              className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Formats</option>
              {extensions.map(ext => (
                <option key={ext} value={ext}>{ext}</option>
              ))}
            </select>
          </div>

          {/* Duplicate Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0 font-medium">Type:</label>
            <select
              value={filterDuplicate}
              onChange={(e) => setFilterDuplicate(e.target.value)}
              className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Files</option>
              <option value="ORIGINAL">Original Objects Only</option>
              <option value="DUPLICATE">Deduplicated References Only</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0 font-medium">Sort:</label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-') as [any, any];
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-700 cursor-pointer"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="size-desc">Size (Largest)</option>
              <option value="size-asc">Size (Smallest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Files Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">MD5 Checksum</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Ref Count</th>
                <th className="py-3 px-4">Storage Status</th>
                <th className="py-3 px-4">Upload Timestamp</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No files found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => {
                  const isEditing = editingId === file.id;
                  const matchingContent = contents.find(c => c.id === file.content_id);
                  const activeRefs = matchingContent ? matchingContent.reference_count : file.reference_count;

                  return (
                    <tr key={file.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Filename with inline edit */}
                      <td className="py-3 px-4 min-w-[220px]">
                        <div className="flex items-center gap-2.5">
                          {getFileIcon(file.original_filename)}
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                value={editFilename}
                                onChange={(e) => setEditFilename(e.target.value)}
                                className="px-2 py-1 text-xs border border-indigo-500 rounded focus:outline-none flex-1 font-medium text-slate-800"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRename(file.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                title="Save filename"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-slate-400 hover:bg-slate-100 rounded cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group">
                              <span className="font-medium text-slate-900 truncate max-w-[260px]" title={file.original_filename}>
                                {file.original_filename}
                              </span>
                              <button
                                onClick={() => handleStartRename(file)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity p-0.5 cursor-pointer"
                                title="Rename logical reference"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* MD5 Checksum */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        <span title={file.md5_hash} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                          {file.md5_hash.slice(0, 8)}...{file.md5_hash.slice(-4)}
                        </span>
                      </td>

                      {/* Size */}
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                        {formatBytes(file.file_size)}
                      </td>

                      {/* Reference Count */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold ${
                          activeRefs > 1 ? 'text-indigo-600' : 'text-slate-500'
                        }`}>
                          <Copy className="w-3 h-3" />
                          <span>{activeRefs}</span>
                        </span>
                      </td>

                      {/* Storage Status */}
                      <td className="py-3 px-4">
                        {file.is_duplicate ? (
                          <span className="text-[11px] font-medium text-amber-700">
                            Reused Blob (Deduplicated)
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-emerald-700">
                            Primary Cloud Object
                          </span>
                        )}
                      </td>

                      {/* Upload Date */}
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {new Date(file.upload_date).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Actions: Download & Delete */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDownload(file)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Download original file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteFile(file.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={activeRefs > 1 
                              ? `Delete reference (${activeRefs - 1} reference(s) still share content)` 
                              : "Delete last reference (purges storage object)"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
