import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication helpers
export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({
    email,
    password
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
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

export const updateSessionStatus = async (sessionId: string, status: string) => {
  const { data, error } = await supabase
    .from('sessions')
    .update({ 
      status,
      ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {})
    })
    .eq('id', sessionId)
    .select()
    .single();
  
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

export const createReport = async (sessionId: string, summary: string, jsonSchema: any) => {
  const { data, error } = await supabase
    .from('reports')
    .insert({
      session_id: sessionId,
      summary,
      json_schema: jsonSchema,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
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
