const request = require('supertest');
const app = require('../../src/app');

describe('Health endpoint', () => {
  it('returns service status without exposing email account details', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.email).toEqual(expect.objectContaining({
      configured: expect.any(Boolean),
      provider: expect.any(String),
    }));
    expect(response.body.email).not.toHaveProperty('host');
    expect(response.body.email).not.toHaveProperty('user');
    expect(response.body.email).not.toHaveProperty('from');
  });
});
