import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
} from '@phosphor-icons/react';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Active Orders',
    icon: Package,
    exact: true,
    color: 'text-blue-400',
    activeBg: 'bg-blue-600/20 border-blue-500/50',
  },
  {
    to: '/menu/add',
    label: 'Add Menu Item',
    icon: CookingPot,
    color: 'text-green-400',
    activeBg: 'bg-green-600/20 border-green-500/50',
  },
  {
    to: '/menu/current',
    label: 'Current Menu',
    icon: List,
    color: 'text-orange-400',
    activeBg: 'bg-orange-600/20 border-orange-500/50',
  },
  {
    to: '/drivers',
    label: 'Driver Management',
    icon: Users,
    color: 'text-purple-400',
    activeBg: 'bg-purple-600/20 border-purple-500/50',
  },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-slate-800 border-r border-slate-700
          flex flex-col z-40 transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          xl:translate-x-0 xl:static xl:z-auto
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-xl shadow-lg">
              <Storefront size={22} weight="fill" className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-lg leading-none tracking-tight">Owner</p>
              <p className="text-slate-400 text-xs">Console</p>
            </div>
          </div>
          <button
            className="xl:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact, color, activeBg }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 group font-medium text-sm
                ${
                  isActive
                    ? `${activeBg} text-white border`
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={20}
                    weight={isActive ? 'fill' : 'duotone'}
                    className={isActive ? color : 'text-slate-500'}
                  />
                  <span className="flex-1">{label}</span>
                  {isActive && <CaretRight size={14} className={color} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="bg-slate-700 p-2 rounded-full">
              <UserCircle size={20} className="text-slate-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition text-sm font-medium"
          >
            <SignOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="xl:hidden bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <List size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-1.5 rounded-lg">
              <Storefront size={16} weight="fill" className="text-white" />
            </div>
            <span className="font-bold text-white text-base">Owner Console</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
