const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../src/services/emailService', () => {
  const emailService = jest.requireActual('../src/services/emailService');

  return {
    ...emailService,
    sendVerificationEmail: jest.fn(async () => ({
      success: true,
      messageId: 'test-verification-email',
      simulated: true,
      provider: 'test',
    })),
    sendPasswordResetEmail: jest.fn(async () => ({
      success: true,
      messageId: 'test-password-reset-email',
      simulated: true,
      provider: 'test',
    })),
  };
});

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  jest.clearAllMocks();
});
