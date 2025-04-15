// Supabase table types matching our schema
export interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  dob: string;
  gender?: string;
  address?: string;
  created_at: string;
}

export interface Session {
  id: string;
  patient_id: string;
  started_at: string;
  completed_at?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

export interface Report {
  id: string;
  session_id: string;
  summary?: string;
  json_schema?: Record<string, any>;
  created_at: string;
}

// For the auth state
export interface AuthState {
  user: any | null;
  session: any | null;
  loading: boolean;
  isAuthenticated: boolean;
}

// Combined types for UI display
export interface SessionWithReport extends Session {
  report?: Report;
}
