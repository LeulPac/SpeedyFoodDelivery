/**
 * Creates or updates the default driver login (bcrypt password).
 * Run from server folder: node seedDriver.js
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./db');

const DRIVER_EMAIL = 'driver@test.com';
const DRIVER_PASSWORD = 'driver123';
const DRIVER_NAME = 'Speedy Driver';
const DRIVER_PHONE = '0911223344';

async function seedDriver() {
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`);
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(DRIVER_PASSWORD, salt);

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [DRIVER_EMAIL]);
  if (existing.rows.length > 0) {
    await db.query(
      'UPDATE users SET name = $1, password_hash = $2, role = $3, phone = $4 WHERE email = $5',
      [DRIVER_NAME, passwordHash, 'driver', DRIVER_PHONE, DRIVER_EMAIL]
    );
    console.log('Updated existing driver account.');
  } else {
    await db.query(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1, $2, $3, $4, $5)',
      [DRIVER_NAME, DRIVER_EMAIL, passwordHash, 'driver', DRIVER_PHONE]
    );
    console.log('Created driver account.');
  }

  console.log('\nDriver app login (http://localhost:5175):');
  console.log(`  Email:    ${DRIVER_EMAIL}`);
  console.log(`  Password: ${DRIVER_PASSWORD}\n`);
  process.exit(0);
}

seedDriver().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
