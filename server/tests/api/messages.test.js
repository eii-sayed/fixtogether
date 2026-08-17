const request = require('supertest');
const app = require('../../src/app');
const {
  User,
  ItemCategory,
  Item,
  RepairRequest,
  Quotation,
  Message,
} = require('../../src/models');

describe('Messages API Integration Tests', () => {
  let ownerToken, ownerUser;
  let techToken, techUser;
  let thirdPartyToken, thirdPartyUser;
  let testCategory, testItem, testRequest;

  beforeEach(async () => {
    // 1. Create test category
    testCategory = await ItemCategory.create({
      name: 'Electronics',
      slug: `electronics-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      icon: 'smartphone',
      description: 'Electronic devices',
    });

    // 2. Register Owner
    const ownerRes = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Owner User',
      email: `owner-${Date.now()}@example.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'owner',
      phone: '01711111111',
    });
    ownerToken = ownerRes.body.data.accessToken;
    ownerUser = ownerRes.body.data.user;

    // 3. Register Technician
    const techRes = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Tech Specialist',
      email: `tech-${Date.now()}@example.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'technician',
      phone: '01722222222',
    });
    techToken = techRes.body.data.accessToken;
    techUser = techRes.body.data.user;

    // 4. Register Unrelated User
    const thirdPartyRes = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Unrelated User',
      email: `other-${Date.now()}@example.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'owner',
      phone: '01733333333',
    });
    thirdPartyToken = thirdPartyRes.body.data.accessToken;
    thirdPartyUser = thirdPartyRes.body.data.user;

    // 5. Create Item for Owner
    testItem = await Item.create({
      owner: ownerUser._id || ownerUser.id,
      title: 'iPhone 13 Pro',
      category: testCategory._id,
      condition: 'broken',
      ownershipDeclaration: true,
      images: [{ url: 'https://res.cloudinary.com/test/image/upload/v1/test.jpg' }],
    });

    // 6. Create Repair Request with Technician Invited
    testRequest = await RepairRequest.create({
      owner: ownerUser._id || ownerUser.id,
      item: testItem._id,
      problemDescription: 'Screen cracked and battery depleting rapidly.',
      requestStatus: 'published',
      selectedTechnicians: [
        {
          technician: techUser._id || techUser.id,
          status: 'invited',
        },
      ],
    });
  });

  describe('Authorization & Participant Access', () => {
    it('owner can send a message and recipient is automatically derived as technician', async () => {
      const res = await request(app)
        .post(`/api/v1/messages/${testRequest._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          content: 'Hello! Can you help fix my iPhone screen?',
          clientTempId: 'temp-12345',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.content).toBe('Hello! Can you help fix my iPhone screen?');
      expect(res.body.data.message.clientTempId).toBe('temp-12345');
      expect(res.body.data.message.sender._id.toString()).toBe((ownerUser._id || ownerUser.id).toString());
      expect(res.body.data.message.recipient.toString()).toBe((techUser._id || techUser.id).toString());
    });

    it('technician can reply and recipient is automatically derived as owner', async () => {
      const res = await request(app)
        .post(`/api/v1/messages/${testRequest._id}`)
        .set('Authorization', `Bearer ${techToken}`)
        .send({
          content: 'Yes, I have replacement OEM screens in stock.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.sender._id.toString()).toBe((techUser._id || techUser.id).toString());
      expect(res.body.data.message.recipient.toString()).toBe((ownerUser._id || ownerUser.id).toString());
    });

    it('unrelated user is forbidden from sending messages (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/messages/${testRequest._id}`)
        .set('Authorization', `Bearer ${thirdPartyToken}`)
        .send({
          content: 'I want to intercept this conversation.',
        });

      expect(res.status).toBe(403);
    });

    it('unrelated user is forbidden from reading messages (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/messages/${testRequest._id}`)
        .set('Authorization', `Bearer ${thirdPartyToken}`);

      expect(res.status).toBe(403);
    });

    it('unauthenticated request is rejected with 401', async () => {
      const res = await request(app)
        .get(`/api/v1/messages/${testRequest._id}`);

      expect(res.status).toBe(401);
    });
  });

  describe('Validation & Security Controls', () => {
    it('rejects empty or whitespace-only messages', async () => {
      const res = await request(app)
        .post(`/api/v1/messages/${testRequest._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          content: '     ',
        });

      expect(res.status).toBe(400);
    });

    it('rejects oversized messages (>2000 characters)', async () => {
      const longMessage = 'A'.repeat(2001);
      const res = await request(app)
        .post(`/api/v1/messages/${testRequest._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          content: longMessage,
        });

      expect(res.status).toBe(400);
    });

    it('rejects invalid repair request ID format with 400', async () => {
      const res = await request(app)
        .get('/api/v1/messages/not-a-valid-id')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('Read Receipts, Unread Counts & Conversations List', () => {
    beforeEach(async () => {
      // Owner sends message to technician
      await Message.create({
        repairRequest: testRequest._id,
        sender: ownerUser._id || ownerUser.id,
        recipient: techUser._id || techUser.id,
        content: 'Initial message for read test',
      });
    });

    it('returns accurate unread count for recipient and 0 for sender', async () => {
      // Technician unread count should be 1
      const techRes = await request(app)
        .get('/api/v1/messages/unread-count')
        .set('Authorization', `Bearer ${techToken}`);

      expect(techRes.status).toBe(200);
      expect(techRes.body.data.unreadCount).toBe(1);

      // Owner unread count should be 0
      const ownerRes = await request(app)
        .get('/api/v1/messages/unread-count')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.data.unreadCount).toBe(0);
    });

    it('marks messages as read and updates count', async () => {
      const readRes = await request(app)
        .patch(`/api/v1/messages/${testRequest._id}/read`)
        .set('Authorization', `Bearer ${techToken}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.data.markedCount).toBe(1);

      // After marking read, unread count becomes 0
      const countRes = await request(app)
        .get('/api/v1/messages/unread-count')
        .set('Authorization', `Bearer ${techToken}`);

      expect(countRes.body.data.unreadCount).toBe(0);
    });

    it('returns conversations list with enriched participant and item metadata', async () => {
      const res = await request(app)
        .get('/api/v1/messages/conversations')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.conversations.length).toBe(1);
      expect(res.body.data.conversations[0].itemTitle).toBe('iPhone 13 Pro');
      expect(res.body.data.conversations[0].lastMessage.content).toBe('Initial message for read test');
    });
  });
});
