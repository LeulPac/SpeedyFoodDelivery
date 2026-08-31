/**
 * Creates or updates the default owner login (bcrypt password).
 * Run from server folder: node seedAdmin.js
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./db');

const OWNER_EMAIL = 'owner@test.com';
const OWNER_PASSWORD = 'admin123';
const OWNER_NAME = 'Admin Owner';

async function seedAdmin() {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, salt);

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [OWNER_EMAIL]);
  if (existing.rows.length > 0) {
    await db.query(
      'UPDATE users SET name = $1, password_hash = $2, role = $3 WHERE email = $4',
      [OWNER_NAME, passwordHash, 'owner', OWNER_EMAIL]
    );
    console.log('Updated existing owner account.');
  } else {
    await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [OWNER_NAME, OWNER_EMAIL, passwordHash, 'owner']
    );
    console.log('Created owner account.');
  }

  console.log('\nAdmin panel login (http://localhost:5174):');
  console.log(`  Email:    ${OWNER_EMAIL}`);
  console.log(`  Password: ${OWNER_PASSWORD}\n`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
