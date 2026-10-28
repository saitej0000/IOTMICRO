import React from 'react';
import { Download, Cloud, HardDrive, User } from 'lucide-react';
import { StorageMode, UserProfile } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  storageMode: StorageMode;
  setStorageMode: (mode: StorageMode) => void;
  currentUser: UserProfile;
  onSwitchUser: () => void;
  onDownloadZip: () => void;
  isZipping: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  storageMode,
  setStorageMode,
  currentUser,
  onSwitchUser,
  onDownloadZip,
  isZipping,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'upload', label: 'Upload Files' },
    { id: 'files', label: 'My Files' },
    { id: 'duplicates', label: 'Duplicate Inspector' },
    { id: 'analytics', label: 'Storage Analytics' },
    { id: 'iot', label: 'IoT Simulation' },
    { id: 'database', label: 'Database Schema' },
    { id: 'viva', label: 'Viva & Docs' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Strict 3-Zone Top Bar Contract */}
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
              <Cloud className="w-5 h-5" />
            </div>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="text-left cursor-pointer focus:outline-none"
            >
              <span className="text-base font-bold tracking-tight text-slate-900 block whitespace-nowrap">
                MD5 Cloud Deduplication
              </span>
              <span className="text-[11px] text-slate-500 block leading-none">
                B.Tech IoT & Cloud Micro Project
              </span>
            </button>
          </div>

          {/* Zone 2: Navigation Links (Single-line whitespace-nowrap) */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action & Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* User Switcher */}
            <button
              onClick={onSwitchUser}
              title="Click to switch between Student 1 and Student 2 to test user isolation"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="whitespace-nowrap font-medium">{currentUser.name.split(' ')[0]}</span>
            </button>

            {/* Mode Indicator Button */}
            <button
              onClick={() => setStorageMode(storageMode === 'local' ? 'cloud' : 'local')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border font-medium transition-colors cursor-pointer ${
                storageMode === 'cloud'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
              title="Toggle between Local Sandbox and Supabase Cloud mode"
            >
              <HardDrive className="w-3 h-3" />
              <span className="whitespace-nowrap">
                {storageMode === 'cloud' ? 'Supabase Cloud' : 'Local Sandbox'}
              </span>
            </button>

            {/* Export Project ZIP CTA */}
            <button
              onClick={onDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Bundling...' : 'Download Project ZIP'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 text-xs">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`px-2.5 py-1 rounded whitespace-nowrap shrink-0 ${
                activeTab === item.id
                  ? 'bg-indigo-100 text-indigo-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
