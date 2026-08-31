/**
 * initDb.js — Creates all tables in Neon using DATABASE_URL.
 * Run once: node initDb.js
 */
require('dotenv').config();
const { Client } = require('pg');

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id     VARCHAR(255) UNIQUE,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'owner', 'driver')),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    description  TEXT,
    price        DECIMAL(10, 2) NOT NULL,
    category     VARCHAR(50) NOT NULL DEFAULT 'Main Dish',
    image_url    VARCHAR(255),
    image_urls   TEXT[] NOT NULL DEFAULT '{}',
    is_available BOOLEAN DEFAULT true
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                           SERIAL PRIMARY KEY,
    customer_id                  INTEGER REFERENCES users(id) ON DELETE CASCADE,
    driver_id                    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    total_amount                 DECIMAL(10, 2) NOT NULL,
    status                       VARCHAR(30) NOT NULL CHECK (status IN ('pending','preparing','ready_for_pickup','delivering','delivered')),
    payment_status               VARCHAR(20) NOT NULL CHECK (payment_status IN ('pending','paid')),
    customer_confirmed_delivered BOOLEAN NOT NULL DEFAULT false,
    driver_confirmed_delivered   BOOLEAN NOT NULL DEFAULT false,
    customer_latitude            DOUBLE PRECISION,
    customer_longitude           DOUBLE PRECISION,
    customer_location_updated_at TIMESTAMP WITH TIME ZONE,
    driver_latitude              DOUBLE PRECISION,
    driver_longitude             DOUBLE PRECISION,
    driver_location_updated_at   TIMESTAMP WITH TIME ZONE,
    created_at                   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id             SERIAL PRIMARY KEY,
    order_id       INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id   INTEGER REFERENCES menu_items(id) ON DELETE RESTRICT,
    quantity       INTEGER NOT NULL CHECK (quantity > 0),
    price_at_time  DECIMAL(10, 2) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    sender_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content    TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_orders_customer   ON orders(customer_id);
  CREATE INDEX IF NOT EXISTS idx_orders_driver     ON orders(driver_id);
  CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_chat_order        ON chat_messages(order_id);
  CREATE INDEX IF NOT EXISTS idx_menu_category     ON menu_items(category);
`;

async function initDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon DB');

    // Split on semicolons and run each statement separately
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await client.query(stmt);
      const match = stmt.match(/(CREATE TABLE|CREATE INDEX)\s+\w+\s+(\w+)/i);
      if (match) console.log(`  ✓ ${stmt.split('\n')[0].trim()}`);
    }

    console.log('\n✅ All tables created successfully!');
    console.log('👉 Now run: node seedAdmin.js\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

initDb();
