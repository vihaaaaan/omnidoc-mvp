import { supabase } from './supabase';

/**
 * Send session link via email using the Supabase REST API
 * 
 * @param email The recipient's email address
 * @param sessionId The session ID
 * @param token The unique token for the session
 * @param patientName The patient's name
 * @param doctorName The doctor's name
 * @returns Promise with success status and message
 */
export const sendSessionLinkEmail = async (
  email: string,
  sessionId: string,
  token: string,
  patientName: string = 'Patient',
  doctorName: string = 'Your Doctor'
): Promise<{ success: boolean; message: string }> => {
  try {
    // Create the session link
    const sessionLink = `${window.location.origin}/session/${sessionId}/${token}`;
    
    // Create our email content
    const emailSubject = `OmniDoc: Join your medical session`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5;">OmniDoc Session Invitation</h2>
        </div>
        <p>Hello ${patientName},</p>
        <p>${doctorName} has invited you to a medical session.</p>
        <p>Please click the button below to join:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${sessionLink}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Join Session
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; background-color: #f7f7f7; padding: 10px; border-radius: 3px; font-family: monospace;">
          ${sessionLink}
        </p>
        <p>This link is unique to your session and should not be shared with others.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
        <p style="font-size: 12px; color: #666;">
          Best regards,<br/>The OmniDoc Team
        </p>
      </div>
    `;
    
    // Create a simple test email function (for demo purposes)
    // In a production environment, you would connect to your email service API
    
    // This is a mock implementation - it will just show a success message
    // but won't actually send an email without setting up a proper email service
    
    // Simulate a network request 
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log email details to console for debugging
    console.log('Email would be sent with:', {
      to: email,
      subject: emailSubject,
      sessionLink,
      patientName,
      doctorName
    });

    // In a real app, you would:
    // 1. Create an actual server-side API endpoint that connects to an email service
    // 2. Call that endpoint from here, passing the email details
    // 3. Handle any errors from the email service
    
    // For now, we'll just simulate a successful email send
    return { 
      success: true, 
      message: `Email would be sent to ${email}. In a production environment, this would actually send an email with the session link.` 
    };
  } catch (error) {
    console.error('Unexpected error with email service:', error);
    return { 
      success: false, 
      message: `An error occurred with the email service: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};