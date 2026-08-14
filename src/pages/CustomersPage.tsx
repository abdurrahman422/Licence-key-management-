import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Download,
  Copy,
  Check,
  ExternalLink,
  Phone,
  MessageSquare,
  ShieldCheck,
  Clock,
  UserPlus,
  ArrowUpRight
} from 'lucide-react';
import { Customer } from '../types';
import { api, copyToClipboard } from '../services/api';
import { formatDate, getExpiryBadge } from '../utils/date';

interface CustomersPageProps {
  onSelectCustomer: (customerId: number) => void;
  onNavigate: (tab: string) => void;
  globalSearchQuery?: string;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  onSelectCustomer,
  onNavigate,
  globalSearchQuery = ''
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState<string>(globalSearchQuery);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomers({
        search: search.trim() || undefined
      });
      setCustomers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (globalSearchQuery) {
      setSearch(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleCopy = async (text: string) => {
    await copyToClipboard(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportCsv = () => {
    window.location.href = '/api/export/customers';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Customer Records & CRM</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your customer database, verified payment proofs, and active license timelines.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export Customers CSV</span>
          </button>
          <button
            onClick={() => onNavigate('assign')}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New Customer Assignment</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, @telegram, phone, email..."
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
          />
        </div>

        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          {customers.length} Customers Found
        </span>
      </div>

      {/* Customers Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading Customers...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-3">
            <Users className="w-8 h-8 mx-auto opacity-30 text-indigo-400" />
            <p>No customer records found.</p>
            <button
              onClick={() => onNavigate('assign')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-medium"
            >
              Register & Assign First Customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-3 pl-2 font-medium">Customer Name</th>
                  <th className="pb-3 font-medium">Telegram / Phone</th>
                  <th className="pb-3 font-medium">Active License Key</th>
                  <th className="pb-3 font-medium">License Status</th>
                  <th className="pb-3 font-medium">Expiry Date</th>
                  <th className="pb-3 font-medium">Payment Status</th>
                  <th className="pb-3 font-medium">Registered Date</th>
                  <th className="pb-3 pr-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((cust) => {
                  const badge = getExpiryBadge(cust.activeLicenseExpiry, cust.activeLicenseStatus || 'AVAILABLE');
                  return (
                    <tr key={cust.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 pl-2 font-medium text-white">
                        <button
                          onClick={() => onSelectCustomer(cust.id)}
                          className="hover:text-indigo-300 text-left font-semibold"
                        >
                          {cust.name}
                        </button>
                        {cust.email && <span className="text-[11px] text-slate-500 block">{cust.email}</span>}
                      </td>

                      <td className="py-3.5">
                        <div className="flex flex-col">
                          <span className="font-mono text-indigo-300 font-medium">{cust.telegramUsername}</span>
                          <span className="font-mono text-slate-400 text-[11px]">{cust.phone}</span>
                        </div>
                      </td>

                      <td className="py-3.5 font-mono">
                        {cust.activeLicenseKey ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-slate-200 font-semibold">{cust.activeLicenseKey}</span>
                            <button
                              onClick={() => handleCopy(cust.activeLicenseKey!)}
                              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/50"
                              title="Copy License Key"
                            >
                              {copiedKey === cust.activeLicenseKey ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">None</span>
                        )}
                      </td>

                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge.colorClass}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3.5 font-mono text-slate-300">{formatDate(cust.activeLicenseExpiry)}</td>

                      <td className="py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            cust.paymentStatus === 'VERIFIED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : cust.paymentStatus === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {cust.paymentStatus || 'VERIFIED'}
                        </span>
                      </td>

                      <td className="py-3.5 text-slate-500 text-[11px]">{formatDate(cust.createdAt)}</td>

                      <td className="py-3.5 pr-2 text-right">
                        <button
                          onClick={() => onSelectCustomer(cust.id)}
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition flex items-center space-x-1 ml-auto"
                        >
                          <span>Details</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
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
