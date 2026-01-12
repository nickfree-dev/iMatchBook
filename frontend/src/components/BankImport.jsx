import React, { useState } from 'react';

const BankImport = () => {
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setMessage(null);

        try {
            const response = await fetch('http://localhost:8000/backend/api/import_bank.php', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: data.message });
            } else {
                setMessage({ type: 'error', text: data.message || 'Import failed.' });
            }
        } catch (error) {
            console.error('Error importing:', error);
            setMessage({ type: 'error', text: 'Network error or server unavailable.' });
        } finally {
            setUploading(false);
            // Reset input
            e.target.value = null; 
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-lg w-full max-w-md mx-auto mt-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Import Bank Transactions</h2>
            
            <p className="text-gray-500 mb-6 text-center text-sm">
                Upload a CSV file with columns: Date, Description, Amount.
            </p>

            <label className={`
                flex items-center justify-center w-full py-3 px-4 rounded-lg cursor-pointer transition-all duration-300
                ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}
                text-white font-semibold shadow-md
            `}>
                <span className="flex items-center gap-2">
                    {uploading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Importing...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Upload CSV
                        </>
                    )}
                </span>
                <input 
                    type="file" 
                    accept=".csv"
                    className="hidden" 
                    onChange={handleUpload}
                    disabled={uploading}
                />
            </label>

            {message && (
                <div className={`mt-4 p-4 rounded-lg w-full text-center text-sm font-medium 
                    ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                `}>
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default BankImport;
