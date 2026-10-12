const fs = require('fs');
const path = require('path');
const os = require('os');
const cloudinary = require('cloudinary').v2;
const config = require('../../src/config');
const uploadService = require('../../src/services/uploadService');

describe('Upload Service & Cloud Storage Enforcement', () => {
  let tempFilePath;

  beforeEach(() => {
    // Create a temporary dummy file for upload testing
    tempFilePath = path.join(os.tmpdir(), `test-upload-${Date.now()}.png`);
    fs.writeFileSync(tempFilePath, 'dummy image content');
  });

  afterEach(() => {
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (_) {}
    }
    jest.restoreAllMocks();
  });

  describe('getStorageStatus', () => {
    it('should return storage provider metadata and environment info', () => {
      const status = uploadService.getStorageStatus();
      expect(status).toHaveProperty('provider');
      expect(status).toHaveProperty('cloudConfigured');
      expect(status).toHaveProperty('environment');
      expect(status).toHaveProperty('enforceCloudInProduction');
      expect(status).toHaveProperty('allowLocalInProduction');
    });
  });

  describe('uploadFile - Cloudinary Success', () => {
    it('should upload to Cloudinary and clean up the temporary file', async () => {
      const mockResult = {
        secure_url: 'https://res.cloudinary.com/fixtogether/image/upload/v1234/test.png',
        public_id: 'fixtogether/test_123',
      };

      jest.spyOn(cloudinary.uploader, 'upload').mockResolvedValue(mockResult);

      const result = await uploadService.uploadFile(tempFilePath, { folder: 'test' });

      expect(result.url).toBe(mockResult.secure_url);
      expect(result.publicId).toBe(mockResult.public_id);
      expect(result.storageProvider).toBe('cloudinary');
      // Verify temp file was unlinked
      expect(fs.existsSync(tempFilePath)).toBe(false);
    });
  });

  describe('uploadFile - Production Safety Enforcement', () => {
    it('should throw an AppError when Cloudinary fails in production without local override', async () => {
      // Temporarily simulate production
      const origEnv = config.env;
      const origAllowLocal = config.storage.allowLocalInProduction;
      config.env = 'production';
      config.storage.allowLocalInProduction = false;

      jest.spyOn(cloudinary.uploader, 'upload').mockRejectedValue(new Error('Cloudinary timeout'));

      await expect(uploadService.uploadFile(tempFilePath, { folder: 'test' }))
        .rejects
        .toThrow(/Cloud storage upload failed/);

      // Verify temp file is still cleaned up to prevent leaks
      expect(fs.existsSync(tempFilePath)).toBe(false);

      // Restore config
      config.env = origEnv;
      config.storage.allowLocalInProduction = origAllowLocal;
    });

    it('should allow local fallback in production IF explicitly permitted via flag', async () => {
      const origEnv = config.env;
      const origAllowLocal = config.storage.allowLocalInProduction;
      config.env = 'production';
      config.storage.allowLocalInProduction = true;

      jest.spyOn(cloudinary.uploader, 'upload').mockRejectedValue(new Error('Cloudinary network error'));

      const result = await uploadService.uploadFile(tempFilePath, { folder: 'test' });
      expect(result.storageProvider).toBe('local');
      expect(result.url).toContain('uploads');

      config.env = origEnv;
      config.storage.allowLocalInProduction = origAllowLocal;
    });
  });

  describe('uploadFile - Development Fallback', () => {
    it('should fall back to local storage in development if Cloudinary fails', async () => {
      const origEnv = config.env;
      config.env = 'development';

      jest.spyOn(cloudinary.uploader, 'upload').mockRejectedValue(new Error('Cloudinary mock error'));

      const result = await uploadService.uploadFile(tempFilePath, { folder: 'test' });
      expect(result.storageProvider).toBe('local');
      expect(result.url).toContain('uploads');

      config.env = origEnv;
    });
  });

  describe('deleteFile', () => {
    it('should call cloudinary.uploader.destroy for Cloudinary publicIds', async () => {
      const destroySpy = jest.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });

      await uploadService.deleteFile('fixtogether/sample_public_id');
      expect(destroySpy).toHaveBeenCalledWith('fixtogether/sample_public_id');
    });

    it('should safely ignore empty or undefined publicId', async () => {
      const destroySpy = jest.spyOn(cloudinary.uploader, 'destroy');
      await uploadService.deleteFile('');
      await uploadService.deleteFile(null);
      expect(destroySpy).not.toHaveBeenCalled();
    });
  });
});
