// src/pages/ReportsPage.jsx
// Phase 4: Reports — P&L, Schedule E, Cash Flow, Expense Breakdown
import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';

/* ─── Helpers ───────────────────────────────────────────────────── */
const fmt = (v) => {
  const n = parseFloat(v) || 0;
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/* ─── P&L Tab ───────────────────────────────────────────────────── */
function PLReport({ properties }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [dateTo, setDateTo] = useState(`${new Date().getFullYear()}-12-31`);
  const [propertyId, setPropertyId] = useState('');

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
    if (propertyId) params.append('property_id', propertyId);
    api.get(`/backend/api/reports/pl.php?${params}`)
      .then(r => { if (r.data.success) setData(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReport(); }, []);

  const handleExport = () => {
    if (!data) return;
    let csv = 'Type,Category,Schedule E Line,Amount\n';
    data.income_rows.forEach(r => csv += `Income,"${r.category}","${r.schedule_e_line || ''}",${r.total}\n`);
    data.expense_rows.forEach(r => csv += `Expense,"${r.category}","${r.schedule_e_line || ''}",${r.total}\n`);
    csv += `\nTotal Income,,,${data.total_income}\nTotal Expenses,,,${data.total_expenses}\nNet P&L,,,${data.net}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `PL_Report_${dateFrom}_to_${dateTo}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Property</label>
          <select value={propertyId} onChange={e => setPropertyId(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button onClick={fetchReport} disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-60 flex items-center gap-2">
          {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          Generate
        </button>
        {data && (
          <button onClick={handleExport} className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
            ↓ Export CSV
          </button>
        )}
      </div>

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-4 text-center">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Income</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{fmt(data.total_income)}</p>
            </div>
            <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 p-4 text-center">
              <p className="text-xs text-red-600 dark:text-red-400 font-semibold uppercase tracking-wider">Expenses</p>
              <p className="text-xl font-bold text-red-700 dark:text-red-300 tabular-nums">{fmt(data.total_expenses)}</p>
            </div>
            <div className={`rounded-xl border p-4 text-center ${data.net >= 0 ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5' : 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${data.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>Net P&L</p>
              <p className={`text-xl font-bold tabular-nums ${data.net >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>{fmt(data.net)}</p>
            </div>
          </div>

          {/* Income table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-emerald-50 dark:bg-emerald-500/5 border-b border-slate-200 dark:border-white/8">
              <h3 className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">Income</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule E Line</th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/3">
                {data.income_rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-5 py-2.5 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                      {r.color && <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: r.color }} />}
                      {r.category}
                    </td>
                    <td className="px-5 py-2.5 text-slate-400 text-xs">{r.schedule_e_line || '—'}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(r.total)}</td>
                  </tr>
                ))}
                {data.income_rows.length === 0 && (
                  <tr><td colSpan="3" className="px-5 py-4 text-center text-slate-400 italic text-xs">No income in this period</td></tr>
                )}
                <tr className="bg-emerald-50/50 dark:bg-emerald-500/5 font-bold">
                  <td className="px-5 py-2.5 text-emerald-700 dark:text-emerald-400" colSpan="2">Total Income</td>
                  <td className="px-5 py-2.5 text-right text-emerald-700 dark:text-emerald-400 tabular-nums">{fmt(data.total_income)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Expense table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-red-50 dark:bg-red-500/5 border-b border-slate-200 dark:border-white/8">
              <h3 className="font-bold text-red-700 dark:text-red-400 text-sm">Expenses</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5">
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-5 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Schedule E Line</th>
                  <th className="px-5 py-2.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/3">
                {data.expense_rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-5 py-2.5 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                      {r.color && <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: r.color }} />}
                      {r.category}
                    </td>
                    <td className="px-5 py-2.5 text-slate-400 text-xs">{r.schedule_e_line || '—'}</td>
                    <td className="px-5 py-2.5 text-right font-bold text-red-500 dark:text-red-400 tabular-nums">{fmt(r.total)}</td>
                  </tr>
                ))}
                {data.expense_rows.length === 0 && (
                  <tr><td colSpan="3" className="px-5 py-4 text-center text-slate-400 italic text-xs">No expenses in this period</td></tr>
                )}
                <tr className="bg-red-50/50 dark:bg-red-500/5 font-bold">
                  <td className="px-5 py-2.5 text-red-700 dark:text-red-400" colSpan="2">Total Expenses</td>
                  <td className="px-5 py-2.5 text-right text-red-700 dark:text-red-400 tabular-nums">{fmt(data.total_expenses)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Schedule E Tab ────────────────────────────────────────────── */
function ScheduleEReport({ properties }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [propertyId, setPropertyId] = useState('');
  const years = [year, year - 1, year - 2, year - 3];

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams({ year });
    if (propertyId) params.append('property_id', propertyId);
    api.get(`/backend/api/reports/schedule_e.php?${params}`)
      .then(r => { if (r.data.success) setData(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReport(); }, []);

  const handleExport = () => {
    if (!data?.properties) return;
    let csv = 'Property,Line,Description,Amount\n';
    data.properties.forEach(p => {
      p.lines.forEach(l => {
        csv += `"${p.property.name}",${l.line_number},"${l.description}",${l.amount}\n`;
      });
      csv += `"${p.property.name}",,"TOTAL INCOME",${p.total_income}\n`;
      csv += `"${p.property.name}",,"TOTAL EXPENSES",${p.total_expenses}\n`;
      csv += `"${p.property.name}",,"NET",${p.net}\n\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Schedule_E_${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Tax Year</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Property</label>
          <select value={propertyId} onChange={e => setPropertyId(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button onClick={fetchReport} disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-60 flex items-center gap-2">
          {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          Generate
        </button>
        {data && (
          <button onClick={handleExport} className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
            ↓ Export CSV
          </button>
        )}
      </div>

      {/* IRS header */}
      <div className="p-4 bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/20 rounded-xl">
        <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">📋 IRS Schedule E (Form 1040) — Supplemental Income and Loss</p>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Part I: Income or Loss From Rental Real Estate and Royalties — Tax Year {year}</p>
      </div>

      {data?.properties?.map((prop, pi) => (
        <div key={pi} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-white/8 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">{prop.property.name}</h3>
              <p className="text-xs text-slate-500">{prop.property.address}</p>
            </div>
            <span className={`text-sm font-bold tabular-nums ${prop.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              Net: {fmt(prop.net)}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5">
                <th className="px-5 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-16">Line</th>
                <th className="px-5 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-5 py-2.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/3">
              {prop.lines.map((line, li) => (
                <tr key={li} className={`${line.amount > 0 ? '' : 'opacity-50'} ${line.line_number === 3 ? 'bg-emerald-50/30 dark:bg-emerald-500/3' : ''}`}>
                  <td className="px-5 py-2 text-slate-400 font-mono text-xs">{line.line_number}</td>
                  <td className="px-5 py-2 text-slate-700 dark:text-slate-300">{line.description}</td>
                  <td className={`px-5 py-2 text-right font-bold tabular-nums ${line.line_number === 3 ? 'text-emerald-600 dark:text-emerald-400' : line.amount > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-300 dark:text-slate-600'}`}>
                    {line.amount > 0 ? fmt(line.amount) : '—'}
                  </td>
                </tr>
              ))}
              {/* Totals */}
              <tr className="bg-emerald-50/50 dark:bg-emerald-500/5 font-bold border-t-2 border-emerald-200 dark:border-emerald-500/20">
                <td className="px-5 py-2" colSpan="2">
                  <span className="text-emerald-700 dark:text-emerald-400">Total Rents Received</span>
                </td>
                <td className="px-5 py-2 text-right text-emerald-700 dark:text-emerald-400 tabular-nums">{fmt(prop.total_income)}</td>
              </tr>
              <tr className="bg-red-50/50 dark:bg-red-500/5 font-bold">
                <td className="px-5 py-2" colSpan="2">
                  <span className="text-red-700 dark:text-red-400">Total Expenses</span>
                </td>
                <td className="px-5 py-2 text-right text-red-700 dark:text-red-400 tabular-nums">{fmt(prop.total_expenses)}</td>
              </tr>
              <tr className="font-bold text-base">
                <td className="px-5 py-3" colSpan="2">
                  <span className={prop.net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                    Net Income (Loss)
                  </span>
                </td>
                <td className={`px-5 py-3 text-right tabular-nums ${prop.net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                  {fmt(prop.net)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {data?.properties?.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8 italic">No properties with transactions found for {year}.</p>
      )}
    </div>
  );
}

/* ─── Cash Flow Tab ─────────────────────────────────────────────── */
function CashFlowReport({ properties }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const years = [year, year - 1, year - 2, year - 3];

  const fetchReport = () => {
    setLoading(true);
    api.get(`/backend/api/reports/cashflow.php?year=${year}`)
      .then(r => { if (r.data.success) setData(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReport(); }, []);

  const handleExport = () => {
    if (!data) return;
    let csv = 'Property,Month,Income,Expenses,Net\n';
    // All properties aggregate
    data.all.monthly.forEach(m => {
      csv += `"All Properties",${m.month},${m.income},${m.expenses},${m.net}\n`;
    });
    csv += `"All Properties",YTD Total,${data.all.ytd_income},${data.all.ytd_expenses},${data.all.ytd_net}\n\n`;
    // Per property
    data.properties.forEach(p => {
      p.monthly.forEach(m => {
        csv += `"${p.property.name}",${m.month},${m.income},${m.expenses},${m.net}\n`;
      });
      csv += `"${p.property.name}",YTD Total,${p.ytd_income},${p.ytd_expenses},${p.ytd_net}\n\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `CashFlow_${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Year</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={fetchReport} disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-60 flex items-center gap-2">
          {loading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          Generate
        </button>
        {data && (
          <button onClick={handleExport} className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
            ↓ Export CSV
          </button>
        )}
      </div>

      {data && (
        <>
          {/* All Properties Aggregate */}
          <CashFlowTable title="All Properties — Aggregate" data={data.all} />

          {/* Per-property tables */}
          {data.properties.map((p, i) => (
            <CashFlowTable key={i} title={p.property.name} subtitle={`Type: ${p.property.type}`} data={p} />
          ))}
        </>
      )}
    </div>
  );
}

function CashFlowTable({ title, subtitle, data }) {
  const maxVal = Math.max(...data.monthly.map(m => Math.max(m.income, m.expenses)), 1);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/8 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-white/8 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="text-right">
          <span className={`text-sm font-bold tabular-nums ${data.ytd_net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
            YTD Net: {fmt(data.ytd_net)}
          </span>
        </div>
      </div>

      {/* Mini bar + table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-white/5">
              <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Month</th>
              <th className="px-4 py-2 text-right text-xs font-bold text-emerald-500 uppercase tracking-wider">Income</th>
              <th className="px-4 py-2 text-right text-xs font-bold text-red-500 uppercase tracking-wider">Expenses</th>
              <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Net</th>
              <th className="px-4 py-2 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-48"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-white/3">
            {data.monthly.map((m, i) => {
              const incW = maxVal > 0 ? (m.income / maxVal) * 100 : 0;
              const expW = maxVal > 0 ? (m.expenses / maxVal) * 100 : 0;
              return (
                <tr key={i} className={m.income > 0 || m.expenses > 0 ? '' : 'opacity-40'}>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium">{m.month}</td>
                  <td className="px-4 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{m.income > 0 ? fmt(m.income) : '—'}</td>
                  <td className="px-4 py-2 text-right font-bold text-red-500 dark:text-red-400 tabular-nums">{m.expenses > 0 ? fmt(m.expenses) : '—'}</td>
                  <td className={`px-4 py-2 text-right font-bold tabular-nums ${m.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    {m.income > 0 || m.expenses > 0 ? fmt(m.net) : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-0.5 h-3">
                      <div className="h-full rounded-sm bg-emerald-400 dark:bg-emerald-500 transition-all" style={{ width: `${incW}%`, minWidth: m.income > 0 ? 2 : 0 }} />
                      <div className="h-full rounded-sm bg-red-400 dark:bg-red-500 transition-all" style={{ width: `${expW}%`, minWidth: m.expenses > 0 ? 2 : 0 }} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {/* YTD Total */}
            <tr className="font-bold border-t-2 border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800">
              <td className="px-4 py-2.5 text-slate-900 dark:text-white">YTD Total</td>
              <td className="px-4 py-2.5 text-right text-emerald-700 dark:text-emerald-400 tabular-nums">{fmt(data.ytd_income)}</td>
              <td className="px-4 py-2.5 text-right text-red-700 dark:text-red-400 tabular-nums">{fmt(data.ytd_expenses)}</td>
              <td className={`px-4 py-2.5 text-right tabular-nums ${data.ytd_net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{fmt(data.ytd_net)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Main Reports Page ─────────────────────────────────────────── */
const TABS = [
  { id: 'pl', label: 'P&L Report', icon: '📊' },
  { id: 'schedule_e', label: 'Schedule E', icon: '📋' },
  { id: 'cashflow', label: 'Cash Flow', icon: '💰' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('pl');
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Generate P&L statements, IRS Schedule E summaries, and cash flow reports
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
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'pl'         && <PLReport properties={properties} />}
        {activeTab === 'schedule_e' && <ScheduleEReport properties={properties} />}
        {activeTab === 'cashflow'   && <CashFlowReport properties={properties} />}
      </div>
    </div>
  );
}
