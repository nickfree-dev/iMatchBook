import React, { useState, useEffect } from 'react';
import api from '../services/api';

const PropertiesPage = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(null);
    const [formData, setFormData] = useState({ name: '', address: '', type: 'sfr', is_active: 1 });

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/backend/api/properties/index.php');
            if (data.success) setProperties(data.data);
        } catch (err) {
            console.error('Failed to fetch properties', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, []);

    const handleOpenModal = (property = null) => {
        if (property) {
            setIsEditing(property.id);
            setFormData({ name: property.name, address: property.address || '', type: property.type || 'sfr', is_active: property.is_active });
        } else {
            setIsEditing(null);
            setFormData({ name: '', address: '', type: 'sfr', is_active: 1 });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put('/backend/api/properties/index.php', { id: isEditing, ...formData });
            } else {
                await api.post('/backend/api/properties/index.php', formData);
            }
            setShowModal(false);
            fetchProperties();
        } catch (err) {
            alert('Failed to save property');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to archive this property?')) return;
        try {
            await api.delete(`/backend/api/properties/index.php?id=${id}`);
            fetchProperties();
        } catch (err) {
            alert('Failed to delete property');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Properties</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Manage your rental portfolio units and single-family homes.</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                    <span>➕</span> Add Property
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map(p => (
                    <div key={p.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-white/5 flex flex-col group hover:shadow-xl transition-all hover:-translate-y-1">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-3xl">🏠</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenModal(p)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-indigo-400">✏️</button>
                                <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-red-400">🗑️</button>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold mb-1 truncate">{p.name}</h3>
                        <p className="text-sm text-slate-400 mb-4 h-10 overflow-hidden line-clamp-2">{p.address || 'No address provided'}</p>
                        
                        <div className="mt-auto pt-4 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                            <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500">
                                {p.type === 'sfr' ? 'Single Family' : p.type === 'multi' ? 'Multi-Unit' : p.type === 'commercial' ? 'Commercial' : 'Other'}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Active
                            </div>
                        </div>
                    </div>
                ))}

                {properties.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-50 dark:bg-white/3 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 text-center">
                        <p className="text-slate-400 font-medium">No properties added yet. Start by adding your first rental unit.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-white/5 animate-in zoom-in-95 duration-300">
                        <h2 className="text-2xl font-bold mb-6">{isEditing ? 'Edit Property' : 'Add Property'}</h2>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Property Name</label>
                                <input 
                                    required
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
                                    placeholder="e.g. 123 Main St - Unit A"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Full Address</label>
                                <textarea 
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner h-24 resize-none"
                                    placeholder="City, State, Zip..."
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Property Type</label>
                                <select 
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner cursor-pointer"
                                    value={formData.type}
                                    onChange={e => setFormData({...formData, type: e.target.value})}
                                >
                                    <option value="sfr">🏠 Single Family Residence</option>
                                    <option value="multi">🏢 Multi-Unit / Apartment</option>
                                    <option value="commercial">🏪 Commercial / Office</option>
                                    <option value="other">📦 Other / Storage</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="flex-1 px-6 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-600 dark:text-slate-400"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                            >
                                {isEditing ? 'Update Property' : 'Create Property'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default PropertiesPage;
