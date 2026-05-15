import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, DollarSign, Link as LinkIcon, Copy, Check } from 'lucide-react';

export default function CreateOffer({ user, token }) {
  const [formData, setFormData] = useState({ title: '', amount: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offerLink, setOfferLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3001/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          title: formData.title,
          amount: parseFloat(formData.amount)
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setOfferLink(`${window.location.origin}/offer/${data.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(offerLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white mb-3">Create Shareable Offer</h1>
        <p className="text-gray-400">Generate a unique link to send to buyers. They can pay instantly and join the escrow.</p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
        {offerLink ? (
          <div className="p-10 text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
              <Check size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white">Offer Created!</h2>
            <p className="text-gray-400">Send this link to the buyer. Once they fund it, the transaction will appear on your dashboard.</p>
            
            <div className="flex items-center gap-2 bg-black/50 p-4 rounded-xl border border-gray-700">
              <LinkIcon className="text-gray-500" />
              <input readOnly value={offerLink} className="flex-1 bg-transparent text-white outline-none font-mono text-sm" />
              <button onClick={copyToClipboard} className="p-2 bg-surface hover:bg-gray-700 rounded-lg text-white transition-colors">
                {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
              </button>
            </div>
            
            <Link to="/" className="inline-block mt-4 text-primary hover:text-primary-100 font-medium">
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 px-4 py-3 rounded-lg text-sm">{error}</div>}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Software / Product Title</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FileText className="text-gray-500" size={18} />
                </div>
                <input
                  type="text" required
                  className="w-full bg-surface border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  placeholder="e.g., Custom Trading Algorithm Script"
                  value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
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
                  type="number" required min="5" step="0.01"
                  className="w-full bg-surface border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white font-mono focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  placeholder="0.00"
                  value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>

            <button
              type="submit" disabled={isSubmitting || !formData.amount}
              className="w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Generating Link...' : 'Create Offer Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
