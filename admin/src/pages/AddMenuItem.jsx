import React, { useState } from 'react';
import api from '../api';
import { CheckCircle, CookingPot, ImageSquare } from '@phosphor-icons/react';

const MENU_CATEGORIES = ['Main Dish', 'Drinks', 'Dessert', 'Appetizers', 'Sides', 'Snacks', 'Other'];

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
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
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to create menu item:', err);
      alert(err.response?.data?.error || err.message || 'Failed to create menu item');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition text-sm';
  const labelClass = 'block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-semibold';

  return (
    <div className="max-w-2xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <CookingPot weight="fill" className="text-green-400" size={28} />
          Add Menu Item
        </h1>
        <p className="text-slate-400 text-sm mt-1">Create a new item that appears on the customer menu</p>
      </div>

      {/* Success toast */}
      {success && (
        <div className="mb-6 flex items-center gap-3 bg-green-600/20 border border-green-500/40 text-green-300 px-5 py-3.5 rounded-xl text-sm font-medium">
          <CheckCircle size={20} weight="fill" />
          Menu item created successfully!
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className={labelClass}>Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Classic Cheeseburger"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>

          {/* Category + Price row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Category</label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputClass}
              >
                {MENU_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              rows="3"
              placeholder="Brief description of the item..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700 pt-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-4 flex items-center gap-2">
              <ImageSquare size={14} /> Images (Optional)
            </p>

            <div className="space-y-4">
              {/* Image URL */}
              <div>
                <label className={labelClass}>Image URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className={inputClass}
                />
              </div>

              {/* File upload */}
              <div>
                <label className={labelClass}>Upload Images</label>
                <div className="relative">
                  <input
                    id="menu-image-input"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setImageFiles(e.target.files || [])}
                    className="w-full bg-slate-900 border border-dashed border-slate-600 rounded-xl p-4 text-white text-sm
                      file:mr-4 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-green-600/20 file:text-green-300
                      file:text-xs file:font-semibold cursor-pointer hover:border-slate-500 transition"
                  />
                </div>
                {imageFiles?.length > 0 && (
                  <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                    <CheckCircle size={12} weight="fill" />
                    {imageFiles.length} file{imageFiles.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:text-green-600 text-white font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-sm mt-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle weight="bold" />
                Save Menu Item
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
