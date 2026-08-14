import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

interface PinModalProps {
  hasPin?: boolean;
  isOpen: boolean;
  onSuccess: () => void;
  onPinConfigured?: () => void;
  title?: string;
  description?: string;
}

export const PinModal: React.FC<PinModalProps> = ({
  hasPin = true,
  isOpen,
  onSuccess,
  onPinConfigured = () => {},
  title,
  description
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!hasPin) {
        // Setup initial pin
        if (pin.length < 4) {
          setError('Admin PIN/Password must be at least 4 characters.');
          setLoading(false);
          return;
        }
        if (pin !== confirmPin) {
          setError('PIN confirmation does not match.');
          setLoading(false);
          return;
        }

        await api.setupPin(pin);
        onPinConfigured();
        onSuccess();
      } else {
        // Verify PIN
        const res = await api.verifyPin(pin);
        if (res.success) {
          setPin('');
          onSuccess();
        } else {
          setError('Incorrect Admin PIN/Password.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8 text-slate-100">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-600/10">
            {hasPin ? <Lock className="w-7 h-7" /> : <KeyRound className="w-7 h-7" />}
          </div>
          <h3 className="text-xl font-semibold tracking-tight text-white">
            {title || (hasPin ? 'Admin Security Verification' : 'Welcome! Set Admin PIN')}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
            {description || (hasPin
              ? 'Enter your Admin PIN/Password to access customer and license management.'
              : 'Protect your private license inventory and customer data with an admin PIN.')}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {hasPin ? 'Admin PIN / Password' : 'Create Admin PIN / Password'}
            </label>
            <input
              id="admin-pin-input"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••••"
              autoFocus
              className="w-full px-4 py-2.5 text-center text-lg tracking-widest rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-white placeholder-slate-600"
            />
          </div>

          {!hasPin && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Admin PIN</label>
              <input
                id="admin-pin-confirm-input"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 text-center text-lg tracking-widest rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-white placeholder-slate-600"
              />
            </div>
          )}

          <button
            id="admin-pin-submit-btn"
            type="submit"
            disabled={loading || !pin}
            className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/25 transition cursor-pointer"
          >
            <span>{loading ? 'Verifying...' : hasPin ? 'Unlock Application' : 'Save PIN & Initialize'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
          <span className="text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted with bcrypt & stored locally in SQLite</span>
          </span>
        </div>
      </div>
    </div>
  );
};
