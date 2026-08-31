import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GoogleSignIn from '../components/GoogleSignIn';
import {
  Sun, Moon, ArrowLeft, SignIn, Lock, Envelope,
  WarningCircle, Eye, EyeSlash,
} from '@phosphor-icons/react';

const roleHint = {
  owner: 'This Google account belongs to the restaurant owner. Please use the admin site.',
  driver: 'This Google account belongs to a driver. Please use the driver app.',
};

const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const { loginWithEmail, loginWithGoogle } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from || '/';

  const validate = () => {
    const errs = {};
    if (!email.trim())
      errs.email = 'Email address is required.';
    else if (!validateEmail(email))
      errs.email = 'Please enter a valid email address.';
    if (!password)
      errs.password = 'Password is required.';
    return errs;
  };

  const clearField = (field) =>
    setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.message === 'wrong_role') {
        setError('This account cannot be used on the customer site.');
        return;
      }
      const msg = err.response?.data?.error || err.message || '';
      setError(msg || 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response) => {
    setError('');
    setFieldErrors({});
    try {
      await loginWithGoogle(response.credential);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.message === 'wrong_role') {
        setError(roleHint[err.role] || 'This Google account cannot be used on the customer site.');
        return;
      }
      setError(err.response?.data?.error || 'Google sign-in failed. Please try again.');
    }
  };

  const inputClass = (field) =>
    `w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition ${
      fieldErrors[field]
        ? 'border-red-400 dark:border-red-500 bg-red-50/60 dark:bg-red-950/20 text-[#17191C] dark:text-[#F3F1EA] focus:ring-2 focus:ring-red-400/20'
        : 'border-[#DDD9D0] dark:border-[#303945] bg-[#EFEBE3] dark:bg-[#151A21] text-[#17191C] dark:text-[#F3F1EA] placeholder-[#777C80] dark:placeholder-[#92918C] focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
    }`;

  const FieldError = ({ field }) =>
    fieldErrors[field] ? (
      <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
        <WarningCircle size={13} weight="fill" /> {fieldErrors[field]}
      </p>
    ) : null;

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 transition-theme bg-[#F7F5F0] dark:bg-[#0F1318] text-[#17191C] dark:text-[#F3F1EA]">

      {/* Top bar */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-base hover:opacity-80 transition text-[#17191C] dark:text-[#F3F1EA]">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 font-black text-sm">
            S
          </span>
          <span className="font-extrabold tracking-tight">
            Speedy<span className="text-orange-500">Delivery</span>
          </span>
        </Link>
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Toggle theme"
          className="p-2 rounded-xl border border-[#DDD9D0] dark:border-[#303945] bg-[#EFEBE3] dark:bg-[#1B222B] text-[#555A5F] dark:text-[#C0BDB5] hover:border-orange-500 transition shadow-sm"
        >
          {isDark
            ? <Sun  size={18} weight="bold" className="text-amber-400" />
            : <Moon size={18} weight="bold" className="text-[#17191C]" />}
        </button>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md mx-auto my-6">
        <div className="bg-[#FFFFFF] dark:bg-[#1B222B] p-7 sm:p-9 rounded-3xl border border-[#DDD9D0] dark:border-[#303945] shadow-xl dark:shadow-2xl transition-theme">

          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center mb-3 text-orange-500 border border-orange-500/20 shadow-inner">
              <SignIn size={30} weight="duotone" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 text-slate-900 dark:text-white">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Sign in to your account to order food and track deliveries.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl text-xs sm:text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-start gap-2">
              <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Envelope size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearField('email'); }}
                  className={inputClass('email')}
                  disabled={loading}
                />
              </div>
              <FieldError field="email" />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearField('password'); }}
                  className={`${inputClass('password')} pr-10`}
                  disabled={loading}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlash size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <FieldError field="password" />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-md shadow-orange-500/25 transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Signing In…
                </>
              ) : (
                <>
                  <SignIn size={18} weight="bold" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#DDD9D0] dark:border-[#303945]" />
            </div>
            <span className="relative px-3 text-xs uppercase font-bold text-[#777C80] dark:text-[#92918C] bg-[#FFFFFF] dark:bg-[#1B222B]">
              Or continue with
            </span>
          </div>

          {/* Google */}
          <div className="flex justify-center">
            <GoogleSignIn
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in was cancelled or failed. Please try again.')}
            />
          </div>

          {/* Navigation to Sign Up */}
          <div className="mt-6 pt-5 border-t border-[#DDD9D0] dark:border-[#303945] text-center text-xs sm:text-sm">
            <span className="text-[#555A5F] dark:text-[#C0BDB5]">Don't have an account? </span>
            <Link
              to="/signup"
              state={{ from }}
              className="font-bold text-orange-600 dark:text-orange-400 hover:underline"
            >
              Create Account
            </Link>
          </div>

          <div className="mt-3 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <ArrowLeft size={14} /> Back to menu
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 py-2">
        SpeedyDelivery &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}
