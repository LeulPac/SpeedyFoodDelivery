import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  CreditCard,
  CheckCircle,
  WarningCircle,
  Clock,
  Sparkle,
  ArrowsClockwise,
  ShieldCheck,
  ArrowRight,
  Receipt,
  ForkKnife
} from '@phosphor-icons/react';

export default function BusinessSubscription() {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewLoading, setRenewLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/businesses/my/profile');
      setBusiness(res.data);
    } catch (err) {
      console.error('Failed to load business profile', err);
      setError('Unable to load subscription information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleRenew = async () => {
    setRenewLoading(true);
    try {
      const res = await api.post('/subscriptions/renew-subscription', {
        plan_id: business.subscription_plan_id,
      });
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        alert('Renewal initialized. Please complete payment.');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to initialize renewal payment.');
    } finally {
      setRenewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-[var(--text-muted)]">
        <ArrowsClockwise size={28} className="animate-spin" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-semibold">
        {error || 'No business found linked to this account.'}
      </div>
    );
  }

  const isExpired = business.subscription_expires_at && new Date(business.subscription_expires_at) < new Date();
  const isActive = business.subscription_status === 'active' && !isExpired;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
          Subscription & Billing
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Manage your monthly subscription tier, check quota limits, and renew billing
        </p>
      </div>

      {/* Plan Card */}
      <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-light)] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-[#FF6B00]">
                Current Tier
              </span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-black uppercase ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}
              >
                {isActive ? 'Active Plan' : isExpired ? 'Expired' : business.subscription_status}
              </span>
            </div>
            <h2 className="text-3xl font-black text-[var(--text-main)]">
              {business.plan_name || 'Standard'} Plan
            </h2>
          </div>

          <div className="text-right">
            <span className="text-3xl font-black text-[#FF6B00]">
              ETB {Number(business.plan_price || 0).toFixed(0)}
            </span>
            <span className="text-xs text-[var(--text-muted)] font-medium"> / month</span>
          </div>
        </div>

        {/* Status Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] space-y-1">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Menu Item Quota
            </span>
            <span className="text-lg font-black text-[var(--text-main)]">
              {business.menu_items_count} / {business.plan_max_menu_items || 25} items
            </span>
            <div className="w-full h-1.5 rounded-full bg-[var(--border-light)] overflow-hidden mt-2">
              <div
                className="h-full bg-[#FF6B00] rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    ((business.menu_items_count || 0) / (business.plan_max_menu_items || 25)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] space-y-1">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Subscription Start
            </span>
            <span className="text-sm font-bold text-[var(--text-main)]">
              {business.subscription_start_date
                ? new Date(business.subscription_start_date).toLocaleDateString()
                : 'Pending payment'}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] block">30-day monthly cycle</span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] space-y-1">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Renewal Due Date
            </span>
            <span className="text-sm font-bold text-[var(--text-main)]">
              {business.subscription_expires_at
                ? new Date(business.subscription_expires_at).toLocaleDateString()
                : 'Pending activation'}
            </span>
            <span className="text-[11px] text-emerald-500 font-semibold block">0% Food Commission</span>
          </div>
        </div>

        {/* Renewal Action */}
        <div className="pt-4 border-t border-[var(--border-light)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-muted)]">
            SpeedyDelivery collects fixed subscriptions from businesses and zero commission on your dishes.
          </p>

          <button
            onClick={handleRenew}
            disabled={renewLoading}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-sm shadow-md shadow-[#FF6B00]/25 transition flex items-center justify-center gap-2"
          >
            {renewLoading ? (
              <>
                <ArrowsClockwise size={18} className="animate-spin" />
                <span>Redirecting to Chapa...</span>
              </>
            ) : (
              <>
                <span>Renew Monthly Subscription</span>
                <ArrowRight size={18} weight="bold" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Payment History */}
      <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2">
          <Receipt size={22} className="text-[#FF6B00]" weight="bold" />
          <h3 className="text-lg font-black text-[var(--text-main)]">Billing & Payment History</h3>
        </div>

        {(!business.payment_history || business.payment_history.length === 0) ? (
          <p className="text-xs text-[var(--text-muted)] italic">No payment transactions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-light)] text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="pb-3 font-bold">Transaction Ref</th>
                  <th className="pb-3 font-bold">Plan</th>
                  <th className="pb-3 font-bold">Amount</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-main)]">
                {business.payment_history.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 font-mono font-medium">{p.payment_reference || `#${p.id}`}</td>
                    <td className="py-3 font-semibold">{p.plan_name || 'Standard'}</td>
                    <td className="py-3 font-black text-[#FF6B00]">ETB {Number(p.amount).toFixed(2)}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-[var(--text-muted)]">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

