const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const config = require('../../src/config');
const { User, Item, RepairRequest, Notification, ItemCategory } = require('../../src/models');
const { REPAIR_REQUEST_STATUS, NOTIFICATION_TYPES, ROLES } = require('../../src/constants');

// Helper: register + login and get token for owner / technician
const registerAndLogin = async (overrides = {}) => {
  const role = overrides.role || 'owner';

  if (role === 'admin') {
    // Admin cannot self-register via public endpoint; create directly in DB
    const admin = await User.create({
      fullName: overrides.fullName || 'Admin User',
      email: overrides.email || `admin-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      passwordHash: 'Test1234',
      role: ROLES.ADMIN,
    });
    const token = jwt.sign({ userId: admin._id, role: ROLES.ADMIN }, config.jwt.accessSecret, {
      expiresIn: '1h',
    });
    return { token, user: admin };
  }

  const base = {
    fullName: 'Test User',
    email: `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'Test1234',
    confirmPassword: 'Test1234',
    role,
    ...overrides,
  };
  const res = await request(app).post('/api/v1/auth/register').send(base);
  return { token: res.body.data.accessToken, user: res.body.data.user };
};

// Helper: create item + draft repair request for an owner
const createDraftRequest = async (token) => {
  const cat = await ItemCategory.create({ name: `Cat-${Date.now()}`, slug: `cat-${Date.now()}` });
  const itemRes = await request(app).post('/api/v1/items').set('Authorization', `Bearer ${token}`)
    .send({ title: 'Test Item', category: cat._id, condition: 'broken' });
  const itemId = itemRes.body.data.item._id;

  const rrRes = await request(app).post('/api/v1/repair-requests').set('Authorization', `Bearer ${token}`)
    .send({ itemId, problemDescription: 'Screen is cracked and unresponsive' });
  return rrRes.body.data.repairRequest;
};

describe('Repair Requests API', () => {
  let ownerToken, techToken, adminToken;
  let ownerUser, techUser, adminUser;

  beforeEach(async () => {
    const owner = await registerAndLogin({ role: 'owner', email: `owner-${Date.now()}@test.com` });
    ownerToken = owner.token;
    ownerUser = owner.user;

    const tech = await registerAndLogin({ role: 'technician', email: `tech-${Date.now()}@test.com` });
    techToken = tech.token;
    techUser = tech.user;

    const admin = await registerAndLogin({ role: 'admin', email: `admin-${Date.now()}@test.com` });
    adminToken = admin.token;
    adminUser = admin.user;
  });

  describe('Role-Based Filtering - GET /api/v1/repair-requests', () => {
    it('owner sees own drafts', async () => {
      await createDraftRequest(ownerToken);

      const res = await request(app).get('/api/v1/repair-requests')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.repairRequests.length).toBe(1);
      expect(res.body.data.repairRequests[0].requestStatus).toBe('draft');
    });

    it('technician does NOT see drafts', async () => {
      await createDraftRequest(ownerToken);

      const res = await request(app).get('/api/v1/repair-requests')
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.repairRequests.length).toBe(0);
    });

    it('technician cannot filter by draft status', async () => {
      await createDraftRequest(ownerToken);

      const res = await request(app).get('/api/v1/repair-requests?status=draft')
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.repairRequests.length).toBe(0);
    });

    it('admin sees all requests including drafts', async () => {
      await createDraftRequest(ownerToken);

      const res = await request(app).get('/api/v1/repair-requests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.repairRequests.length).toBe(1);
    });

    it('technician sees published requests', async () => {
      const rr = await createDraftRequest(ownerToken);

      // Directly publish via DB for test isolation
      await RepairRequest.findByIdAndUpdate(rr._id, {
        requestStatus: REPAIR_REQUEST_STATUS.PUBLISHED,
        publishedAt: new Date(),
      });

      const res = await request(app).get('/api/v1/repair-requests')
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.repairRequests.length).toBe(1);
      expect(res.body.data.repairRequests[0].requestStatus).toBe('published');
    });
  });

  describe('Draft Privacy - GET /api/v1/repair-requests/:id', () => {
    it('technician cannot access a draft by ID', async () => {
      const rr = await createDraftRequest(ownerToken);

      const res = await request(app).get(`/api/v1/repair-requests/${rr._id}`)
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(403);
    });

    it('owner can access own draft by ID', async () => {
      const rr = await createDraftRequest(ownerToken);

      const res = await request(app).get(`/api/v1/repair-requests/${rr._id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.repairRequest._id).toBe(rr._id);
    });

    it('admin can access any draft by ID', async () => {
      const rr = await createDraftRequest(ownerToken);

      const res = await request(app).get(`/api/v1/repair-requests/${rr._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Publication - POST /api/v1/repair-requests/:id/publish', () => {
    it('publishes a draft request', async () => {
      const rr = await createDraftRequest(ownerToken);

      const res = await request(app).post(`/api/v1/repair-requests/${rr._id}/publish`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.repairRequest.requestStatus).toMatch(/published|matching_technicians/);
      expect(res.body.data.repairRequest.publishedAt).toBeTruthy();
    });

    it('creates notifications for technicians and admins on publish', async () => {
      const rr = await createDraftRequest(ownerToken);

      await request(app).post(`/api/v1/repair-requests/${rr._id}/publish`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Check notifications were created
      const techNotifs = await Notification.find({
        user: techUser.userId || techUser._id,
        type: NOTIFICATION_TYPES.REPAIR_REQUEST_PUBLISHED,
        relatedEntityId: rr._id,
      });
      expect(techNotifs.length).toBe(1);

      const adminNotifs = await Notification.find({
        user: adminUser.userId || adminUser._id,
        type: NOTIFICATION_TYPES.REPAIR_REQUEST_PUBLISHED,
        relatedEntityId: rr._id,
      });
      expect(adminNotifs.length).toBe(1);
    });

    it('is idempotent — re-publishing returns success without duplicate notifications', async () => {
      const rr = await createDraftRequest(ownerToken);

      // First publish
      await request(app).post(`/api/v1/repair-requests/${rr._id}/publish`)
        .set('Authorization', `Bearer ${ownerToken}`);

      // Second publish (idempotent)
      const res = await request(app).post(`/api/v1/repair-requests/${rr._id}/publish`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('already published');

      // Verify no duplicate notifications
      const notifs = await Notification.find({
        type: NOTIFICATION_TYPES.REPAIR_REQUEST_PUBLISHED,
        relatedEntityId: rr._id,
      });

      // Should have exactly techCount + adminCount notifications, not doubled
      const uniqueRecipients = [...new Set(notifs.map(n => n.user.toString()))];
      expect(uniqueRecipients.length).toBe(notifs.length);
    });

    it('technician cannot publish a request', async () => {
      const rr = await createDraftRequest(ownerToken);

      const res = await request(app).post(`/api/v1/repair-requests/${rr._id}/publish`)
        .set('Authorization', `Bearer ${techToken}`);

      expect(res.status).toBe(403);
    });
  });
});
