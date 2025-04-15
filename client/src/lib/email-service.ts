import { apiRequest } from './queryClient';

/**
 * Send session link via email using our backend API endpoint
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
    
    // Create plain text version for email clients that don't support HTML
    const emailText = `
      Hello ${patientName},
      
      ${doctorName} has invited you to a medical session.
      
      Please copy and paste this link in your browser to join the session:
      ${sessionLink}
      
      This link is unique to your session and should not be shared with others.
      
      Best regards,
      The OmniDoc Team
    `;
    
    // Send the email using our API endpoint
    const response = await apiRequest("POST", "/api/send-email", {
      to: email,
      subject: emailSubject,
      html: emailHtml,
      text: emailText
    });
    
    const result = await response.json();
    
    return { 
      success: result.success, 
      message: result.message || `Email has been sent to ${email}`
    };
  } catch (error) {
    console.error('Unexpected error with email service:', error);
    return { 
      success: false, 
      message: `An error occurred with the email service: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};