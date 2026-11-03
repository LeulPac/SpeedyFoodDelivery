import React, { useState, useEffect } from 'react';
import api, { resolveAssetUrl } from '../api';
import {
  List,
  Pencil,
  Trash,
  CheckCircle,
  X,
  MagnifyingGlass,
  Plus,
  ForkKnife,
  ArrowsClockwise
} from '@phosphor-icons/react';

const MENU_CATEGORIES = ['Main Dish', 'Breakfast', 'Drinks', 'Dessert', 'Appetizers', 'Sides', 'Snacks', 'Other'];

export default function CurrentMenu() {
  const [menu, setMenu] = useState([]);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editImageFiles, setEditImageFiles] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMenu(); }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await api.get('/menu/all');
      setMenu(res.data);
    } catch (err) {
      console.error('Failed to load menu', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditItem = (item) => {
    setEditingItem({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category || 'Other',
      is_available: item.is_available,
      image_url: '',
    });
    setEditImageFiles([]);
    setRemoveImages([]);
  };

  const saveEditItem = async () => {
    if (!editingItem) return;
    try {
      const formData = new FormData();
      formData.append('name', editingItem.name);
      formData.append('description', editingItem.description);
      formData.append('price', editingItem.price);
      formData.append('category', editingItem.category);
      formData.append('is_available', editingItem.is_available);
      if (editingItem.image_url) formData.append('image_url', editingItem.image_url);
      removeImages.forEach((img) => formData.append('remove_images', img));
      Array.from(editImageFiles || []).forEach((file) => formData.append('images', file));
      await api.put(`/menu/${editingItem.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEditingItem(null);
      fetchMenu();
    } catch (err) {
      console.error('Failed to update menu item:', err);
      alert(err.response?.data?.error || 'Failed to update item');
    }
  };

  const deleteItem = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await api.delete(`/menu/${id}`);
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete item');
    }
  };

  const toggleAvailability = async (item) => {
    try {
      await api.put(`/menu/${item.id}`, { is_available: !item.is_available });
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update availability');
    }
  };

  const filtered = menu.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2 tracking-tight">
            <List size={26} className="text-[#FF6B00]" weight="bold" />
            Menu Management
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Manage your food catalog, pricing, item availability, and photos
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search dishes or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
          />
        </div>
      </div>

      {/* Edit Modal / Panel */}
      {editingItem && (
        <div className="p-6 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-[var(--border-light)] pb-3">
            <h3 className="font-black text-lg text-[var(--text-main)]">Edit Dish: {editingItem.name}</h3>
            <button
              onClick={() => setEditingItem(null)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[var(--text-muted)] uppercase">Dish Name</label>
              <input
                type="text"
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[var(--text-muted)] uppercase">Category</label>
              <select
                value={editingItem.category}
                onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
              >
                {MENU_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-[var(--text-muted)] uppercase">Price (ETB)</label>
              <input
                type="number"
                step="0.01"
                value={editingItem.price}
                onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingItem.is_available}
                  onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })}
                  className="rounded text-[#FF6B00] focus:ring-[#FF6B00]"
                />
                <span className="font-bold text-xs text-[var(--text-main)]">Available on public menu</span>
              </label>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-[var(--text-muted)] uppercase">Description</label>
              <textarea
                rows={2}
                value={editingItem.description}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-[var(--text-muted)] uppercase">Image URL (Optional)</label>
              <input
                type="url"
                value={editingItem.image_url}
                onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-light)]">
            <button
              onClick={() => setEditingItem(null)}
              className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              Cancel
            </button>
            <button
              onClick={saveEditItem}
              className="px-5 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white text-xs font-bold transition shadow"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Menu Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-[var(--text-muted)]">
          <ArrowsClockwise size={28} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-2">
          <ForkKnife size={40} className="mx-auto text-[var(--text-muted)]" />
          <p className="font-bold text-[var(--text-main)]">No dishes found</p>
          <p className="text-xs text-[var(--text-muted)]">Add dishes in the "Add Menu Item" tab.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] overflow-hidden shadow-sm hover:border-[#FF6B00]/40 transition duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="h-44 w-full relative overflow-hidden bg-slate-900">
                  <img
                    src={
                      item.image_url
                        ? resolveAssetUrl(item.image_url)
                        : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=300&fit=crop'
                    }
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
                    {item.category}
                  </div>
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => toggleAvailability(item)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition ${
                        item.is_available
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-rose-500/90 text-white'
                      }`}
                    >
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-black text-base text-[var(--text-main)]">{item.name}</h3>
                    <span className="font-black text-base text-[#FF6B00]">
                      ETB {Number(item.price).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                    {item.description || 'Delicious dish made with quality ingredients.'}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0 flex items-center justify-between border-t border-[var(--border-light)] pt-4">
                <button
                  onClick={() => startEditItem(item)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-light)] text-xs font-bold text-[var(--text-main)] hover:border-[#FF6B00] transition flex items-center gap-1.5"
                >
                  <Pencil size={14} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => deleteItem(item.id, item.name)}
                  className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
                  title="Delete Item"
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
