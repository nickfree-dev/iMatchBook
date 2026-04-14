import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';

const Dashboard = ({ selectedProperty }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const params = selectedProperty !== 'all' ? `?property_id=${selectedProperty}` : '';
            const { data } = await api.get(`/backend/api/dashboard_stats.php${params}`);
            if (data.success) {
                setStats(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard stats', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [selectedProperty]);

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!stats) return null;

    return (
        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Portfolio Overview</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                    {selectedProperty === 'all' ? 'Consolidated performance across all properties.' : 'Performance insights for the selected property.'}
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <KPICard 
                    title="Total Income" 
                    value={`$${stats.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    trend="+12% from last month" 
                    type="success"
                    icon="💰"
                />
                <KPICard 
                    title="Operating Expenses" 
                    value={`$${stats.expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    trend="-5% from last month" 
                    type="danger"
                    icon="💸"
                />
                <KPICard 
                    title="Net Cash Flow" 
                    value={`${stats.net >= 0 ? '+' : ''}$${stats.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    trend="On track" 
                    type={stats.net >= 0 ? 'primary' : 'warning'}
                    icon="📈"
                />
                <KPICard 
                    title="Capital Improvements" 
                    value={`$${stats.capital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                    trend="Non-operating" 
                    type="info"
                    icon="🏗️"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Monthly Trend */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold">Monthly Cash Flow</h3>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                                <span className="text-xs font-semibold text-slate-500">Income</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 bg-red-400 rounded-full" />
                                <span className="text-xs font-semibold text-slate-500">Expenses</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-64 flex items-end justify-between gap-4">
                        {stats.monthly.length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 italic">
                                No historical data available yet.
                            </div>
                        ) : (
                            stats.monthly.map((m) => {
                                const max = Math.max(...stats.monthly.map(x => Math.max(x.income, x.expense))) || 1;
                                const incomeHeight = (m.income / max) * 100;
                                const expenseHeight = (m.expense / max) * 100;
                                return (
                                    <div key={m.month} className="flex-1 flex flex-col items-center gap-2 group relative">
                                        <div className="w-full flex items-end justify-center gap-1 h-full">
                                            <div 
                                                style={{ height: `${incomeHeight}%` }} 
                                                className="w-full max-w-[12px] bg-emerald-500 rounded-t-full transition-all group-hover:bg-emerald-400 cursor-help"
                                                title={`Income: $${m.income.toFixed(2)}`}
                                            />
                                            <div 
                                                style={{ height: `${expenseHeight}%` }} 
                                                className="w-full max-w-[12px] bg-red-400 rounded-t-full transition-all group-hover:bg-red-300 cursor-help"
                                                title={`Expense: $${m.expense.toFixed(2)}`}
                                            />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                            {new Date(m.month + '-01').toLocaleDateString(undefined, { month: 'short' })}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Property Insights / Distribution */}
                <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20 flex flex-col">
                    <h3 className="text-xl font-bold mb-6">Quick Actions</h3>
                    <div className="space-y-4 flex-1">
                        <ActionButton icon="➕" label="New Transaction" />
                        <ActionButton icon="📤" label="Import Statement" />
                        <ActionButton icon="📸" label="Snap Receipt" />
                        <ActionButton icon="📄" label="Generate P&L" />
                    </div>
                    <div className="mt-8 pt-8 border-t border-white/20">
                        <p className="text-xs font-bold opacity-60 uppercase tracking-widest mb-2">Portfolio Health</p>
                        <div className="flex items-center justify-between">
                            <span className="text-2xl font-black">94%</span>
                            <span className="bg-white/20 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Stable</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, trend, type, icon }) => {
    const typeStyles = {
        success: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20',
        danger: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20',
        primary: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20',
        warning: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20',
        info: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-500/20',
    };

    return (
        <div className={`p-6 rounded-3xl border shadow-sm transition-all hover:shadow-md hover:-translate-y-1 ${typeStyles[type]}`}>
            <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">{icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{trend}</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{title}</p>
            <p className="text-2xl font-black tabular-nums">{value}</p>
        </div>
    );
};

const ActionButton = ({ icon, label }) => (
    <button className="w-full flex items-center gap-4 p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/5 group">
        <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
        <span className="text-sm font-bold">{label}</span>
    </button>
);

export default Dashboard;
