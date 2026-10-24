const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Checks whether outbound email sending is properly configured
 * @returns {boolean}
 */
const isEmailConfigured = () => {
  return Boolean(config.email.user && config.email.password);
};

/**
 * Provides safe diagnostic info for health check endpoints
 * @returns {Object}
 */
const getEmailStatus = () => {
  return {
    configured: isEmailConfigured(),
    host: config.email.host,
    port: config.email.port,
    user: config.email.user ? config.email.user.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null,
    from: config.email.from,
  };
};

/**
 * Create reusable transporter object using the default SMTP transport
 */
const createTransporter = () => {
  const isSecure = config.email.port === 465;
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: isSecure,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
    tls: {
      rejectUnauthorized: config.env === 'production',
    },
    connectionTimeout: 8000, // 8s connection timeout to prevent hanging
    greetingTimeout: 8000,   // 8s greeting timeout
    socketTimeout: 10000,    // 10s socket timeout
  });
};

/**
 * Send an email using SMTP
 * @param {Object} options - Email options (to, subject, html, text)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendEmail = async (options) => {
  if (!isEmailConfigured()) {
    logger.warn(`[EMAIL] Service is not configured. Email cannot be dispatched to: ${options.to}`);
    return { success: false, error: 'Email service is not configured on this server.' };
  }

  try {
    const transporter = createTransporter();

    // Generate clean plaintext fallback if none provided to prevent anti-spam quarantine
    let textContent = options.text;
    if (!textContent && options.html) {
      textContent = options.html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const mailOptions = {
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: textContent,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`[EMAIL] Successfully dispatched to ${options.to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`[EMAIL] Error dispatching to ${options.to}: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Send a password reset email
 * @param {string} to - User's email address
 * @param {string} token - The raw reset token
 * @param {string} fullName - User's full name
 */
const sendPasswordResetEmail = async (to, token, fullName) => {
  const resetUrl = `${config.clientUrl}/reset-password?token=${token}`;
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #059669; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800;">FixTogether</h1>
        <p style="color: #d1fae5; margin: 4px 0 0 0; font-size: 13px;">Community Repair & Sustainability</p>
      </div>
      <div style="padding: 32px 28px;">
        <p style="font-size: 16px; color: #1f2937; margin: 0 0 16px 0;">Hi <strong>${fullName || 'there'}</strong>,</p>
        <p style="font-size: 15px; color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">You recently requested to reset your password for your FixTogether account. Click the button below to choose a new password. This link is valid for 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">Reset Your Password</a>
        </div>
        <p style="font-size: 13px; color: #6b7280; line-height: 1.5; margin: 24px 0 0 0;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      </div>
      <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
        &copy; ${new Date().getFullYear()} FixTogether. All rights reserved.
      </div>
    </div>
  `;

  const text = `Hi ${fullName || 'there'},\n\nYou recently requested to reset your password for FixTogether.\n\nReset your password using this link:\n${resetUrl}\n\nThis link is valid for 1 hour. If you did not request this, please safely ignore this email.\n\nFixTogether Team`;

  return sendEmail({
    to,
    subject: 'Reset Your Password - FixTogether',
    html,
    text,
  });
};

/**
 * Send an email verification OTP
 * @param {string} to - User's email address
 * @param {string} otp - The 6-digit verification code
 * @param {string} fullName - User's full name
 */
const sendVerificationEmail = async (to, otp, fullName) => {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
      <div style="background-color: #059669; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">FixTogether</h1>
        <p style="color: #d1fae5; margin: 4px 0 0 0; font-size: 13px;">Community Repair & Sustainability</p>
      </div>
      <div style="padding: 32px 28px; text-align: center;">
        <p style="font-size: 16px; color: #1f2937; text-align: left; margin: 0 0 16px 0;">Hi <strong>${fullName || 'there'}</strong>,</p>
        <p style="font-size: 15px; color: #4b5563; text-align: left; line-height: 1.6; margin: 0 0 24px 0;">Welcome to FixTogether! To activate and secure your account, please enter the following 6-digit verification code:</p>
        
        <div style="margin: 24px auto; padding: 18px 28px; background-color: #ecfdf5; border: 2px dashed #059669; border-radius: 12px; display: inline-block;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #047857; font-family: monospace;">${otp}</span>
        </div>
        
        <p style="font-size: 13px; color: #6b7280; text-align: left; line-height: 1.5; margin: 24px 0 0 0;">
          ⏱️ <strong>This code will expire in 15 minutes.</strong><br/>
          If you did not create an account with FixTogether, no further action is required.
        </p>
      </div>
      <div style="background-color: #f9fafb; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6;">
        &copy; ${new Date().getFullYear()} FixTogether. All rights reserved.
      </div>
    </div>
  `;

  const text = `Hi ${fullName || 'there'},\n\nWelcome to FixTogether!\n\nYour 6-digit verification code is: ${otp}\n\nThis code will expire in 15 minutes.\n\nIf you did not create an account, no further action is required.\n\nFixTogether Team`;

  return sendEmail({
    to,
    subject: `Your FixTogether Verification Code: ${otp}`,
    html,
    text,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  isEmailConfigured,
  getEmailStatus,
};
