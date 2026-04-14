// src/components/TransactionList.jsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import api from '../services/api';

const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/* ─── Cascading Category Select ───────────────────────────────────── */
function CascadingCategorySelect({ txCategory, categories, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredMain, setHoveredMain] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const mainCategories = useMemo(() => categories.filter(c => !c.parent_id), [categories]);

  const groupedCategories = useMemo(() => {
    const groups = {
      'Income': mainCategories.filter(c => c.type === 'income'),
      'Expenses': mainCategories.filter(c => c.type === 'expense'),
      'Transfers': mainCategories.filter(c => c.type === 'transfer'),
      'Capital Improvements': mainCategories.filter(c => c.type === 'capital')
    };
    return groups;
  }, [mainCategories]);

  // Derived display values
  const mainName = txCategory?.parent_id ? categories.find(c => c.id == txCategory.parent_id)?.name : txCategory?.name;
  const subName = txCategory?.parent_id ? txCategory.name : null;

  return (
    <div className="relative inline-block text-left w-full max-w-[160px]" ref={containerRef} onClick={e => e.stopPropagation()}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="cursor-pointer px-2 py-1.5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 rounded-lg transition-colors flex items-center justify-between group"
      >
        {txCategory ? (
          <div className="flex flex-col text-left">
            <span className="font-semibold text-xs leading-tight text-slate-700 dark:text-slate-200">
              {mainName}
            </span>
            {subName && (
              <span className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5 max-w-[120px] truncate" title={subName}>{subName}</span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 italic text-[11px] font-medium">+ Add Category</span>
        )}
        <svg className={`w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-white/10 py-2">
          <div 
             className="px-4 py-1.5 text-[10px] text-red-500 uppercase tracking-widest font-bold hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
             onClick={() => { onSelect(null); setIsOpen(false); }}
          >
             ✕ Clear Category
          </div>
          
          {Object.entries(groupedCategories).map(([groupName, items], gIdx) => (
            <React.Fragment key={groupName}>
              {gIdx > 0 && <div className="mx-2 my-2 border-t border-slate-100 dark:border-white/5" />}
              
              {items.map(main => {
                const subs = categories.filter(c => c.parent_id == main.id);
                const hasSubs = subs.length > 0;
                return (
                  <div 
                    key={main.id} 
                    className="relative"
                    onMouseEnter={() => setHoveredMain(main.id)}
                    onMouseLeave={() => setHoveredMain(null)}
                  >
                    <div 
                      className={`px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer flex justify-between items-center ${hoveredMain === main.id ? 'bg-slate-100 dark:bg-white/5' : ''}`}
                      onClick={() => {
                        onSelect(main.id);
                        setIsOpen(false);
                      }}
                    >
                      <span className="font-semibold truncate text-slate-700 dark:text-slate-200">{main.name}</span>
                      {hasSubs && <span className="text-slate-400">›</span>}
                    </div>
                    
                    {/* Secondary Popout */}
                    {hasSubs && hoveredMain === main.id && (
                      <div className="absolute left-full top-0 ml-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-white/10 py-2 z-[100]">
                        <div 
                           className="px-4 py-1 text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1"
                        >
                           {main.name} Subcategories
                        </div>
                        {subs.map(sub => (
                          <div
                            key={sub.id}
                            className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer truncate"
                            title={sub.name}
                            onClick={() => { onSelect(sub.id); setIsOpen(false); }}
                          >
                            {sub.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}


/* ─── Compact Dropdown Select (Property/Account) ─────────────────── */
function CompactSelect({ value, options, label, onSelect, onAdd, direction = 'down' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsAdding(false);
        setNewName('');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const selectedOption = options.find(o => o.id == value);

  const handleCreate = async (e) => {
    e.stopPropagation();
    if (!newName.trim()) return;
    if (onAdd) {
      await onAdd(newName.trim());
      setIsAdding(false);
      setNewName('');
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left w-full max-w-[140px]" ref={containerRef} onClick={e => e.stopPropagation()}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="cursor-pointer px-2 py-1.5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 rounded-lg transition-colors flex items-center justify-between group"
      >
        {selectedOption ? (
          <span className="font-semibold text-xs leading-tight text-slate-700 dark:text-slate-200 truncate pr-1">
            {selectedOption.name}
          </span>
        ) : (
          <span className="text-slate-400 italic text-[11px] font-medium">+ Add {label}</span>
        )}
        <svg className={`w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className={`absolute z-50 ${direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-white/10 py-2`}>
          {!isAdding ? (
            <>
              <div 
                 className="px-4 py-1.5 text-[10px] text-red-500 uppercase tracking-widest font-bold hover:bg-slate-50 dark:hover:bg-red-500/10 cursor-pointer"
                 onClick={() => { onSelect(null); setIsOpen(false); }}
              >
                 ✕ Clear {label}
              </div>
              <div className="max-h-60 overflow-y-auto no-scrollbar border-b border-slate-100 dark:border-white/5 pb-1">
                {options.map(opt => (
                  <div 
                    key={opt.id} 
                    className={`px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer truncate ${value == opt.id ? 'bg-indigo-50 dark:bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                    onClick={() => {
                      onSelect(opt.id);
                      setIsOpen(false);
                    }}
                  >
                    {opt.name}
                  </div>
                ))}
              </div>
              {onAdd && (
                <div 
                  className="px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 cursor-pointer flex items-center gap-2 mt-1"
                  onClick={() => setIsAdding(true)}
                >
                  <span className="text-lg leading-none">+</span> Create New {label}
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-2 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New {label} Name</p>
              <input 
                autoFocus
                type="text"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-indigo-200 dark:border-indigo-500/30 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder={`e.g. ${label === 'Account' ? 'Chase Savings' : 'Main St. Loft'}`}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate(e)}
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => { setIsAdding(false); setNewName(''); }}
                  className="flex-1 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreate}
                  className="flex-1 py-1 text-[10px] font-bold bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-all"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Transaction Detail Drawer ─────────────────────────────────── */
function TransactionDrawer({ tx, transactions, properties, categories, accounts, onClose, onUpdate, onDelete }) {
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
  const txCategory = categories.find(c => c.id == tx.category_id);
  const isTransfer = tx.category_type === 'transfer' || txCategory?.type === 'transfer';
  const isExpense = amount < 0 && !isTransfer;
  const isIncome = amount > 0 && !isTransfer;
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
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isTransfer ? 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300' : amount < 0 ? 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400' : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'}`}>
              {isTransfer ? 'Transfer' : amount < 0 ? 'Expense' : 'Income'}
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
            <CompactSelect 
              value={tx.property_id}
              options={properties}
              label="Property"
              onSelect={(val) => onUpdate(tx.id, { property_id: val })}
              onAdd={async (name) => {
                const id = await handleCreateProperty(name);
                if (id) onUpdate(tx.id, { property_id: id });
              }}
            />
          </div>

          {/* Account */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Account</label>
            <CompactSelect 
              value={tx.account_id}
              options={accounts}
              label="Account"
              onSelect={(val) => onUpdate(tx.id, { account_id: val })}
              onAdd={async (name) => {
                const id = await handleCreateAccount(name);
                if (id) onUpdate(tx.id, { account_id: id });
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
            <CascadingCategorySelect 
              txCategory={txCategory}
              categories={categories}
              onSelect={(val) => onUpdate(tx.id, { category_id: val })}
            />
          </div>

          {/* Linked Transfer */}
          {isTransfer && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Linked Transfer</label>
              <select
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={tx.linked_transaction_id || ''}
                onChange={async e => {
                    const linkedId = e.target.value || null;
                    await onUpdate(tx.id, { linked_transaction_id: linkedId });
                    // Also auto-link the other transaction back if selected
                    if (linkedId) {
                        await onUpdate(linkedId, { linked_transaction_id: tx.id });
                    }
                }}
              >
                <option value="">Unlinked</option>
                {transactions
                  .filter(t => t.id !== tx.id && (parseFloat(t.amount) === (amount * -1) || t.id === tx.linked_transaction_id))
                  .map(t => (
                    <option key={t.id} value={t.id}>{t.transaction_date} - {t.description} ({parseFloat(t.amount) > 0 ? '+' : '-'}${Math.abs(t.amount).toFixed(2)})</option>
                ))}
              </select>
            </div>
          )}

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
const TransactionList = ({ globalPropertyFilter = 'all' }) => {
    const [transactions, setTransactions] = useState([]);
    const [properties, setProperties] = useState([]);
    const [categories, setCategories] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, income, expense, transfer
    const [filterProperty, setFilterProperty] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterAccount, setFilterAccount] = useState('all');
    const [filterMatched, setFilterMatched] = useState('all'); // all, matched, unmatched
    const [sortConfig, setSortConfig] = useState({ key: 'transaction_date', direction: 'desc' });
    const [selectedTx, setSelectedTx] = useState(null); // drawer
    const [selectedIds, setSelectedIds] = useState(new Set());

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (filterProperty !== 'all') params.append('property_id', filterProperty);
            if (filterCategory !== 'all') params.append('category_id', filterCategory);
            if (filterAccount !== 'all') params.append('account_id', filterAccount);

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
            const [propRes, catRes, accRes] = await Promise.all([
                api.get('/backend/api/properties/index.php'),
                api.get('/backend/api/categories/index.php'),
                api.get('/backend/api/accounts/index.php')
            ]);
            if (propRes.data.success) setProperties(propRes.data.data);
            if (catRes.data.success) setCategories(catRes.data.data);
            if (accRes.data.success) setAccounts(accRes.data.data);
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

    const handleCreateAccount = async (name) => {
        try {
            const { data } = await api.post('/backend/api/accounts/create.php', { name });
            if (data.success) {
                setAccounts(prev => [...prev, data.data]);
                return data.data.id;
            } else {
                alert(data.error || 'Failed to create account');
            }
        } catch {
            alert('Network error while creating account');
        }
        return null;
    };

    const handleCreateProperty = async (name) => {
        try {
            const { data } = await api.post('/backend/api/properties/index.php', { name });
            if (data.success) {
                const newProp = { id: data.id, name };
                setProperties(prev => [...prev, newProp]);
                return data.id;
            } else {
                alert(data.error || 'Failed to create property');
            }
        } catch {
            alert('Network error while creating property');
        }
        return null;
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
                setSelectedIds(new Set());
            } else {
                alert(data.message || 'Clear failed');
            }
        } catch {
            alert('Clear failed due to network error');
        }
    };

    const handleBulkUpdate = async (updates) => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        
        try {
            const { data } = await api.post('/backend/api/transactions/bulk_update.php', {
                ids,
                data: updates
            });
            
            if (data.success) {
                setTransactions(prev => prev.map(t => 
                    ids.includes(t.id) ? { ...t, ...updates } : t
                ));
                setSelectedIds(new Set());
            } else {
                alert(data.error || 'Bulk update failed');
            }
        } catch (err) {
            alert('Bulk update failed due to network error');
        }
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${ids.length} transactions?`)) return;

        try {
            const { data } = await api.post('/backend/api/delete_transaction.php', { ids });
            if (data.success) {
                setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
                setSelectedIds(new Set());
            } else {
                alert(data.message || 'Bulk delete failed');
            }
        } catch {
            alert('Bulk delete failed due to network error');
        }
    };

    const toggleSelect = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === processedTransactions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(processedTransactions.map(t => t.id)));
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
                const txCategory = categories.find(c => c.id == t.category_id);
                const isTransfer = t.category_type === 'transfer' || txCategory?.type === 'transfer';
                const isCapital = t.category_type === 'capital' || txCategory?.type === 'capital';
                const isIncome = (t.category_type === 'income' || txCategory?.type === 'income') || (amount > 0 && !isTransfer && !isCapital);
                const isExpense = (t.category_type === 'expense' || txCategory?.type === 'expense') || (amount < 0 && !isTransfer && !isCapital);
                
                if (filterType === 'transfer') return isTransfer;
                if (filterType === 'capital') return isCapital;
                if (filterType === 'income') return isIncome;
                if (filterType === 'expense') return isExpense;
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
        if (globalPropertyFilter !== 'all') {
            setFilterProperty(globalPropertyFilter);
        } else {
            setFilterProperty('all');
        }
    }, [globalPropertyFilter]);

    useEffect(() => { 
        fetchMetaData();
        fetchTransactions(); 
    }, [filterProperty, filterCategory, filterAccount]);

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <span className="ml-1 text-slate-600">↕</span>;
        return sortConfig.direction === 'asc'
            ? <span className="ml-1 text-indigo-400">↑</span>
            : <span className="ml-1 text-indigo-400">↓</span>;
    };

    const totalIncome  = processedTransactions.filter(t => parseFloat(t.amount) > 0 && (t.category_type === 'income' || (!t.category_type && !categories.find(c => c.id == t.category_id))) ).reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalExpense = processedTransactions.filter(t => parseFloat(t.amount) < 0 && (t.category_type === 'expense' || (!t.category_type && !categories.find(c => c.id == t.category_id))) ).reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalCapital = processedTransactions.filter(t => (t.category_type === 'capital' || categories.find(c => c.id == t.category_id)?.type === 'capital')).reduce((s, t) => s + Math.abs(parseFloat(t.amount)), 0);
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
            {/* Summary KPIs Row */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/8 bg-slate-50/30 dark:bg-slate-900/30">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 shadow-sm group hover:shadow-md transition-all">
                        <p className="text-[10px] text-green-600 dark:text-green-400 font-bold mb-1 uppercase tracking-widest">Income</p>
                        <p className="text-green-700 dark:text-green-300 font-extrabold text-xl tabular-nums">${totalIncome.toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 shadow-sm group hover:shadow-md transition-all">
                        <p className="text-[10px] text-red-600 dark:text-red-400 font-bold mb-1 uppercase tracking-widest">Expenses</p>
                        <p className="text-red-700 dark:text-red-300 font-extrabold text-xl tabular-nums">${Math.abs(totalExpense).toFixed(2)}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 shadow-sm group hover:shadow-md transition-all">
                        <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mb-1 uppercase tracking-widest">Capital</p>
                        <p className="text-purple-700 dark:text-purple-300 font-extrabold text-xl tabular-nums">${totalCapital.toFixed(2)}</p>
                    </div>
                    <div className={`bg-white dark:bg-slate-800/50 border rounded-xl px-4 py-3 shadow-sm group hover:shadow-md transition-all ${net >= 0 ? 'border-indigo-200 dark:border-indigo-500/20' : 'border-orange-200 dark:border-orange-500/20'}`}>
                        <p className={`text-[10px] font-bold mb-1 uppercase tracking-widest ${net >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400'}`}>Net P&L</p>
                        <p className={`font-extrabold text-xl tabular-nums ${net >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-orange-700 dark:text-orange-300'}`}>{net >= 0 ? '+' : ''}${net.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Power Bar (Two Rows) */}
            <div className="bg-white dark:bg-slate-900 sticky top-0 z-30 border-b border-slate-200 dark:border-white/8 shadow-sm">
                
                {/* Row 1: Filters */}
                <div id="filters-container" className="px-4 py-2 flex flex-nowrap items-center gap-3 overflow-x-auto no-scrollbar">
                    <div className="relative group w-64 flex-shrink-0">
                        <input
                            type="text"
                            placeholder="Quick search description…"
                            className="w-full pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-white/5 border border-transparent focus:border-indigo-500/50 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>

                    <div className="h-4 w-px bg-slate-200 dark:bg-white/10 flex-shrink-0" />
                    
                    <select
                        className="flex-shrink-0 px-2.5 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer hover:border-slate-300 dark:hover:border-white/20"
                        value={filterProperty}
                        onChange={(e) => setFilterProperty(e.target.value)}
                    >
                        <option value="all">All Properties</option>
                        <option value="none">None / Unassigned</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <select
                        className="flex-shrink-0 px-2.5 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer hover:border-slate-300 dark:hover:border-white/20"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="all">All Categories</option>
                        <option value="none">None / Unassigned</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select
                        className="flex-shrink-0 px-2.5 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer hover:border-slate-300 dark:hover:border-white/20"
                        value={filterAccount}
                        onChange={(e) => setFilterAccount(e.target.value)}
                    >
                        <option value="all">All Accounts</option>
                        <option value="none">None / Unassigned</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>

                    <select
                        className="flex-shrink-0 px-2.5 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer hover:border-slate-300 dark:hover:border-white/20"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="income">Income (+)</option>
                        <option value="expense">Expenses (-)</option>
                        <option value="transfer">Transfers</option>
                        <option value="capital">Capital Improvements</option>
                    </select>
                </div>

                {/* Row 2: Info & Actions */}
                <div id="info-action-container" className="px-4 py-2 flex flex-nowrap items-center justify-between border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/3">
                    
                    {/* Left: Segmented Control */}
                    <div className="flex items-center gap-4">
                        <div className="relative flex p-1 bg-slate-200/50 dark:bg-black/20 rounded-xl border border-slate-200/50 dark:border-white/5">
                            <div 
                                className="absolute h-[calc(100%-8px)] top-1 bg-white dark:bg-indigo-600 rounded-lg shadow-sm transition-all duration-300 ease-out"
                                style={{ 
                                    width: 'calc(33.33% - 4px)',
                                    left: filterMatched === 'all' ? '4px' : filterMatched === 'matched' ? '33.33%' : '66.66%'
                                }}
                            />
                            {['all', 'matched', 'unmatched'].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setFilterMatched(v)}
                                    className={`relative z-10 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 w-24 ${
                                        filterMatched === v 
                                            ? 'text-indigo-600 dark:text-white' 
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="h-6 w-px bg-slate-200 dark:bg-white/10" />

                        {/* Summary Info (Pro Style) */}
                        <div className="flex items-center gap-4 text-[11px]">
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                <span className="text-slate-400 font-medium">Results:</span>
                                <span className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">{processedTransactions.length}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${matchedCount === transactions.length ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span className="text-slate-400 font-medium">Coverage:</span>
                                <span className="text-slate-700 dark:text-slate-300 font-bold tabular-nums">{Math.round((matchedCount / (transactions.length || 1)) * 100)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchTransactions}
                            title="Refresh Data"
                            className="flex items-center gap-2 px-3 py-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all active:scale-95 text-[10px] font-bold uppercase tracking-wider border border-transparent hover:border-indigo-100 dark:hover:border-indigo-500/20"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Refresh
                        </button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />
                        {transactions.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                title="Clear All"
                                className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all active:scale-95 text-[10px] font-bold uppercase tracking-wider"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-200 dark:border-white/5">
                        <tr>
                            <th className="px-4 py-3 text-center w-10">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    checked={processedTransactions.length > 0 && selectedIds.size === processedTransactions.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none" onClick={() => requestSort('transaction_date')}>
                                Date {getSortIcon('transaction_date')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none" onClick={() => requestSort('description')}>
                                Description {getSortIcon('description')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                                Property
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none" onClick={() => requestSort('amount')}>
                                Amount {getSortIcon('amount')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                                Account
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                                Doc
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {processedTransactions.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-16 text-center text-slate-500 text-sm">
                                    {transactions.length === 0
                                        ? 'No transactions yet. Import a bank statement to get started.'
                                        : 'No transactions match your filter.'}
                                </td>
                            </tr>
                        ) : (
                            processedTransactions.map((tx, idx) => {
                                const amount = parseFloat(tx.amount);
                                const hasDoc = !!(tx.receipt_id || tx.receipt_path);
                                const txCategory = categories.find(c => c.id == tx.category_id);
                                const isTransfer = tx.category_type === 'transfer' || txCategory?.type === 'transfer';
                                const isEven = idx % 2 === 1;
                                return (
                                    <tr
                                        key={tx.id}
                                        className={`hover:bg-slate-50/80 dark:hover:bg-white/3 ${isEven ? 'bg-slate-400/[0.06] dark:bg-white/[0.03]' : ''} transition-colors group cursor-pointer ${selectedIds.has(tx.id) ? '!bg-indigo-50/50 dark:!bg-indigo-500/5' : ''}`}
                                        onClick={() => setSelectedTx(tx)}
                                    >
                                        <td className="px-4 py-4 text-center" onClick={e => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                checked={selectedIds.has(tx.id)}
                                                onChange={() => toggleSelect(tx.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300 font-mono">
                                            {tx.transaction_date}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 max-w-xs">
                                            <span className="truncate block" title={tx.description}>{tx.description}</span>
                                            {tx.notes && <span className="text-xs text-slate-400 dark:text-slate-500 italic truncate block">{tx.notes}</span>}
                                        </td>
                                        <td className="px-6 py-2 whitespace-nowrap align-middle">
                                            <CascadingCategorySelect 
                                                txCategory={txCategory} 
                                                categories={categories}
                                                onSelect={(categoryId) => handleUpdateTransaction(tx.id, { category_id: categoryId })}
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={e => e.stopPropagation()}>
                                            <CompactSelect 
                                              value={tx.property_id}
                                              options={properties}
                                              label="Property"
                                              onSelect={(val) => handleUpdateTransaction(tx.id, { property_id: val })}
                                              onAdd={async (name) => {
                                                const id = await handleCreateProperty(name);
                                                if (id) handleUpdateTransaction(tx.id, { property_id: id });
                                              }}
                                            />
                                        </td>
                                        <td className={`px-6 py-3.5 whitespace-nowrap text-sm text-right tabular-nums font-mono ${isTransfer ? 'text-slate-500 dark:text-slate-400' : amount < 0 ? 'text-slate-900 dark:text-white' : 'text-green-600 dark:text-green-400'}`}>
                                            {amount < 0 ? '−' : '+'}${Math.abs(amount).toFixed(2)}
                                            {isTransfer && <span className="ml-1.5 text-[10px] font-normal inline-flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5 opacity-80" title="Transfer">🔁</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={e => e.stopPropagation()}>
                                            <CompactSelect 
                                              value={tx.account_id}
                                              options={accounts}
                                              label="Account"
                                              onSelect={(val) => handleUpdateTransaction(tx.id, { account_id: val })}
                                              onAdd={async (name) => {
                                                const id = await handleCreateAccount(name);
                                                if (id) handleUpdateTransaction(tx.id, { account_id: id });
                                              }}
                                            />
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
                    transactions={transactions}
                    properties={properties}
                    categories={categories}
                    accounts={accounts}
                    onClose={() => setSelectedTx(null)}
                    onUpdate={handleUpdateTransaction}
                    onDelete={handleDelete}
                />
            )}

{/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 flex items-center gap-4 pr-4">
                        <div className="bg-indigo-600 rounded-xl px-4 py-2 flex items-center gap-2 text-white">
                            <span className="text-sm font-bold">{selectedIds.size}</span>
                            <span className="text-xs font-semibold opacity-80 uppercase tracking-wider">Selected</span>
                        </div>
                        
                        <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-1" />

                        {/* Property Bulk Select */}
                        <div className="flex items-center">
                            <CompactSelect 
                                value=""
                                options={properties}
                                label="Property"
                                direction="up"
                                onSelect={(val) => { if(val) handleBulkUpdate({ property_id: val }); }}
                                onAdd={async (name) => {
                                    const id = await handleCreateProperty(name);
                                    if (id) handleBulkUpdate({ property_id: id });
                                }}
                            />
                        </div>

                        {/* Account Bulk Select */}
                        <div className="flex items-center">
                            <CompactSelect 
                                value=""
                                options={accounts}
                                label="Account"
                                direction="up"
                                onSelect={(val) => { if(val) handleBulkUpdate({ account_id: val }); }}
                                onAdd={async (name) => {
                                    const id = await handleCreateAccount(name);
                                    if (id) handleBulkUpdate({ account_id: id });
                                }}
                            />
                        </div>

                        {/* Category Bulk Select - Simple for now, similar to others */}
                        <div className="relative group">
                            <select 
                                className="bg-transparent text-xs font-bold py-2 pl-2 pr-8 border-none focus:ring-0 cursor-pointer appearance-none text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                onChange={(e) => { if(e.target.value) handleBulkUpdate({ category_id: e.target.value }); e.target.value = ''; }}
                                value=""
                            >
                                <option value="" disabled className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Set Category</option>
                                {categories.filter(c => !c.parent_id).map(cat => (
                                    <React.Fragment key={cat.id}>
                                        <option value={cat.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold">{cat.name}</option>
                                        {categories.filter(sub => sub.parent_id == cat.id).map(sub => (
                                            <option key={sub.id} value={sub.id} className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 pl-4">— {sub.name}</option>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </select>
                            <svg className="w-4 h-4 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </div>

                        <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-1" />

                        <button 
                            onClick={() => handleBulkUpdate({ is_reviewed: 1 })}
                            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-2"
                        >
                            Review All
                        </button>

                        <button 
                            onClick={handleBulkDelete}
                            className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors px-2 py-2"
                        >
                            Delete Selected
                        </button>

                        <button 
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-2"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionList;
