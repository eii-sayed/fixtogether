const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const techController = require('../controllers/technicianController');
const orgController = require('../controllers/organizationController');
const catController = require('../controllers/categoryController');
const repairJobController = require('../controllers/repairJobController');
const { authenticate } = require('../middleware/auth');
const { authorize, requireAdminPermission, requireRecentAuth } = require('../middleware/authorize');
const { ROLES, ADMIN_PERMISSIONS } = require('../constants');

// All admin routes require admin role
router.use(authenticate, authorize(ROLES.ADMIN));

// 1. Dashboard & Command Center
router.get('/dashboard', adminController.getDashboard);

// 2. Unified Review Queue
router.get('/review-queue', adminController.getReviewQueue);
router.post('/review-queue/:id/assign', adminController.assignQueueItem);
router.post('/review-queue/:id/lock', adminController.acquireQueueLock);
router.delete('/review-queue/:id/lock', adminController.releaseQueueLock);
router.post('/review-queue/:id/takeover', adminController.takeoverQueueLock);
router.patch('/review-queue/:id/state', adminController.updateQueueItemState);
router.post('/review-queue/:id/notes', adminController.addQueueInternalNote);
router.post('/review-queue/bulk', adminController.bulkUpdateQueueItems);

// 3. User Governance & Moderation
router.get('/users', requireAdminPermission(ADMIN_PERMISSIONS.SUPPORT), userController.getAllUsers);
router.patch('/users/:id/status', requireAdminPermission(ADMIN_PERMISSIONS.SUPER_ADMIN), requireRecentAuth(15), userController.updateUserStatus);
router.post('/users/:id/moderate', requireAdminPermission(ADMIN_PERMISSIONS.SUPER_ADMIN), requireRecentAuth(15), userController.moderateUser);

// 4. Technician & Organization Verification
router.get('/technicians/pending', requireAdminPermission(ADMIN_PERMISSIONS.VERIFICATION), techController.getPendingTechnicians);
router.patch('/technicians/:id/verification', requireAdminPermission(ADMIN_PERMISSIONS.VERIFICATION), techController.updateVerificationStatus);
router.get('/organizations/pending', requireAdminPermission(ADMIN_PERMISSIONS.VERIFICATION), orgController.getPendingOrganizations);
router.patch('/organizations/:id/verification', requireAdminPermission(ADMIN_PERMISSIONS.VERIFICATION), orgController.updateOrgVerificationStatus);

// 5. Taxonomy, Categories & Skills
router.get('/taxonomy/impact/:type/:id', requireAdminPermission(ADMIN_PERMISSIONS.CONFIG), catController.getTaxonomyImpact);
router.post('/categories', requireAdminPermission(ADMIN_PERMISSIONS.CONFIG), catController.createCategory);
router.patch('/categories/:id', requireAdminPermission(ADMIN_PERMISSIONS.CONFIG), catController.updateCategory);
router.delete('/categories/:id', requireAdminPermission(ADMIN_PERMISSIONS.CONFIG), catController.deactivateCategory);
router.post('/skills', requireAdminPermission(ADMIN_PERMISSIONS.CONFIG), catController.createSkill);
router.patch('/skills/:id', requireAdminPermission(ADMIN_PERMISSIONS.CONFIG), catController.updateSkill);
router.post('/skills/merge', requireAdminPermission(ADMIN_PERMISSIONS.CONFIG), catController.mergeSkills);

// 6. Safety Rules & Governance
router.get('/safety-rules', requireAdminPermission(ADMIN_PERMISSIONS.SAFETY), adminController.getSafetyRules);
router.post('/safety-rules', requireAdminPermission(ADMIN_PERMISSIONS.SAFETY), adminController.createSafetyRule);
router.patch('/safety-rules/:id', requireAdminPermission(ADMIN_PERMISSIONS.SAFETY), adminController.updateSafetyRule);
router.delete('/safety-rules/:id', requireAdminPermission(ADMIN_PERMISSIONS.SAFETY), adminController.deleteSafetyRule);
router.post('/safety-rules/:id/test', requireAdminPermission(ADMIN_PERMISSIONS.SAFETY), adminController.testSafetyRule);
router.post('/safety-rules/:id/rollback', requireAdminPermission(ADMIN_PERMISSIONS.SAFETY), adminController.rollbackSafetyRule);

// 7. Flagged Listings
router.get('/flagged-listings', requireAdminPermission(ADMIN_PERMISSIONS.SAFETY), adminController.getFlaggedListings);
router.patch('/flagged-listings/:id', requireAdminPermission(ADMIN_PERMISSIONS.SAFETY), adminController.updateFlaggedListing);

// 8. Disputes Mediation Workspace
router.get('/disputes', requireAdminPermission(ADMIN_PERMISSIONS.DISPUTES), repairJobController.getDisputes);
router.get('/disputes/:id', requireAdminPermission(ADMIN_PERMISSIONS.DISPUTES), repairJobController.getDisputeById);
router.post('/disputes/:id/missing-info', requireAdminPermission(ADMIN_PERMISSIONS.DISPUTES), repairJobController.requestMissingDisputeInfo);
router.post('/disputes/:id/notes', requireAdminPermission(ADMIN_PERMISSIONS.DISPUTES), repairJobController.addDisputeInternalNote);
router.patch('/disputes/:id/resolve', requireAdminPermission(ADMIN_PERMISSIONS.DISPUTES), repairJobController.resolveDispute);

// 9. Audit Logs & System Health
router.get('/audit-logs', requireAdminPermission(ADMIN_PERMISSIONS.AUDIT), adminController.getAuditLogs);
router.get('/impact', adminController.getImpactStats);
router.get('/ai-analytics', requireAdminPermission(ADMIN_PERMISSIONS.AUDIT), adminController.getAIAnalytics);

// 10. Asynchronous Background Jobs
router.post('/jobs', adminController.createAdminBackgroundJob);
router.get('/jobs/:jobId', adminController.getAdminBackgroundJobStatus);

module.exports = router;
