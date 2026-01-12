import React, { useEffect, useState, useMemo } from 'react';

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
        try {
            const response = await fetch('http://localhost:8000/backend/api/get_bank_transactions.php');
            const data = await response.json();
            if (data.success) {
                setTransactions(data.data);
            } else {
                setError(data.error || 'Failed to fetch transactions');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this transaction?')) return;
        try {
            const response = await fetch('http://localhost:8000/backend/api/delete_transaction.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await response.json();
            if (data.success) {
                setTransactions(transactions.filter(t => t.id !== id));
            } else {
                alert(data.message || 'Delete failed');
            }
        } catch (err) {
            alert('Delete failed due to network error');
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Are you sure you want to delete ALL transactions? This cannot be undone.')) return;
        try {
            const response = await fetch('http://localhost:8000/backend/api/delete_transaction.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear_all' })
            });
            const data = await response.json();
            if (data.success) {
                setTransactions([]);
            } else {
                alert(data.message || 'Clear failed');
            }
        } catch (err) {
            alert('Clear failed due to network error');
        }
    };

    // Sorting Helper
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Derived State: Filtered & Sorted Data
    const processedTransactions = useMemo(() => {
        let data = [...transactions];

        // 1. Search (Description)
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(t => 
                t.description.toLowerCase().includes(lowerTerm)
            );
        }

        // 2. Filter (Type)
        if (filterType !== 'all') {
            data = data.filter(t => {
                const amount = parseFloat(t.amount);
                if (filterType === 'income') return amount > 0;
                if (filterType === 'expense') return amount < 0; // Assuming 0 is neither or handled
                return true;
            });
        }

        // 3. Sort
        if (sortConfig.key) {
            data.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Numeric sort for Amount and ID
                if (sortConfig.key === 'amount' || sortConfig.key === 'id') {
                    aValue = parseFloat(aValue);
                    bValue = parseFloat(bValue);
                } 
                // Date sort
                else if (sortConfig.key === 'transaction_date') {
                    aValue = new Date(aValue);
                    bValue = new Date(bValue);
                }
                // String sort for description
                else {
                    aValue = aValue.toString().toLowerCase();
                    bValue = bValue.toString().toLowerCase();
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return data;
    }, [transactions, searchTerm, filterType, sortConfig]);


    useEffect(() => {
        fetchTransactions();
    }, []);

    // Helper for Sort Icons
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <span className="ml-1 text-gray-300">↕</span>;
        return sortConfig.direction === 'asc' 
            ? <span className="ml-1 text-blue-600">↑</span> 
            : <span className="ml-1 text-blue-600">↓</span>;
    };

    if (loading) return <div className="text-center p-4 text-gray-500">Loading transactions...</div>;
    if (error) return <div className="text-center p-4 text-red-500">{error}</div>;

    const totalAmount = processedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return (
        <div className="w-full max-w-5xl mx-auto mt-6 bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-[80vh]">
            {/* Header / Controls */}
            <div className="p-4 border-b bg-gray-50 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">
                        Transactions 
                        <span className="ml-2 text-sm font-normal text-gray-500">({processedTransactions.length})</span>
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={fetchTransactions} className="text-blue-600 hover:text-blue-800 text-sm font-semibold px-3 py-1 rounded hover:bg-blue-50">
                            Refresh
                        </button>
                        {transactions.length > 0 && (
                            <button onClick={handleClearAll} className="text-red-600 hover:text-red-800 text-sm font-semibold px-3 py-1 rounded hover:bg-red-50 border border-red-200">
                                Clear All
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                        type="text" 
                        placeholder="Search description..." 
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    
                    <select 
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="all">All Types</option>
                        <option value="income">Income (+)</option>
                        <option value="expense">Expenses (-)</option>
                    </select>

                     <div className="px-4 py-2 bg-blue-50 text-blue-800 rounded-lg font-semibold whitespace-nowrap">
                        Total: ${totalAmount.toFixed(2)}
                    </div>
                </div>
            </div>
            
            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200 relative">
                    <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th 
                                className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none"
                                onClick={() => requestSort('transaction_date')}
                            >
                                Date {getSortIcon('transaction_date')}
                            </th>
                            <th 
                                className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none"
                                onClick={() => requestSort('description')}
                            >
                                Description {getSortIcon('description')}
                            </th>
                            <th 
                                className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none"
                                onClick={() => requestSort('amount')}
                            >
                                Amount {getSortIcon('amount')}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {processedTransactions.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                    {transactions.length === 0 ? "No transactions found." : "No matching transactions."}
                                </td>
                            </tr>
                        ) : (
                            processedTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tx.transaction_date}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate" title={tx.description}>{tx.description}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${parseFloat(tx.amount) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        ${parseFloat(tx.amount).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2 items-center">
                                        {tx.receipt_path && (
                                            <span title="Receipt Linked" className="text-gray-500 cursor-help">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                                </svg>
                                            </span>
                                        )}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }} 
                                            className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-all"
                                            title="Delete"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
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
