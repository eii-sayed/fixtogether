const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const config = require('../../src/config');
const { User, TechnicianProfile, OrganizationProfile } = require('../../src/models');
const { ROLES, VERIFICATION_STATUS } = require('../../src/constants');

const tokenFor = (user) => jwt.sign({
  userId: user._id,
  role: user.role,
  authTime: Math.floor(Date.now() / 1000),
}, config.jwt.accessSecret, { expiresIn: '1h' });

describe('professional verification gate', () => {
  let admin;
  let technician;
  let organization;

  beforeEach(async () => {
    admin = await User.create({
      fullName: 'Verification Administrator', email: 'verification-admin@fixtogether.test',
      passwordHash: 'AdminPassword123!', role: ROLES.ADMIN, emailVerified: true,
      adminPermissions: ['verification'],
    });
    technician = await User.create({
      fullName: 'Pending Technician', email: 'pending-tech@fixtogether.test',
      passwordHash: 'Password123!', role: ROLES.TECHNICIAN, emailVerified: true,
    });
    organization = await User.create({
      fullName: 'Pending Organization', email: 'pending-org@fixtogether.test',
      passwordHash: 'Password123!', role: ROLES.ORGANIZATION, emailVerified: true,
    });
    await TechnicianProfile.create({
      user: technician._id,
      verificationStatus: VERIFICATION_STATUS.PENDING,
      verificationDocuments: [{ type: 'government_id', url: 'https://example.test/tech-id.pdf' }],
    });
    await OrganizationProfile.create({
      user: organization._id,
      organizationName: 'Pending Organization',
      organizationType: 'donation_organization',
      verificationStatus: VERIFICATION_STATUS.PENDING,
      verificationDocuments: [{ type: 'legal_registration', url: 'https://example.test/org-registration.pdf' }],
    });
  });

  it('blocks a pending technician, then enables access only after admin approval', async () => {
    const blocked = await request(app)
      .get('/api/v1/repair-requests')
      .set('Authorization', `Bearer ${tokenFor(technician)}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('PROFESSIONAL_VERIFICATION_REQUIRED');

    const approved = await request(app)
      .patch(`/api/v1/admin/technicians/${technician._id}/verification`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({
        verificationStatus: VERIFICATION_STATUS.APPROVED,
        approvalChecklist: { identityVerified: true, credentialsChecked: true, documentsValid: true },
      });
    expect(approved.status).toBe(200);

    const allowed = await request(app)
      .get('/api/v1/repair-requests')
      .set('Authorization', `Bearer ${tokenFor(technician)}`);
    expect(allowed.status).toBe(200);
  });

  it('does not expose verification document URLs in the pending-admin list', async () => {
    const response = await request(app)
      .get('/api/v1/admin/technicians/pending')
      .set('Authorization', `Bearer ${tokenFor(admin)}`);

    expect(response.status).toBe(200);
    const document = response.body.data.technicians[0].verificationDocuments[0];
    expect(document.url).toBeUndefined();
    expect(document.publicId).toBeUndefined();
    expect(document.type).toBe('government_id');
  });

  it('blocks a pending organization, then enables workspace access after approval', async () => {
    const blocked = await request(app)
      .get('/api/v1/organizations/me/workspace')
      .set('Authorization', `Bearer ${tokenFor(organization)}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('PROFESSIONAL_VERIFICATION_REQUIRED');

    const approved = await request(app)
      .patch(`/api/v1/admin/organizations/${organization._id}/verification`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({
        verificationStatus: VERIFICATION_STATUS.APPROVED,
        approvalChecklist: { identityVerified: true, credentialsChecked: true, documentsValid: true },
      });
    expect(approved.status).toBe(200);

    const allowed = await request(app)
      .get('/api/v1/organizations/me/workspace')
      .set('Authorization', `Bearer ${tokenFor(organization)}`);
    expect(allowed.status).toBe(200);
  });
});
