import React, { useState } from 'react';
import api from '../api';
import { CookingPot, CheckCircle, WarningCircle, ImageSquare, ArrowsClockwise } from '@phosphor-icons/react';

const MENU_CATEGORIES = ['Main Dish', 'Breakfast', 'Drinks', 'Dessert', 'Appetizers', 'Sides', 'Snacks', 'Other'];

export default function AddMenuItem() {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main Dish',
    image_url: '',
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('description', form.description);
      formData.append('price', form.price);
      formData.append('category', form.category);
      if (form.image_url) formData.append('image_url', form.image_url);
      Array.from(imageFiles || []).forEach((file) => formData.append('images', file));

      await api.post('/menu', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setForm({ name: '', description: '', price: '', category: 'Main Dish', image_url: '' });
      setImageFiles([]);
      const fileInput = document.getElementById('menu-image-input');
      if (fileInput) fileInput.value = '';
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to create menu item:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create menu item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2 tracking-tight">
          <CookingPot weight="fill" className="text-[#FF6B00]" size={28} />
          Add New Menu Item
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Create a new dish or drink for your business catalog
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-2">
          <CheckCircle size={18} weight="fill" />
          <span>Menu item created successfully! Visible on the customer ordering portal.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
          <WarningCircle size={18} weight="fill" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] p-8 shadow-sm space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
            Item Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Signature Wood-Fired Pizza"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
              Price (ETB) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="350.00"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
              Category *
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
            >
              {MENU_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
            Description
          </label>
          <textarea
            rows={3}
            placeholder="Describe ingredients, allergens, preparation method..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
            Image Web URL (Optional)
          </label>
          <input
            type="url"
            placeholder="https://images.unsplash.com/..."
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
            Or Upload Photos
          </label>
          <input
            id="menu-image-input"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setImageFiles(e.target.files)}
            className="w-full text-xs text-[var(--text-muted)] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#FF6B00]/10 file:text-[#FF6B00] hover:file:bg-[#FF6B00]/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-sm shadow-md shadow-[#FF6B00]/25 transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <ArrowsClockwise size={18} className="animate-spin" />
              <span>Saving Dish...</span>
            </>
          ) : (
            <>
              <span>Publish Dish to Menu</span>
              <CookingPot size={18} weight="bold" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
