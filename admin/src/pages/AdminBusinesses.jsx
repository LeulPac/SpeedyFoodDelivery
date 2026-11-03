import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import {
  Storefront,
  CheckCircle,
  WarningCircle,
  ArrowsClockwise,
  MagnifyingGlass,
  Check,
  X,
  CreditCard,
  ShieldCheck,
  Clock,
  Sparkle,
  Phone,
  Envelope
} from '@phosphor-icons/react';

export default function AdminBusinesses() {
  const location = useLocation();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Tab filter: 'all' | 'pending' | 'active' | 'suspended'
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'all';
  });

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/businesses');
      setBusinesses(res.data || []);
    } catch (err) {
      console.error('Failed to load businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleUpdateStatus = async (bizId, updates) => {
    setActionLoading(bizId);
    try {
      await api.put(`/admin/businesses/${bizId}/status`, updates);
      await fetchBusinesses();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update business');
    } finally {
      setActionLoading(null);
    }
  };

  // Counts
  const pendingCount = businesses.filter(
    (b) => !b.is_approved || b.subscription_status === 'paid_pending_approval'
  ).length;
  const activeCount = businesses.filter(
    (b) => b.is_approved && b.subscription_status === 'active'
  ).length;
  const suspendedCount = businesses.filter(
    (b) => b.subscription_status === 'suspended'
  ).length;

  // Filtered businesses
  const filtered = businesses.filter((b) => {
    const isPending = !b.is_approved || b.subscription_status === 'paid_pending_approval';
    const isActive = b.is_approved && b.subscription_status === 'active';
    const isSuspended = b.subscription_status === 'suspended';

    if (activeTab === 'pending' && !isPending) return false;
    if (activeTab === 'active' && !isActive) return false;
    if (activeTab === 'suspended' && !isSuspended) return false;

    if (!search.trim()) return true;

    const q = search.toLowerCase();
    return (
      b.name?.toLowerCase().includes(q) ||
      b.owner_name?.toLowerCase().includes(q) ||
      b.owner_account_name?.toLowerCase().includes(q) ||
      b.email?.toLowerCase().includes(q) ||
      b.phone?.toLowerCase().includes(q) ||
      b.business_type?.toLowerCase().includes(q) ||
      b.verified_tx_ref?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
            Registered Businesses
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Review paid partner subscriptions, approve kitchen applications & manage vendor statuses
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <MagnifyingGlass
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            placeholder="Search business, owner, phone, or tx ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/20'
              : 'bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <span>All Businesses</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-inherit font-black">
            {businesses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-muted)] hover:text-amber-500'
          }`}
        >
          <span>Pending Approval (Paid)</span>
          {pendingCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-600 text-white font-black animate-pulse">
              {pendingCount}
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-inherit font-black">
              0
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'active'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-muted)] hover:text-emerald-500'
          }`}
        >
          <span>Active Subscriptions</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-inherit font-black">
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('suspended')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'suspended'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
              : 'bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-muted)] hover:text-rose-500'
          }`}
        >
          <span>Suspended</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-inherit font-black">
            {suspendedCount}
          </span>
        </button>
      </div>

      {/* Main Table / Content */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-[var(--text-muted)]">
          <ArrowsClockwise size={28} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-2">
          <Storefront size={40} className="mx-auto text-[var(--text-muted)]" />
          <h3 className="font-bold text-[var(--text-main)]">No businesses found</h3>
          <p className="text-xs text-[var(--text-muted)]">
            {activeTab === 'pending'
              ? 'No businesses are currently waiting for approval. All paid requests have been reviewed!'
              : 'No businesses match the selected filter or search term.'}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-light)] bg-[var(--bg-page)] text-[var(--text-muted)] uppercase tracking-wider font-bold">
                  <th className="p-4">Business Details</th>
                  <th className="p-4">Owner & Contact</th>
                  <th className="p-4">Chapa Payment & Plan</th>
                  <th className="p-4">Activity & Catalog</th>
                  <th className="p-4">Review Status</th>
                  <th className="p-4 text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-main)]">
                {filtered.map((b) => {
                  const isPending = !b.is_approved || b.subscription_status === 'paid_pending_approval';
                  const hasPaidChapa = b.payment_record_status === 'paid' || b.verified_payment_amount;

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-[var(--bg-page)]/50 transition ${
                        isPending ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* 1. Business Details */}
                      <td className="p-4">
                        <div className="font-bold text-sm text-[var(--text-main)] flex items-center gap-1.5">
                          <span>{b.name}</span>
                          {isPending && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 text-[10px] font-black uppercase">
                              Needs Approval
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-[#FF6B00]/10 text-[#FF6B00] font-bold">
                            {b.business_type}
                          </span>
                          <span className="truncate max-w-xs">{b.address || 'Addis Ababa'}</span>
                        </div>
                      </td>

                      {/* 2. Owner & Contact */}
                      <td className="p-4 space-y-0.5">
                        <div className="font-semibold text-[var(--text-main)]">
                          {b.owner_name || b.owner_account_name || 'Owner'}
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                          <Envelope size={12} />
                          <span>{b.email || b.owner_account_email}</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                          <Phone size={12} />
                          <span>{b.phone || 'N/A'}</span>
                        </div>
                      </td>

                      {/* 3. Chapa Payment & Plan */}
                      <td className="p-4 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[#FF6B00]">
                          <CreditCard size={14} weight="bold" />
                          <span>{b.plan_name || 'Monthly Plan'}</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-normal">
                            (ETB {Number(b.plan_price || 0).toFixed(0)}/mo)
                          </span>
                        </div>

                        {/* Verified Chapa Payment Badge */}
                        {hasPaidChapa ? (
                          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] space-y-0.5 text-emerald-500">
                            <div className="flex items-center gap-1 font-bold">
                              <ShieldCheck size={14} weight="bold" />
                              <span>Chapa Verified: ETB {Number(b.verified_payment_amount || b.plan_price).toFixed(2)}</span>
                            </div>
                            {b.verified_tx_ref && (
                              <div className="font-mono text-[9px] text-[var(--text-muted)] truncate max-w-[180px]">
                                Ref: {b.verified_tx_ref}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-500 font-semibold">
                            Pending Initial Payment
                          </div>
                        )}
                      </td>

                      {/* 4. Activity & Catalog */}
                      <td className="p-4">
                        <div className="font-semibold">{b.menu_items_count || 0} Dishes</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {b.orders_count || 0} Lifetime Orders
                        </div>
                      </td>

                      {/* 5. Review Status */}
                      <td className="p-4 space-y-1.5">
                        <div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              b.is_approved
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}
                          >
                            {b.is_approved ? 'Approved ✓' : 'Awaiting Approval'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--text-muted)] block">
                            Sub Status:{' '}
                            <strong className="text-[var(--text-main)]">
                              {b.subscription_status}
                            </strong>
                          </span>
                        </div>
                      </td>

                      {/* 6. Admin Actions */}
                      <td className="p-4 text-right space-x-2">
                        {isPending ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                handleUpdateStatus(b.id, {
                                  is_approved: true,
                                  is_active: true,
                                  subscription_status: 'active',
                                })
                              }
                              disabled={actionLoading === b.id}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1"
                            >
                              <Check size={14} weight="bold" />
                              <span>Approve & Activate</span>
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateStatus(b.id, {
                                  is_approved: false,
                                  is_active: false,
                                  subscription_status: 'suspended',
                                })
                              }
                              disabled={actionLoading === b.id}
                              className="px-2.5 py-2 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition"
                            >
                              <X size={14} weight="bold" />
                            </button>
                          </div>
                        ) : b.is_approved ? (
                          <button
                            onClick={() =>
                              handleUpdateStatus(b.id, {
                                is_approved: false,
                                is_active: false,
                                subscription_status: 'suspended',
                              })
                            }
                            disabled={actionLoading === b.id}
                            className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleUpdateStatus(b.id, {
                                is_approved: true,
                                is_active: true,
                                subscription_status: 'active',
                              })
                            }
                            disabled={actionLoading === b.id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
