const db = require('../db');
const socketManager = require('../socket');

let schemaEnsured = false; // reset on each server start
const ensureOrderColumns = async () => {
  if (schemaEnsured) return;
  try {
    // Drop any CHECK constraint on orders.payment_status so 'failed' is allowed
    const constraintRes = await db.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'orders'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%payment_status%'
    `);
    for (const row of constraintRes.rows) {
      await db.query(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS "${row.conname}"`);
    }

    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50),
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash',
      ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255),
      ADD COLUMN IF NOT EXISTS customer_confirmed_delivered BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS driver_confirmed_delivered BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS customer_latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS customer_longitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS customer_location_updated_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS driver_latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS driver_longitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS driver_location_updated_at TIMESTAMP WITH TIME ZONE;
    `);
    schemaEnsured = true;
  } catch (err) {
    console.error('ensureOrderColumns error:', err.message);
  }
};

// Customer creates an order
const createOrder = async (req, res) => {
  try {
    await ensureOrderColumns();
    const { items, total_amount, customer_latitude, customer_longitude, customer_phone, payment_method } = req.body;
    const customer_id = req.user.id;
    const lat = typeof customer_latitude === 'number' ? customer_latitude : null;
    const lng = typeof customer_longitude === 'number' ? customer_longitude : null;
    const phone = customer_phone ? String(customer_phone).trim() : null;
    const method = 'chapa';
    const initialPaymentStatus = 'pending';

    let txRef = `speedy-${Date.now()}-${customer_id}-${Math.floor(Math.random() * 1000)}`;

    let businessId = req.body.business_id ? parseInt(req.body.business_id) : null;
    if (!businessId && Array.isArray(items) && items.length > 0 && items[0].menu_item_id) {
      const bizRes = await db.query('SELECT business_id FROM menu_items WHERE id = $1', [items[0].menu_item_id]);
      if (bizRes.rows.length > 0 && bizRes.rows[0].business_id) {
        businessId = bizRes.rows[0].business_id;
      }
    }

    // 1. Create order
    const orderResult = await db.query(
      `INSERT INTO orders (
        customer_id, total_amount, status, payment_status, payment_method, payment_reference, customer_phone, customer_latitude, customer_longitude, customer_location_updated_at, business_id
      ) VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7::double precision, $8::double precision, CASE WHEN $7::double precision IS NOT NULL AND $8::double precision IS NOT NULL THEN NOW() ELSE NULL END, $9) RETURNING *`,
      [customer_id, total_amount, initialPaymentStatus, method, txRef, phone, lat, lng, businessId]
    );
    const order = orderResult.rows[0];

    // 2. Insert order items
    if (Array.isArray(items)) {
      for (const item of items) {
        await db.query(
          'INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_time) VALUES ($1, $2, $3, $4)',
          [order.id, item.menu_item_id, item.quantity, item.price_at_time]
        );
      }
    }

    // Initialize transaction with Chapa API
    const chapaKey = process.env.CHAPA_SECRET_KEY;
    try {
      const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [customer_id]);
      const userObj = userRes.rows[0] || {};
      const [firstName, ...restName] = (userObj.name || 'Customer').split(' ');
      const lastName = restName.join(' ') || 'Customer';

      const clientOrigin = req.get('origin') || req.get('referer') || 'http://localhost:5173';
      const returnUrl = `${clientOrigin.replace(/\/$/, '')}/?verify_payment=${txRef}&order_id=${order.id}`;

      const backendBase = process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`;
      const chapaResponse = await fetch('https://api.chapa.co/v1/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${chapaKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Number(total_amount).toFixed(2),
          currency: 'ETB',
          email: userObj.email || req.user.email,
          first_name: firstName,
          last_name: lastName,
          phone_number: phone || '0900000000',
          tx_ref: txRef,
          callback_url: `${backendBase}/api/orders/chapa-webhook`,
          return_url: returnUrl,
          "customization[title]": "SpeedyDelivery Order",
          "customization[description]": `Payment for Order #${order.id}`
        })
      });

      const chapaData = await chapaResponse.json();
      if (chapaData.status === 'success' && chapaData.data?.checkout_url) {
        return res.status(201).json({
          ...order,
          checkout_url: chapaData.data.checkout_url,
          tx_ref: txRef
        });
      } else {
        console.error('Chapa initialization response:', chapaData);
        return res.status(400).json({
          error: chapaData.message || 'Failed to initialize Chapa payment checkout.',
          order_id: order.id
        });
      }
    } catch (chapaErr) {
      console.error('Chapa API connection failed:', chapaErr.message);
      return res.status(502).json({
        error: 'Could not connect to Chapa payment gateway. Please try again.',
        order_id: order.id
      });
    }
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ error: 'Server error creating order' });
  }
};

// Verify Chapa payment server-side
const verifyChapaPayment = async (req, res) => {
  try {
    await ensureOrderColumns();
    const { tx_ref } = req.params;
    if (!tx_ref) {
      return res.status(400).json({ error: 'Transaction reference (tx_ref) is required' });
    }

    const orderRes = await db.query('SELECT * FROM orders WHERE payment_reference = $1', [tx_ref]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found for this transaction reference' });
    }

    const order = orderRes.rows[0];
    if (order.payment_status === 'paid') {
      return res.json({ success: true, message: 'Payment already verified', order });
    }

    const chapaKey = process.env.CHAPA_SECRET_KEY;
    if (!chapaKey) {
      return res.status(500).json({ error: 'Payment gateway secret key is missing on the server.' });
    }

    const chapaVerifyRes = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${chapaKey}`
      }
    });

    const verifyData = await chapaVerifyRes.json();
    if (verifyData.status === 'success' && verifyData.data?.status === 'success') {
      const updatedRes = await db.query(
        "UPDATE orders SET payment_status = 'paid' WHERE id = $1 RETURNING *",
        [order.id]
      );
      const updatedOrder = updatedRes.rows[0];

      try {
        socketManager.getIo().emit('new_order', { order_id: updatedOrder.id, status: updatedOrder.status });
        socketManager.getIo().emit('order_status_update', {
          order_id: updatedOrder.id,
          status: updatedOrder.status,
          payment_status: 'paid'
        });
      } catch (_) {}

      return res.json({ success: true, message: 'Payment verified successfully', order: updatedOrder });
    } else {
      await db.query("UPDATE orders SET payment_status = 'failed' WHERE id = $1", [order.id]);
      return res.status(400).json({
        success: false,
        error: verifyData.message || 'Payment verification failed with Chapa. Order was not paid.'
      });
    }
  } catch (err) {
    console.error('verifyChapaPayment error:', err.message);
    res.status(500).json({ error: 'Server error verifying payment' });
  }
};

// Owner views all active orders for their business, Driver views ready orders, Customer views their own
const getOrders = async (req, res) => {
    try {
        await ensureOrderColumns();
        const role = req.user.role;
        let query = `
          SELECT
            o.*,
            u_cust.name AS customer_name,
            u_cust.email AS customer_email,
            COALESCE(o.customer_phone, u_cust.phone) AS customer_phone,
            u_driver.name AS driver_name,
            u_driver.email AS driver_email,
            u_driver.phone AS driver_phone,
            b.name AS business_name,
            b.business_type,
            b.logo_url AS business_logo,
            b.address AS business_address,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', oi.id,
                  'menu_item_id', oi.menu_item_id,
                  'name', mi.name,
                  'quantity', oi.quantity,
                  'price_at_time', oi.price_at_time
                )
              ) FILTER (WHERE oi.id IS NOT NULL), '[]'
            ) AS items
          FROM orders o
          LEFT JOIN users u_cust ON o.customer_id = u_cust.id
          LEFT JOIN users u_driver ON o.driver_id = u_driver.id
          LEFT JOIN businesses b ON o.business_id = b.id
          LEFT JOIN order_items oi ON oi.order_id = o.id
          LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
        `;
        let params = [];

        if (role === 'customer') {
            query += ' WHERE o.customer_id = $1 GROUP BY o.id, u_cust.name, u_cust.email, u_cust.phone, u_driver.name, u_driver.email, u_driver.phone, b.name, b.business_type, b.logo_url, b.address ORDER BY o.created_at DESC';
            params = [req.user.id];
        } else if (role === 'owner') {
            if (req.user.business_id) {
              query += " WHERE o.status != 'delivered' AND o.payment_status = 'paid' AND (o.business_id = $1 OR o.business_id IS NULL) GROUP BY o.id, u_cust.name, u_cust.email, u_cust.phone, u_driver.name, u_driver.email, u_driver.phone, b.name, b.business_type, b.logo_url, b.address ORDER BY o.created_at DESC";
              params = [req.user.business_id];
            } else {
              query += " WHERE o.status != 'delivered' AND o.payment_status = 'paid' GROUP BY o.id, u_cust.name, u_cust.email, u_cust.phone, u_driver.name, u_driver.email, u_driver.phone, b.name, b.business_type, b.logo_url, b.address ORDER BY o.created_at DESC";
            }
        } else if (role === 'admin') {
            query += " WHERE o.status != 'delivered' AND o.payment_status = 'paid' GROUP BY o.id, u_cust.name, u_cust.email, u_cust.phone, u_driver.name, u_driver.email, u_driver.phone, b.name, b.business_type, b.logo_url, b.address ORDER BY o.created_at DESC";
        } else if (role === 'driver') {
            query += " WHERE (o.status = 'ready_for_pickup' OR o.driver_id = $1) AND o.payment_status = 'paid' GROUP BY o.id, u_cust.name, u_cust.email, u_cust.phone, u_driver.name, u_driver.email, u_driver.phone, b.name, b.business_type, b.logo_url, b.address ORDER BY o.created_at DESC";
            params = [req.user.id];
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching orders' });
    }
};

const getDriverStatuses = async (req, res) => {
  try {
    await ensureOrderColumns();
    const bizId = req.user?.business_id;
    let query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.phone,
        o.id AS active_order_id,
        o.status AS active_order_status
      FROM users u
      LEFT JOIN orders o
        ON o.driver_id = u.id
        AND o.status IN ('ready_for_pickup', 'delivering')
      WHERE u.role = 'driver'
    `;
    const params = [];
    if (bizId && req.user?.role !== 'admin') {
      params.push(bizId);
      query += ` AND (u.business_id = $1 OR u.business_id IS NULL)`;
    }
    query += ` ORDER BY u.name ASC;`;

    const result = await db.query(query, params);

    const drivers = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || null,
      is_available: !row.active_order_id,
      active_order_id: row.active_order_id,
      active_order_status: row.active_order_status
    }));
    res.json(drivers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching drivers' });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
    try {
        await ensureOrderColumns();
        const { id } = req.params;
        const { status, driver_id, customer_confirmed_delivered, driver_confirmed_delivered } = req.body;
        const role = req.user.role;
        const existingRes = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
        if (existingRes.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
        const existing = existingRes.rows[0];

        let nextStatus = existing.status;
        let nextDriverId = existing.driver_id;
        let nextCustomerConfirmed = existing.customer_confirmed_delivered;
        let nextDriverConfirmed = existing.driver_confirmed_delivered;

        if (status) {
          if (role === 'owner' && ['preparing', 'ready_for_pickup'].includes(status)) {
            nextStatus = status;
          } else if (role === 'owner' && status === 'delivering') {
            if (!driver_id) return res.status(400).json({ error: 'driver_id is required' });
            const driverRes = await db.query("SELECT id FROM users WHERE id = $1 AND role = 'driver'", [driver_id]);
            if (driverRes.rows.length === 0) return res.status(400).json({ error: 'Invalid driver_id' });
            const busyRes = await db.query(
              "SELECT id FROM orders WHERE driver_id = $1 AND status IN ('ready_for_pickup', 'delivering') AND id != $2 LIMIT 1",
              [driver_id, id]
            );
            if (busyRes.rows.length > 0) {
              return res.status(400).json({ error: 'Selected driver is already busy' });
            }
            nextStatus = 'delivering';
            nextDriverId = driver_id;
            nextDriverConfirmed = false;
            nextCustomerConfirmed = false;
          } else if (role === 'driver' && status === 'delivering') {
            nextStatus = status;
            nextDriverId = driver_id || req.user.id;
            nextDriverConfirmed = false;
            nextCustomerConfirmed = false;
          } else if (role === 'driver' && status === 'delivered') {
            nextDriverConfirmed = true;
          } else if (role === 'customer' && status === 'delivered') {
            if (existing.customer_id !== req.user.id) {
              return res.status(403).json({ error: 'Cannot update another customer order' });
            }
            nextCustomerConfirmed = true;
          } else {
            return res.status(403).json({ error: 'Status transition not allowed for this role' });
          }
        }

        if (role === 'driver' && typeof driver_confirmed_delivered === 'boolean') {
          nextDriverConfirmed = driver_confirmed_delivered;
        }
        if (role === 'customer' && typeof customer_confirmed_delivered === 'boolean') {
          if (existing.customer_id !== req.user.id) {
            return res.status(403).json({ error: 'Cannot update another customer order' });
          }
          nextCustomerConfirmed = customer_confirmed_delivered;
        }

        if (nextStatus === 'delivering') {
          nextStatus = (nextCustomerConfirmed && nextDriverConfirmed) ? 'delivered' : 'delivering';
        }
        if (nextStatus === 'delivered' && (!nextCustomerConfirmed || !nextDriverConfirmed)) {
          nextStatus = 'delivering';
        }

        const result = await db.query(
          'UPDATE orders SET status = $1, driver_id = $2, customer_confirmed_delivered = $3, driver_confirmed_delivered = $4 WHERE id = $5 RETURNING *',
          [nextStatus, nextDriverId, nextCustomerConfirmed, nextDriverConfirmed, id]
        );
        const updatedOrder = result.rows[0];

        // When order is confirmed as delivered, record the fixed driver platform fee
        if (updatedOrder.status === 'delivered' && updatedOrder.driver_id) {
          try {
            const settingsRes = await db.query('SELECT driver_fee_per_delivery FROM platform_settings LIMIT 1');
            const feeAmount = parseFloat(settingsRes.rows[0]?.driver_fee_per_delivery || 25.00);

            await db.query(
              `INSERT INTO driver_delivery_fees (driver_id, order_id, business_id, fee_amount, status)
               VALUES ($1, $2, $3, $4, 'unpaid')
               ON CONFLICT (order_id) DO NOTHING`,
              [updatedOrder.driver_id, updatedOrder.id, updatedOrder.business_id, feeAmount]
            );
          } catch (feeErr) {
            console.error('Failed to record driver delivery fee on delivery completion:', feeErr.message);
          }
        }

        try {
          socketManager.getIo().emit('order_status_update', {
            order_id: updatedOrder.id,
            status: updatedOrder.status,
            driver_id: updatedOrder.driver_id,
            payment_status: updatedOrder.payment_status
          });
        } catch (_) {}

        res.json(updatedOrder);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error updating order' });
    }
};

const updateCustomerLocation = async (req, res) => {
  try {
    await ensureOrderColumns();
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    const result = await db.query(
      `UPDATE orders
       SET customer_latitude = $1::double precision,
           customer_longitude = $2::double precision,
           customer_location_updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [latitude, longitude, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updated = result.rows[0];
    try {
      socketManager.getIo().emit('order_location_update', {
        order_id: updated.id,
        customer_latitude: updated.customer_latitude,
        customer_longitude: updated.customer_longitude,
      });
    } catch (_) {}

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating location' });
  }
};

const updateDriverLocation = async (req, res) => {
  try {
    await ensureOrderColumns();
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    const result = await db.query(
      `UPDATE orders
       SET driver_latitude = $1::double precision,
           driver_longitude = $2::double precision,
           driver_location_updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [latitude, longitude, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updated = result.rows[0];
    try {
      socketManager.getIo().emit('order_location_update', {
        order_id: updated.id,
        driver_latitude: updated.driver_latitude,
        driver_longitude: updated.driver_longitude,
      });
    } catch (_) {}

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating location' });
  }
};

// Switch an unpaid Chapa order to Cash on Delivery
const switchToCash = async (req, res) => {
  try {
    await ensureOrderColumns();
    const orderIdParam = req.params.id;
    const customerId = Number(req.user.id);
    const targetId = Number(orderIdParam) || 0;

    console.log(`[switchToCash] orderId=${targetId} customerId=${customerId}`);

    // Find this specific order, or the latest unpaid chapa order for this customer
    let orderRes;
    if (targetId > 0) {
      orderRes = await db.query(
        `SELECT * FROM orders WHERE id = $1 AND customer_id = $2 AND payment_method = 'chapa' AND payment_status != 'paid' LIMIT 1`,
        [targetId, customerId]
      );
    } else {
      orderRes = await db.query(
        `SELECT * FROM orders WHERE customer_id = $1 AND payment_method = 'chapa' AND payment_status != 'paid' ORDER BY id DESC LIMIT 1`,
        [customerId]
      );
    }

    console.log(`[switchToCash] found ${orderRes.rows.length} order(s)`);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Unpaid Chapa order not found.' });
    }

    const order = orderRes.rows[0];

    const updatedRes = await db.query(
      "UPDATE orders SET payment_method = 'cash', payment_status = 'pending', status = 'pending' WHERE id = $1 RETURNING *",
      [order.id]
    );
    const updatedOrder = updatedRes.rows[0];

    try {
      socketManager.getIo().emit('new_order', { order_id: updatedOrder.id, status: updatedOrder.status });
    } catch (_) {}

    console.log(`[switchToCash] switched order ${order.id} to cash`);
    return res.json({ success: true, message: 'Order switched to Cash on Delivery', order: updatedOrder });
  } catch (err) {
    console.error('[switchToCash] error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to switch order to Cash on Delivery' });
  }
};

// Cancel an unpaid Chapa order
const cancelUnpaidOrder = async (req, res) => {
  try {
    await ensureOrderColumns();
    const orderIdParam = req.params.id;
    const userId = Number(req.user.id);
    const userRole = req.user.role;
    const targetId = Number(orderIdParam) || 0;

    console.log(`[cancelUnpaidOrder] orderId=${targetId} userId=${userId} role=${userRole}`);

    let orderRes;
    if (userRole === 'owner') {
      orderRes = targetId > 0
        ? await db.query("SELECT * FROM orders WHERE id = $1 AND payment_status != 'paid' LIMIT 1", [targetId])
        : await db.query("SELECT * FROM orders WHERE payment_status != 'paid' ORDER BY id DESC LIMIT 1");
    } else {
      orderRes = targetId > 0
        ? await db.query("SELECT * FROM orders WHERE id = $1 AND customer_id = $2 AND payment_status != 'paid' LIMIT 1", [targetId, userId])
        : await db.query("SELECT * FROM orders WHERE customer_id = $1 AND payment_status != 'paid' ORDER BY id DESC LIMIT 1", [userId]);
    }

    console.log(`[cancelUnpaidOrder] found ${orderRes.rows.length} order(s)`);

    if (orderRes.rows.length === 0) {
      return res.json({ success: true, message: 'Order already cancelled or removed.' });
    }

    const order = orderRes.rows[0];
    const orderId = order.id;

    try { await db.query('DELETE FROM chat_messages WHERE order_id = $1', [orderId]); } catch (_) {}
    try { await db.query('DELETE FROM order_items WHERE order_id = $1', [orderId]); } catch (_) {}
    await db.query('DELETE FROM orders WHERE id = $1', [orderId]);

    console.log(`[cancelUnpaidOrder] cancelled order ${orderId}`);
    res.json({ success: true, message: 'Unpaid order cancelled successfully.', cancelledOrderId: orderId });
  } catch (err) {
    console.error('[cancelUnpaidOrder] error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Failed to cancel unpaid order' });
  }
};

// Retry Chapa payment for an unpaid order
const retryChapaPayment = async (req, res) => {
  try {
    await ensureOrderColumns();
    const orderIdParam = req.params.id;
    const customerId = Number(req.user.id);
    const targetId = Number(orderIdParam) || 0;

    console.log(`[retryChapaPayment] orderId=${targetId} customerId=${customerId}`);

    let orderRes;
    if (targetId > 0) {
      orderRes = await db.query(
        `SELECT * FROM orders WHERE id = $1 AND customer_id = $2 AND payment_status != 'paid' LIMIT 1`,
        [targetId, customerId]
      );
    } else {
      orderRes = await db.query(
        `SELECT * FROM orders WHERE customer_id = $1 AND payment_status != 'paid' ORDER BY id DESC LIMIT 1`,
        [customerId]
      );
    }

    console.log(`[retryChapaPayment] found ${orderRes.rows.length} order(s)`);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Unpaid order not found' });
    }

    const order = orderRes.rows[0];
    const txRef = `speedy-${Date.now()}-${customerId}-${Math.floor(Math.random() * 1000)}`;
    await db.query("UPDATE orders SET payment_reference = $1, payment_status = 'pending' WHERE id = $2", [txRef, order.id]);

    const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [customerId]);
    const userObj = userRes.rows[0] || {};
    const [firstName, ...restName] = (userObj.name || 'Customer').split(' ');
    const lastName = restName.join(' ') || 'Customer';

    const clientOrigin = req.get('origin') || req.get('referer') || 'http://localhost:5173';
    const returnUrl = `${clientOrigin.replace(/\/$/, '')}/?verify_payment=${txRef}&order_id=${order.id}`;

    const backendBase = process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`;
    const chapaKey = process.env.CHAPA_SECRET_KEY;
    const chapaResponse = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chapaKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Number(order.total_amount).toFixed(2),
        currency: 'ETB',
        email: userObj.email || req.user.email,
        first_name: firstName,
        last_name: lastName,
        phone_number: order.customer_phone || '0900000000',
        tx_ref: txRef,
        callback_url: `${backendBase}/api/orders/chapa-webhook`,
        return_url: returnUrl,
        "customization[title]": "SpeedyDelivery Order Retry",
        "customization[description]": `Payment retry for Order #${order.id}`
      })
    });

    const chapaData = await chapaResponse.json();
    if (chapaData.status === 'success' && chapaData.data?.checkout_url) {
      return res.json({ checkout_url: chapaData.data.checkout_url, tx_ref: txRef, order_id: order.id });
    } else {
      return res.status(400).json({ error: chapaData.message || 'Failed to initialize Chapa payment retry.' });
    }
  } catch (err) {
    console.error('retryChapaPayment error:', err.message);
    res.status(500).json({ error: 'Server error retrying Chapa payment' });
  }
};

// Admin removes an order
const deleteOrder = async (req, res) => {
  try {
    await ensureOrderColumns();
    const { id } = req.params;
    
    try { await db.query('DELETE FROM chat_messages WHERE order_id = $1', [id]); } catch (_) {}
    try { await db.query('DELETE FROM order_items WHERE order_id = $1', [id]); } catch (_) {}
    
    const result = await db.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    try {
      socketManager.getIo().emit('order_status_update', {
        order_id: Number(id),
        status: 'deleted',
      });
      socketManager.getIo().emit('new_order', { order_id: Number(id), status: 'deleted' });
    } catch (_) {}

    res.json({ success: true, message: 'Order removed successfully' });
  } catch (err) {
    console.error('deleteOrder error:', err);
    res.status(500).json({ error: err.message || 'Server error removing order' });
  }
};

module.exports = {
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
};
