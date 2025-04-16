import nodemailer from 'nodemailer';
import type { Request, Response } from 'express';

// SMTP Configuration - will use environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'omnidoc@example.com';

// Create a transport with the SMTP config
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using SMTP
 * 
 * @param to Recipient email address
 * @param subject Email subject
 * @param html HTML content of the email
 * @param text Optional plain text version
 * @returns Promise with success status and message
 */
export async function sendEmail(
  to: string, 
  subject: string, 
  html: string, 
  text?: string
): Promise<{ success: boolean; message: string }> {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP credentials not configured');
    return {
      success: false,
      message: 'Email service not configured'
    };
  }

  try {
    await transporter.sendMail({
      from: `"OmniDoc" <${SMTP_FROM}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML if text not provided
      html,
    });

    return {
      success: true,
      message: 'Email sent successfully'
    };
  } catch (error) {
    console.error('Error sending email:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to send email: ${errorMessage}`
    };
  }
}

/**
 * Send a session link email
 * 
 * @param to Recipient email address
 * @param sessionId The session ID
 * @param patientName The patient's name
 * @param doctorName The doctor's name (optional)
 * @returns Promise with success status and message
 */
export async function sendSessionLinkEmail(
  to: string,
  sessionId: string,
  patientName: string,
  doctorName: string = 'your healthcare provider'
): Promise<{ success: boolean; message: string }> {
  const subject = 'Your OmniDoc Medical Screening Session';
  const sessionUrl = `${process.env.PUBLIC_URL || ''}/session/${sessionId}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(90deg, #3b82f6 0%, #1e40af 100%); padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">OmniDoc Medical Screening</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Hello ${patientName},</p>
        <p>${doctorName} has requested a pre-screening assessment for your upcoming appointment.</p>
        <p>Please click the link below to begin your medical screening:</p>
        <p style="text-align: center;">
          <a href="${sessionUrl}" 
             style="display: inline-block; background: linear-gradient(90deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: bold;">
            Start Your Screening
          </a>
        </p>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px; word-break: break-all;">
          ${sessionUrl}
        </p>
        <p>Thank you for choosing OmniDoc for your healthcare needs.</p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
          This is an automated message, please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  const text = `
Hello ${patientName},

${doctorName} has requested a pre-screening assessment for your upcoming appointment.

Please use the following link to begin your medical screening:
${sessionUrl}

Thank you for choosing OmniDoc for your healthcare needs.

This is an automated message, please do not reply to this email.
  `;

  return sendEmail(to, subject, html, text);
}

/**
 * Express route handler for sending session link emails
 */
export async function handleSendSessionLinkEmail(req: Request, res: Response) {
  const { to, sessionId, patientName, doctorName } = req.body;

  if (!to || !sessionId || !patientName) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: to, sessionId, patientName' 
    });
  }

  const result = await sendSessionLinkEmail(
    to, 
    sessionId, 
    patientName, 
    doctorName
  );

  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(500).json(result);
  }
}