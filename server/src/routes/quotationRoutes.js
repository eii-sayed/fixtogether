const express = require('express');
const router = express.Router();
const qController = require('../controllers/quotationController');
const { authenticate } = require('../middleware/auth');

router.get('/:id', authenticate, qController.getQuotationById);
router.post('/:id/revise', authenticate, qController.reviseQuotation);
router.post('/:id/accept', authenticate, qController.acceptQuotation);
router.post('/:id/reject', authenticate, qController.rejectQuotation);
router.post('/:id/withdraw', authenticate, qController.withdrawQuotation);

module.exports = router;
