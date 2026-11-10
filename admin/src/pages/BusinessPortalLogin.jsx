import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api, { resolveAssetUrl } from '../api';
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
  EyeSlash,
  CheckCircle,
  ShieldCheck
} from '@phosphor-icons/react';

export default function BusinessPortalLogin() {
  const { portalCode } = useParams();
  const [business, setBusiness] = useState(null);
  const [fetchingBiz, setFetchingBiz] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!portalCode) {
      setFetchingBiz(false);
      return;
    }

    api.get(`/businesses/portal/${portalCode}`)
      .then((res) => {
        setBusiness(res.data);
        if (res.data.email) {
          setEmail(res.data.email);
        }
      })
      .catch((err) => {
        console.warn('Failed to load custom portal business:', err);
        setError('This portal link is invalid or no longer active.');
      })
      .finally(() => {
        setFetchingBiz(false);
      });
  }, [portalCode]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Authenticate strictly as business owner
      await login(email, password, 'owner');
      navigate('/', { replace: true });
    } catch (err) {
      if (err.message === 'wrong_role') {
        setError('Access denied: This portal is exclusively for business owners.');
      } else {
        setError(err.response?.data?.error || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative transition-theme">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition shadow-sm"
        >
          {isDark ? <Sun size={20} weight="bold" /> : <Moon size={20} weight="bold" />}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Dynamic Business Logo or Brand Icon */}
        <div className="flex justify-center">
          {business?.logo_url ? (
            <img
              src={resolveAssetUrl(business.logo_url)}
              alt={business.name}
              className="w-20 h-20 rounded-3xl object-cover shadow-lg border-2 border-[#FF6B00]/40 p-1 bg-[var(--bg-card)]"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#FF6B00] flex items-center justify-center text-white shadow-lg shadow-[#FF6B00]/30">
              <Storefront size={32} weight="fill" />
            </div>
          )}
        </div>

        {/* Dynamic Header */}
        <h2 className="mt-4 text-3xl font-black tracking-tight text-[var(--text-main)]">
          {fetchingBiz ? 'SpeedyDelivery' : business ? business.name : 'Business Owner Console'}
        </h2>
        
        <p className="mt-1 text-sm text-[var(--text-muted)] font-medium">
          {business
            ? `Dedicated Owner Portal • ${business.business_type || 'Restaurant'}`
            : 'Sign in with your registered owner credentials'}
        </p>

        {business && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-bold">
            <CheckCircle size={14} weight="fill" />
            <span>Verified Partner Workspace</span>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[var(--bg-card)] py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-[var(--border-light)] space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-3">
              <WarningCircle size={20} weight="bold" className="shrink-0" />
              <p className="font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleAuth}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Registered Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <Envelope size={18} weight="bold" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@restaurant.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-page)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[#FF6B00] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                  <Lock size={18} weight="bold" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-page)] text-[var(--text-main)] text-sm focus:outline-none focus:border-[#FF6B00] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-[#FF6B00] hover:bg-[#E05E00] shadow-lg shadow-[#FF6B00]/25 transition flex items-center justify-center gap-2 group disabled:opacity-50 cursor-pointer mt-2"
            >
              <span>{loading ? 'Entering Portal...' : `Sign In to ${business?.name || 'Console'}`}</span>
              <ArrowRight size={16} weight="bold" className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="pt-4 border-t border-[var(--border-light)] text-center text-xs text-[var(--text-muted)]">
            <p>
              Looking for general login?{' '}
              <a href="/login" className="text-[#FF6B00] font-bold hover:underline">
                Owner Login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
