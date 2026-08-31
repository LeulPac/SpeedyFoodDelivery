const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyChapaPayment,
  getOrders,
  getDriverStatuses,
  updateOrderStatus,
  updateCustomerLocation,
  updateDriverLocation,
  switchToCash,
  cancelUnpaidOrder,
  retryChapaPayment,
  deleteOrder,
} = require('../controllers/orderController');
const { updateDriver, deleteDriver } = require('../controllers/authController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

// Customers create orders
router.post('/', verifyToken, verifyRole(['customer']), createOrder);

// Verify Chapa payment — MUST come before /:id routes
router.get('/verify-chapa/:tx_ref', verifyToken, verifyRole(['customer']), verifyChapaPayment);

// Everyone can view orders (filtered in the controller based on role)
router.get('/', verifyToken, getOrders);

// Driver management — MUST come before /:id routes
router.get('/drivers', verifyToken, verifyRole(['owner']), getDriverStatuses);
router.put('/drivers/:id', verifyToken, verifyRole(['owner']), updateDriver);
router.delete('/drivers/:id', verifyToken, verifyRole(['owner']), deleteDriver);

// Parameterized order routes
router.put('/:id/switch-to-cash', verifyToken, verifyRole(['customer']), switchToCash);
router.delete('/:id/cancel-unpaid', verifyToken, verifyRole(['customer', 'owner']), cancelUnpaidOrder);
router.post('/:id/retry-chapa', verifyToken, verifyRole(['customer']), retryChapaPayment);
router.delete('/:id', verifyToken, verifyRole(['owner']), deleteOrder);

// Status / location updates
router.put('/:id/status', verifyToken, verifyRole(['owner', 'driver', 'customer']), updateOrderStatus);
router.put('/:id/customer-location', verifyToken, verifyRole(['customer']), updateCustomerLocation);
router.put('/:id/driver-location', verifyToken, verifyRole(['driver']), updateDriverLocation);

module.exports = router;
