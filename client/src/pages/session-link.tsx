import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  Mic,
  MicOff,
  Play,
  Square,
  Send,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import {
  updateSessionStatus,
  createReport as createSupabaseReport,
  getSessionById,
} from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Session } from "@/types";

// Add global declarations for window properties we're adding
declare global {
  interface Window {
    sessionAudio?: HTMLAudioElement;
    currentAudio?: HTMLAudioElement;
  }
}

// Add a type definition for the SpeechRecognition
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onerror: (event: any) => void;
  onresult: (event: any) => void;
  onend: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// Voice-to-voice session page
const SessionLink = () => {
  const { sessionId, token } = useParams();
  const { toast } = useToast();

  // Session state
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [patientResponse, setPatientResponse] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [schema, setSchema] = useState<Record<string, string>>({});
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  // Always use ElevenLabs for high-quality voice
  const useElevenLabs = true;

  // Speech recognition state
  const [isSpeechRecognitionAvailable, setIsSpeechRecognitionAvailable] =
    useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  console.log(
    "Session link page loaded with sessionId:",
    sessionId,
    "and token:",
    token,
  );

  // Setup speech recognition
  useEffect(() => {
    // Check if the browser supports SpeechRecognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechRecognitionAvailable = !!SpeechRecognition;

    setIsSpeechRecognitionAvailable(speechRecognitionAvailable);

    if (!speechRecognitionAvailable) {
      console.warn("Speech Recognition not available in this browser");
    } else {
      console.log("Speech Recognition is available");
    }
  }, []);

  // Start session mutation
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log("Starting session with ID:", sessionId);

        // Always use ElevenLabs for high-quality TTS audio
        const response = await apiRequest(
          "GET",
          `/api/conversation/start/${sessionId}?useElevenLabs=true`,
        );

        if (!response.ok) {
          throw new Error("Failed to start session");
        }

        const responseData = await response.json();
        console.log("Session started successfully with data:", responseData);
        return responseData;
      } catch (error) {
        console.error("Failed to start session:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setIsSessionStarted(true);
      setCurrentQuestion(data.question);

      // Store audio URL for ElevenLabs playback if available
      if (data.audioUrl) {
        console.log(
          "Setting audio URL from start session response:",
          data.audioUrl,
        );
        // Make sure we use the full URL with the server
        const fullAudioUrl = new URL(
          data.audioUrl,
          window.location.origin,
        ).toString();
        console.log("Full audio URL:", fullAudioUrl);
        setAudioUrl(fullAudioUrl);
      } else {
        console.warn("No audio URL returned from session start");
        setAudioUrl(null);
      }

      // Always speak the first question immediately
      // Use direct TTS endpoint for reliability
      (function playAudioImmediately() {
        try {
          console.log("Auto-playing question using direct TTS endpoint");
          const encodedText = encodeURIComponent(data.question);
          const directUrl = `/api/tts/direct?text=${encodedText}`;

          // Set playing state immediately
          setIsPlaying(true);

          // Create a POST request to generate audio in advance
          fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: data.question }),
          })
            .then((response) => {
              if (!response.ok) throw new Error("Failed to generate audio");
              return response.arrayBuffer();
            })
            .then((arrayBuffer) => {
              // Create a blob from the array buffer
              const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
              const objectURL = URL.createObjectURL(blob);

              // Create audio element with the blob URL
              const audio = new Audio(objectURL);

              // Add event listeners
              audio.addEventListener("ended", () => {
                console.log("Audio playback completed");
                setIsPlaying(false);
                // Clean up object URL
                URL.revokeObjectURL(objectURL);
              });

              audio.addEventListener("canplaythrough", () => {
                console.log("Audio can play through, starting playback");
                // Start playback
                audio.play().catch((playError) => {
                  console.error("Error starting audio playback:", playError);
                  setIsPlaying(false);
                });
              });

              // Set preload to auto to start loading immediately
              audio.preload = "auto";

              // Store reference to the audio element
              window.sessionAudio = audio;
            })
            .catch((error) => {
              console.error(
                "Error with direct audio generation approach:",
                error,
              );
              setIsPlaying(false);

              // Fall back to the direct URL approach
              const fallbackAudio = new Audio(directUrl);
              fallbackAudio.onended = () => setIsPlaying(false);
              fallbackAudio.play().catch((e) => {
                console.error("Fallback audio playback failed:", e);
                setIsPlaying(false);
              });
            });
        } catch (error) {
          console.error("Error setting up auto-play audio:", error);
          setIsPlaying(false);
        }
      })();
    },
    onError: (error) => {
      console.error("Start session error:", error);
      toast({
        title: "Error",
        description: "Failed to start session. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Process response mutation
  const processResponseMutation = useMutation({
    mutationFn: async (response: string) => {
      try {
        console.log("Processing response for session ID:", sessionId);

        // Always use ElevenLabs for high-quality TTS audio
        const result = await apiRequest(
          "POST",
          `/api/conversation/respond/${sessionId}`,
          {
            response,
            useElevenLabs: true,
          },
        );

        if (!result.ok) {
          throw new Error("Failed to process response");
        }

        const responseData = await result.json();
        console.log("Response processed successfully with data:", responseData);
        return responseData;
      } catch (error) {
        console.error("Failed to process response:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.isComplete) {
        setIsSessionComplete(true);

        // Get session state to get the schema data
        apiRequest("GET", `/api/conversation/status/${sessionId}`)
          .then((response) => {
            if (response.ok) {
              return response.json();
            }
            throw new Error("Failed to get session state");
          })
          .then((statusData) => {
            setSchema(statusData.state.schema || {});

            // Create report via API with error handling
            try {
              createReport(statusData.state.schema).catch((error) => {
                console.error("Error creating report:", error);
                toast({
                  title: "Session Complete",
                  description:
                    "Your session was completed, but there was an issue saving the data. Your answers are still visible.",
                  variant: "destructive",
                });
              });
            } catch (error) {
              console.error("Error creating report:", error);
              toast({
                title: "Session Complete",
                description:
                  "Your session was completed, but there was an issue saving the data. Your answers are still visible.",
                variant: "destructive",
              });
            }
          })
          .catch((error) => {
            console.error("Error getting schema:", error);
          });

        toast({
          title: "Session Complete",
          description:
            "Thank you for completing the session. Your information has been recorded.",
        });
      } else {
        setCurrentQuestion(data.question);

        // Store audio URL for ElevenLabs playback if available
        if (data.audioUrl) {
          console.log(
            "Setting audio URL from process response:",
            data.audioUrl,
          );
          // Make sure we use the full URL with the server
          const fullAudioUrl = new URL(
            data.audioUrl,
            window.location.origin,
          ).toString();
          console.log("Full audio URL:", fullAudioUrl);
          setAudioUrl(fullAudioUrl);
        } else {
          console.warn("No audio URL returned from process response");
          setAudioUrl(null);
        }

        // Auto-play the question audio as soon as we get it
        // Use direct TTS endpoint for reliability and immediate playback
        (function playNextQuestionImmediately() {
          try {
            console.log("Auto-playing next question using direct TTS endpoint");
            // Set playing state immediately
            setIsPlaying(true);

            // Create a POST request to generate audio in advance
            fetch("/api/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: data.question }),
            })
              .then((response) => {
                if (!response.ok) throw new Error("Failed to generate audio");
                return response.arrayBuffer();
              })
              .then((arrayBuffer) => {
                // Create a blob from the array buffer
                const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
                const objectURL = URL.createObjectURL(blob);

                console.log("Created object URL for audio blob:", objectURL);

                // Create audio element with the blob URL
                const audio = new Audio(objectURL);

                // Add event listeners
                audio.addEventListener("ended", () => {
                  console.log("Follow-up audio playback completed");
                  setIsPlaying(false);
                  // Clean up object URL
                  URL.revokeObjectURL(objectURL);
                });

                audio.addEventListener("canplaythrough", () => {
                  console.log(
                    "Follow-up audio can play through, starting playback",
                  );
                  // Start playback
                  audio.play().catch((playError) => {
                    console.error(
                      "Error starting follow-up audio playback:",
                      playError,
                    );
                    setIsPlaying(false);
                  });
                });

                // Force audio loading
                audio.load();

                // Set preload to auto to start loading immediately
                audio.preload = "auto";

                // Store reference to the audio element and try to play
                setTimeout(() => {
                  console.log(
                    "Attempting to play follow-up audio after timeout",
                  );
                  audio
                    .play()
                    .catch((e) =>
                      console.error("Timeout play attempt failed:", e),
                    );
                }, 300);

                // Store reference for cleanup
                window.sessionAudio = audio;
              })
              .catch((error) => {
                console.error(
                  "Error with direct follow-up audio generation:",
                  error,
                );

                // Fall back to the direct URL approach
                const encodedText = encodeURIComponent(data.question);
                const directUrl = `/api/tts/direct?text=${encodedText}`;

                console.log(
                  "Falling back to direct URL for follow-up question:",
                  directUrl,
                );
                const fallbackAudio = new Audio(directUrl);

                fallbackAudio.onended = () => {
                  console.log("Fallback follow-up audio ended");
                  setIsPlaying(false);
                };

                fallbackAudio.onerror = () => {
                  console.error("Fallback follow-up audio failed");
                  setIsPlaying(false);
                };

                fallbackAudio.oncanplaythrough = () => {
                  console.log("Fallback follow-up audio can play through");
                  fallbackAudio.play().catch((e) => {
                    console.error("Fallback follow-up play failed:", e);
                    setIsPlaying(false);
                  });
                };

                fallbackAudio.load();
              });
          } catch (error) {
            console.error(
              "Error setting up auto-play for follow-up audio:",
              error,
            );
            setIsPlaying(false);
          }
        })();
      }

      // Clear the response
      setPatientResponse("");
    },
    onError: (error) => {
      console.error("Process response error:", error);
      toast({
        title: "Error",
        description: "Failed to process your response. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch session information to verify it exists using Supabase directly
  const { data: sessionData, isLoading: isSessionLoading } = useQuery<Session>({
    queryKey: [`/sessions/${sessionId}`],
    queryFn: async () => {
      if (!sessionId) return null;
      const session = await getSessionById(sessionId);
      if (!session) {
        console.warn(`Session ${sessionId} not found in database`);
      } else {
        console.log(`Found session in database:`, session);
      }
      return session;
    },
    enabled: !!sessionId,
  });

  // Create report in the system
  const createReport = async (schema: Record<string, string>) => {
    try {
      // For demo sessions that don't exist in the database,
      // we'll just display the results without creating a database record
      if (!sessionData) {
        console.log("Session not found in database. Using demo mode.");
        toast({
          title: "Demo Mode",
          description:
            "This is a demo session. Report data is displayed but not saved to database.",
        });
        return {
          id: "demo-report",
          session_id: sessionId,
          summary: "Demo report",
          json_schema: schema,
        };
      }

      // Update session status in Supabase
      try {
        if (typeof sessionId === "string") {
          const updatedSession = await updateSessionStatus(
            sessionId,
            "completed",
          );
          console.log("Session status updated to completed:", updatedSession);
        }
      } catch (error) {
        console.error("Error updating session status in Supabase:", error);
        // Fallback to API if Supabase update fails
        if (typeof sessionId === "string") {
          await apiRequest("PATCH", `/api/sessions/${sessionId}/status`, {
            status: "completed",
          });
        }
      }

      // Convert schema to a summary
      const summary = Object.entries(schema)
        .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
        .join("\n");

      // Create report in Supabase
      let createdReport;
      try {
        if (typeof sessionId === "string") {
          createdReport = await createSupabaseReport(
            sessionId,
            summary,
            schema,
          );
          console.log(
            "Report created in Supabase successfully:",
            createdReport,
          );
        }
      } catch (supabaseError) {
        console.error("Error creating report in Supabase:", supabaseError);
        // Fallback to API if Supabase creation fails
        createdReport = await apiRequest("POST", "/api/reports", {
          session_id: sessionId,
          summary,
          json_schema: schema,
        }).then((r) => r.json());
      }

      // Force a refresh of session data
      queryClient.invalidateQueries({
        queryKey: [`/api/sessions/${sessionId}`],
      });

      // Also invalidate related queries if we have patient data
      const patientId = sessionData?.patient_id;
      if (patientId) {
        queryClient.invalidateQueries({
          queryKey: [`/api/patients/${patientId}/sessions`],
        });
        queryClient.invalidateQueries({
          queryKey: [`/api/patients/${patientId}/sessions-with-reports`],
        });
      }

      return createdReport;
    } catch (error) {
      console.error("Failed to create report:", error);
      toast({
        title: "Error Creating Report",
        description:
          "There was an error saving your session data. Please contact your doctor.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Improved text to speech function with ElevenLabs for high-quality voice
  // Prioritizes the direct TTS endpoint for more reliable autoplay
  const speakText = async (text: string) => {
    setIsPlaying(true);
    console.log("Speaking text with ElevenLabs");

    try {
      // Create a temporary button element (needed for Safari autoplay)
      const tempButton = document.createElement("button");
      tempButton.style.display = "none";
      document.body.appendChild(tempButton);

      // This is a workaround for Safari and mobile browsers
      // that require user interaction before allowing autoplay
      tempButton.addEventListener("click", function () {
        console.log("Temporary button clicked for audio autoplay");
      });

      // Simulate a click on the temp button
      tempButton.click();

      // Start a silent audio context to ensure audio capabilities are activated
      try {
        const AudioContext =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const audioCtx = new AudioContext();
          const silentBuffer = audioCtx.createBuffer(1, 1, 22050);
          const source = audioCtx.createBufferSource();
          source.buffer = silentBuffer;
          source.connect(audioCtx.destination);
          source.start();
          console.log("Silent audio context started to enable audio playback");
        }
      } catch (audioCtxError) {
        console.error("Error creating audio context:", audioCtxError);
      }

      // Remove the temporary button
      setTimeout(() => {
        document.body.removeChild(tempButton);
      }, 100);

      // Always use the direct TTS endpoint for reliability
      console.log("Using direct TTS endpoint for reliable autoplay");
      const encodedText = encodeURIComponent(text);
      const directUrl = `/api/tts/direct?text=${encodedText}`;

      // Create audio element
      const audio = new Audio();

      // Audio event listeners for reliable playback
      audio.onended = () => {
        console.log("Audio playback completed");
        setIsPlaying(false);
      };

      audio.onerror = (e) => {
        console.error("Error playing audio:", e);
        setIsPlaying(false);

        toast({
          title: "Audio Playback Error",
          description:
            "There was an issue with the audio playback. Please read the question instead.",
          variant: "destructive",
        });
      };

      audio.onloadedmetadata = () => {
        console.log("Audio metadata loaded, attempting playback");

        try {
          // Cache control for better performance
          const playPromise = audio.play();

          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log("Audio playback started successfully");
              })
              .catch((playError) => {
                console.error("Autoplay was prevented:", playError);

                // If autoplay was prevented, try again using user interaction
                document.addEventListener(
                  "click",
                  function handleAutoplay() {
                    audio
                      .play()
                      .catch((e) =>
                        console.error(
                          "Still failed after user interaction:",
                          e,
                        ),
                      );
                    document.removeEventListener("click", handleAutoplay);
                  },
                  { once: true },
                );

                toast({
                  title: "Manual Play Required",
                  description: "Click anywhere to enable audio playback.",
                  variant: "default",
                });
              });
          }
        } catch (playError) {
          console.error("Error during play attempt:", playError);
          setIsPlaying(false);
        }
      };

      // Set preload attribute for better loading
      audio.preload = "auto";

      // Set the source after setting up all event handlers
      audio.src = directUrl;

      // Load the audio (needed for some browsers)
      audio.load();

      // Store reference to the audio element for potential cleanup
      if (window.currentAudio) {
        try {
          window.currentAudio.pause();
        } catch (e) {
          console.error("Error pausing previous audio:", e);
        }
      }
      window.currentAudio = audio;
    } catch (error) {
      console.error("Error with audio playback:", error);
      setIsPlaying(false);

      toast({
        title: "Audio Playback Error",
        description: "There was an unexpected error with audio playback.",
        variant: "destructive",
      });
    }
  };

  // Start speech recognition
  const startListening = () => {
    if (!isSpeechRecognitionAvailable) {
      toast({
        title: "Speech Recognition Not Available",
        description:
          "Your browser does not support speech recognition. Please type your response instead.",
        variant: "default",
      });
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event) => {
          // Using type assertion here to fix the TypeScript error
          const transcript = Array.from(event.results)
            .map((result: any) => {
              // Using any type to work around TypeScript limitations
              return result[0].transcript;
            })
            .join("");

          setPatientResponse(transcript);
        };

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event);
          setIsListening(false);
          toast({
            title: "Speech Recognition Error",
            description:
              "There was an error with speech recognition. Please try again or type your response.",
            variant: "destructive",
          });
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          
          // Wait a small moment to ensure the final transcript is processed
          setTimeout(() => {
            // Check if we have a response and automatically submit it
            if (patientResponse.trim()) {
              console.log('Speech recognition ended, auto-submitting response');
              processResponseMutation.mutate(patientResponse);
            }
          }, 300);
        };

        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
        setIsListening(false);
        toast({
          title: "Speech Recognition Error",
          description:
            "Failed to start speech recognition. Please check your microphone permissions.",
          variant: "destructive",
        });
      }
    }
  };

  // Stop speech recognition and automatically submit the response
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      // Add a small delay to ensure the final transcript is captured
      setTimeout(() => {
        if (patientResponse.trim()) {
          processResponseMutation.mutate(patientResponse);
        }
      }, 200);
    }
  };

  // Handle manual response submission
  const handleResponseSubmit = () => {
    if (patientResponse.trim()) {
      processResponseMutation.mutate(patientResponse);
    }
  };

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-5">
      <Card className="w-full max-w-2xl p-6 shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Welcome to omnidoc</h1>
          <p className="text-gray-600 mt-2">
            Please answer the following questions to the best of your ability to
            give your healthcare provider more context about your visit!
          </p>

          {!isSpeechRecognitionAvailable && (
            <div className="mt-2 text-sm bg-amber-50 text-amber-700 p-2 rounded">
              <p>
                Note: Speech recognition is not available in your browser.
                Please type your responses.
              </p>
            </div>
          )}
        </div>

        {!isSessionStarted ? (
          <div className="flex flex-col items-center space-y-4">
            <p className="text-center text-gray-700 mb-4">
              This virtual health interview will ask you a series of questions
              about your health concerns. Your responses will be recorded and
              shared with your healthcare provider.
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
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h2 className="text-xl font-semibold text-center">
              Interview Completed
            </h2>
            <p className="text-center text-gray-600">
              Thank you for completing your health interview. Your doctor will
              review your information before your appointment.
            </p>

            {/* Patient details if available */}
            {sessionData && (
              <div className="w-full bg-blue-50 p-4 rounded-lg mb-2">
                <h3 className="font-medium mb-2 text-blue-800">
                  Session Information:
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-blue-700">Session ID:</span>
                  <span className="font-mono">{sessionId}</span>
                  <span className="text-blue-700">Status:</span>
                  <span className="font-semibold text-green-600">
                    Completed
                  </span>
                  {sessionData.started_at && (
                    <>
                      <span className="text-blue-700">Created:</span>
                      <span>
                        {new Date(sessionData.started_at).toLocaleString()}
                      </span>
                    </>
                  )}
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
                    <span className="font-medium text-gray-700 capitalize">
                      {key.replace(/_/g, " ")}:
                    </span>
                    <span className="col-span-2">
                      {value || "Not provided"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full flex flex-col sm:flex-row gap-3 mt-4">
              <Button variant="outline" asChild className="flex-1">
                <Link href="/">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  Return to Home
                </Link>
              </Button>

              {sessionData?.patient_id && (
                <Button
                  asChild
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Link href={`/patients/${sessionData.patient_id}/details`}>
                    View Patient Profile
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Current question display */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between">
                <h3 className="font-medium text-blue-800 mb-2">Question:</h3>
                <div>
                  {isPlaying ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        // We don't use browser speech synthesis anymore
                        // Just stop the audio playback and reset state
                        setIsPlaying(false);
                      }}
                    >
                      <Square className="h-4 w-4 text-blue-600" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => speakText(currentQuestion)}
                    >
                      <Play className="h-4 w-4 text-blue-600" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-blue-900">{currentQuestion}</p>
            </div>

            {/* Patient response section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-gray-700">Your Response:</h3>

                {isSpeechRecognitionAvailable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isListening ? stopListening : startListening}
                    className={`h-8 ${isListening ? "bg-red-50 text-red-600 border-red-200" : "bg-blue-50 text-blue-600 border-blue-200"}`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="h-4 w-4 mr-2" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Start Recording
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="relative">
                <textarea
                  value={patientResponse}
                  onChange={(e) => setPatientResponse(e.target.value)}
                  placeholder="Type your response here or use the microphone..."
                  className="w-full border rounded-lg p-3 h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isListening || processResponseMutation.isPending}
                />
                {isListening && (
                  <div className="absolute inset-0 bg-gray-50 bg-opacity-50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-2 relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-75"></div>
                        <div className="relative bg-red-200 rounded-full w-16 h-16 flex items-center justify-center">
                          <Mic className="h-8 w-8 text-red-600" />
                        </div>
                      </div>
                      <p className="text-gray-700">Listening...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                {processResponseMutation.isPending ? (
                  <Button disabled>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setPatientResponse("")}
                      disabled={!patientResponse.trim() || isListening}
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={handleResponseSubmit}
                      disabled={!patientResponse.trim() || isListening}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit Response
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SessionLink;
