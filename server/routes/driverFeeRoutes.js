const express = require('express');
const router = express.Router();
const {
  getDriverFeeSummary,
  payDriverFees,
  verifyDriverFeePayment,
} = require('../controllers/driverFeeController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.get('/summary', verifyToken, verifyRole(['driver']), getDriverFeeSummary);
router.post('/pay', verifyToken, verifyRole(['driver']), payDriverFees);
router.get('/verify-payment/:tx_ref', verifyToken, verifyRole(['driver']), verifyDriverFeePayment);

module.exports = router;

