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
// - "Daniel" - 'onwK4e9ZLuTAKqWW03F9' (Male, calm, authoritative)
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam voice by default
const MODEL_ID = 'eleven_multilingual_v2'; // Multilingual model for better pronunciation of medical terms

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
  
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      method,
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(url, options, (res) => {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        return reject(new Error(`Request failed with status code ${res.statusCode}`));
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
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

    req.on('error', reject);
    
    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Convert text to speech using ElevenLabs API
 * @param text The text to convert to speech
 * @param voiceId Optional voice ID to use (defaults to Adam)
 * @returns Buffer containing audio data
 */
export async function textToSpeech(
  text: string,
  voiceId: string = VOICE_ID
): Promise<Buffer> {
  try {
    console.log(`Converting to speech: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    // Use direct API call to ElevenLabs
    const data = {
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0, // Neutral style for medical context
        use_speaker_boost: true
      }
    };
    
    const audioBuffer = await makeElevenLabsRequest('POST', `/text-to-speech/${voiceId}`, data);
    
    console.log(`Speech generation successful`);
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