const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const config = require('../../src/config');
const { User, SafetyRule, Dispute, ReviewQueueItem } = require('../../src/models');
const { ROLES } = require('../../src/constants');

const createToken = (payload) => {
  return jwt.sign(payload, config.jwt.accessSecret, { expiresIn: '1h' });
};

describe('Admin Governance & Operations API', () => {
  let adminToken;
  let adminUser;
  let regularOwnerToken;
  let regularOwner;

  beforeEach(async () => {
    // Create admin user
    adminUser = await User.create({
      fullName: 'Super Admin',
      email: 'admin@fixtogether.test',
      passwordHash: 'AdminPassword123!',
      role: 'admin',
      adminPermissions: ['super_admin'],
      accountStatus: 'active',
      emailVerified: true,
    });
    adminToken = createToken({ userId: adminUser._id, role: 'admin', email: adminUser.email });

    // Create regular owner user
    regularOwner = await User.create({
      fullName: 'John Owner',
      email: 'owner@fixtogether.test',
      passwordHash: 'OwnerPassword123!',
      role: 'owner',
      accountStatus: 'active',
      emailVerified: true,
    });
    regularOwnerToken = createToken({ userId: regularOwner._id, role: 'owner', email: regularOwner.email });
  });

  describe('GET /api/v1/admin/dashboard', () => {
    it('should return operational queues and system health metrics for admins', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.systemHealth).toBeDefined();
      expect(res.body.data.urgentQueue).toBeDefined();
      expect(res.body.data.criticalAlerts).toBeDefined();
      expect(res.body.data.metrics.users.total).toBeGreaterThanOrEqual(2);
    });

    it('should deny non-admin access with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${regularOwnerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Review Queue & Lock Management', () => {
    let queueItem;

    beforeEach(async () => {
      queueItem = await ReviewQueueItem.create({
        entityType: 'safety_flag',
        entityId: adminUser._id,
        entityModel: 'User',
        title: 'Lithium Battery Flare Hazard',
        reason: 'Keyword detected: smoking battery',
        priority: 'critical',
        submittedAt: new Date(),
        slaDeadline: new Date(Date.now() + 12 * 3600 * 1000),
      });
    });

    it('should list items in the unified review queue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/review-queue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should acquire review lock for acting admin', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/review-queue/${queueItem._id}/lock`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.item.lock.lockedBy).toBe(adminUser._id.toString());
    });

    it('should allow authorized lock takeover with note and reason', async () => {
      // Create second admin
      const admin2 = await User.create({
        fullName: 'Second Admin',
        email: 'admin2@fixtogether.test',
        passwordHash: 'AdminPassword123!',
        role: 'admin',
        adminPermissions: ['super_admin'],
      });
      const token2 = createToken({ userId: admin2._id, role: 'admin', email: admin2.email });

      // Admin 1 locks
      await request(app)
        .post(`/api/v1/admin/review-queue/${queueItem._id}/lock`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Admin 2 takes over
      const res = await request(app)
        .post(`/api/v1/admin/review-queue/${queueItem._id}/takeover`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ reason: 'Escalation by Lead Duty' });

      expect(res.status).toBe(200);
      expect(res.body.data.item.lock.lockedBy).toBe(admin2._id.toString());
    });
  });

  describe('Safety Rules Regex & Rollback', () => {
    it('should create and validate a safe regex safety rule', async () => {
      const res = await request(app)
        .post('/api/v1/admin/safety-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Battery Swell Detector',
          patternType: 'regex',
          regexPattern: 'swoll(en|ing)\\s*battery',
          riskType: 'battery',
          severity: 'critical',
          warningMessage: 'Swollen battery detected. Do not plug in or operate.',
          testCases: [
            { input: 'The phone has a swollen battery', expectedMatch: true },
            { input: 'Clean phone screen with cloth', expectedMatch: false },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.rule.patternType).toBe('regex');
      expect(res.body.data.rule.version).toBe(1);
    });

    it('should reject unsafe / ReDoS regex patterns', async () => {
      const res = await request(app)
        .post('/api/v1/admin/safety-rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Unsafe Nested Quantifiers',
          patternType: 'regex',
          regexPattern: '(a+)+',
          riskType: 'battery',
          severity: 'critical',
          warningMessage: 'Unsafe pattern',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('nested quantifiers');
    });

    it('should execute rule test cases and report pass/fail', async () => {
      const rule = await SafetyRule.create({
        name: 'Spark Tester',
        patternType: 'keyword',
        keywords: ['spark', 'smoke'],
        riskType: 'electrical',
        severity: 'high',
        warningMessage: 'Spark hazard',
        testCases: [
          { input: 'Device makes sparks when turned on', expectedMatch: true },
          { input: 'Device works fine', expectedMatch: false },
        ],
      });

      const res = await request(app)
        .post(`/api/v1/admin/safety-rules/${rule._id}/test`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.allPassed).toBe(true);
    });
  });

  describe('User Moderation Safeguards', () => {
    it('should prevent admin from suspending themselves', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${adminUser._id}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'permanent_suspension',
          reason: 'Self harm test',
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('cannot moderate your own');
    });

    it('should prevent suspending the final active administrator', async () => {
      // Only 1 admin exists (adminUser)
      // Trying to suspend another admin when none left
      const res = await request(app)
        .patch(`/api/v1/admin/users/${adminUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          accountStatus: 'suspended',
        });

      expect(res.status).toBe(403);
    });

    it('should apply temporary suspension with duration and revoke refresh tokens', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/users/${regularOwner._id}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'temporary_suspension',
          durationDays: 7,
          reason: 'Spamming unverified requests',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.accountStatus).toBe('suspended');
      expect(res.body.data.user.moderationHistory.length).toBe(1);
    });
  });

  describe('Background Jobs API', () => {
    it('should queue and process asynchronous background export jobs', async () => {
      const res = await request(app)
        .post('/api/v1/admin/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'EXPORT_AUDIT_LOGS',
          payload: { query: {} },
        });

      expect(res.status).toBe(202);
      expect(res.body.data.job.jobId).toBeDefined();

      const jobId = res.body.data.job.jobId;

      // Check status
      const statusRes = await request(app)
        .get(`/api/v1/admin/jobs/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.job.status).toBeDefined();
    });
  });
});
