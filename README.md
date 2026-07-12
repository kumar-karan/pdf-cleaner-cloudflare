# Aura PDF Cleaner - Cloudflare Web App

A premium serverless web application to clean handwritten annotations, highlights, and vector drawings from PDFs (slides, notes) at the edge, using Cloudflare Workers (Python) and Cloudflare Pages (Frontend).

## Project Structure

```
pdf-cleaner-cloudflare/
├── backend/
│   ├── main.py          # FastAPI application & PDF cleaning logic
│   ├── requirements.txt # Python dependencies (pypdf, fastapi, uvicorn)
│   └── wrangler.toml    # Cloudflare Workers configuration
├── static/
│   ├── index.html       # Modern dark-mode UI
│   ├── style.css        # Premium Glassmorphic styles
│   └── app.js           # Drag & Drop upload & download handler
└── README.md            # Setup and deployment guide
```

---

## Local Development & Testing

You can run both the frontend and backend locally with a single FastAPI server.

1. **Install Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Run Server**:
   ```bash
   python -m uvicorn backend.main:app --reload
   ```

3. **Open App**:
   Navigate to [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser. The frontend will be served, and API requests will route to `/api/clean-pdf`.

---

## Cloudflare Deployment (100% Free Tier)

Deploying both parts to Cloudflare takes less than 5 minutes and is completely free.

### Part 1: Deploy Backend (Cloudflare Workers)

Cloudflare Python Workers run on Pyodide (WAssembly CPython) and support `pypdf` natively.

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Deploy Worker**:
   Navigate to the `backend/` directory and deploy:
   ```bash
   cd backend
   wrangler deploy
   ```
   This will output a Worker URL, e.g., `https://pdf-cleaner-api.karankumar.workers.dev`.

---

### Part 2: Connect Frontend to Backend

1. Open `static/app.js`.
2. Locate the `API_URL` configuration at the top:
   ```javascript
   const API_URL = 'https://pdf-cleaner-api.karankumar.workers.dev/api/clean-pdf';
   ```
   Replace the placeholder domain with your deployed Cloudflare Worker URL.

---

### Part 3: Deploy Frontend (Cloudflare Pages)

Cloudflare Pages hosts the static HTML/CSS/JS assets on Cloudflare's edge network for free.

1. **Deploy static folder**:
   Navigate to the root project directory and deploy the `static` folder to Pages:
   ```bash
   wrangler pages deploy static --project-name=pdf-cleaner-web
   ```
   Follow the CLI prompts to select your account and deploy.
   
2. **Access your site**:
   Cloudflare will output a public Pages URL (e.g., `https://pdf-cleaner-web.pages.dev`). You can also bind your custom domain for free!
