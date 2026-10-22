# ITS-thesis
Development of Intelligent Tutoring System

# How to Run

1. Build Docker Sandbox Image:
    cd backend/sandbox
    docker build -t cpp-sandbox .

2. Start FastAPI backend:
    cd ../../  # Go back to the its-project root folder
    .\venv\Scripts\activate
    uvicorn backend.sandbox.main:app --reload

in another window terminal

3. Start  React app:
    cd its-project/frontend
    npm run dev
