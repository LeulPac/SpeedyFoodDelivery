import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  CookingPot,
  Storefront,
  CheckCircle,
  WarningCircle,
  ImageSquare,
  ArrowsClockwise,
  Plus,
  X,
  Tag,
  DeviceMobile,
  ShoppingCart,
  Sparkle
} from '@phosphor-icons/react';
import {
  BUSINESS_CATEGORIES,
  normalizeBusinessCategory,
  CATEGORY_SUBCATEGORIES,
  GROCERY_UNITS,
  STANDARD_SIZES
} from '../businessCategories';

export default function AddMenuItem() {
  const { user } = useAuth();
  const [businessCategory, setBusinessCategory] = useState(BUSINESS_CATEGORIES.FOOD);
  const [subcategories, setSubcategories] = useState(CATEGORY_SUBCATEGORIES[BUSINESS_CATEGORIES.FOOD]);

  // Common Fields
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    brand: '',
    stock_quantity: '',
  });

  // Food specific
  const [foodAttrs, setFoodAttrs] = useState({
    ingredients: '',
    preparation_time: '15-25 mins',
  });

  // Clothing specific
  const [clothingAttrs, setClothingAttrs] = useState({
    material: '',
    sizes: ['M', 'L'],
    colors: ['Black'],
    customSize: '',
    customColor: '',
  });

  // Electronics specific
  const [electronicAttrs, setElectronicAttrs] = useState({
    model: '',
    specs: '',
    warranty: '1 Year Manufacturer Warranty',
  });

  // Grocery specific
  const [groceryAttrs, setGroceryAttrs] = useState({
    unit: 'piece',
    expiry_date: '',
  });

  // Cosmetics specific
  const [cosmeticAttrs, setCosmeticAttrs] = useState({
    size_or_volume: '',
    specifications: '',
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch business profile to get registered category
  useEffect(() => {
    const loadCategory = async () => {
      try {
        let cat = user?.business_type;
        if (!cat) {
          const res = await api.get('/businesses/my/profile');
          cat = res.data?.business_type;
        }
        const canonical = normalizeBusinessCategory(cat);
        setBusinessCategory(canonical);
        const subList = CATEGORY_SUBCATEGORIES[canonical] || CATEGORY_SUBCATEGORIES[BUSINESS_CATEGORIES.FOOD];
        setSubcategories(subList);
        setForm((prev) => ({ ...prev, category: subList[0] || 'General' }));
      } catch (err) {
        console.error('Error fetching business category:', err);
        const canonical = normalizeBusinessCategory(user?.business_type);
        setBusinessCategory(canonical);
        const subList = CATEGORY_SUBCATEGORIES[canonical] || CATEGORY_SUBCATEGORIES[BUSINESS_CATEGORIES.FOOD];
        setSubcategories(subList);
        setForm((prev) => ({ ...prev, category: subList[0] || 'General' }));
      }
    };
    loadCategory();
  }, [user]);

  // Size tag helpers for clothing
  const toggleSize = (sz) => {
    setClothingAttrs((prev) => {
      const exists = prev.sizes.includes(sz);
      return {
        ...prev,
        sizes: exists ? prev.sizes.filter((s) => s !== sz) : [...prev.sizes, sz]
      };
    });
  };

  const addCustomSize = () => {
    if (!clothingAttrs.customSize.trim()) return;
    if (!clothingAttrs.sizes.includes(clothingAttrs.customSize.trim())) {
      setClothingAttrs((prev) => ({
        ...prev,
        sizes: [...prev.sizes, prev.customSize.trim()],
        customSize: ''
      }));
    }
  };

  const addCustomColor = () => {
    if (!clothingAttrs.customColor.trim()) return;
    if (!clothingAttrs.colors.includes(clothingAttrs.customColor.trim())) {
      setClothingAttrs((prev) => ({
        ...prev,
        colors: [...prev.colors, prev.customColor.trim()],
        customColor: ''
      }));
    }
  };

  const removeColor = (color) => {
    setClothingAttrs((prev) => ({
      ...prev,
      colors: prev.colors.filter((c) => c !== color)
    }));
  };

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
      if (form.brand) formData.append('brand', form.brand);
      if (form.stock_quantity) formData.append('stock_quantity', form.stock_quantity);

      // Package category specific attributes
      let attributes = {};
      if (businessCategory === BUSINESS_CATEGORIES.FOOD) {
        attributes = {
          ingredients: foodAttrs.ingredients,
          preparation_time: foodAttrs.preparation_time
        };
      } else if (businessCategory === BUSINESS_CATEGORIES.CLOTHING) {
        attributes = {
          material: clothingAttrs.material,
          sizes: clothingAttrs.sizes,
          colors: clothingAttrs.colors,
          brand: form.brand
        };
      } else if (businessCategory === BUSINESS_CATEGORIES.ELECTRONICS) {
        attributes = {
          model: electronicAttrs.model,
          specs: electronicAttrs.specs,
          warranty: electronicAttrs.warranty,
          brand: form.brand
        };
      } else if (businessCategory === BUSINESS_CATEGORIES.GROCERY) {
        attributes = {
          unit: groceryAttrs.unit,
          expiry_date: groceryAttrs.expiry_date,
          brand: form.brand
        };
      } else if (businessCategory === BUSINESS_CATEGORIES.COSMETICS) {
        attributes = {
          size_or_volume: cosmeticAttrs.size_or_volume,
          specifications: cosmeticAttrs.specifications,
          brand: form.brand
        };
      } else {
        attributes = { brand: form.brand };
      }

      formData.append('attributes', JSON.stringify(attributes));
      Array.from(imageFiles || []).forEach((file) => formData.append('images', file));

      await api.post('/menu', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Reset
      setForm({
        name: '',
        description: '',
        price: '',
        category: subcategories[0] || 'General',
        image_url: '',
        brand: '',
        stock_quantity: '',
      });
      setFoodAttrs({ ingredients: '', preparation_time: '15-25 mins' });
      setClothingAttrs({ material: '', sizes: ['M', 'L'], colors: ['Black'], customSize: '', customColor: '' });
      setElectronicAttrs({ model: '', specs: '', warranty: '1 Year Manufacturer Warranty' });
      setGroceryAttrs({ unit: 'piece', expiry_date: '' });
      setCosmeticAttrs({ size_or_volume: '', specifications: '' });
      setImageFiles([]);

      const fileInput = document.getElementById('product-image-input');
      if (fileInput) fileInput.value = '';

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4500);
    } catch (err) {
      console.error('Failed to create product item:', err);
      setError(err.response?.data?.error || err.message || 'Failed to create product item');
    } finally {
      setLoading(false);
    }
  };

  const isFood = businessCategory === BUSINESS_CATEGORIES.FOOD;
  const isClothing = businessCategory === BUSINESS_CATEGORIES.CLOTHING;
  const isElectronics = businessCategory === BUSINESS_CATEGORIES.ELECTRONICS;
  const isGrocery = businessCategory === BUSINESS_CATEGORIES.GROCERY;
  const isCosmetics = businessCategory === BUSINESS_CATEGORIES.COSMETICS;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#FF6B00]/10 text-[#FF6B00] mb-2">
          {isFood && <CookingPot size={15} weight="fill" />}
          {isClothing && <Tag size={15} weight="fill" />}
          {isElectronics && <DeviceMobile size={15} weight="fill" />}
          {isGrocery && <ShoppingCart size={15} weight="fill" />}
          {isCosmetics && <Sparkle size={15} weight="fill" />}
          <span>{businessCategory} Portal</span>
        </div>
        <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2 tracking-tight">
          {isFood ? 'Add New Menu Item' : `Add Product (${businessCategory})`}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {isFood
            ? 'Publish a new dish, drink, or combo to your online restaurant menu'
            : `Add items with tailored specifications and stock controls for your ${businessCategory.toLowerCase()} store`}
        </p>
      </div>

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-2">
          <CheckCircle size={18} weight="fill" />
          <span>Product created successfully! Published on your storefront.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold flex items-center gap-2">
          <WarningCircle size={18} weight="fill" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="rounded-3xl bg-[var(--bg-card)] border border-[var(--border-light)] p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* COMMON: Name & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
              {isFood ? 'Dish / Drink Name *' : 'Product Name *'}
            </label>
            <input
              type="text"
              required
              placeholder={isFood ? 'e.g. Signature Wood-Fired Pizza' : (isClothing ? 'e.g. Slim-Fit Cotton Chino Pants' : 'e.g. Wireless Noise-Cancelling Headphones')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              {subcategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* COMMON: Price & Stock/Brand */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
              Price (ETB) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          {!isFood && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
                  Brand {isGrocery && '(Optional)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apple, Nike, L'Oreal"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </>
          )}

          {isFood && (
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
                Estimated Prep Time
              </label>
              <input
                type="text"
                placeholder="e.g. 15-25 mins"
                value={foodAttrs.preparation_time}
                onChange={(e) => setFoodAttrs({ ...foodAttrs, preparation_time: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
          )}
        </div>

        {/* ================= CATEGORY SPECIFIC SECTIONS ================= */}

        {/* FOOD: Ingredients */}
        {isFood && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
              Ingredients & Allergen Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Fresh tomatoes, Mozzarella, Basil, Olive oil (Contains Gluten, Dairy)"
              value={foodAttrs.ingredients}
              onChange={(e) => setFoodAttrs({ ...foodAttrs, ingredients: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
            />
          </div>
        )}

        {/* CLOTHING & SHOES: Sizes, Colors, Material */}
        {isClothing && (
          <div className="p-5 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#FF6B00] flex items-center gap-1.5">
              <Tag size={16} weight="bold" />
              Clothing & Shoe Specifications
            </h4>

            {/* Sizes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-main)] block">
                Available Sizes (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {STANDARD_SIZES.map((sz) => {
                  const selected = clothingAttrs.sizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => toggleSize(sz)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                        selected
                          ? 'bg-[#FF6B00] border-[#FF6B00] text-white shadow-sm'
                          : 'bg-[var(--bg-card)] border-[var(--border-light)] text-[var(--text-main)] hover:border-[#FF6B00]'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 max-w-xs mt-2">
                <input
                  type="text"
                  placeholder="Custom size (e.g. 46, One Size)"
                  value={clothingAttrs.customSize}
                  onChange={(e) => setClothingAttrs({ ...clothingAttrs, customSize: e.target.value })}
                  className="px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                />
                <button
                  type="button"
                  onClick={addCustomSize}
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] hover:border-[#FF6B00] text-xs font-bold text-[var(--text-main)]"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-main)] block">
                Available Colors
              </label>
              <div className="flex flex-wrap gap-2">
                {clothingAttrs.colors.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)]"
                  >
                    {c}
                    <button type="button" onClick={() => removeColor(c)} className="text-rose-500 hover:text-rose-600">
                      <X size={12} weight="bold" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 max-w-xs mt-2">
                <input
                  type="text"
                  placeholder="Add color (e.g. Navy Blue)"
                  value={clothingAttrs.customColor}
                  onChange={(e) => setClothingAttrs({ ...clothingAttrs, customColor: e.target.value })}
                  className="px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                />
                <button
                  type="button"
                  onClick={addCustomColor}
                  className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] hover:border-[#FF6B00] text-xs font-bold text-[var(--text-main)]"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Material */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-main)] block">
                Material / Fabric
              </label>
              <input
                type="text"
                placeholder="e.g. 100% Organic Cotton, Genuine Leather, Denim"
                value={clothingAttrs.material}
                onChange={(e) => setClothingAttrs({ ...clothingAttrs, material: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
          </div>
        )}

        {/* ELECTRONICS & ACCESSORIES: Model, Specs, Warranty */}
        {isElectronics && (
          <div className="p-5 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#FF6B00] flex items-center gap-1.5">
              <DeviceMobile size={16} weight="bold" />
              Electronics Specifications
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-main)] block">
                  Model Number / Edition
                </label>
                <input
                  type="text"
                  placeholder="e.g. A2894 / Pro Max 256GB"
                  value={electronicAttrs.model}
                  onChange={(e) => setElectronicAttrs({ ...electronicAttrs, model: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-main)] block">
                  Warranty Information
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 Year Official Apple Warranty"
                  value={electronicAttrs.warranty}
                  onChange={(e) => setElectronicAttrs({ ...electronicAttrs, warranty: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-main)] block">
                Technical Specifications
              </label>
              <textarea
                rows={3}
                placeholder="e.g. 6.7-inch OLED, 120Hz ProMotion, 48MP Camera, USB-C, 4422mAh Battery"
                value={electronicAttrs.specs}
                onChange={(e) => setElectronicAttrs({ ...electronicAttrs, specs: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
          </div>
        )}

        {/* GROCERY & SUPERMARKETS: Unit of Measurement, Expiry Date */}
        {isGrocery && (
          <div className="p-5 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#FF6B00] flex items-center gap-1.5">
              <ShoppingCart size={16} weight="bold" />
              Grocery Measurement & Expiry
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-main)] block">
                  Unit of Measurement *
                </label>
                <select
                  value={groceryAttrs.unit}
                  onChange={(e) => setGroceryAttrs({ ...groceryAttrs, unit: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                >
                  {GROCERY_UNITS.map((u) => (
                    <option key={u} value={u}>{u.toUpperCase()} ({u})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-main)] block">
                  Expiry Date (if perishable)
                </label>
                <input
                  type="date"
                  value={groceryAttrs.expiry_date}
                  onChange={(e) => setGroceryAttrs({ ...groceryAttrs, expiry_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>
          </div>
        )}

        {/* COSMETICS & BEAUTY: Size/Volume, Specifications */}
        {isCosmetics && (
          <div className="p-5 rounded-2xl bg-[var(--bg-page)] border border-[var(--border-light)] space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#FF6B00] flex items-center gap-1.5">
              <Sparkle size={16} weight="bold" />
              Cosmetic Attributes
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-main)] block">
                  Size or Volume (e.g. 50ml, 100g, 3.4 oz)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50ml / 1.7 fl oz"
                  value={cosmeticAttrs.size_or_volume}
                  onChange={(e) => setCosmeticAttrs({ ...cosmeticAttrs, size_or_volume: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-main)] block">
                  Skin/Hair Type or Benefits
                </label>
                <input
                  type="text"
                  placeholder="e.g. For all skin types, Hydrating, Paraben-free"
                  value={cosmeticAttrs.specifications}
                  onChange={(e) => setCosmeticAttrs({ ...cosmeticAttrs, specifications: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
            </div>
          </div>
        )}

        {/* COMMON: Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider block">
            Description
          </label>
          <textarea
            rows={3}
            placeholder={isFood ? "Describe flavors, ingredients, serving size..." : "Enter full product description, features, warranty, or instructions..."}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[var(--bg-page)] border border-[var(--border-light)] text-[var(--text-main)] focus:outline-none focus:border-[#FF6B00]"
          />
        </div>

        {/* COMMON: Photos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              Or Upload Product Photos
            </label>
            <input
              id="product-image-input"
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setImageFiles(e.target.files)}
              className="w-full text-xs text-[var(--text-muted)] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#FF6B00]/10 file:text-[#FF6B00] hover:file:bg-[#FF6B00]/20"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-sm shadow-md shadow-[#FF6B00]/25 transition flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <ArrowsClockwise size={18} className="animate-spin" />
              <span>Saving Product...</span>
            </>
          ) : (
            <>
              <span>Publish Product to Catalog</span>
              <Storefront size={18} weight="bold" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
