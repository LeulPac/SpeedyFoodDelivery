import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Heart, ArrowUp } from '@phosphor-icons/react';

export default function Footer() {
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-auto border-t transition-theme bg-[#EFEBE3] dark:bg-[#151A21] text-[#555A5F] dark:text-[#C0BDB5] border-[#DDD9D0] dark:border-[#303945]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand info */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2.5 text-[#17191C] dark:text-[#F3F1EA] font-extrabold text-lg tracking-tight mb-3">
              <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 font-black text-sm">
                S
              </span>
              <span>Speedy<span className="text-orange-500">Delivery</span></span>
            </Link>
            <p className="text-xs sm:text-sm text-[#555A5F] dark:text-[#C0BDB5] leading-relaxed mb-4">
              Delicious hot meals and fresh drinks delivered directly from favorite local kitchens to your doorstep in minutes.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#777C80] dark:text-[#92918C]">
              <MapPin size={15} className="text-orange-500" />
              <span>Fast local area delivery</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-[#17191C] dark:text-[#F3F1EA] font-bold text-xs uppercase tracking-wider mb-3.5">
              Menu & Discover
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#555A5F] dark:text-[#C0BDB5]">
              <li><a href="#menu" className="hover:text-orange-600 dark:hover:text-orange-400 transition">Main Dishes</a></li>
              <li><a href="#menu" className="hover:text-orange-600 dark:hover:text-orange-400 transition">Appetizers & Sides</a></li>
              <li><a href="#menu" className="hover:text-orange-600 dark:hover:text-orange-400 transition">Drinks & Desserts</a></li>
              <li><a href="#menu" className="hover:text-orange-600 dark:hover:text-orange-400 transition">Special Deals</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-[#17191C] dark:text-[#F3F1EA] font-bold text-xs uppercase tracking-wider mb-3.5">
              Account & Help
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#555A5F] dark:text-[#C0BDB5]">
              <li><Link to="/login" className="hover:text-orange-600 dark:hover:text-orange-400 transition">Sign in / Register</Link></li>
              <li><a href="#tracking" className="hover:text-orange-600 dark:hover:text-orange-400 transition">Live Order Tracking</a></li>
              <li><a href="#help" className="hover:text-orange-600 dark:hover:text-orange-400 transition">Help Center & FAQ</a></li>
              <li><a href="#contact" className="hover:text-orange-600 dark:hover:text-orange-400 transition">Contact Support</a></li>
            </ul>
          </div>

          {/* Legal / Hours */}
          <div>
            <h4 className="text-[#17191C] dark:text-[#F3F1EA] font-bold text-xs uppercase tracking-wider mb-3.5">
              Delivery Hours
            </h4>
            <ul className="space-y-1.5 text-xs text-[#555A5F] dark:text-[#C0BDB5]">
              <li className="flex justify-between"><span>Mon - Fri:</span> <span className="text-[#17191C] dark:text-[#F3F1EA] font-medium">8:00 AM - 11:00 PM</span></li>
              <li className="flex justify-between"><span>Sat - Sun:</span> <span className="text-[#17191C] dark:text-[#F3F1EA] font-medium">9:00 AM - 12:00 AM</span></li>
            </ul>
            <button
              type="button"
              onClick={scrollToTop}
              className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline transition"
            >
              <ArrowUp size={14} /> Back to top
            </button>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#DDD9D0] dark:border-[#303945] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#777C80] dark:text-[#92918C]">
          <p>© {year} SpeedyDelivery. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Made with</span>
            <Heart size={14} weight="fill" className="text-red-500 inline mx-0.5" />
            <span>for food lovers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
