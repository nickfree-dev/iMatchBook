import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ properties, selectedProperty, onPropertyChange }) => {
    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: '📊' },
        { name: 'Transactions', path: '/transactions', icon: '💳' },
        { name: 'Import', path: '/import', icon: '📥' },
        { name: 'Properties', path: '/properties', icon: '🏘️' },
    ];

    return (
        <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0 border-r border-white/5 shadow-2xl">
            {/* Logo */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-500/20">
                        i
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">MatchBook</h1>
                </div>
            </div>

            {/* Property Selector */}
            <div className="p-4 border-b border-white/5 bg-white/3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 px-2">
                    Current Portfolio
                </label>
                <select 
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer hover:bg-slate-750"
                    value={selectedProperty || 'all'}
                    onChange={(e) => onPropertyChange(e.target.value)}
                >
                    <option value="all">🏢 All Properties</option>
                    {properties.map(p => (
                        <option key={p.id} value={p.id}>🏠 {p.name}</option>
                    ))}
                </select>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group
                            ${isActive 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                        `}
                    >
                        <span className="text-base grayscale group-hover:grayscale-0 transition-all truncate">
                            {item.icon}
                        </span>
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            {/* User Profile / Settings (Placeholder) */}
            <div className="p-4 border-t border-white/5 mt-auto">
                <div className="flex items-center gap-3 px-2 py-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs">
                        Admin
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">Libre Developer</p>
                        <p className="text-[10px] text-slate-500 truncate">admin@imatchbook.dev</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
