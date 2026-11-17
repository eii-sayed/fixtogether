const express = require('express');
const router = express.Router();
const qController = require('../controllers/quotationController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createQuotationSchema } = require('../validators/requestValidators');
const { writeLimiter } = require('../middleware/rateLimiter');

router.get('/:id', authenticate, qController.getQuotationById);
router.post('/:id/revise', authenticate, writeLimiter, validate(createQuotationSchema), qController.reviseQuotation);
router.post('/:id/accept', authenticate, writeLimiter, qController.acceptQuotation);
router.post('/:id/reject', authenticate, writeLimiter, qController.rejectQuotation);
router.post('/:id/withdraw', authenticate, writeLimiter, qController.withdrawQuotation);

module.exports = router;
