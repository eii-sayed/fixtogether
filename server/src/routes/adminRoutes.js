const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const userController = require('../controllers/userController');
const techController = require('../controllers/technicianController');
const orgController = require('../controllers/organizationController');
const catController = require('../controllers/categoryController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { ROLES } = require('../constants');

// All admin routes require admin role
router.use(authenticate, authorize(ROLES.ADMIN));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Users
router.get('/users', userController.getAllUsers);
router.patch('/users/:id/status', userController.updateUserStatus);

// Technician verification
router.get('/technicians/pending', techController.getPendingTechnicians);
router.patch('/technicians/:id/verification', techController.updateVerificationStatus);

// Organization verification
router.get('/organizations/pending', orgController.getPendingOrganizations);
router.patch('/organizations/:id/verification', orgController.updateOrgVerificationStatus);

// Categories
router.post('/categories', catController.createCategory);
router.patch('/categories/:id', catController.updateCategory);
router.delete('/categories/:id', catController.deactivateCategory);

// Skills
router.post('/skills', catController.createSkill);
router.patch('/skills/:id', catController.updateSkill);

// Safety rules
router.get('/safety-rules', adminController.getSafetyRules);
router.post('/safety-rules', adminController.createSafetyRule);
router.patch('/safety-rules/:id', adminController.updateSafetyRule);
router.delete('/safety-rules/:id', adminController.deleteSafetyRule);

// Audit logs
router.get('/audit-logs', adminController.getAuditLogs);

// Impact
router.get('/impact', adminController.getImpactStats);

// AI analytics
router.get('/ai-analytics', adminController.getAIAnalytics);

// Flagged listings
router.get('/flagged-listings', adminController.getFlaggedListings);
router.patch('/flagged-listings/:id', adminController.updateFlaggedListing);

// Disputes
router.patch('/disputes/:id/resolve', require('../controllers/repairJobController').resolveDispute);

module.exports = router;
