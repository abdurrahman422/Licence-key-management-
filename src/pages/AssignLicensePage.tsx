import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
  KeyRound,
  Calendar,
  Clock,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRight,
  ShieldCheck,
  Image as ImageIcon,
  Check,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api, copyToClipboard } from '../services/api';
import { formatDate } from '../utils/date';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ProofLightbox } from '../components/ProofLightbox';

interface AssignLicensePageProps {
  onSuccess: (customerId?: number) => void;
  onNavigate: (tab: string, customerId?: number) => void;
}

export const AssignLicensePage: React.FC<AssignLicensePageProps> = ({ onSuccess, onNavigate }) => {
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [telegramUserId, setTelegramUserId] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Payment Proof State
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [proofData, setProofData] = useState<{ proofPath: string; originalName: string; mimeType: string } | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Duration State
  const [selectedPreset, setSelectedPreset] = useState<number>(7);
  const [customDays, setCustomDays] = useState<string>('');
  const [startDateTime, setStartDateTime] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });

  // Inventory Candidate State
  const [candidate, setCandidate] = useState<{ available: boolean; licenseId: number; licenseKey: string; importedAt: string } | null>(null);
  const [checkingInventory, setCheckingInventory] = useState(true);
  const [noAvailableLicenses, setNoAvailableLicenses] = useState(false);

  // Workflow State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignedResult, setAssignedResult] = useState<{
    licenseKey: string;
    startDate: string;
    expiryDate: string;
    durationDays: number;
    customerName: string;
    telegramUsername: string;
    phone: string;
    clipboardSummary: string;
    customerId?: number;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check available candidate on mount
  const checkInventory = async () => {
    try {
      setCheckingInventory(true);
      const res = await api.previewCandidate();
      setCandidate(res);
      setNoAvailableLicenses(false);
    } catch (e: any) {
      setCandidate(null);
      setNoAvailableLicenses(true);
    } finally {
      setCheckingInventory(false);
    }
  };

  useEffect(() => {
    checkInventory();
  }, []);

  // Calculate active duration in days
  const effectiveDays = selectedPreset === -1 ? (parseInt(customDays, 10) || 0) : selectedPreset;

  // Calculate Expiry Date based on Start Date + Effective Days
  const calculatedStartDate = new Date(startDateTime || Date.now());
  const calculatedExpiryDate = new Date(calculatedStartDate.getTime() + effectiveDays * 24 * 60 * 60 * 1000);

  const formatDisplayDt = (d: Date) => {
    if (isNaN(d.getTime())) return '—';
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setProofFile(file);

    // Create local object preview
    const objectUrl = URL.createObjectURL(file);
    setProofPreviewUrl(objectUrl);

    try {
      setUploadingProof(true);
      const uploaded = await api.uploadProof(file);
      setProofData({
        proofPath: uploaded.proofPath,
        originalName: uploaded.originalName,
        mimeType: uploaded.mimeType
      });
      setFormError(null);
    } catch (err: any) {
      setFormError(`Failed to save payment proof: ${err.message}`);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleValidateAndOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim()) {
      setFormError('Customer Name is required.');
      return;
    }
    if (!telegramUsername.trim()) {
      setFormError('Telegram Username is required.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Phone Number is required.');
      return;
    }
    if (!proofData?.proofPath) {
      setFormError('Payment Proof upload is required before assigning a license.');
      return;
    }
    if (effectiveDays <= 0) {
      setFormError('Please select or specify a valid license duration in days.');
      return;
    }
    if (noAvailableLicenses || !candidate) {
      setFormError('NO LICENSE AVAILABLE. Cannot proceed with assignment.');
      return;
    }

    setConfirmModalOpen(true);
  };

  const handleConfirmAssignment = async () => {
    try {
      setSubmitting(true);
      setFormError(null);

      // Ensure telegram starts with @ if missing
      const formattedTelegram = telegramUsername.trim().startsWith('@')
        ? telegramUsername.trim()
        : `@${telegramUsername.trim()}`;

      const res = await api.assignLicense({
        customerName: customerName.trim(),
        telegramUsername: formattedTelegram,
        phone: phone.trim(),
        telegramUserId: telegramUserId ? telegramUserId.trim() : undefined,
        email: email ? email.trim() : undefined,
        address: address ? address.trim() : undefined,
        customerNotes: customerNotes ? customerNotes.trim() : undefined,
        paymentProofPath: proofData!.proofPath,
        paymentProofOriginalName: proofData!.originalName,
        paymentProofMimeType: proofData!.mimeType,
        paymentAmount: paymentAmount ? parseFloat(paymentAmount) : undefined,
        paymentNotes: paymentNotes ? paymentNotes.trim() : undefined,
        durationDays: effectiveDays,
        customStartDate: calculatedStartDate.toISOString()
      });

      // Launch celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      setAssignedResult({
        licenseKey: res.license.licenseKey,
        startDate: res.license.startDate,
        expiryDate: res.license.expiryDate,
        durationDays: res.license.durationDays,
        customerName: res.customer.name,
        telegramUsername: res.customer.telegramUsername,
        phone: res.customer.phone,
        clipboardSummary: res.clipboardSummary
      });

      setConfirmModalOpen(false);
      onSuccess();
    } catch (err: any) {
      setConfirmModalOpen(false);
      setFormError(err.message || 'Failed to assign license. Transaction was rolled back.');
      checkInventory();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyKey = async () => {
    if (!assignedResult) return;
    await copyToClipboard(assignedResult.licenseKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopySummary = async () => {
    if (!assignedResult) return;
    await copyToClipboard(assignedResult.clipboardSummary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleResetForNewCustomer = () => {
    setCustomerName('');
    setTelegramUsername('');
    setPhone('');
    setTelegramUserId('');
    setEmail('');
    setAddress('');
    setCustomerNotes('');
    setProofFile(null);
    setProofPreviewUrl(null);
    setProofData(null);
    setPaymentAmount('');
    setPaymentNotes('');
    setAssignedResult(null);
    setFormError(null);
    checkInventory();
  };

  // SUCCESS VIEW: Render large copy buttons & summary after successful assignment
  if (assignedResult) {
    return (
      <div className="max-w-2xl mx-auto py-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">License Successfully Assigned!</h3>
            <p className="text-xs text-slate-400">
              1 license key from FIFO inventory was locked and assigned to the customer.
            </p>
          </div>

          {/* Large License Key Display Box */}
          <div className="p-5 rounded-xl bg-slate-950 border border-indigo-900/40 text-center space-y-3">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">Assigned License Key</span>
            <div className="font-mono text-lg sm:text-xl font-bold text-white select-all break-all px-2">
              {assignedResult.licenseKey}
            </div>

            <button
              id="copy-assigned-license-btn"
              onClick={handleCopyKey}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/25 transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              {copiedKey ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>COPIED TO CLIPBOARD!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>COPY LICENSE KEY</span>
                </>
              )}
            </button>
          </div>

          {/* Customer Summary Card */}
          <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-semibold text-slate-300">Customer Details & Expiration</span>
              <span className="text-[11px] text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                Active ({assignedResult.durationDays} Days)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-300">
              <div>
                <span className="text-slate-500 block">Customer Name:</span>
                <span className="font-medium text-white">{assignedResult.customerName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Telegram:</span>
                <span className="font-mono text-indigo-300">{assignedResult.telegramUsername}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Phone:</span>
                <span className="font-mono text-white">{assignedResult.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Duration:</span>
                <span className="font-medium text-white">{assignedResult.durationDays} Days</span>
              </div>
              <div>
                <span className="text-slate-500 block">Start Date:</span>
                <span className="font-mono">{formatDate(assignedResult.startDate)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Expiry Date:</span>
                <span className="font-mono text-amber-300 font-semibold">{formatDate(assignedResult.expiryDate)}</span>
              </div>
            </div>

            {/* Formatted Clipboard Text Preview */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <span className="text-slate-500 block mb-1.5 font-medium">Ready-to-send Telegram message:</span>
              <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap select-all">
                {assignedResult.clipboardSummary}
              </pre>
            </div>

            <button
              id="copy-summary-btn"
              onClick={handleCopySummary}
              className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition flex items-center justify-center space-x-2"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Summary Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Customer License Information</span>
                </>
              )}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleResetForNewCustomer}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center space-x-2"
            >
              <span>Assign Another Customer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const durationPresets = [
    { label: '1 Day', days: 1 },
    { label: '3 Days', days: 3 },
    { label: '7 Days', days: 7 },
    { label: '14 Days', days: 14 },
    { label: '30 Days', days: 30 },
    { label: '60 Days', days: 60 },
    { label: '90 Days', days: 90 },
    { label: '180 Days', days: 180 },
    { label: '365 Days', days: 365 },
    { label: 'Custom', days: -1 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner Alert if 0 Licenses */}
      {noAvailableLicenses && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <strong className="font-bold text-white">NO LICENSE AVAILABLE:</strong> All inventory keys are currently assigned, expired, or none have been imported.
            </div>
          </div>
          <button
            onClick={() => onNavigate('import')}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs whitespace-nowrap transition"
          >
            Import Keys First
          </button>
        </div>
      )}

      {formError && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleValidateAndOpenConfirm} className="space-y-6">
        {/* Section 1: Customer Information */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-indigo-600/15 text-indigo-400">
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Step 1: Customer Registration</h3>
            </div>
            <span className="text-xs text-slate-500">* Required fields</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Customer Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="customer-name-input"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. John Doe"
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-100 placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Telegram Username <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">@</span>
                <input
                  id="customer-telegram-input"
                  type="text"
                  value={telegramUsername.replace(/^@/, '')}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  placeholder="username"
                  required
                  className="w-full pl-7 pr-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-100 placeholder-slate-600 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Phone Number <span className="text-rose-400">*</span>
              </label>
              <input
                id="customer-phone-input"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1234567890"
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-100 placeholder-slate-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Telegram User ID (Optional)</label>
              <input
                type="text"
                value={telegramUserId}
                onChange={(e) => setTelegramUserId(e.target.value)}
                placeholder="e.g. 123456789"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-100 placeholder-slate-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-100 placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Address / Country (Optional)</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. United States"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-100 placeholder-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Customer Notes (Optional)</label>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Any special customer requests or referral notes..."
              rows={2}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-100 placeholder-slate-600 resize-none"
            />
          </div>
        </div>

        {/* Section 2: Payment Proof Upload */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-emerald-600/15 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Step 2: Payment Verification & Proof</h3>
            </div>
            <span className="text-xs text-emerald-400 font-medium flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Stored securely in local data folder</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Upload Box */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Upload Payment Proof (PNG, JPG, WEBP, PDF) <span className="text-rose-400">*</span>
              </label>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
                  proofData
                    ? 'border-emerald-500/40 bg-emerald-950/10'
                    : 'border-slate-700 hover:border-indigo-500 bg-slate-950/60 hover:bg-slate-950'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                />

                <div className="flex flex-col items-center space-y-2">
                  <div className="p-3 rounded-full bg-slate-800 text-slate-400">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-slate-200">
                    {uploadingProof ? 'Uploading & saving proof...' : 'Click to select or drag & drop proof'}
                  </span>
                  <span className="text-[11px] text-slate-500">Supports PNG, JPG, JPEG, WEBP, PDF up to 15MB</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Amount (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 50.00"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Payment Reference/Notes</label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Tx Hash / Bank ref"
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Proof Preview Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 min-h-[180px] flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300">Proof Preview</span>
                {proofData && (
                  <span className="text-[11px] text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    Verified Ready
                  </span>
                )}
              </div>

              {proofPreviewUrl ? (
                <div className="my-2 flex flex-col items-center justify-center space-y-2">
                  <div
                    onClick={() => setLightboxOpen(true)}
                    className="relative group cursor-pointer max-h-36 overflow-hidden rounded-lg border border-slate-700"
                  >
                    <img
                      src={proofPreviewUrl}
                      alt="Proof"
                      className="max-h-36 object-contain rounded-lg group-hover:opacity-90 transition"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-xs font-medium text-white">
                      Click to Enlarge
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                    {proofData?.originalName || proofFile?.name}
                  </span>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-slate-600 text-xs">
                  <ImageIcon className="w-8 h-8 mb-1.5 opacity-40" />
                  <span>No payment proof attached yet</span>
                </div>
              )}

              <div className="text-[11px] text-slate-500 text-center">
                System requires proof verification before committing the license key.
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: License Duration & Expiry Calculation */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-blue-600/15 text-blue-400">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Step 3: License Duration & Automatic Expiry</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Local System Time</span>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-medium text-slate-300">Select Duration Preset:</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {durationPresets.map((preset) => {
                const isSelected = selectedPreset === preset.days;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setSelectedPreset(preset.days)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {selectedPreset === -1 && (
              <div className="pt-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Custom Duration (Days):</label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="Enter number of days (e.g. 45)"
                  className="w-full sm:w-64 px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-slate-100"
                />
              </div>
            )}
          </div>

          {/* Start and Calculated Expiry Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">License Start Date & Time:</label>
              <input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-slate-100 font-mono"
              />
            </div>

            <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-800/40 flex flex-col justify-between">
              <span className="text-xs text-indigo-300 font-medium">Calculated Expiration Date & Time:</span>
              <div className="font-mono text-sm font-bold text-white mt-1">
                {formatDisplayDt(calculatedExpiryDate)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1">
                Exactly +{effectiveDays} days ({effectiveDays * 24} hours) from start
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: FIFO License Check & Confirmation Button */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-amber-600/15 text-amber-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Step 4: Automated FIFO License Selection</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">1 Key per Customer</span>
          </div>

          {candidate ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-xs font-semibold text-emerald-400">Next FIFO Available Key in Queue</span>
                </div>
                <div className="font-mono text-xs text-slate-200 font-bold tracking-wider">
                  {candidate.licenseKey}
                </div>
                <span className="text-[11px] text-slate-500 block">
                  Imported on: {formatDate(candidate.importedAt)}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
                Protected by SQLite Transaction
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/30 text-rose-300 text-xs">
              No license keys available in inventory. Please import license keys before assigning.
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end">
            <button
              id="submit-assign-license-btn"
              type="submit"
              disabled={noAvailableLicenses || checkingInventory || !proofData}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 transition flex items-center space-x-2 cursor-pointer"
            >
              <span>Assign License to Customer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModalOpen}
        title="Confirm License Assignment"
        description="Verify the customer details and license assignment before finalizing."
        type="primary"
        confirmText="Confirm Assignment"
        cancelText="Cancel"
        onConfirm={handleConfirmAssignment}
        onCancel={() => setConfirmModalOpen(false)}
        loading={submitting}
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Customer:</span>
              <span className="font-semibold text-white">{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Telegram:</span>
              <span className="font-mono text-indigo-300">{telegramUsername.startsWith('@') ? telegramUsername : '@' + telegramUsername}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Phone:</span>
              <span className="font-mono text-white">{phone}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-400">License Key (FIFO):</span>
              <span className="font-mono font-bold text-emerald-400">{candidate?.licenseKey}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Start Date & Time:</span>
              <span className="font-mono text-slate-300">{formatDisplayDt(calculatedStartDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Expiry Date & Time:</span>
              <span className="font-mono text-amber-300 font-semibold">{formatDisplayDt(calculatedExpiryDate)}</span>
            </div>
          </div>

          {proofPreviewUrl && (
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
              <img src={proofPreviewUrl} alt="Proof" className="w-12 h-12 object-contain rounded bg-slate-900 border border-slate-700" />
              <div>
                <span className="text-slate-300 font-medium block">Payment Proof Verified</span>
                <span className="text-[11px] text-slate-500 font-mono">{proofData?.originalName}</span>
              </div>
            </div>
          )}
        </div>
      </ConfirmationModal>

      {/* Lightbox Modal */}
      <ProofLightbox
        isOpen={lightboxOpen}
        imageUrl={proofPreviewUrl}
        title={`Payment Proof - ${customerName || 'Customer'}`}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};
