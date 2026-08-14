import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Users,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  ArrowUpRight,
  UserPlus,
  FileDown,
  Sparkles,
  Copy,
  ExternalLink,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { DashboardStats, License } from '../types';
import { api, copyToClipboard } from '../services/api';
import { formatDate, getExpiryBadge } from '../utils/date';

interface DashboardPageProps {
  onNavigate: (tab: string, customerId?: number) => void;
  onRefreshTrigger: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onRefreshTrigger }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLicenses, setRecentLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, licensesData] = await Promise.all([
        api.getDashboardStats(),
        api.getLicenses({ limit: 8 })
      ]);
      setStats(statsData);
      setRecentLicenses(licensesData);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = async (key: string) => {
    await copyToClipboard(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleQuickLoadDemo = async () => {
    try {
      await api.loadDemo();
      loadData();
      onRefreshTrigger();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-400">Loading Dashboard Metrics...</span>
        </div>
      </div>
    );
  }

  const total = stats?.totalLicenses || 0;
  const available = stats?.availableLicenses || 0;
  const assigned = stats?.assignedLicenses || 0;
  const expired = stats?.expiredLicenses || 0;
  const cancelled = stats?.cancelledLicenses || 0;

  const availablePct = total > 0 ? (available / total) * 100 : 0;
  const assignedPct = total > 0 ? (assigned / total) * 100 : 0;
  const expiredPct = total > 0 ? (expired / total) * 100 : 0;
  const cancelledPct = total > 0 ? (cancelled / total) * 100 : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner / Empty state prompt */}
      {total === 0 && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/80 to-slate-900 border border-indigo-800/40 text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Initial Setup Ready</span>
            </div>
            <h3 className="text-lg font-bold text-white">No license keys imported yet.</h3>
            <p className="text-xs text-slate-300 max-w-xl">
              Import your legitimate pre-generated software keys to begin automatically assigning them to approved Telegram customers.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigate('import')}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition flex items-center space-x-2"
            >
              <FileDown className="w-4 h-4" />
              <span>Import Real License Keys</span>
            </button>
            <button
              onClick={handleQuickLoadDemo}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
              title="Load 10 sample keys to test the workflow"
            >
              Load Demo Keys
            </button>
          </div>
        </div>
      )}

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* TOTAL */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Keys</span>
            <KeyRound className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">{total}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Imported inventory</span>
          </div>
        </div>

        {/* AVAILABLE */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-900/30 flex flex-col justify-between bg-emerald-950/10">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-medium uppercase tracking-wider">Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">{available}</span>
            <span className="text-[11px] text-emerald-500/80 block mt-0.5">Ready for FIFO</span>
          </div>
        </div>

        {/* ASSIGNED */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-blue-900/30 flex flex-col justify-between bg-blue-950/10">
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-xs font-medium uppercase tracking-wider">Assigned</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-blue-400 tracking-tight">{assigned}</span>
            <span className="text-[11px] text-blue-400/70 block mt-0.5">Active with clients</span>
          </div>
        </div>

        {/* EXPIRED */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-900/30 flex flex-col justify-between bg-amber-950/10">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-medium uppercase tracking-wider">Expired</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-400 tracking-tight">{expired}</span>
            <span className="text-[11px] text-amber-500/80 block mt-0.5">Passed duration</span>
          </div>
        </div>

        {/* CANCELLED */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-rose-900/30 flex flex-col justify-between bg-rose-950/10">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-medium uppercase tracking-wider">Cancelled</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-rose-400 tracking-tight">{cancelled}</span>
            <span className="text-[11px] text-rose-500/80 block mt-0.5">Revoked / Locked</span>
          </div>
        </div>

        {/* TOTAL CUSTOMERS */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-900/30 flex flex-col justify-between bg-indigo-950/10">
          <div className="flex items-center justify-between text-indigo-400">
            <span className="text-xs font-medium uppercase tracking-wider">Customers</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-indigo-300 tracking-tight">{stats?.totalCustomers || 0}</span>
            <span className="text-[11px] text-indigo-400/70 block mt-0.5">Registered CRM</span>
          </div>
        </div>
      </div>

      {/* Visual Inventory Distribution Progress Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-sm font-semibold text-white">Live Inventory Distribution</h4>
            <p className="text-xs text-slate-400">Exact real-time state of your imported license keys</p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-300">Available: {available}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-300">Assigned: {assigned}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-300">Expired: {expired}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-300">Cancelled: {cancelled}</span>
            </div>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex">
          <div style={{ width: `${availablePct}%` }} className="bg-emerald-500 h-full transition-all duration-500" title={`Available: ${available}`} />
          <div style={{ width: `${assignedPct}%` }} className="bg-blue-500 h-full transition-all duration-500" title={`Assigned: ${assigned}`} />
          <div style={{ width: `${expiredPct}%` }} className="bg-amber-500 h-full transition-all duration-500" title={`Expired: ${expired}`} />
          <div style={{ width: `${cancelledPct}%` }} className="bg-rose-500 h-full transition-all duration-500" title={`Cancelled: ${cancelled}`} />
        </div>
      </div>

      {/* Expiry & Activity Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Today's Assignments</span>
            <span className="text-xl font-bold text-white mt-1 block">{stats?.todayAssignments || 0}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-400">
            <UserPlus className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Expiring Today</span>
            <span className="text-xl font-bold text-red-400 mt-1 block">{stats?.expiringToday || 0}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-red-600/10 text-red-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Expiring in 3 Days</span>
            <span className="text-xl font-bold text-amber-400 mt-1 block">{stats?.expiringIn3Days || 0}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-600/10 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Expiring in 7 Days</span>
            <span className="text-xl font-bold text-sky-400 mt-1 block">{stats?.expiringIn7Days || 0}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-600/10 text-sky-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recent Licenses Table with 1-click actions */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-white">Recent License Key Activity</h4>
            <p className="text-xs text-slate-400">Latest imported and assigned keys</p>
          </div>
          <button
            onClick={() => onNavigate('licenses')}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-medium"
          >
            <span>View Full Inventory ({total})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentLicenses.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No license keys in database. Click "Import Keys" to add your license list.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-3 pl-2 font-medium">License Key</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Customer / Telegram</th>
                  <th className="pb-3 font-medium">Start Date</th>
                  <th className="pb-3 font-medium">Expiry Date</th>
                  <th className="pb-3 pr-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentLicenses.map((lic) => {
                  const badge = getExpiryBadge(lic.expiryDate, lic.status);
                  return (
                    <tr key={lic.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 pl-2 font-mono text-slate-200">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-indigo-300">{lic.licenseKey}</span>
                          <button
                            onClick={() => handleCopy(lic.licenseKey)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/50"
                            title="Copy License Key"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {copiedKey === lic.licenseKey && (
                            <span className="text-[10px] text-emerald-400 font-sans">Copied!</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge.colorClass}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3">
                        {lic.customerName ? (
                          <div className="flex flex-col">
                            <span className="text-white font-medium">{lic.customerName}</span>
                            <span className="text-slate-400 font-mono text-[11px]">{lic.telegramUsername}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-400">{formatDate(lic.startDate)}</td>
                      <td className="py-3 text-slate-300">{formatDate(lic.expiryDate)}</td>
                      <td className="py-3 pr-2 text-right">
                        {lic.customerId ? (
                          <button
                            onClick={() => onNavigate('customers', lic.customerId!)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                          >
                            View Record
                          </button>
                        ) : (
                          <button
                            onClick={() => onNavigate('assign')}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition"
                          >
                            Assign Now
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
