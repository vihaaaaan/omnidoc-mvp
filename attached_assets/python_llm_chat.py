import os
import json
import openai
# from voice import get_text_from_voice, speak_text_out_loud


# ---- Configuration ----
GROQ_API_KEY = "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"
BASE_URL = https://api.groq.com/openai/v1
GPT_MODEL = "llama-3.3-70b-versatile"
SCHEMA_PATH = "/Users/suryasuresh/Documents/omnidoc-ai/omnidoc_backend/core/utils/schema.json"

# ---- Initialize Groq Client ----
client = openai.OpenAI(
    api_key=GROQ_API_KEY,
    base_url=BASE_URL
)

# ---- Load & Save Schema ----
def load_schema():
    with open(SCHEMA_PATH, "r") as f:
        return json.load(f)

def save_schema(schema):
    with open(SCHEMA_PATH, "w") as f:
        json.dump(schema, f, indent=2)

# ---- Reset Schema on Start ----
def reset_schema():
    schema = load_schema()
    cleared_schema = {k: "" for k in schema}
    save_schema(cleared_schema)

# ---- Get Next Unanswered Field ----
def get_next_unfilled_field(schema):
    for field, value in schema.items():
        if value in [None, "", []]:
            return field
    return None

# ---- Generate First Question ----
def generate_first_question(field):
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

# ---- Generate Transition + Next Question ----
def generate_transition_question(prev_response, next_field):
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

# ---- Check if Response is Sufficient ----
def needs_follow_up(field, response):
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

# ---- Ask a Clarifying Follow-up ----
def generate_follow_up_question(field, response):
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

# ---- Convert Raw Response into Structured Data ----
def summarize_response_for_schema(field, raw_response):
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

# ---- Main Interview Loop ----
def run_prescreening():
    reset_schema()
    schema = load_schema()
    last_response = None
    first_question_asked = False

    while True:
        field = get_next_unfilled_field(schema)
        if not field:
            print("✅ All fields completed.")
            break

        if not first_question_asked:
            message = generate_first_question(field)
            first_question_asked = True
        else:
            message = generate_transition_question(last_response, field)

        print(f"[Nurse] {message}")
        # speak_text_out_loud(message)


        response_complete = False
        attempts = 0
        raw_response = ""

        while not response_complete and attempts < 3:
            print("🎤 Listening for response...")
            raw_response = input("🗣️ Simulated Patient Response: ")
            # raw_response = get_text_from_voice()
            # print(f"📝 You said: {raw_response}")


            if needs_follow_up(field, raw_response):
                response_complete = True
            else:
                follow_up = generate_follow_up_question(field, raw_response)
                print(f"[Nurse] {follow_up}")
                attempts += 1

        # Whether complete or not, store the latest response
        clean_value = summarize_response_for_schema(field, raw_response)
        schema[field] = clean_value
        save_schema(schema)

        last_response = raw_response

if __name__ == "__main__":
    run_prescreening()

