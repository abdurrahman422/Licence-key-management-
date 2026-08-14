import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  User,
  KeyRound,
  Calendar,
  Clock,
  Copy,
  Check,
  CalendarPlus,
  Ban,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  History,
  Edit2,
  FileText,
  AlertCircle
} from 'lucide-react';
import { CustomerDetailRecord } from '../types';
import { api, copyToClipboard } from '../services/api';
import { formatDate, getExpiryBadge } from '../utils/date';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ProofLightbox } from '../components/ProofLightbox';

interface CustomerDetailPageProps {
  customerId: number;
  onBack: () => void;
}

export const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({ customerId, onBack }) => {
  const [data, setData] = useState<CustomerDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  // Edit Customer Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Extend Modal State
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [extendDays, setExtendDays] = useState('7');
  const [extendNotes, setExtendNotes] = useState('');

  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadRecord = async () => {
    try {
      setLoading(true);
      const rec = await api.getCustomerDetail(customerId);
      setData(rec);
      setEditName(rec.customer.name);
      setEditTelegram(rec.customer.telegramUsername);
      setEditPhone(rec.customer.phone);
      setEditEmail(rec.customer.email || '');
      setEditAddress(rec.customer.address || '');
      setEditNotes(rec.customer.notes || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecord();
  }, [customerId]);

  const handleCopyKey = async () => {
    if (!data?.currentLicense?.licenseKey) return;
    await copyToClipboard(data.currentLicense.licenseKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopySummary = async () => {
    if (!data) return;
    const { customer, currentLicense } = data;
    const summary = `Customer: ${customer.name}
Telegram: ${customer.telegramUsername}
Phone: ${customer.phone}
License: ${currentLicense?.licenseKey || 'N/A'}
Start: ${formatDate(currentLicense?.startDate)}
Expiry: ${formatDate(currentLicense?.expiryDate)}`;

    await copyToClipboard(summary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleSaveEdit = async () => {
    try {
      setActionLoading(true);
      await api.updateCustomer(customerId, {
        name: editName,
        telegramUsername: editTelegram,
        phone: editPhone,
        email: editEmail,
        address: editAddress,
        notes: editNotes
      });
      setEditModalOpen(false);
      loadRecord();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmExtend = async () => {
    if (!data?.currentLicense) return;
    try {
      setActionLoading(true);
      await api.extendLicense({
        licenseId: data.currentLicense.id,
        additionalDays: parseInt(extendDays, 10),
        notes: extendNotes || undefined
      });
      setExtendModalOpen(false);
      loadRecord();
    } catch (err: any) {
      alert(`Extend failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!data?.currentLicense) return;
    try {
      setActionLoading(true);
      await api.cancelLicense({
        licenseId: data.currentLicense.id,
        reason: cancelReason || 'Manual cancellation'
      });
      setCancelModalOpen(false);
      loadRecord();
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading Customer Details...</span>
      </div>
    );
  }

  const { customer, currentLicense, payments, assignments, auditLogs } = data;
  const badge = getExpiryBadge(currentLicense?.expiryDate, currentLicense?.status || 'AVAILABLE');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setEditModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Customer</span>
          </button>

          <button
            onClick={handleCopySummary}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSummary ? 'Summary Copied!' : 'Copy Telegram Summary'}</span>
          </button>
        </div>
      </div>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer Profile */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
                {customer.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{customer.name}</h3>
                <span className="font-mono text-xs text-indigo-300">{customer.telegramUsername}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Phone Number:</span>
                <span className="font-mono text-white font-medium">{customer.phone}</span>
              </div>

              {customer.telegramUserId && (
                <div>
                  <span className="text-slate-500 block">Telegram User ID:</span>
                  <span className="font-mono text-slate-300">{customer.telegramUserId}</span>
                </div>
              )}

              {customer.email && (
                <div>
                  <span className="text-slate-500 block">Email:</span>
                  <span className="text-slate-300">{customer.email}</span>
                </div>
              )}

              {customer.address && (
                <div>
                  <span className="text-slate-500 block">Address / Region:</span>
                  <span className="text-slate-300">{customer.address}</span>
                </div>
              )}

              <div>
                <span className="text-slate-500 block">Registered:</span>
                <span className="text-slate-400 font-mono text-[11px]">{formatDate(customer.createdAt)}</span>
              </div>

              {customer.notes && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-500 block mb-1">Notes:</span>
                  <p className="p-2.5 rounded-lg bg-slate-950 text-slate-300">{customer.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Proofs Box */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-semibold text-white">Payment Proof Records</h4>
              </div>
              <span className="text-xs text-slate-500">{payments.length} uploaded</span>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">No payment proofs on record.</div>
            ) : (
              <div className="space-y-3">
                {payments.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        {p.amount ? `$${p.amount.toFixed(2)}` : 'Verified Proof'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          p.status === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div
                      onClick={() => {
                        setSelectedProofUrl(p.proofPath);
                        setLightboxOpen(true);
                      }}
                      className="cursor-pointer group relative rounded-lg overflow-hidden border border-slate-800 max-h-36 bg-slate-900 flex items-center justify-center"
                    >
                      <img src={p.proofPath} alt="Proof" className="max-h-36 object-contain" />
                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-white font-medium transition">
                        Click to Zoom Proof
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Uploaded {formatDate(p.createdAt)}</span>
                      <span className="font-mono">{p.proofOriginalName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Active License & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active License Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-semibold text-white">Current Active License</h4>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.colorClass}`}>
                {badge.label}
              </span>
            </div>

            {currentLicense ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-indigo-900/40 space-y-3">
                  <span className="text-[11px] text-indigo-400 font-semibold uppercase tracking-wider block">
                    License Key
                  </span>
                  <div className="font-mono text-base sm:text-lg font-bold text-white select-all break-all">
                    {currentLicense.licenseKey}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      onClick={handleCopyKey}
                      className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition flex items-center space-x-1.5"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                    </button>

                    {currentLicense.status !== 'CANCELLED' && (
                      <>
                        <button
                          onClick={() => setExtendModalOpen(true)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium transition flex items-center space-x-1.5"
                        >
                          <CalendarPlus className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Extend License</span>
                        </button>

                        <button
                          onClick={() => setCancelModalOpen(true)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 border border-rose-500/30 font-medium transition flex items-center space-x-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancel License</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Dates Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block">Start Date:</span>
                    <span className="font-mono text-white font-medium mt-0.5 block">
                      {formatDate(currentLicense.startDate)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block">Expiry Date:</span>
                    <span className="font-mono text-amber-300 font-bold mt-0.5 block">
                      {formatDate(currentLicense.expiryDate)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-500 block">Total Duration:</span>
                    <span className="font-medium text-white mt-0.5 block">
                      {currentLicense.durationDays || '7'} Days
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No active license assigned to this customer.
              </div>
            )}
          </div>

          {/* Assignments Timeline History */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-semibold text-white">License Assignment & Extension History</h4>
              </div>
              <span className="text-xs text-slate-500">{assignments.length} events</span>
            </div>

            {assignments.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">No historical assignments recorded.</div>
            ) : (
              <div className="space-y-3">
                {assignments.map((a, idx) => (
                  <div key={a.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-indigo-300">{a.licenseKey}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{formatDate(a.assignedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Duration: +{a.durationDays} Days</span>
                      <span>Expires: {formatDate(a.expiryDate)}</span>
                    </div>
                    {a.notes && <div className="text-[11px] text-slate-500">{a.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Audit Trail */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-semibold text-white">Customer Security & Audit Logs</h4>
              </div>
              <span className="text-xs text-slate-500">{auditLogs.length} entries</span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">No audit logs for this customer.</div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-white font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-800 mr-2">
                        {log.action}
                      </span>
                      <span className="text-slate-300">{log.description}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <ConfirmationModal
        isOpen={editModalOpen}
        title="Edit Customer Profile"
        description="Update customer registration details."
        type="primary"
        confirmText="Save Changes"
        cancelText="Cancel"
        onConfirm={handleSaveEdit}
        onCancel={() => setEditModalOpen(false)}
        loading={actionLoading}
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Customer Name *</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-300 mb-1">Telegram Username *</label>
            <input
              type="text"
              value={editTelegram}
              onChange={(e) => setEditTelegram(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-300 mb-1">Phone Number *</label>
            <input
              type="text"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-300 mb-1">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 resize-none"
            />
          </div>
        </div>
      </ConfirmationModal>

      {/* Extend License Modal */}
      <ConfirmationModal
        isOpen={extendModalOpen}
        title="Extend Customer License"
        description="Adds additional days to current license expiration."
        type="primary"
        confirmText="Confirm Extension"
        cancelText="Cancel"
        onConfirm={handleConfirmExtend}
        onCancel={() => setExtendModalOpen(false)}
        loading={actionLoading}
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Days to Add:</label>
            <input
              type="number"
              min="1"
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-300 mb-1">Extension Notes:</label>
            <input
              type="text"
              value={extendNotes}
              onChange={(e) => setExtendNotes(e.target.value)}
              placeholder="e.g. Paid renewal for another month"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
            />
          </div>
        </div>
      </ConfirmationModal>

      {/* Cancel License Modal */}
      <ConfirmationModal
        isOpen={cancelModalOpen}
        title="Cancel License"
        description="Permanently revoke this customer's license key."
        type="danger"
        confirmText="Confirm Cancellation"
        cancelText="Keep Active"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelModalOpen(false)}
        loading={actionLoading}
      >
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
            This key will be marked as CANCELLED and will NOT be automatically reassigned.
          </div>
          <div>
            <label className="block font-medium text-slate-300 mb-1">Reason for Cancellation:</label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Refund issued"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
            />
          </div>
        </div>
      </ConfirmationModal>

      {/* Proof Lightbox */}
      <ProofLightbox
        isOpen={lightboxOpen}
        imageUrl={selectedProofUrl}
        title={`Payment Proof - ${customer.name}`}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};
