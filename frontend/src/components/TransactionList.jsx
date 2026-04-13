// src/components/TransactionList.jsx
import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';

const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/* ─── Transaction Detail Drawer ─────────────────────────────────── */
function TransactionDrawer({ tx, properties, categories, onClose, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(tx.notes || '');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const saveNotes = async () => {
    if (notes === (tx.notes || '')) return;
    setSaving(true);
    await onUpdate(tx.id, { notes });
    setSaving(false);
  };

  const amount = parseFloat(tx.amount);
  const isExpense = amount < 0;
  const imageSrc = tx.receipt_path ? `${BASE_URL}/${tx.receipt_path}` : null;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 dark:border-white/8 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5 font-mono">{tx.transaction_date}</p>
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug pr-3">{tx.description}</h3>
            <p className={`text-2xl font-black tabular-nums mt-1 ${isExpense ? 'text-red-500' : 'text-emerald-500'}`}>
              {isExpense ? '-' : '+'}${Math.abs(amount).toFixed(2)}
            </p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/8 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-auto p-5 space-y-5">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isExpense ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'}`}>
              {isExpense ? 'Expense' : 'Income'}
            </span>
            {tx.receipt_id || tx.receipt_path ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400">
                ✓ Document Linked
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                ⏳ No Document
              </span>
            )}
            {tx.source && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-white/8 text-slate-500 dark:text-slate-400">
                {tx.source}
              </span>
            )}
          </div>

          {/* Property */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Property</label>
            <select
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={tx.property_id || ''}
              onChange={e => onUpdate(tx.id, { property_id: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
            <select
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={tx.category_id || ''}
              onChange={e => onUpdate(tx.id, { category_id: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Reviewed toggle */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/8">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Reviewed</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Mark this transaction as reviewed</p>
            </div>
            <button
              onClick={() => onUpdate(tx.id, { is_reviewed: tx.is_reviewed ? 0 : 1 })}
              className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${tx.is_reviewed ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${tx.is_reviewed ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea
              rows={3}
              placeholder="Add a note…"
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={saveNotes}
            />
            {saving && <p className="text-xs text-slate-400 mt-1">Saving…</p>}
          </div>

          {/* Linked Receipt */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Linked Receipt</label>
            {imageSrc ? (
              <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/8">
                <img src={imageSrc} alt="Receipt" className="w-full object-cover max-h-48"
                  onError={e => { e.target.parentElement.innerHTML = '<p class="p-4 text-sm text-slate-400 text-center">Image not found</p>'; }}
                />
                <a href={imageSrc} target="_blank" rel="noreferrer"
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-center">
                <p className="text-sm text-slate-400 dark:text-slate-500">No document attached</p>
                <p className="text-xs text-slate-400 dark:text-slate-600 mt-0.5">Upload a receipt and our matcher will link it automatically.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 dark:border-white/8 flex gap-3">
          {!deleteConfirm ? (
            <>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setDeleteConfirm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button
                onClick={() => { onDelete(tx.id); onClose(); }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all"
              >
                Confirm Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
const TransactionList = () => {
    const [transactions, setTransactions] = useState([]);
    const [properties, setProperties] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, income, expense
    const [filterProperty, setFilterProperty] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterMatched, setFilterMatched] = useState('all'); // all, matched, unmatched
    const [sortConfig, setSortConfig] = useState({ key: 'transaction_date', direction: 'desc' });
    const [selectedTx, setSelectedTx] = useState(null); // drawer

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filterProperty !== 'all') params.append('property_id', filterProperty);
            if (filterCategory !== 'all') params.append('category_id', filterCategory);

            const { data } = await api.get(`/backend/api/get_bank_transactions.php?${params.toString()}`);
            if (data.success) {
                setTransactions(data.data);
            } else {
                setError(data.error || 'Failed to fetch transactions');
            }
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetaData = async () => {
        try {
            const [propRes, catRes] = await Promise.all([
                api.get('/backend/api/properties/index.php'),
                api.get('/backend/api/categories/index.php')
            ]);
            if (propRes.data.success) setProperties(propRes.data.data);
            if (catRes.data.success) setCategories(catRes.data.data);
        } catch (err) {
            console.error('Failed to fetch metadata', err);
        }
    };

    const handleApiError = (err) => {
        if (err.response?.status === 401) {
            setError('Session expired. Please log in again.');
        } else {
            setError('Network error — is the backend running?');
        }
    };

    const handleUpdateTransaction = async (id, updates) => {
        try {
            const { data } = await api.patch('/backend/api/transactions/update.php', { id, ...updates });
            if (data.success) {
                setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
                // Keep drawer in sync
                if (selectedTx && selectedTx.id === id) {
                    setSelectedTx(prev => ({ ...prev, ...updates }));
                }
            } else {
                alert(data.error || 'Update failed');
            }
        } catch {
            alert('Update failed due to network error');
        }
    };

    const handleDelete = async (id) => {
        try {
            const { data } = await api.post('/backend/api/delete_transaction.php', { id });
            if (data.success) {
                setTransactions(transactions.filter(t => t.id !== id));
            } else {
                alert(data.message || 'Delete failed');
            }
        } catch {
            alert('Delete failed due to network error');
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to delete ALL transactions? This cannot be undone.')) return;
        try {
            const { data } = await api.post('/backend/api/delete_transaction.php', { action: 'clear_all' });
            if (data.success) {
                setTransactions([]);
            } else {
                alert(data.message || 'Clear failed');
            }
        } catch {
            alert('Clear failed due to network error');
        }
    };

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const processedTransactions = useMemo(() => {
        let data = [...transactions];

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(t => t.description?.toLowerCase().includes(lowerTerm));
        }

        if (filterType !== 'all') {
            data = data.filter(t => {
                const amount = parseFloat(t.amount);
                if (filterType === 'income') return amount > 0;
                if (filterType === 'expense') return amount < 0;
                return true;
            });
        }

        if (filterMatched !== 'all') {
            data = data.filter(t => {
                const hasDoc = !!(t.receipt_id || t.receipt_path);
                return filterMatched === 'matched' ? hasDoc : !hasDoc;
            });
        }

        if (sortConfig.key) {
            data.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                if (sortConfig.key === 'amount' || sortConfig.key === 'id') {
                    aValue = parseFloat(aValue);
                    bValue = parseFloat(bValue);
                } else if (sortConfig.key === 'transaction_date') {
                    aValue = new Date(aValue);
                    bValue = new Date(bValue);
                } else {
                    aValue = (aValue || '').toString().toLowerCase();
                    bValue = (bValue || '').toString().toLowerCase();
                }
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [transactions, searchTerm, filterType, filterMatched, sortConfig]);

    useEffect(() => { 
        fetchMetaData();
        fetchTransactions(); 
    }, [filterProperty, filterCategory]);

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <span className="ml-1 text-slate-600">↕</span>;
        return sortConfig.direction === 'asc'
            ? <span className="ml-1 text-indigo-400">↑</span>
            : <span className="ml-1 text-indigo-400">↓</span>;
    };

    const totalIncome  = processedTransactions.filter(t => parseFloat(t.amount) > 0).reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalExpense = processedTransactions.filter(t => parseFloat(t.amount) < 0).reduce((s, t) => s + parseFloat(t.amount), 0);
    const net          = totalIncome + totalExpense;
    const matchedCount = transactions.filter(t => t.receipt_id || t.receipt_path).length;

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (error) return (
        <div className="m-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-white/8 transition-colors bg-white dark:bg-slate-900/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Transactions</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                            {transactions.length} total · {matchedCount} with document
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchTransactions}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
                        >
                            Refresh
                        </button>
                        {transactions.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-red-200 dark:border-red-500/20 transition-colors"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                </div>

                {/* Summary KPIs */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-xl px-4 py-3 shadow-sm">
                        <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1 uppercase tracking-wider">Income</p>
                        <p className="text-green-700 dark:text-green-300 font-bold text-lg tabular-nums">${totalIncome.toFixed(2)}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-4 py-3 shadow-sm">
                        <p className="text-xs text-red-600 dark:text-red-400 font-semibold mb-1 uppercase tracking-wider">Expenses</p>
                        <p className="text-red-700 dark:text-red-300 font-bold text-lg tabular-nums">${Math.abs(totalExpense).toFixed(2)}</p>
                    </div>
                    <div className={`border rounded-xl px-4 py-3 shadow-sm ${net >= 0 ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' : 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20'}`}>
                        <p className={`text-xs font-semibold mb-1 uppercase tracking-wider ${net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400'}`}>Net</p>
                        <p className={`font-bold text-lg tabular-nums ${net >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-orange-700 dark:text-orange-300'}`}>{net >= 0 ? '+' : ''}${net.toFixed(2)}</p>
                    </div>
                </div>

                {/* Filters row 1 */}
                <div className="flex flex-wrap gap-3 mb-3">
                    <input
                        type="text"
                        placeholder="Search description…"
                        className="flex-1 min-w-[200px] px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    
                    <select
                        className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                        value={filterProperty}
                        onChange={(e) => setFilterProperty(e.target.value)}
                    >
                        <option value="all">All Properties</option>
                        {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    <select
                        className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    <select
                        className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="income">Income (+)</option>
                        <option value="expense">Expenses (-)</option>
                    </select>
                </div>

                {/* Matched filter pills row */}
                <div className="flex items-center gap-2">
                    {['all', 'matched', 'unmatched'].map(v => (
                        <button
                            key={v}
                            onClick={() => setFilterMatched(v)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                filterMatched === v
                                    ? v === 'matched' ? 'bg-emerald-600 text-white shadow'
                                    : v === 'unmatched' ? 'bg-amber-500 text-white shadow'
                                    : 'bg-indigo-600 text-white shadow'
                                    : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                            }`}
                        >
                            {v === 'all' ? '📋 All' : v === 'matched' ? '✓ Matched' : '⏳ Unmatched'}
                        </button>
                    ))}
                    <span className="ml-auto flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-xs font-medium whitespace-nowrap">
                        {processedTransactions.length} shown
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-200 dark:border-white/5">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none" onClick={() => requestSort('transaction_date')}>
                                Date {getSortIcon('transaction_date')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none" onClick={() => requestSort('description')}>
                                Description {getSortIcon('description')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                                Property
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none" onClick={() => requestSort('amount')}>
                                Amount {getSortIcon('amount')}
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                                Doc
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {processedTransactions.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-16 text-center text-slate-500 text-sm">
                                    {transactions.length === 0
                                        ? 'No transactions yet. Import a bank statement to get started.'
                                        : 'No transactions match your filter.'}
                                </td>
                            </tr>
                        ) : (
                            processedTransactions.map((tx) => {
                                const amount = parseFloat(tx.amount);
                                const hasDoc = !!(tx.receipt_id || tx.receipt_path);
                                return (
                                    <tr
                                        key={tx.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-white/3 transition-colors group cursor-pointer"
                                        onClick={() => setSelectedTx(tx)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 font-mono">
                                            {tx.transaction_date}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-xs">
                                            <span className="truncate block font-medium" title={tx.description}>{tx.description}</span>
                                            {tx.notes && <span className="text-xs text-slate-400 dark:text-slate-500 italic truncate block">{tx.notes}</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={e => e.stopPropagation()}>
                                            <select 
                                                className="bg-transparent border-none focus:ring-0 text-slate-600 dark:text-slate-400 text-xs cursor-pointer hover:text-indigo-500 max-w-[120px]"
                                                value={tx.property_id || ''}
                                                onChange={(e) => handleUpdateTransaction(tx.id, { property_id: e.target.value || null })}
                                            >
                                                <option value="">Unassigned</option>
                                                {properties.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={e => e.stopPropagation()}>
                                            <select 
                                                className="bg-transparent border-none focus:ring-0 text-slate-600 dark:text-slate-400 text-xs cursor-pointer hover:text-indigo-500 max-w-[120px]"
                                                style={tx.category_color ? { color: tx.category_color } : {}}
                                                value={tx.category_id || ''}
                                                onChange={(e) => handleUpdateTransaction(tx.id, { category_id: e.target.value || null })}
                                            >
                                                <option value="">Unassigned</option>
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id} style={{ color: c.color }}>{c.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className={`px-6 py-3.5 whitespace-nowrap text-sm text-right font-bold tabular-nums ${amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                            {amount < 0 ? '-' : '+'}${Math.abs(amount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3.5 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                                            {hasDoc ? (
                                                <button 
                                                    onClick={() => setSelectedTx(tx)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border border-indigo-500/30"
                                                    title="View receipt"
                                                >
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                                                    View
                                                </button>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-700" title="No document">
                                                    <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Drawer */}
            {selectedTx && (
                <TransactionDrawer
                    tx={selectedTx}
                    properties={properties}
                    categories={categories}
                    onClose={() => setSelectedTx(null)}
                    onUpdate={handleUpdateTransaction}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
};

export default TransactionList;
