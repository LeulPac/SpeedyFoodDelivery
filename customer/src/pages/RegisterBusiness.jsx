import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import {
  Truck,
  Storefront,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  ArrowRight,
  ArrowLeft,
  ArrowsClockwise,
  CreditCard,
  Sun,
  Moon,
  Sparkle,
  ForkKnife,
  Check,
  Building,
  Coffee,
  ImageSquare,
  Envelope,
  PaperPlaneTilt,
  Lock
} from '@phosphor-icons/react';

export default function RegisterBusiness() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(2); // Professional default
  const [plansLoading, setPlansLoading] = useState(true);

  // Form inputs
  const [form, setForm] = useState({
    business_name: '',
    business_type: 'Restaurant',
    owner_name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    description: '',
  });

  // Files for Logo & Cover
  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Verification state (when returning from Chapa)
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Handle image selections with preview
  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setPlansLoading(true);
        const res = await api.get('/subscriptions/plans');
        setPlans(res.data || []);
        if (res.data?.length > 0) {
          const pro = res.data.find((p) => p.name === 'Professional');
          setSelectedPlanId(pro ? pro.id : res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load plans', err);
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // Check URL query parameters for Chapa return
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const txRef = params.get('verify_subscription');

    if (txRef) {
      setVerifying(true);
      setStep(3);
      api.get(`/subscriptions/verify-subscription/${txRef}`)
        .then((res) => {
          setVerificationResult({
            success: true,
            message: res.data.message || 'Payment verified successfully! Welcome email sent to your inbox.',
            business: res.data.business,
          });
        })
        .catch((err) => {
          setVerificationResult({
            success: false,
            message: err.response?.data?.error || err.message || 'Payment verification failed.',
          });
        })
        .finally(() => {
          setVerifying(false);
        });
    }
  }, [location.search]);

  const validateStep1 = () => {
    const errs = {};
    if (!form.business_name.trim()) errs.business_name = 'Business name is required.';
    if (!form.owner_name.trim()) errs.owner_name = 'Owner/manager full name is required.';
    if (!form.email.trim() || !form.email.includes('@')) errs.email = 'Valid login email is required.';
    if (!form.password || form.password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (!form.phone.trim()) errs.phone = 'Contact phone number is required.';
    if (!form.address.trim()) errs.address = 'Physical business location is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextToPayment = (e) => {
    e.preventDefault();
    setError('');
    if (validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleProceedToChapa = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      Object.keys(form).forEach((k) => formData.append(k, form[k]));
      formData.append('plan_id', selectedPlanId);
      if (logoFile) formData.append('logo', logoFile);
      if (coverFile) formData.append('cover', coverFile);

      const res = await api.post('/businesses/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.checkout_url) {
        // Direct owner to Chapa payment gateway
        window.location.href = res.data.checkout_url;
      } else {
        setError(res.data?.error || 'Failed to initialize payment gateway.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col font-sans transition-theme">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-light)] transition-theme">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-[#FF8C33] flex items-center justify-center text-white shadow-md shadow-[#FF6B00]/25 group-hover:scale-105 transition">
              <Truck size={24} weight="fill" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight leading-none text-[var(--text-main)]">
                Speedy<span className="text-[#FF6B00]">Delivery</span>
              </span>
              <span className="text-[10px] tracking-wider font-semibold text-[var(--text-muted)] uppercase mt-0.5">
                Business Partner Registration
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[#FF6B00] transition shadow-sm"
            >
              {isDark ? <Sun size={20} weight="bold" /> : <Moon size={20} weight="bold" />}
            </button>
            <Link
              to="/"
              className="text-xs font-bold text-[var(--text-muted)] hover:text-[#FF6B00] px-3.5 py-2 rounded-xl border border-[var(--border-light)] transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        {/* Step Indicator */}
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
            <div className={`p-2.5 rounded-2xl border transition ${step === 1 ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]' : 'border-[var(--border-light)] text-[var(--text-muted)]'}`}>
              1. Business & Brand Photos
            </div>
            <div className={`p-2.5 rounded-2xl border transition ${step === 2 ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]' : 'border-[var(--border-light)] text-[var(--text-muted)]'}`}>
              2. Plan & Chapa Payment
            </div>
            <div className={`p-2.5 rounded-2xl border transition ${step === 3 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-[var(--border-light)] text-[var(--text-muted)]'}`}>
              3. Email Link & Confirmation
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* STEP 3: PAYMENT VERIFICATION & EMAIL NOTIFICATION (AFTER CHAPA) */}
        {/* ============================================================== */}
        {step === 3 ? (
          <div className="max-w-2xl mx-auto bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl p-8 sm:p-12 shadow-xl text-center space-y-6">
            {verifying ? (
              <div className="py-12 space-y-4">
                <ArrowsClockwise size={48} className="text-[#FF6B00] animate-spin mx-auto" />
                <h2 className="text-xl font-bold text-[var(--text-main)]">Verifying Payment with Chapa Gateway...</h2>
                <p className="text-xs text-[var(--text-muted)]">Please wait while we confirm your monthly subscription.</p>
              </div>
            ) : verificationResult?.success ? (
              <div className="space-y-6">
                <div className="w-20 h-20 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle size={48} weight="fill" />
                </div>
                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-emerald-500/15 text-emerald-500">
                    Registration & Payment Verified ✓
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">
                    Check Your Email Inbox!
                  </h1>
                  <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed">
                    SpeedyDelivery has generated your business credentials and dispatched an email with your <strong>Dedicated Owner Portal Link</strong>.
                  </p>
                </div>

                {/* Email Notification Card */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#FF6B00]/10 via-[var(--bg-page)] to-transparent border border-[#FF6B00]/30 text-left space-y-3 max-w-lg mx-auto shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center shrink-0 shadow-md">
                      <Envelope size={22} weight="fill" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[var(--text-main)]">Dedicated Link Sent Via Email</h4>
                      <p className="text-xs text-[var(--text-muted)]">Sent to: <span className="font-bold text-[#FF6B00]">{verificationResult.business?.email || form.email}</span></p>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed pt-2 border-t border-[var(--border-light)]/60">
                    Open your email and click the button or link inside. That personalized URL is unique and permanent to <strong>{verificationResult.business?.name || 'your business'}</strong>—use it anytime you want to manage menus, assign drivers, or accept incoming orders.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] text-left text-xs space-y-2 max-w-lg mx-auto">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Registered Business:</span>
                    <strong className="text-[var(--text-main)]">{verificationResult.business?.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Subscription Status:</span>
                    <strong className="text-emerald-500 font-bold uppercase">Paid & Active</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Next Step:</span>
                    <span className="text-[var(--text-main)]">Open email link to access your menu & drivers</span>
                  </div>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    to="/"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs shadow-lg shadow-[#FF6B00]/25 transition flex items-center justify-center gap-2"
                  >
                    <span>Return to SpeedyDelivery Home</span>
                    <ArrowRight size={16} weight="bold" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-20 h-20 rounded-full bg-rose-500/15 text-rose-500 flex items-center justify-center mx-auto">
                  <WarningCircle size={48} weight="fill" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-black text-[var(--text-main)]">Payment Not Confirmed</h1>
                  <p className="text-xs text-rose-500 max-w-md mx-auto">{verificationResult?.message}</p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-2xl bg-[#FF6B00] text-white font-bold text-xs"
                >
                  Retry Subscription Payment
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* STEPS 1 & 2: REGISTRATION FORM & PLAN SELECTION               */
          /* ============================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Value Proposition & Partner Benefits */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-8 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-sm space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00] text-xs font-bold uppercase tracking-wider">
                  <Sparkle size={14} weight="fill" />
                  <span>Fair Platform Partner Model</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] tracking-tight">
                  Keep 100% of Your Food Revenue.
                </h2>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  Join the premier multi-business marketplace in Addis Ababa. Zero hidden commissions on food. You get a direct, branded storefront, customer discovery, and your own dedicated management portal.
                </p>

                <div className="pt-2 border-t border-[var(--border-light)] space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <Check size={18} weight="bold" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-main)]">0% Commission on Dishes</h4>
                      <p className="text-[11px] text-[var(--text-muted)]">Pay only your predictable monthly subscription tier.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <Check size={18} weight="bold" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-main)]">Dedicated Owner Portal Link</h4>
                      <p className="text-[11px] text-[var(--text-muted)]">Sent straight to your email with a branded dashboard to control menus and couriers.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center shrink-0">
                      <Check size={18} weight="bold" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-main)]">Branded Storefront & Cover</h4>
                      <p className="text-[11px] text-[var(--text-muted)]">Upload your restaurant logo and appetizing banner photo for customers.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-2">
                <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5 text-xs">
                  <ShieldCheck size={18} className="text-blue-500" weight="bold" />
                  How to Access Your Console:
                </span>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  After payment through Chapa, SpeedyDelivery sends your <strong>unique owner link</strong> directly to your registered email. Check your inbox and click the link to begin setting up your dishes and drivers!
                </p>
              </div>
            </div>

            {/* Right Column: Multi-Step Interactive Form */}
            <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl p-6 sm:p-10 shadow-sm space-y-6">
              {error && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
                  <WarningCircle size={18} weight="fill" />
                  <span>{error}</span>
                </div>
              )}

              {/* STEP 1: BUSINESS PROFILE, CREDENTIALS & BRAND PHOTOS */}
              {step === 1 && (
                <form onSubmit={handleNextToPayment} className="space-y-5">
                  <div>
                    <h3 className="text-xl font-black text-[var(--text-main)]">Step 1: Business Profile & Photos</h3>
                    <p className="text-xs text-[var(--text-muted)]">Enter your food business details, brand photos & create owner credentials</p>
                  </div>

                  {/* Business Name & Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-main)]">Business Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Habesha Gourmet Grill"
                        value={form.business_name}
                        onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                      />
                      {fieldErrors.business_name && <p className="text-[10px] text-rose-500">{fieldErrors.business_name}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-main)]">Business Type *</label>
                      <select
                        value={form.business_type}
                        onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                      >
                        <option value="Restaurant">🍴 Restaurant</option>
                        <option value="Cafe">☕ Cafe & Bakery</option>
                        <option value="Hotel">🏨 Hotel Dining</option>
                        <option value="Fast Food">🍔 Fast Food / Snack Bar</option>
                      </select>
                    </div>
                  </div>

                  {/* Brand Photos: Logo & Cover */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)]">
                    {/* Logo Upload */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        <Storefront size={16} className="text-[#FF6B00]" weight="bold" />
                        Business Logo
                      </label>
                      <div className="flex items-center gap-3">
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-14 h-14 rounded-2xl object-cover border border-[#FF6B00] shadow-sm"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-dashed border-[var(--border-light)] flex items-center justify-center text-[var(--text-muted)]">
                            <ImageSquare size={22} />
                          </div>
                        )}
                        <label className="px-3 py-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] hover:border-[#FF6B00] text-[11px] font-bold text-[var(--text-main)] cursor-pointer transition">
                          <span>{logoFile ? 'Change Logo' : 'Upload Logo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)]">Square icon recommended (e.g. 400x400)</p>
                    </div>

                    {/* Cover Photo Upload */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
                        <ImageSquare size={16} className="text-[#FF6B00]" weight="bold" />
                        Storefront Cover Photo
                      </label>
                      <div className="flex items-center gap-3">
                        {coverPreview ? (
                          <img
                            src={coverPreview}
                            alt="Cover preview"
                            className="w-20 h-14 rounded-2xl object-cover border border-[#FF6B00] shadow-sm"
                          />
                        ) : (
                          <div className="w-20 h-14 rounded-2xl bg-[var(--bg-card)] border border-dashed border-[var(--border-light)] flex items-center justify-center text-[var(--text-muted)]">
                            <ImageSquare size={22} />
                          </div>
                        )}
                        <label className="px-3 py-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] hover:border-[#FF6B00] text-[11px] font-bold text-[var(--text-main)] cursor-pointer transition">
                          <span>{coverFile ? 'Change Cover' : 'Upload Cover'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCoverChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)]">Banner banner shown to customers (e.g. 1200x500)</p>
                    </div>
                  </div>

                  {/* Owner Full Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-main)]">Owner / Manager Full Name *</label>
                      <input
                        type="text"
                        placeholder="Your Full Name"
                        value={form.owner_name}
                        onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                      />
                      {fieldErrors.owner_name && <p className="text-[10px] text-rose-500">{fieldErrors.owner_name}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-main)]">Business Phone Number *</label>
                      <input
                        type="tel"
                        placeholder="0911002233"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                      />
                      {fieldErrors.phone && <p className="text-[10px] text-rose-500">{fieldErrors.phone}</p>}
                    </div>
                  </div>

                  {/* Login Email & Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-main)]">Login Email *</label>
                      <input
                        type="email"
                        placeholder="owner@yourkitchen.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                      />
                      {fieldErrors.email && <p className="text-[10px] text-rose-500">{fieldErrors.email}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-main)]">Console Password *</label>
                      <input
                        type="password"
                        placeholder="Min. 6 characters"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                      />
                      {fieldErrors.password && <p className="text-[10px] text-rose-500">{fieldErrors.password}</p>}
                    </div>
                  </div>

                  {/* Location & Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-main)]">Location / Address *</label>
                    <input
                      type="text"
                      placeholder="e.g. Bole Medhanialem, Next to Morning Star Mall, Addis Ababa"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                    />
                    {fieldErrors.address && <p className="text-[10px] text-rose-500">{fieldErrors.address}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-main)]">Short Description</label>
                    <textarea
                      rows={3}
                      placeholder="Specialty dishes, cuisine style, atmosphere..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-sm shadow-lg shadow-[#FF6B00]/25 transition flex items-center justify-center gap-2"
                  >
                    <span>Continue to Subscription Plan</span>
                    <ArrowRight size={18} weight="bold" />
                  </button>
                </form>
              )}

              {/* STEP 2: CHOOSE SUBSCRIPTION PLAN & CHAPA CHECKOUT */}
              {step === 2 && (
                <form onSubmit={handleProceedToChapa} className="space-y-6">
                  <div>
                    <h3 className="text-xl font-black text-[var(--text-main)]">Step 2: Monthly Subscription Plan</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Pay upfront via Chapa payment gateway. After payment, your unique console link is automatically emailed to you.
                    </p>
                  </div>

                  {/* Plan Cards */}
                  {plansLoading ? (
                    <div className="p-8 text-center text-[var(--text-muted)]">
                      <ArrowsClockwise size={24} className="animate-spin mx-auto" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {plans.map((p) => {
                        const isSelected = selectedPlanId === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPlanId(p.id)}
                            className={`p-5 rounded-2xl border cursor-pointer transition relative flex flex-col justify-between ${
                              isSelected
                                ? 'border-[#FF6B00] bg-[#FF6B00]/10 shadow-md ring-2 ring-[#FF6B00]'
                                : 'border-[var(--border-light)] bg-[var(--bg-page)] hover:border-[#FF6B00]/50'
                            }`}
                          >
                            {p.name === 'Professional' && (
                              <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#FF6B00] text-white tracking-wider">
                                Recommended
                              </span>
                            )}
                            <div className="space-y-2">
                              <h4 className="font-extrabold text-sm text-[var(--text-main)]">{p.name}</h4>
                              <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-[var(--text-main)]">ETB {Number(p.price).toLocaleString()}</span>
                                <span className="text-[10px] text-[var(--text-muted)]">/mo</span>
                              </div>
                              <ul className="text-[11px] text-[var(--text-muted)] space-y-1.5 pt-2 border-t border-[var(--border-light)]">
                                {p.features?.map((f, i) => (
                                  <li key={i} className="flex items-center gap-1.5">
                                    <Check size={12} className="text-[#FF6B00] shrink-0" weight="bold" />
                                    <span>{f}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs font-bold">
                              <span className={isSelected ? 'text-[#FF6B00]' : 'text-[var(--text-muted)]'}>
                                {isSelected ? 'Selected Plan' : 'Select'}
                              </span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#FF6B00] bg-[#FF6B00]' : 'border-[var(--border-light)]'}`}>
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Summary Box */}
                  {selectedPlan && (
                    <div className="p-5 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-muted)]">Selected Tier:</span>
                        <strong className="text-[var(--text-main)]">{selectedPlan.name} Plan</strong>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-muted)]">Billing Cycle:</span>
                        <span className="text-[var(--text-main)]">Monthly Recurring</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[var(--text-muted)]">Owner Portal Link:</span>
                        <span className="text-[#FF6B00] font-bold">Emailed automatically after payment</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-[var(--border-light)]">
                        <span className="text-[var(--text-main)]">Total Today (Chapa):</span>
                        <span className="text-[#FF6B00]">ETB {Number(selectedPlan.price).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/3 py-3.5 rounded-2xl border border-[var(--border-light)] hover:bg-[var(--bg-page)] font-bold text-xs text-[var(--text-main)] transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-2/3 py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-sm shadow-lg shadow-[#FF6B00]/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <ArrowsClockwise size={18} className="animate-spin" />
                          <span>Routing to Chapa...</span>
                        </>
                      ) : (
                        <>
                          <span>Pay ETB {selectedPlan ? Number(selectedPlan.price).toLocaleString() : ''} via Chapa</span>
                          <CreditCard size={18} weight="bold" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
