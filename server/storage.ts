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

// Export a single instance to be used throughout the app
export const storage = new MemStorage();
