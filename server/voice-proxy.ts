// This file sets up a proxy to the voice service
import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { Request, Response } from 'express';
import axios from 'axios';

// Voice service status tracking
let voiceServiceRunning = false;
let servicePort = 5001;
let serviceHost = 'localhost';

// Try to start the voice service in the background
export function startVoiceService() {
  try {
    // Check if process already running
    try {
      execSync('pgrep -f "python voice_api.py"');
      console.log('Voice service is already running');
      voiceServiceRunning = true;
      return true;
    } catch (error) {
      // Process not running, continue to start it
    }

    // Check if voice_api.py exists
    if (!existsSync('./voice_api.py')) {
      console.error('voice_api.py not found');
      return false;
    }

    // Start the voice service in the background
    execSync('nohup python voice_api.py > voice_service.log 2>&1 &');
    console.log('Voice service started in the background');
    
    // Give it a moment to start
    setTimeout(() => {
      try {
        execSync('pgrep -f "python voice_api.py"');
        voiceServiceRunning = true;
        console.log('Voice service confirmed running');
      } catch (error) {
        console.error('Failed to confirm voice service is running');
      }
    }, 2000);
    
    return true;
  } catch (error) {
    console.error('Failed to start voice service:', error);
    return false;
  }
}

// Check if the voice service is running
export function checkVoiceService(): boolean {
  try {
    execSync('pgrep -f "python voice_api.py"');
    voiceServiceRunning = true;
    return true;
  } catch (error) {
    voiceServiceRunning = false;
    return false;
  }
}

// Get the voice service URL
function getVoiceServiceUrl(): string {
  return `http://${serviceHost}:${servicePort}`;
}

// Proxy a request to the voice service
async function proxyRequest(req: Request, res: Response, endpoint: string) {
  try {
    const isRunning = checkVoiceService();
    if (!isRunning) {
      // Try to start the service if it's not running
      await startVoiceService();
      // Double check if it's now running
      if (!checkVoiceService()) {
        return res.status(503).json({
          success: false,
          message: 'Voice service is not running and could not be started'
        });
      }
    }

    const baseUrl = getVoiceServiceUrl();
    const url = `${baseUrl}${endpoint}`;
    
    let response;
    
    try {
      if (req.method === 'GET') {
        response = await axios.get(url, { 
          params: req.query,
          timeout: 5000 // 5 second timeout
        });
      } else if (req.method === 'POST') {
        response = await axios.post(url, req.body, { 
          timeout: 5000 // 5 second timeout
        });
      } else {
        return res.status(405).json({
          success: false,
          message: 'Method not allowed'
        });
      }
      
      return res.status(response.status).json(response.data);
    } catch (error) {
      console.error(`Error proxying request to ${url}:`, error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          return res.status(503).json({
            success: false,
            message: 'Voice service is not responding, try restarting it'
          });
        }
        
        if (error.response) {
          return res.status(error.response.status).json(error.response.data);
        }
      }
      
      return res.status(500).json({
        success: false,
        message: 'Error communicating with voice service',
        error: String(error)
      });
    }
  } catch (error) {
    console.error('Unexpected error in proxy request:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal proxy error',
      error: String(error)
    });
  }
}

// Setup express routes to proxy to the voice service
export function setupVoiceProxyRoutes(app: any) {
  // Start the service when the Express app starts
  startVoiceService();
  
  // Proxy route for voice service status
  app.get('/api/voice-service/status', (req: Request, res: Response) => {
    const isRunning = checkVoiceService();
    res.json({
      running: isRunning,
      port: servicePort,
      host: serviceHost,
      url: `http://${serviceHost}:${servicePort}`
    });
  });
  
  // Route to restart the voice service
  app.post('/api/voice-service/restart', (req: Request, res: Response) => {
    try {
      // Kill any existing process
      try {
        execSync('pkill -f "python voice_api.py"');
      } catch (error) {
        // Ignore if no process found
      }
      
      // Start the service again
      const started = startVoiceService();
      
      res.json({
        success: started,
        message: started ? 'Voice service restarted' : 'Failed to restart voice service'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error restarting voice service',
        error: String(error)
      });
    }
  });
  
  // Proxy routes for the voice API endpoints
  
  // Get schema endpoint
  app.get('/api/get-schema/:sessionId', (req: Request, res: Response) => {
    proxyRequest(req, res, `/api/get-schema/${req.params.sessionId}`);
  });
  
  // Start session endpoint
  app.post('/api/start-session/:sessionId', (req: Request, res: Response) => {
    proxyRequest(req, res, `/api/start-session/${req.params.sessionId}`);
  });
  
  // Process response endpoint
  app.post('/api/process-response/:sessionId', (req: Request, res: Response) => {
    proxyRequest(req, res, `/api/process-response/${req.params.sessionId}`);
  });
  
  // Text to speech endpoint
  app.post('/api/text-to-speech', (req: Request, res: Response) => {
    proxyRequest(req, res, '/api/text-to-speech');
  });
  
  // Speech to text endpoint
  app.post('/api/speech-to-text', (req: Request, res: Response) => {
    proxyRequest(req, res, '/api/speech-to-text');
  });
}