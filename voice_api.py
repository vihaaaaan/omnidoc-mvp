import os
import json
try:
    import speech_recognition as sr
    import pyttsx3
    from flask import Flask, request, jsonify
    from flask_cors import CORS
    import openai
    from dotenv import load_dotenv
except ImportError:
    print("Some modules are missing. Make sure to install all required packages.")
    print("Run: pip install flask flask-cors openai pydantic SpeechRecognition pyttsx3 python-dotenv")

# Load environment variables
load_dotenv()

# ---- Configuration ----
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
BASE_URL = "https://api.groq.com/openai/v1"
GPT_MODEL = "llama-3.3-70b-versatile"
SCHEMA_PATH = "./schema.json"

# ---- Initialize Groq Client ----
client = openai.OpenAI(
    api_key=GROQ_API_KEY,
    base_url=BASE_URL
)

# ---- Initialize Flask ----
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# ---- Text-to-Speech ----
def speak_text(text):
    """Convert text to speech and return audio data"""
    engine = pyttsx3.init()
    engine.save_to_file(text, 'temp_audio.wav')
    engine.runAndWait()
    
    with open('temp_audio.wav', 'rb') as f:
        audio_data = f.read()
    
    os.remove('temp_audio.wav')
    return audio_data

# ---- Speech-to-Text ----
def recognize_speech(audio_data):
    """Convert speech to text"""
    recognizer = sr.Recognizer()
    
    with open('temp_audio.wav', 'wb') as f:
        f.write(audio_data)
    
    with sr.AudioFile('temp_audio.wav') as source:
        audio = recognizer.record(source)
    
    os.remove('temp_audio.wav')
    
    try:
        text = recognizer.recognize_google(audio)
        return text
    except:
        return None

# ---- Schema Management ----
def load_schema(session_id):
    """Load schema for a session, or create a new one if it doesn't exist"""
    schema_dir = os.path.dirname(SCHEMA_PATH)
    if not os.path.exists(schema_dir):
        os.makedirs(schema_dir)
        
    session_schema_path = f"./schema_{session_id}.json"
    
    if os.path.exists(session_schema_path):
        with open(session_schema_path, "r") as f:
            return json.load(f)
    else:
        # Use default schema template
        default_schema = {
            "chief_complaint": "",
            "duration": "",
            "severity": "",
            "location": "",
            "quality": "",
            "alleviating_factors": "",
            "aggravating_factors": "",
            "associated_symptoms": "",
            "previous_treatment": "",
            "medical_history": "",
            "medications": "",
            "allergies": "",
            "family_history": ""
        }
        
        with open(session_schema_path, "w") as f:
            json.dump(default_schema, f, indent=2)
        
        return default_schema

def save_schema(session_id, schema):
    """Save schema for a session"""
    session_schema_path = f"./schema_{session_id}.json"
    with open(session_schema_path, "w") as f:
        json.dump(schema, f, indent=2)

def reset_schema(session_id):
    """Reset schema for a session"""
    schema = load_schema(session_id)
    cleared_schema = {k: "" for k in schema}
    save_schema(session_id, cleared_schema)
    return cleared_schema

# ---- Question Generation ----
def get_next_unfilled_field(schema):
    """Get the next field that needs to be filled"""
    for field, value in schema.items():
        if value in [None, "", []]:
            return field
    return None

def generate_first_question(field):
    """Generate the first question of the interview"""
    system_prompt = (
        "You are a warm and concise nurse starting a standard patient intake interview. "
        "Given a field name from an intake form, ask a simple, polite, and empathetic question "
        "to collect that information from the patient. Do not over-interpret the field. "
        "Only ask for the information, not for analysis or judgment."
    )
    user_prompt = f"Start the conversation by asking a question related to the field: '{field}'"

    response = client.chat.completions.create(
        model=GPT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.7
    )

    return response.choices[0].message.content.strip()

def generate_transition_question(prev_response, next_field):
    """Generate a transition to the next question"""
    system_prompt = (
        "You are a compassionate but concise nurse conducting a prescreening interview. "
        "Acknowledge the patient's response briefly with empathy, then naturally ask the next question about the given field."
    )
    user_prompt = (
        f"The patient said: \"{prev_response}\"\n"
        f"The next field is: \"{next_field}\""
    )

    response = client.chat.completions.create(
        model=GPT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.7
    )

    return response.choices[0].message.content.strip()

def needs_follow_up(field, response):
    """Check if the response needs a follow-up question"""
    system_prompt = (
        "You are helping a nurse complete a patient intake form. "
        "Decide if the patient's response gives enough information to complete the field. "
        "Reply only with 'yes' or 'no'. Be strict: if you're unsure, return 'no'."
    )
    user_prompt = f"Field: {field}\nPatient response: \"{response}\"\nIs this complete?"

    result = client.chat.completions.create(
        model=GPT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.2
    )

    return result.choices[0].message.content.strip().lower() == "yes"

def generate_follow_up_question(field, response):
    """Generate a follow-up question"""
    system_prompt = (
        "You are a helpful nurse. The patient's response was unclear or incomplete. "
        "Ask a short, friendly follow-up question to clarify the answer for the given field."
    )
    user_prompt = f"Field: {field}\nPatient response: \"{response}\""

    result = client.chat.completions.create(
        model=GPT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.7
    )

    return result.choices[0].message.content.strip()

def summarize_response_for_schema(field, raw_response):
    """Extract relevant information from the response"""
    system_prompt = (
        "You are a medical assistant converting patient responses into structured form data. "
        "Given a field and a response, extract a clean, concise value suitable for a form. "
        "Return only the value with no extra words."
    )
    user_prompt = f"Field: {field}\nResponse: \"{raw_response}\""

    response = client.chat.completions.create(
        model=GPT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.3
    )

    return response.choices[0].message.content.strip()

# ---- API Routes ----
@app.route('/api/start-session/<session_id>', methods=['POST'])
def start_session(session_id):
    """Initialize or reset a session"""
    print(f"Starting session {session_id}")
    try:
        schema = reset_schema(session_id)
        field = get_next_unfilled_field(schema)
        
        if not field:
            print(f"All fields already completed for session {session_id}")
            return jsonify({"message": "All fields already completed", "complete": True})
        
        print(f"Generating first question for field: {field}")
        question = generate_first_question(field)
        print(f"Generated question: {question}")
        
        response = {
            "session_id": session_id,
            "current_field": field,
            "question": question,
            "complete": False
        }
        print(f"Returning response: {response}")
        return jsonify(response)
    except Exception as e:
        print(f"Error in start_session: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/process-response/<session_id>', methods=['POST'])
def process_response(session_id):
    """Process a patient response"""
    print(f"Processing response for session {session_id}")
    try:
        data = request.json
        response_text = data.get('response')
        print(f"Received response: {response_text[:50]}...")
        
        schema = load_schema(session_id)
        print(f"Loaded schema with fields: {list(schema.keys())}")
        
        current_field = data.get('current_field')
        print(f"Current field from request: {current_field}")
        
        if not current_field:
            current_field = get_next_unfilled_field(schema)
            print(f"No field specified, using next unfilled field: {current_field}")
        
        # Process the current response
        print(f"Checking if response is complete for field: {current_field}")
        complete = needs_follow_up(current_field, response_text)
        print(f"Response completeness check result: {complete}")
        
        if complete:
            # Save the response and move to next field
            print(f"Response is complete, summarizing for field: {current_field}")
            clean_value = summarize_response_for_schema(current_field, response_text)
            print(f"Summarized value: {clean_value}")
            
            schema[current_field] = clean_value
            save_schema(session_id, schema)
            print(f"Updated schema saved for session {session_id}")
            
            # Get the next field
            next_field = get_next_unfilled_field(schema)
            print(f"Next field to fill: {next_field}")
            
            if not next_field:
                # All fields completed
                print(f"All fields completed for session {session_id}")
                response = {
                    "message": "All fields completed",
                    "complete": True,
                    "schema": schema
                }
                print(f"Returning completion response: {response}")
                return jsonify(response)
            
            # Generate next question
            print(f"Generating transition question to field: {next_field}")
            question = generate_transition_question(response_text, next_field)
            print(f"Generated question: {question}")
            
            response = {
                "current_field": next_field,
                "question": question,
                "complete": False
            }
            print(f"Returning next question response: {response}")
            return jsonify(response)
        else:
            # Need follow-up for current field
            print(f"Response is incomplete, generating follow-up for field: {current_field}")
            follow_up = generate_follow_up_question(current_field, response_text)
            print(f"Generated follow-up question: {follow_up}")
            
            response = {
                "current_field": current_field,
                "question": follow_up,
                "complete": False
            }
            print(f"Returning follow-up response: {response}")
            return jsonify(response)
    except Exception as e:
        error_msg = f"Error in process_response: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/text-to-speech', methods=['POST'])
def text_to_speech_endpoint():
    """Convert text to speech"""
    print("Processing text-to-speech request")
    data = request.json
    text = data.get('text')
    
    print(f"Received text: {text}")
    if not text:
        print("Error: No text provided")
        return jsonify({"error": "No text provided"}), 400
    
    try:
        # Convert text to speech
        print(f"Initializing pyttsx3 engine")
        engine = pyttsx3.init()
        print(f"Saving text to temp_audio.wav: {text[:50]}...")
        engine.save_to_file(text, 'temp_audio.wav')
        print(f"Running engine...")
        engine.runAndWait()
        print(f"Audio file created at temp_audio.wav")
        
        # Return the audio file path (in a real app, you'd stream the audio)
        response = {"status": "success", "message": "Audio generated", "file_path": "temp_audio.wav"}
        print(f"Returning response: {response}")
        return jsonify(response)
    except Exception as e:
        error_msg = f"Error in text-to-speech: {str(e)}"
        print(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route('/api/speech-to-text', methods=['POST'])
def speech_to_text_endpoint():
    """Convert speech to text"""
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    audio_file.save('temp_input_audio.wav')
    
    try:
        # Convert speech to text
        recognizer = sr.Recognizer()
        
        with sr.AudioFile('temp_input_audio.wav') as source:
            audio = recognizer.record(source)
        
        text = recognizer.recognize_google(audio)
        os.remove('temp_input_audio.wav')
        
        return jsonify({"status": "success", "text": text})
    except Exception as e:
        if os.path.exists('temp_input_audio.wav'):
            os.remove('temp_input_audio.wav')
        return jsonify({"error": str(e)}), 500

@app.route('/api/get-schema/<session_id>', methods=['GET'])
def get_schema(session_id):
    """Get the current schema for a session"""
    schema = load_schema(session_id)
    return jsonify(schema)

# Create a sample schema.json file if it doesn't exist
if not os.path.exists(SCHEMA_PATH):
    default_schema = {
        "chief_complaint": "",
        "duration": "",
        "severity": "",
        "location": "",
        "quality": "",
        "alleviating_factors": "",
        "aggravating_factors": "",
        "associated_symptoms": "",
        "previous_treatment": "",
        "medical_history": "",
        "medications": "",
        "allergies": "",
        "family_history": ""
    }
    
    with open(SCHEMA_PATH, "w") as f:
        json.dump(default_schema, f, indent=2)
    
    print(f"Created schema template at {SCHEMA_PATH}")

if __name__ == '__main__':
    print("Starting Voice API service on port 5001...")
    print(f"Using Groq API key: {'*' * len(GROQ_API_KEY) if GROQ_API_KEY else 'Not found! Set GROQ_API_KEY in .env'}")
    app.run(host='0.0.0.0', port=5001, debug=True)