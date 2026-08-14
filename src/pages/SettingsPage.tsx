import React, { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  KeyRound,
  Download,
  UploadCloud,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Building,
  Lock,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface SettingsPageProps {
  onSuccess: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onSuccess }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [telegramSupport, setTelegramSupport] = useState('');
  const [defaultDurationDays, setDefaultDurationDays] = useState('7');
  const [requirePinOnStartup, setRequirePinOnStartup] = useState(false);

  // PIN Change State
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);

  // Clear Database State
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Demo Dataset State
  const [seeding, setSeeding] = useState(false);

  const restoreInputRef = useRef<HTMLInputElement>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
      setBusinessName(data.business_name || 'My Software Business');
      setTelegramSupport(data.telegram_support_handle || '@Support');
      setDefaultDurationDays(data.default_duration_days || '7');
      setRequirePinOnStartup(data.require_pin_on_startup === 'true');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      await api.updateSettings({
        business_name: businessName,
        telegram_support_handle: telegramSupport,
        default_duration_days: defaultDurationDays,
        require_pin_on_startup: requirePinOnStartup ? 'true' : 'false'
      });

      setSuccessMessage('Application settings updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);

    if (newPin.length < 4) {
      setPinMessage({ type: 'error', text: 'New PIN must be at least 4 digits.' });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage({ type: 'error', text: 'New PIN and confirmation do not match.' });
      return;
    }

    try {
      await api.setPin(newPin, currentPin || undefined);
      setPinMessage({ type: 'success', text: 'Admin PIN updated successfully.' });
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      loadSettings();
    } catch (err: any) {
      setPinMessage({ type: 'error', text: err.message || 'Failed to update PIN.' });
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/backup';
  };

  const handleRestoreFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
      setRestoreModalOpen(true);
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreFile) return;
    try {
      setRestoring(true);
      await api.restoreBackup(restoreFile);
      setRestoreModalOpen(false);
      setSuccessMessage('Database successfully restored from backup.');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    } finally {
      setRestoring(false);
    }
  };

  const handleSeedDemoData = async () => {
    try {
      setSeeding(true);
      const res = await api.seedDemo();
      setSuccessMessage(res.message);
      onSuccess();
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      alert(`Demo seeding failed: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleConfirmClear = async () => {
    try {
      setClearing(true);
      await api.clearAllData();
      setClearModalOpen(false);
      setSuccessMessage('Database cleared. Clean empty state established.');
      onSuccess();
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      alert(`Clear failed: ${err.message}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center space-x-3 p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="p-2.5 rounded-xl bg-indigo-600/15 text-indigo-400">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">Application Settings & Security</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure local security policies, Admin PIN protection, and database backups.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* General Settings */}
      <form onSubmit={handleSaveGeneral} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
          <Building className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-white">Business Information & Defaults</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Business / Brand Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Telegram Support Handle</label>
            <input
              type="text"
              value={telegramSupport}
              onChange={(e) => setTelegramSupport(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Default License Duration (Days)</label>
            <input
              type="number"
              min="1"
              max="3650"
              value={defaultDurationDays}
              onChange={(e) => setDefaultDurationDays(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center space-x-2.5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={requirePinOnStartup}
                onChange={(e) => setRequirePinOnStartup(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Require Admin PIN verification on startup</span>
            </label>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save General Settings'}
          </button>
        </div>
      </form>

      {/* Admin PIN Management */}
      <form onSubmit={handleUpdatePin} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-semibold text-white">Admin Security PIN</h4>
          </div>
          <span className="text-xs text-slate-500">Bcrypt Protected</span>
        </div>

        {pinMessage && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
              pinMessage.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}
          >
            {pinMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{pinMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Current PIN {settings.admin_pin_hash ? '*' : '(None set)'}
            </label>
            <input
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              placeholder={settings.admin_pin_hash ? '••••' : 'No PIN configured'}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">New PIN *</label>
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="e.g. 1234"
              required
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Confirm New PIN *</label>
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="e.g. 1234"
              required
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:border-indigo-500 outline-none font-mono"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md shadow-amber-600/20 transition cursor-pointer"
          >
            Update Admin PIN
          </button>
        </div>
      </form>

      {/* Database Backup & Restore */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
          <Database className="w-4 h-4 text-emerald-400" />
          <h4 className="text-sm font-semibold text-white">Database Backup & Offline Persistence</h4>
        </div>

        <p className="text-xs text-slate-400">
          All data (customers, license inventory, payment proofs, and audit logs) is stored locally in SQLite (`data/license_manager.db`). You can create backups or restore from an existing database file anytime.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-semibold text-white block">Download SQLite Backup</span>
              <span className="text-[11px] text-slate-400">
                Exports a snapshot of `license_manager.db` to your local drive.
              </span>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Backup (.db)</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-semibold text-white block">Restore from Backup File</span>
              <span className="text-[11px] text-slate-400">
                Overwrites current database with a selected SQLite backup.
              </span>
            </div>
            <input
              type="file"
              ref={restoreInputRef}
              onChange={handleRestoreFileSelected}
              accept=".db,.sqlite"
              className="hidden"
            />
            <button
              onClick={() => restoreInputRef.current?.click()}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition flex items-center justify-center space-x-2"
            >
              <UploadCloud className="w-4 h-4 text-indigo-400" />
              <span>Restore from .db File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demo Data & Reset Sandbox (Useful for Verification & Setup) */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-white">Demo Dataset & Sandbox Tools</h4>
        </div>

        <p className="text-xs text-slate-400">
          Quickly populate 10 fake pre-generated license keys and sample customer records to verify all workflows, or reset to a completely fresh empty database.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleSeedDemoData}
            disabled={seeding}
            className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition flex items-center space-x-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{seeding ? 'Seeding...' : 'Load 10 Demo License Keys & Sample Data'}</span>
          </button>

          <button
            onClick={() => setClearModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 text-rose-400 border border-rose-500/30 text-xs font-semibold transition flex items-center space-x-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Data (Reset)</span>
          </button>
        </div>
      </div>

      {/* Restore Modal */}
      <ConfirmationModal
        isOpen={restoreModalOpen}
        title="Restore Database from Backup"
        description="Restoring will replace the current database with the selected backup file. Any unbacked data will be overwritten."
        type="danger"
        confirmText="Confirm Restore & Reload"
        cancelText="Cancel"
        onConfirm={handleConfirmRestore}
        onCancel={() => setRestoreModalOpen(false)}
        loading={restoring}
      >
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300">
          Selected File: {restoreFile?.name} ({(restoreFile?.size || 0) / 1024} KB)
        </div>
      </ConfirmationModal>

      {/* Clear Modal */}
      <ConfirmationModal
        isOpen={clearModalOpen}
        title="Clear All Database Records"
        description="Are you sure you want to delete all customers, licenses, payments, and audit logs? This action cannot be undone."
        type="danger"
        confirmText="Yes, Clear All Data"
        cancelText="Cancel"
        onConfirm={handleConfirmClear}
        onCancel={() => setClearModalOpen(false)}
        loading={clearing}
      />
    </div>
  );
};
