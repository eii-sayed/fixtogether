const multer = require('multer');
const os = require('os');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { AppError } = require('./errorHandler');

// Resolve safe writable upload directory (falls back to os.tmpdir in read-only / serverless filesystems)
const getUploadsBaseDir = () => {
  const localDir = path.join(__dirname, '../../uploads');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    return localDir;
  } catch (_) {
    const tmpDir = path.join(os.tmpdir(), 'fixtogether-uploads');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
};

// File filter for images
const imageFilter = (req, file, cb) => {
  if (config.upload.allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, and WebP images are allowed.', 400, 'INVALID_FILE_TYPE'), false);
  }
};

// File filter for images and videos
const mediaFilter = (req, file, cb) => {
  const allowedTypes = [...config.upload.allowedImageTypes, ...config.upload.allowedVideoTypes];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type.', 400, 'INVALID_FILE_TYPE'), false);
  }
};

// Multer disk storage configuration
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const baseDir = getUploadsBaseDir();
    const subDir = file.mimetype.startsWith('video') ? 'videos' : 'images';
    const dir = path.join(baseDir, subDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

/**
 * Create multer upload middleware
 * Uses local storage (Cloudinary upload is done in the upload service after multer receives the file)
 */
const createUpload = (options = {}) => {
  const {
    maxFileSize = config.upload.maxFileSize,
    fileFilter = imageFilter,
  } = options;

  return multer({
    storage: localStorage,
    limits: {
      fileSize: maxFileSize,
    },
    fileFilter,
  });
};

// Pre-configured upload middlewares
const uploadImages = createUpload({ fileFilter: imageFilter });
const uploadMedia = createUpload({ fileFilter: mediaFilter });

// Single image upload
const uploadSingleImage = uploadImages.single('image');

// Multiple image upload
const uploadMultipleImages = (fieldName = 'images', maxCount = 10) => {
  return uploadImages.array(fieldName, maxCount);
};

// Mixed upload (images + documents)
const uploadMixed = uploadMedia.fields([
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 2 },
  { name: 'documents', maxCount: 5 },
]);

module.exports = {
  createUpload,
  uploadSingleImage,
  uploadMultipleImages,
  uploadMixed,
  uploadMedia,
  uploadImages,
  imageFilter,
  mediaFilter,
};
