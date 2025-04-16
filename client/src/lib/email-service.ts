import { apiRequest } from './queryClient';

/**
 * Send session link via email using our backend API endpoint
 * 
 * @param email The recipient's email address
 * @param sessionId The session ID
 * @param patientName The patient's name
 * @param doctorName The doctor's name
 * @returns Promise with success status and message
 */
export const sendSessionLinkEmail = async (
  email: string,
  sessionId: string,
  patientName: string,
  doctorName?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Sending session link email to:', email, 'for session:', sessionId);
    
    const response = await apiRequest('POST', '/api/send-session-email', {
      to: email,
      sessionId,
      patientName,
      doctorName
    });
    
    const data = await response.json();
    console.log('Email API response:', data);
    return data;
  } catch (error) {
    console.error('Error sending session link email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email'
    };
  }
};