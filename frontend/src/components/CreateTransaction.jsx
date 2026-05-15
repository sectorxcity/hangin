import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, FileText, DollarSign, User } from 'lucide-react';

export default function CreateTransaction({ user, token, refreshUser }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    sellerUsername: '',
    amount: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3001/api/transactions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          title: formData.title,
          seller_username: formData.sellerUsername,
          amount: parseFloat(formData.amount)
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create transaction');
      }

      await refreshUser();
      navigate(`/verify/${data.id}`);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const feeAmount = formData.amount ? (parseFloat(formData.amount) * 0.05) : 0;
  const sellerReceives = formData.amount ? (parseFloat(formData.amount) - feeAmount) : 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white mb-3">Initiate Secure Escrow</h1>
        <p className="text-gray-400">Funds will be securely held until you verify the software via screen share.</p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
        <div className="bg-primary/10 p-6 border-b border-primary/20 flex items-start gap-4">
          <div className="p-3 bg-primary/20 rounded-xl text-primary">
            <Shield size={24} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary-100">Buyer Protection Active</h3>
            <p className="text-sm text-primary-200/70 mt-1">
              Your payment is locked in our smart escrow. The seller only receives the funds after you confirm the software works exactly as described during the live verification session.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 ml-1">Software / Product Title</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FileText className="text-gray-500" size={18} />
              </div>
              <input
                type="text"
                required
                className="w-full bg-surface border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                placeholder="e.g., Custom Trading Algorithm Script"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Seller's Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="text-gray-500" size={18} />
                </div>
                <input
                  type="text"
                  required
                  className="w-full bg-surface border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  placeholder="username"
                  value={formData.sellerUsername}
                  onChange={(e) => setFormData({...formData, sellerUsername: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Agreed Price (USD)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <DollarSign className="text-gray-500" size={18} />
                </div>
                <input
                  type="number"
                  required
                  min="5"
                  step="0.01"
                  className="w-full bg-surface border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white font-mono focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="mt-8 bg-surface/50 rounded-xl p-6 border border-gray-700/30">
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Transaction Summary</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Total Payment (Locked in Escrow)</span>
                <span className="font-mono text-white">${formData.amount ? parseFloat(formData.amount).toFixed(2) : '0.00'}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Platform Fee (5% deducted on completion)</span>
                <span className="font-mono">-${feeAmount.toFixed(2)}</span>
              </div>
              <div className="pt-3 mt-3 border-t border-gray-700/50 flex justify-between font-medium">
                <span className="text-gray-300">Seller Receives</span>
                <span className="font-mono text-secondary">${sellerReceives.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !formData.amount || parseFloat(formData.amount) > (user?.balance || 0)}
            className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all shadow-lg
              ${isSubmitting ? 'bg-primary/50 text-white/50 cursor-not-allowed' : 
                parseFloat(formData.amount) > (user?.balance || 0) ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 
                'bg-primary hover:bg-primary/90 text-white hover:shadow-primary/25'}`}
          >
            {isSubmitting ? 'Initiating Escrow...' : 
             parseFloat(formData.amount) > (user?.balance || 0) ? 'Insufficient Funds' : 
             'Fund Escrow Securely'}
          </button>
        </form>
      </div>
    </div>
  );
}
