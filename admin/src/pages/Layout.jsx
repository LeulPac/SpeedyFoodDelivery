import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api';
import {
  Package,
  CookingPot,
  List,
  UserCircle,
  SignOut,
  CaretRight,
  Storefront,
  Users,
  X,
  CreditCard,
  ShieldCheck,
  CurrencyDollar,
  Sun,
  Moon,
  Gear,
  Truck
} from '@phosphor-icons/react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      api.get('/admin/metrics')
        .then((res) => {
          if (res.data?.operations?.pending_approvals) {
            setPendingCount(res.data.operations.pending_approvals);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  // Navigation items based on role
  const NAV_ITEMS = isAdmin
    ? [
        {
          to: '/',
          label: 'Platform Financials',
          icon: CurrencyDollar,
          exact: true,
        },
        {
          to: '/admin/businesses',
          label: 'Registered Businesses',
          icon: Storefront,
        },
        {
          to: '/admin/plans',
          label: 'Subscription Pricing',
          icon: CreditCard,
        },
        {
          to: '/admin/driver-fees',
          label: 'Driver Platform Fees',
          icon: Truck,
        },
        {
          to: '/orders',
          label: 'Platform Orders',
          icon: Package,
        },
      ]
    : [
        {
          to: '/',
          label: 'Active Orders',
          icon: Package,
          exact: true,
        },
        {
          to: '/menu/current',
          label: 'Menu Management',
          icon: List,
        },
        {
          to: '/menu/add',
          label: 'Add Menu Item',
          icon: CookingPot,
        },
        {
          to: '/drivers',
          label: 'Delivery Couriers',
          icon: Users,
        },
        {
          to: '/subscription',
          label: 'Subscription & Billing',
          icon: CreditCard,
        },
        {
          to: '/profile',
          label: 'Business Profile',
          icon: Storefront,
        },
      ];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] flex transition-theme">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-68 bg-[var(--bg-card)] border-r border-[var(--border-light)]
          flex flex-col z-40 transition-transform duration-300 shadow-sm
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          xl:translate-x-0 xl:static xl:z-auto
        `}
      >
        {/* Logo & Brand */}
        <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-[#FF8C33] flex items-center justify-center text-white shadow-md shadow-[#FF6B00]/25">
              <Truck size={22} weight="fill" />
            </div>
            <div>
              <p className="text-[var(--text-main)] font-black text-lg leading-tight tracking-tight">
                Speedy<span className="text-[#FF6B00]">Delivery</span>
              </p>
              <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {isAdmin ? 'Platform Admin' : 'Owner Portal'}
              </p>
            </div>
          </div>
          <button
            className="xl:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)]"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all font-semibold text-xs tracking-tight
                ${
                  isActive
                    ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-page)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    weight={isActive ? 'fill' : 'bold'}
                    className={isActive ? 'text-[#FF6B00]' : 'text-[var(--text-muted)]'}
                  />
                  <span className="flex-1">{label}</span>
                  {to === '/admin/businesses' && pendingCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                  {isActive && <CaretRight size={14} className="text-[#FF6B00]" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Info, Theme Toggle & Logout */}
        <div className="p-4 border-t border-[var(--border-light)] space-y-3 bg-[var(--bg-card)]">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-[var(--text-muted)]">Theme</span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-page)] text-[var(--text-muted)] hover:text-[#FF6B00] transition"
            >
              {isDark ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
            </button>
          </div>

          <div className="flex items-center gap-3 p-2 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)]">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B00]/15 text-[#FF6B00] flex items-center justify-center font-bold">
              <UserCircle size={22} weight="bold" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-[var(--text-main)] truncate">{user?.name}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition text-xs font-bold"
          >
            <SignOut size={16} weight="bold" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="xl:hidden bg-[var(--bg-card)] border-b border-[var(--border-light)] px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-page)] transition"
            >
              <List size={22} />
            </button>
            <span className="font-extrabold text-sm text-[var(--text-main)]">
              SpeedyDelivery {isAdmin ? 'Admin' : 'Console'}
            </span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-[var(--border-light)] text-[var(--text-muted)]"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
