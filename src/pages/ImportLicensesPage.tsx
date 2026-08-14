import React, { useState, useRef } from 'react';
import {
  FileDown,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileCode,
  Clipboard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Info,
  Check
} from 'lucide-react';
import { api } from '../services/api';
import { ImportPreviewResult } from '../types';

interface ImportLicensesPageProps {
  onSuccess: () => void;
  onNavigate: (tab: string) => void;
}

export const ImportLicensesPage: React.FC<ImportLicensesPageProps> = ({ onSuccess, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'txt' | 'csv' | 'json'>('paste');
  const [textContent, setTextContent] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setTextContent(content);
      handleAnalyzeContent(content);
    };
    reader.readAsText(file);
  };

  const handleAnalyzeContent = async (contentToAnalyze: string) => {
    if (!contentToAnalyze.trim()) {
      setPreviewResult(null);
      return;
    }

    try {
      setAnalyzing(true);
      setErrorMessage(null);
      const res = await api.previewImport(contentToAnalyze, activeTab);
      setPreviewResult(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse license content.');
      setPreviewResult(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewResult || previewResult.newKeys === 0) return;

    try {
      setImporting(true);
      setErrorMessage(null);
      const res = await api.importLicenses(previewResult.newKeyList, batchNotes);
      setImportSuccessMessage(res.message);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import licenses.');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setTextContent('');
    setBatchNotes('');
    setPreviewResult(null);
    setImportSuccessMessage(null);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Info */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/15 text-indigo-400">
            <FileDown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Import Legitimate License Keys</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Add your pre-generated license keys into SQLite inventory. The original key format is 100% preserved.
            </p>
          </div>
        </div>
      </div>

      {importSuccessMessage && (
        <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-slate-100 space-y-4">
          <div className="flex items-center space-x-3 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
            <h4 className="text-sm font-semibold text-white">{importSuccessMessage}</h4>
          </div>
          <p className="text-xs text-slate-300">
            These keys are now marked as <strong>AVAILABLE</strong> in your local database and will be assigned in FIFO order to incoming customer orders.
          </p>
          <div className="flex items-center space-x-3 pt-2">
            <button
              onClick={() => onNavigate('licenses')}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
            >
              View Inventory Table
            </button>
            <button
              onClick={() => onNavigate('assign')}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              Assign to Customer
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Import More Keys
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!importSuccessMessage && (
        <div className="space-y-6">
          {/* Method Selection Tabs */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Select Import Method</span>
              <span className="text-[11px] text-slate-500">Supports TXT, CSV, JSON, and Clipboard</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('paste');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className={`p-3 rounded-xl border flex flex-col items-center space-y-1.5 transition text-xs font-medium ${
                  activeTab === 'paste'
                    ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Clipboard className="w-5 h-5" />
                <span>Paste Keys / Text</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('txt');
                  fileInputRef.current?.click();
                }}
                className={`p-3 rounded-xl border flex flex-col items-center space-y-1.5 transition text-xs font-medium ${
                  activeTab === 'txt'
                    ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>Upload TXT File</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('csv');
                  fileInputRef.current?.click();
                }}
                className={`p-3 rounded-xl border flex flex-col items-center space-y-1.5 transition text-xs font-medium ${
                  activeTab === 'csv'
                    ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>Upload CSV File</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('json');
                  fileInputRef.current?.click();
                }}
                className={`p-3 rounded-xl border flex flex-col items-center space-y-1.5 transition text-xs font-medium ${
                  activeTab === 'json'
                    ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <FileCode className="w-5 h-5" />
                <span>Upload JSON File</span>
              </button>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.csv,.json"
              className="hidden"
            />

            {/* Input Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">
                  License Keys Input (one per line, CSV, or JSON array)
                </label>
                {textContent && (
                  <button
                    onClick={() => {
                      setTextContent('');
                      setPreviewResult(null);
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    Clear Input
                  </button>
                )}
              </div>

              <textarea
                id="license-import-textarea"
                value={textContent}
                onChange={(e) => {
                  setTextContent(e.target.value);
                  handleAnalyzeContent(e.target.value);
                }}
                placeholder={`Example input:
PB-WNBDVDCCMFBTHVB9F4ENCANB4SNY6XLPBOBCA1TKZSW
PB-ABC123XYZ-987654321
PB-PREMIUM-XYZ999-KEY01`}
                rows={7}
                className="w-full p-4 text-xs font-mono rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-100 placeholder-slate-600 resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Batch Notes (Optional)</label>
              <input
                type="text"
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
                placeholder="e.g. Batch #14 - August Software Batch"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 outline-none text-slate-100 placeholder-slate-600"
              />
            </div>
          </div>

          {/* Import Preview Breakdown */}
          {previewResult && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-sm font-semibold text-white">Import Preview & Validation</h4>
                <span className="text-xs text-slate-400 font-mono">Found {previewResult.totalFound} Keys</span>
              </div>

              {/* Counts Badge Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block uppercase font-medium">Total Found</span>
                  <span className="text-xl font-bold text-white mt-1 block">{previewResult.totalFound}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/30">
                  <span className="text-[11px] text-emerald-400 block uppercase font-medium">New Valid Keys</span>
                  <span className="text-xl font-bold text-emerald-400 mt-1 block">{previewResult.newKeys}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/30">
                  <span className="text-[11px] text-amber-400 block uppercase font-medium">Duplicates Filtered</span>
                  <span className="text-xl font-bold text-amber-400 mt-1 block">{previewResult.duplicateKeys}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block uppercase font-medium">Invalid / Empty</span>
                  <span className="text-xl font-bold text-slate-400 mt-1 block">{previewResult.invalidKeys}</span>
                </div>
              </div>

              {/* Sample New Keys Preview */}
              {previewResult.newKeys > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-300 block">
                    Sample New Keys to be Added to Inventory:
                  </span>
                  <div className="max-h-36 overflow-y-auto p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    {previewResult.newKeyList.slice(0, 10).map((k, idx) => (
                      <div key={idx} className="font-mono text-xs text-indigo-300 flex items-center space-x-2">
                        <span className="text-slate-600 text-[10px] w-6">{idx + 1}.</span>
                        <span>{k}</span>
                      </div>
                    ))}
                    {previewResult.newKeys > 10 && (
                      <div className="text-[11px] text-slate-500 font-mono pt-1">
                        ...and {previewResult.newKeys - 10} more valid keys
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Duplicate warnings */}
              {previewResult.duplicateKeys > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center space-x-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {previewResult.duplicateKeys} duplicate keys already exist in the database or were repeated in your input. Duplicates will be safely ignored.
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  id="confirm-import-btn"
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={importing || previewResult.newKeys === 0}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition flex items-center space-x-2 cursor-pointer"
                >
                  <span>{importing ? 'Saving to Database...' : `Import ${previewResult.newKeys} New Keys`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
