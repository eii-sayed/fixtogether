const { requireRecentAuth } = require('../../src/middleware/authorize');

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('requireRecentAuth', () => {
  it('allows a recently authenticated user', () => {
    const req = { user: { authTime: Math.floor(Date.now() / 1000) } };
    const res = createResponse();
    const next = jest.fn();

    requireRecentAuth(15)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects an old authentication timestamp', () => {
    const req = { user: { authTime: Math.floor(Date.now() / 1000) - 16 * 60 } };
    const res = createResponse();
    const next = jest.fn();

    requireRecentAuth(15)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'RECENT_AUTHENTICATION_REQUIRED',
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects requests without an authenticated user', () => {
    const res = createResponse();
    const next = jest.fn();

    requireRecentAuth(15)({}, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
