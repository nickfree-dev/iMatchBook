// src/components/TransactionList.jsx
import React, { useEffect, useState, useMemo } from 'react';
import api from '../services/api';

const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const TransactionList = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, income, expense
    const [sortConfig, setSortConfig] = useState({ key: 'transaction_date', direction: 'desc' });

    const fetchTransactions = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get('/backend/api/get_bank_transactions.php');
            if (data.success) {
                setTransactions(data.data);
            } else {
                setError(data.error || 'Failed to fetch transactions');
            }
        } catch (err) {
            if (err.response?.status === 401) {
                setError('Session expired. Please log in again.');
            } else {
                setError('Network error — is the backend running?');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this transaction?')) return;
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
                    aValue = aValue.toString().toLowerCase();
                    bValue = bValue.toString().toLowerCase();
                }
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [transactions, searchTerm, filterType, sortConfig]);

    useEffect(() => { fetchTransactions(); }, []);

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <span className="ml-1 text-slate-600">↕</span>;
        return sortConfig.direction === 'asc'
            ? <span className="ml-1 text-indigo-400">↑</span>
            : <span className="ml-1 text-indigo-400">↓</span>;
    };

    const totalIncome  = processedTransactions.filter(t => parseFloat(t.amount) > 0).reduce((s, t) => s + parseFloat(t.amount), 0);
    const totalExpense = processedTransactions.filter(t => parseFloat(t.amount) < 0).reduce((s, t) => s + parseFloat(t.amount), 0);
    const net          = totalIncome + totalExpense;

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
            <div className="p-6 border-b border-white/8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div>
                        <h1 className="text-xl font-bold text-white">Transactions</h1>
                        <p className="text-slate-400 text-sm mt-0.5">{transactions.length} total records</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={fetchTransactions}
                            className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
                        >
                            Refresh
                        </button>
                        {transactions.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                className="text-red-400 hover:text-red-300 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-red-500/20 transition-colors"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                </div>

                {/* Summary KPIs */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                        <p className="text-xs text-green-400 font-medium mb-1">Income</p>
                        <p className="text-green-300 font-bold">${totalIncome.toFixed(2)}</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                        <p className="text-xs text-red-400 font-medium mb-1">Expenses</p>
                        <p className="text-red-300 font-bold">${Math.abs(totalExpense).toFixed(2)}</p>
                    </div>
                    <div className={`border rounded-xl px-4 py-3 ${net >= 0 ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                        <p className={`text-xs font-medium mb-1 ${net >= 0 ? 'text-indigo-400' : 'text-orange-400'}`}>Net</p>
                        <p className={`font-bold ${net >= 0 ? 'text-indigo-300' : 'text-orange-300'}`}>${net.toFixed(2)}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="Search description…"
                        className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="income">Income (+)</option>
                        <option value="expense">Expenses (-)</option>
                    </select>
                    <span className="hidden sm:flex items-center px-3 py-2 bg-slate-800 text-slate-400 rounded-xl text-sm whitespace-nowrap">
                        {processedTransactions.length} shown
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="min-w-full">
                    <thead className="bg-slate-900 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 select-none" onClick={() => requestSort('transaction_date')}>
                                Date {getSortIcon('transaction_date')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 select-none" onClick={() => requestSort('description')}>
                                Description {getSortIcon('description')}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 select-none" onClick={() => requestSort('amount')}>
                                Amount {getSortIcon('amount')}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Doc
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {processedTransactions.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-16 text-center text-slate-500 text-sm">
                                    {transactions.length === 0
                                        ? 'No transactions yet. Import a bank statement to get started.'
                                        : 'No transactions match your filter.'}
                                </td>
                            </tr>
                        ) : (
                            processedTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-white/3 transition-colors group">
                                    <td className="px-6 py-3.5 whitespace-nowrap text-sm text-slate-300 font-mono">
                                        {tx.transaction_date}
                                    </td>
                                    <td className="px-6 py-3.5 text-sm text-slate-300 max-w-xs">
                                        <span className="truncate block" title={tx.description}>{tx.description}</span>
                                    </td>
                                    <td className={`px-6 py-3.5 whitespace-nowrap text-sm text-right font-bold tabular-nums ${parseFloat(tx.amount) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        {parseFloat(tx.amount) < 0 ? '-' : '+'}${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {tx.receipt_path ? (
                                                <span title="Receipt linked" className="text-indigo-400">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                    </svg>
                                                </span>
                                            ) : (
                                                <span title="No document linked" className="text-slate-700">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </span>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }}
                                                className="text-slate-700 hover:text-red-400 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete transaction"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TransactionList;
