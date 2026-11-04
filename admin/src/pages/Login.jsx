import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Truck,
  Lock,
  Envelope,
  WarningCircle,
  Sun,
  Moon,
  Storefront,
  ArrowRight,
  Eye,
  EyeSlash
} from '@phosphor-icons/react';

const roleHint = {
  admin: 'Super Admin credentials must only be used on the Platform Admin Portal (/admin/login).',
  customer: 'Customer accounts use the customer food ordering site (port 5173).',
  driver: 'Driver accounts use the courier driver mobile app (port 5175).',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // STRICT: Enforce that only business owners can authenticate through /login
      await login(email, password, 'owner');
      navigate('/', { replace: true });
    } catch (err) {
      if (err.message === 'wrong_role') {
        setError(roleHint[err.role] || 'Access denied: This login is exclusively reserved for registered Business Owners.');
      } else {
        setError(err.response?.data?.error || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col justify-center items-center p-4 relative transition-theme">
      {/* Top right theme toggle */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[#FF6B00] transition shadow-sm"
        >
          {isDark ? <Sun size={20} weight="bold" /> : <Moon size={20} weight="bold" />}
        </button>
      </div>

      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl p-8 sm:p-10 shadow-xl space-y-6 transition-theme">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF6B00] to-[#FF8C33] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#FF6B00]/25">
            <Truck size={30} weight="fill" />
          </div>
          <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
            Speedy<span className="text-[#FF6B00]">Delivery</span>
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-medium">
            Business Owner Console
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
            <WarningCircle size={18} weight="fill" />
            <span>{error}</span>
          </div>
        )}

        {/* Informative notice directing owner to enter registered credentials */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] space-y-1 text-xs">
          <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
            <Storefront size={16} className="text-[#FF6B00]" weight="bold" /> Business Partner Sign In:
          </span>
          <p className="text-[11px] text-[var(--text-muted)] pl-5 leading-relaxed">
            Please enter the <strong>Login Email</strong> and <strong>Password</strong> you created when registering your food business and completing your subscription.
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
              Registered Login Email
            </label>
            <div className="relative">
              <Envelope size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="email"
                placeholder="your-business-email@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF6B00] transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF6B00] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-sm shadow-lg shadow-[#FF6B00]/25 transition flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Owner Console'}</span>
            <ArrowRight size={18} weight="bold" />
          </button>
        </form>
      </div>
    </div>
  );
}
