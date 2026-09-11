const express = require('express');
const router = express.Router();
const rjController = require('../controllers/repairJobController');
const orgController = require('../controllers/organizationController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { ROLES } = require('../constants');

// Inspections
router.post('/:id/owner-decision', authenticate, rjController.ownerInspectionDecision);

// Parts
const partsRouter = express.Router();
partsRouter.post('/', authenticate, rjController.createPart);
partsRouter.get('/', authenticate, rjController.getParts);
partsRouter.get('/:id', authenticate, rjController.getPartById);
partsRouter.patch('/:id', authenticate, rjController.updatePart);
partsRouter.post('/:id/reserve', authenticate, rjController.reservePart);

// Warranties
const warrantyRouter = express.Router();
warrantyRouter.get('/', authenticate, rjController.getWarranties);
warrantyRouter.get('/:id', authenticate, rjController.getWarrantyById);
warrantyRouter.post('/:id/claims', authenticate, rjController.submitWarrantyClaim);

// Warranty claims
const warrantyClaimsRouter = express.Router();
warrantyClaimsRouter.patch('/:id/status', authenticate, rjController.updateWarrantyClaimStatus);

// Reviews
const reviewRouter = express.Router();
reviewRouter.patch('/:id', authenticate, rjController.updateReview);
reviewRouter.delete('/:id', authenticate, rjController.deleteReview);

// Disputes
const disputeRouter = express.Router();
disputeRouter.get('/', authenticate, rjController.getDisputes);
disputeRouter.get('/:id', authenticate, rjController.getDisputeById);
disputeRouter.post('/:id/responses', authenticate, rjController.addDisputeResponse);

// Notifications
const notificationRouter = express.Router();
notificationRouter.get('/unread-count', authenticate, rjController.getNotificationUnreadCount);
notificationRouter.get('/', authenticate, rjController.getNotifications);
notificationRouter.patch('/read-all', authenticate, rjController.markAllNotificationsRead);
notificationRouter.patch('/:id/read', authenticate, rjController.markNotificationRead);

// Donation Operations Router
const donationRouter = express.Router();

// Community Needs
donationRouter.get('/needs', authenticate, orgController.getCommunityNeeds);
donationRouter.post(
  '/needs',
  authenticate,
  authorize(ROLES.ORGANIZATION, ROLES.ADMIN),
  orgController.createCommunityNeed
);
donationRouter.patch(
  '/needs/:id',
  authenticate,
  authorize(ROLES.ORGANIZATION, ROLES.ADMIN),
  orgController.updateCommunityNeedStatus
);

// Donation Offers & Operations
donationRouter.get('/offers', authenticate, orgController.getDonationOffers);
donationRouter.get(
  '/offers/:id/match-explanation',
  authenticate,
  authorize(ROLES.ORGANIZATION, ROLES.ADMIN),
  orgController.getOfferMatchExplanation
);
donationRouter.post(
  '/offers/:id/decision',
  authenticate,
  authorize(ROLES.ORGANIZATION, ROLES.ADMIN),
  orgController.decideDonationOffer
);
donationRouter.post(
  '/offers/:id/schedule-handover',
  authenticate,
  authorize(ROLES.ORGANIZATION, ROLES.ADMIN),
  orgController.scheduleDonationHandover
);
donationRouter.post(
  '/offers/:id/confirm-receipt',
  authenticate,
  authorize(ROLES.ORGANIZATION, ROLES.ADMIN),
  orgController.confirmDonationReceipt
);
donationRouter.post(
  '/offers/:id/inspect',
  authenticate,
  authorize(ROLES.ORGANIZATION, ROLES.ADMIN),
  orgController.submitDonationInspection
);
donationRouter.post(
  '/offers/:id/process-outcome',
  authenticate,
  authorize(ROLES.ORGANIZATION, ROLES.ADMIN),
  orgController.recordProcessingOutcome
);

// Legacy compatibility routes
donationRouter.post('/', authenticate, rjController.createDonation);
donationRouter.get('/', authenticate, orgController.getDonationOffers);
donationRouter.get('/:id', authenticate, rjController.getDonationById);
donationRouter.get('/:id/matches', authenticate, rjController.getDonationMatches);
donationRouter.post('/:id/accept', authenticate, orgController.decideDonationOffer);
donationRouter.post('/:id/reject', authenticate, orgController.decideDonationOffer);
donationRouter.post('/offers/:id/cancel', authenticate, rjController.cancelDonationOffer);
donationRouter.post('/:id/cancel', authenticate, rjController.cancelDonationOffer);
donationRouter.post('/:id/schedule', authenticate, orgController.scheduleDonationHandover);
donationRouter.post('/:id/confirm-handover', authenticate, rjController.confirmHandover);

module.exports = {
  inspectionRoutes: router,
  donationRoutes: donationRouter,
  partsRoutes: partsRouter,
  warrantyRoutes: warrantyRouter,
  warrantyClaimsRoutes: warrantyClaimsRouter,
  reviewRoutes: reviewRouter,
  disputeRoutes: disputeRouter,
  notificationRoutes: notificationRouter,
};
