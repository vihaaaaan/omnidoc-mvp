# OmniDoc - Medical Screening Platform

OmniDoc is a modern healthcare platform that connects doctors with patients through interactive screening sessions and detailed medical reports.

## Features

- **Patient Management**: Track patient information, appointments, and history
- **Session Management**: Create and manage screening sessions for patients
- **Secure Shareable Links**: Generate unique session links for patients
- **Voice-to-Voice Screening**: AI-powered voice interactions (via Python microservice)
- **Automated Reports**: Generate structured medical reports based on screening data

## Getting Started

### Prerequisites
- Node.js v18+
- Python 3.11+ (for voice microservice)
- Supabase account for backend services

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd omnidoc
```

2. Install JavaScript dependencies
```bash
npm install
```

3. Install Python dependencies (for voice functionality)
```bash
pip install flask flask-cors openai pydantic SpeechRecognition pyttsx3 python-dotenv
```

4. Create a `.env` file with the following variables:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
```

### Running the Application

1. Start the main application:
```bash
npm run dev
```

2. Start the voice microservice (in a separate terminal):
```bash
python voice_api.py
```

## Voice Processing Microservice

The voice processing microservice provides:
- Text-to-speech conversion
- Speech-to-text recognition
- Structured medical screening conversations
- Schema-based data collection

### How It Works

1. Doctor creates a new session for a patient
2. System generates a unique session link
3. Patient accesses the link and participates in voice-based screening
4. AI guides the conversation through relevant medical topics
5. Responses are automatically structured and stored
6. Doctor can review the report via the dashboard

### Testing the Voice Microservice

You can test the voice microservice independently using the provided test script:
```bash
python voice_service_test.py
```

This will run through basic API functionality and verify that voice processing is working correctly.

## Tech Stack

### Frontend
- React
- Vite
- TanStack Query
- Tailwind CSS
- shadcn/ui components

### Backend
- Node.js / Express
- Python Flask (microservice)
- OpenAI / Groq APIs for AI
- Supabase for data storage
- SpeechRecognition & pyttsx3 for voice processing

## License
[MIT License](LICENSE)