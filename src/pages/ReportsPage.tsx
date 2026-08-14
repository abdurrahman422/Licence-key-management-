import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Layers,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';

export const ReportsPage: React.FC = () => {
  const [reportsData, setReportsData] = useState<{
    dailyAssignments: { date: string; count: number }[];
    inventoryBreakdown: { status: string; count: number }[];
    durationBreakdown: { duration_days: number; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const data = await api.getReports();
        setReportsData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleExport = (type: string) => {
    window.location.href = `/api/export/${type}`;
  };

  if (loading || !reportsData) {
    return (
      <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Generating Analytics & Reports...</span>
      </div>
    );
  }

  const { dailyAssignments, inventoryBreakdown, durationBreakdown } = reportsData;
  const maxCount = Math.max(...dailyAssignments.map((d) => d.count), 1);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Reports & Business Analytics</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical assignment volumes, inventory statuses, and duration breakdowns.
          </p>
        </div>
      </div>

      {/* CSV Export Suite */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800">
          <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-white">Direct CSV Data Exports</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => handleExport('customers')}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-left transition flex items-center justify-between group"
          >
            <div>
              <span className="text-xs font-semibold text-white block group-hover:text-indigo-300 transition">
                Customers CSV
              </span>
              <span className="text-[11px] text-slate-500">Full CRM contact list</span>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
          </button>

          <button
            onClick={() => handleExport('licenses')}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-left transition flex items-center justify-between group"
          >
            <div>
              <span className="text-xs font-semibold text-white block group-hover:text-indigo-300 transition">
                License Inventory CSV
              </span>
              <span className="text-[11px] text-slate-500">All keys and statuses</span>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
          </button>

          <button
            onClick={() => handleExport('assignments')}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-left transition flex items-center justify-between group"
          >
            <div>
              <span className="text-xs font-semibold text-white block group-hover:text-indigo-300 transition">
                Assignments History CSV
              </span>
              <span className="text-[11px] text-slate-500">All customer activations</span>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
          </button>

          <button
            onClick={() => handleExport('audit-logs')}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 text-left transition flex items-center justify-between group"
          >
            <div>
              <span className="text-xs font-semibold text-white block group-hover:text-indigo-300 transition">
                Audit Trail CSV
              </span>
              <span className="text-[11px] text-slate-500">Full system security logs</span>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition" />
          </button>
        </div>
      </div>

      {/* Daily Assignments Histogram Chart */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-semibold text-white">Daily License Assignments (Last 30 Days)</h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-time DB Counts</span>
        </div>

        {dailyAssignments.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">
            No assignments recorded in the last 30 days.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="h-44 flex items-end space-x-2 pt-4 px-2">
              {dailyAssignments.map((d) => {
                const heightPct = (d.count / maxCount) * 100;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center group relative">
                    <div
                      style={{ height: `${Math.max(8, heightPct)}%` }}
                      className="w-full bg-indigo-600 group-hover:bg-indigo-500 rounded-t-md transition-all relative"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[10px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap border border-slate-700">
                        {d.count} keys ({d.date})
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 transform -rotate-45 origin-top-left hidden sm:block">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Status Breakdown & Duration Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-semibold text-white">Inventory Status Breakdown</h4>
          </div>

          <div className="space-y-3">
            {inventoryBreakdown.map((item) => (
              <div key={item.status} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="font-medium text-slate-300">{item.status}</span>
                <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-900">
                  {item.count} keys
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Duration Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Clock className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-white">Popular Duration Preferences</h4>
          </div>

          <div className="space-y-3">
            {durationBreakdown.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">No assignments data yet.</div>
            ) : (
              durationBreakdown.map((item) => (
                <div key={item.duration_days} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="font-medium text-slate-300">{item.duration_days} Days Duration</span>
                  <span className="font-mono font-bold text-indigo-300 px-2 py-0.5 rounded bg-slate-900">
                    {item.count} activations
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
