// src/pages/ImportPage.jsx
// Phase 3: Unified 3-tab Import page
// Tab 1: Bank Statement (CSV / QIF) with preview before commit
// Tab 2: Receipt / Invoice Capture (reuses OCR pipeline)
// Tab 3: Bulk Upload (multi-file queue)

import React, { useState, useRef, useCallback, useEffect } from 'react';
import api from '../services/api';

const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/* ─── Shared helpers ─────────────────────────────────────────────── */
function formatAmt(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return '$0.00';
  return (n < 0 ? '-' : '+') + '$' + Math.abs(n).toFixed(2);
}

function DropZone({ accept, label, sublabel, icon, onFile, disabled, small }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200
        ${small ? 'h-36' : 'h-52'}
        ${drag ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 dark:border-white/15 bg-white dark:bg-white/3 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-indigo-500/5'}
        ${disabled ? 'pointer-events-none opacity-50' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = ''; }}
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-600/20 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-slate-900 dark:text-white font-semibold text-sm">
            {label} <span className="text-indigo-600 dark:text-indigo-400">or browse</span>
          </p>
          {sublabel && <p className="text-slate-500 text-xs mt-0.5">{sublabel}</p>}
        </div>
      </div>
    </label>
  );
}

/* ─── Tab 1: Bank Statement Import ──────────────────────────────── */
function BankImportTab({ properties }) {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState(null);
  const [preview, setPreview] = useState(null);    // { rows, column_map, message }
  const [importing, setImporting] = useState(false);
  const [stage, setStage] = useState('drop');       // drop | parsing | preview | committing | done | error
  const [propertyId, setPropertyId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data } = await api.get('/backend/api/accounts/index.php');
      if (data.success) setAccounts(data.data);
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccountName.trim()) return;
    try {
      const { data } = await api.post('/backend/api/accounts/create.php', { name: newAccountName });
      if (data.success) {
        setAccounts(prev => [...prev, data.data]);
        setAccountId(data.data.id);
        setShowAddAccount(false);
        setNewAccountName('');
      } else {
        alert(data.error || 'Failed to create account');
      }
    } catch (err) {
      alert('Network error while creating account');
    }
  };

  const reset = () => {
    setFile(null); setFormat(null); setPreview(null);
    setStage('drop'); setResult(null); setError(null);
  };

  const handleFile = async (f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv', 'qif'].includes(ext)) {
      setError(`Unsupported format ".${ext}". Please upload a CSV or QIF file.`);
      setStage('error');
      return;
    }
    setFile(f);
    setFormat(ext.toUpperCase());
    setError(null);
    setStage('parsing');

    const fd = new FormData();
    fd.append('file', f);
    fd.append('action', 'preview');

    try {
      const { data } = await api.post('/backend/api/transactions/import.php', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        setPreview(data);
        setStage('preview');
      } else {
        setError(data.error || 'Parse failed.');
        setStage('error');
      }
    } catch {
      setError('Network error — is the backend running?');
      setStage('error');
    }
  };

  const handleCommit = async () => {
    if (!file) return;
    setStage('committing');
    setImporting(true);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('action', 'commit');
    if (propertyId) fd.append('property_id', propertyId);
    if (accountId) fd.append('account_id', accountId);

    try {
      const { data } = await api.post('/backend/api/transactions/import.php', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.success) {
        setResult(data);
        setStage('done');
      } else {
        setError(data.error || 'Import failed.');
        setStage('error');
      }
    } catch {
      setError('Network error — is the backend running?');
      setStage('error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Drop zone */}
      {stage === 'drop' && (
        <>
          <DropZone
            accept=".csv,.qif"
            label="Drop your bank statement here"
            sublabel="Supports CSV and QIF formats from all major banks"
            icon={
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            onFile={handleFile}
          />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/8 rounded-xl p-4">
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">📄 CSV Format</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Auto-detects Date, Description, Amount columns. Works with Chase, BoA, Wells Fargo, Capital One, etc.</p>
            </div>
            <div className="bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/8 rounded-xl p-4">
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">📑 QIF Format</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Quicken Interchange Format. Exported from QuickBooks, Mint, or your bank's desktop export.</p>
            </div>
          </div>
        </>
      )}

      {/* Parsing indicator */}
      {stage === 'parsing' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Parsing {format} file…</p>
        </div>
      )}

      {/* Preview stage */}
      {stage === 'preview' && preview && (
        <div className="space-y-5">
          {/* File info */}
          <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {format}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{file?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {preview.column_map ? `Columns: ${preview.column_map.date_col} · ${preview.column_map.desc_col} · ${preview.column_map.amount_col}` : preview.message}
              </p>
            </div>
            <button onClick={reset} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold transition-colors">
              Change
            </button>
          </div>

          {/* Property & Account assignment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Assign to Property <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                value={propertyId}
                onChange={e => setPropertyId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
              >
                <option value="">— No property (assign later) —</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Select Account <span className="text-red-500">*</span>
                </label>
                <button 
                  onClick={() => setShowAddAccount(!showAddAccount)}
                  className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline"
                >
                  {showAddAccount ? 'Cancel' : '+ New Account'}
                </button>
              </div>
              
              {!showAddAccount ? (
                <select
                  value={accountId}
                  onChange={e => setAccountId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                  required
                >
                  <option value="">— Select source account —</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} {a.last_4 ? `(****${a.last_4})` : ''}</option>)}
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Chase Business"
                    className="flex-1 px-4 py-2.5 bg-white dark:bg-white/5 border border-indigo-200 dark:border-indigo-500/30 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newAccountName}
                    onChange={e => setNewAccountName(e.target.value)}
                    autoFocus
                  />
                  <button 
                    onClick={handleAddAccount}
                    className="px-3 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Preview table */}
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Preview — first {preview.rows.length} rows
            </p>
            <div className="overflow-auto rounded-xl border border-slate-200 dark:border-white/8">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="bg-white dark:bg-slate-900">
                      <td className="px-4 py-2.5 text-slate-400 dark:text-slate-600 text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-mono text-xs whitespace-nowrap">{row.date}</td>
                      <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={row.description}>{row.description}</td>
                      <td className={`px-4 py-2.5 text-right font-bold tabular-nums text-xs whitespace-nowrap ${row.amount < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {formatAmt(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
              Showing up to 10 preview rows — full file will be imported when you confirm.
            </p>
          </div>

          {/* Confirm / Cancel */}
          <div className="flex gap-3">
            <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button
              onClick={handleCommit}
              disabled={importing || !accountId}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md transition-all disabled:opacity-60"
            >
              {importing ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Importing…</>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Confirm Import
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Committing */}
      {stage === 'committing' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 dark:text-slate-400 font-medium">Importing transactions…</p>
        </div>
      )}

      {/* Done */}
      {stage === 'done' && result && (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900 dark:text-white mb-1">{result.message}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {result.imported} transactions imported
              {result.skipped > 0 ? `, ${result.skipped} skipped` : ''}
            </p>
          </div>
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md transition-all"
          >
            Import Another File
          </button>
        </div>
      )}

      {/* Error */}
      {stage === 'error' && (
        <div className="flex flex-col items-center gap-4 py-10">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-slate-900 dark:text-white mb-1">Import Failed</p>
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          </div>
          <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Tab 2: Receipt / Invoice Capture ──────────────────────────── */
function ReceiptCaptureTab({ properties }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);
  const [propertyId, setPropertyId] = useState('');

  const reset = () => {
    setFile(null); setPreview(null); setResult(null);
    setMatches([]); setError(null);
  };

  const handleFile = (f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'gif', 'pdf'].includes(ext)) {
      setError(`Files of type ".${ext}" are not supported. Please use JPG, PNG or PDF.`);
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
    setMatches([]);
    if (ext !== 'pdf') {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview('pdf');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append('image', file);

    try {
      const { data } = await api.post('/backend/api/upload.php', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        setResult(data.data);
        if (data.matches?.length > 0) {
          setMatches(data.matches.map(m => ({ ...m, receipt_path: data.data?.image_path })));
        }
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch {
      setError('Network error — is the backend running?');
    } finally {
      setUploading(false);
    }
  };

  const handleLink = async (txId, receiptPath) => {
    try {
      const { data } = await api.post('/backend/api/link_receipt.php', {
        transaction_id: txId,
        receipt_path: receiptPath,
      });
      if (data.success) {
        setMatches([]);
        setResult(prev => ({ ...prev, linked: true }));
      }
    } catch {
      alert('Linking failed due to network error');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {!file ? (
        <DropZone
          accept="image/*,.pdf"
          label="Drop a receipt or invoice"
          sublabel="JPG, PNG, or PDF — AI will extract merchant, date, and amount"
          icon={
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          onFile={handleFile}
        />
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="relative bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-white/8" style={{ minHeight: 200, maxHeight: 340 }}>
            {preview === 'pdf' ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs">PDF Document</span>
              </div>
            ) : (
              <img src={preview} alt="Preview" className="w-full h-full object-contain max-h-80" />
            )}
          </div>

          {/* Property picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Assign to Property <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <select
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="">— No property —</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Actions */}
          {!result && (
            <div className="flex gap-3">
              <button onClick={reset} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                Change File
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md transition-all disabled:opacity-60"
              >
                {uploading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing with AI…</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                    Run AI OCR
                  </>
                )}
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl space-y-3">
              <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">✓ Receipt Processed</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 mb-0.5">Merchant</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{result.merchant_name || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 mb-0.5">Date</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{result.date || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 mb-0.5">Total</p>
                  <p className="font-semibold text-slate-900 dark:text-white">${result.total || '0.00'}</p>
                </div>
              </div>
              {result.linked && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">✓ Linked to bank transaction</p>
              )}
              <button onClick={reset} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                Process another receipt →
              </button>
            </div>
          )}

          {/* Matches */}
          {matches.length > 0 && (
            <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl">
              <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-3">
                {matches.length} Potential Bank Match{matches.length > 1 ? 'es' : ''}
              </p>
              <div className="space-y-2">
                {matches.map(m => (
                  <div key={m.id} className="flex items-center justify-between bg-white dark:bg-white/5 border border-indigo-200 dark:border-indigo-500/20 rounded-lg px-3 py-2 gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{m.transaction_date}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{m.description}</p>
                      <p className={`text-xs font-bold tabular-nums ${parseFloat(m.amount) < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {formatAmt(m.amount)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleLink(m.id, m.receipt_path)}
                      className="flex-shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
                    >
                      Link
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Tab 3: Bulk Upload ─────────────────────────────────────────── */
function BulkUploadTab({ properties }) {
  const [queue, setQueue] = useState([]);   // { id, file, status, result, error }
  const [running, setRunning] = useState(false);
  const [propertyId, setPropertyId] = useState('');
  const inputRef = useRef();
  const counter = useRef(0);

  const addFiles = useCallback((files) => {
    const newItems = Array.from(files)
      .filter(f => /\.(jpg|jpeg|png|gif|pdf)$/i.test(f.name))
      .map(f => ({ id: ++counter.current, file: f, status: 'queued', result: null, error: null }));
    setQueue(prev => [...prev, ...newItems]);
  }, []);

  const removeItem = (id) => setQueue(prev => prev.filter(i => i.id !== id));

  const uploadOne = async (item) => {
    setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i));
    const fd = new FormData();
    fd.append('image', item.file);

    try {
      const { data } = await api.post('/backend/api/upload.php', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const success = data.success;
      setQueue(prev => prev.map(i => i.id === item.id ? {
        ...i,
        status: success ? 'done' : 'error',
        result: success ? data.data : null,
        error: success ? null : (data.message || 'Failed'),
      } : i));
    } catch {
      setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: 'Network error' } : i));
    }
  };

  const runQueue = async () => {
    const pending = queue.filter(i => i.status === 'queued');
    if (!pending.length) return;
    setRunning(true);
    for (const item of pending) {
      await uploadOne(item);
    }
    setRunning(false);
  };

  const clearDone = () => setQueue(prev => prev.filter(i => i.status !== 'done'));

  const statusIcon = (status) => {
    if (status === 'queued')    return <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 flex-shrink-0" />;
    if (status === 'uploading') return <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />;
    if (status === 'done')      return <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></div>;
    if (status === 'error')     return <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></div>;
  };

  const doneCount   = queue.filter(i => i.status === 'done').length;
  const errorCount  = queue.filter(i => i.status === 'error').length;
  const queuedCount = queue.filter(i => i.status === 'queued').length;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Drop zone */}
      <div
        className="w-full h-40 border-2 border-dashed border-slate-300 dark:border-white/15 bg-white dark:bg-white/3 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-indigo-500/5 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
      >
        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold">
          Click to add files <span className="text-slate-500 font-normal">— or drag and drop</span>
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">JPG, PNG, PDF · Multiple files allowed</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />

      {/* Property picker */}
      {queue.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Assign to Property (optional)
          </label>
          <select
            value={propertyId}
            onChange={e => setPropertyId(e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="">— No property —</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      {/* Queue */}
      {queue.length > 0 && (
        <>
          {/* Stats */}
          <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
            <span className="text-slate-500 dark:text-slate-400">{queue.length} total</span>
            {doneCount > 0   && <span className="text-emerald-600 dark:text-emerald-400">✓ {doneCount} done</span>}
            {errorCount > 0  && <span className="text-red-500 dark:text-red-400">✗ {errorCount} failed</span>}
            {queuedCount > 0 && <span className="text-amber-500">⏳ {queuedCount} pending</span>}
            {doneCount > 0 && <button onClick={clearDone} className="ml-auto text-slate-400 hover:text-slate-600 font-semibold transition-colors">Clear Done</button>}
          </div>

          <div className="space-y-2 max-h-80 overflow-auto">
            {queue.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/8 rounded-xl">
                {statusIcon(item.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.file.name}</p>
                  {item.status === 'done' && item.result && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">
                      {item.result.merchant_name || '—'} · ${item.result.total || '0.00'}
                    </p>
                  )}
                  {item.status === 'error' && (
                    <p className="text-xs text-red-500 truncate">{item.error}</p>
                  )}
                  {item.status === 'queued' && (
                    <p className="text-xs text-slate-400">Waiting…</p>
                  )}
                </div>
                {item.status === 'queued' && (
                  <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={runQueue}
              disabled={running || queuedCount === 0}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md transition-all disabled:opacity-50"
            >
              {running ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
              ) : (
                <>Start Processing {queuedCount > 0 ? `(${queuedCount})` : ''}</>
              )}
            </button>
            {!running && (
              <button onClick={() => setQueue([])} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                Clear All
              </button>
            )}
          </div>
        </>
      )}

      {queue.length === 0 && (
        <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-4">
          No files queued. Add receipts above.
        </div>
      )}
    </div>
  );
}

/* ─── Main ImportPage ────────────────────────────────────────────── */
const TABS = [
  {
    id: 'bank', label: 'Bank Statement', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M7 6h.01M7 18h.01" />
      </svg>
    ),
  },
  {
    id: 'receipt', label: 'Receipt / Invoice', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'bulk', label: 'Bulk Upload', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
];

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState('bank');
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    api.get('/backend/api/properties/index.php')
      .then(r => { if (r.data.success) setProperties(r.data.data); })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="px-6 pt-6 pb-0 border-b border-slate-200 dark:border-white/8 bg-white dark:bg-slate-900/50">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Import</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Import bank statements, capture receipts, or process documents in bulk
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'bank'    && <BankImportTab    properties={properties} />}
        {activeTab === 'receipt' && <ReceiptCaptureTab properties={properties} />}
        {activeTab === 'bulk'    && <BulkUploadTab    properties={properties} />}
      </div>
    </div>
  );
}
