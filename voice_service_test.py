import requests
import json
import time
import uuid

# Test configuration
API_BASE_URL = "http://localhost:5001"
TEST_SESSION_ID = str(uuid.uuid4())

def test_voice_service():
    print("Testing voice service API...")
    
    # Test 1: Start session
    print("\n1. Starting a new session")
    response = requests.post(f"{API_BASE_URL}/api/start-session/{TEST_SESSION_ID}")
    
    if response.status_code != 200:
        print(f"Failed to start session: {response.status_code}")
        return
    
    session_data = response.json()
    print(f"Session started with ID: {TEST_SESSION_ID}")
    print(f"First field: {session_data['current_field']}")
    print(f"First question: {session_data['question']}")
    
    # Test 2: Process a response
    print("\n2. Processing a response")
    first_field = session_data['current_field']
    response = requests.post(
        f"{API_BASE_URL}/api/process-response/{TEST_SESSION_ID}",
        json={
            "response": "I have a severe headache that started yesterday",
            "current_field": first_field
        }
    )
    
    if response.status_code != 200:
        print(f"Failed to process response: {response.status_code}")
        return
    
    process_data = response.json()
    print(f"Response processed. Next field: {process_data['current_field']}")
    print(f"Next question: {process_data['question']}")
    
    # Test 3: Get schema
    print("\n3. Getting the schema")
    response = requests.get(f"{API_BASE_URL}/api/get-schema/{TEST_SESSION_ID}")
    
    if response.status_code != 200:
        print(f"Failed to get schema: {response.status_code}")
        return
    
    schema = response.json()
    print("Schema:")
    print(json.dumps(schema, indent=2))
    
    # Test 4: Text to speech
    print("\n4. Testing text-to-speech")
    response = requests.post(
        f"{API_BASE_URL}/api/text-to-speech",
        json={"text": "Hello, this is a test for voice synthesis."}
    )
    
    if response.status_code != 200:
        print(f"Failed text-to-speech: {response.status_code}")
    else:
        print("Text-to-speech successful")
        print(response.json())
    
    print("\nAll tests completed")

if __name__ == "__main__":
    try:
        test_voice_service()
    except requests.exceptions.ConnectionError:
        print("Error: Cannot connect to the voice service.")
        print("Make sure the voice API server is running on port 5001.")