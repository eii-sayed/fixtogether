const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const os = require('os');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

// Configure Cloudinary
let cloudinaryConfigured = false;
if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  cloudinaryConfigured = true;
  logger.info('Cloudinary storage provider initialized and configured.');
} else {
  if (config.env === 'production' && !config.storage.allowLocalInProduction) {
    logger.error(
      'CRITICAL STORAGE WARNING: Cloudinary is NOT configured in production environment! Ephemeral local disk storage risks permanent data loss on container restart.'
    );
  } else {
    logger.warn('Cloudinary not configured - using local file storage fallback (Development mode only).');
  }
}

/**
 * Returns the current storage provider status and safety flags
 * @returns {Object}
 */
const getStorageStatus = () => {
  return {
    provider: cloudinaryConfigured ? 'cloudinary' : 'local',
    cloudConfigured: cloudinaryConfigured,
    environment: config.env,
    enforceCloudInProduction: config.storage.enforceCloudInProduction,
    allowLocalInProduction: config.storage.allowLocalInProduction,
    isEphemeralWarning: !cloudinaryConfigured && config.env === 'production',
  };
};

/**
 * Safely delete local file without throwing unhandled exceptions
 * @param {string} filePath
 */
const safeUnlink = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      logger.warn(`Failed to unlink temporary upload file at ${filePath}: ${err.message}`);
    }
  }
};

/**
 * Upload a file to Cloudinary or local storage with production safety guards
 * @param {string} filePath - Path to the file
 * @param {Object} options - Upload options
 * @returns {Promise<{url: string, publicId: string, storageProvider: string}>}
 */
const uploadFile = async (filePath, options = {}) => {
  const { folder = 'fixtogether', resourceType = 'image' } = options;

  // 1. Cloudinary upload path
  if (cloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: resourceType,
        quality: 'auto',
        fetch_format: 'auto',
      });

      // Remove local temp file immediately upon cloud confirmation
      safeUnlink(filePath);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        storageProvider: 'cloudinary',
      };
    } catch (error) {
      logger.error('Cloudinary upload error:', error.message);

      // In production without explicit local override, fail rather than writing to ephemeral disk
      if (config.env === 'production' && !config.storage.allowLocalInProduction) {
        safeUnlink(filePath);
        throw new AppError(
          `Cloud storage upload failed (${error.message}). File cannot be safely stored to ephemeral disk in production.`,
          502,
          'CLOUD_STORAGE_UPLOAD_FAILED'
        );
      }
      logger.warn('Cloudinary upload failed. Falling back to local storage (development/override mode).');
    }
  }

  // 2. Production safety guard if Cloudinary is not configured
  if (config.env === 'production' && !config.storage.allowLocalInProduction) {
    safeUnlink(filePath);
    throw new AppError(
      'Cloud storage provider is required in production. Local storage fallback is disabled to prevent permanent data loss on ephemeral disks.',
      503,
      'CLOUD_STORAGE_REQUIRED'
    );
  }

  // 3. Local storage fallback (Development or explicitly opted-in)
  const relativePath = filePath.replace(/\\/g, '/');
  const serverUrl =
    process.env.BACKEND_URL ||
    (process.env.RENDER_EXTERNAL_URL ? `https://${process.env.RENDER_EXTERNAL_URL}` : `http://localhost:${config.port}`);
  const urlPath = relativePath.includes('uploads/')
    ? relativePath.substring(relativePath.indexOf('uploads/'))
    : `uploads/${path.basename(filePath)}`;

  return {
    url: `${serverUrl}/${urlPath}`,
    publicId: `local_${path.basename(filePath, path.extname(filePath))}`,
    storageProvider: 'local',
  };
};

/**
 * Upload multiple files
 * @param {Array} files - Array of multer file objects
 * @param {Object} options - Upload options
 * @returns {Promise<Array<{url: string, publicId: string, storageProvider: string}>>}
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
    const uploadsDir = path.join(__dirname, '../../uploads');
    const possiblePaths = [
      path.join(uploadsDir, 'images', localPath),
      path.join(uploadsDir, 'videos', localPath),
      path.join(os.tmpdir(), 'fixtogether-uploads', 'images', localPath),
      path.join(os.tmpdir(), 'fixtogether-uploads', 'videos', localPath),
    ];

    for (const p of possiblePaths) {
      const extensions = ['', '.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm'];
      for (const ext of extensions) {
        const fullPath = p + ext;
        if (fs.existsSync(fullPath)) {
          safeUnlink(fullPath);
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
  getStorageStatus,
  cloudinaryConfigured,
};
