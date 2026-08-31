import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api, { resolveAssetUrl } from '../api';
import Footer from '../components/Footer';
import { groupMenuByCategory } from '../utils/groupMenuByCategory';
import {
  ShoppingCart,
  SignOut,
  SignIn,
  UserPlus,
  Sun,
  Moon,
  MapPin,
  CheckCircle,
  Minus,
  Plus,
  X,
  Package,
  MagnifyingGlass,
  Truck,
  CookingPot,
  Timer,
  ArrowLeft,
  ForkKnife,
  List,
  Sparkle,
  Bag,
  Trash,
  CreditCard,
  Money,
  Phone,
  ShieldCheck,
  Check,
  WarningCircle,
  ArrowRight,
} from '@phosphor-icons/react';
import { io } from 'socket.io-client';

export default function CustomerPortal() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const cartRef = useRef(null);

  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [activeOrder, setActiveOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [showMenuWhileActive, setShowMenuWhileActive] = useState(false);
  const [showOrderList, setShowOrderList] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Checkout modal & payment state
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('chapa'); // 'chapa'
  const [paymentVerificationState, setPaymentVerificationState] = useState(null);

  // Unpaid Chapa order state
  const [unpaidChapaOrder, setUnpaidChapaOrder] = useState(null);
  // null | 'retry' | 'cancel'
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await api.get('/menu');
        setMenu(res.data);
      } catch (err) {
        console.error('Failed to load menu', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (cartRef.current && !cartRef.current.contains(e.target)) {
        setCartOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const res = await api.get('/orders');
      setOrders(res.data);

      const activeValidOrder = res.data.find(
        (o) =>
          o.status !== 'delivered' &&
          (o.payment_method === 'cash' || (o.payment_method === 'chapa' && o.payment_status === 'paid'))
      );
      setActiveOrder(activeValidOrder || null);

      const unpaidOrder = res.data.find(
        (o) =>
          o.status !== 'delivered' &&
          o.payment_method === 'chapa' &&
          o.payment_status !== 'paid'
      );
      setUnpaidChapaOrder(unpaidOrder || null);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
  };

  useEffect(() => {
    if (!user) {
      setOrders([]);
      setActiveOrder(null);
      setUnpaidChapaOrder(null);
      return;
    }
    fetchOrders();
    const newSocket = io(import.meta.env.VITE_API_URL || '/');
    newSocket.on('order_status_update', (data) => {
      setActiveOrder((prev) => {
        if (prev && prev.id === data.order_id) {
          return { ...prev, status: data.status, driver_id: data.driver_id, payment_status: data.payment_status || prev.payment_status };
        }
        return prev;
      });
      fetchOrders();
    });
    newSocket.on('order_location_update', () => fetchOrders());
    return () => newSocket.close();
  }, [user]);

  // Handle return from Chapa Payment verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get('verify_payment');
    if (txRef && user) {
      setPaymentVerificationState({ loading: true, success: false, error: null });
      api.get(`/orders/verify-chapa/${txRef}`)
        .then((res) => {
          if (res.data.success) {
            setPaymentVerificationState({ loading: false, success: true, error: null });
            setCart([]);
            fetchOrders();
            if (res.data.order) {
              setActiveOrder(res.data.order);
              setShowOrderList(false);
              setShowMenuWhileActive(false);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            setPaymentVerificationState({
              loading: false,
              success: false,
              error: res.data.error || res.data.message || 'Payment verification was not successful with Chapa.'
            });
            fetchOrders();
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        })
        .catch((err) => {
          setPaymentVerificationState({
            loading: false,
            success: false,
            error: err.response?.data?.error || 'Payment verification could not be confirmed. Payment was not completed.'
          });
          fetchOrders();
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, [user]);


  const handleCancelUnpaidOrder = async (orderId) => {
    if (!orderId || actionLoading) return;
    const confirmed = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmed) return;
    setActionLoading('cancel');
    try {
      await api.delete(`/orders/${orderId}/cancel-unpaid`);
      setPaymentVerificationState(null);
      setUnpaidChapaOrder(null);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      await fetchOrders();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to cancel order. Please try again.';
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryChapa = async (orderId) => {
    if (!orderId || actionLoading) return;
    setActionLoading('retry');
    try {
      const res = await api.post(`/orders/${orderId}/retry-chapa`);
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
        return; // page navigating away — don't reset
      }
      alert('Could not get Chapa checkout URL. Please try switching to Cash on Delivery.');
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not initialize Chapa payment. Please try again or switch to Cash on Delivery.';
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const requireAuth = () => navigate('/login', { state: { from: '/' } });

  const openCheckout = () => {
    if (!user) {
      setCartOpen(false);
      requireAuth();
      return;
    }
    setCartOpen(false);
    setIsCheckoutModalOpen(true);
    setPhoneError('');
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      setIsCheckoutModalOpen(false);
      requireAuth();
      return;
    }

    if (cart.length === 0) {
      alert('Your cart is empty.');
      setIsCheckoutModalOpen(false);
      return;
    }

    // Validate phone number format only when provided
    if (customerPhone.trim()) {
      const cleanPhone = customerPhone.trim().replace(/[\s-]/g, '');
      const isValid = /^(\+251|0)?9\d{8}$|^(\+?\d{8,15})$/.test(cleanPhone);
      if (!isValid) {
        setPhoneError('Please enter a valid phone number (e.g. +251 912345678 or 0912345678)');
        return;
      }
    }
    setPhoneError('');
    setCheckoutLoading(true);

    try {
      const items = cart.map((i) => ({
        menu_item_id: i.id,
        quantity: i.quantity,
        price_at_time: i.price,
      }));
      const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      let customerLocation = {};
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              customerLocation = {
                customer_latitude: position.coords.latitude,
                customer_longitude: position.coords.longitude,
              };
              resolve();
            },
            () => resolve(),
            { timeout: 8000 }
          );
        });
      }

      const res = await api.post('/orders', {
        items,
        total_amount: totalAmount,
        customer_phone: customerPhone.trim() || null,
        payment_method: paymentMethod,
        ...customerLocation,
      });

      // If Chapa payment was chosen and checkout_url returned:
      if (paymentMethod === 'chapa' && res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
        return;
      }

      // If Cash on delivery:
      setActiveOrder(res.data);
      fetchOrders();
      setCart([]);
      setIsCheckoutModalOpen(false);
      setShowOrderList(false);
      setShowMenuWhileActive(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to place order');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const shareCustomerLocation = () => {
    if (!activeOrder || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await api.put(`/orders/${activeOrder.id}/customer-location`, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setActiveOrder(res.data);
        } catch (_err) {
          alert('Failed to share location');
        }
      },
      () => alert('Unable to read location.')
    );
  };

  const confirmDelivered = async () => {
    if (!activeOrder) return;
    try {
      const res = await api.put(`/orders/${activeOrder.id}/status`, { status: 'delivered' });
      setActiveOrder(res.data);
      fetchOrders();
      if (res.data.status === 'delivered') setShowMenuWhileActive(false);
    } catch (_err) {
      alert('Failed to confirm delivery');
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const allCategories = groupMenuByCategory(menu).map(({ category }) => category);
  const activeOrders = orders.filter(
    (o) =>
      o.status !== 'delivered' &&
      (o.payment_method === 'cash' || (o.payment_method === 'chapa' && o.payment_status === 'paid'))
  );

  const filteredMenu = menu.filter((item) => {
    const matchesCategory = !activeCategory || (item.category || 'Other') === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartItemQty = (itemId) => {
    const found = cart.find((c) => c.id === itemId);
    return found ? found.quantity : 0;
  };

  const statusConfig = {
    pending: { label: 'Order Placed', icon: Timer, color: 'text-amber-500', bg: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-amber-500/30', step: 1 },
    preparing: { label: 'In the Kitchen', icon: CookingPot, color: 'text-orange-500', bg: 'bg-orange-500/10 dark:bg-orange-500/20', border: 'border-orange-500/30', step: 2 },
    ready_for_pickup: { label: 'Ready for Pickup', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10 dark:bg-blue-500/20', border: 'border-blue-500/30', step: 3 },
    delivering: { label: 'Out for Delivery', icon: Truck, color: 'text-orange-500', bg: 'bg-orange-500/10 dark:bg-orange-500/20', border: 'border-orange-500/30', step: 4 },
    delivered: { label: 'Delivered', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', border: 'border-emerald-500/30', step: 5 },
  };

  const steps = ['Placed', 'Preparing', 'Ready', 'On the way', 'Delivered'];


  return (
    <div className="min-h-screen flex flex-col transition-theme bg-[#F7F5F0] dark:bg-[#0F1318] text-[#17191C] dark:text-[#F3F1EA]">
      
      {/* ======================= HEADER ======================= */}
      <header className="sticky top-0 z-50 transition-theme bg-[#F7F5F0]/95 dark:bg-[#0F1318]/95 backdrop-blur-md border-b border-[#DDD9D0] dark:border-[#303945] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          
          {/* Logo on Left */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/25 font-black text-base group-hover:scale-105 transition-transform">
              S
            </span>
            <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
              Speedy<span className="text-orange-500">Delivery</span>
            </span>
          </Link>

          {/* Right Area: Auth, Theme Toggle, Cart */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 sm:p-2.5 rounded-xl border border-[#DDD9D0] dark:border-[#303945] bg-[#EFEBE3] dark:bg-[#1B222B] text-[#555A5F] dark:text-[#C0BDB5] hover:text-orange-500 dark:hover:text-orange-400 hover:border-orange-500/40 transition shadow-sm"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <Sun size={18} weight="bold" className="text-amber-400 animate-in fade-in duration-200" />
              ) : (
                <Moon size={18} weight="bold" className="text-[#17191C] animate-in fade-in duration-200" />
              )}
            </button>

            {/* User Logged In state */}
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowOrderList(true);
                    setShowMenuWhileActive(false);
                    setCartOpen(false);
                    setMobileMenuOpen(false);
                  }}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    showOrderList
                      ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                      : 'border-[#DDD9D0] dark:border-[#303945] text-[#17191C] dark:text-[#F3F1EA] hover:border-orange-500/50 hover:bg-orange-500/5'
                  }`}
                >
                  <Package size={16} weight="bold" /> My Orders
                </button>
                
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EFEBE3] dark:bg-[#1B222B] border border-[#DDD9D0] dark:border-[#303945] text-xs font-medium text-[#17191C] dark:text-[#F3F1EA]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold">{user.name?.split(' ')[0]}</span>
                </div>

                <button
                  type="button"
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="p-2 sm:p-2.5 rounded-xl border border-[#DDD9D0] dark:border-[#303945] text-[#555A5F] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-900 transition"
                  title="Sign out"
                >
                  <SignOut size={18} />
                </button>
              </div>
            ) : (
              /* Guest Auth Buttons: Sign In & Sign Up */
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#17191C] dark:text-[#F3F1EA] hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-500/5 border border-transparent hover:border-orange-500/30 transition"
                >
                  <SignIn size={16} weight="bold" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-md shadow-orange-500/25 transition active:scale-95"
                >
                  <UserPlus size={16} weight="bold" />
                  <span>Create Account</span>
                </Link>
              </div>
            )}

            {/* Cart Button & Dropdown */}
            <div className="relative" ref={cartRef}>
              <button
                type="button"
                onClick={() => { setCartOpen((o) => !o); setMobileMenuOpen(false); }}
                className={`relative flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm ${
                  cartCount > 0
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/30'
                    : 'bg-[#EFEBE3] dark:bg-[#1B222B] text-[#17191C] dark:text-[#F3F1EA] border border-[#DDD9D0] dark:border-[#303945] hover:border-orange-500/50'
                }`}
              >
                <ShoppingCart size={18} weight="bold" />
                <span className="hidden sm:inline">${cartTotal.toFixed(2)}</span>
                {cartCount > 0 && (
                  <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full text-[11px] font-black bg-white text-orange-600 px-1 shadow">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Cart Drawer / Dropdown */}
              {cartOpen && (
                <div
                  className="absolute right-0 top-full mt-3 w-[min(calc(100vw-2rem),400px)] rounded-3xl border shadow-2xl overflow-hidden z-50 transition-theme bg-[#FFFFFF] dark:bg-[#1B222B] border-[#DDD9D0] dark:border-[#303945]"
                >
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDD9D0] dark:border-[#303945] bg-[#EFEBE3] dark:bg-[#151A21]">
                    <div className="flex items-center gap-2">
                      <Bag size={20} weight="bold" className="text-orange-500" />
                      <h3 className="font-extrabold text-base text-[#17191C] dark:text-[#F3F1EA]">Your Order</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                        {cartCount} items
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCartOpen(false)}
                      className="p-1 rounded-xl text-[#777C80] hover:text-[#17191C] dark:hover:text-[#F3F1EA] hover:bg-[#DDD9D0] dark:hover:bg-[#303945] transition"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {cart.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bag size={40} className="mx-auto text-[#777C80] dark:text-[#92918C] mb-2 opacity-50" />
                      <p className="text-sm font-bold text-[#17191C] dark:text-[#F3F1EA]">Your cart is empty</p>
                      <p className="text-xs text-[#555A5F] dark:text-[#C0BDB5] mt-1">Add some delicious meals from our menu!</p>
                    </div>
                  ) : (
                    <>
                      <ul className="divide-y divide-[#DDD9D0] dark:divide-[#303945] max-h-72 overflow-y-auto p-3 space-y-2">
                        {cart.map((item) => (
                          <li key={item.id} className="p-2 flex items-center justify-between gap-3 rounded-2xl hover:bg-[#EFEBE3]/60 dark:hover:bg-[#151A21]/60 transition">
                            <div className="flex items-center gap-3 min-w-0">
                              {item.image_url || (item.image_urls && item.image_urls[0]) ? (
                                <img
                                  src={resolveAssetUrl((item.image_urls && item.image_urls[0]) || item.image_url)}
                                  alt={item.name}
                                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#DDD9D0] dark:border-[#303945]"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-[#151A21] flex items-center justify-center text-orange-500 shrink-0">
                                  <ForkKnife size={20} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-xs sm:text-sm text-[#17191C] dark:text-[#F3F1EA] truncate">{item.name}</p>
                                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">${Number(item.price).toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 bg-[#EFEBE3] dark:bg-[#151A21] p-1 rounded-xl border border-[#DDD9D0] dark:border-[#303945]">
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, -1)}
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-[#17191C] dark:text-[#F3F1EA] hover:bg-white dark:hover:bg-[#303945] transition"
                                title="Decrease quantity"
                              >
                                <Minus size={11} weight="bold" />
                              </button>
                              <span className="w-5 text-center text-xs font-black text-[#17191C] dark:text-[#F3F1EA]">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQty(item.id, 1)}
                                className="w-6 h-6 rounded-lg flex items-center justify-center bg-orange-500 text-white hover:bg-orange-600 transition shadow-sm"
                                title="Increase quantity"
                              >
                                <Plus size={11} weight="bold" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              className="p-1.5 rounded-lg text-[#777C80] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                              title="Remove item"
                            >
                              <Trash size={15} />
                            </button>
                          </li>
                        ))}
                      </ul>

                      <div className="p-5 border-t border-[#DDD9D0] dark:border-[#303945] bg-[#EFEBE3] dark:bg-[#151A21] space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#555A5F] dark:text-[#C0BDB5] font-medium">Subtotal</span>
                          <span className="font-black text-lg text-[#17191C] dark:text-[#F3F1EA]">${cartTotal.toFixed(2)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={openCheckout}
                          disabled={checkoutLoading}
                          className="w-full py-3.5 rounded-2xl font-extrabold text-sm transition text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-orange-500/25 active:scale-[0.99]"
                        >
                          {checkoutLoading ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              Processing...
                            </>
                          ) : user ? (
                            `Proceed to Checkout • $${cartTotal.toFixed(2)}`
                          ) : (
                            'Sign In to Checkout'
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {/* Mobile Menu Hamburger Button (visible on mobile < sm) */}
            <button
              type="button"
              onClick={() => { setMobileMenuOpen((v) => !v); setCartOpen(false); }}
              aria-label="Toggle mobile menu"
              className="sm:hidden p-2 rounded-xl border border-[#DDD9D0] dark:border-[#303945] bg-[#EFEBE3] dark:bg-[#1B222B] text-[#17191C] dark:text-[#F3F1EA] hover:text-orange-500 dark:hover:text-orange-400 transition"
            >
              {mobileMenuOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
            </button>

          </div>
        </div>

        {/* ======================= MOBILE NAVIGATION DRAWER ======================= */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-[#DDD9D0] dark:border-[#303945] bg-[#F7F5F0] dark:bg-[#1B222B] px-4 py-4 space-y-3 shadow-xl transition-all">
            <Link
              to="/"
              onClick={() => {
                setShowOrderList(false);
                setShowMenuWhileActive(true);
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-sm text-[#17191C] dark:text-[#F3F1EA] hover:bg-[#EFEBE3] dark:hover:bg-[#151A21] transition"
            >
              <ForkKnife size={18} className="text-orange-500" />
              <span>Menu & Food Items</span>
            </Link>

            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowOrderList(true);
                    setShowMenuWhileActive(false);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-semibold text-sm text-[#17191C] dark:text-[#F3F1EA] hover:bg-[#EFEBE3] dark:hover:bg-[#151A21] transition"
                >
                  <span className="flex items-center gap-2.5">
                    <Package size={18} className="text-orange-500" />
                    <span>My Orders</span>
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                    {orders.length} total
                  </span>
                </button>

                <div className="pt-2 pb-1 border-t border-[#DDD9D0] dark:border-[#303945] flex items-center justify-between gap-3 px-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#555A5F] dark:text-[#C0BDB5]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="truncate">{user.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/50 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-2 border-t border-[#DDD9D0] dark:border-[#303945] flex flex-col gap-2">
                {/* Sign In option */}
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-[#17191C] dark:text-[#F3F1EA] bg-[#EFEBE3] dark:bg-[#151A21] border border-[#DDD9D0] dark:border-[#303945] hover:border-orange-500/50 transition"
                >
                  <SignIn size={18} weight="bold" className="text-[#555A5F] dark:text-[#C0BDB5]" />
                  <span>Sign In</span>
                </Link>

                {/* Create Account / Sign Up option - Visually Noticeable Accent */}
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-black text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-md shadow-orange-500/25 active:scale-[0.99] transition"
                >
                  <UserPlus size={18} weight="bold" />
                  <span>Create Account</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ======================= PAYMENT VERIFICATION BANNER ======================= */}
      {paymentVerificationState && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {paymentVerificationState.loading && (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center gap-3 text-blue-700 dark:text-blue-300 shadow-sm animate-pulse">
              <span className="w-5 h-5 border-2 border-blue-500/40 border-t-blue-600 rounded-full animate-spin shrink-0" />
              <div className="text-sm font-medium">
                <p className="font-bold">Verifying payment with Chapa...</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Please wait while we confirm your transaction.</p>
              </div>
            </div>
          )}
          {paymentVerificationState.success && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} weight="fill" className="text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-extrabold">Payment Successful!</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Your order is paid and confirmed for kitchen preparation.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentVerificationState(null)}
                className="p-1 rounded-lg text-emerald-600 hover:text-emerald-900 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          )}
          {paymentVerificationState.error && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-between gap-3 text-red-800 dark:text-red-200 shadow-sm">
              <div className="flex items-center gap-3">
                <WarningCircle size={24} weight="fill" className="text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-extrabold">Payment Incomplete or Failed</p>
                  <p className="text-xs text-red-600 dark:text-red-400">{paymentVerificationState.error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentVerificationState(null)}
                className="p-1 rounded-lg text-red-600 hover:text-red-900 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================= CHECKOUT MODAL ======================= */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#151c2e] border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col transition-theme">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center">
                  <Bag size={20} weight="bold" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Checkout & Order Review</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Review your meal details and select payment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* SECTION 1: Order Items Summary & Removal */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span>1. Your Food Items ({cartCount})</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">Modify or remove items before payment</span>
                </div>

                {cart.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">All items removed</p>
                    <p className="text-xs text-slate-400 mt-1">Please add items from the menu to place an order.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-2 max-h-56 overflow-y-auto">
                    {cart.map((item) => (
                      <li key={item.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {item.image_url || (item.image_urls && item.image_urls[0]) ? (
                            <img
                              src={resolveAssetUrl((item.image_urls && item.image_urls[0]) || item.image_url)}
                              alt={item.name}
                              className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-slate-800 flex items-center justify-center text-orange-500 shrink-0">
                              <ForkKnife size={18} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{item.name}</p>
                            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">${Number(item.price).toFixed(2)} each</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, -1)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              title="Decrease quantity"
                            >
                              <Minus size={11} weight="bold" />
                            </button>
                            <span className="w-5 text-center text-xs font-black text-slate-900 dark:text-white">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.id, 1)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center bg-orange-500 text-white hover:bg-orange-600 transition shadow-sm"
                              title="Increase quantity"
                            >
                              <Plus size={11} weight="bold" />
                            </button>
                          </div>

                          <span className="font-extrabold text-sm text-slate-900 dark:text-white w-14 text-right">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                            title="Remove item from order"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* SECTION 2: Customer Details */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  2. Customer Information
                </h3>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400">Name: </span>
                    <strong className="text-slate-900 dark:text-white">{user?.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Email: </span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{user?.email}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Customer Phone Number (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    3. Phone Number (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400">Optional</span>
                </div>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="+251 9XXXXXXXX or 09XXXXXXXX"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition ${
                      phoneError
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 text-slate-900 dark:text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
                    }`}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Used only if we need to contact you about your order.
                </p>
                {phoneError && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">
                    {phoneError}
                  </p>
                )}
              </div>

              {/* SECTION 4: Payment Method */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  4. Payment Method
                </h3>
                <div className="p-4 rounded-2xl border border-orange-500 bg-orange-50/40 dark:bg-orange-950/20 ring-2 ring-orange-500/20 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <CreditCard size={20} weight="duotone" />
                      </span>
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">Online Payment (Chapa)</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      Required
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      Instant online payment via Telebirr, CBE Birr, or Credit/Debit Cards.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">
                        Telebirr
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300">
                        CBE Birr
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Cards
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: Totals */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2 text-sm">
                <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs">
                  <span>Subtotal</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400 text-xs">
                  <span>Delivery Fee</span>
                  <span className="text-emerald-500 font-bold">Free</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 font-black text-base text-slate-900 dark:text-white">
                  <span>Total Amount</span>
                  <span className="text-xl text-orange-600 dark:text-orange-400">${cartTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="order-2 sm:order-1 flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Continue Shopping
              </button>
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={checkoutLoading || cart.length === 0}
                className="order-1 sm:order-2 flex-[2] py-3 rounded-xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-lg shadow-orange-500/25 transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Connecting to Chapa...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={18} weight="bold" />
                    <span>Pay with Chapa • ${cartTotal.toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================= HERO & SEARCH ======================= */}
      {!showOrderList && !(activeOrder && !showMenuWhileActive && user) && (
        <section className="relative overflow-hidden border-b transition-theme bg-white dark:bg-[#1B222B] border-[#DDD9D0] dark:border-[#303945]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                <Sparkle size={14} weight="fill" />
                Fresh & Fast Food Delivery
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#17191C] dark:text-[#F3F1EA] leading-tight mb-3">
                Satisfy your craving, <span className="text-orange-500">delivered fast.</span>
              </h1>
              <p className="text-sm sm:text-base text-[#555A5F] dark:text-[#C0BDB5] mb-6 max-w-xl">
                Browse our fresh kitchen menu, customize your favorite meals, and track your driver in real time.
              </p>

              {/* Modern Search Bar */}
              <div className="relative max-w-xl">
                <MagnifyingGlass
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777C80] dark:text-[#92918C]"
                />
                <input
                  type="text"
                  placeholder="Search for burgers, drinks, pizza, desserts..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setActiveCategory(null);
                  }}
                  className="w-full pl-12 pr-10 py-3.5 rounded-2xl border text-sm outline-none transition font-medium shadow-sm bg-[#EFEBE3] dark:bg-[#151A21] border-[#DDD9D0] dark:border-[#303945] text-[#17191C] dark:text-[#F3F1EA] placeholder-[#777C80] dark:placeholder-[#92918C] focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#777C80] hover:text-[#17191C] dark:hover:text-[#F3F1EA] p-1"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ======================= CATEGORY TABS ======================= */}
      {!showOrderList && !(activeOrder && !showMenuWhileActive && user) && allCategories.length > 0 && (
        <nav aria-label="Food categories" className="sticky top-16 z-30 transition-theme bg-[#F7F5F0]/90 dark:bg-[#0F1318]/90 backdrop-blur-md border-b border-[#DDD9D0] dark:border-[#303945] shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
              
              {/* "All" Tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveCategory(null);
                  setSearchQuery('');
                }}
                className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                  !activeCategory && !searchQuery
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-100'
                    : 'bg-[#EFEBE3] dark:bg-[#1B222B] text-[#555A5F] dark:text-[#C0BDB5] hover:bg-[#DDD9D0] dark:hover:bg-[#222A34] border border-[#DDD9D0] dark:border-[#303945]'
                }`}
              >
                <span>All Items</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  !activeCategory && !searchQuery ? 'bg-white/20 text-white' : 'bg-[#DDD9D0] dark:bg-[#151A21] text-[#17191C] dark:text-[#F3F1EA]'
                }`}>
                  {menu.length}
                </span>
              </button>

              {/* Category Tabs */}
              {allCategories.map((cat) => {
                const count = menu.filter((item) => (item.category || 'Other') === cat).length;
                const isSelected = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setActiveCategory(cat);
                      setSearchQuery('');
                    }}
                    className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                      isSelected
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-100'
                        : 'bg-[#EFEBE3] dark:bg-[#1B222B] text-[#555A5F] dark:text-[#C0BDB5] hover:bg-[#DDD9D0] dark:hover:bg-[#222A34] border border-[#DDD9D0] dark:border-[#303945]'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#DDD9D0] dark:bg-[#151A21] text-[#17191C] dark:text-[#F3F1EA]'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      {/* ======================= MAIN CONTENT ======================= */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* 1. ORDER LIST VIEW */}
        {user && showOrderList ? (
          <div className="max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => setShowOrderList(false)}
              className="inline-flex items-center gap-2 text-sm font-bold mb-6 text-orange-600 dark:text-orange-400 hover:underline"
            >
              <ArrowLeft size={16} /> Back to menu
            </button>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Package size={24} weight="fill" className="text-orange-500" />
                My Orders
              </h2>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {orders.length} total
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white dark:bg-[#151c2e] rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
                <Package size={48} className="mx-auto text-slate-400 mb-3" />
                <p className="text-base font-bold text-slate-800 dark:text-slate-200">No orders yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">When you place an order, it will appear right here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => {
                  const cfg = statusConfig[o.status] || statusConfig.pending;
                  return (
                    <div
                      key={o.id}
                      className="bg-white dark:bg-[#151c2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-orange-500/40 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-base text-slate-900 dark:text-white">Order #{o.id}</p>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                            {cfg.label}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                            o.payment_status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : o.payment_status === 'failed'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}>
                            {o.payment_method === 'chapa' ? 'Chapa' : 'Cash'} • {o.payment_status === 'paid' ? 'Paid ✓' : o.payment_status === 'failed' ? 'Payment Failed ✗' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {o.created_at ? new Date(o.created_at).toLocaleString() : 'Recent order'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                        <p className="text-lg font-black text-orange-600 dark:text-orange-400">
                          ${Number(o.total_amount).toFixed(2)}
                        </p>
                        {o.status !== 'delivered' && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveOrder(o);
                              setShowOrderList(false);
                              setShowMenuWhileActive(false);
                            }}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white shadow transition"
                          >
                            Track Live
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : 

        /* 2. UNPAID CHAPA ORDER ACTION CARD */
        user && unpaidChapaOrder && !activeOrder && !showMenuWhileActive ? (
          <div className="max-w-xl mx-auto">
            <div className="bg-white dark:bg-[#151c2e] rounded-3xl border border-red-500/40 p-6 sm:p-8 shadow-xl text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4 border border-red-500/20">
                <WarningCircle size={36} weight="duotone" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 mb-3 border border-red-500/20">
                Payment Not Completed • Order #{unpaidChapaOrder.id}
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                Action Required: Complete Payment
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Your online payment of <strong className="text-slate-900 dark:text-white">${Number(unpaidChapaOrder.total_amount).toFixed(2)}</strong> via Chapa was not completed. The kitchen will <strong>NOT</strong> start cooking or preparing your meal until payment is confirmed.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">

                {/* 1. Retry Chapa Payment */}
                <button
                  type="button"
                  onClick={() => handleRetryChapa(unpaidChapaOrder.id)}
                  disabled={actionLoading !== null}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl font-extrabold text-xs sm:text-sm text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-md shadow-orange-500/25 transition active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading === 'retry' ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CreditCard size={18} weight="bold" />
                  )}
                  {actionLoading === 'retry' ? 'Redirecting to Chapa…' : 'Retry Payment'}
                </button>

                {/* 2. Cancel Order */}
                <button
                  type="button"
                  onClick={() => handleCancelUnpaidOrder(unpaidChapaOrder.id)}
                  disabled={actionLoading !== null}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-800 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {actionLoading === 'cancel' ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  {actionLoading === 'cancel' ? 'Cancelling…' : 'Cancel Order'}
                </button>

              </div>
            </div>
          </div>
        ) :

        /* 3. ACTIVE ORDER TRACKING CARD */
        user && activeOrder && !showMenuWhileActive ? (
          <div className="max-w-xl mx-auto">
            <div className="bg-white dark:bg-[#151c2e] rounded-3xl border border-slate-200 dark:border-slate-800/80 p-6 sm:p-8 shadow-xl">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 mb-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                  Live Order #{activeOrder.id}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {(statusConfig[activeOrder.status] || statusConfig.pending).label}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Total: <strong className="text-slate-900 dark:text-white">${Number(activeOrder.total_amount).toFixed(2)}</strong>
                </p>
              </div>

              {/* Progress steps */}
              <div className="flex items-center justify-between mb-8 px-1">
                {steps.map((step, i) => {
                  const currentStep = (statusConfig[activeOrder.status] || statusConfig.pending).step;
                  const isDone = i + 1 < currentStep;
                  const isCurrent = i + 1 === currentStep;
                  return (
                    <React.Fragment key={step}>
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                            isDone || isCurrent
                              ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 ring-4 ring-orange-500/10'
                              : 'text-slate-400 border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                          }`}
                        >
                          {isDone ? '✓' : i + 1}
                        </div>
                        <span
                          className={`text-[11px] font-bold ${
                            isCurrent ? 'text-orange-500' : isDone ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                      {i < steps.length - 1 && (
                        <div
                          className={`flex-1 h-1 mx-1.5 rounded-full transition-all ${
                            i + 1 < currentStep ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Action Buttons based on delivery state */}
              {activeOrder.status === 'delivering' && (
                <div className="space-y-3">
                  {activeOrder.customer_latitude || activeOrder.customer_longitude || activeOrder.customer_location_updated_at ? (
                    <button
                      type="button"
                      onClick={shareCustomerLocation}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-sm font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
                    >
                      <CheckCircle size={18} className="text-emerald-500" weight="fill" />
                      <span>Location Shared ✓ (Tap to Update)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={shareCustomerLocation}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <MapPin size={18} className="text-orange-500" /> Share Delivery Location
                    </button>
                  )}

                  {activeOrder.customer_confirmed_delivered ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 rounded-2xl text-sm font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" weight="fill" />
                      <span>Delivery Confirmed ✓</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={confirmDelivered}
                      className="w-full py-3 rounded-2xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20"
                    >
                      I Received My Order
                    </button>
                  )}

                  {activeOrder.driver_confirmed_delivered && !activeOrder.customer_confirmed_delivered && (
                    <p className="text-xs text-center text-amber-500 font-semibold animate-pulse">
                      Driver reported order delivered. Please confirm above!
                    </p>
                  )}
                </div>
              )}

              {activeOrder.status !== 'delivered' && activeOrder.status !== 'delivering' && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    We'll keep you updated as your meal is cooked and picked up by our driver.
                  </p>
                </div>
              )}

              {activeOrder.status === 'delivered' && (
                <button
                  type="button"
                  onClick={() => setActiveOrder(null)}
                  className="w-full mt-4 py-3.5 rounded-2xl text-sm font-black text-white bg-orange-500 hover:bg-orange-600 transition shadow-lg shadow-orange-500/25"
                >
                  Order Again
                </button>
              )}

              <button
                type="button"
                onClick={() => (activeOrder.status === 'delivered' ? setActiveOrder(null) : setShowMenuWhileActive(true))}
                className="w-full mt-4 text-xs font-bold text-center text-orange-600 dark:text-orange-400 hover:underline"
              >
                {activeOrder.status === 'delivered' ? 'Browse Menu' : '← Continue Browsing Menu'}
              </button>
            </div>
          </div>
        ) : (
          
          /* 3. MENU ITEMS RESPONSIVE GRID */
          <>
            {user && activeOrders.length > 0 && showMenuWhileActive && (
              <div className="mb-6 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                  You have {activeOrders.length} active order{activeOrders.length > 1 ? 's' : ''} in progress {activeOrder ? `(#${activeOrder.id})` : ''}
                </span>
                <div className="flex items-center gap-2">
                  {activeOrders.length > 1 && (
                    <button
                      type="button"
                      onClick={() => { setShowOrderList(true); setShowMenuWhileActive(false); }}
                      className="text-xs font-bold px-3 py-1 rounded-xl border border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 transition"
                    >
                      All Orders ({orders.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowMenuWhileActive(false)}
                    className="text-xs font-bold px-3 py-1 rounded-xl bg-orange-500 text-white shadow-sm hover:bg-orange-600 transition"
                  >
                    View Status
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              /* Loading skeletons */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div
                    key={n}
                    className="bg-white dark:bg-[#151c2e] rounded-3xl border border-slate-200 dark:border-slate-800 p-4 h-72 animate-pulse flex flex-col justify-between"
                  >
                    <div className="w-full h-36 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-2 mt-3">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-16" />
                      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : menu.length === 0 ? (
              <div className="text-center py-20">
                <CookingPot size={56} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">No dishes available right now</p>
                <p className="text-xs text-slate-400 mt-1">Please check back soon for exciting dishes!</p>
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="text-center py-20">
                <MagnifyingGlass size={56} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">No matching dishes found</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing your search or browsing all categories.</p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setActiveCategory(null); }}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              /* FOOD ITEMS GRID */
              <div>
                {activeCategory && (
                  <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <span className="w-2.5 h-6 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" />
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {activeCategory}
                    </h2>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {filteredMenu.length} {filteredMenu.length === 1 ? 'dish' : 'dishes'}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                  {filteredMenu.map((item) => {
                    const qty = cartItemQty(item.id);
                    const imgSrc = (item.image_urls && item.image_urls[0]) || item.image_url;

                    return (
                      <div
                        key={item.id}
                        className="group bg-white dark:bg-[#151c2e] rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col shadow-sm hover:shadow-xl hover:border-orange-500/40 dark:hover:border-orange-500/40 transition-all duration-300 hover:-translate-y-1"
                      >
                        {/* Image Box */}
                        <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-slate-100 dark:bg-slate-800/60 shrink-0">
                          {imgSrc ? (
                            <img
                              src={resolveAssetUrl(imgSrc)}
                              alt={item.name}
                              className="w-full h-full object-cover food-card-img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                              <ForkKnife size={36} weight="duotone" />
                              <span className="text-[11px] font-medium mt-1">Delicious Dish</span>
                            </div>
                          )}
                          {/* Category Badge overlay */}
                          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white shadow">
                            {item.category || 'Special'}
                          </span>
                        </div>

                        {/* Card Body */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-1 mb-1 group-hover:text-orange-500 transition-colors">
                              {item.name}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {item.description || 'Freshly prepared with authentic ingredients and rich spices.'}
                            </p>
                          </div>

                          {/* Price + Add to Cart Row */}
                          <div className="flex items-center justify-between gap-3 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none mb-0.5">Price</span>
                              <span className="font-black text-lg text-orange-600 dark:text-orange-400">
                                ${Number(item.price).toFixed(2)}
                              </span>
                            </div>

                            {qty > 0 ? (
                              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                                <button
                                  type="button"
                                  onClick={() => updateQty(item.id, -1)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={12} weight="bold" />
                                </button>
                                <span className="w-5 text-center text-xs font-black">{qty}</span>
                                <button
                                  type="button"
                                  onClick={() => updateQty(item.id, 1)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-500 text-white hover:bg-orange-600 transition shadow-sm"
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={12} weight="bold" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addToCart(item)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 active:scale-95 transition-all duration-150"
                              >
                                <Plus size={14} weight="bold" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ======================= MOBILE BOTTOM FLOATING CART ======================= */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-4 left-4 right-4 sm:hidden z-40">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between py-3.5 px-5 rounded-2xl text-white font-extrabold text-sm shadow-2xl bg-gradient-to-r from-orange-600 to-amber-600 active:scale-[0.99] transition shadow-orange-500/30"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={20} weight="bold" />
              <span>{cartCount} {cartCount === 1 ? 'item' : 'items'} in Cart</span>
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-xl text-xs font-black">
              ${cartTotal.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* ======================= FOOTER ======================= */}
      <Footer />
    </div>
  );
}
