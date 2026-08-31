import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const roleHint = {
  customer: 'Customer accounts use the main ordering site (port 5173).',
  driver: 'Driver accounts use the driver app (port 5175).',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      if (err.message === 'wrong_role') {
        setError(roleHint[err.role] || 'This account is not an owner.');
        return;
      }
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="bg-white p-8 rounded-lg max-w-sm w-full border" style={{ borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <span className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>●</span>
            <span className="text-lg font-bold">SpeedyDelivery</span>
          </div>
          <h2 className="text-xl font-bold">Owner Dashboard</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Sign in to manage your restaurant
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md text-sm text-center" style={{ backgroundColor: '#fef2f2', color: 'var(--color-error)', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md border text-sm outline-none transition focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md border text-sm outline-none transition focus:ring-2"
              style={{ borderColor: 'var(--color-border)' }}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-md text-sm font-semibold text-white transition"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
