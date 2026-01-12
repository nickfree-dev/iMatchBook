import React from 'react'
import CameraCapture from './components/CameraCapture'
import BankImport from './components/BankImport'
import TransactionList from './components/TransactionList'

function App() {
  const [activeTab, setActiveTab] = React.useState('capture');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-extrabold text-center text-blue-600 mb-8 tracking-tight">iMatchBook</h1>
        
        {/* Tabs */}
        <div className="flex justify-center mb-6 space-x-2">
            <button 
                onClick={() => setActiveTab('capture')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'capture' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
                Receipt Capture
            </button>
            <button 
                onClick={() => setActiveTab('import')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'import' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
                Bank Import
            </button>
            <button 
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'transactions' ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
                Transactions
            </button>
        </div>

        {/* Content */}
        <div className="transition-opacity duration-300 ease-in-out">
            {activeTab === 'capture' && <CameraCapture />}
            {activeTab === 'import' && <BankImport />}
            {activeTab === 'transactions' && <TransactionList />}
        </div>
      </div>
    </div>
  )
}

export default App
