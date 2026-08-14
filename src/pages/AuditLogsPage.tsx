import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Download,
  Filter,
  RefreshCw,
  Clock,
  Terminal
} from 'lucide-react';
import { AuditLog } from '../types';
import { api } from '../services/api';
import { formatDate } from '../utils/date';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs({
        action: actionFilter,
        search: search.trim() || undefined,
        limit: 200
      });
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, search]);

  const handleExportCsv = () => {
    window.location.href = '/api/export/audit-logs';
  };

  const actionTypes = [
    { id: 'ALL', label: 'All Events' },
    { id: 'IMPORT_LICENSES', label: 'Key Imports' },
    { id: 'ASSIGN_LICENSE', label: 'Assignments' },
    { id: 'EXTEND_LICENSE', label: 'Extensions' },
    { id: 'CANCEL_LICENSE', label: 'Cancellations' },
    { id: 'PAYMENT_VERIFIED', label: 'Payments' },
    { id: 'BACKUP_DATABASE', label: 'Backups' }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">System Security & Audit Log</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable transaction records of all administrative actions, key assignments, and database modifications.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Audit Trail CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {actionTypes.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActionFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                actionFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, action, details..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading Audit Logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-2">
            <Terminal className="w-8 h-8 mx-auto opacity-30 text-indigo-400" />
            <p>No audit log events match criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-3 pl-2 font-medium">Timestamp</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium">Customer / License</th>
                  <th className="pb-3 pr-2 font-medium">Audit Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 pl-2 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                      {formatDate(log.createdAt)}
                    </td>

                    <td className="py-3 font-mono">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-950/40 text-indigo-300 border border-indigo-800/40">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 text-slate-200">{log.description}</td>

                    <td className="py-3">
                      <div className="flex flex-col text-[11px]">
                        {log.customerName && (
                          <span className="text-white font-medium">{log.customerName}</span>
                        )}
                        {log.licenseKey && (
                          <span className="font-mono text-indigo-400">{log.licenseKey}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 pr-2 font-mono text-[10px] text-slate-400 max-w-xs truncate">
                      {log.detailsJson ? (
                        <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 select-all block truncate">
                          {log.detailsJson}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
