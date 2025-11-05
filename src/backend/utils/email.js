import nodemailer from 'nodemailer';
import { logger } from './logger.js';

async function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Ethereal for development/testing
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }
}

export async function sendPasswordResetEmail(toEmail, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
  const link = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}`;
  
  const transporter = await createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'MDP <no-reply@mdp.local>',
    to: toEmail,
    subject: 'Reset your password - Micro Donation Platform',
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the button below to set a new password:</p>
      <p>
        <a href="${link}" style="
          display: inline-block;
          padding: 10px 20px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 10px 0;">
          Reset Password
        </a>
      </p>
      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      <p>This link will expire in 1 hour.</p>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p>${link}</p>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    info,
    previewUrl: nodemailer.getTestMessageUrl(info),
    link,
    token
  };
}

export async function sendVerificationEmail(toEmail, token) {
  // Build verification link that points to the frontend verify page
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';
  const link = `${frontendUrl.replace(/\/$/, '')}/verify?token=${token}`;

  // Create transporter (prefer explicit SMTP env, fallback to Ethereal)
  let transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Ethereal for development/testing
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'MDP <no-reply@mdp.local>',
    to: toEmail,
    subject: 'Verify your email for Micro Donation Platform',
    html: `
      <h1>Welcome to Micro Donation Platform</h1>
      <p>Thanks for registering. Please verify your email by clicking the button below:</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;">Verify Email</a></p>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <pre>${link}</pre>
      <p>This link expires in 1 hour.</p>
      <hr />
      <p>If clicking the link fails, you can manually verify using this token:</p>
      <pre style="word-break:break-all;padding:8px;background:#f3f4f6;border-radius:6px">${token}</pre>
      <p>Open the verification page and paste the token here: <a href="${frontendUrl.replace(/\/$/, '')}/verify">${frontendUrl.replace(/\/$/, '')}/verify</a></p>
    `
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info) || null;
  logger.info({ previewUrl, to: toEmail }, 'Verification email sent (preview URL)');

  return { info, previewUrl, link, token };
}
