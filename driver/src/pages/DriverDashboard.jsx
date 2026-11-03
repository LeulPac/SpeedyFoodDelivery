import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import {
  SignOut,
  MapPin,
  CheckCircle,
  Truck,
  Phone,
  Storefront,
  ArrowsClockwise,
  CreditCard,
  Receipt,
  Sun,
  Moon,
  CurrencyDollar,
  WarningCircle,
  NavigationArrow,
  ForkKnife
} from '@phosphor-icons/react';
import { io } from 'socket.io-client';

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [orders, setOrders] = useState([]);
  const [feeSummary, setFeeSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'fees'
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [payingFees, setPayingFees] = useState(false);
  const [feePaymentMsg, setFeePaymentMsg] = useState(null);

  useEffect(() => {
    fetchOrders();
    fetchFeeSummary();

    const socket = io(import.meta.env.VITE_API_URL || '/');
    socket.on('order_status_update', () => { fetchOrders(); fetchFeeSummary(); });
    socket.on('new_order', () => fetchOrders());
    socket.on('order_location_update', () => fetchOrders());

    return () => socket.close();
  }, []);

  // Check if returning from Chapa driver fee payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const feeTxRef = params.get('verify_driver_fee');
    if (feeTxRef && user) {
      setFeePaymentMsg({ loading: true, text: 'Verifying fee payment with Chapa...' });
      api.get(`/driver/verify-payment/${feeTxRef}`)
        .then((res) => {
          setFeePaymentMsg({ success: true, text: res.data.message || 'Fee payment verified successfully!' });
          fetchFeeSummary();
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          setFeePaymentMsg({ error: true, text: err.response?.data?.error || 'Failed to verify fee payment.' });
          fetchFeeSummary();
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchFeeSummary = async () => {
    try {
      const res = await api.get('/driver/summary');
      setFeeSummary(res.data);
    } catch (err) {
      console.error('Failed to load fee summary', err);
    }
  };

  const shareDriverLocation = (orderId) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.put(`/orders/${orderId}/driver-location`, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          fetchOrders();
          alert('GPS location updated for this order!');
        } catch (_err) {
          alert('Failed to share driver location');
        }
      },
      () => alert('Unable to read location. Please allow GPS permission.')
    );
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      const body = { status: newStatus };
      if (newStatus === 'delivering') body.driver_id = user.id;
      if (newStatus === 'delivered') body.driver_confirmed_delivered = true;

      await api.put(`/orders/${orderId}/status`, body);
      fetchOrders();
      fetchFeeSummary();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handlePayOutstandingFees = async () => {
    if (!feeSummary?.outstanding_balance || feeSummary.outstanding_balance <= 0) {
      alert('You have no outstanding platform balance.');
      return;
    }
    setPayingFees(true);
    try {
      const res = await api.post('/driver/pay', {
        amount: feeSummary.outstanding_balance,
      });
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to initialize payment');
    } finally {
      setPayingFees(false);
    }
  };

  const visibleOrders = orders.filter((o) => o.status !== 'delivered');
  const myAssignedOrders = visibleOrders.filter((o) => o.driver_id === user?.id);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col font-sans transition-theme">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[var(--bg-card)] border-b border-[var(--border-light)] shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-[#FF8C33] text-white flex items-center justify-center font-bold shadow-md shadow-[#FF6B00]/25">
              <Truck size={20} weight="fill" />
            </div>
            <div>
              <span className="font-extrabold text-base leading-none text-[var(--text-main)]">
                Speedy<span className="text-[#FF6B00]">Courier</span>
              </span>
              <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">
                {user?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[#FF6B00] transition"
            >
              {isDark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
            </button>
            <button
              onClick={logout}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition"
              title="Sign Out"
            >
              <SignOut size={20} weight="bold" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Fee Payment Message Alert */}
        {feePaymentMsg && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
              feePaymentMsg.success
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                : feePaymentMsg.error
                ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
            }`}
          >
            <span>{feePaymentMsg.text}</span>
            <button onClick={() => setFeePaymentMsg(null)} className="underline ml-4">
              Dismiss
            </button>
          </div>
        )}

        {/* Top Summary Card */}
        <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Courier Dispatch Status
            </span>
            <h2 className="text-xl font-black text-[var(--text-main)]">
              Welcome back, {user?.name.split(' ')[0]}
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              You currently have <strong>{myAssignedOrders.length} active run(s)</strong> assigned.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'queue'
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                  : 'bg-[var(--bg-page)] text-[var(--text-muted)] border border-[var(--border-light)]'
              }`}
            >
              Deliveries ({visibleOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('fees')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'fees'
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                  : 'bg-[var(--bg-page)] text-[var(--text-muted)] border border-[var(--border-light)]'
              }`}
            >
              <Receipt size={14} />
              <span>Platform Fees</span>
              {feeSummary?.outstanding_balance > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 ml-1" />
              )}
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: DELIVERIES QUEUE                                        */}
        {/* ============================================================== */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-black text-sm uppercase tracking-wider text-[var(--text-muted)]">
                Active Delivery Queue
              </h3>
              <button
                onClick={fetchOrders}
                className="text-xs text-[#FF6B00] font-bold flex items-center gap-1"
              >
                <ArrowsClockwise size={14} /> Refresh
              </button>
            </div>

            {loadingOrders && orders.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-muted)]">
                <ArrowsClockwise size={28} className="animate-spin mx-auto" />
              </div>
            ) : visibleOrders.length === 0 ? (
              <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] p-12 text-center space-y-2">
                <MapPin size={40} className="mx-auto text-[var(--text-muted)] opacity-50" />
                <p className="font-bold text-[var(--text-main)]">No orders ready for pickup</p>
                <p className="text-xs text-[var(--text-muted)]">
                  When a kitchen marks food as ready, deliveries will appear here immediately.
                </p>
              </div>
            ) : (
              visibleOrders.map((order) => {
                const isMyDelivery = order.driver_id === user.id;

                return (
                  <div
                    key={order.id}
                    className={`rounded-3xl p-6 border shadow-sm transition space-y-4 ${
                      isMyDelivery
                        ? 'bg-[var(--bg-card)] border-[#FF6B00]/40 ring-1 ring-[#FF6B00]/20'
                        : 'bg-[var(--bg-card)] border-[var(--border-light)]'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-3">
                      <div>
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block ${
                            isMyDelivery
                              ? 'bg-[#FF6B00] text-white'
                              : 'bg-blue-500/10 text-blue-500'
                          }`}
                        >
                          {isMyDelivery ? 'Assigned to You' : 'Ready for Pickup'}
                        </span>
                        <h4 className="font-black text-lg text-[var(--text-main)] mt-1">
                          Order #{order.id}
                        </h4>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-black text-[#FF6B00]">
                          ETB {Number(order.total_amount).toFixed(2)}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] block capitalize">
                          {order.payment_method} • {order.payment_status}
                        </span>
                      </div>
                    </div>

                    {/* Business Pickup Info */}
                    <div className="p-3.5 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
                        <Storefront size={16} className="text-[#FF6B00]" weight="bold" />
                        <span>Pickup Kitchen: {order.business_name || 'Speedy Partner'}</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] pl-5">
                        {order.business_address || 'Addis Ababa'}
                      </p>
                    </div>

                    {/* Customer Destination Info */}
                    <div className="p-3.5 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-[var(--text-main)]">
                          <MapPin size={16} className="text-blue-500" weight="bold" />
                          <span>Customer: {order.customer_name || 'Customer'}</span>
                        </div>
                        {order.customer_phone && (
                          <a
                            href={`tel:${order.customer_phone}`}
                            className="text-xs font-bold text-emerald-500 flex items-center gap-1"
                          >
                            <Phone size={14} /> Call
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] pl-5 font-mono">
                        Phone: {order.customer_phone || 'N/A'}
                      </p>
                    </div>

                    {/* Items */}
                    {order.items?.length > 0 && (
                      <div className="text-xs text-[var(--text-muted)] space-y-1">
                        <span className="font-bold text-[var(--text-main)] block">Items to deliver:</span>
                        <div className="flex flex-wrap gap-2">
                          {order.items.map((i, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-lg bg-[var(--bg-page)] text-[var(--text-main)] font-medium text-[11px]"
                            >
                              {i.quantity}x {i.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Controls */}
                    <div className="pt-3 border-t border-[var(--border-light)] flex flex-wrap items-center gap-2">
                      {order.status === 'ready_for_pickup' && !isMyDelivery && (
                        <button
                          onClick={() => updateStatus(order.id, 'delivering')}
                          className="flex-1 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold shadow transition"
                        >
                          Accept & Start Delivery
                        </button>
                      )}

                      {isMyDelivery && order.status === 'delivering' && (
                        <>
                          <button
                            onClick={() => shareDriverLocation(order.id)}
                            className="py-2.5 px-3.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-page)] text-xs font-bold text-[var(--text-main)] hover:border-[#FF6B00] transition flex items-center gap-1.5"
                          >
                            <NavigationArrow size={14} className="text-blue-500" />
                            <span>Share GPS</span>
                          </button>

                          <button
                            onClick={() => updateStatus(order.id, 'delivered')}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle size={16} weight="bold" />
                            <span>Confirm Delivery Completed</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: FIXED PLATFORM FEE & SETTLEMENT                         */}
        {/* ============================================================== */}
        {activeTab === 'fees' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-1 shadow-sm">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Completed Deliveries
                </span>
                <span className="text-3xl font-black text-[var(--text-main)]">
                  {feeSummary?.completed_deliveries_count || 0}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] block">
                  Fixed fee: ETB {feeSummary?.fee_per_delivery || '25.00'} / delivery
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-1 shadow-sm">
                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  Total Fees Accrued
                </span>
                <span className="text-3xl font-black text-[#FF6B00]">
                  ETB {Number(feeSummary?.total_fees_accrued || 0).toFixed(2)}
                </span>
                <span className="text-[11px] text-emerald-500 font-semibold block">
                  Paid: ETB {Number(feeSummary?.total_fees_paid || 0).toFixed(2)}
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-3 shadow-sm">
                <div>
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                    Outstanding Balance
                  </span>
                  <span className="text-3xl font-black text-amber-500">
                    ETB {Number(feeSummary?.outstanding_balance || 0).toFixed(2)}
                  </span>
                </div>
                {feeSummary?.outstanding_balance > 0 && (
                  <button
                    onClick={handlePayOutstandingFees}
                    disabled={payingFees}
                    className="w-full py-2 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold shadow transition flex items-center justify-center gap-1.5"
                  >
                    <CreditCard size={15} />
                    <span>{payingFees ? 'Connecting...' : 'Pay Balance (Chapa)'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Platform Rule Clarification */}
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-[var(--text-muted)] space-y-1">
              <span className="font-bold text-[var(--text-main)] block">SpeedyDelivery Courier Model:</span>
              <p>
                Each driver pays SpeedyDelivery a fixed fee of <strong>ETB {feeSummary?.fee_per_delivery || '25.00'}</strong> for each confirmed delivery. This fee is never charged on cancelled or uncompleted deliveries and is never calculated as a percentage of food.
              </p>
            </div>

            {/* Traceable Delivery Fee History */}
            <div className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] p-6 shadow-sm space-y-4">
              <h4 className="font-black text-base text-[var(--text-main)]">
                Completed Delivery Fee Ledger
              </h4>

              {(!feeSummary?.fee_history || feeSummary.fee_history.length === 0) ? (
                <p className="text-xs text-[var(--text-muted)] italic">
                  No completed delivery fee records yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-light)] text-[var(--text-muted)] uppercase tracking-wider font-bold">
                        <th className="pb-3">Delivery Run</th>
                        <th className="pb-3">Business</th>
                        <th className="pb-3">Fixed Platform Fee</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-light)] text-[var(--text-main)]">
                      {feeSummary.fee_history.map((fee) => (
                        <tr key={fee.id}>
                          <td className="py-3 font-mono font-bold">
                            Order #{fee.order_id} (ETB {Number(fee.order_amount).toFixed(2)})
                          </td>
                          <td className="py-3 font-medium text-[var(--text-muted)]">
                            {fee.business_name || 'Speedy Partner'}
                          </td>
                          <td className="py-3 font-black text-[#FF6B00]">
                            ETB {Number(fee.fee_amount).toFixed(2)}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                fee.status === 'paid'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-amber-500/10 text-amber-500'
                              }`}
                            >
                              {fee.status}
                            </span>
                          </td>
                          <td className="py-3 text-[var(--text-muted)]">
                            {new Date(fee.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
