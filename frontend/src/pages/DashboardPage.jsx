// src/pages/DashboardPage.jsx
// Phase 4: Main Dashboard — KPIs, cash flow chart, recent transactions, alerts
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

/* ─── Helpers ──────────────────────────────────────────────────────── */
const fmt = (v) => {
  const n = parseFloat(v) || 0;
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ─── Mini Bar Chart  ──────────────────────────────────────────────── */
function MiniBarChart({ data }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expenses)), 1);
  const barW = 100 / 12; // percentage width

  return (
    <div className="mt-2">
      {/* Y-axis label */}
      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono mb-1 px-1">
        <span>{fmt(maxVal)}</span>
        <span>$0</span>
      </div>
      <div className="flex items-end gap-[3px] h-40 px-1">
        {data.map((d, i) => {
          const incH = maxVal > 0 ? (d.income / maxVal) * 100 : 0;
          const expH = maxVal > 0 ? (d.expenses / maxVal) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex items-end gap-[1px] group relative" style={{ minWidth: 0 }}>
              {/* Income bar */}
              <div
                className="flex-1 rounded-t-sm bg-emerald-400 dark:bg-emerald-500 opacity-80 group-hover:opacity-100 transition-all"
                style={{ height: `${incH}%`, minHeight: d.income > 0 ? 2 : 0 }}
              />
              {/* Expense bar */}
              <div
                className="flex-1 rounded-t-sm bg-red-400 dark:bg-red-500 opacity-80 group-hover:opacity-100 transition-all"
                style={{ height: `${expH}%`, minHeight: d.expenses > 0 ? 2 : 0 }}
              />
              {/* Tooltip */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                <p className="font-bold">{d.month}</p>
                <p className="text-emerald-300">↑ {fmt(d.income)}</p>
                <p className="text-red-300">↓ {fmt(d.expenses)}</p>
                <p className="border-t border-white/20 mt-0.5 pt-0.5">Net: {fmt(d.net)}</p>
              </div>
            </div>
          );
        })}
      </div>
      {/* X-axis labels */}
      <div className="flex gap-[3px] px-1 mt-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-slate-400 dark:text-slate-500 font-medium">
            {d.month}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Income</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Expenses</span>
      </div>
    </div>
  );
}

/* ─── Donut Chart ──────────────────────────────────────────────────── */
function DonutChart({ data }) {
  const total = data.reduce((sum, d) => sum + parseFloat(d.total), 0) || 1;
  const size = 140;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
        {data.length === 0 && (
          <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-200 dark:text-slate-700" />
        )}
        {data.map((d, i) => {
          const pct = parseFloat(d.total) / total;
          const dashLen = pct * circ;
          const seg = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color || '#6366f1'}
              strokeWidth={stroke}
              strokeDasharray={`${dashLen} ${circ - dashLen}`}
              strokeDashoffset={-offset}
              className="transition-all duration-500"
            />
          );
          offset += dashLen;
          return seg;
        })}
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central" className="fill-slate-700 dark:fill-slate-300 text-xs font-bold rotate-90" style={{ transformOrigin: 'center' }}>
          {fmt(total)}
        </text>
      </svg>
      <div className="flex-1 space-y-1 max-h-32 overflow-auto">
        {data.slice(0, 8).map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color || '#6366f1' }} />
            <span className="flex-1 text-slate-600 dark:text-slate-400 truncate">{d.name}</span>
            <span className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">{fmt(d.total)}</span>
          </div>
        ))}
        {data.length === 0 && <p className="text-xs text-slate-400 italic">No categorized expenses yet</p>}
      </div>
    </div>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    api.get('/backend/api/properties/index.php')
      .then(r => { if (r.data.success) setProperties(r.data.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ year });
    if (propertyId) params.append('property_id', propertyId);

    api.get(`/backend/api/reports/dashboard.php?${params}`)
      .then(r => { if (r.data.success) setData(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [year, propertyId]);

  const expenseCategories = useMemo(() => {
    if (!data?.category_breakdown) return [];
    return data.category_breakdown.filter(c => c.type === 'expense');
  }, [data]);

  const years = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur, cur - 1, cur - 2, cur - 3];
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const kpi = data?.kpi || {};

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Portfolio overview for {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={propertyId}
            onChange={e => setPropertyId(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Properties</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Income', value: kpi.total_income, color: 'emerald', icon: '↑', prefix: '+' },
          { label: 'Total Expenses', value: kpi.total_expenses, color: 'red', icon: '↓', prefix: '-' },
          { label: 'Net P&L', value: kpi.net, color: kpi.net >= 0 ? 'emerald' : 'red', icon: kpi.net >= 0 ? '📈' : '📉', prefix: '' },
          { label: 'Transactions', value: kpi.total_transactions, color: 'indigo', icon: '💳', isCount: true },
        ].map((card, i) => (
          <div key={i} className={`relative overflow-hidden rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-slate-900 p-5 shadow-sm`}>
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-[40px] bg-${card.color}-50 dark:bg-${card.color}-500/5`} />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{card.label}</p>
            <p className={`text-2xl font-bold tabular-nums text-${card.color}-600 dark:text-${card.color}-400`}>
              {card.isCount ? card.value?.toLocaleString() : fmt(card.value)}
            </p>
            <span className="absolute top-4 right-4 text-lg">{card.icon}</span>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Monthly Cash Flow */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/8 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm">Monthly Cash Flow</h2>
            <span className="text-xs text-slate-400">{year}</span>
          </div>
          {data?.monthly && <MiniBarChart data={data.monthly} />}
        </div>

        {/* Expense Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/8 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Expense Breakdown</h2>
          <DonutChart data={expenseCategories} />
        </div>
      </div>

      {/* Alerts & Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Unmatched Transactions Alert */}
        <div
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <span className="text-xl">📋</span>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{data?.unmatched_transactions ?? 0} unmatched transactions</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Need a receipt or document →</p>
          </div>
        </div>

        {/* Unmatched Documents Alert */}
        <div
          onClick={() => navigate('/documents')}
          className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <span className="text-xl">📄</span>
          </div>
          <div>
            <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300">{data?.unmatched_documents ?? 0} unlinked receipts</p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400">Not linked to any transaction →</p>
          </div>
        </div>

        {/* Quick Import */}
        <div
          onClick={() => navigate('/import')}
          className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <span className="text-xl">📥</span>
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Import Statement</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Upload CSV, QIF, or receipt →</p>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Transactions + Property Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Recent Transactions */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/8 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm">Recent Transactions</h2>
            <button onClick={() => navigate('/transactions')} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              View All →
            </button>
          </div>
          <div className="space-y-1">
            {(data?.recent_transactions || []).map(tx => (
              <div key={tx.id} className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/3 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${parseFloat(tx.amount) >= 0 ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400'}`}>
                  {parseFloat(tx.amount) >= 0 ? '↑' : '↓'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{tx.description}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{tx.transaction_date}</span>
                    {tx.property_name && <span>· {tx.property_name}</span>}
                    {tx.category_name && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: (tx.category_color || '#6366f1') + '15', color: tx.category_color || '#6366f1' }}>
                        {tx.category_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-sm font-bold tabular-nums ${parseFloat(tx.amount) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    {fmt(tx.amount)}
                  </span>
                  {tx.receipt_id && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center" title="Has receipt">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </span>
                  )}
                </div>
              </div>
            ))}
            {(!data?.recent_transactions || data.recent_transactions.length === 0) && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8 italic">No transactions yet. Import a bank statement to get started.</p>
            )}
          </div>
        </div>

        {/* Property Summary */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/8 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm">Property P&L</h2>
            <button onClick={() => navigate('/properties')} className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              Manage →
            </button>
          </div>
          <div className="space-y-2">
            {(data?.property_summary || []).map(p => {
              const net = parseFloat(p.net);
              const typeIcons = { sfr: '🏠', multi: '🏢', commercial: '🏬', other: '📁' };
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/20 transition-colors">
                  <span className="text-lg flex-shrink-0">{typeIcons[p.type] || '🏠'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.tx_count} transactions</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold tabular-nums ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {fmt(net)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      ↑{fmt(p.income)} ↓{fmt(p.expenses)}
                    </p>
                  </div>
                </div>
              );
            })}
            {(!data?.property_summary || data.property_summary.length === 0) && (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6 italic">No properties yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
