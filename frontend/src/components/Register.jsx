import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, Lock, ArrowRight } from 'lucide-react';

export default function Register({ setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-gray-700/50 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-secondary/20 rounded-xl text-secondary">
              <Shield size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Create an Account</h2>
          <p className="text-gray-400 mt-2">Join Hangin to start secure transactions</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-300 ml-1">Username</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="text-gray-500" size={18} />
              </div>
              <input
                type="text"
                required
                className="w-full bg-surface border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="text-gray-500" size={18} />
              </div>
              <input
                type="password"
                required
                className="w-full bg-surface border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-secondary/50 focus:border-secondary outline-none transition-all"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 bg-secondary hover:bg-secondary/90 text-white shadow-lg shadow-secondary/20 transition-all disabled:opacity-50 mt-4"
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-secondary hover:text-secondary-100 font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
