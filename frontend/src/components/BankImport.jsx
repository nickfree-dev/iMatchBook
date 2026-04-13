// src/components/BankImport.jsx
import React, { useState } from 'react';
import api from '../services/api';

const BankImport = () => {
    const [uploading, setUploading] = useState(false);
    const [message, setMessage]     = useState(null);
    const [dragOver, setDragOver]   = useState(false);

    const handleUpload = async (file) => {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.csv')) {
            setMessage({ type: 'error', text: 'Only CSV files are supported. Please choose a .csv file.' });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setMessage(null);

        try {
            const { data } = await api.post('/backend/api/import_bank.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (data.success) {
                setMessage({ type: 'success', text: data.message });
            } else {
                setMessage({ type: 'error', text: data.message || 'Import failed.' });
            }
        } catch (error) {
            if (error.response?.status === 401) {
                setMessage({ type: 'error', text: 'Session expired. Please log in again.' });
            } else {
                setMessage({ type: 'error', text: 'Network error or server unavailable.' });
            }
        } finally {
            setUploading(false);
        }
    };

    const handleInputChange = (e) => {
        handleUpload(e.target.files[0]);
        e.target.value = null;
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        handleUpload(file);
    };

    return (
        <div className="max-w-xl mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Import Bank Statement</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Upload a CSV file exported from your bank.</p>
            </div>

            {/* Drop zone */}
            <label
                htmlFor="csv-file-input"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-52 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200
                    ${dragOver
                        ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                        : 'border-slate-300 dark:border-white/15 bg-white dark:bg-white/3 hover:border-indigo-600 dark:hover:border-indigo-500/50 hover:bg-slate-50 dark:hover:bg-indigo-500/5'
                    }
                    ${uploading ? 'pointer-events-none opacity-60' : ''}
                `}
            >
                <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleInputChange}
                    disabled={uploading}
                />
                {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                        <svg className="animate-spin h-8 w-8 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        <p className="text-indigo-300 text-sm font-medium">Importing transactions…</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3 text-center px-6">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-600/20 flex items-center justify-center">
                            <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-slate-900 dark:text-white font-semibold text-sm">
                                Drop your CSV here, or <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">browse</span>
                            </p>
                            <p className="text-slate-500 text-xs mt-1">Supports most bank export formats (Date, Description, Amount columns)</p>
                        </div>
                    </div>
                )}
            </label>

            {/* Feedback message */}
            {message && (
                <div className={`mt-4 flex items-start gap-3 p-4 rounded-xl text-sm border shadow-sm
                    ${message.type === 'success'
                        ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300'
                    }`}
                >
                    {message.type === 'success' ? (
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    )}
                    {message.text}
                </div>
            )}

            {/* Format hints */}
            <div className="mt-8 p-5 bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/8 rounded-2xl shadow-inner">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">Supported Format</p>
                <p className="text-slate-600 dark:text-slate-500 text-sm leading-relaxed">
                    The importer auto-detects columns containing <span className="text-slate-900 dark:text-slate-300 font-mono font-semibold">date</span>, 
                    <span className="text-slate-900 dark:text-slate-300 font-mono font-semibold">description</span>, and 
                    <span className="text-slate-900 dark:text-slate-300 font-mono font-semibold">amount</span> keywords. Works with most major banks.
                </p>
            </div>
        </div>
    );
};

export default BankImport;
