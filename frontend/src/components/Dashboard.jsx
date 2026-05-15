import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, CheckCircle, ShieldCheck, Info, CreditCard, Bitcoin } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { BrowserProvider, ethers } from 'ethers';
import { useWeb3Modal, useWeb3ModalProvider, useWeb3ModalAccount } from '@web3modal/ethers/react';

// Stripe publishable key
const stripePromise = loadStripe('pk_test_51TX1BKFkgjw6GEMoIRYXrkwSJwNWFiYM844zwzz135DLcTKkzCKC8yl9dRkU6PUbkyHSkTe9SZ8vVIzOoTKxlqdJ00aBnOA0kU');

const DepositForm = ({ token, refreshUser, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [depositMethod, setDepositMethod] = useState('card'); // card or crypto
  const [cryptoCurrency, setCryptoCurrency] = useState('ETH'); // ETH or USDC
  const [cryptoStatus, setCryptoStatus] = useState('');

  const { open } = useWeb3Modal();
  const { isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();

  const handleDeposit = async (e) => {
    e.preventDefault();

    // If they just want to connect their wallet, don't block them if the amount is empty
    if (depositMethod === 'crypto' && !isConnected) {
      open();
      return;
    }

    if (!amount || isNaN(amount) || amount <= 0) return;
    
    if (depositMethod === 'card' && (!stripe || !elements)) return;
    
    setLoading(true);
    setError('');

    try {
      if (depositMethod === 'crypto') {
        setCryptoStatus(`Preparing ${cryptoCurrency} Deposit...`);
        const provider = new BrowserProvider(walletProvider);
        const signer = await provider.getSigner();
        
        // Mock PLATFORM_WALLET for frontend testnet
        const platformWallet = '0x1234567890123456789012345678901234567890';
        let txHash = '';

        if (cryptoCurrency === 'ETH') {
          // Mock oracle: 1 ETH = $3000 USD
          const ethAmount = (parseFloat(amount) / 3000).toFixed(6).toString();
          setCryptoStatus(`Sending ${ethAmount} ETH...`);
          
          const tx = await signer.sendTransaction({
            to: platformWallet,
            value: ethers.parseEther(ethAmount)
          });
          setCryptoStatus('Waiting for blockchain confirmation (this can take 15-30s)...');
          const receipt = await tx.wait();
          txHash = receipt.hash;
        } else if (cryptoCurrency === 'USDC') {
          // Dummy USDC ERC20 logic
          setCryptoStatus(`Sending ${amount} USDC...`);
          throw new Error("USDC deposits require an active Smart Contract deployment. Please use Native ETH for this demo.");
        }

        setCryptoStatus('Confirming securely with backend...');
        
        const confirmRes = await fetch('http://localhost:3001/api/payments/confirm-crypto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ txHash, currency: cryptoCurrency, usdAmount: parseFloat(amount) })
        });
        
        const data = await confirmRes.json();
        if(confirmRes.ok) {
          await refreshUser();
          onClose();
        } else {
          throw new Error(data.error || 'Failed to confirm crypto deposit on server');
        }
      } else {
        // Stripe flow
        const res = await fetch('http://localhost:3001/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ amount: parseFloat(amount) })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // Confirm Card Payment directly with Stripe (triggers 3D Secure if needed)
        const result = await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: cardholderName
            }
          }
        });

        if (result.error) {
          // e.g. 3D Secure failed, declined, insufficient funds
          throw new Error(result.error.message);
        }

        // Verification successful, tell backend to credit
        if (result.paymentIntent.status === 'succeeded') {
          const confirmRes = await fetch('http://localhost:3001/api/payments/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ paymentIntentId: result.paymentIntent.id, amount: parseFloat(amount) })
          });
          
          if(confirmRes.ok) {
            await refreshUser();
            onClose();
          } else {
            const confirmData = await confirmRes.json();
            throw new Error(confirmData.error || 'Failed to verify deposit');
          }
        }
      }
    } catch(err) {
      setError(err.message);
      setCryptoStatus('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleDeposit} className="space-y-4 mt-4">
      {error && <div className="text-rose-400 text-sm bg-rose-500/10 p-2 rounded">{error}</div>}
      
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => setDepositMethod('card')}
          className={`py-2 rounded-lg border text-sm font-medium transition-all ${depositMethod === 'card' ? 'bg-primary/20 border-primary text-white' : 'bg-surface border-gray-700 text-gray-400 hover:text-gray-200'}`}
        >
          Credit Card
        </button>
        <button
          type="button"
          onClick={() => setDepositMethod('crypto')}
          className={`py-2 rounded-lg border text-sm font-medium flex items-center justify-center gap-1 transition-all ${depositMethod === 'crypto' ? 'bg-primary/20 border-primary text-white' : 'bg-surface border-gray-700 text-gray-400 hover:text-gray-200'}`}
        >
          <Bitcoin size={16} /> Web3 Wallet
        </button>
      </div>

      <div>
        <label className="text-sm text-gray-300">Amount (USD)</label>
        <input 
          type="number" 
          required min="1" step="0.01"
          className="w-full bg-surface border border-gray-700 rounded-lg p-2 text-white mt-1"
          value={amount} onChange={e => setAmount(e.target.value)}
        />
      </div>

      {depositMethod === 'card' ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-300">Cardholder Name</label>
            <input 
              type="text" 
              required={depositMethod === 'card'}
              className="w-full bg-surface border border-gray-700 rounded-lg p-2 text-white mt-1"
              value={cardholderName} onChange={e => setCardholderName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="p-3 bg-surface border border-gray-700 rounded-lg">
            <CardElement options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#fff',
                  '::placeholder': { color: '#888' },
                },
              },
            }} />
          </div>
        </div>
      ) : (
        <div className="p-4 bg-surface border border-gray-700 rounded-lg text-center text-sm text-gray-400">
          <Bitcoin size={32} className="mx-auto mb-2 text-gray-500" />
          <div className="flex gap-2 justify-center mb-3">
            <button type="button" onClick={() => setCryptoCurrency('ETH')} className={`px-3 py-1 rounded border ${cryptoCurrency === 'ETH' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-gray-600'}`}>Native ETH</button>
            <button type="button" onClick={() => setCryptoCurrency('USDC')} className={`px-3 py-1 rounded border ${cryptoCurrency === 'USDC' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'border-gray-600'}`}>USDC Stablecoin</button>
          </div>
          <p>Deposit directly via {cryptoCurrency === 'ETH' ? 'Ethereum Testnet' : 'ERC20 Contract'}.</p>
          {cryptoStatus && <p className="text-emerald-400 mt-2 font-medium animate-pulse">{cryptoStatus}</p>}
        </div>
      )}

      <div className="flex gap-2 justify-end mt-6">
        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
        <button type="submit" disabled={loading || (depositMethod === 'card' && !stripe)} className="px-4 py-2 bg-secondary text-white rounded-lg font-bold disabled:opacity-50">
          {loading ? 'Processing...' : (depositMethod === 'crypto' ? (isConnected ? 'Sign Deposit' : 'Connect Wallet') : 'Deposit Funds')}
        </button>
      </div>
    </form>
  )
}


export default function Dashboard({ user, token, refreshUser }) {
  const [transactions, setTransactions] = useState([]);
  const [showDeposit, setShowDeposit] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/api/transactions/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if(!data.error) setTransactions(data);
    })
    .catch(console.error);
  }, [token]);

  const getStatusIcon = (status) => {
    switch(status) {
      case 'funded': return <ShieldCheck className="text-accent" size={20} />;
      case 'completed': return <CheckCircle className="text-secondary" size={20} />;
      default: return <Clock className="text-gray-400" size={20} />;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'funded': return <span className="px-3 py-1 text-xs font-medium bg-accent/10 text-accent rounded-full border border-accent/20">Awaiting Verification</span>;
      case 'completed': return <span className="px-3 py-1 text-xs font-medium bg-secondary/10 text-secondary rounded-full border border-secondary/20">Completed</span>;
      case 'refunded': return <span className="px-3 py-1 text-xs font-medium bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20">Refunded</span>;
      default: return <span className="px-3 py-1 text-xs font-medium bg-gray-500/10 text-gray-400 rounded-full border border-gray-500/20">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Deposit Modal */}
      {showDeposit && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
          <div className="glass-panel p-6 rounded-2xl w-full max-w-md border border-gray-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white flex items-center gap-2"><CreditCard /> Add Funds via Stripe</h3>
            <Elements stripe={stripePromise}>
              <DepositForm token={token} refreshUser={refreshUser} onClose={() => setShowDeposit(false)} />
            </Elements>
          </div>
        </div>
      )}

      {/* Intro Section */}
      <div className="glass-panel p-6 rounded-2xl border border-primary/20 bg-primary/5 flex items-start gap-4">
        <div className="p-3 bg-primary/20 rounded-xl text-primary mt-1">
          <Info size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">How Hangin Works</h2>
          <p className="text-gray-300 leading-relaxed text-sm">
            Hangin is a secure escrow platform designed to ensure trust and transparency in software and digital transactions. 
            Buyers deposit funds which are held securely by the platform. The seller then shares their screen live to verify the software works as promised. 
            Only after the buyer approves the software does the money release to the seller (minus a 5% fee). If the software is faulty or doesn't meet expectations, the buyer can cancel and instantly refund their money.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mt-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back, {user.username}</h1>
          <p className="text-gray-400 mt-1">Manage your secure software transactions.</p>
        </div>
        <div className="glass-panel px-6 py-4 rounded-xl text-right flex flex-col items-end">
          <p className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Available Balance</p>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowDeposit(true)}
              className="px-3 py-1 text-xs bg-surface border border-gray-600 rounded-lg hover:bg-gray-700 text-white transition-colors"
            >
              + Deposit
            </button>
            <p className="text-3xl font-mono font-bold text-secondary">${user.balance?.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden border border-gray-700/50">
        <div className="px-6 py-5 border-b border-gray-700/50 bg-surface/50">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            Recent Transactions
          </h3>
        </div>
        
        <div className="divide-y divide-gray-700/50">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No transactions yet. Create one to get started.</div>
          ) : (
            transactions.map((tx) => {
              const role = tx.buyer_id === user.id ? 'buyer' : 'seller';
              const otherParty = role === 'buyer' ? tx.seller_name : tx.buyer_name;
              return (
                <div key={tx.id} className="p-6 hover:bg-white/5 transition-colors duration-200 flex items-center justify-between group">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-surface border border-gray-700 shadow-sm mt-1">
                      {getStatusIcon(tx.status)}
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-100">{tx.title}</h4>
                      <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                        <span className={role === 'buyer' ? 'text-rose-400' : 'text-secondary'}>
                          {role === 'buyer' ? 'Buying from' : 'Selling to'}
                        </span>
                        <span className="font-medium text-gray-300">@{otherParty}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-lg font-mono font-bold text-white">${tx.amount.toFixed(2)}</p>
                      <div className="mt-1">{getStatusBadge(tx.status)}</div>
                    </div>
                    
                    <Link 
                      to={`/verify/${tx.id}`}
                      className="p-2 rounded-full bg-surface border border-gray-700 text-gray-400 hover:text-white hover:bg-primary/20 hover:border-primary/50 transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                    >
                      <ArrowRight size={20} />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
