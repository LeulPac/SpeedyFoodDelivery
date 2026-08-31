import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { resolveAssetUrl } from '../api';
import { ShoppingCart, SignOut, Clock, MapPinLine, CheckCircle } from '@phosphor-icons/react';
import { io } from 'socket.io-client';

export default function CustomerPortal() {
  const { user, logout } = useAuth();
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeOrder, setActiveOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [socket, setSocket] = useState(null);
  const [showMenuWhileActive, setShowMenuWhileActive] = useState(false);
  const [showOrderList, setShowOrderList] = useState(false);

  useEffect(() => {
    // 1. Fetch Menu
    const fetchMenu = async () => {
      try {
        const res = await api.get('/menu');
        setMenu(res.data);
      } catch (err) {
         console.error("Failed to load menu", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMenu();
    fetchOrders();

    // 3. Setup Socket
    const newSocket = io('/');
    setSocket(newSocket);

    newSocket.on('order_status_update', (data) => {
      setActiveOrder(prev => {
        if (prev && prev.id === data.order_id) {
          return { ...prev, status: data.status, driver_id: data.driver_id };
        }
        return prev;
      });
      fetchOrders();
    });
    newSocket.on('order_location_update', () => fetchOrders());

    return () => newSocket.close();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/orders');
      setOrders(res.data);
      const pendingOrder = res.data.find(o => o.status !== 'delivered');
      setActiveOrder(pendingOrder || null);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handleCheckout = async () => {
    try {
      const items = cart.map(i => ({ menu_item_id: i.id, quantity: i.quantity, price_at_time: i.price }));
      const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      let customerLocation = {};
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              customerLocation = {
                customer_latitude: position.coords.latitude,
                customer_longitude: position.coords.longitude
              };
              resolve();
            },
            () => resolve(),
            { timeout: 8000 }
          );
        });
      }

      const res = await api.post('/orders', { items, total_amount: totalAmount, ...customerLocation });
      setCart([]);
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        setActiveOrder(res.data);
        fetchOrders();
      }
    } catch (err) {
      alert('Failed to place order');
    }
  };

  const shareCustomerLocation = () => {
    if (!activeOrder) return;
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await api.put(`/orders/${activeOrder.id}/customer-location`, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setActiveOrder(res.data);
        } catch (_err) {
          alert('Failed to share location');
        }
      },
      () => alert('Unable to read location. Please allow location permission.')
    );
  };

  const confirmDelivered = async () => {
    if (!activeOrder) return;
    try {
      const res = await api.put(`/orders/${activeOrder.id}/status`, { status: 'delivered' });
      setActiveOrder(res.data);
      fetchOrders();
      if (res.data.status === 'delivered') {
        setShowMenuWhileActive(false);
      }
    } catch (_err) {
      alert('Failed to confirm delivery');
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const StatusIcon = ({ status }) => {
    if (status === 'pending') return <Clock size={32} className="text-yellow-500 animate-pulse" />;
    if (status === 'preparing') return <Clock size={32} className="text-orange-500 animate-spin-slow" />;
    if (status === 'delivering') return <MapPinLine size={32} className="text-blue-500 animate-bounce" />;
    return <CheckCircle size={32} className="text-green-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="bg-white shadow-sm p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black text-blue-600 tracking-tight">SpeedyDelivery</h1>
          <div className="flex items-center space-x-6">
            <div className="relative cursor-pointer group flex items-center">
              <ShoppingCart
                size={28}
                className="text-gray-700 group-hover:text-blue-600 transition"
                onClick={() => {
                  setShowOrderList(true);
                  setShowMenuWhileActive(false);
                }}
              />
              {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3 border-l pl-6 border-gray-200">
              <span className="font-medium text-gray-600 hidden sm:block">Hi, {user?.name.split(' ')[0]}</span>
              <button onClick={logout} className="text-gray-400 hover:text-red-500 transition" title="Logout">
                <SignOut size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="bg-blue-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Craving something delicious?</h2>
          <p className="text-xl text-blue-100">Order from our exclusive menu and get it delivered in minutes.</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 py-12 flex flex-col lg:flex-row gap-8">
        
        {/* Main Content Area */}
        <div className="flex-1">
          {showOrderList ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-800">My Orders</h3>
                <button onClick={() => setShowOrderList(false)} className="text-blue-700 hover:underline text-sm">Back</button>
              </div>
              {orders.length === 0 ? (
                <p className="text-gray-500">No orders yet.</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((o) => (
                    <div key={o.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between">
                        <p className="font-semibold">Order #{o.id}</p>
                        <p className="font-bold">${Number(o.total_amount).toFixed(2)}</p>
                      </div>
                      <p className="text-sm text-gray-600 capitalize">{o.status.replace(/_/g, ' ')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeOrder && !showMenuWhileActive ? (
            <div className="bg-white rounded-2xl shadow-sm border border-orange-200 p-8 text-center bg-orange-50/30">
              <h3 className="text-2xl font-bold mb-8 text-gray-800">Your Order is <span className="text-orange-600 capitalize">{activeOrder.status.replace('_', ' ')}</span></h3>
              <div className="flex justify-center mb-6">
                <StatusIcon status={activeOrder.status} />
              </div>
              <p className="text-gray-600 max-w-md mx-auto">
                Order #{activeOrder.id} has been placed. Sit tight while we prepare your delicious food! 
                {activeOrder.driver_id && " A driver has been assigned and will be heading your way soon."}
              </p>
              {activeOrder.status === 'delivering' && (
                <div className="mt-6 space-y-3">
                  {activeOrder.customer_latitude || activeOrder.customer_longitude || activeOrder.customer_location_updated_at ? (
                    <button
                      onClick={shareCustomerLocation}
                      className="w-full bg-emerald-50 border border-emerald-300 text-emerald-700 px-6 py-2 rounded-lg font-medium hover:bg-emerald-100 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} className="text-emerald-600" weight="fill" />
                      <span>Location Shared ✓ (Tap to Update)</span>
                    </button>
                  ) : (
                    <button
                      onClick={shareCustomerLocation}
                      className="w-full bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-50"
                    >
                      Share My Current Location
                    </button>
                  )}

                  {activeOrder.customer_confirmed_delivered ? (
                    <button
                      disabled
                      className="w-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <CheckCircle size={18} className="text-emerald-600" weight="fill" />
                      <span>Delivery Confirmed ✓</span>
                    </button>
                  ) : (
                    <button
                      onClick={confirmDelivered}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      I Received My Order
                    </button>
                  )}

                  {activeOrder.driver_confirmed_delivered && !activeOrder.customer_confirmed_delivered && (
                    <p className="text-sm text-gray-500">Driver confirmed delivery. Please confirm to complete.</p>
                  )}
                </div>
              )}
              {activeOrder.status !== 'delivered' && (
                <button
                  onClick={() => setShowMenuWhileActive(true)}
                  className="mt-6 text-blue-600 hover:underline font-medium"
                >
                  Continue browsing menu
                </button>
              )}
              {activeOrder.status === 'delivered' && (
                <button 
                  onClick={() => setActiveOrder(null)} 
                  className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Order Again
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 border-b pb-2">
                <h3 className="text-2xl font-bold text-gray-800">Our Menu</h3>
                {activeOrder && showMenuWhileActive && (
                  <button onClick={() => setShowMenuWhileActive(false)} className="text-blue-700 hover:underline font-medium text-sm">
                    Back to active order
                  </button>
                )}
              </div>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                  {[1,2,3,4].map(n => <div key={n} className="bg-gray-200 h-64 rounded-xl"></div>)}
                </div>
              ) : menu.length === 0 ? (
                 <div className="text-center p-12 bg-white rounded-xl shadow-sm border border-gray-100">
                   <p className="text-gray-500">The menu is currently empty. Please check back later!</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {menu.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col">
                      {item.image_url ? (
                        <img src={resolveAssetUrl((item.image_urls && item.image_urls[0]) || item.image_url)} alt={item.name} className="w-full h-48 object-cover" />
                      ) : (
                        <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-lg text-gray-900">{item.name}</h4>
                            <span className="font-bold text-blue-600">${Number(item.price).toFixed(2)}</span>
                          </div>
                          <p className="text-gray-500 text-sm mb-4 line-clamp-2">{item.description}</p>
                        </div>
                        <button 
                          onClick={() => addToCart(item)}
                          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-2.5 rounded-lg transition"
                        >
                          Add to Order
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Cart Sidebar */}
        <div className="w-full lg:w-96">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
            <h3 className="text-xl font-bold mb-6 flex items-center justify-between">
              Your Order
              <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">{cart.reduce((s,i)=>s+i.quantity,0)} items</span>
            </h3>
            
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <ShoppingCart size={48} className="mx-auto mb-3 opacity-20" />
                <p>Add some items to get started</p>
              </div>
            ) : (
              <div className="flex flex-col h-[calc(100vh-350px)] min-h-[300px]">
                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-start border-b border-gray-50 pb-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-gray-500 text-sm">${Number(item.price).toFixed(2)} x {item.quantity}</p>
                      </div>
                      <p className="font-bold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                
                <div className="pt-6 border-t mt-auto">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-gray-600 font-medium">Total</span>
                    <span className="text-2xl font-black text-gray-900">${cartTotal.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    disabled={!!activeOrder}
                    className={`w-full text-white font-bold py-4 rounded-xl shadow-md transition flex justify-center items-center space-x-2 
                      ${activeOrder ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}
                  >
                    <span>{activeOrder ? 'Order in Progress' : 'Checkout'}</span>
                    {!activeOrder && <span>→</span>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
