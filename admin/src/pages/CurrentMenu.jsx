import { useModal } from '../context/ModalContext';
import React, { useState, useEffect } from 'react';
import api, { resolveAssetUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  List,
  Pencil,
  Trash,
  CheckCircle,
  X,
  MagnifyingGlass,
  Plus,
  ForkKnife,
  ArrowsClockwise,
  Storefront,
  Tag,
  Package
} from '@phosphor-icons/react';
import {
  BUSINESS_CATEGORIES,
  normalizeBusinessCategory,
  CATEGORY_SUBCATEGORIES,
  GROCERY_UNITS,
  STANDARD_SIZES
} from '../businessCategories';

export default function CurrentMenu() {
  const { showModal } = useModal();
  const { user } = useAuth();
  const [businessCategory, setBusinessCategory] = useState(BUSINESS_CATEGORIES.FOOD);
  const [subcategories, setSubcategories] = useState(CATEGORY_SUBCATEGORIES[BUSINESS_CATEGORIES.FOOD]);

  const [menu, setMenu] = useState([]);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editImageFiles, setEditImageFiles] = useState([]);
  const [removeImages, setRemoveImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoryAndMenu();
  }, [user]);

  const fetchCategoryAndMenu = async () => {
    try {
      setLoading(true);
      let cat = user?.business_type;
      if (!cat) {
        const profileRes = await api.get('/businesses/my/profile').catch(() => null);
        if (profileRes?.data?.business_type) {
          cat = profileRes.data.business_type;
        }
      }
      const canonical = normalizeBusinessCategory(cat);
      setBusinessCategory(canonical);
      setSubcategories(CATEGORY_SUBCATEGORIES[canonical] || CATEGORY_SUBCATEGORIES[BUSINESS_CATEGORIES.FOOD]);

      const res = await api.get('/menu/all');
      setMenu(res.data);
    } catch (err) {
      console.error('Failed to load menu', err);
    } finally {
      setLoading(false);
    }
  };

  const startEditItem = (item) => {
    let attrs = item.attributes || {};
    if (typeof attrs === 'string') {
      try { attrs = JSON.parse(attrs); } catch (e) { attrs = {}; }
    }

    setEditingItem({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category || 'General',
      is_available: item.is_available,
      image_url: '',
      brand: item.brand || attrs.brand || '',
      stock_quantity: item.stock_quantity !== null && item.stock_quantity !== undefined ? item.stock_quantity : (attrs.stock_quantity || ''),
      attributes: attrs,
      // Food
      ingredients: attrs.ingredients || '',
      preparation_time: attrs.preparation_time || '',
      // Clothing
      material: attrs.material || '',
      sizes: Array.isArray(attrs.sizes) ? attrs.sizes : [],
      colors: Array.isArray(attrs.colors) ? attrs.colors : [],
      // Electronics
      model: attrs.model || '',
      specs: attrs.specs || '',
      warranty: attrs.warranty || '',
      // Grocery
      unit: attrs.unit || 'piece',
      expiry_date: attrs.expiry_date || '',
      // Cosmetics
      size_or_volume: attrs.size_or_volume || '',
      specifications: attrs.specifications || '',
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
      if (editingItem.brand) formData.append('brand', editingItem.brand);
      if (editingItem.stock_quantity !== '') formData.append('stock_quantity', editingItem.stock_quantity);

      // Package attributes
      let attrs = {};
      if (businessCategory === BUSINESS_CATEGORIES.FOOD) {
        attrs = {
          ingredients: editingItem.ingredients,
          preparation_time: editingItem.preparation_time
        };
      } else if (businessCategory === BUSINESS_CATEGORIES.CLOTHING) {
        attrs = {
          material: editingItem.material,
          sizes: editingItem.sizes,
          colors: editingItem.colors,
          brand: editingItem.brand
        };
      } else if (businessCategory === BUSINESS_CATEGORIES.ELECTRONICS) {
        attrs = {
          model: editingItem.model,
          specs: editingItem.specs,
          warranty: editingItem.warranty,
          brand: editingItem.brand
        };
      } else if (businessCategory === BUSINESS_CATEGORIES.GROCERY) {
        attrs = {
          unit: editingItem.unit,
          expiry_date: editingItem.expiry_date,
          brand: editingItem.brand
        };
      } else if (businessCategory === BUSINESS_CATEGORIES.COSMETICS) {
        attrs = {
          size_or_volume: editingItem.size_or_volume,
          specifications: editingItem.specifications,
          brand: editingItem.brand
        };
      } else {
        attrs = { brand: editingItem.brand };
      }

      formData.append('attributes', JSON.stringify(attrs));
      removeImages.forEach((img) => formData.append('remove_images', img));
      Array.from(editImageFiles || []).forEach((file) => formData.append('images', file));

      await api.put(`/menu/${editingItem.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEditingItem(null);
      fetchCategoryAndMenu();
    } catch (err) {
      console.error('Failed to update product item:', err);
      showModal({ title: 'Update Failed', message: err.response?.data?.error || 'Failed to update item', type: 'danger' });
    }
  };

  const deleteItem = async (id, name) => {
    const confirmed = await showModal({
      title: 'Delete Item',
      message: `Are you sure you want to delete "${name}" from your catalog?`,
      type: 'danger',
      confirmText: 'Delete Item',
      cancelText: 'Cancel'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/menu/${id}`);
      fetchCategoryAndMenu();
    } catch (err) {
      showModal({ title: 'Delete Failed', message: err.response?.data?.error || 'Failed to delete item', type: 'danger' });
    }
  };

  const toggleAvailability = async (item) => {
    try {
      await api.put(`/menu/${item.id}`, { is_available: !item.is_available });
      fetchCategoryAndMenu();
    } catch (err) {
      showModal({ title: 'Update Failed', message: err.response?.data?.error || 'Failed to update availability', type: 'danger' });
    }
  };

  const isFood = businessCategory === BUSINESS_CATEGORIES.FOOD;
  const isClothing = businessCategory === BUSINESS_CATEGORIES.CLOTHING;
  const isElectronics = businessCategory === BUSINESS_CATEGORIES.ELECTRONICS;
  const isGrocery = businessCategory === BUSINESS_CATEGORIES.GROCERY;
  const isCosmetics = businessCategory === BUSINESS_CATEGORIES.COSMETICS;

  const filtered = menu.filter((m) => {
    const q = search.toLowerCase();
    const brand = m.brand || m.attributes?.brand || '';
    return (
      m.name.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      brand.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FF6B00]/10 text-[#FF6B00] mb-1">
            <span>{businessCategory} Catalog</span>
          </div>
          <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2 tracking-tight">
            <List size={26} className="text-[#FF6B00]" weight="bold" />
            {isFood ? 'Menu Management' : 'Product Catalog'}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {isFood
              ? 'Manage your food catalog, pricing, item availability, and photos'
              : `Manage your ${businessCategory.toLowerCase()} products, inventory, specifications and pricing`}
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder={isFood ? "Search dishes or categories..." : "Search products, brands, or categories..."}
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
            <h3 className="font-black text-lg text-[var(--text-main)]">
              Edit {isFood ? 'Dish' : 'Product'}: {editingItem.name}
            </h3>
            <button
              onClick={() => setEditingItem(null)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-[var(--text-muted)] uppercase">
                {isFood ? 'Dish Name' : 'Product Name'}
              </label>
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
                {subcategories.map((c) => (
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

            {!isFood && (
              <>
                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-muted)] uppercase">Brand</label>
                  <input
                    type="text"
                    value={editingItem.brand}
                    onChange={(e) => setEditingItem({ ...editingItem, brand: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-muted)] uppercase">Stock Quantity</label>
                  <input
                    type="number"
                    value={editingItem.stock_quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, stock_quantity: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </>
            )}

            {isFood && (
              <div className="space-y-1">
                <label className="font-bold text-[var(--text-muted)] uppercase">Prep Time</label>
                <input
                  type="text"
                  value={editingItem.preparation_time}
                  onChange={(e) => setEditingItem({ ...editingItem, preparation_time: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            )}

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingItem.is_available}
                  onChange={(e) => setEditingItem({ ...editingItem, is_available: e.target.checked })}
                  className="rounded text-[#FF6B00] focus:ring-[#FF6B00]"
                />
                <span className="font-bold text-xs text-[var(--text-main)]">Available on public storefront</span>
              </label>
            </div>

            {/* Category specific edit fields */}
            {isFood && (
              <div className="sm:col-span-2 space-y-1">
                <label className="font-bold text-[var(--text-muted)] uppercase">Ingredients</label>
                <input
                  type="text"
                  value={editingItem.ingredients}
                  onChange={(e) => setEditingItem({ ...editingItem, ingredients: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            )}

            {isClothing && (
              <>
                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-muted)] uppercase">Material</label>
                  <input
                    type="text"
                    value={editingItem.material}
                    onChange={(e) => setEditingItem({ ...editingItem, material: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-muted)] uppercase">Sizes (comma-separated)</label>
                  <input
                    type="text"
                    value={Array.isArray(editingItem.sizes) ? editingItem.sizes.join(', ') : editingItem.sizes}
                    onChange={(e) => setEditingItem({ ...editingItem, sizes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </>
            )}

            {isElectronics && (
              <>
                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-muted)] uppercase">Model</label>
                  <input
                    type="text"
                    value={editingItem.model}
                    onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-muted)] uppercase">Warranty</label>
                  <input
                    type="text"
                    value={editingItem.warranty}
                    onChange={(e) => setEditingItem({ ...editingItem, warranty: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </>
            )}

            {isGrocery && (
              <>
                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-muted)] uppercase">Unit of Measurement</label>
                  <select
                    value={editingItem.unit}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                  >
                    {GROCERY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-muted)] uppercase">Expiry Date</label>
                  <input
                    type="date"
                    value={editingItem.expiry_date}
                    onChange={(e) => setEditingItem({ ...editingItem, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </>
            )}

            {isCosmetics && (
              <>
                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-muted)] uppercase">Size / Volume</label>
                  <input
                    type="text"
                    value={editingItem.size_or_volume}
                    onChange={(e) => setEditingItem({ ...editingItem, size_or_volume: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[var(--text-muted)] uppercase">Specifications / Benefits</label>
                  <input
                    type="text"
                    value={editingItem.specifications}
                    onChange={(e) => setEditingItem({ ...editingItem, specifications: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </>
            )}

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

      {/* Catalog Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-[var(--text-muted)]">
          <ArrowsClockwise size={28} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] space-y-2">
          {isFood ? (
            <ForkKnife size={40} className="mx-auto text-[var(--text-muted)]" />
          ) : (
            <Storefront size={40} className="mx-auto text-[var(--text-muted)]" />
          )}
          <p className="font-bold text-[var(--text-main)]">
            No {isFood ? 'dishes' : 'products'} found
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Add items in the "{isFood ? 'Add Menu Item' : 'Add Product'}" tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => {
            const attrs = typeof item.attributes === 'string' ? JSON.parse(item.attributes || '{}') : (item.attributes || {});
            const brand = item.brand || attrs.brand;
            const stock = item.stock_quantity !== null && item.stock_quantity !== undefined ? item.stock_quantity : attrs.stock_quantity;

            return (
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

                  <div className="p-5 space-y-2.5">
                    {brand && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF6B00] bg-[#FF6B00]/10 px-2 py-0.5 rounded-md">
                        {brand}
                      </span>
                    )}

                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-black text-base text-[var(--text-main)] leading-tight">{item.name}</h3>
                      <span className="font-black text-base text-[#FF6B00] shrink-0">
                        ETB {Number(item.price).toFixed(2)}
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {item.description || (isFood ? 'Delicious dish made with quality ingredients.' : 'Quality product.')}
                    </p>

                    {/* Category attribute pill highlights */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {stock !== undefined && stock !== null && stock !== '' && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-page)] border border-[var(--border-light)] text-[10px] font-bold text-[var(--text-muted)]">
                          Stock: {stock}
                        </span>
                      )}
                      {attrs.unit && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-page)] border border-[var(--border-light)] text-[10px] font-bold text-[var(--text-muted)]">
                          Unit: {attrs.unit}
                        </span>
                      )}
                      {Array.isArray(attrs.sizes) && attrs.sizes.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-page)] border border-[var(--border-light)] text-[10px] font-bold text-[var(--text-muted)]">
                          Sizes: {attrs.sizes.join(', ')}
                        </span>
                      )}
                      {attrs.warranty && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-page)] border border-[var(--border-light)] text-[10px] font-bold text-[var(--text-muted)]">
                          {attrs.warranty}
                        </span>
                      )}
                      {attrs.size_or_volume && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-page)] border border-[var(--border-light)] text-[10px] font-bold text-[var(--text-muted)]">
                          {attrs.size_or_volume}
                        </span>
                      )}
                      {attrs.preparation_time && (
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-page)] border border-[var(--border-light)] text-[10px] font-bold text-[var(--text-muted)]">
                          ⏱ {attrs.preparation_time}
                        </span>
                      )}
                    </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
