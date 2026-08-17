const request = require('supertest');
const app = require('../../src/app');
const { User, TechnicianProfile, OrganizationProfile, Item, RepairRequest, ItemCategory } = require('../../src/models');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Profile API Integration Tests', () => {
  let ownerToken, ownerUser, ownerUserId;
  let techToken, techUser, techUserId;
  let orgToken, orgUser, orgUserId;
  let adminToken, adminUser, adminUserId;
  let testCategory;

  beforeEach(async () => {
    // 1. Create test Category
    testCategory = await ItemCategory.create({
      name: 'Electronics',
      slug: `electronics-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      icon: 'smartphone',
      description: 'Electronic devices',
    });

    // 2. Register Owner
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Rahim Owner',
      email: 'owner@example.com',
      password: 'OwnerPass123',
      confirmPassword: 'OwnerPass123',
      role: 'owner',
      phone: '01711111111',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerUser = ownerRes.body.data.user;
    ownerUserId = ownerUser._id || ownerUser.id;

    // 3. Register Technician
    const techRes = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Sumon Technician',
      email: 'tech@example.com',
      password: 'TechPass123',
      confirmPassword: 'TechPass123',
      role: 'technician',
      phone: '01722222222',
    });
    techToken = techRes.body.data.accessToken;
    techUser = techRes.body.data.user;
    techUserId = techUser._id || techUser.id;

    // Update technician profile with test data
    await TechnicianProfile.findOneAndUpdate(
      { user: techUserId },
      {
        professionalName: 'Sumon Tech Care',
        biography: 'Expert in laptop and phone repairs.',
        yearsOfExperience: 5,
        supportedCategories: [testCategory._id],
        verificationStatus: 'approved',
        verificationNote: 'SECRET INTERNAL ADMIN NOTE - MUST NEVER BE PUBLIC',
        verificationDocuments: [{ url: 'http://secret.com/id.jpg', type: 'national_id' }],
      },
      { upsert: true }
    );

    // 4. Register Organization
    const orgRes = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Green Earth Foundation',
      email: 'org@example.com',
      password: 'OrgPass1234',
      confirmPassword: 'OrgPass1234',
      role: 'organization',
      phone: '01733333333',
    });
    orgToken = orgRes.body.data.accessToken;
    orgUser = orgRes.body.data.user;
    orgUserId = orgUser._id || orgUser.id;

    // Update organization profile
    await OrganizationProfile.findOneAndUpdate(
      { user: orgUserId },
      {
        organizationName: 'Green Earth Foundation',
        organizationType: 'charity',
        description: 'Collecting and reusing old electronics.',
        acceptedItemCategories: [testCategory._id],
        verificationStatus: 'approved',
        verificationNote: 'SECRET ORG VERIFICATION EVIDENCE',
      },
      { upsert: true }
    );

    // 5. Create Admin directly in database
    adminUser = await User.create({
      fullName: 'Admin User',
      email: 'admin@example.com',
      passwordHash: 'AdminPass123',
      role: 'admin',
    });
    adminUserId = adminUser._id;
    adminToken = jwt.sign({ userId: adminUserId, role: 'admin' }, config.jwt.accessSecret, {
      expiresIn: '1h',
    });
  });

  describe('Shared Private Profile (GET & PATCH /api/v1/users/me)', () => {
    it('should return authenticated user profile with completion percentage and no passwordHash', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('owner@example.com');
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.completionPercentage).toBeGreaterThanOrEqual(40);
    });

    it('should reject unauthenticated access', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });

    it('should allow editing allowed profile fields (fullName, bio, city, preferredLanguage)', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          fullName: 'Rahim Ahmed Updated',
          bio: 'Passionate about fixing devices and sustainability.',
          city: 'Dhaka',
          serviceArea: 'Dhanmondi',
          preferredLanguage: 'bn',
          preferredContactMethod: 'phone',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.fullName).toBe('Rahim Ahmed Updated');
      expect(res.body.data.user.bio).toBe('Passionate about fixing devices and sustainability.');
      expect(res.body.data.user.city).toBe('Dhaka');
      expect(res.body.data.user.preferredLanguage).toBe('bn');
    });

    it('should reject requests attempting to change forbidden fields like role or verificationStatus', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          role: 'admin',
        });

      expect(res.status).toBe(400);
      // Verify in DB that role did NOT change
      const userInDb = await User.findById(ownerUserId);
      expect(userInDb.role).toBe('owner');
    });

    it('should update privacy settings correctly', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me/privacy')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          showEmailPublicly: true,
          showPhonePublicly: false,
          showLocationPublicly: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.privacySettings.showEmailPublicly).toBe(true);
      expect(res.body.data.privacySettings.showPhonePublicly).toBe(false);
    });

    it('should update notification preferences correctly', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me/notifications')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          emailAlerts: true,
          inAppAlerts: true,
          smsAlerts: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.notificationPreferences.smsAlerts).toBe(true);
    });
  });

  describe('Owner Specifics (Stats & Activity)', () => {
    it('should calculate accurate owner statistics from database records', async () => {
      // Create an item and a repair request for this owner
      const item = await Item.create({
        owner: ownerUserId,
        title: 'Dell Laptop XPS 13',
        category: testCategory._id,
        condition: 'broken',
        ownershipDeclaration: true,
      });

      await RepairRequest.create({
        owner: ownerUserId,
        item: item._id,
        problemDescription: 'Laptop does not boot up and screen stays completely black.',
        requestStatus: 'published',
      });

      const res = await request(app)
        .get('/api/v1/users/me/stats')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.stats.registeredItems).toBe(1);
      expect(res.body.data.stats.activeRepairs).toBe(1);
      expect(res.body.data.stats.completedRepairs).toBe(0);
    });

    it('should return recent owner activity stream', async () => {
      const res = await request(app)
        .get('/api/v1/users/me/activity')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.activities)).toBe(true);
    });
  });

  describe('Technician Profile (Public & Private)', () => {
    it('public profile (GET /api/v1/technicians/:id) must return sanitized public DTO and NEVER leak private verification notes or documents', async () => {
      const res = await request(app).get(`/api/v1/technicians/${techUserId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.technician.fullName).toBe('Sumon Technician');
      expect(res.body.data.technician.professionalName).toBe('Sumon Tech Care');
      expect(res.body.data.technician.verificationStatus).toBe('approved');

      // CRITICAL SECURITY CHECKS:
      expect(res.body.data.technician.verificationNote).toBeUndefined();
      expect(res.body.data.technician.verificationDocuments).toBeUndefined();
      expect(res.body.data.technician.passwordHash).toBeUndefined();
    });

    it('technician can edit professional details through private endpoint (PUT /api/v1/technicians/me/profile)', async () => {
      const res = await request(app)
        .put('/api/v1/technicians/me/profile')
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          professionalName: 'Sumon Master Repair Services',
          biography: 'Over 6 years repairing high end electronics.',
          yearsOfExperience: 6,
          minimumServiceCharge: 500,
          warrantyPolicy: '30 days warranty on all repairs',
          languages: ['English', 'Bengali'],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.profile.professionalName).toBe('Sumon Master Repair Services');
      expect(res.body.data.profile.minimumServiceCharge).toBe(500);
    });

    it('technician can toggle availability status (PATCH /api/v1/technicians/me/availability)', async () => {
      const res = await request(app)
        .patch('/api/v1/technicians/me/availability')
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          availabilityStatus: 'busy',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.availabilityStatus).toBe('busy');
    });

    it('owner role is forbidden from accessing technician private profile endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/technicians/me/profile')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Organization Profile (Public & Private)', () => {
    it('public organization profile (GET /api/v1/organizations/:id) returns sanitized public DTO', async () => {
      const res = await request(app).get(`/api/v1/organizations/${orgUserId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.organization.organizationName).toBe('Green Earth Foundation');
      expect(res.body.data.organization.organizationType).toBe('charity');
      expect(res.body.data.organization.verificationNote).toBeUndefined();
      expect(res.body.data.organization.verificationDocuments).toBeUndefined();
    });

    it('organization can update guidelines and locations (PUT /api/v1/organizations/me/profile)', async () => {
      const res = await request(app)
        .put('/api/v1/organizations/me/profile')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          description: 'Non-profit dedicated to circular economy.',
          donationInstructions: 'Please ensure items are wiped clean before drop-off.',
          locations: [
            {
              name: 'Main Hub Dhanmondi',
              address: 'House 12, Road 5, Dhanmondi',
              city: 'Dhaka',
              operatingHours: '9 AM - 6 PM (Sun-Thu)',
              dropoffSupported: true,
              pickupSupported: true,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.profile.locations.length).toBe(1);
      expect(res.body.data.profile.locations[0].name).toBe('Main Hub Dhanmondi');
    });
  });

  describe('Admin Role Security', () => {
    it('admin profile is private and rejects forbidden role changes via profile API', async () => {
      // 1. Attempting to pass forbidden field 'role' is rejected by validator with 400
      const forbiddenRes = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'owner',
        });
      expect(forbiddenRes.status).toBe(400);

      // 2. Legitimate profile update works and maintains admin role
      const validRes = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'Super Admin',
          bio: 'System Administrator',
        });

      expect(validRes.status).toBe(200);
      expect(validRes.body.data.user.fullName).toBe('Super Admin');

      const adminInDb = await User.findById(adminUserId);
      expect(adminInDb.role).toBe('admin');
    });
  });
});
