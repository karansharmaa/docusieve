# DocuSieve: AI Powered Resume Analyzer (FastAPI + Google Gemini LLM + Next.js) 
## Currently on v3.2 

## v3.2: ISSUE: GROQ ended support for llama-3.3-70b-versatile. (FIXED) 
I learned that GROQ had discontinued the model **llama-3.3-70b-versatile**. To adapt to this change, I researched what the best model would be to make it so that this program stays functional - that the feedback given by the LLM is real and not erroring out. 
The LLM that DocuSieve runs on now Google Gemini-3.1-flash-late. 
Thet benefits of this model is the efficiency and generous token limits. One of the trade-offs is speed - this LLM is slower than llama-3.3-70b-versatile. The speed of results on gemini-3.1-flash-lite are roughly 3 seconds slower than the predecessor. 
---> Another update: I now have an uptime robot running at all times to ensure that the backend does not go into sleep mode after 15 mins. This allows me to deal with cold-start whenever an analysis request is sent. <----

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

To combat this - I have an uptime robot running at all times - pinging the backend every 5 minutes so that the backend does not go into sleep mode - avoiding the cold start time issue. 



---
## ** CURRENT PROBLEM ** Known Limitation: JD filler terms in Phrase Scoring -- -- SOLVED! added bi-gram/tri-gram scoring which solved this issue!

Phrase scoring currently extracts n-grams from the raw job description, which means HR/legal filler terms ("equal opportunity employer", "visa sponsorship", "12-week onboarding") can surface as missed phrases even when they're irrelevant to your qualifications. Currently working on a fix that uses an LLM pre-processing step to strip the JD down to skills and requirements before scoring. Also currently researching to see if there's any other way to do this besides LLM pre-processing. 

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

### Feedback via Google Gemini LLM 
Uses `gemini-flash-3.1-lite` via Google (free-tier) to generate: 
- ATS score (0–100)  
- strengths  
- improvement areas  
- 5 improved resume bullet points

### FastAPI Backend  
Endpoints:
- `/health`  
- `/analyze`  
- `/analyze_llm`

### Next.js Frontend (v3 redesign — modern SaaS UI, light/dark mode, responsive mobile layout)
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
- **Google Gemini API**
- **Uvicorn**
- **Render**

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

 - Hosting the backend on a service like render such that the **python -m uvicorn main:app --reload** doesn't need to be running at all times on a computer. (SOLVED)
 - Phrase scoring currently extracts n-grams from the raw job description, which means HR/legal boilerplate ("equal opportunity employer", "visa sponsorship", "12-week onboarding") can surface as missed phrases even when they're irrelevant to your qualifications. (SOLVED)
 - Built phrase matching with bigram/trigram overlap as a simple starting point, but after research and testing it on my own resume, realized how naive and outdated that approach is. Replacing it with embedding-based semantic similarity to reflect how modern ATS systems actually work. (RESEARCHING)

## Roadmap

### DONE 

- Full resume rewrite mode
- PDF report export
- Section-by-section quality scoring
- UI improvements
- Support for multiple LLM providers
- Caching and performance improvements
- User accounts and saved reports
- Improving the quality of n-grams extracted from JD. Currently picking up non-useful terms.
- Handling rate limit errors. Make it look better for the user instead of them seeing 'load error'. 
- Semantic scoring
  
### In Progress

-  Improved ATS scoring (could be refined even more)



## Future Enhancements 
- Account creation.
- Save reports.
- Database integration for accounts + their reports.
- ??? Resume rewrite mode — full AI rewrite of the resume tailored to the JD
- Resume diff view: show exactly which words/phrases to add to your resume to improve the score

  
## Author

Karan Sharma<br>
BSc Computing Science<br>
University of the Fraser Valley <br>
