import elevenlabs from 'elevenlabs';

// Define interfaces for ElevenLabs API
interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

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

// Set the API key for ElevenLabs
let initialized = false;

// Initialize ElevenLabs client
function initializeClient(): void {
  if (!initialized) {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }
    
    elevenlabs.setApiKey(process.env.ELEVENLABS_API_KEY);
    initialized = true;
    console.log('ElevenLabs Text-to-Speech API client initialized');
  }
}

/**
 * Convert text to speech using ElevenLabs API
 * @param text The text to convert to speech
 * @param voiceId Optional voice ID to use (defaults to Adam)
 * @returns ArrayBuffer containing audio data
 */
export async function textToSpeech(
  text: string,
  voiceId: string = VOICE_ID
): Promise<ArrayBuffer> {
  try {
    // Ensure client is initialized
    initializeClient();
    
    console.log(`Converting to speech: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    // Use the API to get audio
    const audioBuffer = await elevenlabs.generate({
      voice: voiceId,
      text: text,
      model: MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0, // Neutral style for medical context
        use_speaker_boost: true
      },
    });
    
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
    // Ensure client is initialized
    initializeClient();
    
    const voices = await elevenlabs.voices.getAll();
    return voices.map(voice => ({
      voice_id: voice.voice_id,
      name: voice.name,
      category: voice.category,
      description: voice.description
    }));
  } catch (error) {
    console.error('Error getting available voices from ElevenLabs:', error);
    throw error;
  }
}