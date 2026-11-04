import { useModal } from '../context/ModalContext';
import React, { useState, useEffect } from 'react';
import api from '../api';
import { io } from 'socket.io-client';
import {
  Package,
  CookingPot,
  MapPin,
  Car,
  Phone,
  User,
  ForkKnife,
  CreditCard,
  Trash,
  Storefront,
  ArrowsClockwise
} from '@phosphor-icons/react';

const STATUS_STYLES = {
  pending: { badge: 'bg-amber-500/10 text-amber-500 border-amber-500/30', label: 'Pending Kitchen' },
  preparing: { badge: 'bg-[#FF6B00]/10 text-[#FF6B00] border-[#FF6B00]/30', label: 'Preparing Food' },
  ready_for_pickup: { badge: 'bg-blue-500/10 text-blue-500 border-blue-500/30', label: 'Ready for Courier' },
  delivering: { badge: 'bg-purple-500/10 text-purple-500 border-purple-500/30', label: 'Delivering' },
  delivered: { badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', label: 'Delivered' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { badge: 'bg-slate-700 text-slate-300 border-slate-600', label: status };
  return (
    <span className={`px-2.5 py-1 text-[11px] font-black uppercase rounded-full border ${s.badge}`}>
      {s.label}
    </span>
  );
}

export default function ActiveOrders() {
  const { showModal } = useModal();
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverByOrder, setSelectedDriverByOrder] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    fetchDrivers();

    const socket = io(import.meta.env.VITE_API_URL || '/');
    socket.on('new_order', () => { fetchOrders(); fetchDrivers(); });
    socket.on('order_status_update', () => { fetchOrders(); fetchDrivers(); });
    socket.on('order_location_update', fetchOrders);
    return () => socket.close();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await api.get('/orders/drivers');
      setDrivers(res.data);
    } catch (err) {
      console.error('Failed to load drivers', err);
    }
  };

  const removeOrder = async (orderId) => {
    const confirmed = await showModal({ title: 'Remove Order', message: `Are you sure you want to remove Order #${orderId}?`, type: 'danger', confirmText: 'Remove Order', cancelText: 'Cancel' });
    if (!confirmed) return;
    try {
      await api.delete(`/orders/${orderId}`);
      fetchOrders();
      fetchDrivers();
    } catch (err) {
      showModal({ title: 'Action Failed', message: err.response?.data?.error || 'Failed to remove order', type: 'danger' });
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
      fetchDrivers();
    } catch {
      showModal({ title: 'Update Failed', message: 'Failed to update order', type: 'danger' });
    }
  };

  const assignDriver = async (orderId) => {
    const driverId = selectedDriverByOrder[orderId];
    if (!driverId) { showModal({ title: 'Select Courier', message: 'Please select an available driver before assigning.', type: 'warning' }); return; }
    try {
      await api.put(`/orders/${orderId}/status`, { status: 'delivering', driver_id: Number(driverId) });
      setSelectedDriverByOrder((prev) => ({ ...prev, [orderId]: '' }));
      fetchOrders();
      fetchDrivers();
    } catch (err) {
      showModal({ title: 'Assignment Failed', message: err.response?.data?.error || 'Failed to assign driver', type: 'danger' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
            <Package weight="fill" className="text-[#FF6B00]" size={28} />
            Active Food Orders & Dispatch
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-0.5">Real-time kitchen prep & courier assignment</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/30 px-3.5 py-1.5 rounded-full text-xs font-bold">
            {orders.length} Active Orders
          </span>
          <button
            onClick={() => { fetchOrders(); fetchDrivers(); }}
            className="p-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[#FF6B00] transition"
          >
            <ArrowsClockwise size={16} />
          </button>
        </div>
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex items-center justify-center p-16 text-[var(--text-muted)]">
          <ArrowsClockwise size={32} className="animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl p-16 text-center space-y-3">
          <Package size={56} className="mx-auto text-[var(--text-muted)] opacity-50" />
          <p className="text-[var(--text-main)] text-xl font-bold">No active orders right now</p>
          <p className="text-[var(--text-muted)] text-xs max-w-sm mx-auto">
            New customer orders will appear here automatically via real-time websockets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map((order) => {
            const hasDriver = !!order.driver_name || !!order.driver_id;
            const itemsList = Array.isArray(order.items) ? order.items : [];

            return (
              <div
                key={order.id}
                className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-3xl p-6 shadow-sm hover:border-[#FF6B00]/40 transition duration-300 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-4">
                  {/* Order header */}
                  <div className="flex justify-between items-start border-b border-[var(--border-light)] pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-[var(--text-muted)] font-mono font-bold">Order #{order.id}</span>
                        <button
                          onClick={() => removeOrder(order.id)}
                          className="text-[10px] text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1"
                          title="Remove active order"
                        >
                          <Trash size={12} /> Remove
                        </button>
                      </div>
                      <p className="text-2xl font-black text-[#FF6B00]">ETB {Number(order.total_amount).toFixed(2)}</p>
                      {order.business_name && (
                        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                          <Storefront size={13} /> {order.business_name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={order.status} />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20 capitalize">
                        {order.payment_method} • {order.payment_status} ✓
                      </span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-[var(--bg-page)] p-3.5 rounded-2xl border border-[var(--border-light)] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)] flex items-center gap-1">
                        <User size={13} className="text-[#FF6B00]" /> Customer:
                      </span>
                      <strong className="text-[var(--text-main)]">{order.customer_name || 'Customer'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)] flex items-center gap-1">
                        <Phone size={13} className="text-[#FF6B00]" /> Phone:
                      </span>
                      <span className="font-mono text-[var(--text-main)] font-semibold">
                        {order.customer_phone ? (
                          <a href={`tel:${order.customer_phone}`} className="text-[#FF6B00] hover:underline">
                            {order.customer_phone}
                          </a>
                        ) : (
                          <span className="text-[var(--text-muted)] italic">Not Provided</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Items list */}
                  {itemsList.length > 0 && (
                    <div className="bg-[var(--bg-page)] p-3.5 rounded-2xl border border-[var(--border-light)]">
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
                        <ForkKnife size={12} className="text-[#FF6B00]" /> Items ({itemsList.length}):
                      </p>
                      <ul className="space-y-1 text-xs text-[var(--text-main)]">
                        {itemsList.map((item, idx) => (
                          <li key={item.id || idx} className="flex justify-between items-center">
                            <span className="truncate pr-2 font-medium">{item.name || 'Dish'}</span>
                            <span className="font-mono font-bold text-[#FF6B00] shrink-0">×{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Driver Assignment & Phone Section */}
                  <div className="p-3.5 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)] flex items-center gap-1">
                        <Car size={14} className={hasDriver ? 'text-blue-500' : 'text-[var(--text-muted)]'} /> Courier:
                      </span>
                      <strong className={hasDriver ? 'text-blue-500' : 'text-[var(--text-muted)]'}>
                        {order.driver_name || (hasDriver ? `Driver #${order.driver_id}` : 'Unassigned')}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)] flex items-center gap-1">
                        <Phone size={14} className={order.driver_phone ? 'text-emerald-500' : 'text-[var(--text-muted)]'} /> Phone:
                      </span>
                      <span className="font-mono font-medium">
                        {order.driver_phone ? (
                          <a href={`tel:${order.driver_phone}`} className="text-emerald-500 hover:underline">
                            {order.driver_phone}
                          </a>
                        ) : (
                          <span className="text-[var(--text-muted)]">N/A</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Location links */}
                  <div className="space-y-1 text-xs">
                    {order.customer_latitude && order.customer_longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${order.customer_latitude},${order.customer_longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-blue-500 hover:underline font-semibold"
                      >
                        <MapPin size={13} /> Open customer delivery GPS
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions / Dispatch controls */}
                <div className="pt-3 border-t border-[var(--border-light)]">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="w-full bg-[#FF6B00] hover:bg-[#E05E00] text-white py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-[#FF6B00]/25"
                    >
                      <CookingPot weight="bold" size={16} />
                      <span>Start Kitchen Prep</span>
                    </button>
                  )}

                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md"
                    >
                      <Package weight="bold" size={16} />
                      <span>Mark Ready for Pickup</span>
                    </button>
                  )}

                  {order.status === 'ready_for_pickup' && (
                    <div className="space-y-2">
                      <select
                        value={selectedDriverByOrder[order.id] || ''}
                        onChange={(e) =>
                          setSelectedDriverByOrder((prev) => ({ ...prev, [order.id]: e.target.value }))
                        }
                        className="w-full bg-[var(--bg-page)] border border-[var(--border-light)] rounded-xl p-2 text-xs text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                      >
                        <option value="">Select available courier...</option>
                        {drivers.filter((d) => d.is_available).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.phone ? `(${d.phone})` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => assignDriver(order.id)}
                        className="w-full bg-[#FF6B00] hover:bg-[#E05E00] text-white py-2 rounded-xl text-xs font-bold transition shadow"
                      >
                        Dispatch Courier
                      </button>
                    </div>
                  )}

                  {order.status === 'delivering' && (
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 text-xs text-center font-bold">
                      Courier On the Way
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
