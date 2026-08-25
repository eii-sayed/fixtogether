const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const config = require('../../src/config');
const {
  User,
  OrganizationProfile,
  DonationOffer,
  DonationNeed,
  ImpactRecord,
  ItemCategory,
  Item,
} = require('../../src/models');
const {
  ROLES,
  VERIFICATION_STATUS,
  DONATION_STATUS,
  COMMUNITY_NEED_STATUS,
  INSPECTION_OUTCOMES,
  PROCESSING_OUTCOMES,
} = require('../../src/constants');

const createToken = (payload) => {
  return jwt.sign(payload, config.jwt.accessSecret, { expiresIn: '1h' });
};

describe('Organization Operations & Donation Lifecycle API', () => {
  let orgUser, orgToken, orgProfile;
  let ownerUser, ownerToken;
  let category, item, donationOffer;

  beforeEach(async () => {
    // 1. Create Organization User & Profile
    orgUser = await User.create({
      fullName: 'GreenTech NGO Hub',
      email: 'org@greentech.org',
      passwordHash: 'OrgPassword123!',
      role: ROLES.ORGANIZATION,
      accountStatus: 'active',
      emailVerified: true,
    });
    orgToken = createToken({ userId: orgUser._id, role: ROLES.ORGANIZATION, email: orgUser.email });

    category = await ItemCategory.create({
      name: 'Laptops & Computers',
      slug: 'laptops-computers',
      riskLevel: 'low',
    });

    orgProfile = await OrganizationProfile.create({
      user: orgUser._id,
      organizationName: 'GreenTech NGO Hub',
      organizationType: 'donation_organization',
      verificationStatus: VERIFICATION_STATUS.APPROVED,
      acceptedItemCategories: [category._id],
      neededItemCategories: [category._id],
      pickupAvailable: true,
      dropoffAvailable: true,
      locations: [
        {
          name: 'Main Mirpur Hub',
          address: 'Plot 42, Section 10',
          city: 'Dhaka',
          operatingHours: 'Mon-Fri 09:00 - 18:00',
          status: 'active',
          capacityLimit: 100,
        },
      ],
    });

    // 2. Create Owner User & Donated Item
    ownerUser = await User.create({
      fullName: 'Community Donor',
      email: 'donor@gmail.com',
      passwordHash: 'DonorPassword123!',
      role: ROLES.OWNER,
      accountStatus: 'active',
      emailVerified: true,
    });
    ownerToken = createToken({ userId: ownerUser._id, role: ROLES.OWNER, email: ownerUser.email });

    item = await Item.create({
      owner: ownerUser._id,
      title: 'ThinkPad T480 Core i5',
      category: category._id,
      condition: 'good',
    });

    donationOffer = await DonationOffer.create({
      item: item._id,
      owner: ownerUser._id,
      category: category._id,
      title: 'ThinkPad T480 Core i5',
      description: 'Fully functional, includes charger. Upgraded to 16GB RAM.',
      itemCondition: 'good',
      quantity: 1,
      estimatedWeight: 1.8,
      preferredHandover: 'dropoff',
      status: DONATION_STATUS.PUBLISHED,
      dataBearing: {
        isDataBearing: true,
        donorWarningAcknowledged: true,
        dataErasureConsent: true,
      },
    });
  });

  describe('GET /api/v1/organizations/me/workspace', () => {
    it('should return operational action queues, pending offers, and verified impact stats', async () => {
      const res = await request(app)
        .get('/api/v1/organizations/me/workspace')
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profile.organizationName).toBe('GreenTech NGO Hub');
      expect(res.body.data.urgentActions).toBeDefined();
      expect(res.body.data.queues.offersAwaitingDecision.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Donation Offer Decision & Matching Workflow', () => {
    it('should calculate transparent matching explanation breakdown', async () => {
      const res = await request(app)
        .get(`/api/v1/donations/offers/${donationOffer._id}/match-explanation`)
        .set('Authorization', `Bearer ${orgToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.matchAnalysis.totalScore).toBeGreaterThanOrEqual(50);
      expect(res.body.data.matchAnalysis.positiveMatches.length).toBeGreaterThanOrEqual(1);
    });

    it('should accept offer atomically and transition status to accepted', async () => {
      const res = await request(app)
        .post(`/api/v1/donations/offers/${donationOffer._id}/decision`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          decision: 'accept',
          donorExplanation: 'We would love to use this for our youth coding lab.',
          expectedVersion: donationOffer.version,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.offer.status).toBe(DONATION_STATUS.ACCEPTED);
      expect(res.body.data.offer.selectedOrganization.toString()).toBe(orgProfile._id.toString());
      expect(res.body.data.offer.version).toBe(2);
    });

    it('should prevent acceptance if organization is not approved', async () => {
      // Create unverified organization
      const unverifiedUser = await User.create({
        fullName: 'Unverified Org',
        email: 'unverified@org.test',
        passwordHash: 'Pass123!',
        role: ROLES.ORGANIZATION,
      });
      await OrganizationProfile.create({
        user: unverifiedUser._id,
        organizationName: 'Pending Org',
        organizationType: 'donation_organization',
        verificationStatus: VERIFICATION_STATUS.PENDING,
      });
      const unverifiedToken = createToken({ userId: unverifiedUser._id, role: ROLES.ORGANIZATION });

      const res = await request(app)
        .post(`/api/v1/donations/offers/${donationOffer._id}/decision`)
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({ decision: 'accept' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Approved organization verification');
    });

    it('should reject stale updates with 409 conflict when version mismatches', async () => {
      const res = await request(app)
        .post(`/api/v1/donations/offers/${donationOffer._id}/decision`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          decision: 'accept',
          expectedVersion: 999, // Stale version
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('RESOURCE_VERSION_CONFLICT');
    });
  });

  describe('Handover, Receipt & Technical Inspection', () => {
    beforeEach(async () => {
      // Accept offer first
      await request(app)
        .post(`/api/v1/donations/offers/${donationOffer._id}/decision`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({ decision: 'accept' });
    });

    it('should schedule collection handover and generate confirmation code', async () => {
      const scheduleDate = new Date(Date.now() + 24 * 3600 * 1000);
      const res = await request(app)
        .post(`/api/v1/donations/offers/${donationOffer._id}/schedule-handover`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          scheduledDate: scheduleDate.toISOString(),
          timeWindow: '10:00 - 14:00',
          method: 'dropoff',
          hubId: orgProfile.locations[0]._id,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.offer.status).toBe(DONATION_STATUS.HANDOVER_SCHEDULED);
      expect(res.body.data.confirmationCode).toBeDefined();
    });

    it('should prevent scheduling handover at inactive or closed collection hubs', async () => {
      // Add inactive hub
      orgProfile.locations.push({
        name: 'Closed Branch',
        status: 'temporarily_closed',
      });
      await orgProfile.save();
      const closedHubId = orgProfile.locations[orgProfile.locations.length - 1]._id;

      const res = await request(app)
        .post(`/api/v1/donations/offers/${donationOffer._id}/schedule-handover`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          scheduledDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          hubId: closedHubId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('inactive or temporarily closed');
    });

    it('should verify receipt and submit technical inspection checklist', async () => {
      // 1. Confirm Receipt
      const recvRes = await request(app)
        .post(`/api/v1/donations/offers/${donationOffer._id}/confirm-receipt`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({});

      expect(recvRes.status).toBe(200);
      expect(recvRes.body.data.offer.status).toBe(DONATION_STATUS.RECEIVED);

      // 2. Submit Technical Inspection
      const inspectRes = await request(app)
        .post(`/api/v1/donations/offers/${donationOffer._id}/inspect`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          checklist: {
            itemIdentityVerified: true,
            powerStateWorking: true,
            functionalityTested: true,
            safetyClearance: true,
            dataComponentsChecked: true,
          },
          outcome: INSPECTION_OUTCOMES.ACCEPTED_WORKING,
          publicNotes: 'Inspected and certified for student laboratory use.',
        });

      expect(inspectRes.status).toBe(200);
      expect(inspectRes.body.data.offer.status).toBe(DONATION_STATUS.INSPECTED);
      expect(inspectRes.body.data.offer.inspection.outcome).toBe(INSPECTION_OUTCOMES.ACCEPTED_WORKING);
    });
  });

  describe('Processing Outcome & Audited Impact Deduplication', () => {
    beforeEach(async () => {
      // Advance to inspected
      donationOffer.status = DONATION_STATUS.INSPECTED;
      donationOffer.selectedOrganization = orgProfile._id;
      await donationOffer.save();
    });

    it('should record final redistribution outcome and create verified ImpactRecord', async () => {
      const res = await request(app)
        .post(`/api/v1/donations/offers/${donationOffer._id}/process-outcome`)
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          outcome: PROCESSING_OUTCOMES.REDISTRIBUTED,
          measuredWeight: 1.8,
          weightMethod: 'measured',
          replacementValueEstimate: 35000,
          team: 'STEM Youth Lab Deployment',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.offer.status).toBe(DONATION_STATUS.COMPLETED);
      expect(res.body.data.impactRecord).toBeDefined();
      expect(res.body.data.impactRecord.measuredWeight).toBe(1.8);

      // Verify deduplication
      const impactCount = await ImpactRecord.countDocuments({ sourceDonation: donationOffer._id });
      expect(impactCount).toBe(1);
    });
  });

  describe('Community Needs Management', () => {
    it('should publish a 5-step community need with separate quantity accounting', async () => {
      const res = await request(app)
        .post('/api/v1/donations/needs')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          title: '20 Desktops for Community Digital Library',
          category: category._id,
          urgency: 'high',
          quantityRequested: 20,
          minimumCondition: 'fair',
          requiredSpecifications: ['Intel Core i3 or AMD Ryzen 3', '8GB RAM'],
          beneficiaryContext: 'Public rural learning initiative.',
          targetDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.need.quantityRequested).toBe(20);
      expect(res.body.data.need.quantityReceived).toBe(0);
      expect(res.body.data.need.status).toBe(COMMUNITY_NEED_STATUS.PUBLISHED);
    });

    it('should prevent duplicate publication with exact title within 24 hours', async () => {
      await DonationNeed.create({
        organization: orgProfile._id,
        title: 'Duplicate Need Test',
        category: category._id,
        status: COMMUNITY_NEED_STATUS.PUBLISHED,
      });

      const res = await request(app)
        .post('/api/v1/donations/needs')
        .set('Authorization', `Bearer ${orgToken}`)
        .send({
          title: 'Duplicate Need Test',
          category: category._id,
          quantityRequested: 5,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('recently published');
    });
  });
});
