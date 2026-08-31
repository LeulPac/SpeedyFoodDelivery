const db = require('../db');
const cloudinary = require('cloudinary').v2;
const { MENU_CATEGORIES, normalizeCategory } = require('../menuCategories');

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
    await db.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'Main Dish'`);
    await db.query(`ALTER TABLE menu_items ALTER COLUMN image_url TYPE TEXT`);
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

const getMenuCategories = async (_req, res) => {
  try {
    await ensureMenuSchema();
    res.json(MENU_CATEGORIES);
  } catch (err) {
    console.error('getMenuCategories error:', err.message);
    res.status(500).json({ error: err.message || 'Server error fetching categories' });
  }
};

const getMenuItems = async (req, res) => {
  try {
    await ensureMenuSchema();
    const result = await db.query(
      'SELECT * FROM menu_items WHERE is_available = true ORDER BY category, name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('getMenuItems error:', err.message);
    res.status(500).json({ error: err.message || 'Server error fetching menu' });
  }
};

const getAllMenuItems = async (_req, res) => {
  try {
    await ensureMenuSchema();
    const result = await db.query('SELECT * FROM menu_items ORDER BY category, name');
    res.json(result.rows);
  } catch (err) {
    console.error('getAllMenuItems error:', err.message);
    res.status(500).json({ error: err.message || 'Server error fetching menu' });
  }
};

const createMenuItem = async (req, res) => {
  try {
    await ensureMenuSchema();
    const { name, description, price, image_url, category } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // Upload files from memory buffer → Cloudinary or local disk
    const uploadedImageUrls = await Promise.all(
      (req.files || []).map((f) => saveImageBuffer(f.buffer, f.originalname))
    );

    const imageUrls = normalizeImageList(image_url, uploadedImageUrls);
    const finalImageUrl = imageUrls[0] || null;

    const result = await db.query(
      'INSERT INTO menu_items (name, description, price, category, image_url, image_urls) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description || '', price, normalizeCategory(category), finalImageUrl, imageUrls]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createMenuItem error:', err.message);
    res.status(500).json({ error: err.message || 'Server error creating menu item' });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    await ensureMenuSchema();
    const { id } = req.params;
    const { name, description, price, image_url, is_available, remove_images, category } = req.body;

    const existingRes = await db.query('SELECT * FROM menu_items WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    const existing = existingRes.rows[0];
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
    const nextCategory = category !== undefined ? normalizeCategory(category) : existing.category;
    const nextAvailable = is_available !== undefined ? (is_available === true || is_available === 'true') : existing.is_available;

    const result = await db.query(
      'UPDATE menu_items SET name = COALESCE($1, name), description = COALESCE($2, description), price = COALESCE($3, price), category = $4, image_url = $5, image_urls = $6, is_available = $7 WHERE id = $8 RETURNING *',
      [name, description, price, nextCategory, finalImageUrl, imageUrls, nextAvailable, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateMenuItem error:', err.message);
    res.status(500).json({ error: err.message || 'Server error updating menu item' });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    await ensureMenuSchema();
    const { id } = req.params;
    const result = await db.query('DELETE FROM menu_items WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
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
