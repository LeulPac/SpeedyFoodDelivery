const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload buffer to Cloudinary with local disk fallback
 */
const uploadImageBuffer = (buffer, folder = 'food-delivery/businesses', filenamePrefix = 'biz') => {
  return new Promise((resolve, reject) => {
    // If Cloudinary configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: `${filenamePrefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
          transformation: [{ width: 1200, height: 800, crop: 'limit', quality: 'auto' }],
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error.message);
            // Fallback to local
            saveToLocal(buffer, filenamePrefix, resolve, reject);
          } else {
            resolve(result.secure_url);
          }
        }
      );
      stream.end(buffer);
    } else {
      saveToLocal(buffer, filenamePrefix, resolve, reject);
    }
  });
};

const saveToLocal = (buffer, filenamePrefix, resolve, reject) => {
  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filename = `${filenamePrefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    resolve(`/uploads/${filename}`);
  } catch (err) {
    reject(err);
  }
};

module.exports = {
  uploadImageBuffer,
};
