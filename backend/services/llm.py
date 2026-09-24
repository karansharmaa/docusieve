import json
import requests
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY environment variable not set")

GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={GEMINI_API_KEY}"

def _call_gemini(prompt: str, max_tokens: int = 1000) -> str:
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": max_tokens
        }
    }
    try:
        response = requests.post(GEMINI_URL, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 429:
            return "[LLM ERROR] RATE_LIMIT"
        return f"[LLM ERROR] HTTPError {e.response.status_code if e.response is not None else 'unknown'}"
    except Exception as e:
        return f"[LLM ERROR] {type(e).__name__}: {str(e)}"


def extract_jd_skills(jd_text: str) -> str:
    prompt = (
        "Extract only the technical skills, tools, programming languages, frameworks, and qualifications from the job description below.\n\n"
        "Rules:\n"
        "- Return only a plain list of skills and requirements, one per line.\n"
        "- Do NOT include company culture, benefits, salary, work hours, location, legal disclaimers, or HR boilerplate.\n"
        "- Do NOT add any explanation or preamble. Just the list.\n\n"
        f"Job description:\n{jd_text}"
    )
    result = _call_gemini(prompt, max_tokens=500)
    if result.startswith("[LLM ERROR]"):
        return jd_text
    return result


def semantic_score(resume_text: str, phrase_misses: list[str]) -> list[str]:
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

    result = _call_gemini(prompt, max_tokens=500)
    try:
        raw = result.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [p for p in parsed if p in phrase_misses]
        return []
    except Exception:
        return []


def build_feedback_prompt(resume_text: str, jd_text: str, stats: dict) -> str:
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

DETECTED (present in resume):
- Exact phrase matches: {phrase_hits[:25]}
- Implied skills: {semantic_hits[:15]}
- Keyword matches: {overlap_examples[:20]}

MISSING (not found in resume):
- Gaps: {phrase_misses[:20]}

Using all of this, respond with:

Tell the user in the very beginning:
"Hey, thanks for using this service. This will only get better!"

Then:

1. Overall match score: {final_score}
   - Give a short justification using exact phrase matches and implied skills (strength) and gaps (weaknesses).
2. Three bullet-point strengths (ONLY from exact phrase matches or implied skills. If none exist, note the resume shows foundational relevance but lacks strong phrase alignment.)
3. Three bullet-point areas for improvement (ONLY from gaps. If no gaps, say so once.)
4. Three example improved resume bullet points:
   - Each bullet MUST start with "If applicable,"
   - Each bullet MUST include 1-2 phrases taken EXACTLY from gaps.
   - If no gaps exist, skip this section and say "No gaps identified."

Keep the response concise and structured.
""".strip()


def call_groq_llm(prompt: str) -> str:
    result = _call_gemini(prompt, max_tokens=1000)
    return result