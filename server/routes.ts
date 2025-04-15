import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPatientSchema, insertSessionSchema, insertReportSchema } from "@shared/schema";
import { z } from "zod";
import { handleSendEmail } from "./send-email";
import { generateFirstQuestion, processResponse, generateReport, getSessionState } from "./llm-service";

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes prefix
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  // Patient routes
  apiRouter.get("/patients", async (req, res) => {
    try {
      const patients = await storage.getPatients();
      res.json(patients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  apiRouter.get("/patients/:id", async (req, res) => {
    try {
      const patient = await storage.getPatientById(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      res.json(patient);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient" });
    }
  });

  apiRouter.post("/patients", async (req, res) => {
    try {
      const validatedData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(validatedData);
      res.status(201).json(patient);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid patient data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create patient" });
    }
  });

  // Session routes
  apiRouter.get("/sessions", async (req, res) => {
    try {
      const sessions = await storage.getSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  apiRouter.get("/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSessionById(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session" });
    }
  });

  apiRouter.get("/patients/:patientId/sessions", async (req, res) => {
    try {
      const sessions = await storage.getSessionsByPatientId(req.params.patientId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patient sessions" });
    }
  });

  apiRouter.post("/sessions", async (req, res) => {
    try {
      const validatedData = insertSessionSchema.parse(req.body);
      const session = await storage.createSession(validatedData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  apiRouter.patch("/sessions/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "Status is required" });
      }
      
      const session = await storage.updateSessionStatus(req.params.id, status);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update session status" });
    }
  });

  // Report routes
  apiRouter.get("/reports/:id", async (req, res) => {
    try {
      const report = await storage.getReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch report" });
    }
  });

  apiRouter.get("/sessions/:sessionId/report", async (req, res) => {
    try {
      const report = await storage.getReportBySessionId(req.params.sessionId);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch session report" });
    }
  });

  apiRouter.post("/reports", async (req, res) => {
    try {
      const validatedData = insertReportSchema.parse(req.body);
      
      // Ensure the session exists and is completed
      const session = await storage.getSessionById(validatedData.session_id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.status !== 'completed') {
        // Automatically update session status to completed
        await storage.updateSessionStatus(session.id, 'completed');
      }
      
      const report = await storage.createReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid report data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  // Combined endpoint for sessions with reports
  apiRouter.get("/patients/:patientId/sessions-with-reports", async (req, res) => {
    try {
      const sessions = await storage.getSessionsByPatientId(req.params.patientId);
      
      // For each completed session, get the associated report
      const sessionsWithReports = await Promise.all(
        sessions.map(async (session) => {
          if (session.status === 'completed') {
            const report = await storage.getReportBySessionId(session.id);
            return { ...session, report };
          }
          return session;
        })
      );
      
      res.json(sessionsWithReports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sessions with reports" });
    }
  });
  
  // Email endpoint
  apiRouter.post("/send-email", handleSendEmail);

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
