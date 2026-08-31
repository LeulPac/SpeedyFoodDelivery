import React, { useState, useEffect } from 'react';
import api, { resolveAssetUrl } from '../api';
import { List, Pencil, Trash, CheckCircle, X, MagnifyingGlass } from '@phosphor-icons/react';

const MENU_CATEGORIES = ['Main Dish', 'Drinks', 'Dessert', 'Appetizers', 'Sides', 'Snacks', 'Other'];

const inputClass =
  'w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition text-sm';

export default function CurrentMenu() {
  const [menu, setMenu] = useState([]);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editImageFiles, setEditImageFiles] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);

  useEffect(() => { fetchMenu(); }, []);

  const fetchMenu = async () => {
    try {
      const res = await api.get('/menu/all');
      setMenu(res.data);
    } catch (err) {
      console.error('Failed to load menu', err);
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
      alert(err.response?.data?.error || err.message || 'Failed to update menu item');
    }
  };

  const deleteMenuItem = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await api.delete(`/menu/${id}`);
      if (editingItem?.id === id) setEditingItem(null);
      fetchMenu();
    } catch (err) {
      console.error('Failed to delete menu item:', err);
      alert(err.response?.data?.error || err.message || 'Failed to delete menu item');
    }
  };

  const filtered = menu.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <List weight="fill" className="text-orange-400" size={28} />
            Current Menu
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage your existing menu items</p>
        </div>
        <span className="bg-orange-600/20 text-orange-300 border border-orange-500/40 px-4 py-1.5 rounded-full text-sm font-semibold">
          {menu.length} items
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-orange-500 outline-none transition text-sm max-w-md"
        />
      </div>

      {/* Edit panel (inline modal) */}
      {editingItem && (
        <div className="mb-6 bg-slate-800 border border-orange-500/40 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Pencil size={18} className="text-orange-400" /> Edit: {editingItem.name}
            </h2>
            <button
              onClick={() => setEditingItem(null)}
              className="text-slate-400 hover:text-white transition p-1"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">Name</label>
              <input
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">Category</label>
              <select
                value={editingItem.category}
                onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                className={inputClass}
              >
                {MENU_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={editingItem.price}
                onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer mt-5">
                <div
                  onClick={() => setEditingItem({ ...editingItem, is_available: !editingItem.is_available })}
                  className={`w-11 h-6 rounded-full relative transition-colors ${editingItem.is_available ? 'bg-green-500' : 'bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editingItem.is_available ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm text-slate-300">Available on menu</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">Description</label>
              <textarea
                rows="2"
                value={editingItem.description}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">Image URL (optional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={editingItem.image_url}
                onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">Upload new images</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setEditImageFiles(e.target.files || [])}
                className="w-full bg-slate-900 border border-dashed border-slate-600 rounded-xl p-3 text-white text-sm file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-orange-600/20 file:text-orange-300 file:text-xs file:font-semibold"
              />
            </div>
            {/* Remove existing images */}
            {(menu.find((m) => m.id === editingItem.id)?.image_urls || []).length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">Remove existing images</label>
                <div className="grid grid-cols-4 gap-2">
                  {(menu.find((m) => m.id === editingItem.id)?.image_urls || []).map((img) => (
                    <label key={img} className="relative cursor-pointer group">
                      <img
                        src={resolveAssetUrl(img)}
                        alt="menu"
                        className={`w-full h-20 object-cover rounded-lg transition ${removeImages.includes(img) ? 'opacity-30 ring-2 ring-red-500' : 'group-hover:opacity-80'}`}
                      />
                      <input
                        type="checkbox"
                        checked={removeImages.includes(img)}
                        onChange={(e) =>
                          setRemoveImages((prev) =>
                            e.target.checked ? [...prev, img] : prev.filter((x) => x !== img)
                          )
                        }
                        className="hidden"
                      />
                      {removeImages.includes(img) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <X size={24} className="text-red-400" />
                        </div>
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1">Click images to mark for removal</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={saveEditItem}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
            >
              <CheckCircle weight="bold" /> Save Changes
            </button>
            <button
              onClick={() => setEditingItem(null)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Menu list */}
      {filtered.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-12 text-center">
          <List size={48} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400">No menu items found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`bg-slate-800 border rounded-2xl overflow-hidden shadow hover:shadow-lg transition-all duration-200
                ${editingItem?.id === item.id ? 'border-orange-500/60' : 'border-slate-700 hover:border-orange-500/30'}`}
            >
              {/* Item image */}
              {item.image_urls?.length > 0 && (
                <div className="h-36 overflow-hidden">
                  <img
                    src={resolveAssetUrl(item.image_urls[0])}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{item.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {item.category || 'Other'} · <span className="text-slate-300 font-medium">${Number(item.price).toFixed(2)}</span>
                    </p>
                  </div>
                  <span
                    className={`ml-2 flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold ${
                      item.is_available
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {item.is_available ? 'Live' : 'Hidden'}
                  </span>
                </div>
                {item.description && (
                  <p className="text-slate-500 text-xs line-clamp-2 mb-3">{item.description}</p>
                )}
                <div className="flex gap-2 pt-3 border-t border-slate-700">
                  <button
                    onClick={() => startEditItem(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-600/40 transition font-semibold"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    onClick={() => deleteMenuItem(item.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white rounded-lg border border-red-600/40 transition font-semibold"
                  >
                    <Trash size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
