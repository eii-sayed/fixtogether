const express = require('express');
const router = express.Router();
const catController = require('../controllers/categoryController');
// Public
router.get('/categories', catController.getCategories);
router.get('/skills', catController.getSkills);

module.exports = router;
