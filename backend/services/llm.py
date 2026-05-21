import json
import requests
import os
from dotenv import load_dotenv

load_dotenv()

#previously was ran on a local llm. that was unsustainable. 
#moving on to on an online hosted llm
#OLLAMA_URL = "http://localhost:11434/api/generate"
#MODEL_NAME = "llama3.1"  # or whatever model you pulled, e.g. "gemma3:4b"
#OLLAMA_PATH = ****REDACTED****
# Groq API Configuration

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY environment variable not set")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL_NAME = "llama-3.3-70b-versatile"


def extract_jd_skills(jd_text: str) -> str:
    """
    Use LLM to strip a job description down to only skills, tools,
    languages, and qualifications. Removes boilerplate like benefits,
    legal disclaimers, and logistics.
    """
    prompt = (
        "Extract only the technical skills, tools, programming languages, frameworks, and qualifications from the job description below.\n\n"
        "Rules:\n"
        "- Return only a plain list of skills and requirements, one per line.\n"
        "- Do NOT include company culture, benefits, salary, work hours, location, legal disclaimers, or HR boilerplate.\n"
        "- Do NOT add any explanation or preamble. Just the list.\n\n"
        f"Job description:\n{jd_text}"
    )

    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 500
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(GROQ_URL, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return jd_text


def semantic_score(resume_text: str, phrase_misses: list[str]) -> list[str]:
    """
    For each phrase miss, ask Groq if the resume demonstrates that skill
    in different words. Returns a list of semantic hits.
    """
    if not phrase_misses:
        return []

    phrases_formatted = "\n".join(f"- {p}" for p in phrase_misses)

    prompt = (
        "You are a resume analysis assistant.\n\n"
        "Below is a list of skills and phrases that were NOT found verbatim in the resume.\n"
        "For each one, determine if the resume demonstrates that skill or experience in different words.\n\n"
        "Rules:\n"
        "- Answer ONLY with a JSON array of the phrases that ARE semantically present in the resume.\n"
        "- If none match, return an empty array: []\n"
        "- Do NOT include phrases that are genuinely missing.\n"
        "- Do NOT add explanation or preamble. JSON only.\n\n"
        f"Missing phrases:\n{phrases_formatted}\n\n"
        f"Resume text:\n{resume_text[:3000]}"
    )

    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 500
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(GROQ_URL, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        raw = data["choices"][0]["message"]["content"].strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(raw)
        if isinstance(result, list):
            return [p for p in result if p in phrase_misses]
        return []
    except Exception:
        return []


def build_feedback_prompt(resume_text: str, jd_text: str, stats: dict) -> str:
    """
    Build a prompt for the LLM based on the extracted resume text,
    job description, and deterministic analysis.
    """
    final_score = stats.get("combined_score", stats.get("score"))

    phrase_hits = stats.get("phrase_hits", [])
    phrase_misses = stats.get("phrase_misses", [])
    semantic_hits = stats.get("semantic_hits", [])
    overlap_examples = [w for w in stats.get("overlap_examples", []) if len(w) > 6]

    resume_trunc = resume_text[:2000]
    jd_trunc = jd_text[:2000]

    return f"""
You are a resume analysis assistant.

CRITICAL RULES (MUST FOLLOW):
- The overall match score is FIXED and must be exactly: {final_score}
- Do NOT output any other overall score (no ranges, no alternate numbers).
- Do NOT invent skills, tools, protocols, years of experience, or domain experience.
- Only cite strengths from DETECTED items below.
- Only cite gaps from MISSING items below.
- If something isn't in the lists, you must treat it as unknown/missing.
- Do NOT reference internal variable names like phrase_hits, semantic_hits, overlap_examples in your response.

Resume text (truncated):
{resume_trunc}

Job description (truncated):
{jd_trunc}

Keyword overlap analysis (JSON):
{json.dumps(stats, indent=2)}

DETECTED (present in resume — use these naturally, do NOT reference variable names in your response):
- Exact phrase matches: {phrase_hits[:25]}
- Implied skills (resume shows these without exact wording): {semantic_hits[:15]}
- Keyword matches: {overlap_examples[:20]}

MISSING (not found in resume):
- Gaps: {phrase_misses[:20]}

Using all of this, respond with:

Tell the user in the very beginning of result the following statement:
"Hey, thanks for using this service. This will only get better!"

Then:

1. Overall match score: {final_score}
   - Give a short justification using exact phrase matches and implied skills (strength) and gaps (weaknesses).
2. Three bullet-point strengths (ONLY from exact phrase matches or implied skills. If none exist, note the resume shows foundational relevance but lacks strong phrase alignment. Never reference internal variable names).
3. Three bullet-point areas for improvement (ONLY from gaps).
4. Three example improved resume bullet points:
   - Each bullet MUST start with "If applicable,"
   - Each bullet MUST include 1–2 phrases taken EXACTLY from gaps.
   - Do not claim the candidate already has that experience.

Keep the response concise and structured.
""".strip()


def call_groq_llm(prompt: str) -> str:
    """
    Call the Groq API and return the response text.
    """
    try:
        payload = {
            "model": MODEL_NAME,
            "messages": [{"role": "user", "content": prompt}],
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
        body = e.response.text if e.response is not None else ""
        if e.response is not None and e.response.status_code == 429:
            return "[LLM ERROR] RATE_LIMIT"
        return f"[LLM ERROR] HTTPError: {e} | Body: {body}"
    except Exception as e:
        return f"[LLM ERROR] {type(e).__name__}: {str(e)}"