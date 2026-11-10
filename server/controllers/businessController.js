const crypto = require('crypto');
const { sendOwnerWelcomeEmail } = require('../services/emailService');
const { uploadImageBuffer } = require('../services/uploadService');
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, business_id: user.business_id || null },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

const publicUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone || null,
  role: row.role,
  business_id: row.business_id || null,
});

/**
 * Public: Get list of active businesses for customer discovery
 */
const getBusinesses = async (req, res) => {
  try {
    const { type, search } = req.query;
    let query = `
      SELECT 
        b.id,
        b.name,
        b.business_type,
        b.owner_name,
        b.phone,
        b.address,
        b.description,
        b.logo_url,
        b.cover_url,
        b.is_approved,
        b.is_active,
        b.subscription_status,
        sp.name AS plan_name,
        COUNT(mi.id) FILTER (WHERE mi.is_available = true) AS active_menu_items_count
      FROM businesses b
      LEFT JOIN subscription_plans sp ON b.subscription_plan_id = sp.id
      LEFT JOIN menu_items mi ON mi.business_id = b.id
      WHERE b.is_approved = true AND b.is_active = true
    `;
    const params = [];

    if (type && type !== 'All') {
      params.push(type);
      query += ` AND b.business_type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      query += ` AND (b.name ILIKE $${params.length} OR b.description ILIKE $${params.length} OR b.address ILIKE $${params.length})`;
    }

    query += `
      GROUP BY b.id, sp.name
      ORDER BY 
        CASE WHEN b.subscription_status = 'active' THEN 0 ELSE 1 END,
        b.name ASC
    `;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('getBusinesses error:', err);
    res.status(500).json({ error: 'Server error loading businesses' });
  }
};

/**
 * Public: Get single business details
 */

/**
 * Public: Get business metadata by unique portal code for branded login
 */
const getBusinessByPortalCode = async (req, res) => {
  try {
    const { portalCode } = req.params;
    if (!portalCode) {
      return res.status(400).json({ error: 'Portal code is required' });
    }

    const result = await db.query(`
      SELECT 
        b.id,
        b.name,
        b.business_type,
        b.owner_name,
        b.email,
        b.phone,
        b.address,
        b.description,
        b.logo_url,
        b.cover_url,
        b.portal_code,
        b.is_approved,
        b.is_active,
        sp.name AS plan_name
      FROM businesses b
      LEFT JOIN subscription_plans sp ON b.subscription_plan_id = sp.id
      WHERE b.portal_code = $1
    `, [portalCode]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business portal not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('getBusinessByPortalCode error:', err);
    res.status(500).json({ error: 'Server error loading business portal' });
  }
};

const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT 
        b.*,
        sp.name AS plan_name,
        sp.features AS plan_features
      FROM businesses b
      LEFT JOIN subscription_plans sp ON b.subscription_plan_id = sp.id
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('getBusinessById error:', err);
    res.status(500).json({ error: 'Server error loading business' });
  }
};

/**
 * Public: Get menu items for a specific business
 */
const getBusinessMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT * FROM menu_items
      WHERE business_id = $1 AND is_available = true
      ORDER BY category, name
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    console.error('getBusinessMenu error:', err);
    res.status(500).json({ error: 'Server error loading business menu' });
  }
};

/**
 * Public: Get available subscription plans
 */
const getSubscriptionPlans = async (_req, res) => {
  try {
    const result = await db.query('SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('getSubscriptionPlans error:', err);
    res.status(500).json({ error: 'Server error loading plans' });
  }
};

/**
 * Mandatory Business Registration with Subscription Payment Workflow
 */
const registerBusiness = async (req, res) => {
  try {
    const {
      business_name,
      business_type,
      owner_name,
      email,
      password,
      phone,
      address,
      description,
      logo_url,
      cover_url,
      plan_id,
    } = req.body;

    // Validation
    if (!business_name || !owner_name || !email || !password || !plan_id) {
      return res.status(400).json({
        error: 'Business name, owner name, email, password, and subscription plan selection are required.'
      });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [trimmedEmail]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Verify chosen plan
    const planRes = await db.query('SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true', [plan_id]);
    if (planRes.rows.length === 0) {
      return res.status(400).json({ error: 'Selected subscription plan is invalid or inactive.' });
    }
    const plan = planRes.rows[0];

    // Create user account with role 'owner'
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(password).trim(), salt);

    const userRes = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, 'owner')
       RETURNING id, name, email, phone, role`,
      [String(owner_name).trim(), trimmedEmail, phone ? String(phone).trim() : null, passwordHash]
    );
    const user = userRes.rows[0];

    // Upload logo and cover if provided as files or keep URLs
    let finalLogoUrl = logo_url || null;
    let finalCoverUrl = cover_url || null;

    if (req.files?.logo && req.files.logo[0]) {
      try {
        finalLogoUrl = await uploadImageBuffer(req.files.logo[0].buffer, 'food-delivery/logos', 'logo');
      } catch (uploadErr) {
        console.warn('Failed to upload logo image:', uploadErr.message);
      }
    }

    if (req.files?.cover && req.files.cover[0]) {
      try {
        finalCoverUrl = await uploadImageBuffer(req.files.cover[0].buffer, 'food-delivery/covers', 'cover');
      } catch (uploadErr) {
        console.warn('Failed to upload cover image:', uploadErr.message);
      }
    }

    // Generate unique portal_code for the business owner
    const cleanSlug = String(business_name)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'biz';
    const randomSuffix = crypto.randomBytes(3).toString('hex');
    const portalCode = `${cleanSlug}-${Date.now().toString(36)}-${randomSuffix}`;

    // Create business in unapproved, pending payment state
    const bizRes = await db.query(
      `INSERT INTO businesses (
        owner_id, name, business_type, owner_name, email, phone, address, description,
        logo_url, cover_url, is_approved, is_active, subscription_plan_id, subscription_status, portal_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, true, $11, 'pending', $12)
      RETURNING *`,
      [
        user.id,
        String(business_name).trim(),
        business_type || 'Restaurant',
        String(owner_name).trim(),
        trimmedEmail,
        phone ? String(phone).trim() : null,
        address ? String(address).trim() : null,
        description ? String(description).trim() : '',
        finalLogoUrl,
        finalCoverUrl,
        plan.id,
        portalCode,
      ]
    );
    const business = bizRes.rows[0];

    // Link user to business
    await db.query('UPDATE users SET business_id = $1 WHERE id = $2', [business.id, user.id]);
    user.business_id = business.id;

    // Generate unique transaction reference for subscription payment
    const txRef = `speedy-sub-${Date.now()}-${business.id}-${Math.floor(Math.random() * 1000)}`;

    // Record pending subscription payment
    await db.query(
      `INSERT INTO subscription_payments (
        business_id, plan_id, amount, payment_method, payment_reference, status
      ) VALUES ($1, $2, $3, 'chapa', $4, 'pending')`,
      [business.id, plan.id, plan.price, txRef]
    );

    // Initialize Chapa payment checkout - redirect back to dedicated registration page for verification
    const chapaKey = process.env.CHAPA_SECRET_KEY;
    const clientOrigin = req.get('origin') || req.get('referer') || 'http://localhost:5173';
    const returnUrl = `${clientOrigin.replace(/\/$/, '')}/register-business?verify_subscription=${txRef}&business_id=${business.id}`;
    const [firstName, ...restName] = user.name.split(' ');
    const lastName = restName.join(' ') || 'Owner';

    const chapaResponse = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chapaKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Number(plan.price).toFixed(2),
        currency: 'ETB',
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        phone_number: user.phone || '0900000000',
        tx_ref: txRef,
        return_url: returnUrl,
        "customization[title]": `SpeedyDelivery - ${plan.name} Plan`,
        "customization[description]": `Monthly subscription for ${business.name}`
      })
    });

    const chapaData = await chapaResponse.json();
    const token = signToken(user);

    if (chapaData.status === 'success' && chapaData.data?.checkout_url) {
      return res.status(201).json({
        token,
        user: publicUser(user),
        business,
        plan,
        checkout_url: chapaData.data.checkout_url,
        tx_ref: txRef
      });
    } else {
      console.warn('Chapa checkout init response:', chapaData);
      return res.status(201).json({
        token,
        user: publicUser(user),
        business,
        plan,
        tx_ref: txRef,
        error: chapaData.message || 'Payment gateway returned non-success. You can retry payment from your dashboard.'
      });
    }
  } catch (err) {
    console.error('registerBusiness error:', err);
    res.status(500).json({ error: 'Server error during business registration: ' + err.message });
  }
};

/**
 * Verify Business Subscription Payment (Server-Side with Chapa)
 */
const verifySubscriptionPayment = async (req, res) => {
  try {
    const { tx_ref } = req.params;
    if (!tx_ref) {
      return res.status(400).json({ error: 'Transaction reference is required.' });
    }

    const paymentRes = await db.query(
      'SELECT * FROM subscription_payments WHERE payment_reference = $1',
      [tx_ref]
    );

    if (paymentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription payment record not found.' });
    }

    const payment = paymentRes.rows[0];
    const bizRes = await db.query('SELECT * FROM businesses WHERE id = $1', [payment.business_id]);
    const business = bizRes.rows[0];

    if (payment.status === 'paid') {
      return res.json({
        success: true,
        message: 'Subscription payment already verified.',
        business
      });
    }

    const chapaKey = process.env.CHAPA_SECRET_KEY;
    if (!chapaKey) {
      return res.status(500).json({ error: 'Payment gateway configuration missing on server.' });
    }

    const chapaVerifyRes = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${chapaKey}`
      }
    });

    const verifyData = await chapaVerifyRes.json();

    if (verifyData.status === 'success' && verifyData.data?.status === 'success') {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

      await db.query(
        `UPDATE subscription_payments
         SET status = 'paid', paid_at = NOW(), period_start = NOW(), period_end = $1
         WHERE id = $2`,
        [expiresAt, payment.id]
      );

      const updatedBiz = await db.query(
        `UPDATE businesses
         SET subscription_status = 'paid_pending_approval',
             subscription_plan_id = $1,
             subscription_start_date = NOW(),
             subscription_expires_at = $2,
             is_approved = false
         WHERE id = $3
         RETURNING *`,
        [payment.plan_id, expiresAt, payment.business_id]
      );

      const verifiedBiz = updatedBiz.rows[0];

      // Dispatch automated Welcome Email with unique Owner Portal Link
      sendOwnerWelcomeEmail({
        toEmail: verifiedBiz.email,
        ownerName: verifiedBiz.owner_name,
        businessName: verifiedBiz.name,
        portalCode: verifiedBiz.portal_code,
        planName: (await db.query('SELECT name FROM subscription_plans WHERE id = $1', [payment.plan_id])).rows[0]?.name || 'Professional'
      }).catch(err => console.error('Background welcome email error:', err));

      return res.json({
        success: true,
        message: 'Subscription payment verified! Your application has been directed to the Platform Administrator for final approval. Your dedicated Owner Portal link has been sent to your email.',
        business: verifiedBiz,
        pending_approval: true
      });
    } else {
      await db.query("UPDATE subscription_payments SET status = 'failed' WHERE id = $1", [payment.id]);
      return res.status(400).json({
        success: false,
        error: verifyData.message || 'Payment verification failed. Subscription remains inactive.'
      });
    }
  } catch (err) {
    console.error('verifySubscriptionPayment error:', err);
    res.status(500).json({ error: 'Server error verifying subscription payment' });
  }
};

/**
 * Renew Business Subscription
 */
const renewSubscription = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { plan_id } = req.body;

    // Find owner's business
    let bizRes = await db.query('SELECT * FROM businesses WHERE owner_id = $1', [ownerId]);
    if (bizRes.rows.length === 0 && req.user.business_id) {
      bizRes = await db.query('SELECT * FROM businesses WHERE id = $1', [req.user.business_id]);
    }
    if (bizRes.rows.length === 0) {
      return res.status(404).json({ error: 'No business found for this owner account.' });
    }
    const business = bizRes.rows[0];

    const targetPlanId = plan_id || business.subscription_plan_id;
    const planRes = await db.query('SELECT * FROM subscription_plans WHERE id = $1', [targetPlanId]);
    if (planRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid subscription plan.' });
    }
    const plan = planRes.rows[0];

    const txRef = `speedy-renew-${Date.now()}-${business.id}-${Math.floor(Math.random() * 1000)}`;

    await db.query(
      `INSERT INTO subscription_payments (
        business_id, plan_id, amount, payment_method, payment_reference, status
      ) VALUES ($1, $2, $3, 'chapa', $4, 'pending')`,
      [business.id, plan.id, plan.price, txRef]
    );

    const clientOrigin = req.get('origin') || req.get('referer') || 'http://localhost:5174';
    const returnUrl = `${clientOrigin.replace(/\/$/, '')}/?verify_subscription=${txRef}&business_id=${business.id}`;
    const [firstName, ...restName] = req.user.name.split(' ');
    const lastName = restName.join(' ') || 'Owner';

    const chapaResponse = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Number(plan.price).toFixed(2),
        currency: 'ETB',
        email: req.user.email,
        first_name: firstName,
        last_name: lastName,
        phone_number: business.phone || '0900000000',
        tx_ref: txRef,
        return_url: returnUrl,
        "customization[title]": `SpeedyDelivery - Renewal (${plan.name})`,
        "customization[description]": `Subscription renewal for ${business.name}`
      })
    });

    const chapaData = await chapaResponse.json();
    if (chapaData.status === 'success' && chapaData.data?.checkout_url) {
      return res.json({
        checkout_url: chapaData.data.checkout_url,
        tx_ref: txRef
      });
    } else {
      return res.status(400).json({
        error: chapaData.message || 'Failed to initialize renewal payment checkout.'
      });
    }
  } catch (err) {
    console.error('renewSubscription error:', err);
    res.status(500).json({ error: 'Server error processing renewal' });
  }
};

/**
 * Get current owner's business profile, plan, and payment history
 */
const getMyBusiness = async (req, res) => {
  try {
    const ownerId = req.user.id;
    let bizRes = await db.query(`
      SELECT 
        b.*,
        sp.name AS plan_name,
        sp.price AS plan_price,
        sp.max_menu_items AS plan_max_menu_items,
        sp.features AS plan_features
      FROM businesses b
      LEFT JOIN subscription_plans sp ON b.subscription_plan_id = sp.id
      WHERE b.owner_id = $1 OR b.id = $2
      LIMIT 1
    `, [ownerId, req.user.business_id || 0]);

    if (bizRes.rows.length === 0) {
      return res.status(404).json({ error: 'No business linked to your account.' });
    }

    const business = bizRes.rows[0];

    // Payments history
    const paymentsRes = await db.query(
      `SELECT sp.*, p.name AS plan_name
       FROM subscription_payments sp
       LEFT JOIN subscription_plans p ON sp.plan_id = p.id
       WHERE sp.business_id = $1
       ORDER BY sp.created_at DESC`,
      [business.id]
    );

    // Menu count
    const menuCountRes = await db.query(
      'SELECT COUNT(*) FROM menu_items WHERE business_id = $1',
      [business.id]
    );

    res.json({
      ...business,
      menu_items_count: parseInt(menuCountRes.rows[0]?.count || 0),
      payment_history: paymentsRes.rows
    });
  } catch (err) {
    console.error('getMyBusiness error:', err);
    res.status(500).json({ error: 'Server error loading business profile' });
  }
};

/**
 * Update current owner's business info
 */
const updateMyBusiness = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { name, business_type, phone, address, description, logo_url, cover_url } = req.body;

    let bizRes = await db.query('SELECT id FROM businesses WHERE owner_id = $1 OR id = $2', [ownerId, req.user.business_id || 0]);
    if (bizRes.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const bizId = bizRes.rows[0].id;

    const result = await db.query(
      `UPDATE businesses
       SET name = COALESCE($1, name),
           business_type = COALESCE($2, business_type),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           description = COALESCE($5, description),
           logo_url = COALESCE($6, logo_url),
           cover_url = COALESCE($7, cover_url)
       WHERE id = $8
       RETURNING *`,
      [name, business_type, phone, address, description, logo_url, cover_url, bizId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('updateMyBusiness error:', err);
    res.status(500).json({ error: 'Server error updating business' });
  }
};

module.exports = {
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
};

