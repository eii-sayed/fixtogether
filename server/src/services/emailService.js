const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

// Create reusable transporter object using the default SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465, // true for 465, false for other ports
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });
};

/**
 * Send an email using SMTP
 * @param {Object} options - Email options (to, subject, html)
 */
const sendEmail = async (options) => {
  if (!config.email.user || !config.email.password) {
    logger.warn('Email service is not configured. Email will not be sent.', options.to);
    return false;
  }

  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error('Error sending email:', error.message);
    return false;
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
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #059669; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">FixTogether</h1>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #374151;">Hi ${fullName},</p>
        <p style="font-size: 16px; color: #374151;">You recently requested to reset your password for your FixTogether account. Click the button below to reset it. This link is valid for 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Your Password</a>
        </div>
        <p style="font-size: 14px; color: #6b7280;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      </div>
      <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
        &copy; ${new Date().getFullYear()} FixTogether. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Reset Your Password - FixTogether',
    html,
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
    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #059669; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">FixTogether</h1>
      </div>
      <div style="padding: 30px; text-align: center;">
        <p style="font-size: 16px; color: #374151; text-align: left;">Hi ${fullName},</p>
        <p style="font-size: 16px; color: #374151; text-align: left;">Welcome to FixTogether! To activate your account, please enter the following 6-digit verification code:</p>
        
        <div style="margin: 30px auto; padding: 15px; background-color: #ecfdf5; border: 2px dashed #059669; border-radius: 8px; display: inline-block;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #047857;">${otp}</span>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; text-align: left;">This code will expire in 15 minutes. If you did not create an account, no further action is required.</p>
      </div>
      <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
        &copy; ${new Date().getFullYear()} FixTogether. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Your Verification Code - FixTogether',
    html,
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
};
