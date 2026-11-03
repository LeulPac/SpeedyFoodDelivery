import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import {
  CurrencyDollar,
  Receipt,
  Truck,
  Storefront,
  Users,
  Package,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
  ShieldCheck,
  TrendUp,
  ArrowRight
} from '@phosphor-icons/react';

export default function PlatformOverview() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/metrics');
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-[var(--text-muted)]">
        <ArrowsClockwise size={28} className="animate-spin" />
      </div>
    );
  }

  const fin = metrics?.financials || {};
  const ops = metrics?.operations || {};

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
            Platform Financials & Operations
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Platform revenue from business subscriptions & driver delivery platform fees (0% food commission model)
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] hover:border-[#FF6B00] text-xs font-bold text-[var(--text-main)] transition flex items-center gap-1.5"
        >
          <ArrowsClockwise size={16} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Pending Approvals Alert Banner */}
      {ops.pending_approvals > 0 && (
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold shrink-0">
              <Storefront size={24} weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-500">
                  Action Required
                </span>
                <h4 className="text-sm font-bold text-[var(--text-main)]">
                  {ops.pending_approvals} Business Application(s) Paid & Awaiting Review
                </h4>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                New partner businesses have paid their monthly subscription fee via Chapa and are waiting for your approval to go live.
              </p>
            </div>
          </div>
          <Link
            to="/admin/businesses?tab=pending"
            className="px-4 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold shadow-md shadow-[#FF6B00]/25 transition whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>Review Applications</span>
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5-STREAM FINANCIAL BREAKDOWN                                  */}
      {/* ============================================================== */}
      <div className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
          SpeedyDelivery Revenue Streams
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Actual Platform Collected Revenue */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#FF6B00] to-[#E05E00] text-white shadow-lg shadow-[#FF6B00]/25 space-y-2">
            <div className="flex items-center justify-between opacity-90">
              <span className="text-xs font-bold uppercase tracking-wider">Total Platform Revenue</span>
              <CurrencyDollar size={22} weight="bold" />
            </div>
            <div className="text-3xl font-black">
              ETB {Number(fin.platform_actual_collected_revenue || 0).toFixed(2)}
            </div>
            <p className="text-[11px] opacity-80 leading-tight">
              Subscriptions collected + Driver fees collected
            </p>
          </div>

          {/* 2. Business Subscriptions Collected */}
          <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[var(--text-muted)]">
              <span className="text-xs font-bold uppercase tracking-wider">1. Business Subscriptions</span>
              <Receipt size={22} className="text-[#FF6B00]" weight="bold" />
            </div>
            <div className="text-2xl font-black text-[var(--text-main)]">
              ETB {Number(fin.business_subscription_revenue || 0).toFixed(2)}
            </div>
            <p className="text-[11px] text-emerald-500 font-semibold">
              Verified monthly subscription payments
            </p>
          </div>

          {/* 3. Driver Fees Collected */}
          <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[var(--text-muted)]">
              <span className="text-xs font-bold uppercase tracking-wider">2. Driver Fees Collected</span>
              <CheckCircle size={22} className="text-emerald-500" weight="bold" />
            </div>
            <div className="text-2xl font-black text-emerald-500">
              ETB {Number(fin.driver_fees_collected || 0).toFixed(2)}
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Accrued: ETB {Number(fin.driver_fees_accrued || 0).toFixed(2)}
            </p>
          </div>

          {/* 4. Outstanding Driver Fees */}
          <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[var(--text-muted)]">
              <span className="text-xs font-bold uppercase tracking-wider">3. Outstanding Driver Fees</span>
              <WarningCircle size={22} className="text-amber-500" weight="bold" />
            </div>
            <div className="text-2xl font-black text-amber-500">
              ETB {Number(fin.driver_fees_outstanding || 0).toFixed(2)}
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Fees due from couriers for completed runs
            </p>
          </div>
        </div>

        {/* 5. Food Order Value (GMV) Callout - Explicitly distinguished */}
        <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-blue-500/20 bg-blue-500/5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ForkKnife size={22} className="text-blue-500" weight="bold" />
              <span className="font-bold text-sm text-[var(--text-main)]">
                Restaurant Food Sales Volume (GMV)
              </span>
            </div>
            <span className="text-2xl font-black text-blue-500">
              ETB {Number(fin.food_order_value || 0).toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] border-t border-blue-500/10 pt-2">
            ⚠️ <strong>Platform Business Rule:</strong> Food order value belongs 100% to participating restaurants, cafes, and hotels. SpeedyDelivery charges <strong>0% commission</strong> on food and drinks. This amount is strictly separated from platform revenue.
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* OPERATIONAL METRICS                                            */}
      {/* ============================================================== */}
      <div className="space-y-4">
        <h2 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
          Operational Statistics
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-1">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Registered Businesses
            </span>
            <div className="text-2xl font-black text-[var(--text-main)]">
              {ops.total_businesses || 0}
            </div>
            <span className="text-[11px] text-emerald-500 font-semibold block">
              {ops.active_subscriptions || 0} Active Subscriptions
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-1">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Registered Couriers
            </span>
            <div className="text-2xl font-black text-[var(--text-main)]">
              {ops.total_drivers || 0}
            </div>
            <span className="text-[11px] text-[var(--text-muted)] block">
              Business delivery teams
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-1">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Completed Deliveries
            </span>
            <div className="text-2xl font-black text-[#FF6B00]">
              {ops.total_completed_deliveries || 0}
            </div>
            <span className="text-[11px] text-[var(--text-muted)] block">
              Fixed fee accrued per delivery
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-1">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Customer Accounts
            </span>
            <div className="text-2xl font-black text-[var(--text-main)]">
              {ops.total_customers || 0}
            </div>
            <span className="text-[11px] text-[var(--text-muted)] block">
              {ops.total_paid_orders || 0} total paid orders
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

