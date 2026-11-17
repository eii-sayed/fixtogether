const fs = require('fs');
const net = require('net');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const signatures = {
  'application/pdf': (buffer) => buffer.subarray(0, 5).toString('ascii') === '%PDF-',
  'image/jpeg': (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  'image/png': (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (buffer) => buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP',
};

const assertExpectedSignature = async (file) => {
  const validator = signatures[file.mimetype];
  if (!validator) throw new AppError('Unsupported verification document format.', 400, 'INVALID_FILE_TYPE');
  const handle = await fs.promises.open(file.path, 'r');
  try {
    const buffer = Buffer.alloc(16);
    await handle.read(buffer, 0, buffer.length, 0);
    if (!validator(buffer)) {
      throw new AppError('The uploaded file content does not match its declared document type.', 400, 'INVALID_FILE_SIGNATURE');
    }
  } finally {
    await handle.close();
  }
};

const scanWithClamAV = (filePath) => new Promise((resolve, reject) => {
  const socket = net.createConnection({
    host: config.verificationScanning.clamavHost,
    port: config.verificationScanning.clamavPort,
  });
  const timeout = setTimeout(() => socket.destroy(new Error('Malware scanner timed out.')), 30_000);
  let response = '';
  let settled = false;
  const finish = (error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    if (error) reject(error); else resolve(response);
  };

  socket.once('error', finish);
  socket.on('data', (chunk) => { response += chunk.toString(); });
  socket.once('close', () => finish());
  socket.once('connect', async () => {
    try {
      socket.write('zINSTREAM\0');
      const stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });
      stream.on('data', (chunk) => {
        const length = Buffer.alloc(4);
        length.writeUInt32BE(chunk.length, 0);
        socket.write(length);
        socket.write(chunk);
      });
      stream.once('error', (error) => socket.destroy(error));
      stream.once('end', () => {
        socket.write(Buffer.alloc(4));
        socket.end();
      });
    } catch (error) {
      socket.destroy(error);
    }
  });
});

const assertSafeVerificationFile = async (file) => {
  await assertExpectedSignature(file);
  if (!config.verificationScanning.clamavHost) {
    if (config.verificationScanning.required) {
      throw new AppError('Verification uploads are unavailable until malware scanning is configured.', 503, 'MALWARE_SCANNER_REQUIRED');
    }
    logger.warn('Verification upload accepted without malware scan because CLAMAV_HOST is not configured.');
    return;
  }

  try {
    const result = await scanWithClamAV(file.path);
    if (!/\bOK\b/.test(result) || /FOUND/i.test(result)) {
      throw new AppError('This verification document was rejected by malware scanning.', 400, 'MALWARE_DETECTED');
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error(`Verification malware scan failed: ${error.message}`);
    if (config.verificationScanning.required) {
      throw new AppError('Verification upload could not be safety-scanned. Please try again later.', 503, 'MALWARE_SCAN_UNAVAILABLE');
    }
  }
};

module.exports = { assertSafeVerificationFile };
