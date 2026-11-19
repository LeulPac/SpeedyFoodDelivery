const db = require('../db');
const cloudinary = require('cloudinary').v2;
const { MENU_CATEGORIES, normalizeCategory } = require('../menuCategories');
const {
  BUSINESS_CATEGORIES,
  normalizeBusinessCategory,
  CATEGORY_SUBCATEGORIES,
  GROCERY_UNITS,
  STANDARD_SIZES
} = require('../businessCategories');

// Configure Cloudinary once
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const fs = require('fs');
const path = require('path');

let menuSchemaEnsured = false;
const ensureMenuSchema = async () => {
  if (menuSchemaEnsured) return;
  try {
    await db.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_urls TEXT[] NOT NULL DEFAULT '{}'`);
    await db.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'Main Dish'`);
    await db.query(`ALTER TABLE menu_items ALTER COLUMN image_url TYPE TEXT`);
    await db.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb`);
    await db.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS brand VARCHAR(100)`);
    await db.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS stock_quantity INTEGER`);
    menuSchemaEnsured = true;
  } catch (err) {
    console.error('ensureMenuSchema error:', err.message);
  }
};

/**
 * Upload a file buffer directly to Cloudinary with fallback to local disk.
 * Returns the image URL (Cloudinary secure_url or /uploads/<filename>).
 */
const uploadBufferToCloudinary = (buffer, originalName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'food-delivery/menu',
        public_id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }],
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error.message);
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else {
          console.log('Cloudinary upload success:', result.secure_url);
          resolve(result.secure_url);
        }
      }
    );
    stream.end(buffer);
  });
};

const saveImageBuffer = async (buffer, originalName) => {
  // If Cloudinary credentials are provided, attempt Cloudinary first
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const url = await uploadBufferToCloudinary(buffer, originalName);
      if (url) return url;
    } catch (cErr) {
      console.warn('Cloudinary upload failed, falling back to local file storage:', cErr.message);
    }
  }

  // Fallback: save to server/uploads/
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const ext = path.extname(originalName || '') || '.jpg';
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${filename}`;
};

const normalizeImageList = (imageUrl, imageUrls) => {
  const fromArray = Array.isArray(imageUrls) ? imageUrls : [];
  const trimmed = fromArray.map((u) => String(u || '').trim()).filter(Boolean);
  if (trimmed.length > 0) return trimmed;
  return imageUrl ? [imageUrl] : [];
};

// Helper to extract and validate category-specific attributes based on the business type
const parseAndValidateAttributes = (businessType, body) => {
  const normalizedBizType = normalizeBusinessCategory(businessType);
  let parsedAttrs = {};

  if (body.attributes) {
    if (typeof body.attributes === 'string') {
      try {
        parsedAttrs = JSON.parse(body.attributes);
      } catch (e) {
        parsedAttrs = {};
      }
    } else if (typeof body.attributes === 'object') {
      parsedAttrs = { ...body.attributes };
    }
  }

  // Common or specific fields extracted from top-level body if passed directly
  const brand = (body.brand !== undefined ? body.brand : parsedAttrs.brand) || null;
  let stockQuantity = body.stock_quantity !== undefined ? body.stock_quantity : parsedAttrs.stock_quantity;
  if (stockQuantity !== undefined && stockQuantity !== null && stockQuantity !== '') {
    stockQuantity = parseInt(stockQuantity, 10);
    if (isNaN(stockQuantity) || stockQuantity < 0) stockQuantity = 0;
  } else {
    stockQuantity = null;
  }

  const finalAttributes = {};

  if (normalizedBizType === BUSINESS_CATEGORIES.FOOD) {
    // Food & Restaurants: ingredients, preparation_time
    const ingredients = body.ingredients !== undefined ? body.ingredients : parsedAttrs.ingredients;
    const preparation_time = body.preparation_time !== undefined ? body.preparation_time : parsedAttrs.preparation_time;
    if (ingredients) finalAttributes.ingredients = String(ingredients).trim();
    if (preparation_time) finalAttributes.preparation_time = String(preparation_time).trim();
  } else if (normalizedBizType === BUSINESS_CATEGORIES.CLOTHING) {
    // Clothing & Shoes: brand, sizes, colors, material, stock_quantity
    const sizes = body.sizes !== undefined ? body.sizes : parsedAttrs.sizes;
    const colors = body.colors !== undefined ? body.colors : parsedAttrs.colors;
    const material = body.material !== undefined ? body.material : parsedAttrs.material;

    if (brand) finalAttributes.brand = String(brand).trim();
    if (material) finalAttributes.material = String(material).trim();

    if (Array.isArray(sizes)) {
      finalAttributes.sizes = sizes.map(s => String(s).trim()).filter(Boolean);
    } else if (typeof sizes === 'string' && sizes) {
      finalAttributes.sizes = sizes.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (Array.isArray(colors)) {
      finalAttributes.colors = colors.map(c => String(c).trim()).filter(Boolean);
    } else if (typeof colors === 'string' && colors) {
      finalAttributes.colors = colors.split(',').map(c => c.trim()).filter(Boolean);
    }

    if (stockQuantity !== null) finalAttributes.stock_quantity = stockQuantity;
  } else if (normalizedBizType === BUSINESS_CATEGORIES.ELECTRONICS) {
    // Electronics & Accessories: brand, model, specs, warranty, stock_quantity
    const model = body.model !== undefined ? body.model : parsedAttrs.model;
    const specs = body.specs !== undefined ? body.specs : (body.technical_specifications !== undefined ? body.technical_specifications : parsedAttrs.specs);
    const warranty = body.warranty !== undefined ? body.warranty : (body.warranty_information !== undefined ? body.warranty_information : parsedAttrs.warranty);

    if (brand) finalAttributes.brand = String(brand).trim();
    if (model) finalAttributes.model = String(model).trim();
    if (specs) finalAttributes.specs = String(specs).trim();
    if (warranty) finalAttributes.warranty = String(warranty).trim();
    if (stockQuantity !== null) finalAttributes.stock_quantity = stockQuantity;
  } else if (normalizedBizType === BUSINESS_CATEGORIES.GROCERY) {
    // Grocery & Supermarkets: brand, unit, stock_quantity, expiry_date
    const unit = body.unit !== undefined ? body.unit : (body.unit_of_measurement !== undefined ? body.unit_of_measurement : parsedAttrs.unit);
    const expiry_date = body.expiry_date !== undefined ? body.expiry_date : parsedAttrs.expiry_date;

    if (brand) finalAttributes.brand = String(brand).trim();
    if (unit) finalAttributes.unit = String(unit).trim();
    if (expiry_date) finalAttributes.expiry_date = String(expiry_date).trim();
    if (stockQuantity !== null) finalAttributes.stock_quantity = stockQuantity;
  } else if (normalizedBizType === BUSINESS_CATEGORIES.COSMETICS) {
    // Cosmetics & Beauty: brand, size_or_volume, specifications, stock_quantity
    const size_or_volume = body.size_or_volume !== undefined ? body.size_or_volume : (body.volume !== undefined ? body.volume : parsedAttrs.size_or_volume);
    const specifications = body.specifications !== undefined ? body.specifications : parsedAttrs.specifications;

    if (brand) finalAttributes.brand = String(brand).trim();
    if (size_or_volume) finalAttributes.size_or_volume = String(size_or_volume).trim();
    if (specifications) finalAttributes.specifications = String(specifications).trim();
    if (stockQuantity !== null) finalAttributes.stock_quantity = stockQuantity;
  } else {
    // Other retail
    if (brand) finalAttributes.brand = String(brand).trim();
    if (stockQuantity !== null) finalAttributes.stock_quantity = stockQuantity;
    Object.keys(parsedAttrs).forEach(k => {
      if (parsedAttrs[k] !== undefined && parsedAttrs[k] !== null && parsedAttrs[k] !== '') {
        finalAttributes[k] = parsedAttrs[k];
      }
    });
  }

  return {
    attributes: finalAttributes,
    brand: brand ? String(brand).trim() : null,
    stockQuantity
  };
};

const getMenuCategories = async (req, res) => {
  try {
    await ensureMenuSchema();
    const { business_id } = req.query;
    let businessType = null;

    if (business_id) {
      const bizRes = await db.query('SELECT business_type FROM businesses WHERE id = $1', [business_id]);
      if (bizRes.rows.length > 0) {
        businessType = bizRes.rows[0].business_type;
      }
    } else if (req.user?.business_id) {
      const bizRes = await db.query('SELECT business_type FROM businesses WHERE id = $1', [req.user.business_id]);
      if (bizRes.rows.length > 0) {
        businessType = bizRes.rows[0].business_type;
      }
    }

    const canonical = normalizeBusinessCategory(businessType);
    const subcats = CATEGORY_SUBCATEGORIES[canonical] || MENU_CATEGORIES;
    res.json({
      business_category: canonical,
      categories: subcats,
      grocery_units: GROCERY_UNITS,
      standard_sizes: STANDARD_SIZES
    });
  } catch (err) {
    console.error('getMenuCategories error:', err.message);
    res.status(500).json({ error: err.message || 'Server error fetching categories' });
  }
};

const getMenuItems = async (req, res) => {
  try {
    await ensureMenuSchema();
    const { business_id } = req.query;
    let query = `
      SELECT mi.*, b.name AS business_name, b.business_type
      FROM menu_items mi
      LEFT JOIN businesses b ON mi.business_id = b.id
      WHERE mi.is_available = true
    `;
    const params = [];
    if (business_id) {
      params.push(business_id);
      query += ` AND mi.business_id = $1`;
    }
    query += ` ORDER BY mi.category, mi.name`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getMenuItems error:', err.message);
    res.status(500).json({ error: err.message || 'Server error fetching menu' });
  }
};

const getAllMenuItems = async (req, res) => {
  try {
    await ensureMenuSchema();
    const bizId = req.user?.business_id;
    let query = `
      SELECT mi.*, b.name AS business_name, b.business_type
      FROM menu_items mi
      LEFT JOIN businesses b ON mi.business_id = b.id
    `;
    const params = [];
    if (bizId && req.user?.role !== 'admin') {
      params.push(bizId);
      query += ` WHERE mi.business_id = $1`;
    }
    query += ` ORDER BY mi.category, mi.name`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getAllMenuItems error:', err.message);
    res.status(500).json({ error: err.message || 'Server error fetching menu' });
  }
};

const createMenuItem = async (req, res) => {
  try {
    await ensureMenuSchema();
    const { name, description, price, image_url, category, business_id } = req.body;

    if (!name || price === undefined || price === null || price === '') {
      return res.status(400).json({ error: 'Product name and price are required' });
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: 'Valid positive price is required' });
    }

    let targetBusinessId = req.user?.business_id || business_id || null;
    if (!targetBusinessId && req.user?.id) {
      const bizRes = await db.query('SELECT id, business_type FROM businesses WHERE owner_id = $1 LIMIT 1', [req.user.id]);
      if (bizRes.rows.length > 0) {
        targetBusinessId = bizRes.rows[0].id;
      }
    }
    if (!targetBusinessId) {
      const fallbackBiz = await db.query('SELECT id, business_type FROM businesses ORDER BY id ASC LIMIT 1');
      targetBusinessId = fallbackBiz.rows[0]?.id || null;
    }

    // Retrieve business info to get registered business category
    let businessType = null;
    if (targetBusinessId) {
      const bizRes = await db.query('SELECT business_type FROM businesses WHERE id = $1', [targetBusinessId]);
      if (bizRes.rows.length > 0) {
        businessType = bizRes.rows[0].business_type;
      }
    }

    // Check plan max menu items quota
    if (targetBusinessId) {
      const countRes = await db.query('SELECT COUNT(*) FROM menu_items WHERE business_id = $1', [targetBusinessId]);
      const currentCount = parseInt(countRes.rows[0]?.count || 0);

      const planRes = await db.query(`
        SELECT sp.max_menu_items, sp.name AS plan_name
        FROM businesses b
        LEFT JOIN subscription_plans sp ON b.subscription_plan_id = sp.id
        WHERE b.id = $1
      `, [targetBusinessId]);

      const maxAllowed = planRes.rows[0]?.max_menu_items || 25;
      if (currentCount >= maxAllowed) {
        return res.status(403).json({
          error: `Your subscription plan limit (${maxAllowed} products) has been reached. Please upgrade your plan to add more items.`
        });
      }
    }

    // Process & validate category-specific attributes according to the business type
    const { attributes, brand, stockQuantity } = parseAndValidateAttributes(businessType, req.body);

    // Upload files from memory buffer → Cloudinary or local disk
    const uploadedImageUrls = await Promise.all(
      (req.files || []).map((f) => saveImageBuffer(f.buffer, f.originalname))
    );

    const imageUrls = normalizeImageList(image_url, uploadedImageUrls);
    const finalImageUrl = imageUrls[0] || null;

    const finalCategory = category && String(category).trim() ? String(category).trim() : 'General';

    const result = await db.query(
      `INSERT INTO menu_items (
        name, description, price, category, image_url, image_urls, business_id, attributes, brand, stock_quantity
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        String(name).trim(),
        description ? String(description).trim() : '',
        numPrice,
        finalCategory,
        finalImageUrl,
        imageUrls,
        targetBusinessId,
        JSON.stringify(attributes),
        brand,
        stockQuantity
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createMenuItem error:', err.message);
    res.status(500).json({ error: err.message || 'Server error creating product item' });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    await ensureMenuSchema();
    const { id } = req.params;
    const { name, description, price, image_url, is_available, remove_images, category } = req.body;

    const existingRes = await db.query(`
      SELECT mi.*, b.business_type 
      FROM menu_items mi
      LEFT JOIN businesses b ON mi.business_id = b.id
      WHERE mi.id = $1
    `, [id]);

    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product item not found' });
    }
    const existing = existingRes.rows[0];

    // Data isolation check for owners
    if (req.user?.role === 'owner' && req.user?.business_id && existing.business_id && existing.business_id !== req.user.business_id) {
      return res.status(403).json({ error: 'Cannot modify products belonging to another business' });
    }

    const existingImages = Array.isArray(existing.image_urls) ? existing.image_urls : [];

    const removeImages = Array.isArray(remove_images)
      ? remove_images
      : (typeof remove_images === 'string' && remove_images ? [remove_images] : []);

    // Upload new files from memory buffer → Cloudinary or local disk
    const uploadedImageUrls = await Promise.all(
      (req.files || []).map((f) => saveImageBuffer(f.buffer, f.originalname))
    );

    const fallbackManualList = image_url ? [image_url] : [];
    const keptImages = existingImages.filter((u) => !removeImages.includes(u));
    const imageUrls = [...keptImages, ...uploadedImageUrls, ...fallbackManualList]
      .map((u) => String(u || '').trim())
      .filter(Boolean);

    const finalImageUrl = imageUrls[0] || null;
    const nextCategory = category !== undefined && String(category).trim() ? String(category).trim() : existing.category;
    const nextAvailable = is_available !== undefined ? (is_available === true || is_available === 'true') : existing.is_available;

    // Attributes validation merge
    let updatedAttributes = existing.attributes || {};
    if (typeof updatedAttributes === 'string') {
      try { updatedAttributes = JSON.parse(updatedAttributes); } catch (e) { updatedAttributes = {}; }
    }
    const parsedIncoming = parseAndValidateAttributes(existing.business_type, {
      ...req.body,
      attributes: { ...updatedAttributes, ...(req.body.attributes ? (typeof req.body.attributes === 'string' ? JSON.parse(req.body.attributes) : req.body.attributes) : {}) }
    });

    const nextBrand = parsedIncoming.brand !== undefined ? parsedIncoming.brand : existing.brand;
    const nextStock = parsedIncoming.stockQuantity !== undefined ? parsedIncoming.stockQuantity : existing.stock_quantity;

    const result = await db.query(
      `UPDATE menu_items 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           category = $4,
           image_url = $5,
           image_urls = $6,
           is_available = $7,
           attributes = $8,
           brand = $9,
           stock_quantity = $10
       WHERE id = $11 RETURNING *`,
      [
        name ? String(name).trim() : null,
        description !== undefined ? String(description).trim() : null,
        price !== undefined && price !== '' ? parseFloat(price) : null,
        nextCategory,
        finalImageUrl,
        imageUrls,
        nextAvailable,
        JSON.stringify(parsedIncoming.attributes),
        nextBrand,
        nextStock,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateMenuItem error:', err.message);
    res.status(500).json({ error: err.message || 'Server error updating product item' });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    await ensureMenuSchema();
    const { id } = req.params;

    const existingRes = await db.query('SELECT * FROM menu_items WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    const existing = existingRes.rows[0];

    // Data isolation check for owners
    if (req.user?.role === 'owner' && req.user?.business_id && existing.business_id && existing.business_id !== req.user.business_id) {
      return res.status(403).json({ error: 'Cannot delete menu items belonging to another business' });
    }

    await db.query('DELETE FROM menu_items WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('deleteMenuItem error:', err.message);
    res.status(500).json({ error: err.message || 'Server error deleting menu item' });
  }
};

module.exports = {
  getMenuCategories,
  getMenuItems,
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
