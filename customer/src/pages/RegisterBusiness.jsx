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
  Coffee
} from '@phosphor-icons/react';

export default function RegisterBusiness() {
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const ownerPortalUrl = import.meta.env.VITE_OWNER_PORTAL_URL || 'http://localhost:5174';

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Verification state (when returning from Chapa)
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

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
            message: res.data.message || 'Payment verified successfully! Application forwarded to Administrator.',
            business: res.data.business,
          });
        })
        .catch((err) => {
          setVerificationResult({
            success: false,
            message: err.response?.data?.error || err.message || 'Payment verification failed with Chapa.',
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
      const res = await api.post('/businesses/register', {
        ...form,
        plan_id: selectedPlanId,
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
                Business Partner Portal
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
            <a
              href={ownerPortalUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-[var(--text-muted)] hover:text-[#FF6B00] px-3 py-2 rounded-xl border border-[var(--border-light)] transition hidden sm:inline-block"
            >
              Owner Console Sign In →
            </a>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        {/* Step Indicator */}
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
            <div className={`p-2.5 rounded-2xl border transition ${step === 1 ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]' : 'border-[var(--border-light)] text-[var(--text-muted)]'}`}>
              1. Business Details
            </div>
            <div className={`p-2.5 rounded-2xl border transition ${step === 2 ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]' : 'border-[var(--border-light)] text-[var(--text-muted)]'}`}>
              2. Plan & Chapa Payment
            </div>
            <div className={`p-2.5 rounded-2xl border transition ${step === 3 ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' : 'border-[var(--border-light)] text-[var(--text-muted)]'}`}>
              3. Admin Review & Live
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* STEP 3: PAYMENT VERIFICATION & ADMIN ROUTING (AFTER CHAPA)     */}
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
                    Payment Verified ✓
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">
                    Application Directed to Administrator!
                  </h1>
                  <p className="text-sm text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed">
                    Your monthly subscription has been successfully paid through Chapa. Your application is now in the priority review queue for the <strong>SpeedyDelivery Platform Administrator</strong>.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] text-left text-xs space-y-2 max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Business Name:</span>
                    <strong className="text-[var(--text-main)]">{verificationResult.business?.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Subscription Status:</span>
                    <strong className="text-emerald-500 font-bold uppercase">Paid (Under Review)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Next Step:</span>
                    <span className="text-[var(--text-main)]">Admin review & platform activation</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={ownerPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs shadow-lg shadow-[#FF6B00]/25 transition flex items-center justify-center gap-2"
                  >
                    <span>Open Owner Console</span>
                    <ArrowRight size={16} weight="bold" />
                  </a>
                  <Link
                    to="/"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] hover:border-[#FF6B00] text-[var(--text-main)] font-bold text-xs transition"
                  >
                    Return to Homepage
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
                <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                  Unlike traditional apps that take 20-30% of every order, SpeedyDelivery charges <strong>0% commission</strong> on your food sales. You only pay a flat monthly subscription tier.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={18} weight="bold" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-main)]">0% Commission on Orders</h4>
                      <p className="text-[11px] text-[var(--text-muted)]">Your food prices stay yours without hidden platform cuts.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Truck size={18} weight="bold" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-main)]">Own Courier Dispatch</h4>
                      <p className="text-[11px] text-[var(--text-muted)]">Create courier logins for your drivers and dispatch runs with live tracking.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck size={18} weight="bold" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-main)]">Verified Chapa Payments</h4>
                      <p className="text-[11px] text-[var(--text-muted)]">Telebirr, CBE Birr, and Bank Card payments directly verified server-side.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirement Notice */}
              <div className="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-2">
                <span className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <ShieldCheck size={18} className="text-blue-500" weight="bold" />
                  Onboarding & Approval Policy:
                </span>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  1. Complete your business details and create your owner account.<br />
                  2. Choose your subscription plan and complete the monthly payment via <strong>Chapa</strong>.<br />
                  3. Once your payment is verified, your registration request is immediately directed to the <strong>Platform Administrator</strong> for approval.
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

              {/* STEP 1: BUSINESS PROFILE & CREDENTIALS */}
              {step === 1 && (
                <form onSubmit={handleNextToPayment} className="space-y-5">
                  <div>
                    <h3 className="text-xl font-black text-[var(--text-main)]">Step 1: Business Profile</h3>
                    <p className="text-xs text-[var(--text-muted)]">Enter your food business details & create owner credentials</p>
                  </div>

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
                      Pay upfront via Chapa payment gateway. After payment, your request is forwarded to the Admin for approval.
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
                            className={`cursor-pointer p-5 rounded-2xl border flex flex-col justify-between transition ${
                              isSelected
                                ? 'border-[#FF6B00] bg-[#FF6B00]/10 ring-2 ring-[#FF6B00]'
                                : 'border-[var(--border-light)] bg-[var(--bg-page)] hover:border-[#FF6B00]/50'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-sm text-[var(--text-main)]">{p.name}</span>
                                {isSelected && <CheckCircle size={18} className="text-[#FF6B00]" weight="fill" />}
                              </div>
                              <div className="text-2xl font-black text-[#FF6B00]">
                                ETB {Number(p.price).toFixed(0)}
                                <span className="text-xs text-[var(--text-muted)] font-normal"> /mo</span>
                              </div>
                              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{p.description}</p>
                            </div>

                            <div className="pt-3 mt-3 border-t border-[var(--border-light)] space-y-1 text-[11px]">
                              <span className="font-bold text-[var(--text-main)] block">
                                Up to {p.max_menu_items} dishes
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)] block">
                                0% food order commission
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Selected Plan Review Box */}
                  <div className="p-5 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] space-y-3 text-xs">
                    <div className="flex items-center justify-between font-black text-sm text-[var(--text-main)]">
                      <span>Total Subscription Fee Due Now:</span>
                      <span className="text-lg text-[#FF6B00]">
                        ETB {Number(selectedPlan?.price || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] space-y-1 border-t border-[var(--border-light)] pt-2">
                      <p>• <strong>Payment Method:</strong> Chapa (Telebirr, CBE Birr, Debit/Credit Cards)</p>
                      <p>• <strong>Approval Workflow:</strong> Once verified by Chapa, your account is marked as <strong>Paid</strong> and sent directly to the Platform Administrator for final review.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="py-3.5 px-6 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-main)] font-bold text-xs hover:border-[#FF6B00] transition"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-4 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-sm shadow-lg shadow-[#FF6B00]/25 transition flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <ArrowsClockwise size={18} className="animate-spin" />
                          <span>Connecting to Chapa...</span>
                        </>
                      ) : (
                        <>
                          <span>Pay with Chapa & Submit to Admin</span>
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

