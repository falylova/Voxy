# VOXY

Turn any PDF into a study companion you can talk to.

VOXY reads your document, then lets you practice explaining it out loud — through a live voice conversation, an interview mode, or a graded oral exam — on top of a clear overview, an auto-generated quiz, and a block-by-block read-aloud explanation.

## Features

- **Oral Practice** — a live voice conversation with VOXY about your document.
  - **Chat mode**: ask anything, out loud.
  - **Interview mode**: VOXY asks you questions one at a time, like a practice interview.
  - **Exam mode**: VOXY runs a graded oral exam and gives you a final score with feedback.
- **Overview** — a summary, key concepts, and a "things to know before you start" list.
- **Quiz** — auto-generated multiple-choice questions at three difficulty levels, with explanations.
- **Explained** — the document split into blocks; tap one and VOXY rewrites it in plain, spoken-friendly language and reads it aloud.

Uploading a PDF only extracts its text — nothing is sent to Gemini until you actually open a tab. Each tab's result (overview, quiz, sections, per-block explanations) is generated once and cached in memory, so switching between tabs never re-triggers the same AI call.

## Tech stack

| | |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, Uvicorn |
| AI | Google Gemini (overview, quiz, sections, chat/interview/exam) |
| Voice | Web Speech API (speech-to-text), Microsoft Edge TTS (text-to-speech) |
| PDF | pypdf |

## Project structure

```
VOXY/
├── backend/
│   ├── main.py                # FastAPI app & routes
│   ├── requirements.txt
│   ├── .env                   # GEMINI_API_KEY (not committed)
│   └── services/
│       ├── gemini.py          # Prompts & Gemini calls (overview, quiz, sections, chat)
│       ├── pdf.py             # PDF text/page extraction
│       ├── store.py           # In-memory per-document store & cache
│       └── tts.py             # Edge TTS speech generation
└── frontend/
    └── src/
        ├── api/                # Fetch helpers (documentApi, chatApi, oralApi, config)
        ├── components/         # Landing, AppShell, OralPractice, Overview, Quiz, Chat (Explained)
        ├── data/                # Static UI copy (e.g. difficulty labels)
        └── types.ts
```

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/apikey)

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
GEMINI_API_KEY=your_real_gemini_api_key
```

Run the server:

```bash
uvicorn main:app --reload --port 8000
```

The API is now available at `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`) in **Chrome or Edge** — Oral Practice relies on the Web Speech API, which isn't supported in every browser.

> The frontend calls the backend at `http://localhost:8000` by default (see `frontend/src/api/config.ts`). Update `API_BASE_URL` there if you deploy the backend elsewhere.

## API overview

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/analyze-pdf` | Extracts text + page count from an uploaded PDF (no AI call). Returns `{ doc_id, pages }`. |
| `GET` | `/api/overview/{doc_id}` | Generates (or returns cached) summary, key concepts, fundamentals, and learning path. |
| `GET` | `/api/quiz/{doc_id}` | Generates (or returns cached) a 3-level multiple-choice quiz. |
| `GET` | `/api/sections/{doc_id}` | Generates (or returns cached) the document's block/section breakdown. |
| `GET` | `/api/explain/{doc_id}/{section_id}` | Generates (or returns cached) a clear, spoken-friendly explanation of one block. |
| `POST` | `/api/chat` | Chat / interview / exam turn. Body: `{ doc_id, message, history, mode, start }`. |
| `GET` | `/api/tts` | Converts text to speech (MP3) via Edge TTS. |

## Notes

- Documents and generated content are stored **in memory** (see `services/store.py`) — they're cleared on backend restart. Good enough for local use and demos; swap in a real database for anything persistent or multi-instance.
- CORS is wide open (`allow_origins=["*"]`) for local development — tighten this before deploying publicly.
