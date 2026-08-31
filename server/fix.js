const bcrypt = require('bcrypt');
const { Client } = require('pg');
require('dotenv').config();

async function fix() {
  const hash = await bcrypt.hash('password123', 10);
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'food_delivery'
  });
  await client.connect();
  await client.query("UPDATE users SET password_hash = $1 WHERE email = 'owner@test.com'", [hash]);
  await client.query("UPDATE users SET password_hash = $1 WHERE email = 'driver@test.com'", [hash]);
  console.log('Fixed owner and driver passwords!');
  await client.end();
}
fix();
