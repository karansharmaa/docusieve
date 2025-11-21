# DocuSieve – Local LLM AI-Powered (for now) Resume Analyzer 
(Local LLM (Ollama) --> Will be upgraded to support cloud-hosted LLMs (OpenAI/Anthropic) in addition to the current local Ollama setup. I will be learning as I go.)

DocuSieve is a resume analyzer that compares a **PDF resume** against a **job description** and generates:

- A match score  
- Skill overlap stats  
- Strengths  
- Weaknesses  
- Improved resume bullet points  

The entire system runs **locally** using **FastAPI** + **Ollama** (local LLM such as `llama3.1`).  
No cloud APIs. Full privacy.

---

## Features

### PDF Resume Parsing  
Extracts text from PDF resumes using `pdfplumber`.

### Job Description Analysis  
Tokenizes and compares extracted resume text with the job description.

### Keyword Overlap Scoring  
Basic deterministic scoring:
- Resume vocab size  
- JD vocab size  
- Overlap examples  
- Percentage match score  

### Local LLM Feedback (Ollama)  
Uses a local model (e.g., `llama3.1`) to generate:
- A match score (0–100)  
- 3 strengths  
- 3 improvement areas  
- 3 improved resume bullet points  

### FastAPI Backend  
Endpoints:
- `/health`  
- `/analyze`  
- `/analyze_llm`  

---

## Tech Stack

- **Python 3.9+**
- **FastAPI**
- **pdfplumber**
- **Ollama (local LLM runtime)**
- **Llama 3.1 / Gemma / Phi-3 (local models)**

---

## Project Structure

docusieve/ <br>
backend/ <br>
main.py <br>
requirements.txt <br>
services/ <br>
parsing.py <br>
scoring.py <br>
llm.py <br>
venv/ <br>


---

## How to Run Locally

### 1. Clone the repo

```bash
git clone https://github.com/karansharmaa/docusieve.git
cd docusieve/backend
```
### 2. Create and activate virtual environment
```bash
python -m venv venv
.\venv\Scripts\Activate
```
### 3. Install dependencies
```bash
pip install -r requirements.txt
```
### 4. Install Ollama

Download: https://ollama.com/download

Pull a model:
```bash
ollama pull llama3.1
```
### 5. Start backend
```bash
python -m uvicorn main:app --reload
```
### 6. Open API docs
```bash
Go to:

http://127.0.0.1:8000/docs
```

Use /analyze_llm to upload a resume PDF + job description.

Upcoming Tasks/Steps and Challenges: 

 - Create a frontend UI (React most likely - but I want to learn other technologies so might use something else)

- Semantic similarity scoring (MiniLM embeddings)

- ATS keyword suggestions

- Full resume rewriting mode

- Export analysis as PDF report


## Author

Karan Sharma<br>
BSc Computing Science<br>
University of the Fraser Valley <br>
