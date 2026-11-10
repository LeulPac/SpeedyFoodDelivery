const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  getBusinesses,
  getBusinessById,
  getBusinessByPortalCode,
  getBusinessMenu,
  getSubscriptionPlans,
  registerBusiness,
  verifySubscriptionPayment,
  renewSubscription,
  getMyBusiness,
  updateMyBusiness,
} = require('../controllers/businessController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Multer memory storage for business registration images (logo & cover)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const handleBizUpload = (req, res, next) => {
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      console.error('Multer upload error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

// Public routes for customer discovery
router.get('/', getBusinesses);
router.get('/plans', getSubscriptionPlans);
router.get('/portal/:portalCode', getBusinessByPortalCode);
router.get('/:id', getBusinessById);
router.get('/:id/menu', getBusinessMenu);

// Business registration with optional logo & cover photo upload
router.post('/register', handleBizUpload, registerBusiness);
router.get('/verify-subscription/:tx_ref', verifySubscriptionPayment);

// Business Owner routes
router.get('/my/profile', verifyToken, verifyRole(['owner', 'admin']), getMyBusiness);
router.put('/my/profile', verifyToken, verifyRole(['owner', 'admin']), handleBizUpload, updateMyBusiness);
router.post('/renew-subscription', verifyToken, verifyRole(['owner', 'admin']), renewSubscription);

module.exports = router;
