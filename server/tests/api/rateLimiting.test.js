const request = require('supertest');
const app = require('../../src/app');

describe('Rate Limiting', () => {
  describe('Health check exclusion', () => {
    it('health check endpoint is not rate limited even with rapid requests', async () => {
      // Make multiple rapid requests to health check
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app)
            .get('/api/health')
            .set('x-test-rate-limit', 'true')
        );
      }
      const results = await Promise.all(promises);

      // All should succeed with 200
      results.forEach((res) => {
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
      });
    });
  });

  describe('429 Response format', () => {
    it('returns consistent JSON with code RATE_LIMIT_EXCEEDED and retryAfter when limit exceeded', async () => {
      // Make 15 rapid login attempts with x-test-rate-limit enabled to trigger the auth limiter (max: 10)
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/login')
            .set('x-test-rate-limit', 'true')
            .send({
              email: `nonexistent-${i}@test.com`,
              password: 'Test1234',
            })
        );
      }
      const results = await Promise.all(promises);

      // Verify at least one response was 429
      const rateLimited = results.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      const body = rateLimited[0].body;
      expect(body.success).toBe(false);
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.message).toMatch(/too many requests/i);
      expect(body.retryAfter).toBeDefined();
      expect(typeof body.retryAfter).toBe('number');
    });
  });

  describe('Auth limiter', () => {
    it('applies rate limit to registration endpoint when limit exceeded', async () => {
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/register')
            .set('x-test-rate-limit', 'true')
            .send({
              fullName: `User ${i}`,
              email: `ratelimit-${i}-${Date.now()}@test.com`,
              password: 'Test1234',
              confirmPassword: 'Test1234',
              role: 'owner',
            })
        );
      }
      const results = await Promise.all(promises);

      // Should have both successful registrations and rate-limited ones
      const rateLimited = results.filter((r) => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].body.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});
