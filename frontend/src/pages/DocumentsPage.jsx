// src/pages/DocumentsPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';

const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const DOC_TYPES = ['receipt', 'invoice', 'contract', 'statement', 'other'];

function MatchBadge({ isMatched }) {
  if (isMatched) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/30">
        <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        Matched
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-500/30">
      <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
      Unmatched
    </span>
  );
}

function DocDetailPanel({ doc, properties, onClose, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${doc.merchant_name || 'this document'}"?`)) return;
    setDeleting(true);
    try {
      await api.delete(`/backend/api/documents/index.php?id=${doc.id}`);
      onDelete(doc.id);
      onClose();
    } catch {
      alert('Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const isMatched = !!doc.linked_tx_id;
  const imageSrc = doc.image_path ? `${BASE_URL}/${doc.image_path}` : null;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" />
      {/* Panel */}
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-white/8 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{doc.merchant_name || 'Document'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{doc.upload_date?.split(' ')[0]}</p>
          </div>
          <button onClick={onClose} className="ml-3 flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/8 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Image */}
        <div className="flex-shrink-0 bg-slate-100 dark:bg-black flex items-center justify-center" style={{ minHeight: '220px', maxHeight: '300px' }}>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Document"
              className="max-w-full max-h-[300px] object-contain"
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-600">
              <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="text-sm">No image</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* Match status */}
          <div className="flex items-center gap-3">
            <MatchBadge isMatched={isMatched} />
            {doc.doc_type && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/8 text-slate-500 dark:text-slate-400">
                {doc.doc_type}
              </span>
            )}
          </div>

          {/* Key fields */}
          <div className="grid grid-cols-2 gap-3">
            {doc.total_amount && (
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Amount</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">${parseFloat(doc.total_amount || 0).toFixed(2)}</p>
              </div>
            )}
            {doc.transaction_date && (
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Date</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{doc.transaction_date}</p>
              </div>
            )}
            {doc.payment_type && (
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Payment</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{doc.payment_type}</p>
              </div>
            )}
            {doc.property_name && (
              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">Property</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{doc.property_name}</p>
              </div>
            )}
          </div>

          {/* Linked Transaction */}
          {isMatched && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">Linked Transaction</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{doc.linked_tx_description}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">{doc.linked_tx_date}</span>
                <span className={`text-sm font-bold tabular-nums ${parseFloat(doc.linked_tx_amount) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {parseFloat(doc.linked_tx_amount) < 0 ? '-' : '+'}${Math.abs(parseFloat(doc.linked_tx_amount || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {!isMatched && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">Not Linked</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">This document has not been matched to a bank transaction. Import a bank statement and the matcher will try to link it automatically.</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex-shrink-0 p-4 border-t border-slate-100 dark:border-white/8 flex gap-3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-500/10 transition-all disabled:opacity-60"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          {imageSrc && (
            <a
              href={imageSrc}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              Open Full Size
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Filters
  const [filterMatched, setFilterMatched] = useState('all'); // all | yes | no
  const [filterProperty, setFilterProperty] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterProperty !== 'all') params.set('property_id', filterProperty);
      if (filterMatched !== 'all') params.set('matched', filterMatched);

      const [docRes, propRes] = await Promise.all([
        api.get(`/backend/api/documents/index.php?${params.toString()}`),
        api.get('/backend/api/properties/index.php'),
      ]);
      if (docRes.data.success) setDocuments(docRes.data.data);
      if (propRes.data.success) setProperties(propRes.data.data);
    } catch {
      setError('Failed to load documents. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterMatched, filterProperty]);

  const filtered = useMemo(() => {
    if (!searchTerm) return documents;
    const q = searchTerm.toLowerCase();
    return documents.filter(d => d.merchant_name?.toLowerCase().includes(q));
  }, [documents, searchTerm]);

  const matched   = documents.filter(d => d.linked_tx_id).length;
  const unmatched = documents.length - matched;

  const handleDelete = (id) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="p-6 border-b border-slate-200 dark:border-white/8 bg-white dark:bg-slate-900/50 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Document Library</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Receipts, invoices, and other uploaded documents — {documents.length} total
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/capture" className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition-all active:scale-95">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Capture Receipt
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setFilterMatched('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${filterMatched === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent shadow' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'}`}
          >
            All · {documents.length}
          </button>
          <button
            onClick={() => setFilterMatched('yes')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${filterMatched === 'yes' ? 'bg-emerald-600 text-white border-transparent shadow' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'}`}
          >
            ✓ Matched · {matched}
          </button>
          <button
            onClick={() => setFilterMatched('no')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${filterMatched === 'no' ? 'bg-amber-500 text-white border-transparent shadow' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'}`}
          >
            ⏳ Unmatched · {unmatched}
          </button>

          {/* Property filter */}
          <select
            value={filterProperty}
            onChange={e => setFilterProperty(e.target.value)}
            className="ml-auto px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {/* Search */}
          <input
            type="text"
            placeholder="Search merchant…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {documents.length === 0 ? 'No documents yet' : 'No documents match your filter'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
              {documents.length === 0 ? 'Use Receipt Capture to upload your first document.' : 'Try changing the filter above.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(doc => {
              const isMatched = !!doc.linked_tx_id;
              const imageSrc = doc.image_path ? `${BASE_URL}/${doc.image_path}` : null;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/8 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                >
                  {/* Thumbnail */}
                  <div className="relative bg-slate-100 dark:bg-slate-800 aspect-[3/4] flex items-center justify-center overflow-hidden">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={doc.merchant_name || 'Document'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    )}
                    {/* Match status overlay */}
                    <div className="absolute top-2 left-2">
                      <MatchBadge isMatched={isMatched} />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate mb-0.5">
                      {doc.merchant_name || 'Unknown Merchant'}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-500">{doc.transaction_date || doc.upload_date?.split(' ')[0]}</span>
                      {doc.total_amount && (
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                          ${parseFloat(doc.total_amount).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {doc.property_name && (
                      <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium mt-1 truncate">{doc.property_name}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedDoc && (
        <DocDetailPanel
          doc={selectedDoc}
          properties={properties}
          onClose={() => setSelectedDoc(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
