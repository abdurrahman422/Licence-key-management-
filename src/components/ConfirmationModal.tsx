import React from 'react';
import { AlertCircle, CheckCircle2, ShieldAlert, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  type?: 'primary' | 'danger' | 'warning' | 'success';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  description,
  type = 'primary',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  children,
  loading = false
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <ShieldAlert className="w-6 h-6 text-rose-400" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-emerald-400" />;
      default:
        return <CheckCircle2 className="w-6 h-6 text-indigo-400" />;
    }
  };

  const getConfirmButtonClasses = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20';
      default:
        return 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in duration-200">
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">{getIcon()}</div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
              {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">{children}</div>

        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium rounded-lg text-slate-300 hover:bg-slate-800 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-xs font-medium rounded-lg shadow-sm transition flex items-center space-x-2 ${getConfirmButtonClasses()} disabled:opacity-50`}
          >
            <span>{loading ? 'Processing...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
