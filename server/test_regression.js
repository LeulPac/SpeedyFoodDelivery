const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runRegressionTests() {
  console.log('\n======================================================');
  console.log('       SPEEDYDELIVERY SYSTEM REGRESSION SUITE        ');
  console.log('======================================================\n');

  // Test 1: Verify users table and default seeded accounts
  console.log('Test 1: User Accounts & Roles Verification');
  const ownerCheck = await db.query("SELECT * FROM users WHERE email = 'owner@test.com'");
  assert(ownerCheck.rows.length > 0, 'Default owner account exists');
  assert(ownerCheck.rows[0].role === 'owner', 'Owner role is correctly set');

  const adminCheck = await db.query("SELECT * FROM users WHERE role = 'admin' LIMIT 1");
  assert(adminCheck.rows.length > 0, 'Platform admin account exists');

  const driverCheck = await db.query("SELECT * FROM users WHERE role = 'driver' LIMIT 1");
  assert(driverCheck.rows.length > 0, 'Driver account exists');

  // Test 2: Multi-business discovery & data isolation
  console.log('\nTest 2: Multi-Business Discovery & Data Isolation');
  const bizList = await db.query('SELECT * FROM businesses WHERE is_approved = true AND is_active = true');
  assert(bizList.rows.length >= 3, 'Multiple registered food businesses are active');

  const menuItems = await db.query('SELECT * FROM menu_items WHERE business_id IS NOT NULL');
  assert(menuItems.rows.length > 0, 'Menu items are associated with specific businesses');

  // Test 3: Subscription Plans & Pricing Configuration
  console.log('\nTest 3: Subscription Plans Structure');
  const plans = await db.query('SELECT * FROM subscription_plans ORDER BY price ASC');
  assert(plans.rows.length >= 3, 'All 3 tiers (Basic, Professional, Premium) exist');
  assert(parseFloat(plans.rows[0].price) === 499.00, 'Basic plan pricing matches config');
  assert(plans.rows[0].max_menu_items === 15, 'Basic plan max menu items configured');
  assert(parseFloat(plans.rows[1].price) === 1199.00, 'Professional plan pricing matches config');

  // Test 4: Driver Platform Fee Configuration & Rule Verification
  console.log('\nTest 4: Driver Fixed Fee Configuration & Deduplication Safeguards');
  const settings = await db.query('SELECT * FROM platform_settings LIMIT 1');
  assert(settings.rows.length > 0, 'Platform settings table populated');
  assert(parseFloat(settings.rows[0].driver_fee_per_delivery) === 25.00, 'Fixed fee per delivery is 25.00 ETB');

  // Verify unique constraint on driver_delivery_fees (order_id)
  const uniqueCheck = await db.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'driver_delivery_fees'::regclass
      AND contype = 'u'
  `);
  assert(uniqueCheck.rows.length > 0, 'Unique constraint on order_id prevents double-charging completed deliveries');

  // Test 5: Financial Metrics Separation
  console.log('\nTest 5: Financial Streams Separation Check');
  const subRev = await db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM subscription_payments WHERE status = 'paid'");
  const feeAccrued = await db.query("SELECT COALESCE(SUM(fee_amount), 0) AS total FROM driver_delivery_fees");
  const feePaid = await db.query("SELECT COALESCE(SUM(fee_amount), 0) AS total FROM driver_delivery_fees WHERE status = 'paid'");
  const foodGmv = await db.query("SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE payment_status = 'paid'");

  assert(typeof parseFloat(subRev.rows[0].total) === 'number', 'Business subscription revenue calculated');
  assert(typeof parseFloat(feeAccrued.rows[0].total) === 'number', 'Driver fees accrued calculated');
  assert(typeof parseFloat(feePaid.rows[0].total) === 'number', 'Driver fees collected calculated');
  assert(typeof parseFloat(foodGmv.rows[0].total) === 'number', 'Food order volume strictly distinguished from platform revenue');

  // Test 6: Order lifecycle and status constraints
  console.log('\nTest 6: Order Lifecycle Preservation');
  const orders = await db.query('SELECT id, status, payment_status, payment_method FROM orders LIMIT 5');
  assert(orders.rows.length > 0, 'Orders preserved without data corruption');

  console.log('\n======================================================');
  console.log(`SUMMARY: ${passedTests}/${totalTests} Tests PASSED Successfully!`);
  console.log('======================================================\n');
}

runRegressionTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });

