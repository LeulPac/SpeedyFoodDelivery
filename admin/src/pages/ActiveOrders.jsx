import React, { useState, useEffect } from 'react';
import api from '../api';
import { io } from 'socket.io-client';
import { Package, CookingPot, MapPin, Car, Phone, User, ForkKnife, CreditCard, Trash } from '@phosphor-icons/react';

const STATUS_STYLES = {
  pending: { badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', label: 'Pending' },
  preparing: { badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40', label: 'Preparing' },
  ready_for_pickup: { badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40', label: 'Ready for Pickup' },
  delivering: { badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', label: 'Delivering' },
  delivered: { badge: 'bg-green-500/20 text-green-300 border-green-500/40', label: 'Delivered' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || { badge: 'bg-slate-700 text-slate-300 border-slate-600', label: status };
  return (
    <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${s.badge}`}>
      {s.label}
    </span>
  );
}

export default function ActiveOrders() {
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverByOrder, setSelectedDriverByOrder] = useState({});

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
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to load orders', err);
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
    if (!window.confirm(`Are you sure you want to remove Order #${orderId}?`)) return;
    try {
      await api.delete(`/orders/${orderId}`);
      fetchOrders();
      fetchDrivers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove order');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
      fetchDrivers();
    } catch {
      alert('Failed to update order');
    }
  };

  const assignDriver = async (orderId) => {
    const driverId = selectedDriverByOrder[orderId];
    if (!driverId) { alert('Select a free driver first'); return; }
    try {
      await api.put(`/orders/${orderId}/status`, { status: 'delivering', driver_id: Number(driverId) });
      setSelectedDriverByOrder((prev) => ({ ...prev, [orderId]: '' }));
      fetchOrders();
      fetchDrivers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign driver');
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Package weight="fill" className="text-blue-400" size={28} />
            Active Orders
          </h1>
          <p className="text-slate-400 text-sm mt-1">Real-time incoming and in-progress orders</p>
        </div>
        <span className="bg-blue-600/20 text-blue-300 border border-blue-500/40 px-4 py-1.5 rounded-full text-sm font-semibold">
          {orders.length} processing
        </span>
      </div>

      {orders.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-16 text-center">
          <Package size={56} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-300 text-xl font-semibold">No active orders</p>
          <p className="text-slate-500 text-sm mt-2">Waiting for customers to place orders...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {orders.map((order) => {
            const hasDriver = !!order.driver_name || !!order.driver_id;
            const itemsList = Array.isArray(order.items) ? order.items : [];

            return (
              <div
                key={order.id}
                className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-lg hover:border-blue-500/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Order header */}
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-700">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-400 font-mono mb-0.5">Order #{order.id}</p>
                        <button
                          onClick={() => removeOrder(order.id)}
                          className="text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-md transition flex items-center gap-1 font-semibold"
                          title="Remove active order"
                        >
                          <Trash size={12} /> Remove
                        </button>
                      </div>
                      <p className="text-2xl font-black text-white">${Number(order.total_amount).toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={order.status} />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-600/20 text-emerald-300 border-emerald-500/40">
                        Online Payment • Paid ✓
                      </span>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="mb-3.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <User size={13} className="text-blue-400" /> Customer:
                      </span>
                      <strong className="text-slate-200">{order.customer_name || 'Customer'}</strong>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Phone size={13} className="text-blue-400" /> Phone:
                      </span>
                      <span className="font-mono text-slate-300">
                        {order.customer_phone ? (
                          <a href={`tel:${order.customer_phone}`} className="text-cyan-400 hover:underline">
                            {order.customer_phone}
                          </a>
                        ) : (
                          <span className="text-slate-500 italic">Not Provided</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Items list */}
                  {itemsList.length > 0 && (
                    <div className="mb-3.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <ForkKnife size={12} className="text-orange-400" /> Items ({itemsList.length}):
                      </p>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {itemsList.map((item, idx) => (
                          <li key={item.id || idx} className="flex justify-between">
                            <span className="truncate pr-2">{item.name || 'Dish'}</span>
                            <span className="font-mono font-semibold text-slate-400 shrink-0">×{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Driver Assignment & Phone Section */}
                  <div className="mb-3.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Car size={14} className={hasDriver ? 'text-indigo-400' : 'text-slate-500'} /> Driver:
                      </span>
                      <strong className={hasDriver ? 'text-indigo-300' : 'text-slate-400'}>
                        {order.driver_name || (hasDriver ? `Driver #${order.driver_id}` : 'Not Assigned')}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Phone size={14} className={order.driver_phone ? 'text-emerald-400' : 'text-slate-500'} /> Driver Phone:
                      </span>
                      <span className="font-mono font-medium">
                        {hasDriver ? (
                          order.driver_phone ? (
                            <a href={`tel:${order.driver_phone}`} className="text-emerald-400 hover:underline">
                              {order.driver_phone}
                            </a>
                          ) : (
                            <span className="text-slate-500">Not Available</span>
                          )
                        ) : (
                          <span className="text-slate-500">Not Available</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Location links */}
                  <div className="space-y-1.5 mb-4 text-xs">
                    {order.customer_latitude && order.customer_longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${order.customer_latitude},${order.customer_longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        <MapPin size={12} />
                        Open customer location
                      </a>
                    )}
                    {order.driver_latitude && order.driver_longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${order.driver_latitude},${order.driver_longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 hover:underline"
                      >
                        <Car size={12} />
                        Open driver location
                      </a>
                    )}
                  </div>
                </div>

                {/* Action area */}
                <div className="pt-3 border-t border-slate-700">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="w-full bg-orange-600/20 text-orange-300 hover:bg-orange-600 hover:text-white border border-orange-600/50 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
                    >
                      <CookingPot weight="bold" /> Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
                      className="w-full bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-600/50 py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
                    >
                      <Package weight="bold" /> Ready for Pickup
                    </button>
                  )}
                  {order.status === 'ready_for_pickup' && (
                    <div className="space-y-2">
                      <div className="bg-slate-900/60 text-slate-400 border border-slate-700 py-2 rounded-xl text-sm text-center">
                        Waiting on Driver
                      </div>
                      <select
                        value={selectedDriverByOrder[order.id] || ''}
                        onChange={(e) =>
                          setSelectedDriverByOrder((prev) => ({ ...prev, [order.id]: e.target.value }))
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white"
                      >
                        <option value="">Select free driver</option>
                        {drivers.filter((d) => d.is_available).map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.phone ? `(${d.phone})` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => assignDriver(order.id)}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-xl text-sm font-semibold transition"
                      >
                        Assign Driver
                      </button>
                    </div>
                  )}
                  {order.status === 'delivering' && (
                    <div className="space-y-1.5">
                      <div className="bg-slate-900/60 text-slate-400 border border-slate-700 py-2 rounded-xl text-sm text-center mb-2">
                        Out for Delivery
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <p>Driver confirmed: <span className={order.driver_confirmed_delivered ? 'text-green-400' : 'text-slate-500'}>{order.driver_confirmed_delivered ? 'Yes' : 'No'}</span></p>
                        <p>Customer confirmed: <span className={order.customer_confirmed_delivered ? 'text-green-400' : 'text-slate-500'}>{order.customer_confirmed_delivered ? 'Yes' : 'No'}</span></p>
                      </div>
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

