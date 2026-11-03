import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Heart, ArrowUp, Truck } from '@phosphor-icons/react';

export default function Footer() {
  const ownerPortalUrl = import.meta.env.VITE_OWNER_PORTAL_URL || 'http://localhost:5174';
  const driverPortalUrl = import.meta.env.VITE_DRIVER_PORTAL_URL || 'http://localhost:5175';
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-auto border-t bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-light)] transition-theme">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand info */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link to="/" className="inline-flex items-center gap-2 text-[var(--text-main)] font-extrabold text-lg tracking-tight">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF6B00] to-[#FF8C33] flex items-center justify-center text-white shadow-md shadow-[#FF6B00]/20 font-black text-sm">
                <Truck size={18} weight="fill" />
              </span>
              <span>Speedy<span className="text-[#FF6B00]">Delivery</span></span>
            </Link>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Empowering local restaurants, cafes, and hotels with 0% commission food delivery and dedicated courier dispatch.
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <MapPin size={15} className="text-[#FF6B00]" />
              <span>Addis Ababa, Ethiopia</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-[var(--text-main)] font-bold text-xs uppercase tracking-wider mb-3.5">
              Food Partners
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[var(--text-muted)]">
              <li><Link to="/register-business" className="hover:text-[#FF6B00] transition">Partner Registration</Link></li>
              <li><Link to="/register-business" className="hover:text-[#FF6B00] transition">Subscription Plans</Link></li>
              <li><a href={ownerPortalUrl} target="_blank" rel="noreferrer" className="hover:text-[#FF6B00] transition">Owner Console Sign In</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-[var(--text-main)] font-bold text-xs uppercase tracking-wider mb-3.5">
              Portals & Accounts
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[var(--text-muted)]">
              <li><Link to="/login" className="hover:text-[#FF6B00] transition">Customer Sign In</Link></li>
              <li><a href={ownerPortalUrl} target="_blank" rel="noreferrer" className="hover:text-[#FF6B00] transition">Business Owner Portal</a></li>
              <li><a href={driverPortalUrl} target="_blank" rel="noreferrer" className="hover:text-[#FF6B00] transition">Courier Driver Portal</a></li>
              <li><a href={ownerPortalUrl} target="_blank" rel="noreferrer" className="hover:text-[#FF6B00] transition">Platform Administration</a></li>
            </ul>
          </div>

          {/* Operating hours */}
          <div>
            <h4 className="text-[var(--text-main)] font-bold text-xs uppercase tracking-wider mb-3.5">
              Service Hours
            </h4>
            <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
              <li className="flex justify-between"><span>Mon - Fri:</span> <span className="text-[var(--text-main)] font-medium">8:00 AM - 11:00 PM</span></li>
              <li className="flex justify-between"><span>Sat - Sun:</span> <span className="text-[var(--text-main)] font-medium">9:00 AM - 12:00 AM</span></li>
            </ul>
            <button
              type="button"
              onClick={scrollToTop}
              className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-[#FF6B00] hover:underline transition"
            >
              <ArrowUp size={14} /> Back to top
            </button>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--border-light)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <p>© {year} SpeedyDelivery. All rights reserved. 0% Food Commission Platform.</p>
          <div className="flex items-center gap-1">
            <span>Powered by</span>
            <Heart size={14} weight="fill" className="text-[#FF6B00] inline mx-0.5" />
            <span>SpeedyDelivery Platform</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
