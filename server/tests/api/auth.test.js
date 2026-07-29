const request = require('supertest');
const app = require('../../src/app');

describe('Auth API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'Test1234',
          confirmPassword: 'Test1234',
          role: 'owner',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      await request(app).post('/api/v1/auth/register').send({
        fullName: 'User 1', email: 'dupe@example.com',
        password: 'Test1234', confirmPassword: 'Test1234', role: 'owner',
      });

      const res = await request(app).post('/api/v1/auth/register').send({
        fullName: 'User 2', email: 'dupe@example.com',
        password: 'Test1234', confirmPassword: 'Test1234', role: 'owner',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject weak passwords', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        fullName: 'Test', email: 'weak@example.com',
        password: '123', confirmPassword: '123', role: 'owner',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send({
        fullName: 'Login Test', email: 'login@example.com',
        password: 'Login123', confirmPassword: 'Login123', role: 'owner',
      });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'login@example.com', password: 'Login123',
      });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('should reject wrong password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'login@example.com', password: 'WrongPass1',
      });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nobody@example.com', password: 'Test1234',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const reg = await request(app).post('/api/v1/auth/register').send({
        fullName: 'Me Test', email: 'me@example.com',
        password: 'MeTest12', confirmPassword: 'MeTest12', role: 'owner',
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${reg.body.data.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('me@example.com');
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
