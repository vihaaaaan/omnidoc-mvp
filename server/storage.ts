import { 
  users, 
  patients, 
  sessions, 
  reports, 
  type User, 
  type InsertUser,
  type Patient,
  type InsertPatient,
  type Session,
  type InsertSession,
  type Report,
  type InsertReport
} from "@shared/schema";

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Patient operations
  getPatients(): Promise<Patient[]>;
  getPatientById(id: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  
  // Session operations
  getSessions(): Promise<Session[]>;
  getSessionById(id: string): Promise<Session | undefined>;
  getSessionsByPatientId(patientId: string): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSessionStatus(id: string, status: string): Promise<Session | undefined>;
  
  // Report operations
  getReportById(id: string): Promise<Report | undefined>;
  getReportBySessionId(sessionId: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private patientsData: Map<string, Patient>;
  private sessionsData: Map<string, Session>;
  private reportsData: Map<string, Report>;
  private currentUserId: number;

  constructor() {
    this.usersData = new Map();
    this.patientsData = new Map();
    this.sessionsData = new Map();
    this.reportsData = new Map();
    this.currentUserId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.usersData.set(id, user);
    return user;
  }

  // Patient methods
  async getPatients(): Promise<Patient[]> {
    return Array.from(this.patientsData.values());
  }

  async getPatientById(id: string): Promise<Patient | undefined> {
    return this.patientsData.get(id);
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    const patient: Patient = { ...insertPatient, id, created_at };
    this.patientsData.set(id, patient);
    return patient;
  }

  // Session methods
  async getSessions(): Promise<Session[]> {
    return Array.from(this.sessionsData.values());
  }

  async getSessionById(id: string): Promise<Session | undefined> {
    return this.sessionsData.get(id);
  }

  async getSessionsByPatientId(patientId: string): Promise<Session[]> {
    return Array.from(this.sessionsData.values()).filter(
      session => session.patient_id === patientId
    );
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const id = crypto.randomUUID();
    const started_at = new Date().toISOString();
    const session: Session = { 
      ...insertSession, 
      id, 
      started_at,
      status: insertSession.status || 'pending'
    };
    this.sessionsData.set(id, session);
    return session;
  }

  async updateSessionStatus(id: string, status: string): Promise<Session | undefined> {
    const session = this.sessionsData.get(id);
    if (!session) return undefined;
    
    const updatedSession = { 
      ...session, 
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : session.completed_at
    };
    
    this.sessionsData.set(id, updatedSession);
    return updatedSession;
  }

  // Report methods
  async getReportById(id: string): Promise<Report | undefined> {
    return this.reportsData.get(id);
  }

  async getReportBySessionId(sessionId: string): Promise<Report | undefined> {
    return Array.from(this.reportsData.values()).find(
      report => report.session_id === sessionId
    );
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    const report: Report = { ...insertReport, id, created_at };
    this.reportsData.set(id, report);
    return report;
  }
}

// Import PostgreSQL and session handling
import { Pool } from 'pg';
import connectPg from 'connect-pg-simple';
import session from 'express-session';

// Database Storage implementation
export class DatabaseStorage implements IStorage {
  private pool: Pool;
  public sessionStore: session.SessionStore;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool: this.pool, 
      createTableIfMissing: true 
    });
    
    console.log("Database connection established");
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { username, password } = insertUser;
    try {
      const result = await this.pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
        [username, password]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Patient methods
  async getPatients(): Promise<Patient[]> {
    try {
      const result = await this.pool.query('SELECT * FROM patients ORDER BY full_name');
      return result.rows;
    } catch (error) {
      console.error('Error getting patients:', error);
      return [];
    }
  }

  async getPatientById(id: string): Promise<Patient | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM patients WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error getting patient by ID:', error);
      return undefined;
    }
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const { full_name, email, phone_number, dob, gender, address } = insertPatient;
    try {
      const result = await this.pool.query(
        'INSERT INTO patients (full_name, email, phone_number, dob, gender, address) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [full_name, email, phone_number, dob, gender || null, address || null]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  }

  // Session methods
  async getSessions(): Promise<Session[]> {
    try {
      const result = await this.pool.query('SELECT * FROM sessions ORDER BY started_at DESC');
      return result.rows;
    } catch (error) {
      console.error('Error getting sessions:', error);
      return [];
    }
  }

  async getSessionById(id: string): Promise<Session | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM sessions WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error getting session by ID:', error);
      return undefined;
    }
  }

  async getSessionsByPatientId(patientId: string): Promise<Session[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM sessions WHERE patient_id = $1 ORDER BY started_at DESC',
        [patientId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting sessions by patient ID:', error);
      return [];
    }
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const { patient_id, status = 'pending' } = insertSession;
    try {
      const result = await this.pool.query(
        'INSERT INTO sessions (patient_id, status) VALUES ($1, $2) RETURNING *',
        [patient_id, status]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  async updateSessionStatus(id: string, status: string): Promise<Session | undefined> {
    try {
      let result;
      if (status === 'completed') {
        result = await this.pool.query(
          'UPDATE sessions SET status = $1, completed_at = NOW() WHERE id = $2 RETURNING *',
          [status, id]
        );
      } else {
        result = await this.pool.query(
          'UPDATE sessions SET status = $1 WHERE id = $2 RETURNING *',
          [status, id]
        );
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating session status:', error);
      return undefined;
    }
  }

  // Report methods
  async getReportById(id: string): Promise<Report | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM reports WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error getting report by ID:', error);
      return undefined;
    }
  }

  async getReportBySessionId(sessionId: string): Promise<Report | undefined> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM reports WHERE session_id = $1',
        [sessionId]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error getting report by session ID:', error);
      return undefined;
    }
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const { session_id, summary, json_schema } = insertReport;
    try {
      const result = await this.pool.query(
        'INSERT INTO reports (session_id, summary, json_schema) VALUES ($1, $2, $3) RETURNING *',
        [session_id, summary, json_schema]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  }
}

// Export a single instance to be used throughout the app
export const storage = new DatabaseStorage();
