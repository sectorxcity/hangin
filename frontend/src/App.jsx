import React, { useState, useEffect } from 'react';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';

// Web3Modal Setup
const projectId = '299311dcc7837b2cde30a292a70c982f'; // User's WalletConnect Project ID

const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://cloudflare-eth.com'
};

const metadata = {
  name: 'Hangin',
  description: 'Hangin Escrow App',
  url: window.location.origin, // Needs to match where it's hosted, or wallets may reject it
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const ethersConfig = defaultConfig({
  metadata,
  enableEIP6963: true,
  enableInjected: true,
  enableCoinbase: true,
});

createWeb3Modal({
  ethersConfig,
  chains: [mainnet],
  projectId,
  enableAnalytics: true,
  featuredWalletIds: [
    'd01c0c169999908863673574c831d1678822d37c86518171120f2b3ec32e2d45' // Bybit Wallet
  ]
});
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Shield, LayoutDashboard, Send, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import CreateTransaction from './components/CreateTransaction';
import VerificationRoom from './components/VerificationRoom';
import Login from './components/Login';
import Register from './components/Register';
import Settings from './components/Settings';
import CreateOffer from './components/CreateOffer';
import AcceptOffer from './components/AcceptOffer';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetch('http://localhost:3001/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          handleLogout();
        } else {
          setCurrentUser(data);
        }
      })
      .catch(() => handleLogout())
      .finally(() => setLoadingUser(false));
    } else {
      setLoadingUser(false);
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setLoadingUser(false);
  };

  const refreshUser = async () => {
    if(token) {
      const res = await fetch('http://localhost:3001/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if(!data.error) setCurrentUser(data);
    }
  }

  if (loadingUser) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        {/* Navigation Bar */}
        <nav className="glass-panel sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <Shield className="h-8 w-8 text-primary" />
                <span className="font-bold text-xl tracking-tight text-white">Hangin<span className="text-primary">.</span></span>
              </div>
              
              {currentUser && (
                <>
                  <div className="flex items-center space-x-4">
                    <Link to="/" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                      <LayoutDashboard size={18} /> Dashboard
                    </Link>
                    <Link to="/offer/new" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                      <Send size={18} /> Create Offer
                    </Link>
                    <Link to="/settings" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2">
                      Settings
                    </Link>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="bg-surface rounded-full px-4 py-1 border border-gray-700 flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-secondary"></div>
                      <span className="text-sm text-gray-300">{currentUser.username}</span>
                      <span className="text-sm font-mono text-accent">${currentUser.balance?.toFixed(2)}</span>
                    </div>
                    <button onClick={handleLogout} className="text-gray-400 hover:text-rose-400 p-2 rounded-lg bg-surface border border-gray-700 transition-colors">
                      <LogOut size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/login" element={!token ? <Login setToken={setToken} /> : <Navigate to="/" />} />
            <Route path="/register" element={!token ? <Register setToken={setToken} /> : <Navigate to="/" />} />
            
            <Route path="/" element={token && currentUser ? <Dashboard user={currentUser} token={token} refreshUser={refreshUser} /> : <Navigate to="/login" />} />
            <Route path="/create" element={token && currentUser ? <CreateTransaction user={currentUser} token={token} refreshUser={refreshUser} /> : <Navigate to="/login" />} />
            <Route path="/offer/new" element={token && currentUser ? <CreateOffer user={currentUser} token={token} /> : <Navigate to="/login" />} />
            <Route path="/offer/:offerId" element={token && currentUser ? <AcceptOffer user={currentUser} token={token} refreshUser={refreshUser} /> : <Navigate to="/login" />} />
            <Route path="/settings" element={token && currentUser ? <Settings user={currentUser} token={token} refreshUser={refreshUser} /> : <Navigate to="/login" />} />
            <Route path="/verify/:transactionId" element={token && currentUser ? <VerificationRoom user={currentUser} token={token} refreshUser={refreshUser} /> : <Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
