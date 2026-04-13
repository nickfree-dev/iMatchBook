// src/pages/PropertiesPage.jsx
import React, { useEffect, useState } from 'react';
import api from '../services/api';

const PROPERTY_TYPES = [
  { value: 'sfr',        label: 'Single Family',  icon: '🏠', color: 'indigo' },
  { value: 'multi',      label: 'Multi-Unit',      icon: '🏘️', color: 'violet' },
  { value: 'commercial', label: 'Commercial',      icon: '🏢', color: 'sky' },
  { value: 'other',      label: 'Other',           icon: '🏗️', color: 'slate' },
];

const typeInfo = (type) => PROPERTY_TYPES.find(t => t.value === type) || PROPERTY_TYPES[3];

const colorMap = {
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-300', ring: 'ring-indigo-200 dark:ring-indigo-500/30', icon: 'bg-indigo-600' },
  violet: { bg: 'bg-violet-100 dark:bg-violet-500/15', text: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-200 dark:ring-violet-500/30', icon: 'bg-violet-600' },
  sky:    { bg: 'bg-sky-100 dark:bg-sky-500/15',       text: 'text-sky-700 dark:text-sky-300',       ring: 'ring-sky-200 dark:ring-sky-500/30',       icon: 'bg-sky-600' },
  slate:  { bg: 'bg-slate-100 dark:bg-slate-500/15',   text: 'text-slate-700 dark:text-slate-300',   ring: 'ring-slate-200 dark:ring-slate-500/20',   icon: 'bg-slate-500' },
};

const emptyForm = { name: '', address: '', type: 'sfr' };

function PropertyModal({ property, onClose, onSave }) {
  const [form, setForm] = useState(property || emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Property name is required'); return; }
    setSaving(true);
    setError(null);
    try {
      if (property) {
        await api.put('/backend/api/properties/index.php', { ...form, id: property.id, is_active: 1 });
      } else {
        await api.post('/backend/api/properties/index.php', form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl ring-1 ring-slate-200 dark:ring-white/10" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/8">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {property ? 'Edit Property' : 'Add Property'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {property ? 'Update this rental property' : 'Add a rental property to your portfolio'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/8 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Property Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Property Type</label>
            <div className="grid grid-cols-2 gap-2">
              {PROPERTY_TYPES.map(t => {
                const c = colorMap[t.color];
                const selected = form.type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t.value }))}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      selected
                        ? `border-current ${c.bg} ${c.text}`
                        : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl leading-none">{t.icon}</span>
                    <span className="text-sm font-semibold">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Property Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 123 Main St Unit A"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Address</label>
            <textarea
              rows={2}
              placeholder="e.g. 123 Main St, Springfield, IL 62701"
              value={form.address || ''}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-4 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</> : property ? 'Save Changes' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PropertyCard({ property, onEdit, onArchive, stats }) {
  const t = typeInfo(property.type);
  const c = colorMap[t.color];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/8 shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
      {/* Color accent bar */}
      <div className={`h-1.5 w-full ${c.icon}`} />
      
      <div className="p-5">
        {/* Type badge + actions */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text} ring-1 ${c.ring}`}>
            <span>{t.icon}</span>
            {t.label}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(property)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
              title="Edit"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <button
              onClick={() => onArchive(property)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              title="Archive"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" /></svg>
            </button>
          </div>
        </div>

        {/* Name */}
        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug mb-1">{property.name}</h3>
        
        {/* Address */}
        {property.address && property.address !== 'N/A' && (
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1 mb-4">
            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {property.address}
          </p>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-500 mb-0.5">Income</p>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">${(stats.income || 0).toFixed(0)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-500 mb-0.5">Expenses</p>
              <p className="text-sm font-bold text-red-500 dark:text-red-400">${Math.abs(stats.expenses || 0).toFixed(0)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 dark:text-slate-500 mb-0.5">Net</p>
              <p className={`text-sm font-bold ${(stats.net || 0) >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-500 dark:text-orange-400'}`}>
                ${(stats.net || 0).toFixed(0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [archiveConfirm, setArchiveConfirm] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [propRes, txRes] = await Promise.all([
        api.get('/backend/api/properties/index.php'),
        api.get('/backend/api/get_bank_transactions.php'),
      ]);
      if (propRes.data.success) setProperties(propRes.data.data);
      if (txRes.data.success) setTransactions(txRes.data.data);
    } catch (err) {
      setError('Failed to load properties. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getStatsForProperty = (propertyId) => {
    const txs = transactions.filter(t => String(t.property_id) === String(propertyId));
    const income   = txs.filter(t => parseFloat(t.amount) > 0).reduce((s, t) => s + parseFloat(t.amount), 0);
    const expenses = txs.filter(t => parseFloat(t.amount) < 0).reduce((s, t) => s + parseFloat(t.amount), 0);
    return { income, expenses, net: income + expenses, count: txs.length };
  };

  const handleSave = async () => {
    setShowModal(false);
    setEditingProperty(null);
    await fetchData();
  };

  const handleEdit = (property) => {
    setEditingProperty(property);
    setShowModal(true);
  };

  const handleArchiveConfirm = async (property) => {
    try {
      await api.delete(`/backend/api/properties/index.php?id=${property.id}`);
      setArchiveConfirm(null);
      await fetchData();
    } catch {
      alert('Failed to archive property');
    }
  };

  const totalIncome   = transactions.filter(t => parseFloat(t.amount) > 0).reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalExpenses = transactions.filter(t => parseFloat(t.amount) < 0).reduce((s, t) => s + parseFloat(t.amount), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="p-6 border-b border-slate-200 dark:border-white/8 bg-white dark:bg-slate-900/50 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Properties</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Manage your rental portfolio • {properties.length} {properties.length === 1 ? 'property' : 'properties'}
            </p>
          </div>
          <button
            onClick={() => { setEditingProperty(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Property
          </button>
        </div>

        {/* Portfolio summary */}
        {!loading && properties.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase tracking-wider mb-1">Portfolio Income</p>
              <p className="text-green-700 dark:text-green-300 font-bold text-lg tabular-nums">${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-red-600 dark:text-red-400 font-semibold uppercase tracking-wider mb-1">Portfolio Expenses</p>
              <p className="text-red-700 dark:text-red-300 font-bold text-lg tabular-nums">${Math.abs(totalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className={`border rounded-xl px-4 py-3 ${(totalIncome + totalExpenses) >= 0 ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20' : 'bg-orange-50 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${(totalIncome + totalExpenses) >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-orange-600 dark:text-orange-400'}`}>Net P&L</p>
              <p className={`font-bold text-lg tabular-nums ${(totalIncome + totalExpenses) >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-orange-700 dark:text-orange-300'}`}>
                ${(totalIncome + totalExpenses).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
        ) : properties.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-3xl">🏘️</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No properties yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-xs">Add your rental properties so you can track income and expenses per unit.</p>
            <button
              onClick={() => { setEditingProperty(null); setShowModal(true); }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              Add Your First Property
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {properties.map(p => (
              <PropertyCard
                key={p.id}
                property={p}
                stats={getStatsForProperty(p.id)}
                onEdit={handleEdit}
                onArchive={setArchiveConfirm}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && (
        <PropertyModal
          property={editingProperty}
          onClose={() => { setShowModal(false); setEditingProperty(null); }}
          onSave={handleSave}
        />
      )}

      {archiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl ring-1 ring-slate-200 dark:ring-white/10">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" /></svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Archive Property?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              "<strong>{archiveConfirm.name}</strong>" will be archived and hidden from your portfolio. Linked transactions will be preserved.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setArchiveConfirm(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button onClick={() => handleArchiveConfirm(archiveConfirm)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold transition-all active:scale-95">
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
