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

// Mock patients data
const mockPatients = [
  {
    id: "p1",
    full_name: "John Doe",
    email: "john.doe@example.com",
    phone_number: "555-123-4567",
    dob: "1980-05-15",
    gender: "Male",
    address: "123 Main St, Anytown, CA",
    created_at: "2023-10-12T08:00:00Z"
  },
  {
    id: "p2",
    full_name: "Jane Smith",
    email: "jane.smith@example.com",
    phone_number: "555-987-6543",
    dob: "1992-08-21",
    gender: "Female",
    address: "456 Oak Ave, Somewhere, NY",
    created_at: "2023-11-05T10:30:00Z"
  },
  {
    id: "p3",
    full_name: "Robert Johnson",
    email: "robert.j@example.com",
    phone_number: "555-456-7890",
    dob: "1975-03-30",
    gender: "Male",
    address: "789 Pine Blvd, Nowhere, TX",
    created_at: "2024-01-20T14:45:00Z"
  }
];

// Patients helpers with mock data
export const getPatients = async () => {
  // Return mock data instead of querying Supabase
  return mockPatients;
};

export const getPatientById = async (id: string) => {
  // Find the patient in our mock data
  const patient = mockPatients.find(p => p.id === id);
  
  if (!patient) {
    throw new Error("Patient not found");
  }
  
  return patient;
};

// Mock sessions data
const mockSessions = [
  {
    id: "s1",
    patient_id: "p1",
    started_at: "2024-03-10T09:00:00Z",
    completed_at: "2024-03-10T09:45:00Z",
    status: "completed"
  },
  {
    id: "s2",
    patient_id: "p1",
    started_at: "2024-02-15T14:30:00Z",
    completed_at: "2024-02-15T15:15:00Z",
    status: "completed"
  },
  {
    id: "s3",
    patient_id: "p2",
    started_at: "2024-03-12T11:00:00Z",
    completed_at: "2024-03-12T11:30:00Z",
    status: "completed"
  },
  {
    id: "s4",
    patient_id: "p3",
    started_at: "2024-03-15T16:00:00Z",
    completed_at: null,
    status: "in-progress"
  }
];

// Mock reports data
const mockReports = [
  {
    id: "r1",
    session_id: "s1",
    summary: "Patient reported mild symptoms of seasonal allergies. Prescribed antihistamine and recommended lifestyle changes.",
    json_schema: {
      diagnosis: "Seasonal allergic rhinitis",
      treatment: "Loratadine 10mg once daily",
      followup_required: true,
      followup_date: "2024-04-10"
    },
    created_at: "2024-03-10T09:50:00Z"
  },
  {
    id: "r2",
    session_id: "s2",
    summary: "Regular check-up. All vitals normal. Patient maintaining good health with regular exercise and balanced diet.",
    json_schema: {
      blood_pressure: "120/80",
      heart_rate: "72 bpm",
      weight: "75 kg",
      notes: "Continue current lifestyle"
    },
    created_at: "2024-02-15T15:20:00Z"
  },
  {
    id: "r3",
    session_id: "s3",
    summary: "Patient experiencing frequent headaches. Recommended MRI scan to rule out serious conditions and prescribed pain relief.",
    json_schema: {
      symptoms: ["headache", "dizziness", "sensitivity to light"],
      diagnosis: "Migraine - to be confirmed",
      tests_ordered: ["MRI", "Blood work"],
      medication: "Sumatriptan as needed"
    },
    created_at: "2024-03-12T11:45:00Z"
  }
];

// Sessions helpers with mock data
export const getSessionsByPatientId = async (patientId: string) => {
  // Filter mock sessions by patient ID
  return mockSessions.filter(session => session.patient_id === patientId)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
};

// Reports helpers with mock data
export const getReportBySessionId = async (sessionId: string) => {
  // Find the report for a specific session
  return mockReports.find(report => report.session_id === sessionId);
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
