import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { SignOut, MapPin, CheckCircle, NavigationArrow, CarProfile } from '@phosphor-icons/react';
import { io } from 'socket.io-client';

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    fetchOrders();

    const newSocket = io('/');
    setSocket(newSocket);

    // Refresh when status updates or new orders are marked ready
    newSocket.on('order_status_update', () => fetchOrders());
    newSocket.on('new_order', () => fetchOrders()); 
    newSocket.on('order_location_update', () => fetchOrders());

    return () => newSocket.close();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to load orders", err);
    }
  };

  const shareDriverLocation = (orderId) => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.put(`/orders/${orderId}/driver-location`, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          fetchOrders();
        } catch (_err) {
          alert('Failed to share driver location');
        }
      },
      () => alert('Unable to read location. Please allow location permission.')
    );
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      // If we are accepting it, we assign ourselves as the driver
      const body = { status: newStatus };
      if (newStatus === 'delivering') body.driver_id = user.id;

      await api.put(`/orders/${orderId}/status`, body);
      fetchOrders();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  // Filter out delivered orders from the view to keep it clean
  const visibleOrders = orders.filter(o => o.status !== 'delivered');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-24">
      
      {/* Mobile Top Bar */}
      <nav className="bg-blue-700 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CarProfile size={28} weight="fill" />
            <span className="font-bold text-lg">Driver App</span>
          </div>
          <button onClick={logout} className="text-blue-200 hover:text-white transition">
            <SignOut size={24} />
          </button>
        </div>
      </nav>

      <div className="p-4 max-w-lg mx-auto mt-4 space-y-6">
        
        {/* Header Stats */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center">
          <h2 className="text-2xl font-black text-slate-800 mb-1">Hello, {user?.name.split(' ')[0]}</h2>
          <p className="text-slate-500 font-medium">You have {visibleOrders.filter(o => o.driver_id === user?.id).length} active deliveries.</p>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-500 uppercase tracking-wider text-sm px-2">Delivery Queue</h3>
          
          {visibleOrders.length === 0 ? (
             <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 border-dashed">
               <MapPin size={48} className="mx-auto text-slate-300 mb-3" />
               <p className="text-slate-500">No orders ready for pickup.</p>
             </div>
          ) : (
            visibleOrders.map(order => {
              const myDelivery = order.driver_id === user.id;
              
              return (
                <div 
                  key={order.id} 
                  className={`rounded-2xl p-5 shadow-sm border transition ${myDelivery ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`text-xs font-bold px-2 py-1 rounded mb-2 inline-block ${myDelivery ? 'bg-blue-600 text-white' : 'bg-orange-100 text-orange-800'}`}>
                        {myDelivery ? 'MY DELIVERY' : 'AVAILABLE NOW'}
                      </span>
                      <p className="font-mono text-sm text-slate-500">Order #{order.id}</p>
                    </div>
                    <p className="font-black text-lg text-slate-800">${Number(order.total_amount).toFixed(2)}</p>
                  </div>
                  {order.customer_latitude && order.customer_longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${order.customer_latitude},${order.customer_longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-700 hover:underline mb-3 block"
                    >
                      Open customer location in map
                    </a>
                  )}

                  {/* Action Buttons */}
                  {order.status === 'ready_for_pickup' && !myDelivery && (
                     <button 
                       onClick={() => updateStatus(order.id, 'delivering')}
                       className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2"
                     >
                       <NavigationArrow weight="bold" /> Accept Delivery
                     </button>
                  )}
                  {order.status === 'delivering' && myDelivery && (
                    <div className="space-y-2">
                      {order.driver_latitude || order.driver_longitude || order.driver_location_updated_at ? (
                        <button
                          onClick={() => shareDriverLocation(order.id)}
                          className="w-full bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold py-3 rounded-xl hover:bg-emerald-100 transition flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={20} weight="fill" className="text-emerald-600" />
                          <span>Location Shared ✓ (Tap to Update)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => shareDriverLocation(order.id)}
                          className="w-full bg-white text-slate-700 font-bold py-3 rounded-xl border border-slate-300 hover:bg-slate-50 transition"
                        >
                          Share My Current Location
                        </button>
                      )}

                      {order.driver_confirmed_delivered ? (
                        <button
                          disabled
                          className="w-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-default"
                        >
                          <CheckCircle size={20} weight="fill" className="text-emerald-600" />
                          <span>Delivered (Waiting for Customer) ✓</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus(order.id, 'delivered')}
                          className="w-full bg-green-500 text-white font-bold py-3.5 rounded-xl hover:bg-green-600 transition flex items-center justify-center gap-2 shadow-lg shadow-green-500/30"
                        >
                          <CheckCircle weight="bold" /> Mark Delivered (Driver)
                        </button>
                      )}

                      {!order.customer_confirmed_delivered && (
                        <p className="text-xs text-slate-500 text-center">Waiting for customer confirmation.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
