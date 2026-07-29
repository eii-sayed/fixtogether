const express = require('express');
const router = express.Router();
const catController = require('../controllers/categoryController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { ROLES } = require('../constants');

// Public
router.get('/categories', catController.getCategories);
router.get('/skills', catController.getSkills);

module.exports = router;
