import React, { useState, useEffect } from 'react';
import { User, CreditCard, Bitcoin, Save, DollarSign } from 'lucide-react';

export default function Settings({ user, token, refreshUser }) {
  const [cryptoWallet, setCryptoWallet] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('crypto'); // crypto or bank
  const [isSaving, setIsSaving] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setCryptoWallet(user.crypto_wallet || '');
      setBankDetails(user.bank_details || '');
    }
  }, [user]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage('');
    setError('');
    
    try {
      const res = await fetch('http://localhost:3001/api/users/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ crypto_wallet: cryptoWallet, bank_details: bankDetails })
      });
      if (res.ok) {
        setMessage('Settings saved successfully!');
        await refreshUser();
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || isNaN(withdrawAmount) || withdrawAmount <= 0) return;
    
    setIsWithdrawing(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/payments/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(withdrawAmount), method: withdrawMethod })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setWithdrawAmount('');
        await refreshUser();
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <User className="text-primary" size={28} /> Account Settings
        </h1>
        <p className="text-gray-400 mt-2">Manage your payout methods and withdraw your balance.</p>
      </div>

      {message && <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 p-4 rounded-xl">{message}</div>}
      {error && <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 p-4 rounded-xl">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-700/50">
          <h2 className="text-xl font-bold text-white mb-6">Payout Details</h2>
          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-300 ml-1">Bank / Stripe Routing (Fiat)</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <CreditCard className="text-gray-500" size={18} />
                </div>
                <input
                  type="text"
                  className="w-full bg-surface border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  placeholder="e.g., account ending in 1234"
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 ml-1">Crypto Wallet Address (USDC/ETH)</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Bitcoin className="text-gray-500" size={18} />
                </div>
                <input
                  type="text"
                  className="w-full bg-surface border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all font-mono text-sm"
                  placeholder="0x..."
                  value={cryptoWallet}
                  onChange={(e) => setCryptoWallet(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 bg-surface hover:bg-gray-700 text-white border border-gray-600 transition-all disabled:opacity-50 mt-4"
            >
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save Details'}
            </button>
          </form>
        </div>

        {/* Withdraw Section */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-700/50 bg-primary/5">
          <h2 className="text-xl font-bold text-white mb-2">Withdraw Funds</h2>
          <p className="text-gray-400 text-sm mb-6">Current Balance: <span className="font-mono font-bold text-secondary">${user?.balance?.toFixed(2)}</span></p>
          
          <form onSubmit={handleWithdraw} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-300 ml-1">Withdraw Amount (USD)</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <DollarSign className="text-gray-500" size={18} />
                </div>
                <input
                  type="number"
                  required
                  min="5"
                  step="0.01"
                  max={user?.balance || 0}
                  className="w-full bg-surface border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white font-mono focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 ml-1 mb-2 block">Withdrawal Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWithdrawMethod('bank')}
                  className={`py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${withdrawMethod === 'bank' ? 'bg-primary/20 border-primary text-white' : 'bg-surface border-gray-700 text-gray-400 hover:text-gray-200'}`}
                >
                  <CreditCard size={18} /> Fiat / Bank
                </button>
                <button
                  type="button"
                  onClick={() => setWithdrawMethod('crypto')}
                  className={`py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${withdrawMethod === 'crypto' ? 'bg-primary/20 border-primary text-white' : 'bg-surface border-gray-700 text-gray-400 hover:text-gray-200'}`}
                >
                  <Bitcoin size={18} /> Crypto
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isWithdrawing || !withdrawAmount || withdrawAmount > user?.balance}
              className="w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all disabled:opacity-50 mt-4"
            >
              {isWithdrawing ? 'Processing...' : 'Confirm Withdrawal'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
