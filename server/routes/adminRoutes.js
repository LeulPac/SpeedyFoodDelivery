const express = require('express');
const router = express.Router();
const {
  getPlatformMetrics,
  getAdminBusinesses,
  updateBusinessStatus,
  getAdminPlans,
  updateAdminPlan,
  getAdminDriverFees,
  getPlatformSettings,
  updatePlatformSettings,
  getAdminUsers,
} = require('../controllers/adminController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Platform admin only
router.get('/metrics', verifyToken, verifyRole(['admin', 'owner']), getPlatformMetrics);
router.get('/businesses', verifyToken, verifyRole(['admin', 'owner']), getAdminBusinesses);
router.put('/businesses/:id/status', verifyToken, verifyRole(['admin']), updateBusinessStatus);
router.get('/plans', verifyToken, verifyRole(['admin', 'owner']), getAdminPlans);
router.put('/plans/:id', verifyToken, verifyRole(['admin']), updateAdminPlan);
router.get('/driver-fees', verifyToken, verifyRole(['admin', 'owner']), getAdminDriverFees);
router.get('/settings', verifyToken, verifyRole(['admin', 'owner']), getPlatformSettings);
router.put('/settings', verifyToken, verifyRole(['admin']), updatePlatformSettings);
router.get('/users', verifyToken, verifyRole(['admin', 'owner']), getAdminUsers);

module.exports = router;

