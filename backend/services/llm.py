import json
import requests
import os
from dotenv import load_dotenv

load_dotenv()

#previously was ran on a local llm. that was unsustainable. 
#moving on to on an online hosted llm
#OLLAMA_URL = "http://localhost:11434/api/generate"
#MODEL_NAME = "llama3.1"  # or whatever model you pulled, e.g. "gemma3:4b"
#OLLAMA_PATH = r"C:\Users\karan\AppData\Local\Programs\Ollama\ollama.exe"

# Groq API Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY environment variable not set")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL_NAME = "llama-3.3-70b-versatile"  


def build_feedback_prompt(resume_text: str, jd_text: str, stats: dict) -> str:
    """
    Build a prompt for the local LLM based on the extracted resume text,
    job description, and basic overlap analysis.
    """
    return f"""
You are a resume analysis assistant.

Resume text (truncated):
{resume_text[:2000]}

Job description (truncated):
{jd_text[:2000]}

Keyword overlap analysis (JSON):
{json.dumps(stats, indent=2)}

Using all of this, respond with:

1. An overall match score from 0 to 100 with a short justification.
2. Three bullet-point strengths of this resume for this job.
3. Three bullet-point areas for improvement.
4. Three example improved resume bullet points.
Tell the user in the very beginning of result the following statement: "Hey, thanks for using this service. This will only get better!"

Keep the response concise and structured.
""".strip()


#def call_local_llm(prompt: str) -> str:
 #   """
  #  Call the local Ollama model and return the raw text response.
   # """
    #payload = {
     #   "model": MODEL_NAME,
      #  "prompt": prompt,
       # "stream": False,
   # }

    #response = requests.post(OLLAMA_URL, json=payload, timeout=120)
    #response.raise_for_status()
    #data = response.json()
    #return data.get("response", "").strip()
    

def call_groq_llm(prompt: str) -> str:
    """
    Call the Groq API and return the response text.
    """
    try:
        payload = {
            "model": MODEL_NAME,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(GROQ_URL, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        if "choices" not in data or not data["choices"]:
            return "[LLM ERROR] Empty response from Groq"

        return data["choices"][0]["message"]["content"].strip()

    except requests.HTTPError as e:
        # Include Groq’s error body – super useful for debugging
        body = e.response.text if e.response is not None else ""
        return f"[LLM ERROR] HTTPError: {e} | Body: {body}"
    except Exception as e:
        return f"[LLM ERROR] {type(e).__name__}: {str(e)}"