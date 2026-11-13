const { isOriginAllowed, normalizeOrigin } = require('../../src/utils/cors');

describe('CORS origin policy', () => {
  it('normalizes configured origins and ignores their path', () => {
    expect(normalizeOrigin('https://example.com/some/path')).toBe('https://example.com');
  });

  it('allows the configured client and admin origins', () => {
    expect(isOriginAllowed('http://localhost:5173')).toBe(true);
    expect(isOriginAllowed('http://localhost:5174')).toBe(true);
    expect(isOriginAllowed('https://fixtogether.vercel.app')).toBe(true);
    expect(isOriginAllowed('https://fixtogether-admin.vercel.app')).toBe(true);
  });

  it('allows requests without an Origin header', () => {
    expect(isOriginAllowed(undefined)).toBe(true);
  });

  it('rejects unconfigured sites, including arbitrary Vercel previews', () => {
    expect(isOriginAllowed('https://attacker.example')).toBe(false);
    expect(isOriginAllowed('https://untrusted-preview.vercel.app')).toBe(false);
  });
});
