const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

// Configure Cloudinary
let cloudinaryConfigured = false;
if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
  cloudinaryConfigured = true;
  logger.info('Cloudinary configured');
} else {
  logger.info('Cloudinary not configured - using local file storage fallback');
}

/**
 * Upload a file to Cloudinary or local storage
 * @param {string} filePath - Path to the file
 * @param {Object} options - Upload options
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadFile = async (filePath, options = {}) => {
  const { folder = 'fixtogether', resourceType = 'image' } = options;

  if (cloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: resourceType,
        quality: 'auto',
        fetch_format: 'auto',
      });

      // Remove local temp file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      logger.error('Cloudinary upload error:', error.message);
      // Fall through to local storage
    }
  }

  // Local storage fallback - file is already saved by multer
  const relativePath = filePath.replace(/\\/g, '/');
  const serverUrl = process.env.BACKEND_URL || (process.env.RENDER_EXTERNAL_URL ? `https://${process.env.RENDER_EXTERNAL_URL}` : `http://localhost:${config.port}`);
  const urlPath = relativePath.includes('uploads/')
    ? relativePath.substring(relativePath.indexOf('uploads/'))
    : `uploads/${path.basename(filePath)}`;

  return {
    url: `${serverUrl}/${urlPath}`,
    publicId: `local_${path.basename(filePath, path.extname(filePath))}`,
  };
};

/**
 * Upload multiple files
 * @param {Array} files - Array of multer file objects
 * @param {Object} options - Upload options
 * @returns {Promise<Array<{url: string, publicId: string}>>}
 */
const uploadMultiple = async (files, options = {}) => {
  if (!files || files.length === 0) return [];

  const uploads = files.map((file) => uploadFile(file.path, options));
  return Promise.all(uploads);
};

/**
 * Delete a file from Cloudinary or local storage
 * @param {string} publicId - Public ID or local path
 */
const deleteFile = async (publicId) => {
  if (!publicId) return;

  if (cloudinaryConfigured && !publicId.startsWith('local_')) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      logger.error('Cloudinary delete error:', error.message);
    }
  } else {
    // Local file deletion
    const localPath = publicId.replace('local_', '');
    const possiblePaths = [
      path.join(__dirname, '../../uploads/images', localPath),
      path.join(__dirname, '../../uploads/videos', localPath),
    ];

    for (const p of possiblePaths) {
      // Check with common extensions
      const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm'];
      for (const ext of extensions) {
        const fullPath = p + ext;
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          return;
        }
      }
    }
  }
};

module.exports = {
  uploadFile,
  uploadMultiple,
  deleteFile,
  cloudinaryConfigured,
};
