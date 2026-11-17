const express = require('express');
const router = express.Router();
const qController = require('../controllers/quotationController');
const { authenticate } = require('../middleware/auth');
const { requireVerifiedTechnician } = require('../middleware/professionalVerification');
const { validate } = require('../middleware/validate');
const { createQuotationSchema } = require('../validators/requestValidators');
const { writeLimiter } = require('../middleware/rateLimiter');

router.get('/:id', authenticate, requireVerifiedTechnician, qController.getQuotationById);
router.post('/:id/revise', authenticate, requireVerifiedTechnician, writeLimiter, validate(createQuotationSchema), qController.reviseQuotation);
router.post('/:id/accept', authenticate, requireVerifiedTechnician, writeLimiter, qController.acceptQuotation);
router.post('/:id/reject', authenticate, requireVerifiedTechnician, writeLimiter, qController.rejectQuotation);
router.post('/:id/withdraw', authenticate, requireVerifiedTechnician, writeLimiter, qController.withdrawQuotation);

module.exports = router;
