import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      if (user.role === 'owner') navigate('/admin');
      else if (user.role === 'driver') navigate('/driver');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="flex bg-gray-900 min-h-screen items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-xl max-w-md w-full border border-gray-700">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">Customer Login</h2>
        {error && <p className="bg-red-900 text-white p-3 rounded mb-4 text-center text-sm">{error}</p>}
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              required 
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              required 
            />
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold p-3 rounded transition shadow-lg mt-4">
            Sign In
          </button>
        </form>
        
        <p className="mt-6 text-center text-gray-400 text-sm">
          Don't have an account? <span className="text-blue-400 hover:underline cursor-pointer" onClick={() => navigate('/register')}>Sign up</span>
        </p>
      </div>
    </div>
  );
}
