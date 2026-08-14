import React from 'react';
import { Search, Plus, FileDown, ShieldCheck, Database, RefreshCw } from 'lucide-react';

interface HeaderProps {
  currentTab?: string;
  activeTab?: string;
  globalSearch?: string;
  onSearchChange?: (query: string) => void;
  onSearch?: (query: string) => void;
  onNewAssignment?: () => void;
  onQuickAssign?: () => void;
  onImportKeys?: () => void;
  onRefresh?: () => void;
  onLock?: () => void;
  availableCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  activeTab,
  globalSearch = '',
  onSearchChange,
  onSearch,
  onNewAssignment,
  onQuickAssign,
  onImportKeys,
  onRefresh = () => {},
  onLock,
  availableCount = 0
}) => {
  const selectedTab = currentTab || activeTab || 'dashboard';

  const handleSearch = (query: string) => {
    if (typeof onSearchChange === 'function') {
      onSearchChange(query);
    } else if (typeof onSearch === 'function') {
      onSearch(query);
    }
  };

  const handleAssignClick = () => {
    if (typeof onNewAssignment === 'function') {
      onNewAssignment();
    } else if (typeof onQuickAssign === 'function') {
      onQuickAssign();
    }
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Overview & Dashboard';
      case 'customers':
      case 'customer-detail':
        return 'Customer Management';
      case 'licenses':
        return 'License Key Inventory';
      case 'assign':
        return 'Assign New License';
      case 'import':
        return 'Import License Keys';
      case 'payments':
        return 'Payment Proof Verification';
      case 'reports':
        return 'Analytics & Reports';
      case 'audit':
      case 'audit-logs':
        return 'Security & Audit Logs';
      case 'settings':
        return 'System & Database Settings';
      default:
        return 'License Manager';
    }
  };

  return (
    <header
      id="app-header"
      className="h-16 border-b flex items-center justify-between px-6 bg-slate-900/90 backdrop-blur border-slate-800 text-slate-100 z-10"
    >
      <div className="flex items-center space-x-4">
        <h2 className="text-lg font-semibold tracking-tight">{getTabTitle(selectedTab)}</h2>
        <div className="hidden lg:flex items-center space-x-2 text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>Local SQLite</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-medium">{availableCount} Keys Ready</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Global Search Bar */}
        <div className="relative w-64 md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            id="global-search-input"
            type="text"
            value={globalSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search key, customer, @telegram, phone..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-slate-950/70 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-200 placeholder-slate-500"
          />
          {globalSearch && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Refresh button */}
        <button
          id="header-refresh-btn"
          onClick={onRefresh}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
          title="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Action Buttons */}
        {onImportKeys && (
          <button
            id="header-import-btn"
            onClick={onImportKeys}
            className="hidden sm:flex items-center space-x-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import Keys</span>
          </button>
        )}

        <button
          id="header-assign-btn"
          onClick={handleAssignClick}
          className="flex items-center space-x-1.5 text-xs font-medium px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Assign License</span>
        </button>
      </div>
    </header>
  );
};
