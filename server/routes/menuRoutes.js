const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getMenuCategories, getMenuItems, getAllMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } = require('../controllers/menuController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Use memory storage — files stay as buffers in req.files
// The controller uploads them to Cloudinary manually
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Wrap multer so upload errors are returned as JSON
const handleUpload = (req, res, next) => {
  upload.array('images', 8)(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Public routes
router.get('/categories', getMenuCategories);
router.get('/', getMenuItems);
router.get('/all', verifyToken, verifyRole(['owner']), getAllMenuItems);

// Protected Owner Routes
router.post('/', verifyToken, verifyRole(['owner']), handleUpload, createMenuItem);
router.put('/:id', verifyToken, verifyRole(['owner']), handleUpload, updateMenuItem);
router.delete('/:id', verifyToken, verifyRole(['owner']), deleteMenuItem);

module.exports = router;
