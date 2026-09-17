# Production Deployment Guide: AI Academic Assistant & Faculty Examination Platform

This guide covers deployment instructions for multiple cloud targets and container environments.

---

## 🚀 Option 1: Deploy on Render (Recommended Full-Stack 1-Click)

### Method A: Using the Render Blueprint (`render.yaml`)
1. Push your repository to GitHub: `https://github.com/VIKASH-51/Management_portal`.
2. Log into [Render.com](https://render.com).
3. Navigate to **Blueprints** -> **New Blueprint Instance**.
4. Select the `VIKASH-51/Management_portal` repository.
5. Render will automatically detect `render.yaml` and configure:
   - **Backend Web Service**: Python FastAPI + Uvicorn
   - **Frontend Static Site**: Vite React SPA with automated SPA routing rewrites.
6. Under Environment Variables for the backend, add your `GEMINI_API_KEY` (or `OPENAI_API_KEY`).
7. Click **Apply**. Render will build and deploy both services!

---

## ⚡ Option 2: Split Cloud (Render / Railway for Backend + Vercel for Frontend)

This setup offers high scalability and zero-cost hosting tiers.

### Step 1: Deploy Backend on Render (or Railway / Koyeb)
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Connect `VIKASH-51/Management_portal`.
3. Configure:
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
4. Add Environment Variables:
   - `GEMINI_API_KEY`: *(Your Google AI Studio key)*
   - `SECRET_KEY`: *(Any secure random 32+ character string)*
   - `UPLOAD_DIR`: `./uploads`
   - `EXPORT_DIR`: `./exports`
5. Click **Create Web Service**. Note your backend URL (e.g., `https://academic-backend.onrender.com`).

### Step 2: Deploy Frontend on Vercel
1. Log into [Vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import `VIKASH-51/Management_portal`.
4. Configure Project Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://academic-backend.onrender.com/api` *(replace with your Render backend URL)*
6. Click **Deploy**. Vercel will build and deploy the React application with instant global CDN distribution.

---

## 🐳 Option 3: Unified Docker Container (Any VPS / Cloud VM / Cloud Run)

You can run the entire platform as a single lightweight Docker container.

### Build and Run with Docker:
```bash
# Build the unified container
docker build -t academic-assistant:latest .

# Run the container
docker run -d \
  -p 8000:8000 \
  -e GEMINI_API_KEY="your_gemini_key" \
  -e SECRET_KEY="your_secure_secret_key" \
  -v academic_data:/app/data \
  --name academic_app \
  academic-assistant:latest
```

### Build and Run with Docker Compose:
```bash
# Start backend and frontend with persistent storage
docker compose up -d --build
```
- Access application at `http://localhost:8000`
- API documentation at `http://localhost:8000/docs`
- Health check at `http://localhost:8000/health`

---

## 🔒 Production Security & Environment Checklist

Before putting into production:
1. **Secret Key**: Ensure `SECRET_KEY` is a strong random secret.
2. **Super Admin Account**: On first startup, log in with `superadmin@institution.edu` / `SuperAdmin@2026` and change the password.
3. **Data Persistence**: When deploying on Docker or VPS, ensure persistent volumes are mounted for `/app/uploads`, `/app/exports`, and the SQLite database file.
4. **AI API Key**: Provide a valid `GEMINI_API_KEY` for syllabus extraction, question generation, and pedagogical notes synthesis.
