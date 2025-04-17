import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPatientSchema, insertSessionSchema, insertReportSchema } from "@shared/schema";
import { z } from "zod";
import { handleSendEmail } from "./send-email";
import { handleSendSessionLinkEmail } from "./smtp-email-service";
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
  
  // Email endpoints
  apiRouter.post("/send-email", handleSendEmail);
  apiRouter.post("/send-session-email", handleSendSessionLinkEmail);
  
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
      const requestStartTime = Date.now();
      const { text, voiceId } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Text is required and must be a string' 
        });
      }
      
      console.log(`TTS POST request at ${new Date().toISOString()} for text: "${text.substring(0, 50)}..."`);
      
      // Start generating speech with optimized latency settings
      const audioBufferPromise = textToSpeech(text, voiceId);
      
      // Set up headers early to improve time-to-first-byte
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Wait for audio generation to complete
      const audioBuffer = await audioBufferPromise;
      
      // Set content length after we have the buffer
      res.setHeader('Content-Length', audioBuffer.length.toString());
      
      // Send the audio buffer directly
      res.send(audioBuffer);
      
      const requestEndTime = Date.now();
      const requestDuration = (requestEndTime - requestStartTime) / 1000;
      console.log(`Generated audio buffer with size: ${audioBuffer.length} bytes in ${requestDuration.toFixed(2)}s`);
    } catch (error) {
      console.error('Error generating text-to-speech:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate speech',
        error: String(error)
      });
    }
  });
  
  // Direct access to TTS via query parameter - useful for session page to directly request audio
  apiRouter.get("/tts/direct", async (req: Request, res: Response) => {
    try {
      const requestStartTime = Date.now();
      const text = req.query.text as string;
      const voiceId = req.query.voiceId as string;
      
      if (!text) {
        return res.status(400).json({ 
          success: false, 
          message: 'Text parameter is required' 
        });
      }
      
      console.log(`Direct TTS GET request at ${new Date().toISOString()} for text: "${text.substring(0, 50)}..."`);
      
      // Start generating speech immediately with performance optimized settings
      const audioBufferPromise = textToSpeech(text, voiceId);
      
      // Set up response headers early to improve time-to-first-byte
      // These headers are set before waiting for the audio to be generated
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // Disable caching for more reliable audio loading
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
      res.setHeader('X-Audio-Type', 'elevenlabs');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Wait for audio generation to complete
      const audioBuffer = await audioBufferPromise;
      
      // Set content length after we have the buffer
      res.setHeader('Content-Length', audioBuffer.length.toString());
      
      // Send the audio buffer directly
      res.send(audioBuffer);
      
      const requestEndTime = Date.now();
      const requestDuration = (requestEndTime - requestStartTime) / 1000;
      console.log(`Generated audio buffer with size: ${audioBuffer.length} bytes in ${requestDuration.toFixed(2)}s`);
    } catch (error) {
      console.error('Error generating text-to-speech via direct endpoint:', error);
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
      
      // Split audioId to extract the session ID and text to speak
      const parts = audioId.split('_');
      const sessionId = parts[0];
      
      // First try to get the pending audio from memory
      let text;
      if (req.app.locals.pendingAudio && req.app.locals.pendingAudio.has(audioId)) {
        text = req.app.locals.pendingAudio.get(audioId);
        console.log(`Retrieved text from memory for audio ID ${audioId}: "${text.substring(0, 50)}..."`);
        
        // Clean up after retrieving
        req.app.locals.pendingAudio.delete(audioId);
        console.log(`Removed audio ID ${audioId} from pendingAudio map`);
      } else {
        // If not in memory, fallback to getting session state and retrieving the current question
        console.log(`Audio ID ${audioId} not found in memory, getting from session state...`);
        const sessionState = getSessionState(sessionId);
        
        if (!sessionState || !sessionState.nextQuestion) {
          console.error(`No session state or next question found for session ${sessionId}`);
          return res.status(404).json({
            success: false,
            message: 'Session or question not found'
          });
        }
        
        text = sessionState.nextQuestion;
        console.log(`Retrieved text from session state: "${text.substring(0, 50)}..."`);
      }
      
      // Start generating speech with optimized latency settings
      const requestStartTime = Date.now();
      console.log('Calling ElevenLabs API to generate speech');
      
      // Set up response headers early to improve time-to-first-byte
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Generate speech with optimized settings
      const audioBuffer = await textToSpeech(text);
      
      // Set content length after we have the buffer
      res.setHeader('Content-Length', audioBuffer.length.toString());
      
      const requestEndTime = Date.now();
      const requestDuration = (requestEndTime - requestStartTime) / 1000;
      console.log(`Generated audio buffer with size: ${audioBuffer.length} bytes in ${requestDuration.toFixed(2)}s`);
      
      // Send the audio buffer to client
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
