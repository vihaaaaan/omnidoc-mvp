import { supabase } from './supabase';

/**
 * Send session link via email
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
    
    // For Supabase, we're using their authentication service to send the email
    // This creates a magiclink, but we're using it just to deliver our message
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // We're not using this for authentication, but to send a custom email
        emailRedirectTo: sessionLink,
        data: {
          // Custom email template data - these need to be configured in Supabase
          subject: `OmniDoc: Join your medical session`,
          message: `
            <p>Hello ${patientName},</p>
            <p>${doctorName} has invited you to a medical session.</p>
            <p>Please click the link below to join:</p>
            <p><a href="${sessionLink}">${sessionLink}</a></p>
            <p>This link is unique to your session and should not be shared with others.</p>
            <p>Best regards,<br/>The OmniDoc Team</p>
          `
        }
      }
    });

    if (error) {
      console.error('Error sending email:', error);
      return { 
        success: false, 
        message: `Failed to send email: ${error.message}` 
      };
    }

    return { 
      success: true, 
      message: `Email sent successfully to ${email}` 
    };
  } catch (error) {
    console.error('Unexpected error sending email:', error);
    return { 
      success: false, 
      message: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};