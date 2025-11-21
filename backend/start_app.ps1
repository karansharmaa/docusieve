# start_docusieve.ps1

$ErrorActionPreference = "Stop"

# Go to backend folder
Set-Location "C:\Users\karan\IdeaProjects\docusieve\backend"

# Activate venv
& ".\venv\Scripts\Activate.ps1"

# Run FastAPI with uvicorn
python -m uvicorn main:app --reload
