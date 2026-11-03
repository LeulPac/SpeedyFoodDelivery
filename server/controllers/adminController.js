const db = require('../db');

/**
 * Platform Admin: Comprehensive Financial & Operational Metrics
 * Strictly distinguishes subscription revenue, driver fees, and food order GMV!
 */
const getPlatformMetrics = async (_req, res) => {
  try {
    // 1. Business Subscription Revenue (Collected)
    const subRevRes = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0) AS total_subscription_revenue,
        COUNT(*) FILTER (WHERE status = 'paid') AS paid_subscription_transactions,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_subscription_transactions
      FROM subscription_payments
      WHERE status = 'paid'
    `);
    const subStats = subRevRes.rows[0];

    // 2. Driver Fees Breakdown
    const driverFeeRes = await db.query(`
      SELECT 
        COALESCE(SUM(fee_amount), 0) AS driver_fees_accrued,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN fee_amount ELSE 0 END), 0) AS driver_fees_collected,
        COALESCE(SUM(CASE WHEN status = 'unpaid' THEN fee_amount ELSE 0 END), 0) AS driver_fees_outstanding,
        COUNT(*) AS total_fee_events,
        COUNT(*) FILTER (WHERE status = 'paid') AS paid_fee_events,
        COUNT(*) FILTER (WHERE status = 'unpaid') AS unpaid_fee_events
      FROM driver_delivery_fees
    `);
    const driverFeeStats = driverFeeRes.rows[0];

    // 3. Customer Food Order Volume (NOT platform commission)
    const foodOrderRes = await db.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_food_order_value,
        COUNT(*) AS total_paid_orders
      FROM orders
      WHERE payment_status = 'paid'
    `);
    const foodStats = foodOrderRes.rows[0];

    // 4. Platform Totals
    const businessCountRes = await db.query(`
      SELECT 
        COUNT(*) AS total_businesses,
        COUNT(*) FILTER (WHERE subscription_status = 'active') AS active_subscriptions,
        COUNT(*) FILTER (WHERE subscription_status = 'pending') AS pending_subscriptions,
        COUNT(*) FILTER (WHERE is_approved = false AND (subscription_status = 'paid_pending_approval' OR subscription_status = 'paid')) AS pending_approvals,
        COUNT(*) FILTER (WHERE is_approved = true) AS approved_businesses
      FROM businesses
    `);
    const bizCounts = businessCountRes.rows[0];

    const driverCountRes = await db.query("SELECT COUNT(*) FROM users WHERE role = 'driver'");
    const customerCountRes = await db.query("SELECT COUNT(*) FROM users WHERE role = 'customer'");

    const completedDeliveriesRes = await db.query("SELECT COUNT(*) FROM orders WHERE status = 'delivered'");

    // Total actual platform earned revenue = Subscription Revenue + Driver Fees Actually Collected
    const actualPlatformRevenue = 
      parseFloat(subStats.total_subscription_revenue) + parseFloat(driverFeeStats.driver_fees_collected);

    res.json({
      financials: {
        platform_actual_collected_revenue: actualPlatformRevenue,
        business_subscription_revenue: parseFloat(subStats.total_subscription_revenue),
        driver_fees_accrued: parseFloat(driverFeeStats.driver_fees_accrued),
        driver_fees_collected: parseFloat(driverFeeStats.driver_fees_collected),
        driver_fees_outstanding: parseFloat(driverFeeStats.driver_fees_outstanding),
        food_order_value: parseFloat(foodStats.total_food_order_value),
        food_order_note: 'Food order value represents restaurant sales. SpeedyDelivery charges 0% commission on food.',
      },
      operations: {
        total_businesses: parseInt(bizCounts.total_businesses),
        active_subscriptions: parseInt(bizCounts.active_subscriptions),
        pending_subscriptions: parseInt(bizCounts.pending_subscriptions),
        pending_approvals: parseInt(bizCounts.pending_approvals || 0),
        total_drivers: parseInt(driverCountRes.rows[0]?.count || 0),
        total_customers: parseInt(customerCountRes.rows[0]?.count || 0),
        total_paid_orders: parseInt(foodStats.total_paid_orders),
        total_completed_deliveries: parseInt(completedDeliveriesRes.rows[0]?.count || 0),
      }
    });
  } catch (err) {
    console.error('getPlatformMetrics error:', err);
    res.status(500).json({ error: 'Server error retrieving platform metrics' });
  }
};

/**
 * Platform Admin: List all businesses with verified payment records
 */
const getAdminBusinesses = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        b.*,
        u.name AS owner_account_name,
        u.email AS owner_account_email,
        sp.name AS plan_name,
        sp.price AS plan_price,
        last_pay.amount AS verified_payment_amount,
        last_pay.payment_reference AS verified_tx_ref,
        last_pay.status AS payment_record_status,
        last_pay.paid_at AS payment_timestamp,
        COUNT(DISTINCT mi.id) AS menu_items_count,
        COUNT(DISTINCT o.id) AS orders_count
      FROM businesses b
      LEFT JOIN users u ON b.owner_id = u.id
      LEFT JOIN subscription_plans sp ON b.subscription_plan_id = sp.id
      LEFT JOIN LATERAL (
        SELECT amount, payment_reference, status, paid_at
        FROM subscription_payments
        WHERE business_id = b.id
        ORDER BY id DESC LIMIT 1
      ) last_pay ON true
      LEFT JOIN menu_items mi ON mi.business_id = b.id
      LEFT JOIN orders o ON o.business_id = b.id
      GROUP BY b.id, u.name, u.email, sp.name, sp.price, last_pay.amount, last_pay.payment_reference, last_pay.status, last_pay.paid_at
      ORDER BY 
        CASE WHEN b.is_approved = false AND (b.subscription_status = 'paid_pending_approval' OR last_pay.status = 'paid') THEN 0 ELSE 1 END,
        b.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('getAdminBusinesses error:', err);
    res.status(500).json({ error: 'Server error fetching businesses' });
  }
};

/**
 * Platform Admin: Update business status / approval
 */
const updateBusinessStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { is_approved, is_active, subscription_status } = req.body;

    if (is_approved === true && !subscription_status) {
      subscription_status = 'active';
    }

    const result = await db.query(`
      UPDATE businesses
      SET is_approved = COALESCE($1, is_approved),
          is_active = COALESCE($2, is_active),
          subscription_status = COALESCE($3, subscription_status)
      WHERE id = $4
      RETURNING *
    `, [is_approved, is_active, subscription_status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateBusinessStatus error:', err);
    res.status(500).json({ error: 'Server error updating business' });
  }
};

/**
 * Platform Admin: Get subscription plans
 */
const getAdminPlans = async (_req, res) => {
  try {
    const result = await db.query('SELECT * FROM subscription_plans ORDER BY price ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('getAdminPlans error:', err);
    res.status(500).json({ error: 'Server error loading plans' });
  }
};

/**
 * Platform Admin: Update subscription plan pricing & details
 */
const updateAdminPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, description, max_menu_items, features, is_active } = req.body;

    const result = await db.query(`
      UPDATE subscription_plans
      SET price = COALESCE($1, price),
          description = COALESCE($2, description),
          max_menu_items = COALESCE($3, max_menu_items),
          features = COALESCE($4, features),
          is_active = COALESCE($5, is_active)
      WHERE id = $6
      RETURNING *
    `, [price, description, max_menu_items, features ? JSON.stringify(features) : null, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateAdminPlan error:', err);
    res.status(500).json({ error: 'Server error updating plan' });
  }
};

/**
 * Platform Admin: Get all driver fee records
 */
const getAdminDriverFees = async (_req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        df.*,
        u.name AS driver_name,
        u.email AS driver_email,
        u.phone AS driver_phone,
        b.name AS business_name,
        o.total_amount AS order_amount,
        o.created_at AS order_date
      FROM driver_delivery_fees df
      JOIN users u ON df.driver_id = u.id
      JOIN orders o ON df.order_id = o.id
      LEFT JOIN businesses b ON df.business_id = b.id
      ORDER BY df.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('getAdminDriverFees error:', err);
    res.status(500).json({ error: 'Server error loading driver fees' });
  }
};

/**
 * Platform Admin: Get and Update Platform Settings
 */
const getPlatformSettings = async (_req, res) => {
  try {
    const result = await db.query('SELECT * FROM platform_settings LIMIT 1');
    res.json(result.rows[0] || { driver_fee_per_delivery: 25.00, grace_period_days: 7 });
  } catch (err) {
    console.error('getPlatformSettings error:', err);
    res.status(500).json({ error: 'Server error loading settings' });
  }
};

const updatePlatformSettings = async (req, res) => {
  try {
    const { driver_fee_per_delivery, grace_period_days } = req.body;
    const result = await db.query(`
      UPDATE platform_settings
      SET driver_fee_per_delivery = COALESCE($1, driver_fee_per_delivery),
          grace_period_days = COALESCE($2, grace_period_days),
          updated_at = NOW()
      WHERE id = (SELECT id FROM platform_settings LIMIT 1)
      RETURNING *
    `, [driver_fee_per_delivery, grace_period_days]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updatePlatformSettings error:', err);
    res.status(500).json({ error: 'Server error updating settings' });
  }
};

/**
 * Platform Admin: List users with role filter
 */
const getAdminUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = `
      SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at, b.name AS business_name
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
    `;
    const params = [];
    if (role) {
      params.push(role);
      query += ` WHERE u.role = $1`;
    }
    query += ` ORDER BY u.created_at DESC LIMIT 100`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getAdminUsers error:', err);
    res.status(500).json({ error: 'Server error loading users' });
  }
};

module.exports = {
  getPlatformMetrics,
  getAdminBusinesses,
  updateBusinessStatus,
  getAdminPlans,
  updateAdminPlan,
  getAdminDriverFees,
  getPlatformSettings,
  updatePlatformSettings,
  getAdminUsers,
};

