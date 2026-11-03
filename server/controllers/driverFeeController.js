const db = require('../db');

/**
 * Driver: Get fee summary and delivery history
 */
const getDriverFeeSummary = async (req, res) => {
  try {
    const driverId = req.user.id;

    // 1. Get fixed fee per delivery from platform settings
    const settingsRes = await db.query('SELECT driver_fee_per_delivery FROM platform_settings LIMIT 1');
    const feePerDelivery = parseFloat(settingsRes.rows[0]?.driver_fee_per_delivery || 25.00);

    // 2. Completed deliveries count for this driver
    const completedRes = await db.query(
      "SELECT COUNT(*) FROM orders WHERE driver_id = $1 AND status = 'delivered'",
      [driverId]
    );
    const completedCount = parseInt(completedRes.rows[0]?.count || 0);

    // 3. Driver fee ledger totals
    const ledgerRes = await db.query(`
      SELECT 
        COALESCE(SUM(fee_amount), 0) AS total_accrued,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN fee_amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN status = 'unpaid' THEN fee_amount ELSE 0 END), 0) AS outstanding_balance
      FROM driver_delivery_fees
      WHERE driver_id = $1
    `, [driverId]);

    const stats = ledgerRes.rows[0];

    // 4. Traceable delivery fee records
    const feesList = await db.query(`
      SELECT 
        df.id,
        df.order_id,
        df.fee_amount,
        df.status,
        df.payment_reference,
        df.paid_at,
        df.created_at,
        o.total_amount AS order_amount,
        b.name AS business_name
      FROM driver_delivery_fees df
      JOIN orders o ON df.order_id = o.id
      LEFT JOIN businesses b ON df.business_id = b.id
      WHERE df.driver_id = $1
      ORDER BY df.created_at DESC
      LIMIT 50
    `, [driverId]);

    res.json({
      driver_id: driverId,
      fee_per_delivery: feePerDelivery,
      completed_deliveries_count: completedCount,
      total_fees_accrued: parseFloat(stats.total_accrued),
      total_fees_paid: parseFloat(stats.total_paid),
      outstanding_balance: parseFloat(stats.outstanding_balance),
      fee_history: feesList.rows,
    });
  } catch (err) {
    console.error('getDriverFeeSummary error:', err);
    res.status(500).json({ error: 'Server error retrieving driver fee summary' });
  }
};

/**
 * Driver: Initialize Chapa payment to pay outstanding fee balance
 */
const payDriverFees = async (req, res) => {
  try {
    const driverId = req.user.id;
    const { amount } = req.body;

    // Calculate unpaid fees
    const unpaidRes = await db.query(`
      SELECT id, fee_amount FROM driver_delivery_fees
      WHERE driver_id = $1 AND status = 'unpaid'
      ORDER BY created_at ASC
    `, [driverId]);

    if (unpaidRes.rows.length === 0) {
      return res.status(400).json({ error: 'You have no outstanding fee balance to pay.' });
    }

    const totalUnpaid = unpaidRes.rows.reduce((sum, r) => sum + parseFloat(r.fee_amount), 0);
    const payAmount = amount ? Math.min(parseFloat(amount), totalUnpaid) : totalUnpaid;

    if (payAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
    }

    const driverRes = await db.query('SELECT name, email, phone FROM users WHERE id = $1', [driverId]);
    const driver = driverRes.rows[0];

    const txRef = `speedy-drvfee-${Date.now()}-${driverId}-${Math.floor(Math.random() * 1000)}`;

    const clientOrigin = req.get('origin') || req.get('referer') || 'http://localhost:5175';
    const returnUrl = `${clientOrigin.replace(/\/$/, '')}/?verify_driver_fee=${txRef}`;
    const [firstName, ...restName] = driver.name.split(' ');
    const lastName = restName.join(' ') || 'Driver';

    const chapaResponse = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: payAmount.toFixed(2),
        currency: 'ETB',
        email: driver.email,
        first_name: firstName,
        last_name: lastName,
        phone_number: driver.phone || '0900000000',
        tx_ref: txRef,
        return_url: returnUrl,
        "customization[title]": "SpeedyDelivery Driver Platform Fee",
        "customization[description]": `Delivery fee settlement for driver ${driver.name}`
      })
    });

    const chapaData = await chapaResponse.json();
    if (chapaData.status === 'success' && chapaData.data?.checkout_url) {
      return res.json({
        checkout_url: chapaData.data.checkout_url,
        tx_ref: txRef,
        amount: payAmount
      });
    } else {
      return res.status(400).json({
        error: chapaData.message || 'Failed to initialize payment gateway for driver fees.'
      });
    }
  } catch (err) {
    console.error('payDriverFees error:', err);
    res.status(500).json({ error: 'Server error processing driver fee payment' });
  }
};

/**
 * Driver: Verify Chapa payment for driver fees
 */
const verifyDriverFeePayment = async (req, res) => {
  try {
    const { tx_ref } = req.params;
    const driverId = req.user.id;

    if (!tx_ref) {
      return res.status(400).json({ error: 'Transaction reference is required' });
    }

    const chapaKey = process.env.CHAPA_SECRET_KEY;
    const chapaVerifyRes = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${chapaKey}` }
    });

    const verifyData = await chapaVerifyRes.json();
    if (verifyData.status === 'success' && verifyData.data?.status === 'success') {
      const verifiedAmount = parseFloat(verifyData.data.amount);

      // Settle unpaid fees up to verifiedAmount
      const unpaidRes = await db.query(
        "SELECT id, fee_amount FROM driver_delivery_fees WHERE driver_id = $1 AND status = 'unpaid' ORDER BY created_at ASC",
        [driverId]
      );

      let remainingToClear = verifiedAmount;
      const settledIds = [];

      for (const fee of unpaidRes.rows) {
        if (remainingToClear >= parseFloat(fee.fee_amount)) {
          settledIds.push(fee.id);
          remainingToClear -= parseFloat(fee.fee_amount);
        }
      }

      if (settledIds.length > 0) {
        await db.query(
          `UPDATE driver_delivery_fees
           SET status = 'paid', paid_at = NOW(), payment_reference = $1
           WHERE id = ANY($2::int[])`,
          [tx_ref, settledIds]
        );
      }

      return res.json({
        success: true,
        message: `Payment of ${verifiedAmount} ETB verified successfully. ${settledIds.length} delivery fees settled.`,
        settled_count: settledIds.length,
        amount: verifiedAmount
      });
    } else {
      return res.status(400).json({
        success: false,
        error: verifyData.message || 'Payment verification failed with Chapa.'
      });
    }
  } catch (err) {
    console.error('verifyDriverFeePayment error:', err);
    res.status(500).json({ error: 'Server error verifying driver fee payment' });
  }
};

module.exports = {
  getDriverFeeSummary,
  payDriverFees,
  verifyDriverFeePayment,
};

