import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import {
  Storefront,
  ArrowsClockwise,
  MagnifyingGlass,
  Check,
  X,
  CreditCard,
  ShieldCheck,
  Phone,
  Envelope,
  MapPin
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
    <div className="space-y-4 max-w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-black text-[var(--text-main)] tracking-tight">
            Registered Businesses
          </h1>
          <p className="text-[11px] text-[var(--text-muted)]">
            Review paid partner subscriptions, approve kitchen applications & manage vendors
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="text"
            placeholder="Search business, owner, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[11px] rounded-lg bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-[#FF6B00] text-white shadow-sm'
              : 'bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <span>All Businesses</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/20 text-inherit font-black">
            {businesses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-muted)] hover:text-amber-500'
          }`}
        >
          <span>Pending Approval</span>
          {pendingCount > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-600 text-white font-black animate-pulse">
              {pendingCount}
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/20 text-inherit font-black">
              0
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
            activeTab === 'active'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-muted)] hover:text-emerald-500'
          }`}
        >
          <span>Active</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/20 text-inherit font-black">
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('suspended')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1.5 ${
            activeTab === 'suspended'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-muted)] hover:text-rose-500'
          }`}
        >
          <span>Suspended</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/20 text-inherit font-black">
            {suspendedCount}
          </span>
        </button>
      </div>

      {/* Main Table / Content */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-[var(--text-muted)]">
          <ArrowsClockwise size={24} className="animate-spin text-[#FF6B00]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-1.5">
          <Storefront size={32} className="mx-auto text-[var(--text-muted)]" />
          <h3 className="font-bold text-xs text-[var(--text-main)]">No businesses found</h3>
          <p className="text-[11px] text-[var(--text-muted)]">
            {activeTab === 'pending'
              ? 'No businesses are currently waiting for approval.'
              : 'No businesses match the selected filter or search term.'}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-light)] bg-[var(--bg-page)] text-[var(--text-muted)] uppercase tracking-wider font-bold text-[10px]">
                  <th className="py-2.5 px-3 min-w-[170px]">Business</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Owner & Contact</th>
                  <th className="py-2.5 px-3 min-w-[190px]">Subscription & Chapa Payment</th>
                  <th className="py-2.5 px-3 text-center min-w-[80px]">Catalog</th>
                  <th className="py-2.5 px-3 min-w-[120px]">Status</th>
                  <th className="py-2.5 px-3 text-right min-w-[130px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-main)] text-[11px]">
                {filtered.map((b) => {
                  const isPending = !b.is_approved || b.subscription_status === 'paid_pending_approval';
                  const hasPaidChapa = b.payment_record_status === 'paid' || b.verified_payment_amount;

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-[var(--bg-page)]/60 transition ${
                        isPending ? 'bg-amber-500/[0.04]' : ''
                      }`}
                    >
                      {/* 1. Business */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-bold text-xs text-[var(--text-main)] leading-tight flex items-center gap-1.5">
                          <span>{b.name}</span>
                          {isPending && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/15 text-amber-500 shrink-0">
                              New
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-1">
                          <span className="px-1.5 py-0.2 rounded bg-[#FF6B00]/10 text-[#FF6B00] font-semibold text-[9px]">
                            {b.business_type}
                          </span>
                          <span className="truncate max-w-[130px] flex items-center gap-0.5">
                            <MapPin size={10} className="shrink-0" />
                            {b.address || 'Addis Ababa'}
                          </span>
                        </div>
                      </td>

                      {/* 2. Owner & Contact */}
                      <td className="py-2.5 px-3 align-top space-y-0.5">
                        <div className="font-semibold text-[var(--text-main)] leading-tight">
                          {b.owner_name || b.owner_account_name || 'Owner'}
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 truncate max-w-[160px]">
                          <Envelope size={11} className="shrink-0" />
                          <span className="truncate">{b.email || b.owner_account_email}</span>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                          <Phone size={11} className="shrink-0" />
                          <span>{b.phone || 'N/A'}</span>
                        </div>
                      </td>

                      {/* 3. Subscription & Chapa Payment */}
                      <td className="py-2.5 px-3 align-top space-y-1">
                        <div className="flex items-center gap-1 font-semibold text-[#FF6B00] text-[10px]">
                          <CreditCard size={12} weight="bold" />
                          <span>{b.plan_name || 'Monthly Plan'}</span>
                          <span className="text-[var(--text-muted)] font-normal">
                            (ETB {Number(b.plan_price || 0).toFixed(0)}/mo)
                          </span>
                        </div>

                        {hasPaidChapa ? (
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-500 space-y-0.5">
                            <div className="flex items-center gap-1 font-bold">
                              <ShieldCheck size={12} weight="bold" />
                              <span>Chapa Verified: ETB {Number(b.verified_payment_amount || b.plan_price).toFixed(2)}</span>
                            </div>
                            {b.verified_tx_ref && (
                              <div className="font-mono text-[9px] text-[var(--text-muted)] truncate max-w-[180px]">
                                Ref: {b.verified_tx_ref}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-500 font-medium">
                            Pending Initial Payment
                          </span>
                        )}
                      </td>

                      {/* 4. Catalog */}
                      <td className="py-2.5 px-3 align-top text-center">
                        <div className="font-semibold text-xs leading-tight">{b.menu_items_count || 0}</div>
                        <div className="text-[9px] text-[var(--text-muted)]">Dishes</div>
                        <div className="text-[9px] text-[var(--text-muted)] mt-1">{b.orders_count || 0} Orders</div>
                      </td>

                      {/* 5. Status */}
                      <td className="py-2.5 px-3 align-top space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                            b.is_approved
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-amber-500/15 text-amber-500'
                          }`}
                        >
                          {b.is_approved ? 'Approved ✓' : 'Awaiting Approval'}
                        </span>
                        <div className="text-[9px] text-[var(--text-muted)]">
                          Sub: <strong className="text-[var(--text-main)] font-semibold">{b.subscription_status}</strong>
                        </div>
                      </td>

                      {/* 6. Admin Action */}
                      <td className="py-2.5 px-3 align-top text-right">
                        {isPending ? (
                          <div className="inline-flex items-center gap-1 justify-end">
                            <button
                              onClick={() =>
                                handleUpdateStatus(b.id, {
                                  is_approved: true,
                                  is_active: true,
                                  subscription_status: 'active',
                                })
                              }
                              disabled={actionLoading === b.id}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm transition flex items-center gap-1"
                              title="Approve & Activate"
                            >
                              <Check size={12} weight="bold" />
                              <span>Approve</span>
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
                              className="p-1.5 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-[10px] font-bold transition"
                              title="Reject / Suspend"
                            >
                              <X size={12} weight="bold" />
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
                            className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-[10px] font-bold transition"
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
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition"
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
