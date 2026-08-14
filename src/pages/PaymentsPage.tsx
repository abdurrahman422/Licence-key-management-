import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { Payment } from '../types';
import { api } from '../services/api';
import { formatDate } from '../utils/date';
import { ProofLightbox } from '../components/ProofLightbox';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface PaymentsPageProps {
  onNavigateCustomer: (customerId: number) => void;
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({ onNavigateCustomer }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reject Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetPayment, setTargetPayment] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await api.getPayments({
        status: statusFilter,
        search: search.trim() || undefined
      });
      setPayments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [statusFilter, search]);

  const handleVerify = async (paymentId: number) => {
    try {
      await api.verifyPayment(paymentId);
      loadPayments();
    } catch (e: any) {
      alert(`Verification failed: ${e.message}`);
    }
  };

  const handleOpenReject = (payment: Payment) => {
    setTargetPayment(payment);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!targetPayment) return;
    try {
      setActionLoading(true);
      await api.rejectPayment(targetPayment.id, rejectReason);
      setRejectModalOpen(false);
      loadPayments();
    } catch (e: any) {
      alert(`Reject failed: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">Payment Proof Records</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit and inspect uploaded customer payment receipts, transaction proofs, and verification logs.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Payments' },
            { id: 'VERIFIED', label: 'Verified' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'REJECTED', label: 'Rejected' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === tab.id
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
            placeholder="Search customer, telegram, notes..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center space-y-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading Payments...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs space-y-2">
            <CreditCard className="w-8 h-8 mx-auto opacity-30 text-indigo-400" />
            <p>No payment proof records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-3 pl-2 font-medium">Proof Thumbnail</th>
                  <th className="pb-3 font-medium">Customer / Telegram</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Amount / Notes</th>
                  <th className="pb-3 font-medium">Date Uploaded</th>
                  <th className="pb-3 font-medium">Verified At</th>
                  <th className="pb-3 pr-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 pl-2">
                      <div
                        onClick={() => {
                          setSelectedProofUrl(p.proofPath);
                          setLightboxOpen(true);
                        }}
                        className="w-14 h-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center cursor-pointer hover:opacity-80 transition shadow-sm"
                      >
                        <img src={p.proofPath} alt="Proof" className="w-full h-full object-cover" />
                      </div>
                    </td>

                    <td className="py-3">
                      <div className="flex flex-col">
                        <button
                          onClick={() => onNavigateCustomer(p.customerId)}
                          className="text-white font-medium hover:text-indigo-300 text-left"
                        >
                          {p.customerName || `Customer #${p.customerId}`}
                        </button>
                        <span className="font-mono text-indigo-400 text-[11px]">{p.telegramUsername}</span>
                      </div>
                    </td>

                    <td className="py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                          p.status === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : p.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="py-3">
                      {p.amount ? <span className="font-semibold text-white">${p.amount.toFixed(2)}</span> : <span className="text-slate-500">—</span>}
                      {p.notes && <span className="text-[11px] text-slate-400 block">{p.notes}</span>}
                    </td>

                    <td className="py-3 text-slate-400 text-[11px]">{formatDate(p.createdAt)}</td>
                    <td className="py-3 text-slate-400 text-[11px]">{formatDate(p.verifiedAt)}</td>

                    <td className="py-3 pr-2 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {p.status !== 'VERIFIED' && (
                          <button
                            onClick={() => handleVerify(p.id)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 transition"
                          >
                            Verify
                          </button>
                        )}
                        {p.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleOpenReject(p)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 border border-rose-500/30 transition"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Confirmation Modal */}
      <ConfirmationModal
        isOpen={rejectModalOpen}
        title="Reject Payment Proof"
        description="Mark this payment as rejected."
        type="danger"
        confirmText="Reject Payment"
        cancelText="Cancel"
        onConfirm={handleConfirmReject}
        onCancel={() => setRejectModalOpen(false)}
        loading={actionLoading}
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Rejection Reason:</label>
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Unreadable receipt / fake transaction hash"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
            />
          </div>
        </div>
      </ConfirmationModal>

      {/* Proof Lightbox */}
      <ProofLightbox
        isOpen={lightboxOpen}
        imageUrl={selectedProofUrl}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};
