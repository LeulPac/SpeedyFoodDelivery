require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  // First, connect to the default 'postgres' database to create our new database
  const client = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL server.');

    // Check if database exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'food_delivery'");
    if (res.rowCount === 0) {
      console.log('Creating database food_delivery...');
      await client.query('CREATE DATABASE food_delivery');
      console.log('Database created successfully.');
    } else {
      console.log('Database food_delivery already exists.');
    }
  } catch (err) {
    console.error('Error connecting to or creating database:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  // Now connect to the newly created 'food_delivery' database to run the schema
  const appClient = new Client({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: 'food_delivery'
  });

  try {
    await appClient.connect();
    console.log('Connected to food_delivery database.');
    
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await appClient.query(schemaSql);
    console.log('Schema created successfully!');

    // Add a default driver and owner for testing
    const insertSql = `
      INSERT INTO users (name, email, password_hash, role) 
      VALUES 
      ('Admin Owner', 'owner@test.com', 'hashed_pass_placeholder', 'owner'),
      ('Speedy Driver', 'driver@test.com', 'hashed_pass_placeholder', 'driver')
      ON CONFLICT (email) DO NOTHING;
    `;
    await appClient.query(insertSql);
    console.log('Default test users created.');

  } catch (err) {
    console.error('Error creating schema:', err.message);
  } finally {
    await appClient.end();
  }
}

setupDatabase();
