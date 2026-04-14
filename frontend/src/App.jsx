import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TransactionList from './components/TransactionList'
import BankImport from './components/BankImport'
import CameraCapture from './components/CameraCapture'
import Dashboard from './pages/Dashboard'
import PropertiesPage from './pages/PropertiesPage'
import api from './services/api'

// Simple Layout wrapper
const Layout = ({ children, properties, selectedProperty, setSelectedProperty }) => {
    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
            <Sidebar 
                properties={properties} 
                selectedProperty={selectedProperty} 
                onPropertyChange={setSelectedProperty} 
            />
            <main className="flex-1 overflow-auto">
                <div className="max-w-[1400px] mx-auto min-h-full">
                    {children}
                </div>
            </main>
        </div>
    );
};

// Import page with sub-tabs
const ImportPage = () => {
    const [tab, setTab] = useState('bank');
    return (
        <div className="p-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Import Center</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Bring in your data via bank statements or receipt photos.</p>
                </div>
                <div className="bg-slate-200/50 dark:bg-white/5 p-1 rounded-xl flex gap-1">
                    <button 
                        onClick={() => setTab('bank')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'bank' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        🏦 Bank Import
                    </button>
                    <button 
                        onClick={() => setTab('receipt')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'receipt' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        📸 Receipt Capture
                    </button>
                </div>
            </div>
            {tab === 'bank' ? <BankImport /> : <CameraCapture />}
        </div>
    );
};

function App() {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('all');

  const fetchProperties = async () => {
    try {
        const { data } = await api.get('/backend/api/properties/index.php');
        if (data.success) setProperties(data.data);
    } catch (err) {
        console.error('Failed to fetch properties', err);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/dashboard" element={
            <Layout properties={properties} selectedProperty={selectedProperty} setSelectedProperty={setSelectedProperty}>
                <Dashboard selectedProperty={selectedProperty} />
            </Layout>
        } />

        <Route path="/transactions" element={
            <Layout properties={properties} selectedProperty={selectedProperty} setSelectedProperty={setSelectedProperty}>
                <div className="p-0 animate-in fade-in duration-500 h-screen flex flex-col">
                    <TransactionList globalPropertyFilter={selectedProperty} />
                </div>
            </Layout>
        } />

        <Route path="/import" element={
            <Layout properties={properties} selectedProperty={selectedProperty} setSelectedProperty={setSelectedProperty}>
                <ImportPage />
            </Layout>
        } />

        <Route path="/properties" element={
            <Layout properties={properties} selectedProperty={selectedProperty} setSelectedProperty={setSelectedProperty}>
                <PropertiesPage />
            </Layout>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
