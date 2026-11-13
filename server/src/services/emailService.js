const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Checks whether outbound email sending is properly configured
 * Checks for Resend API key, SendGrid API key, or SMTP user & password.
 * @returns {boolean}
 */
const isEmailConfigured = () => {
  if (config.email.provider === 'resend') return Boolean(config.email.resendApiKey);
  if (config.email.provider === 'sendgrid') return Boolean(config.email.sendgridApiKey);
  if (config.email.provider === 'smtp' || config.email.provider === 'gmail') {
    return Boolean(config.email.user && config.email.password);
  }
  return false;
};

/**
 * Returns the active email delivery provider
 * @returns {'resend'|'sendgrid'|'gmail'|'smtp'|'unconfigured'}
 */
const getActiveEmailProvider = () => {
  if (!isEmailConfigured()) return 'unconfigured';
  if (config.email.provider === 'resend') return 'resend';
  if (config.email.provider === 'sendgrid') return 'sendgrid';
  if (config.email.user && config.email.password) {
    if (config.email.provider === 'gmail' || config.email.host?.includes('gmail.com')) return 'gmail';
    return 'smtp';
  }
  return 'unconfigured';
};

/**
 * Provides safe diagnostic info for health check endpoints
 * @returns {Object}
 */
const getEmailStatus = () => {
  const provider = getActiveEmailProvider();
  return {
    configured: isEmailConfigured(),
    provider,
    host: config.email.host,
    port: config.email.port,
    user: config.email.user ? config.email.user.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null,
    from: config.email.from,
    hasResendApiKey: Boolean(config.email.resendApiKey),
    hasSendgridApiKey: Boolean(config.email.sendgridApiKey),
  };
};

/**
 * Create reusable transporter object for SMTP delivery
 */
const createTransporter = () => {
  const isGmail = config.email.provider === 'gmail' || config.email.host?.includes('gmail.com');
  const isSecure = config.email.port === 465;

  const transportOptions = {
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
    tls: {
      rejectUnauthorized: config.env === 'production',
    },
    connectionTimeout: 10000, // 10s connection timeout
    greetingTimeout: 10000,   // 10s greeting timeout
    socketTimeout: 15000,    // 15s socket timeout
  };

  if (isGmail) {
    // Gmail-specific configuration for highest reliability
    return nodemailer.createTransport({
      service: 'gmail',
      ...transportOptions,
    });
  }

  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: isSecure,
    ...transportOptions,
  });
};

/**
 * Send an email via Resend REST API (HTTPS - bypasses blocked SMTP ports)
 */
const sendViaResend = async (options, textContent) => {
  const apiKey = config.email.resendApiKey;
  logger.info(`[EMAIL:RESEND] Initiating REST API dispatch to: ${options.to}`);

  const payload = {
    from: config.email.from,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    text: textContent,
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  const resJson = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = resJson?.message || response.statusText;
    logger.error(`[EMAIL:RESEND] API error (${response.status}): ${errorMsg}`);
    return { success: false, error: errorMsg, provider: 'resend' };
  }

  logger.info(`[EMAIL:RESEND] Successfully dispatched to ${options.to}: ID ${resJson.id}`);
  return { success: true, messageId: resJson.id, provider: 'resend' };
};

/**
 * Send an email via SendGrid REST API (HTTPS - bypasses blocked SMTP ports)
 */
const sendViaSendGrid = async (options, textContent) => {
  const apiKey = config.email.sendgridApiKey;
  logger.info(`[EMAIL:SENDGRID] Initiating REST API dispatch to: ${options.to}`);

  // Extract email from "FixTogether <email@domain>" format
  const fromMatch = config.email.from.match(/<([^>]+)>/);
  const fromEmail = fromMatch ? fromMatch[1] : config.email.from;
  const fromNameMatch = config.email.from.match(/^([^<]+)/);
  const fromName = fromNameMatch ? fromNameMatch[1].trim() : 'FixTogether';

  const payload = {
    personalizations: [{
      to: (Array.isArray(options.to) ? options.to : [options.to]).map((email) => ({ email })),
    }],
    from: { email: fromEmail, name: fromName },
    subject: options.subject,
    content: [
      { type: 'text/plain', value: textContent },
      { type: 'text/html', value: options.html },
    ],
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.error(`[EMAIL:SENDGRID] API error (${response.status}): ${errText}`);
    return { success: false, error: errText, provider: 'sendgrid' };
  }

  const messageId = response.headers.get('x-message-id') || `sg_${Date.now()}`;
  logger.info(`[EMAIL:SENDGRID] Successfully dispatched to ${options.to}: ID ${messageId}`);
  return { success: true, messageId, provider: 'sendgrid' };
};

/**
 * Send an email using SMTP (Nodemailer)
 */
const sendViaSmtp = async (options, textContent) => {
  const isGmail = config.email.provider === 'gmail' || config.email.host?.includes('gmail.com');
  const provider = isGmail ? 'gmail' : 'smtp';
  logger.info(`[EMAIL:${provider.toUpperCase()}] Connecting to SMTP server ${config.email.host}:${config.email.port} as ${config.email.user}...`);

  const transporter = createTransporter();

  // If using Gmail SMTP, align the from address with the authenticated Gmail account
  // to prevent Gmail 550 or silent drops
  let fromAddress = config.email.from;
  if (isGmail && config.email.user && !fromAddress.includes(config.email.user)) {
    logger.warn(`[EMAIL:GMAIL] From header was adjusted to match authenticated user ${config.email.user} for SPF/DMARC delivery compliance.`);
    fromAddress = `FixTogether <${config.email.user}>`;
  }

  const mailOptions = {
    from: fromAddress,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: textContent,
    headers: {
      'X-Entity-Ref-ID': `ft-${Date.now()}`,
    },
  };

  const info = await transporter.sendMail(mailOptions);
  logger.info(`[EMAIL:${provider.toUpperCase()}] Successfully dispatched to ${options.to}: ${info.messageId}`);
  return { success: true, messageId: info.messageId, provider };
};

/**
 * Send an email using the best configured provider
 * @param {Object} options - Email options (to, subject, html, text)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string, simulated?: boolean, provider?: string}>}
 */
const sendEmail = async (options) => {
  const cleanTo = Array.isArray(options.to) ? options.to.join(', ') : (options.to || '').trim();

  // Generate clean plaintext fallback if none provided to pass spam checks
  let textContent = options.text;
  if (!textContent && options.html) {
    textContent = options.html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 1. Check if email service is configured
  if (!isEmailConfigured()) {
    logger.warn(`[EMAIL] ⚠️ Outbound email provider is NOT configured. Email cannot be delivered to: ${cleanTo}`);
    logger.warn('[EMAIL] Configure EMAIL_PROVIDER and its matching credentials to enable outbound email.');

    // In development or test, provide simulated success so workflows aren't blocked
    if (config.env === 'development' || config.env === 'test') {
      logger.info(`[EMAIL DEV SIMULATION] Recipient: ${cleanTo} | Subject: "${options.subject}"`);
      return {
        success: true,
        messageId: `simulated_${Date.now()}`,
        simulated: true,
        provider: 'simulation',
      };
    }

    return {
      success: false,
      error: 'Email service is not configured on this server.',
      provider: 'unconfigured',
    };
  }

  try {
    // 2. Dispatch via active provider
    if (config.email.provider === 'resend') {
      return await sendViaResend(options, textContent);
    }

    if (config.email.provider === 'sendgrid') {
      return await sendViaSendGrid(options, textContent);
    }

    // SMTP / Gmail fallback
    return await sendViaSmtp(options, textContent);
  } catch (error) {
    logger.error(`[EMAIL] ❌ Error dispatching email to ${cleanTo}: ${error.message}`, {
      code: error.code,
      command: error.command,
      stack: error.stack,
    });
    return { success: false, error: error.message, code: error.code };
  }
};

/**
 * Diagnostic helper to verify SMTP / Provider connection
 * @returns {Promise<{success: boolean, message: string}>}
 */
const verifyEmailTransport = async () => {
  if (!isEmailConfigured()) {
    return { success: false, message: 'Email service is not configured.' };
  }

  try {
    const provider = getActiveEmailProvider();
    if (provider === 'resend' || provider === 'sendgrid') {
      return {
        success: true,
        message: `${provider} credentials are configured; delivery will be verified on the first email send.`,
      };
    }

    const transporter = createTransporter();
    await transporter.verify();
    return { success: true, message: `SMTP connection to ${config.email.host}:${config.email.port} verified successfully.` };
  } catch (error) {
    return { success: false, message: `Email transport verification failed: ${error.message}` };
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
  verifyEmailTransport,
  getActiveEmailProvider,
};
