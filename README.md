# A.M.A.B.A

**A**utonomous **M**ulti-**A**gent **B**rowser **A**utomation

A Chrome/Chromium browser extension that connects to a FastAPI backend for
AI-powered autonomous web navigation with multi-agent orchestration.

## Architecture

```
popup.html / popup.js   ← User-facing popup UI (Ready ↔ Active views)
options.html / options.js ← Settings page (model, API keys, toggles)
background.js            ← Service worker (health polling, message routing)
content.js               ← DOM interaction on web pages
api.js                   ← Centralized API service layer
```

## Backend

Connected to: `https://amaba-backend.onrender.com`

### API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Health check |
| `/api/status` | GET | System status |
| `/api/agents` | GET | List all agents |
| `/api/agents/{id}/start` | POST | Start an agent |
| `/api/agents/{id}/stop` | POST | Stop an agent |
| `/api/orchestrator/run` | POST | Run orchestration task |
| `/api/orchestrator/status` | GET | Orchestrator status |
| `/api/logs` | GET/POST | Execution logs |
| `/api/tasks` | POST | Create task |
| `/api/browser/navigate` | POST | Navigate to URL |
| `/api/browser/scrape` | POST | Scrape page elements |
| `/api/browser/click` | POST | Click element |

## Setup

1. Clone this repo and checkout `pre-develop`
2. Open `chrome://extensions/` → enable Developer Mode
3. Click "Load unpacked" → select this folder
4. Open Settings (gear icon in popup) to configure API keys
