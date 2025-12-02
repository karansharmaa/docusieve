# DocuSieve – AI-Powered Resume Analyzer (FastAPI + Groq LLM + Next.js) 

DocuSieve is a resume analyzer that compares a **PDF resume** with a **job description** and generates:

- ATS-style match score  
- Skill overlap stats  
- Strengths  
- Weaknesses  
- Improved resume bullet points  

The system uses a FastAPI backend and a Next.js frontend, powered by Groq LLMs for fast inference.

---

## Hosting Notice (Free Tier Backend)

This project uses a free-tier Render instance to host the FastAPI backend.  
Free-tier services go to sleep after approximately 15 minutes of inactivity.

If the app has been inactive, the first request may take 5–10 seconds while the backend wakes up.  
All subsequent requests are fast.

---

## Features

### PDF Resume Parsing  
Extracts text from PDF resumes using `pdfplumber` including multi-column and structured resumes.

### Job Description Analysis  
Tokenizes and compares extracted resume text with the job description.

### Keyword Overlap Scoring  
Calculates:
- Resume vocab size  
- Job description vocab size
- Intersect count
- Overlap keyword examples  
- Percentage match score  

### Feedback via Groq LLM 
Uses `llama-3.3-70b-versatile` via Groq (free-tier) to generate: 
- ATS score (0–100)  
- strengths  
- improvement areas  
- 5 improved resume bullet points

### FastAPI Backend  
Endpoints:
- `/health`  
- `/analyze`  
- `/analyze_llm`

### Next.js Frontend (currently basic but ux/ui design implementation is upcoming)
Includes:
- PDF upload interface
- Job description input
- Analysis display
- Loading state

---

## Tech Stack

### Backend
- **Python 3.10+**
- **FastAPI**
- **pdfplumber**
- **Groq API**
- **Uvicorn**
- **Render (deployment - currently in progress of setup)**

### Frontend
- Next.js 14 (App Router)
- React
- TailwindCSS
- Vercel (deployment)
  
---

## Project Structure

```text
docusieve/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── services/
│   │   ├── parsing.py
│   │   ├── scoring.py
│   │   └── llm.py
│   └── venv/
└── frontend/
    ├── app/
    │   ├── page.tsx
    │   └── layout.tsx
    ├── public/
    ├── styles/
```

---

## Immediate upcoming Tasks/Steps and Challenges: 

 - Hosting the backend on a service like render such that the **python -m uvicorn main:app --reload** doesn't need to be running at all times on a computer. 

## Roadmap
### In Progress

- Improved ATS scoring
- Full resume rewrite mode
- PDF report export
- Cosine similarity scoring using embeddings
- Section-by-section quality scoring
- UI improvements

### Future Enhancements
- Support for multiple LLM providers
- Caching and performance improvements
- User accounts and saved reports
## Author

Karan Sharma<br>
BSc Computing Science<br>
University of the Fraser Valley <br>
