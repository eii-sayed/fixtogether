const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validators/authValidators');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again later.' } });

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshTokenHandler);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
