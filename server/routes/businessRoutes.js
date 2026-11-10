const express = require('express');
const router = express.Router();
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

// Public routes for customer discovery
router.get('/', getBusinesses);
router.get('/plans', getSubscriptionPlans);
router.get('/portal/:portalCode', getBusinessByPortalCode);
router.get('/:id', getBusinessById);
router.get('/:id/menu', getBusinessMenu);

// Business registration with mandatory subscription
router.post('/register', registerBusiness);
router.get('/verify-subscription/:tx_ref', verifySubscriptionPayment);

// Business Owner routes
router.get('/my/profile', verifyToken, verifyRole(['owner', 'admin']), getMyBusiness);
router.put('/my/profile', verifyToken, verifyRole(['owner', 'admin']), updateMyBusiness);
router.post('/renew-subscription', verifyToken, verifyRole(['owner', 'admin']), renewSubscription);

module.exports = router;
