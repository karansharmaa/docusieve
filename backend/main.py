from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from services.parsing import extract_text_from_pdf
from services.scoring import basic_overlap_score
from services.llm import build_feedback_prompt, call_groq_llm

app = FastAPI(title="DocuSieve")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
):
    if resume.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported")

    file_bytes = await resume.read()
    resume_text = extract_text_from_pdf(file_bytes)

    stats = basic_overlap_score(resume_text, job_description)

    return {
        "resume_chars": len(resume_text),
        "job_description_chars": len(job_description),
        # NEW: top-level score (combined if present)
        "score": stats.get("combined_score", stats.get("score")),
        "analysis": stats,
    }


@app.post("/analyze_llm")
async def analyze_llm(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
):
    if resume.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported")

    file_bytes = await resume.read()
    resume_text = extract_text_from_pdf(file_bytes)

    stats = basic_overlap_score(resume_text, job_description)

    prompt = build_feedback_prompt(resume_text, job_description, stats)
    llm_output = call_groq_llm(prompt)

    return {
        # NEW: top-level score for frontend
        "score": stats.get("combined_score", stats.get("score")),
        "analysis": stats,
        "llm_feedback": llm_output,
    }
