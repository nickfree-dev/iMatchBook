import React, { useState } from 'react';
import api from '../services/api';

const CameraCapture = () => {
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [matches, setMatches] = useState([]);
    const [currentFile, setCurrentFile] = useState(null);

    const handleLink = async (transactionId, receiptPath) => {
        try {
            const { data } = await api.post('/backend/api/link_receipt.php', {
                transaction_id: transactionId,
                receipt_path: receiptPath
            });
            if (data.success) {
                setMessage({ type: 'success', text: 'Receipt linked successfully!' });
                setMatches([]);
            } else {
                alert(data.message || 'Linking failed');
            }
        } catch (error) {
            alert('Linking failed due to network error');
        }
    };

    const handleCapture = async (e, force = false) => {
        let file;
        if (e && e.target && e.target.files) {
            file = e.target.files[0];
        } else if (currentFile) {
            file = currentFile;
        }

        if (!file) return;

        // Preview - only refresh if new file from event
        if (e) {
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
            setCurrentFile(file);
        }

        const formData = new FormData();
        formData.append('image', file);
        if (force) {
            formData.append('force_process', 'true');
        }

        setUploading(true);
        setMessage(null);
        setMatches([]);

        try {
            const response = await api.post('/backend/api/upload.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const data = response.data;
            
            // --- Debug Logging ---
            console.group('🧾 Receipt Upload Debug');
            console.log('API Response:', data);
            if (data.debug_entities) {
                console.log('🤖 Raw AI Entities:', data.debug_entities);
            }
            console.groupEnd();
            // ---------------------

            if (data.success) {
                if (data.matches && data.matches.length > 0) {
                     // Store path for linking
                     const currentReceiptPath = data.data.image_path;
                     setMatches(data.matches.map(m => ({...m, receipt_path: currentReceiptPath})));
                }

                if (data.is_duplicate) {
                     setMessage({
                        type: 'info',
                        text: 'Duplicate Receipt Detected',
                        subtext: 'This image has already been processed previously.',
                        details: data.data,
                        canOverwrite: true // Custom flag for UI
                    });
                } else if (data.ai_error) {
                    setMessage({
                        type: 'warning',
                        text: 'Receipt saved, but AI failed.',
                        details: { error: data.ai_error }
                    });
                } else {
                    setMessage({ 
                        type: 'success', 
                        text: 'Receipt processed!',
                        details: data.data 
                    });
                }
            } else {
                setMessage({ type: 'error', text: data.message || 'Upload failed.' });
            }
        } catch (error) {
            console.error('Error uploading:', error);
            setMessage({ type: 'error', text: 'Network error or server unavailable.' });
        } finally {
            setUploading(false);
        }
    };

    const getFriendlyErrorMessage = (errorObj) => {
        let rawError = errorObj;
        
        // Try to parse if it's a JSON string disguised as a message
        if (typeof errorObj === 'string') {
            try {
                const jsonMatch = errorObj.match(/\{.*\}/s);
                if (jsonMatch) {
                    rawError = JSON.parse(jsonMatch[0]);
                } else {
                    rawError = { message: errorObj };
                }
            } catch (e) {
                rawError = { message: errorObj };
            }
        }

        const errString = JSON.stringify(rawError);

        if (errString.includes('BILLING_DISABLED')) {
            return {
                title: 'Billing Required',
                message: 'The AI processor cannot run because billing is disabled on the Google Cloud project. Please report this to the system administrator.',
                action: 'Enable billing in Google Cloud Console.'
            };
        }
        
        if (errString.includes('PERMISSION_DENIED') || errString.includes('IAM_PERMISSION_DENIED')) {
            return {
                title: 'Permission Denied',
                message: 'The system does not have permission to access the AI processor. The service account may need the "Document AI Processor Editor" role.',
                action: 'Check IAM roles for the service account.'
            };
        }

        if (errString.includes('RESOURCE_EXHAUSTED') || errString.includes('QUOTA_EXCEEDED')) {
            return {
                title: 'Quota Exceeded',
                message: 'The daily or minute usage limit for the AI service has been reached.',
                action: 'Try again later or increase quota.'
            };
        }

         if (errString.includes('UNAUTHENTICATED')) {
            return {
                title: 'Authentication Failed',
                message: 'The system could not authenticate with Google Cloud. The API key file may be missing or invalid.',
                action: 'Verify server credentials.'
            };
        }

        return {
            title: 'AI Processing Failed',
            message: 'An unexpected error occurred while analyzing the receipt.',
            action: 'Please try again manually or contact support.'
        };
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl dark:shadow-2xl w-full max-w-md mx-auto mt-10 transition-all duration-300">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Capture Receipt</h2>

            <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden mb-6 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-white/10 transition-colors duration-300">
                {preview ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                    <div className="text-slate-400 dark:text-slate-500 flex flex-col items-center">
                        <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>No image captured</span>
                    </div>
                )}
            </div>

            <label className={`
                flex items-center justify-center w-full py-3 px-4 rounded-xl cursor-pointer transition-all duration-300
                ${uploading 
                    ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed text-slate-500 dark:text-slate-600' 
                    : 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-lg shadow-indigo-600/20 dark:shadow-indigo-900/40'
                }
                font-semibold
            `}>
                <span className="flex items-center gap-2">
                    {uploading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Take Photo
                        </>
                    )}
                </span>
                <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    onChange={handleCapture}
                    disabled={uploading}
                />
            </label>
            
            {/* Matches UI */}
            {matches.length > 0 && (
                <div className="mt-8 w-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-5 shadow-inner">
                    <h3 className="font-bold text-indigo-900 dark:text-indigo-400 mb-3 text-sm uppercase tracking-wider">Possible Bank Matches</h3>
                    <ul className="space-y-3">
                        {matches.map(m => (
                            <li key={m.id} className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-white/5 flex justify-between items-center text-sm transition-all hover:border-indigo-300 dark:hover:border-indigo-500/30">
                                <div className="min-w-0">
                                    <div className="font-bold text-slate-900 dark:text-slate-200">{m.transaction_date}</div>
                                    <div className="text-slate-500 dark:text-slate-400 truncate w-40 font-medium" title={m.description}>{m.description}</div>
                                    <div className={`font-mono font-bold mt-1 ${parseFloat(m.amount) < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>${m.amount}</div>
                                </div>
                                <button 
                                    onClick={() => handleLink(m.id, m.receipt_path)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                                >
                                    Link
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {message && (
                <div className={`mt-6 p-5 rounded-2xl w-full text-center text-sm font-medium border shadow-sm transition-all duration-300
                    ${message.type === 'success' ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300' : ''}
                    ${message.type === 'error' ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300' : ''}
                    ${message.type === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-300' : ''}
                    ${message.type === 'info' ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-900 dark:text-indigo-300' : ''}
                `}>
                    <p className="font-bold text-lg mb-1">{message.text}</p>
                    {message.subtext && <p className="text-gray-600 mb-2">{message.subtext}</p>}
                    
                    {/* Process Anyway Button for Duplicates */}
                    {message.canOverwrite && (
                        <button 
                            onClick={() => handleCapture(null, true)}
                            className="mt-2 mb-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm transition-all text-xs uppercase tracking-wide"
                        >
                            Process Anyway
                        </button>
                    )}
                    
                    {message.details && !message.details.error && (
                        <div className="text-left bg-slate-100/50 dark:bg-white/5 p-4 rounded-xl mt-3 space-y-1.5 text-sm border border-slate-200/50 dark:border-white/5">
                            <p className="text-slate-700 dark:text-slate-300"><strong className="text-slate-900 dark:text-white">Merchant:</strong> {message.details.merchant_name || 'Not detected'}</p>
                            <p className="text-slate-700 dark:text-slate-300"><strong className="text-slate-900 dark:text-white">Date:</strong> {message.details.date || 'Not detected'}</p>
                            <p className="text-slate-700 dark:text-slate-300"><strong className="text-slate-900 dark:text-white">Total:</strong> ${message.details.total || '0.00'}</p>

                            {(message.details.payment_type || message.details.invoice_number || message.details.address || message.details.line_items_count > 0) && (
                                <div className="mt-2 pt-2 border-t border-blue-200">
                                    {message.details.payment_type && (
                                        <p><strong>Payment:</strong> {message.details.payment_type} {message.details.card_last_4 ? `(*${message.details.card_last_4})` : ''}</p>
                                    )}
                                    {message.details.invoice_number && (
                                        <p><strong>Invoice #:</strong> {message.details.invoice_number}</p>
                                    )}
                                    {message.details.address && (
                                        <p className="line-clamp-2"><strong>Addr:</strong> {message.details.address}</p>
                                    )}
                                    {message.details.line_items_count > 0 && (
                                        <p><strong>Items:</strong> {message.details.line_items_count} found</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {message.details && message.details.error && (
                        <div className="text-left bg-white p-3 rounded mt-2 border border-amber-100">
                             {(() => {
                                const friendly = getFriendlyErrorMessage(message.details.error);
                                return (
                                    <>
                                        <div className="flex items-center gap-2 mb-1 text-amber-700 font-bold">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            {friendly.title}
                                        </div>
                                        <p className="text-gray-700 mb-2">{friendly.message}</p>
                                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Suggested Action:</p>
                                        <p className="text-gray-600 italic">{friendly.action}</p>
                                    </>
                                );
                             })()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CameraCapture;
