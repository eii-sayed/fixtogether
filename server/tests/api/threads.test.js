const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const config = require('../../src/config');
const { User, ItemCategory, Thread, ThreadComment } = require('../../src/models');
const { ROLES } = require('../../src/constants');

const registerAndLogin = async (overrides = {}) => {
  const role = overrides.role || 'owner';
  const base = {
    fullName: overrides.fullName || 'Test User',
    email: overrides.email || `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'Test1234',
    confirmPassword: 'Test1234',
    role,
    ...overrides,
  };
  const res = await request(app).post('/api/v1/auth/register').send(base);
  return { token: res.body.data.accessToken, user: res.body.data.user };
};

describe('Threads and Q&A Forum API', () => {
  let user1, user2, category;

  beforeEach(async () => {
    user1 = await registerAndLogin({ fullName: 'Alice Owner', role: ROLES.OWNER });
    user2 = await registerAndLogin({ fullName: 'Bob Tech', role: ROLES.TECHNICIAN });
    category = await ItemCategory.create({
      name: `Category-${Date.now()}`,
      slug: `category-${Date.now()}`,
      description: 'Test category',
    });
  });

  it('should create a new thread with type question', async () => {
    const res = await request(app)
      .post('/api/v1/threads')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({
        title: 'How do I test my microwave magnetron safely?',
        content: 'I noticed my microwave is not heating food properly. Any tips?',
        category: category._id,
        type: 'question',
        tags: ['microwave', 'magnetron', 'safety'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.thread.title).toContain('microwave');
    expect(res.body.data.thread.type).toBe('question');
    expect(res.body.data.thread.author._id.toString()).toBe(user1.user._id.toString());
  });

  it('should support upvoting and downvoting on a thread', async () => {
    const thread = await Thread.create({
      author: user1.user._id,
      category: category._id,
      title: 'Bike derailleur skipping on gear 4',
      content: 'Any idea what causes skipping only on the 4th gear?',
      type: 'troubleshooting',
      tags: ['bicycle'],
    });

    // Bob upvotes
    const upRes = await request(app)
      .post(`/api/v1/threads/${thread._id}/vote`)
      .set('Authorization', `Bearer ${user2.token}`)
      .send({ direction: 1 });

    expect(upRes.status).toBe(200);
    expect(upRes.body.data.score).toBe(1);
    expect(upRes.body.data.upvoted).toBe(true);

    // Cancel upvote
    const cancelRes = await request(app)
      .post(`/api/v1/threads/${thread._id}/vote`)
      .set('Authorization', `Bearer ${user2.token}`)
      .send({ direction: 0 });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.score).toBe(0);
  });

  it('should support posting answers, nested Facebook-style replies, and marking accepted solution', async () => {
    const thread = await Thread.create({
      author: user1.user._id,
      category: category._id,
      title: 'Fridge evaporator coil frozen',
      content: 'Ice block forming at the back of the freezer compartment.',
      type: 'question',
    });

    // Bob Tech posts an answer
    const commentRes = await request(app)
      .post(`/api/v1/threads/${thread._id}/comments`)
      .set('Authorization', `Bearer ${user2.token}`)
      .send({
        content: 'Check the defrost bimetal thermostat with a multimeter.',
        type: 'answer',
      });

    expect(commentRes.status).toBe(201);
    const commentId = commentRes.body.data.comment._id;

    // Alice OP posts a nested reply to Bob's comment
    const replyRes = await request(app)
      .post(`/api/v1/threads/${thread._id}/comments`)
      .set('Authorization', `Bearer ${user1.token}`)
      .send({
        parentCommentId: commentId,
        content: 'Tested it and it had no continuity at room temperature! Replacing it worked.',
        type: 'comment',
      });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.data.comment.parentComment.toString()).toBe(commentId.toString());

    // Alice OP marks Bob's answer as the accepted solution
    const solveRes = await request(app)
      .post(`/api/v1/threads/${thread._id}/comments/${commentId}/solve`)
      .set('Authorization', `Bearer ${user1.token}`);

    expect(solveRes.status).toBe(200);
    expect(solveRes.body.data.thread.status).toBe('solved');
    expect(solveRes.body.data.thread.solvedComment.toString()).toBe(commentId.toString());
    expect(solveRes.body.data.comment.isAcceptedSolution).toBe(true);

    // Fetch comments tree
    const treeRes = await request(app).get(`/api/v1/threads/${thread._id}/comments`);
    expect(treeRes.status).toBe(200);
    expect(treeRes.body.data.comments.length).toBe(1);
    expect(treeRes.body.data.comments[0].replies.length).toBe(1);
    expect(treeRes.body.data.comments[0].replies[0].content).toContain('Tested it and it had no continuity');
  });

  it('should return forum aggregated statistics', async () => {
    const statsRes = await request(app).get('/api/v1/threads/stats');
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.totalThreads).toBeGreaterThanOrEqual(0);
    expect(statsRes.body.data.solvedThreads).toBeGreaterThanOrEqual(0);
  });
});
