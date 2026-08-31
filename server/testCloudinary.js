/**
 * testCloudinary.js — Debug Cloudinary upload 403 issue
 */
require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function tryUpload(label, options) {
  return new Promise((resolve) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        console.log(`  ❌ ${label}: ${error.message} (HTTP ${error.http_code})`);
        console.log(`     Full error:`, JSON.stringify(error));
        resolve(false);
      } else {
        console.log(`  ✅ ${label}: ${result.secure_url}`);
        cloudinary.uploader.destroy(result.public_id).catch(() => {});
        resolve(true);
      }
    });
    stream.end(tinyPng);
  });
}

async function run() {
  console.log('\n🔍 Testing different upload options...\n');

  // Try 1: Bare minimum — no options
  await tryUpload('No options', {});

  // Try 2: With resource_type explicit
  await tryUpload('resource_type: image', { resource_type: 'image' });

  // Try 3: With folder
  await tryUpload('With folder', { folder: 'food-delivery/menu' });

  // Try 4: With unsigned preset (if you have one)
  // await tryUpload('Unsigned preset', { upload_preset: 'YOUR_PRESET_NAME', unsigned: true });

  console.log('\n📋 Account info:');
  try {
    const usage = await cloudinary.api.usage();
    console.log('  Plan:', usage.plan);
    console.log('  Used credits:', usage.credits?.usage, '/', usage.credits?.limit);
  } catch(e) {
    console.log('  Could not fetch usage:', e.message);
  }
}

run();
