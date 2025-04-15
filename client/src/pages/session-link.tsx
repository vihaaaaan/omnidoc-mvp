import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Mic, MicOff, Play, Square, Send, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiRequest, getQueryFn, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Session } from '@/types';

// Voice-to-voice session page
const SessionLink = () => {
  const { sessionId, token } = useParams();
  const { toast } = useToast();
  
  // Session state
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [currentField, setCurrentField] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [patientResponse, setPatientResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [schema, setSchema] = useState<Record<string, string>>({});
  
  // References for audio
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  console.log('Session link page loaded with sessionId:', sessionId, 'and token:', token);
  
  // Check if voice service is available
  const [isVoiceServiceAvailable, setIsVoiceServiceAvailable] = useState(true);
  
  // Check voice service availability
  useEffect(() => {
    const checkVoiceService = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/get-schema/test', { 
          method: 'GET',
          signal: AbortSignal.timeout(3000), // 3 second timeout
        });
        setIsVoiceServiceAvailable(response.ok);
      } catch (error) {
        console.error('Voice service unavailable:', error);
        setIsVoiceServiceAvailable(false);
      }
    };
    
    checkVoiceService();
  }, []);
  
  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      if (!isVoiceServiceAvailable) {
        // If voice service is not available, use a mock response for demo
        return {
          session_id: sessionId,
          current_field: "chief_complaint",
          question: "What brings you to see the doctor today?",
          complete: false
        };
      }
      
      const response = await fetch(`http://localhost:5001/api/start-session/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to start session');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setIsSessionStarted(true);
      setCurrentField(data.current_field);
      setCurrentQuestion(data.question);
      
      // Speak the first question if voice service is available
      if (isVoiceServiceAvailable) {
        speakText(data.question);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to start session. Please try again.',
        variant: 'destructive',
      });
    }
  });
  
  // Process response mutation
  const processResponseMutation = useMutation({
    mutationFn: async (response: string) => {
      // If voice service is not available, use a mock response flow for demo
      if (!isVoiceServiceAvailable) {
        // Simulate fields being filled out one by one
        const mockFields = ["chief_complaint", "duration", "severity", "location", "quality"];
        const currentIndex = mockFields.indexOf(currentField as string);
        const nextIndex = currentIndex + 1;
        
        // Create a mock schema for the final state
        if (nextIndex >= mockFields.length) {
          const mockSchema: Record<string, string> = {
            chief_complaint: "Headache",
            duration: "3 days",
            severity: "Moderate",
            location: "Front of head",
            quality: "Throbbing",
            alleviating_factors: "Rest and pain medication",
            aggravating_factors: "Noise and bright light",
            associated_symptoms: "Nausea",
            previous_treatment: "Over-the-counter pain relievers",
            medical_history: "Migraine history",
            medications: "None",
            allergies: "None",
            family_history: "Mother has migraines"
          };
          
          return {
            complete: true,
            schema: mockSchema
          };
        }
        
        // Return mock next question
        const nextField = mockFields[nextIndex];
        const questions = {
          duration: "How long have you been experiencing these symptoms?",
          severity: "On a scale of 1-10, how would you rate the pain?",
          location: "Where exactly is the pain located?",
          quality: "How would you describe the nature of the pain? For example, is it sharp, dull, or throbbing?"
        };
        
        return {
          current_field: nextField,
          question: questions[nextField as keyof typeof questions],
          complete: false
        };
      }
      
      // If voice service is available, use the actual API
      const res = await fetch(`http://localhost:5001/api/process-response/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response,
          current_field: currentField,
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to process response');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      if (data.complete) {
        setIsSessionComplete(true);
        setSchema(data.schema);
        
        // Create report via API
        createReport(data.schema);
        
        toast({
          title: 'Session Complete',
          description: 'Thank you for completing the session. Your information has been recorded.',
        });
      } else {
        setCurrentField(data.current_field);
        setCurrentQuestion(data.question);
        
        // Speak the next question if voice service is available
        if (isVoiceServiceAvailable) {
          speakText(data.question);
        }
      }
      
      // Clear the response
      setPatientResponse('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to process your response. Please try again.',
        variant: 'destructive',
      });
    }
  });
  
  // Fetch session information to verify it exists
  const { data: sessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: [`/api/sessions/${sessionId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!sessionId,
  });
  
  // Create report in the system
  const createReport = async (schema: Record<string, string>) => {
    try {
      // First update the session status to completed
      await apiRequest('PATCH', `/api/sessions/${sessionId}/status`, {
        status: 'completed'
      });
      
      // Convert schema to a summary
      const summary = Object.entries(schema)
        .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
        .join('\n');
      
      // Create the report
      const createdReport = await apiRequest('POST', '/api/reports', {
        session_id: sessionId,
        summary,
        json_schema: schema
      });
      
      console.log('Report created successfully:', createdReport);
      
      // Force a refresh of session data
      queryClient.invalidateQueries({
        queryKey: [`/api/sessions/${sessionId}`]
      });
      
      // Also invalidate the patient's sessions list
      if (sessionData?.patient_id) {
        queryClient.invalidateQueries({
          queryKey: [`/api/patients/${sessionData.patient_id}/sessions`]
        });
        queryClient.invalidateQueries({
          queryKey: [`/api/patients/${sessionData.patient_id}/sessions-with-reports`]
        });
      }
      
      return createdReport;
    } catch (error) {
      console.error('Failed to create report:', error);
      toast({
        title: 'Error Creating Report',
        description: 'There was an error saving your session data. Please contact your doctor.',
        variant: 'destructive',
      });
      throw error;
    }
  };
  
  // Text to speech function
  const speakText = async (text: string) => {
    setIsPlaying(true);
    
    // If voice service is not available, use browser's built-in TTS
    if (!isVoiceServiceAvailable) {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        utterance.onend = () => {
          setIsPlaying(false);
        };
        
        speechSynthesis.speak(utterance);
      } else {
        // If browser TTS is not available, just set isPlaying to false
        console.warn('Browser TTS not available');
        setIsPlaying(false);
      }
      
      return;
    }
    
    // Try to use the voice service if it's available
    try {
      const res = await fetch('http://localhost:5001/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to convert text to speech');
      }
      
      const audio = new Audio(`http://localhost:5001/temp_audio.wav`);
      
      audio.onended = () => {
        setIsPlaying(false);
      };
      
      audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      
      // Fallback to browser's TTS if voice service fails
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
      }
    }
  };
  
  // Start recording function
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        // Convert to base64 for sending to API
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          
          // For development: just handle manually entered text
          // In production, we'd send the audio data to the speech-to-text API
          // processResponseMutation.mutate(transcribedText);
        };
        
        // Close the media stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Microphone Error',
        description: 'Failed to access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };
  
  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };
  
  // Handle manual response submission
  const handleResponseSubmit = () => {
    if (patientResponse.trim()) {
      processResponseMutation.mutate(patientResponse);
    }
  };
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isListening) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isListening]);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-5">
      <Card className="w-full max-w-2xl p-6 shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Patient Health Interview</h1>
          <p className="text-gray-600 mt-2">
            Answer the questions to complete your health screening
          </p>
          
          {!isVoiceServiceAvailable && (
            <div className="mt-2 text-sm bg-amber-50 text-amber-700 p-2 rounded">
              <p>Note: Voice service is currently simulated. Text-to-speech using browser capabilities.</p>
            </div>
          )}
        </div>
        
        {!isSessionStarted ? (
          <div className="flex flex-col items-center space-y-4">
            <p className="text-center text-gray-700 mb-4">
              This virtual health interview will ask you a series of questions about your health concerns.
              Your responses will be recorded and shared with your healthcare provider.
            </p>
            
            <Button 
              onClick={() => startSessionMutation.mutate()}
              disabled={startSessionMutation.isPending}
              className="w-full max-w-xs"
            >
              {startSessionMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Begin Health Interview
            </Button>
          </div>
        ) : isSessionComplete ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-xl font-semibold text-center">Interview Completed</h2>
            <p className="text-center text-gray-600">
              Thank you for completing your health interview. Your doctor will review your information before your appointment.
            </p>
            
            {/* Patient details if available */}
            {sessionData && sessionData.patient_id && (
              <div className="w-full bg-blue-50 p-4 rounded-lg mb-2">
                <h3 className="font-medium mb-2 text-blue-800">Session Information:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-blue-700">Session ID:</span>
                  <span className="font-mono">{sessionId}</span>
                  <span className="text-blue-700">Status:</span>
                  <span className="font-semibold text-green-600">Completed</span>
                  <span className="text-blue-700">Created:</span>
                  <span>{new Date(sessionData.started_at).toLocaleString()}</span>
                </div>
              </div>
            )}
            
            {/* Medical report summary */}
            <div className="border border-gray-200 rounded-lg p-4 w-full bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Medical Report Summary:</h3>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  Saved
                </span>
              </div>
              
              <div className="space-y-2 text-sm divide-y divide-gray-100">
                {Object.entries(schema).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-2 py-2">
                    <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="col-span-2">{value || 'Not provided'}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="w-full flex flex-col sm:flex-row gap-3 mt-4">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Return to Home
                </Link>
              </Button>
              
              {sessionData && sessionData.patient_id && (
                <Button asChild className="flex-1 bg-blue-600 hover:bg-blue-700">
                  <Link href={`/patients/${sessionData.patient_id}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    View Patient Profile
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current question display */}
            <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
              <p className="text-lg font-medium text-blue-900">{currentQuestion}</p>
              
              <div className="flex justify-end mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => speakText(currentQuestion)}
                  disabled={isPlaying}
                >
                  {isPlaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            {/* Voice recording controls */}
            <div className="flex flex-col items-center space-y-4">
              <div className="flex space-x-4">
                <Button
                  variant={isListening ? "destructive" : "default"}
                  onClick={isListening ? stopRecording : startRecording}
                  disabled={processResponseMutation.isPending || isPlaying}
                  className="w-32"
                >
                  {isListening ? (
                    <>
                      <MicOff className="mr-2 h-4 w-4" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Record
                    </>
                  )}
                </Button>
                
                {/* Temporary: While speech recognition is being developed, use text input */}
                <p className="text-sm text-gray-500 italic">
                  Voice recording is simulated for this demo
                </p>
              </div>
              
              {/* Text input as fallback */}
              <div className="w-full space-y-2">
                <textarea
                  value={patientResponse}
                  onChange={(e) => setPatientResponse(e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  disabled={processResponseMutation.isPending || isPlaying}
                />
                
                <Button
                  onClick={handleResponseSubmit}
                  disabled={!patientResponse.trim() || processResponseMutation.isPending || isPlaying}
                  className="w-full"
                >
                  {processResponseMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Submit Response
                </Button>
              </div>
            </div>
            
            {/* Field progress indicator */}
            <div className="mt-4 text-sm text-gray-500">
              <p>Current topic: <span className="font-medium capitalize">{currentField?.replace(/_/g, ' ')}</span></p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SessionLink;