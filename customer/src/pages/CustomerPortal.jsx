import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useModal } from '../context/ModalContext';
import api, { resolveAssetUrl } from '../api';
import Footer from '../components/Footer';
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
  ForkKnife,
  List,
  Sparkle,
  Trash,
  CreditCard,
  Money,
  Phone,
  ShieldCheck,
  Check,
  WarningCircle,
  ArrowRight,
  Storefront,
  CaretRight,
  Coffee,
  Buildings,
  ArrowsClockwise,
  User,
  Clock,
  Star,
  Info
} from '@phosphor-icons/react';
import { io } from 'socket.io-client';

export default function CustomerPortal() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showModal } = useModal();
  const navigate = useNavigate();
  const cartRef = useRef(null);

  // Data states
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false);

  // Cart state
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('speedy_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);

  // Order & tracking states
  const [orders, setOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [unpaidChapaOrder, setUnpaidChapaOrder] = useState(null);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [paymentVerificationState, setPaymentVerificationState] = useState(null);

  // Checkout modal
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [phoneError, setPhoneError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('chapa');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Mobile navigation drawer
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('speedy_cart', JSON.stringify(cart));
  }, [cart]);

  // Load businesses & categories
  useEffect(() => {
    fetchBusinesses();
    fetchCategories();
  }, []);

  // Fetch businesses
  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/businesses');
      setBusinesses(res.data);
    } catch (err) {
      console.error('Failed to load businesses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/menu/categories');
      setCategories(res.data || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Load menu items when selected business changes, or load all available
  useEffect(() => {
    const fetchMenu = async () => {
      setMenuLoading(true);
      try {
        if (selectedBusiness) {
          const res = await api.get(`/businesses/${selectedBusiness.id}/menu`);
          setMenu(res.data);
        } else {
          const res = await api.get('/menu');
          setMenu(res.data);
        }
      } catch (err) {
        console.error('Failed to load menu items:', err);
      } finally {
        setMenuLoading(false);
      }
    };
    fetchMenu();
  }, [selectedBusiness]);

  // Load orders for authenticated customer
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
      console.error('Failed to fetch orders:', err);
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

    const socket = io(import.meta.env.VITE_API_URL || '/');
    socket.on('order_status_update', (data) => {
      setActiveOrder((prev) => {
        if (prev && prev.id === data.order_id) {
          return {
            ...prev,
            status: data.status,
            driver_id: data.driver_id,
            payment_status: data.payment_status || prev.payment_status,
          };
        }
        return prev;
      });
      fetchOrders();
    });

    socket.on('order_location_update', () => fetchOrders());
    return () => socket.close();
  }, [user]);

  // Verify Chapa payment return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get('verify_payment');
    const subTxRef = params.get('verify_subscription');

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
            }
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            setPaymentVerificationState({
              loading: false,
              success: false,
              error: res.data.error || 'Payment verification was not successful.',
            });
            fetchOrders();
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        })
        .catch((err) => {
          setPaymentVerificationState({
            loading: false,
            success: false,
            error: err.response?.data?.error || 'Payment verification could not be confirmed.',
          });
          fetchOrders();
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }

    if (subTxRef) {
      api.get(`/subscriptions/verify-subscription/${subTxRef}`)
        .then((res) => {
          showModal({ title: 'Subscription Verified', message: res.data.message || 'Business subscription verified successfully! You can now log into the Owner Portal.', type: 'success' });
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          showModal({ title: 'Verification Error', message: 'Subscription verification error: ' + (err.response?.data?.error || err.message), type: 'danger' });
        });
    }
  }, [user]);

  // Cart operations
  const addToCart = async (item) => {
    const currentBizId = cart[0]?.business_id;
    if (currentBizId && item.business_id && currentBizId !== item.business_id) {
      const confirmed = await showModal({
        title: 'Start Order From New Business?',
        message: 'Your cart contains items from another business. Would you like to clear your cart and start a new order from this business?',
        type: 'confirm',
        confirmText: 'Clear & Add Item',
        cancelText: 'Keep Current Cart'
      });
      if (!confirmed) return;
      setCart([{ ...item, quantity: 1 }]);
      setCartOpen(true);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  const deliveryFee = cart.length > 0 ? 50.0 : 0;
  const grandTotal = cartTotal + deliveryFee;

  // Checkout handling
  const handleInitiateCheckout = () => {
    if (!user) {
      navigate('/login', { state: { from: '/' } });
      return;
    }
    setIsCheckoutModalOpen(true);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!customerPhone.trim()) {
      setPhoneError('Please enter a valid phone number for delivery contact.');
      return;
    }
    setPhoneError('');
    setCheckoutLoading(true);

    try {
      const payload = {
        items: cart.map((i) => ({
          menu_item_id: i.id,
          quantity: i.quantity,
          price_at_time: i.price,
        })),
        total_amount: grandTotal,
        customer_phone: customerPhone.trim(),
        payment_method: paymentMethod,
        business_id: cart[0]?.business_id || selectedBusiness?.id || null,
      };

      const res = await api.post('/orders', payload);
      setCart([]);
      setIsCheckoutModalOpen(false);

      if (res.data.checkout_url) {
        // Redirect to Chapa checkout
        window.location.href = res.data.checkout_url;
      } else {
        await fetchOrders();
        setActiveOrder(res.data);
      }
    } catch (err) {
      showModal({ title: 'Order Failed', message: err.response?.data?.error || 'Failed to place order. Please try again.', type: 'danger' });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancelUnpaidOrder = async (orderId) => {
    if (!orderId || actionLoading) return;
    const confirmed = await showModal({
      title: 'Cancel Order',
      message: 'Are you sure you want to cancel this unpaid order?',
      type: 'danger',
      confirmText: 'Yes, Cancel Order',
      cancelText: 'Keep Order'
    });
    if (!confirmed) return;
    setActionLoading('cancel');
    try {
      await api.delete(`/orders/${orderId}/cancel-unpaid`);
      setUnpaidChapaOrder(null);
      await fetchOrders();
    } catch (err) {
      showModal({ title: 'Error', message: err.response?.data?.error || 'Failed to cancel unpaid order', type: 'danger' });
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
      }
    } catch (err) {
      showModal({ title: 'Payment Retry Error', message: err.response?.data?.error || 'Failed to initialize payment retry.', type: 'danger' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSwitchToCash = async (orderId) => {
    if (!orderId || actionLoading) return;
    setActionLoading('cash');
    try {
      await api.put(`/orders/${orderId}/switch-to-cash`);
      setUnpaidChapaOrder(null);
      await fetchOrders();
    } catch (err) {
      showModal({ title: 'Payment Update Error', message: err.response?.data?.error || 'Failed to switch to Cash on Delivery', type: 'danger' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmCustomerDelivered = async (orderId) => {
    try {
      await api.put(`/orders/${orderId}/status`, {
        customer_confirmed_delivered: true,
        status: 'delivered',
      });
      await fetchOrders();
    } catch (err) {
      showModal({ title: 'Confirmation Error', message: 'Failed to confirm delivery: ' + (err.response?.data?.error || err.message), type: 'danger' });
    }
  };

  // Filtered businesses
  const filteredBusinesses = businesses.filter((b) => {
    const matchType = businessTypeFilter === 'All' || b.business_type === businessTypeFilter;
    const matchSearch =
      !searchQuery ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.address?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  // Filtered menu items
  const filteredMenu = menu.filter((item) => {
    const matchCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex flex-col font-sans transition-theme">
      {/* ============================================================== */}
      {/* 1. TOP NAVIGATION BAR                                          */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-40 bg-[var(--bg-card)]/95 backdrop-blur-md border-b border-[var(--border-light)] transition-theme">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-18 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-2">
            <Link to="/" onClick={() => setSelectedBusiness(null)} className="flex items-center gap-2 group shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-[#FF8C33] flex items-center justify-center text-white shadow-md shadow-[#FF6B00]/25 group-hover:scale-105 transition">
                <Truck size={20} className="sm:hidden" weight="fill" />
                <Truck size={24} className="hidden sm:block" weight="fill" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base sm:text-xl tracking-tight leading-none text-[var(--text-main)]">
                  Speedy<span className="text-[#FF6B00]">Delivery</span>
                </span>
                <span className="text-[9px] sm:text-[10px] tracking-wider font-semibold text-[var(--text-muted)] uppercase hidden xs:block mt-0.5">
                  Multi-Business Hub
                </span>
              </div>
            </Link>

            {/* Breadcrumb if a business is selected */}
            {selectedBusiness && (
              <div className="hidden sm:flex items-center gap-1.5 pl-2 ml-2 border-l border-[var(--border-light)] text-xs">
                <button
                  onClick={() => setSelectedBusiness(null)}
                  className="text-[var(--text-muted)] hover:text-[#FF6B00] transition font-medium"
                >
                  Businesses
                </button>
                <CaretRight size={12} className="text-[var(--text-muted)]" />
                <span className="font-semibold text-[var(--text-main)] truncate max-w-[120px]">{selectedBusiness.name}</span>
              </div>
            )}
          </div>

          {/* Quick Search in Header (Desktop) */}
          <div className="hidden lg:flex items-center flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <MagnifyingGlass
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                placeholder="Search restaurants, cafes, hotels, or foods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Actions & Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark/Light Mode"
              className="p-2 sm:p-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[#FF6B00] transition shadow-sm"
            >
              {isDark ? <Sun size={17} weight="bold" /> : <Moon size={17} weight="bold" />}
            </button>

            {/* Register Business CTA (Desktop/tablet) */}
            <button
              onClick={() => navigate('/register-business')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl border border-[#FF6B00]/30 text-[#FF6B00] bg-[#FF6B00]/5 hover:bg-[#FF6B00] hover:text-white transition shadow-sm"
            >
              <Storefront size={15} weight="bold" />
              <span>Partner</span>
            </button>

            {/* Active / Past Orders button */}
            {user && (
              <button
                onClick={() => setShowOrderHistory(!showOrderHistory)}
                className={`relative flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold rounded-xl border transition ${
                  showOrderHistory || activeOrder
                    ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]'
                    : 'border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[#FF6B00]/50'
                }`}
              >
                <Package size={17} weight="bold" />
                <span className="hidden md:inline">My Orders</span>
                {activeOrder && (
                  <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-ping" />
                )}
              </button>
            )}

            {/* Shopping Cart Button */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#FF6B00]/25 transition active:scale-95"
            >
              <ShoppingCart size={17} weight="bold" />
              <span className="hidden sm:inline">Cart</span>
              {cart.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] sm:text-xs bg-white text-[#FF6B00] font-black rounded-full">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>

            {/* User Account / Auth */}
            {user ? (
              <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-[var(--border-light)]">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-[var(--text-main)] leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium capitalize">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition"
                >
                  <SignOut size={18} weight="bold" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 pl-1">
                <Link
                  to="/login"
                  className="px-2.5 py-1.5 text-xs font-bold rounded-xl text-[var(--text-main)] hover:text-[#FF6B00] transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] hover:border-[#FF6B00] hover:text-[#FF6B00] transition"
                >
                  <UserPlus size={15} />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Bar - Directly accessible on phones */}
        <div className="lg:hidden px-3 pb-2.5 pt-1 border-t border-[var(--border-light)]/40 bg-[var(--bg-card)]">
          <div className="relative w-full">
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              placeholder="Search food, restaurants, cafes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#FF6B00]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)] font-bold p-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. PAYMENT VERIFICATION ALERT (IF RETURNING FROM CHAPA)        */}
      {/* ============================================================== */}
      {paymentVerificationState && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
          {paymentVerificationState.loading ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center gap-3">
              <ArrowsClockwise size={24} className="animate-spin" />
              <span className="font-semibold text-sm">Verifying your payment with Chapa payment gateway...</span>
            </div>
          ) : paymentVerificationState.success ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} weight="fill" />
                <span className="font-bold text-sm">Payment successful! Your order has been placed and sent to the kitchen.</span>
              </div>
              <button
                onClick={() => setPaymentVerificationState(null)}
                className="text-xs font-semibold hover:underline"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <WarningCircle size={24} weight="fill" />
                <span className="font-bold text-sm">{paymentVerificationState.error}</span>
              </div>
              <button
                onClick={() => setPaymentVerificationState(null)}
                className="text-xs font-semibold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. ACTIVE ORDER BANNER / TRACKER (IF CUSTOMER HAS ACTIVE ORDER) */}
      {/* ============================================================== */}
      {activeOrder && (
        <section className="bg-gradient-to-r from-[#FF6B00]/10 via-[#FF8C33]/5 to-transparent border-b border-[#FF6B00]/20 py-2.5 px-3 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center font-bold text-base sm:text-xl shadow-md shadow-[#FF6B00]/30 shrink-0">
                {activeOrder.status === 'delivering' ? (
                  <Truck size={28} weight="fill" />
                ) : activeOrder.status === 'preparing' ? (
                  <CookingPot size={28} weight="fill" />
                ) : (
                  <Package size={28} weight="fill" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm uppercase tracking-wide text-[#FF6B00]">
                    Active Order #{activeOrder.id}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#FF6B00]/20 text-[#FF6B00] uppercase">
                    {activeOrder.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    • Total: ETB {Number(activeOrder.total_amount).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-main)] font-medium mt-0.5">
                  {activeOrder.business_name ? `From ${activeOrder.business_name} • ` : ''}
                  {activeOrder.status === 'pending'
                    ? 'Order placed. Awaiting kitchen confirmation.'
                    : activeOrder.status === 'preparing'
                    ? 'Kitchen is preparing your fresh meal.'
                    : activeOrder.status === 'ready_for_pickup'
                    ? 'Ready for pickup. Assigning delivery driver.'
                    : activeOrder.status === 'delivering'
                    ? `Out for delivery! ${activeOrder.driver_name ? `Driver: ${activeOrder.driver_name}` : ''}`
                    : 'Order status updated.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {activeOrder.status === 'delivering' && !activeOrder.customer_confirmed_delivered && (
                <button
                  onClick={() => handleConfirmCustomerDelivered(activeOrder.id)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow transition flex items-center gap-1.5"
                >
                  <CheckCircle size={16} weight="bold" />
                  <span>I Received My Order</span>
                </button>
              )}
              <button
                onClick={() => setShowOrderHistory(true)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] hover:border-[#FF6B00] text-[var(--text-main)] transition"
              >
                Track Live
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 4. UNPAID CHAPA ORDER NOTIFICATION                             */}
      {/* ============================================================== */}
      {unpaidChapaOrder && (
        <section className="bg-amber-500/10 border-b border-amber-500/20 py-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2.5 text-amber-500 font-semibold">
              <WarningCircle size={20} weight="fill" />
              <span>
                Order #{unpaidChapaOrder.id} is pending Chapa payment (ETB {Number(unpaidChapaOrder.total_amount).toFixed(2)}).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRetryChapa(unpaidChapaOrder.id)}
                disabled={actionLoading === 'retry'}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#FF6B00] text-white hover:bg-[#E05E00] transition"
              >
                {actionLoading === 'retry' ? 'Connecting...' : 'Pay with Chapa'}
              </button>
              <button
                onClick={() => handleSwitchToCash(unpaidChapaOrder.id)}
                disabled={actionLoading === 'cash'}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[#FF6B00] transition"
              >
                Switch to Cash
              </button>
              <button
                onClick={() => handleCancelUnpaidOrder(unpaidChapaOrder.id)}
                disabled={actionLoading === 'cancel'}
                className="px-3 py-1.5 text-xs font-bold rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 5. MAIN CONTENT AREA                                           */}
      {/* ============================================================== */}
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 w-full space-y-6 sm:space-y-10 pb-20 sm:pb-8">
        {/* If Customer clicked "My Orders" view */}
        {showOrderHistory ? (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-[var(--text-main)]">My Orders</h1>
                <p className="text-sm text-[var(--text-muted)]">Track current and past delivery orders</p>
              </div>
              <button
                onClick={() => setShowOrderHistory(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] hover:border-[#FF6B00] text-[var(--text-main)] transition"
              >
                ← Return to Food Menu
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-3">
                <Package size={48} className="mx-auto text-[var(--text-muted)]" />
                <h3 className="font-bold text-lg text-[var(--text-main)]">No orders yet</h3>
                <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
                  Browse restaurants and cafes to place your first delicious order!
                </p>
                <button
                  onClick={() => setShowOrderHistory(false)}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-[#FF6B00] text-white font-bold text-sm shadow-md"
                >
                  Explore Restaurants
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-light)] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-lg text-[var(--text-main)]">Order #{o.id}</span>
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-full capitalize ${
                              o.status === 'delivered'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20'
                            }`}
                          >
                            {o.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          Placed on {new Date(o.created_at).toLocaleString()} {o.business_name ? `• ${o.business_name}` : ''}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xl font-black text-[#FF6B00]">
                          ETB {Number(o.total_amount).toFixed(2)}
                        </span>
                        <div className="text-xs text-[var(--text-muted)] capitalize mt-0.5">
                          Method: {o.payment_method} • Status: {o.payment_status}
                        </div>
                      </div>
                    </div>

                    {/* Order items */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {o.items?.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-page)] text-xs font-medium"
                        >
                          <span className="text-[var(--text-main)]">
                            {it.quantity}x {it.name}
                          </span>
                          <span className="text-[var(--text-muted)] font-mono">
                            ETB {(it.price_at_time * it.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Driver details if assigned */}
                    {o.driver_name && (
                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs flex items-center justify-between text-blue-500">
                        <div className="flex items-center gap-2">
                          <Truck size={18} weight="fill" />
                          <span>
                            Driver: <strong>{o.driver_name}</strong> {o.driver_phone ? `(${o.driver_phone})` : ''}
                          </span>
                        </div>
                        <span className="font-semibold uppercase tracking-wider text-[10px]">
                          Speedy Courier Assigned
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* ============================================================== */}
            {/* HERO SECTION                                                   */}
            {/* ============================================================== */}
            {!selectedBusiness && (
              <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#FF6B00]/10 via-[var(--bg-card)] to-[#FF6B00]/5 border border-[#FF6B00]/30 p-5 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 shadow-sm">
                <div className="space-y-2 max-w-xl">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF6B00]/15 text-[#FF6B00] text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    <Storefront size={14} weight="bold" />
                    SpeedyDelivery Partner Program
                  </span>
                  <h3 className="text-lg sm:text-2xl font-black text-[var(--text-main)] leading-tight">
                    Are You a Restaurant, Cafe, or Hotel Kitchen?
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                    Join SpeedyDelivery with <strong>0% food commission</strong>. Pay a flat monthly subscription tier, dispatch your own drivers, and receive verified customer orders directly.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/register-business')}
                  className="w-full sm:w-auto whitespace-nowrap px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-[#FF6B00]/25 transition flex items-center justify-center gap-2 group"
                >
                  <span>Register Your Business</span>
                  <ArrowRight size={16} weight="bold" className="group-hover:translate-x-1 transition" />
                </button>
              </section>
            )}

            {/* ============================================================== */}
            {/* BUSINESS HEADER (WHEN A BUSINESS IS SELECTED)                  */}
            {/* ============================================================== */}
            {selectedBusiness && (
              <section className="relative overflow-hidden rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-sm">
                <div className="h-48 sm:h-64 w-full relative overflow-hidden bg-slate-900">
                  <img
                    src={selectedBusiness.cover_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=400&fit=crop'}
                    alt={selectedBusiness.name}
                    className="w-full h-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent" />
                  
                  <button
                    onClick={() => setSelectedBusiness(null)}
                    className="absolute top-4 left-4 px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-bold backdrop-blur-md transition flex items-center gap-1.5"
                  >
                    ← All Businesses
                  </button>
                </div>

                <div className="p-6 sm:p-8 -mt-16 sm:-mt-20 relative z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                  <div className="flex items-end gap-4">
                    <img
                      src={selectedBusiness.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop'}
                      alt={selectedBusiness.name}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-[var(--bg-card)] shadow-lg bg-[var(--bg-card)]"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#FF6B00]/15 text-[#FF6B00]">
                          {selectedBusiness.business_type}
                        </span>
                        <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                          <CheckCircle size={14} weight="fill" /> Open Now
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)]">
                        {selectedBusiness.name}
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <MapPin size={14} /> {selectedBusiness.address || 'Addis Ababa'}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-[var(--text-muted)] max-w-sm">
                    <p className="line-clamp-2">{selectedBusiness.description}</p>
                  </div>
                </div>
              </section>
            )}

            {/* ============================================================== */}
            {/* BUSINESS DISCOVERY SECTION (BROWSE RESTAURANTS, CAFES, HOTELS)  */}
            {/* ============================================================== */}
            {!selectedBusiness && (
              <section className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-black text-[var(--text-main)] tracking-tight">
                      Explore Food Businesses
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      Order from certified local restaurants, coffee roasters, and culinary hotels
                    </p>
                  </div>

                  {/* Filter by Type */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['All', 'Restaurant', 'Cafe', 'Hotel'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setBusinessTypeFilter(type)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                          businessTypeFilter === type
                            ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                            : 'bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[#FF6B00]/40'
                        }`}
                      >
                        {type === 'All'
                          ? 'All Partners'
                          : type === 'Restaurant'
                          ? '🍴 Restaurants'
                          : type === 'Cafe'
                          ? '☕ Cafes & Bakery'
                          : '🏨 Hotel Dining'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Businesses Cards Grid */}
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-64 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredBusinesses.length === 0 ? (
                  <div className="p-12 text-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-2">
                    <Storefront size={40} className="mx-auto text-[var(--text-muted)]" />
                    <p className="font-bold text-[var(--text-main)]">No businesses match your search</p>
                    <p className="text-xs text-[var(--text-muted)]">Try adjusting your search query or filters.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBusinesses.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBusiness(b)}
                        className="group cursor-pointer rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden shadow-sm hover:shadow-xl hover:border-[#FF6B00]/40 transition duration-300 flex flex-col"
                      >
                        {/* Cover image */}
                        <div className="h-44 w-full relative overflow-hidden bg-slate-800">
                          <img
                            src={b.cover_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=300&fit=crop'}
                            alt={b.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[11px] font-black uppercase tracking-wider">
                            {b.business_type}
                          </div>
                          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-[#FF6B00] text-white text-xs font-bold shadow-md">
                            {b.active_menu_items_count || 'View'} Menu Items
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <h3 className="font-black text-lg text-[var(--text-main)] group-hover:text-[#FF6B00] transition">
                                {b.name}
                              </h3>
                              <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                                <CheckCircle size={14} weight="fill" /> Open
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                              {b.description || 'Quality meals, chef specials, and fast local delivery.'}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs">
                            <span className="text-[var(--text-muted)] flex items-center gap-1">
                              <MapPin size={14} /> {b.address || 'Addis Ababa'}
                            </span>
                            <span className="font-bold text-[#FF6B00] flex items-center gap-1 group-hover:translate-x-1 transition">
                              Explore Menu <ArrowRight size={14} />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ============================================================== */}
            {/* FOOD MENU SECTION                                              */}
            {/* ============================================================== */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
                    {selectedBusiness ? `${selectedBusiness.name}'s Menu` : 'Featured Dishes Across Businesses'}
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Freshly prepared meals ready for immediate delivery
                  </p>
                </div>

                {/* Category Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {['All', ...categories].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                        activeCategory === cat
                          ? 'bg-[#FF6B00] text-white shadow-md shadow-[#FF6B00]/25'
                          : 'bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Food Items Grid */}
              {menuLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-72 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredMenu.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-2">
                  <ForkKnife size={40} className="mx-auto text-[var(--text-muted)]" />
                  <p className="font-bold text-[var(--text-main)]">No dishes found</p>
                  <p className="text-xs text-[var(--text-muted)]">Try switching categories or clearing search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredMenu.map((item) => {
                    const cartItem = cart.find((i) => i.id === item.id);
                    const qtyInCart = cartItem ? cartItem.quantity : 0;

                    return (
                      <div
                        key={item.id}
                        className="group rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden shadow-sm hover:shadow-xl hover:border-[#FF6B00]/30 transition duration-300 flex flex-col justify-between"
                      >
                        {/* Food Image */}
                        <div className="h-44 w-full relative overflow-hidden bg-slate-900">
                          <img
                            src={
                              item.image_url
                                ? resolveAssetUrl(item.image_url)
                                : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop'
                            }
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                          />
                          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                            {item.category}
                          </div>
                          {item.business_name && !selectedBusiness && (
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-semibold flex items-center gap-1">
                              <Storefront size={12} /> {item.business_name}
                            </div>
                          )}
                        </div>

                        {/* Details & Actions */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-1">
                            <h3 className="font-black text-base text-[var(--text-main)] group-hover:text-[#FF6B00] transition">
                              {item.name}
                            </h3>
                            <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                              {item.description || 'Delicious meal prepared with fresh local ingredients.'}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-[var(--border-light)] flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Price</span>
                              <span className="text-lg font-black text-[#FF6B00]">
                                ETB {Number(item.price).toFixed(2)}
                              </span>
                            </div>

                            {qtyInCart > 0 ? (
                              <div className="flex items-center gap-2 bg-[var(--bg-page)] p-1 rounded-xl border border-[var(--border-light)]">
                                <button
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="w-7 h-7 rounded-lg bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-main)] hover:bg-rose-500 hover:text-white transition"
                                >
                                  <Minus size={14} weight="bold" />
                                </button>
                                <span className="w-5 text-center text-xs font-black">{qtyInCart}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="w-7 h-7 rounded-lg bg-[#FF6B00] flex items-center justify-center text-white hover:bg-[#E05E00] transition"
                                >
                                  <Plus size={14} weight="bold" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                className="px-3.5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs shadow-md shadow-[#FF6B00]/20 transition flex items-center gap-1"
                              >
                                <Plus size={14} weight="bold" />
                                <span>Add to Cart</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
            {/* ============================================================== */}
            
          </>
        )}
      </main>

      {/* ============================================================== */}
            {/* ============================================================== */}
      {/* 6. COMPACT MODAL / BOTTOM-SHEET SHOPPING CART                  */}
      {/* ============================================================== */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div
            ref={cartRef}
            className="w-full sm:max-w-md bg-[var(--bg-card)] border-t sm:border border-[var(--border-light)] rounded-t-3xl sm:rounded-3xl max-h-[85vh] sm:max-h-[88vh] flex flex-col shadow-2xl transition-theme overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-light)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FF6B00]/15 text-[#FF6B00] flex items-center justify-center font-bold">
                  <ShoppingCart size={18} weight="bold" />
                </div>
                <div>
                  <h2 className="font-black text-base text-[var(--text-main)]">Your Cart</h2>
                  <span className="text-[11px] text-[var(--text-muted)] font-medium">
                    {cart.reduce((s, i) => s + i.quantity, 0)} items selected
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-page)] transition"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Items List - Compact & Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[45vh] sm:max-h-[50vh]">
              {cart.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                  <ShoppingCart size={36} className="text-[var(--text-muted)]" />
                  <p className="font-bold text-sm text-[var(--text-main)]">Your cart is empty</p>
                  <p className="text-xs text-[var(--text-muted)] max-w-xs">
                    Add items from any restaurant or cafe to start your order.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-[var(--text-main)] truncate">{item.name}</h4>
                      <span className="text-xs font-black text-[#FF6B00]">
                        ETB {Number(item.price).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-1 bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border-light)]">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-5 h-5 rounded-md flex items-center justify-center text-[var(--text-main)] hover:bg-rose-500 hover:text-white transition"
                        >
                          <Minus size={11} weight="bold" />
                        </button>
                        <span className="w-4 text-center text-xs font-black">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-5 h-5 rounded-lg bg-[#FF6B00] flex items-center justify-center text-white hover:bg-[#E05E00] transition"
                        >
                          <Plus size={11} weight="bold" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-rose-500 transition"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer / Checkout summary */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-[var(--border-light)] bg-[var(--bg-card)] space-y-3 shrink-0">
                <div className="space-y-1 text-xs text-[var(--text-muted)]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-[var(--text-main)]">ETB {cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span className="font-semibold text-[var(--text-main)]">ETB {deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-[var(--text-main)] pt-1.5 border-t border-[var(--border-light)]">
                    <span>Total Amount</span>
                    <span className="text-[#FF6B00]">ETB {grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleInitiateCheckout}
                  className="w-full py-3 rounded-xl sm:rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-xs sm:text-sm shadow-md shadow-[#FF6B00]/25 transition flex items-center justify-center gap-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. CHECKOUT MODAL                                              */}
      {/* ============================================================== */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[var(--bg-card)] rounded-3xl border border-[var(--border-light)] p-6 sm:p-8 space-y-6 shadow-2xl transition-theme">
            <div className="flex items-center justify-between border-b border-[var(--border-light)] pb-4">
              <div>
                <h3 className="font-black text-xl text-[var(--text-main)]">Complete Your Order</h3>
                <p className="text-xs text-[var(--text-muted)]">Provide delivery details & choose payment</p>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-5">
              {/* Phone number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
                  Delivery Phone Number <span className="text-[#FF6B00]">*</span>
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="tel"
                    placeholder="0911223344"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
                {phoneError && <p className="text-xs text-rose-500">{phoneError}</p>}
                <p className="text-[11px] text-[var(--text-muted)]">
                  The delivery driver will call this number upon arrival.
                </p>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    onClick={() => setPaymentMethod('chapa')}
                    className={`cursor-pointer p-3.5 rounded-2xl border flex flex-col gap-1 transition ${
                      paymentMethod === 'chapa'
                        ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]'
                        : 'border-[var(--border-light)] bg-[var(--bg-page)] text-[var(--text-muted)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <CreditCard size={20} weight="bold" />
                      {paymentMethod === 'chapa' && <CheckCircle size={16} weight="fill" />}
                    </div>
                    <span className="font-bold text-xs text-[var(--text-main)]">Chapa Online</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Telebirr, CBE, Cards</span>
                  </label>

                  <label
                    onClick={() => setPaymentMethod('cash')}
                    className={`cursor-pointer p-3.5 rounded-2xl border flex flex-col gap-1 transition ${
                      paymentMethod === 'cash'
                        ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]'
                        : 'border-[var(--border-light)] bg-[var(--bg-page)] text-[var(--text-muted)]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Money size={20} weight="bold" />
                      {paymentMethod === 'cash' && <CheckCircle size={16} weight="fill" />}
                    </div>
                    <span className="font-bold text-xs text-[var(--text-main)]">Cash on Delivery</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Pay when driver arrives</span>
                  </label>
                </div>
              </div>

              {/* Order summary pill */}
              <div className="p-4 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] flex justify-between items-center text-sm">
                <span className="text-[var(--text-muted)]">Total to Pay:</span>
                <span className="font-black text-lg text-[#FF6B00]">ETB {grandTotal.toFixed(2)}</span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={checkoutLoading}
                className="w-full py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-sm shadow-lg shadow-[#FF6B00]/25 transition flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <>
                    <ArrowsClockwise size={18} className="animate-spin" />
                    <span>Processing Order...</span>
                  </>
                ) : paymentMethod === 'chapa' ? (
                  <>
                    <span>Proceed to Chapa Gateway</span>
                    <ArrowRight size={18} weight="bold" />
                  </>
                ) : (
                  <>
                    <span>Confirm Cash Order</span>
                    <CheckCircle size={18} weight="bold" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 9. FOOTER                                                      */}
      {/* ============================================================== */}
      <Footer />
    </div>
  );
}
