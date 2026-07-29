const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { uploadMultipleImages } = require('../middleware/upload');
const { validate } = require('../middleware/validate');
const { createItemSchema } = require('../validators/requestValidators');
const { ROLES } = require('../constants');

router.post('/', authenticate, authorize(ROLES.OWNER), validate(createItemSchema), itemController.createItem);
router.get('/', authenticate, itemController.getItems);
router.get('/:id', authenticate, itemController.getItemById);
router.patch('/:id', authenticate, authorize(ROLES.OWNER), itemController.updateItem);
router.delete('/:id', authenticate, authorize(ROLES.OWNER), itemController.deleteItem);
router.post('/:id/images', authenticate, authorize(ROLES.OWNER), uploadMultipleImages('images', 10), itemController.uploadItemImages);

module.exports = router;
