import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  CalendarPlus,
  Ban,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { License } from '../types';
import { api, copyToClipboard } from '../services/api';
import { formatDate, getExpiryBadge } from '../utils/date';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface LicensesPageProps {
  onNavigate: (tab: string, customerId?: number) => void;
  globalSearchQuery?: string;
}

export const LicensesPage: React.FC<LicensesPageProps> = ({ onNavigate, globalSearchQuery = '' }) => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>(globalSearchQuery);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals state
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [extendDays, setExtendDays] = useState('7');
  const [extendNotes, setExtendNotes] = useState('');

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadLicenses = async () => {
    try {
      setLoading(true);
      const data = await api.getLicenses({
        status: statusFilter,
        search: search.trim() || undefined
      });
      setLicenses(data);
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
    loadLicenses();
  }, [statusFilter, search]);

  const handleCopy = async (key: string) => {
    await copyToClipboard(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenExtend = (license: License) => {
    setSelectedLicense(license);
    setExtendDays('7');
    setExtendNotes('');
    setExtendModalOpen(true);
  };

  const handleConfirmExtend = async () => {
    if (!selectedLicense) return;
    try {
      setActionLoading(true);
      await api.extendLicense({
        licenseId: selectedLicense.id,
        additionalDays: parseInt(extendDays, 10),
        notes: extendNotes || undefined
      });
      setExtendModalOpen(false);
      loadLicenses();
    } catch (err: any) {
      alert(`Extension failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCancel = (license: License) => {
    setSelectedLicense(license);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedLicense) return;
    try {
      setActionLoading(true);
      await api.cancelLicense({
        licenseId: selectedLicense.id,
        reason: cancelReason || 'Manual cancellation'
      });
      setCancelModalOpen(false);
      loadLicenses();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCsv = () => {
    window.location.href = '/api/export/licenses';
  };

  const filterTabs = [
    { id: 'ALL', label: 'All Licenses' },
    { id: 'AVAILABLE', label: 'Available' },
    { id: 'ASSIGNED', label: 'Assigned' },
    { id: 'EXPIRED', label: 'Expired' },
    { id: 'CANCELLED', label: 'Cancelled' }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">License Key Inventory</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Full view of all pre-generated inventory records and assignment statuses.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => onNavigate('import')}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Import New Keys</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Local Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter key, customer, @telegram..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading License Inventory...</span>
          </div>
        ) : licenses.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-3">
            <KeyRound className="w-8 h-8 mx-auto opacity-30 text-indigo-400" />
            <p>No licenses match the current status filter or search criteria.</p>
            <button
              onClick={() => onNavigate('import')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 text-xs font-medium"
            >
              Import License Keys
            </button>
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
                  <th className="pb-3 font-medium">Imported Date</th>
                  <th className="pb-3 pr-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {licenses.map((lic) => {
                  const badge = getExpiryBadge(lic.expiryDate, lic.status);
                  return (
                    <tr key={lic.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 pl-2 font-mono">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-indigo-300 select-all">{lic.licenseKey}</span>
                          <button
                            onClick={() => handleCopy(lic.licenseKey)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-700/50"
                            title="Copy License Key"
                          >
                            {copiedKey === lic.licenseKey ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {lic.notes && <span className="text-[11px] text-slate-500 block">{lic.notes}</span>}
                      </td>

                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${badge.colorClass}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="py-3.5">
                        {lic.customerName ? (
                          <div className="flex flex-col">
                            <span className="text-white font-medium">{lic.customerName}</span>
                            <span className="text-indigo-400 font-mono text-[11px]">{lic.telegramUsername}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 text-slate-400">{formatDate(lic.startDate)}</td>
                      <td className="py-3.5 font-mono text-slate-300 font-medium">{formatDate(lic.expiryDate)}</td>
                      <td className="py-3.5 text-slate-500 text-[11px]">{formatDate(lic.importedAt)}</td>

                      <td className="py-3.5 pr-2 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {lic.customerId && (
                            <button
                              onClick={() => onNavigate('customers', lic.customerId!)}
                              className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                              title="View Customer CRM Record"
                            >
                              Customer
                            </button>
                          )}

                          {lic.status !== 'CANCELLED' && lic.status !== 'AVAILABLE' && (
                            <>
                              <button
                                onClick={() => handleOpenExtend(lic)}
                                className="p-1.5 rounded-md bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 transition"
                                title="Extend License Duration"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenCancel(lic)}
                                className="p-1.5 rounded-md bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 transition"
                                title="Cancel License"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {lic.status === 'AVAILABLE' && (
                            <button
                              onClick={() => onNavigate('assign')}
                              className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white transition"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Extend License Modal */}
      <ConfirmationModal
        isOpen={extendModalOpen}
        title="Extend License Duration"
        description="Add duration without changing the customer's existing license key."
        type="primary"
        confirmText="Confirm Extension"
        cancelText="Cancel"
        onConfirm={handleConfirmExtend}
        onCancel={() => setExtendModalOpen(false)}
        loading={actionLoading}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">License Key:</span>
              <span className="font-mono font-bold text-indigo-300">{selectedLicense?.licenseKey}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Customer:</span>
              <span className="font-semibold text-white">{selectedLicense?.customerName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Expiry:</span>
              <span className="font-mono text-amber-400">{formatDate(selectedLicense?.expiryDate)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Additional Days to Add:</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {['3', '7', '14', '30'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setExtendDays(d)}
                  className={`py-1.5 rounded-lg text-xs font-medium border ${
                    extendDays === d ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  +{d} Days
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="3650"
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Extension Reason / Notes:</label>
            <input
              type="text"
              value={extendNotes}
              onChange={(e) => setExtendNotes(e.target.value)}
              placeholder="e.g. Paid renewal for another month"
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
            />
          </div>
        </div>
      </ConfirmationModal>

      {/* Cancel License Modal */}
      <ConfirmationModal
        isOpen={cancelModalOpen}
        title="Cancel Software License"
        description="The license will be locked and cannot be used or reassigned."
        type="danger"
        confirmText="Cancel License"
        cancelText="Keep License"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelModalOpen(false)}
        loading={actionLoading}
      >
        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">License Key:</span>
              <span className="font-mono text-rose-400 font-bold">{selectedLicense?.licenseKey}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Customer:</span>
              <span className="text-white font-medium">{selectedLicense?.customerName || 'N/A'}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                Safety Rule: Cancelled licenses are marked in history and will NOT automatically return to Available inventory to prevent accidental reuse.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Cancellation Reason:</label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Refund issued / Customer requested cancellation"
              required
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
            />
          </div>
        </div>
      </ConfirmationModal>
    </div>
  );
};
