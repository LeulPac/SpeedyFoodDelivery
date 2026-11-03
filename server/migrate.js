const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');

async function runMigration() {
  console.log('--- Starting SpeedyDelivery Database Migration ---');

  try {
    // 1. Expand role check on users table to allow 'admin'
    const roleConstraints = await db.query(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'users'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%role%'
    `);
    for (const r of roleConstraints.rows) {
      await db.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS "${r.conname}"`);
    }
    await db.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'owner', 'driver', 'admin'))
    `);
    console.log('✓ Users role constraint updated (supports customer, owner, driver, admin).');

    // 2. Subscription plans table
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        price DECIMAL(10, 2) NOT NULL,
        billing_period VARCHAR(20) DEFAULT 'monthly',
        description TEXT,
        max_menu_items INTEGER DEFAULT 25,
        features JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ subscription_plans table ready.');

    // Seed default subscription plans
    await db.query(`
      INSERT INTO subscription_plans (name, price, billing_period, description, max_menu_items, features, is_active)
      VALUES 
      ('Basic', 499.00, 'monthly', 'Essential starter pack for small cafes and snack bars', 15, '["Up to 15 menu items", "Standard platform listing", "Order management dashboard", "Self-managed delivery drivers"]'::jsonb, true),
      ('Professional', 1199.00, 'monthly', 'Most popular for growing restaurants and busy kitchens', 40, '["Up to 40 menu items", "Priority customer discovery & badge", "Real-time dispatch & live tracking", "Comprehensive sales analytics", "Dedicated staff driver support"]'::jsonb, true),
      ('Premium', 2499.00, 'monthly', 'Complete suite for premium dining, hotel kitchens & chains', 100, '["Unlimited menu items", "Top featured home placement", "Advanced reporting & driver performance", "Priority customer & technical support", "Multiple driver assignments"]'::jsonb, true)
      ON CONFLICT (name) DO UPDATE SET
        price = EXCLUDED.price,
        description = EXCLUDED.description,
        features = EXCLUDED.features;
    `);
    console.log('✓ Default subscription plans seeded.');

    // 3. Businesses table
    await db.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(150) NOT NULL,
        business_type VARCHAR(50) DEFAULT 'Restaurant',
        owner_name VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(50),
        address VARCHAR(255),
        description TEXT,
        logo_url TEXT,
        cover_url TEXT,
        is_approved BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        subscription_plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE SET NULL,
        subscription_status VARCHAR(30) DEFAULT 'pending',
        subscription_start_date TIMESTAMP WITH TIME ZONE,
        subscription_expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ businesses table ready.');

    // 4. Add business_id references to users, menu_items, orders
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL;
      ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL;
    `);
    console.log('✓ Foreign keys added to users, menu_items, and orders.');

    // 5. Subscription Payments table
    await db.query(`
      CREATE TABLE IF NOT EXISTS subscription_payments (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        plan_id INTEGER REFERENCES subscription_plans(id) ON DELETE RESTRICT,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(30) DEFAULT 'chapa',
        payment_reference VARCHAR(255) UNIQUE,
        status VARCHAR(30) DEFAULT 'pending',
        paid_at TIMESTAMP WITH TIME ZONE,
        period_start TIMESTAMP WITH TIME ZONE,
        period_end TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ subscription_payments table ready.');

    // 6. Driver Delivery Fees table
    await db.query(`
      CREATE TABLE IF NOT EXISTS driver_delivery_fees (
        id SERIAL PRIMARY KEY,
        driver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
        business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
        fee_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'unpaid',
        payment_reference VARCHAR(255),
        paid_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ driver_delivery_fees table ready.');

    // 7. Platform Settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id SERIAL PRIMARY KEY,
        driver_fee_per_delivery DECIMAL(10, 2) NOT NULL DEFAULT 25.00,
        grace_period_days INTEGER DEFAULT 7,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const settingsCount = await db.query('SELECT COUNT(*) FROM platform_settings');
    if (parseInt(settingsCount.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO platform_settings (driver_fee_per_delivery, grace_period_days)
        VALUES (25.00, 7)
      `);
      console.log('✓ Default platform settings initialized.');
    }

    // 8. Ensure an existing default business for existing owner & menu items
    const ownerRes = await db.query("SELECT id, name, email, phone FROM users WHERE role = 'owner' ORDER BY id ASC LIMIT 1");
    let defaultBusinessId = null;

    if (ownerRes.rows.length > 0) {
      const owner = ownerRes.rows[0];
      const proPlan = await db.query("SELECT id FROM subscription_plans WHERE name = 'Professional' LIMIT 1");
      const planId = proPlan.rows[0]?.id || 1;

      const existingBiz = await db.query('SELECT id FROM businesses WHERE owner_id = $1 LIMIT 1', [owner.id]);
      if (existingBiz.rows.length === 0) {
        const createdBiz = await db.query(`
          INSERT INTO businesses (
            owner_id, name, business_type, owner_name, email, phone, address, description,
            logo_url, cover_url, is_approved, is_active, subscription_plan_id, subscription_status,
            subscription_start_date, subscription_expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, true, $11, 'active', NOW(), NOW() + INTERVAL '30 days')
          RETURNING id;
        `, [
          owner.id,
          'Speedy Kitchen & Grill',
          'Restaurant',
          owner.name,
          owner.email,
          owner.phone || '0911002233',
          'Bole Medhanialem, Addis Ababa',
          'Delicious fire-grilled meats, artisanal pizzas, and chef specialties delivered hot and fast.',
          'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop',
          'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=400&fit=crop',
          planId
        ]);
        defaultBusinessId = createdBiz.rows[0].id;
        console.log(`✓ Seeded default business (ID: ${defaultBusinessId}) for owner ${owner.email}`);
      } else {
        defaultBusinessId = existingBiz.rows[0].id;
      }

      // Link owner and driver to this business
      await db.query('UPDATE users SET business_id = $1 WHERE id = $2 AND business_id IS NULL', [defaultBusinessId, owner.id]);
      await db.query("UPDATE users SET business_id = $1 WHERE role = 'driver' AND business_id IS NULL", [defaultBusinessId]);
    }

    // Also seed a couple more rich demo businesses so business discovery is lively and complete!
    const sampleBusinesses = [
      {
        name: 'Habesha Roast & Cafe',
        type: 'Cafe',
        ownerName: 'Sara Tadesse',
        email: 'habesha.cafe@test.com',
        phone: '0922334455',
        address: 'Kazanchis, Addis Ababa',
        description: 'Authentic Ethiopian espresso, freshly baked breakfast pastries, and hearty brunch platters.',
        logo: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&h=200&fit=crop',
        cover: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&h=400&fit=crop'
      },
      {
        name: 'Bella Italia Pizzeria',
        type: 'Restaurant',
        ownerName: 'Marco Rossi',
        email: 'bella.italia@test.com',
        phone: '0933445566',
        address: 'Old Airport, Addis Ababa',
        description: 'Authentic wood-fired Neapolitan pizzas, handcrafted pasta, and creamy tiramisu.',
        logo: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=200&h=200&fit=crop',
        cover: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&h=400&fit=crop'
      },
      {
        name: 'Grand Palace Gourmet Hotel',
        type: 'Hotel',
        ownerName: 'Dawit Bekele',
        email: 'palace.hotel@test.com',
        phone: '0944556677',
        address: 'Meskel Square, Addis Ababa',
        description: 'Five-star hotel dining experience featuring continental buffets, aged steaks, and wine pairings.',
        logo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=200&fit=crop',
        cover: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&h=400&fit=crop'
      }
    ];

    const planRes = await db.query("SELECT id FROM subscription_plans WHERE name = 'Professional' LIMIT 1");
    const samplePlanId = planRes.rows[0]?.id || 1;

    for (const b of sampleBusinesses) {
      const check = await db.query('SELECT id FROM businesses WHERE email = $1', [b.email]);
      if (check.rows.length === 0) {
        const created = await db.query(`
          INSERT INTO businesses (
            name, business_type, owner_name, email, phone, address, description,
            logo_url, cover_url, is_approved, is_active, subscription_plan_id, subscription_status,
            subscription_start_date, subscription_expires_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true, $10, 'active', NOW(), NOW() + INTERVAL '30 days')
          RETURNING id;
        `, [b.name, b.type, b.ownerName, b.email, b.phone, b.address, b.description, b.logo, b.cover, samplePlanId]);
        
        const bizId = created.rows[0].id;
        console.log(`✓ Seeded business: ${b.name} (ID: ${bizId})`);

        // Add 2-3 sample menu items for each demo business so their menus are rich!
        if (b.type === 'Cafe') {
          await db.query(`
            INSERT INTO menu_items (name, description, price, category, image_url, image_urls, is_available, business_id)
            VALUES 
            ('Double Macchiato & Croissant', 'Rich Ethiopian espresso layered with steamed milk and a golden butter croissant.', 180.00, 'Drinks', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=400&fit=crop', ARRAY['https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&h=400&fit=crop'], true, $1),
            ('Avocado Toast & Poached Egg', 'Artisanal sourdough topped with seasoned smashed avocado and organic eggs.', 260.00, 'Breakfast', 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=400&fit=crop', ARRAY['https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=400&fit=crop'], true, $1)
            ON CONFLICT DO NOTHING;
          `, [bizId]);
        } else if (b.type === 'Hotel') {
          await db.query(`
            INSERT INTO menu_items (name, description, price, category, image_url, image_urls, is_available, business_id)
            VALUES 
            ('Prime Ribeye Steak (300g)', 'Char-grilled prime beef steak served with truffle mash, asparagus, and peppercorn jus.', 950.00, 'Main Dish', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop', ARRAY['https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop'], true, $1),
            ('Creamy Lobster Fettuccine', 'Handmade fettuccine tossed in parmesan cream sauce with tender Atlantic lobster tail.', 850.00, 'Main Dish', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&h=400&fit=crop', ARRAY['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&h=400&fit=crop'], true, $1)
            ON CONFLICT DO NOTHING;
          `, [bizId]);
        } else if (b.name === 'Bella Italia Pizzeria') {
          await db.query(`
            INSERT INTO menu_items (name, description, price, category, image_url, image_urls, is_available, business_id)
            VALUES 
            ('Quattro Formaggi Pizza', 'Gorgonzola, mozzarella, fontina, and parmesan over wood-fired crust with fresh basil.', 480.00, 'Main Dish', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop', ARRAY['https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&h=400&fit=crop'], true, $1),
            ('Classic Tiramisu', 'Savoiardi biscuits soaked in espresso and marsala, layered with mascarpone cream.', 220.00, 'Dessert', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&h=400&fit=crop', ARRAY['https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&h=400&fit=crop'], true, $1)
            ON CONFLICT DO NOTHING;
          `, [bizId]);
        }
      }
    }

    // 9. Associate any unassociated menu items and orders with default business
    if (defaultBusinessId) {
      const updatedMenu = await db.query(
        'UPDATE menu_items SET business_id = $1 WHERE business_id IS NULL',
        [defaultBusinessId]
      );
      console.log(`✓ Linked ${updatedMenu.rowCount} existing menu items to default business.`);

      const updatedOrders = await db.query(
        'UPDATE orders SET business_id = $1 WHERE business_id IS NULL',
        [defaultBusinessId]
      );
      console.log(`✓ Linked ${updatedOrders.rowCount} existing orders to default business.`);
    }

    // 10. Also ensure a default Platform Admin user account exists for platform administration
    const bcrypt = require('bcrypt');
    const adminCheck = await db.query("SELECT id FROM users WHERE email = 'admin@speedydelivery.com' OR role = 'admin' LIMIT 1");
    if (adminCheck.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('admin123', salt);
      await db.query(`
        INSERT INTO users (name, email, password_hash, role, phone)
        VALUES ('Platform Administrator', 'admin@speedydelivery.com', $1, 'admin', '0911009988')
      `, [hash]);
      console.log('✓ Seeded platform admin account: admin@speedydelivery.com / admin123');
    }

    console.log('--- Migration completed successfully! ---');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

