import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, Lock, ArrowRight } from 'lucide-react';

export default function Login({ setToken }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
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
            <div className="p-3 bg-primary/20 rounded-xl text-primary">
              <Shield size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
          <p className="text-gray-400 mt-2">Log in to manage your escrows</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/50 text-rose-400 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-300 ml-1">Username</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User className="text-gray-500" size={18} />
              </div>
              <input
                type="text"
                required
                className="w-full bg-surface border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                placeholder="Enter your username"
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
                className="w-full bg-surface border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg transition-all disabled:opacity-50 mt-4"
          >
            {isLoading ? 'Logging in...' : 'Sign In'}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-8">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:text-primary-100 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
