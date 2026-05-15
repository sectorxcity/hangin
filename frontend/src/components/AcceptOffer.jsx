import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, FileText, User, DollarSign } from 'lucide-react';

export default function AcceptOffer({ user, token, refreshUser }) {
  const { offerId } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:3001/api/offers/${offerId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setOffer(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [offerId]);

  const handleFund = async () => {
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
          title: offer.title,
          seller_username: offer.seller_name,
          amount: offer.amount
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

  if (loading) return <div className="text-center text-white py-20">Loading offer...</div>;
  if (error && !offer) return <div className="text-center text-rose-400 py-20">{error}</div>;

  const feeAmount = offer.amount * 0.05;
  const sellerReceives = offer.amount - feeAmount;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white mb-3">Accept Escrow Offer</h1>
        <p className="text-gray-400">Review the details and fund the escrow securely.</p>
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

        <div className="p-8 space-y-6">
          {error && <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-sm text-gray-400 flex items-center gap-2"><FileText size={16} /> Software Title</span>
              <p className="text-lg font-medium text-white">{offer.title}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-gray-400 flex items-center gap-2"><User size={16} /> Seller Username</span>
              <p className="text-lg font-medium text-white">@{offer.seller_name}</p>
            </div>
          </div>

          <div className="mt-8 bg-surface/50 rounded-xl p-6 border border-gray-700/30">
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Transaction Summary</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Total Payment (Locked in Escrow)</span>
                <span className="font-mono text-white">${offer.amount.toFixed(2)}</span>
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

          {user?.id === offer.seller_id ? (
            <div className="text-center p-4 bg-gray-800 rounded-xl text-gray-400 border border-gray-700">
              You cannot buy your own offer. Send this link to the buyer.
            </div>
          ) : user?.balance < offer.amount ? (
            <div className="space-y-4">
              <div className="text-center p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
                <p className="text-rose-400 font-medium">Insufficient Funds</p>
                <p className="text-gray-400 text-sm mt-1">Your available balance (${user?.balance?.toFixed(2) || '0.00'}) is less than the required ${offer.amount.toFixed(2)}.</p>
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full py-4 rounded-xl font-bold text-lg bg-surface border border-gray-600 hover:bg-gray-700 text-white transition-all shadow-lg flex justify-center items-center gap-2"
              >
                Go to Dashboard to Deposit
              </button>
            </div>
          ) : (
            <button
              onClick={handleFund}
              disabled={isSubmitting}
              className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center gap-2 transition-all shadow-lg
                ${isSubmitting ? 'bg-primary/50 text-white/50 cursor-not-allowed' : 
                  'bg-primary hover:bg-primary/90 text-white hover:shadow-primary/25'}`}
            >
              {isSubmitting ? 'Initiating Escrow...' : 'Fund Escrow Securely'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
