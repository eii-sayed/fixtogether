const express = require('express');
const router = express.Router();
const rjController = require('../controllers/repairJobController');
const { authenticate } = require('../middleware/auth');

// Inspections
router.post('/:id/owner-decision', authenticate, rjController.ownerInspectionDecision);

// Donations
router.post('/', authenticate, rjController.createDonation);
router.get('/', authenticate, rjController.getDonations);

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
notificationRouter.get('/', authenticate, rjController.getNotifications);
notificationRouter.patch('/:id/read', authenticate, rjController.markNotificationRead);
notificationRouter.patch('/read-all', authenticate, rjController.markAllNotificationsRead);

module.exports = {
  inspectionRoutes: router,
  donationRoutes: (() => { const r = express.Router();
    r.post('/', authenticate, rjController.createDonation);
    r.get('/', authenticate, rjController.getDonations);
    r.get('/:id', authenticate, rjController.getDonationById);
    r.get('/:id/matches', authenticate, rjController.getDonationMatches);
    r.post('/:id/accept', authenticate, rjController.acceptDonation);
    r.post('/:id/reject', authenticate, rjController.rejectDonation);
    r.post('/:id/schedule', authenticate, rjController.scheduleDonationPickup);
    r.post('/:id/confirm-handover', authenticate, rjController.confirmHandover);
    return r;
  })(),
  partsRoutes: partsRouter,
  warrantyRoutes: warrantyRouter,
  warrantyClaimsRoutes: warrantyClaimsRouter,
  reviewRoutes: reviewRouter,
  disputeRoutes: disputeRouter,
  notificationRoutes: notificationRouter,
};
