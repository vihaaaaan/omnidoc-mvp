import { createClient } from '@supabase/supabase-js';

// For development purposes, we'll set these values directly
// In production, these would come from environment variables
const supabaseUrl = 'https://example.supabase.co';
const supabaseAnonKey = 'example-anon-key';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Mock authentication helpers for development
export const signIn = async (email: string, password: string) => {
  // Simple mock authentication (accepts any email with password "password")
  if (password === "password") {
    return {
      data: {
        user: {
          id: "mock-user-id",
          email: email,
          user_metadata: { full_name: "Dr. Jane Smith" }
        },
        session: {
          access_token: "mock-token",
          refresh_token: "mock-refresh-token",
          expires_at: Date.now() + 3600000,
          user: {
            id: "mock-user-id",
            email: email,
            user_metadata: { full_name: "Dr. Jane Smith" }
          }
        }
      },
      error: null
    };
  } else {
    return {
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" }
    };
  }
};

export const signOut = async () => {
  return { error: null };
};

// Patients helpers
export const getPatients = async () => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('full_name');
  
  if (error) throw error;
  return data;
};

export const getPatientById = async (id: string) => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
};

// Sessions helpers
export const getSessionsByPatientId = async (patientId: string) => {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('patient_id', patientId)
    .order('started_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

// Reports helpers
export const getReportBySessionId = async (sessionId: string) => {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('session_id', sessionId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned" which is valid
  return data;
};

// Combined query to get sessions with reports
export const getSessionsWithReportsByPatientId = async (patientId: string) => {
  // First get all sessions for the patient
  const sessions = await getSessionsByPatientId(patientId);
  
  // Then for each completed session, get the report
  const sessionsWithReports = await Promise.all(
    sessions.map(async (session) => {
      if (session.status === 'completed') {
        const report = await getReportBySessionId(session.id);
        return { ...session, report };
      }
      return session;
    })
  );
  
  return sessionsWithReports;
};
