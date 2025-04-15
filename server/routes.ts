import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPatientSchema, insertSessionSchema, insertReportSchema } from "@shared/schema";
import { z } from "zod";
import { handleSendEmail } from "./send-email";
import { generateFirstQuestion, processResponse, generateReport, getSessionState } from "./llm-service";
import { textToSpeech, getAvailableVoices } from "./elevenlabs-tts";

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
  
  // Voice conversation API endpoints
  apiRouter.get("/conversation/start/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const useElevenLabs = req.query.useElevenLabs === 'true';
      
      // Start a new conversation and get the first question
      const firstQuestion = await generateFirstQuestion(sessionId);
      
      // Generate audio if ElevenLabs is requested
      let audioUrl = null;
      if (useElevenLabs) {
        try {
          console.log(`Generating ElevenLabs audio for question: "${firstQuestion.substring(0, 50)}..."`);
          
          // Generate a unique identifier for this audio file
          const audioId = `${sessionId}_${Date.now()}`;
          
          // Generate speech with ElevenLabs and store the URL for frontend use
          audioUrl = `/api/tts/audio/${audioId}`;
          console.log(`Created audio URL: ${audioUrl}`);
          
          // Store the question text in memory to be retrieved when the audio URL is requested
          // This approach prevents sending the audio in the initial response
          // and instead provides a URL that the client can request
          if (!req.app.locals.pendingAudio) {
            req.app.locals.pendingAudio = new Map();
          }
          req.app.locals.pendingAudio.set(audioId, firstQuestion);
          console.log(`Stored audio content with ID: ${audioId}`);
        } catch (audioError) {
          console.error('Error generating speech:', audioError);
          // Continue without audio if there's an error
        }
      } else {
        console.log('ElevenLabs audio generation not requested, skipping');
      }
      
      res.json({ 
        success: true, 
        question: firstQuestion,
        sessionId,
        audioUrl
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to start conversation',
        error: String(error)
      });
    }
  });
  
  apiRouter.post("/conversation/respond/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { response, useElevenLabs } = req.body;
      
      if (!response || typeof response !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Response is required and must be a string' 
        });
      }
      
      // Process the response and get the next question
      const result = await processResponse(sessionId, response);
      
      // Always generate ElevenLabs audio if there's a question
      let audioUrl = null;
      if (result.question) {
        try {
          console.log(`Generating ElevenLabs audio for response question: "${result.question.substring(0, 50)}..."`);
          
          // Generate a unique identifier for this audio file
          const audioId = `${sessionId}_${Date.now()}`;
          
          // Generate speech with ElevenLabs and store the URL for frontend use
          audioUrl = `/api/tts/audio/${audioId}`;
          console.log(`Created audio URL for response: ${audioUrl}`);
          
          // Store the question text in memory to be retrieved when the audio URL is requested
          if (!req.app.locals.pendingAudio) {
            req.app.locals.pendingAudio = new Map();
          }
          req.app.locals.pendingAudio.set(audioId, result.question);
          console.log(`Stored audio content with ID: ${audioId}`);
        } catch (audioError) {
          console.error('Error generating speech:', audioError);
          // Continue without audio if there's an error, but log it clearly
          console.error('ElevenLabs speech generation failed:', audioError);
        }
      } else {
        console.log('No question to generate audio for (session may be complete)');
      }
      
      res.json({
        success: true,
        question: result.question,
        isComplete: result.isComplete,
        sessionId,
        audioUrl
      });
      
      // If the conversation is complete, generate a report
      if (result.isComplete) {
        try {
          const report = await generateReport(sessionId);
          
          // Create a report in the database
          const dbSession = await storage.getSessionById(sessionId);
          if (dbSession) {
            // Update session status to completed
            await storage.updateSessionStatus(sessionId, 'completed');
            
            // Create report
            await storage.createReport({
              session_id: sessionId,
              summary: report.summary,
              json_schema: report.structured
            });
          }
        } catch (reportError) {
          console.error('Error generating report:', reportError);
          // Continue with the response, just log the error
        }
      }
    } catch (error) {
      console.error('Error processing response:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to process response',
        error: String(error)
      });
    }
  });
  
  apiRouter.get("/conversation/status/:sessionId", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const state = getSessionState(sessionId);
      
      if (!state) {
        return res.status(404).json({ 
          success: false, 
          message: 'Session not found' 
        });
      }
      
      res.json({
        success: true,
        state,
        sessionId
      });
    } catch (error) {
      console.error('Error getting session state:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get session state',
        error: String(error)
      });
    }
  });
  
  // ElevenLabs text-to-speech API endpoints
  apiRouter.post("/tts", async (req: Request, res: Response) => {
    try {
      const { text, voiceId } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Text is required and must be a string' 
        });
      }
      
      // Generate speech using ElevenLabs
      const audioBuffer = await textToSpeech(text, voiceId);
      
      // Send the audio buffer directly (already a Buffer)
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(audioBuffer);
    } catch (error) {
      console.error('Error generating text-to-speech:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate speech',
        error: String(error)
      });
    }
  });
  
  apiRouter.get("/tts/voices", async (req: Request, res: Response) => {
    try {
      // Get available voices from ElevenLabs
      const voices = await getAvailableVoices();
      res.json({ 
        success: true, 
        voices 
      });
    } catch (error) {
      console.error('Error getting voices:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to get voices',
        error: String(error)
      });
    }
  });
  
  // Route to serve generated audio files
  apiRouter.get("/tts/audio/:audioId", async (req: Request, res: Response) => {
    try {
      const { audioId } = req.params;
      console.log(`Received request for audio ID: ${audioId}`);
      
      // Get the pending audio text from memory
      if (!req.app.locals.pendingAudio || !req.app.locals.pendingAudio.has(audioId)) {
        console.error(`Audio ID ${audioId} not found in pendingAudio map`);
        
        // Debugging info about what IDs are available
        if (req.app.locals.pendingAudio) {
          console.log(`Available audio IDs: ${Array.from(req.app.locals.pendingAudio.keys()).join(', ')}`);
        } else {
          console.log('No pendingAudio map exists');
        }
        
        return res.status(404).json({
          success: false,
          message: 'Audio not found'
        });
      }
      
      const text = req.app.locals.pendingAudio.get(audioId);
      console.log(`Retrieved text for audio ID ${audioId}: "${text.substring(0, 50)}..."`);
      
      console.log('Calling ElevenLabs API to generate speech');
      // Generate speech using ElevenLabs
      const audioBuffer = await textToSpeech(text);
      console.log(`Received audio buffer of size: ${audioBuffer.length} bytes`);
      
      // Clean up after serving
      req.app.locals.pendingAudio.delete(audioId);
      console.log(`Removed audio ID ${audioId} from pendingAudio map`);
      
      // Send the audio buffer directly (already a Buffer)
      res.setHeader('Content-Type', 'audio/mpeg');
      console.log('Sending audio buffer to client');
      res.send(audioBuffer);
    } catch (error) {
      console.error('Error serving audio file:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to serve audio file',
        error: String(error)
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
