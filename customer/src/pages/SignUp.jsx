import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GoogleSignIn from '../components/GoogleSignIn';
import {
  Sun, Moon, ArrowLeft, UserPlus, Lock, Envelope, User,
  CheckCircle, WarningCircle, Eye, EyeSlash,
} from '@phosphor-icons/react';

const roleHint = {
  owner: 'This Google account belongs to the restaurant owner. Please use the admin site.',
  driver: 'This Google account belongs to a driver. Please use the driver app.',
};

const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export default function SignUp() {
  const [name, setName]                     = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState({});
  // Top-level error (server / google)
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { registerWithEmail, loginWithGoogle } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from || '/';

  // ── Validate all fields and return a errors object ──────────────────────────
  const validate = () => {
    const errs = {};
    if (!name.trim())
      errs.name = 'Full name is required.';
    if (!email.trim())
      errs.email = 'Email address is required.';
    else if (!validateEmail(email))
      errs.email = 'Please enter a valid email address.';
    if (!password)
      errs.password = 'Password is required.';
    else if (password.length < 6)
      errs.password = 'Password must be at least 6 characters.';
    if (!confirmPassword)
      errs.confirm = 'Please confirm your password.';
    else if (password !== confirmPassword)
      errs.confirm = 'Passwords do not match.';
    return errs;
  };

  // Clear a specific field error when the user edits that field
  const clearField = (field) =>
    setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });

  // ── Email / password registration ───────────────────────────────────────────
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
      await registerWithEmail(name.trim(), email.trim(), password);
      setSuccess(true);
      setTimeout(() => navigate(from, { replace: true }), 800);
    } catch (err) {
      if (err.message === 'wrong_role') {
        setError('This account cannot be used on the customer site.');
        return;
      }
      const msg = err.response?.data?.error || err.message || '';
      // Surface duplicate-email as a field error
      if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('already registered')) {
        setFieldErrors({ email: 'An account with this email already exists. Try signing in instead.' });
      } else {
        setError(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google sign-up ──────────────────────────────────────────────────────────
  const handleGoogleSuccess = async (response) => {
    setError('');
    setFieldErrors({});
    try {
      await loginWithGoogle(response.credential || response.access_token ? { accessToken: response.access_token, credential: response.credential } : response);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.message === 'wrong_role') {
        setError(roleHint[err.role] || 'This Google account cannot be used on the customer site.');
        return;
      }
      setError(err.response?.data?.error || 'Google sign-up failed. Please try again.');
    }
  };

  // ── Shared input class helper ───────────────────────────────────────────────
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

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
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

      {/* ── Auth Card ───────────────────────────────────────────────────────── */}
      <div className="w-full max-w-md mx-auto my-6">
        <div className="bg-[#FFFFFF] dark:bg-[#1B222B] p-7 sm:p-9 rounded-3xl border border-[#DDD9D0] dark:border-[#303945] shadow-xl dark:shadow-2xl transition-theme">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-orange-500/20 to-amber-500/20 dark:from-orange-500/30 dark:to-amber-500/30 flex items-center justify-center mb-3 text-orange-500 border border-orange-500/20 shadow-inner">
              <UserPlus size={30} weight="duotone" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 text-slate-900 dark:text-white">
              Create Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Join SpeedyDelivery — order food and track delivery in real-time.
            </p>
          </div>

          {/* Top-level error banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl text-xs sm:text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-start gap-2">
              <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Success state */}
          {success && (
            <div className="mb-5 p-3.5 rounded-xl text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2">
              <CheckCircle size={16} weight="fill" className="shrink-0 text-emerald-500" />
              Account created! Redirecting…
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Full Name */}
            <div>
              <label htmlFor="su-name" className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="su-name"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. John Smith"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearField('name'); }}
                  className={inputClass('name')}
                  disabled={loading || success}
                />
              </div>
              <FieldError field="name" />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="su-email" className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Envelope size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="su-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearField('email'); }}
                  className={inputClass('email')}
                  disabled={loading || success}
                />
              </div>
              <FieldError field="email" />
              {/* Duplicate-email inline action */}
              {fieldErrors.email?.includes('already exists') && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Already registered?{' '}
                  <Link to="/login" state={{ from }} className="font-bold text-orange-600 dark:text-orange-400 hover:underline">
                    Sign in instead
                  </Link>
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="su-password" className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="su-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearField('password'); clearField('confirm'); }}
                  className={`${inputClass('password')} pr-10`}
                  disabled={loading || success}
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="su-confirm" className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="su-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Re-type your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearField('confirm'); }}
                  className={`${inputClass('confirm')} pr-10`}
                  disabled={loading || success}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeSlash size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <FieldError field="confirm" />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-2 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-md shadow-orange-500/25 transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating Account…
                </>
              ) : success ? (
                <>
                  <CheckCircle size={18} weight="bold" />
                  Account Created!
                </>
              ) : (
                <>
                  <CheckCircle size={18} weight="bold" />
                  Create Account
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
              Or sign up with
            </span>
          </div>

          {/* Google */}
          <div className="flex justify-center">
            <GoogleSignIn
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-up was cancelled or failed. Please try again.')}
            />
          </div>

          {/* Link to Sign In */}
          <div className="mt-6 pt-5 border-t border-[#DDD9D0] dark:border-[#303945] text-center text-xs sm:text-sm">
            <span className="text-[#555A5F] dark:text-[#C0BDB5]">Already have an account? </span>
            <Link
              to="/login"
              state={{ from }}
              className="font-bold text-orange-600 dark:text-orange-400 hover:underline"
            >
              Sign In
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
