# Deployment Guide: AI Academic Assistant

## 1. Local Development Setup

### Backend (FastAPI + Python 3.12)
```bash
# Navigate to project root
cd /path/to/project

# Install dependencies
pip install -r backend/requirements.txt

# Run backend API server on port 8000
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend (React + Vite)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server on port 5173
npm run dev
```

## 2. Docker & Production Deployment
```bash
# Build and run using Docker Compose
docker compose up --build -d
```

- Backend API Documentation: `http://localhost:8000/docs` (Swagger UI)
- Frontend Web App: `http://localhost:5173`
