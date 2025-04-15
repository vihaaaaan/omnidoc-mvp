import { OpenAI } from "openai";

// Singleton client
let openaiClient: OpenAI | null = null;

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    // Use Groq API compatible with OpenAI client
    openaiClient = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    console.log("OpenAI client initialized with Groq API");
  }
  return openaiClient;
}

// Medical interview schema
export interface InterviewSchema {
  chief_complaint?: string;
  symptoms?: string;
  duration?: string;
  severity?: string;
  medical_history?: string;
  current_medications?: string;
  allergies?: string;
  family_history?: string;
  lifestyle?: string;
  additional_notes?: string;
  [key: string]: string | undefined;
}

// Session state
export interface SessionState {
  schema: InterviewSchema;
  currentField: string | null;
  completedFields: string[];
  lastResponse?: string;
  nextQuestion?: string;
}

// Session store (in-memory, would use database in production)
const sessions = new Map<string, SessionState>();

// Get or initialize session
export function getOrCreateSession(sessionId: string): SessionState {
  if (!sessions.has(sessionId)) {
    // Initialize new session with empty schema
    const newSession: SessionState = {
      schema: {},
      currentField: null,
      completedFields: [],
    };
    sessions.set(sessionId, newSession);
    return newSession;
  }

  return sessions.get(sessionId)!;
}

// Get all fields that need to be filled
const getAllFields = (): string[] => [
  "chief_complaint",
  "symptoms",
  "duration",
  "severity",
  "medical_history",
  "current_medications",
  "allergies",
  "family_history",
  "lifestyle",
  "additional_notes",
];

// Get next unfilled field
function getNextUnfilledField(session: SessionState): string | null {
  const allFields = getAllFields();
  for (const field of allFields) {
    if (!session.completedFields.includes(field)) {
      return field;
    }
  }
  return null; // All fields filled
}

// Generate first question for interview
export async function generateFirstQuestion(
  sessionId: string,
): Promise<string> {
  const session = getOrCreateSession(sessionId);
  const client = getOpenAIClient();

  session.currentField = "chief_complaint";

  try {
    const response = await client.chat.completions.create({
      model: "llama3-70b-8192", // Groq's LLaMA 3 model
      messages: [
        {
          role: "system",
          content:
            "You are a medical assistant conducting an initial patient screening. Keep your questions clear, concise, compassionate, and professional. Ask only one question at a time.",
        },
        {
          role: "user",
          content:
            "Start the medical screening interview with an introduction and ask about the chief complaint.",
        },
      ],
    });

    const question =
      response.choices[0].message.content ||
      "Hello, I'm here to help with your medical screening. What brings you in today?";

    session.nextQuestion = question;
    return question;
  } catch (error) {
    console.error("Error generating first question:", error);
    return "Hello, I'm here to help with your medical screening. What brings you in today?";
  }
}

// Process patient response and generate next question
export async function processResponse(
  sessionId: string,
  patientResponse: string,
): Promise<{ question: string; isComplete: boolean }> {
  const session = getOrCreateSession(sessionId);
  const client = getOpenAIClient();

  if (!session.currentField) {
    // Should not happen, but just in case
    session.currentField = "chief_complaint";
  }

  try {
    // First, summarize and extract information from the response with improved formatting
    const summarizationResponse = await client.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: `You are a medical assistant extracting key information about a patient's ${session.currentField.replace("_", " ")}. 
          Provide a concise, professional summary of the key medical information in the patient's response.
          
          Important guidelines:
          1. Write in PARAGRAPH FORMAT
          2. Do not use headings or bold text
          3. Do not include labels like "Chief Complaint:" in your response
          5. Focus only on factual medical information
          6. Use professional but straightforward language`,
        },
        {
          role: "user",
          content: patientResponse,
        },
      ],
    });

    // Extract and clean up the summary
    let summary =
      summarizationResponse.choices[0].message.content || patientResponse;

    // Remove any markdown formatting that might be present
    summary = summary.replace(/\*\*/g, ""); // Remove bold formatting
    summary = summary.replace(/#+\s/g, ""); // Remove heading formatting

    // Remove labels if they exist (e.g., "Chief Complaint: ")
    const fieldLabel = new RegExp(
      `${session.currentField.replace("_", " ")}:\\s*`,
      "i",
    );
    summary = summary.replace(fieldLabel, "");

    // Trim any extra whitespace
    summary = summary.trim();

    // Update schema with summarized information
    session.schema[session.currentField!] = summary;
    session.completedFields.push(session.currentField!);
    session.lastResponse = patientResponse;

    // Determine next field to ask about
    const nextField = getNextUnfilledField(session);

    if (!nextField) {
      // Interview is complete
      return {
        question:
          "Thank you for providing all the information. The medical screening is now complete.",
        isComplete: true,
      };
    }

    // Update current field
    session.currentField = nextField;

    // Generate transition to next question
    const nextQuestionResponse = await client.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content:
            "You are a medical assistant conducting a patient screening. Be concise, compassionate, and professional. Ask only one specific question.",
        },
        {
          role: "user",
          content: `The patient just told me about their ${session.completedFields[session.completedFields.length - 1].replace("_", " ")}: "${summary}". Now I need to ask about their ${nextField.replace("_", " ")}. Generate a smooth transition and ask a specific question about this topic.`,
        },
      ],
    });

    const nextQuestion =
      nextQuestionResponse.choices[0].message.content ||
      `Could you tell me about your ${nextField.replace("_", " ")}?`;

    session.nextQuestion = nextQuestion;

    return {
      question: nextQuestion,
      isComplete: false,
    };
  } catch (error) {
    console.error("Error processing response:", error);
    return {
      question: `I apologize for the difficulty. Could you tell me about your ${session.currentField.replace("_", " ")}?`,
      isComplete: false,
    };
  }
}

// Generate summary report from completed interview
export async function generateReport(
  sessionId: string,
): Promise<{ summary: string; structured: InterviewSchema }> {
  const session = getOrCreateSession(sessionId);
  const client = getOpenAIClient();

  // Check if interview is complete
  const nextField = getNextUnfilledField(session);
  if (nextField) {
    console.warn(
      `Generating report with incomplete interview, missing field: ${nextField}`,
    );
  }

  try {
    // Prepare schema information for the prompt
    const schemaInfo = Object.entries(session.schema)
      .map(([field, value]) => `${field.replace("_", " ")}: ${value || "N/A"}`)
      .join("\n");

    const reportResponse = await client.chat.completions.create({
      model: "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: `You are a medical professional creating a concise summary report from patient screening data. 
          Provide a professional medical assessment based on the information provided.
          
          Important formatting guidelines:
          1. Format your response as a single cohesive paragraph of 3-5 sentences
          2. Do not use bullet points, lists, or headings
          3. Do not use any markdown formatting like bold or italics
          4. Use professional medical terminology but ensure it's understandable to non-specialists
          5. Focus on synthesizing the key medical insights rather than listing all data points
          6. Start with the chief complaint, then cover key symptoms, and end with relevant medical context
          7. Keep it concise but comprehensive`,
        },
        {
          role: "user",
          content: `Generate a concise yet comprehensive medical summary report from the following patient screening data:\n\n${schemaInfo}`,
        },
      ],
    });

    // Extract and clean the summary
    let summary =
      reportResponse.choices[0].message.content ||
      "No report could be generated due to insufficient information.";

    // Remove any markdown formatting
    summary = summary.replace(/\*\*/g, ""); // Remove bold formatting
    summary = summary.replace(/#+\s/g, ""); // Remove heading formatting
    summary = summary.replace(/\n\s*[-*]\s+/g, " "); // Remove bullet points

    // Ensure it's a single paragraph
    summary = summary.split("\n").join(" ").trim();

    // Remove any duplicate spaces
    summary = summary.replace(/\s+/g, " ");

    return {
      summary,
      structured: session.schema,
    };
  } catch (error) {
    console.error("Error generating report:", error);
    return {
      summary:
        "Error generating medical report. Please contact your healthcare provider.",
      structured: session.schema,
    };
  }
}

// Get session state (for debugging/status)
export function getSessionState(sessionId: string): SessionState | null {
  return sessions.get(sessionId) || null;
}
