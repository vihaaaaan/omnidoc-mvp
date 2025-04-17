// Import ElevenLabs SDK
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// Define interface for ElevenLabs voice
interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
}

// ElevenLabs voices: https://api.elevenlabs.io/v1/voices
// Some recommended professional voices for medical context:
// - "Adam" - 'pNInz6obpgDQGcFmaJgB' (Male, professional)
// - "Rachel" - '21m00Tcm4TlvDq8ikWAM' (Female, warm, professional)
// - "Bella" - 'EXAVITQu4vr4xnSDxMaL' (Female, gentle, soft-spoken)
// - "Grace" - 'oWAxZDx7w5VEj9dCyTzz' (Female, warm, nurturing)
// - "Elli" - 'MF3mGyEYCl7XYWbV9V6O' (Female, professional, clear)
// - "Daniel" - 'onwK4e9ZLuTAKqWW03F9' (Male, calm, authoritative)
const VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Bella voice - gentle, soft-spoken, feminine

// Using monolingual model for faster processing when we're only using English
// eleven_monolingual_v1 has lower latency than eleven_multilingual_v2
const MODEL_ID = 'eleven_monolingual_v1'; // English-only model with lower latency

// Use direct API calls instead of the problematic SDK
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Helper function to make API calls to ElevenLabs
async function makeElevenLabsRequest(
  method: string,
  endpoint: string,
  data?: any
): Promise<any> {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY environment variable is required');
  }

  const url = `${ELEVENLABS_API_URL}${endpoint}`;
  const requestStartTime = Date.now();
  console.log(`Starting ElevenLabs API request to ${endpoint}`);
  
  return new Promise((resolve, reject) => {
    // Set a timeout to prevent hanging requests
    const requestTimeout = 15000; // 15 seconds max for TTS generation
    let timeoutId: NodeJS.Timeout | null = null;
    
    const options: https.RequestOptions = {
      method,
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': method === 'GET' ? 'application/json' : 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    };

    const req = https.request(url, options, (res) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        return reject(new Error(`Request failed with status code ${res.statusCode}`));
      }

      // Set high priority for data processing
      if (res.socket) {
        res.socket.setNoDelay(true);
      }

      const chunks: Buffer[] = [];
      
      // Optimize data handling for faster processing
      res.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });
      
      res.on('end', () => {
        const requestEndTime = Date.now();
        const requestDuration = (requestEndTime - requestStartTime) / 1000;
        console.log(`ElevenLabs API request completed in ${requestDuration.toFixed(2)}s`);
        
        const body = Buffer.concat(chunks);
        if (res.headers['content-type']?.includes('application/json')) {
          try {
            const json = JSON.parse(body.toString());
            resolve(json);
          } catch (e) {
            reject(new Error('Failed to parse JSON response'));
          }
        } else {
          // Return the raw buffer for audio data
          resolve(body);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`ElevenLabs API request error: ${error.message}`);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      reject(error);
    });
    
    // Set timeout to avoid hanging requests
    timeoutId = setTimeout(() => {
      req.destroy(new Error(`Request timeout after ${requestTimeout}ms`));
    }, requestTimeout);
    
    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Convert text to speech using ElevenLabs API
 * @param text The text to convert to speech
 * @param voiceId Optional voice ID to use (defaults to Bella - soft, feminine voice)
 * @returns Buffer containing audio data
 */
export async function textToSpeech(
  text: string,
  voiceId: string = VOICE_ID
): Promise<Buffer> {
  try {
    const startTime = Date.now();
    console.log(`Starting ElevenLabs TTS request at ${new Date().toISOString()}`);
    console.log(`Converting to speech: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    // Optimize text to reduce overall processing time
    // For medical text, we can remove excessive punctuation but maintain clarity
    // This allows for faster processing while maintaining quality
    const optimizedText = text
      .replace(/\s+/g, ' ')         // Replace multiple spaces with single space
      .trim();                       // Remove leading/trailing whitespace
    
    // Use direct API call to ElevenLabs with optimized settings for latency
    const data = {
      text: optimizedText,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.55,        // Slightly lower stability for faster generation
        similarity_boost: 0.75, // Good balance between quality and speed
        style: 0.0,             // Neutral style for faster processing
        use_speaker_boost: true
      },
      // Optional optimization parameters
      optimize_streaming_latency: 3 // Level 3 (highest) optimization for streaming
    };
    
    // Set shorter timeout for faster response
    const audioBuffer = await makeElevenLabsRequest('POST', `/text-to-speech/${voiceId}`, data);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`Speech generation successful in ${duration.toFixed(2)}s`);
    return audioBuffer;
  } catch (error) {
    console.error('Error converting text to speech with ElevenLabs:', error);
    throw error;
  }
}

/**
 * Get available voices from ElevenLabs
 * @returns Array of available voices
 */
export async function getAvailableVoices(): Promise<Voice[]> {
  try {
    const response = await makeElevenLabsRequest('GET', '/voices');
    
    if (response && response.voices) {
      return response.voices.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error getting available voices from ElevenLabs:', error);
    throw error;
  }
}