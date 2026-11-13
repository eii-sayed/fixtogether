const request = require('supertest');
const app = require('../../src/app');
const { User } = require('../../src/models');
const emailService = require('../../src/services/emailService');

describe('Full End-to-End Authentication & Email Lifecycle', () => {
  let capturedVerificationOtp = null;
  let capturedResetToken = null;

  beforeAll(() => {
    jest.spyOn(emailService, 'sendVerificationEmail').mockImplementation(async (to, otp, name) => {
      capturedVerificationOtp = otp;
      return { success: true, messageId: 'mock-verify-id', simulated: true };
    });

    jest.spyOn(emailService, 'sendPasswordResetEmail').mockImplementation(async (to, token, name) => {
      capturedResetToken = token;
      return { success: true, messageId: 'mock-reset-id', simulated: true };
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('should successfully execute the complete registration, email verification, login, refresh, and password reset flow', async () => {
    const email = 'jordan.devops@example.com';
    const password = 'InitialPassword123!';
    const updatedPassword = 'NewSecretPassword123!';

    // STEP 1: Registration
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Jordan DevOps',
        email,
        password,
        confirmPassword: password,
        role: 'owner',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.requiresVerification).toBe(true);
    expect(regRes.body.data.user.emailVerified).toBe(false);
    expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    expect(capturedVerificationOtp).toHaveLength(6);

    // STEP 2: Login before verification must be blocked
    const preVerifyLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });

    expect(preVerifyLoginRes.status).toBe(403);
    expect(preVerifyLoginRes.body.requiresVerification).toBe(true);

    // STEP 3: Verification with wrong OTP must fail
    const badVerifyRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email, otp: '000000' });

    expect(badVerifyRes.status).toBe(400);
    expect(badVerifyRes.body.message).toMatch(/attempt\(s\) remaining/i);

    // STEP 4: Verification with valid OTP must succeed
    const validVerifyRes = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email, otp: capturedVerificationOtp });

    expect(validVerifyRes.status).toBe(200);
    expect(validVerifyRes.body.success).toBe(true);

    // STEP 5: Login after verification must succeed
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.accessToken).toBeDefined();
    expect(loginRes.body.data.refreshToken).toBeDefined();
    const { accessToken, refreshToken } = loginRes.body.data;

    // STEP 6: Authenticated /auth/me request
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(email);

    // STEP 7: Refresh token rotation
    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).toBeDefined();
    expect(refreshRes.body.data.refreshToken).not.toBe(refreshToken);

    // STEP 8: Forgot password with untrimmed and mixed-case email
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: '   JORDAN.DEVOPS@EXAMPLE.COM   ' });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    expect(capturedResetToken).toBeDefined();

    // STEP 9: Reset password (client sends token and password)
    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: capturedResetToken,
        password: updatedPassword,
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // STEP 10: Old password should fail
    const oldLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });

    expect(oldLoginRes.status).toBe(401);

    // STEP 11: New password must succeed
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: updatedPassword });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.success).toBe(true);
  }, 30000);
});
