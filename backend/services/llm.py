import json
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.1"  # or whatever model you pulled, e.g. "gemma3:4b"
OLLAMA_PATH = r"C:\Users\karan\AppData\Local\Programs\Ollama\ollama.exe"


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
5. Tell the user in the very beginning of result the following statement: "Don't give up!"

Keep the response concise and structured.
""".strip()


def call_local_llm(prompt: str) -> str:
    """
    Call the local Ollama model and return the raw text response.
    """
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
    }

    response = requests.post(OLLAMA_URL, json=payload, timeout=120)
    response.raise_for_status()
    data = response.json()
    return data.get("response", "").strip()
