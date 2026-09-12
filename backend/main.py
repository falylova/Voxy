from dotenv import load_dotenv

# Doit etre charge AVANT d'importer les services (gemini.py lit la cle API a l'import).
load_dotenv()

import asyncio
import os
import uuid
from typing import Optional

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from services import store
from services.gemini import (
    chat_with_document,
    generate_overview,
    generate_quiz,
    generate_section_explanation,
    generate_sections,
)
from services.pdf import extract_text_from_pdf
from services.tts import generate_speech

app = FastAPI(title="VOXY AI Backend")

# Limite de taille pour la demo : l'instance Render (512 Mo de RAM) peut planter
# (OOM, redemarrage silencieux) sur de gros PDF, surtout avec des images.
MAX_PDF_SIZE_BYTES = 8 * 1024 * 1024  # 8 Mo

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    doc_id: str
    message: str
    history: Optional[list[dict]] = None
    mode: Optional[str] = "chat"  # "chat" | "interview" | "exam"
    start: Optional[bool] = False


def _get_document_or_404(doc_id: str) -> dict:
    doc = store.get_document(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document introuvable. Merci de reimporter votre PDF.")
    return doc


@app.get("/")
async def health_check():
    """Repond 200 sur '/' pour les health checks Render (evite un 404 qui pourrait
    faire passer l'instance pour 'unhealthy' et declencher un redemarrage)."""
    return {"status": "ok"}


@app.post("/api/analyze-pdf")
async def analyze_pdf(file: UploadFile = File(...)):
    """
    Extrait UNIQUEMENT le texte et le nombre de pages du PDF (aucun appel Gemini ici,
    donc c'est quasi instantane). L'overview, le quiz et les sections ne sont generes
    par Gemini qu'a la demande, quand l'utilisateur ouvre l'onglet correspondant
    (voir /api/overview, /api/quiz, /api/sections), et mis en cache ensuite.
    """
    file_size = file.size
    if file_size is None:
        file.file.seek(0, os.SEEK_END)
        file_size = file.file.tell()
        file.file.seek(0)

    if file_size > MAX_PDF_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Ce PDF est trop volumineux pour la demo (limite : {MAX_PDF_SIZE_BYTES // (1024 * 1024)} Mo).",
        )

    try:
        pdf_text, page_count = await asyncio.wait_for(
            asyncio.to_thread(extract_text_from_pdf, file), timeout=20
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Ce PDF prend trop de temps a analyser. Reessaie avec un autre fichier.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Echec de la lecture du PDF : {exc}")

    if not pdf_text.strip():
        raise HTTPException(status_code=400, detail="Le fichier PDF est vide ou n'a pas pu etre lu.")

    doc_id = store.save_document(pdf_text, page_count)
    return {"doc_id": doc_id, "pages": page_count}


@app.get("/api/overview/{doc_id}")
async def get_overview(doc_id: str):
    """Genere l'overview via Gemini au premier appel, puis la sert depuis le cache."""
    doc = _get_document_or_404(doc_id)
    if doc["overview"] is None:
        try:
            overview = generate_overview(doc["text"])
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Echec de la generation de l'overview : {exc}")
        store.set_overview(doc_id, overview)
    return doc["overview"]


@app.get("/api/quiz/{doc_id}")
async def get_quiz(doc_id: str):
    """Genere le quiz via Gemini au premier appel, puis le sert depuis le cache."""
    doc = _get_document_or_404(doc_id)
    if doc["quiz"] is None:
        try:
            quiz = generate_quiz(doc["text"])
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Echec de la generation du quiz : {exc}")
        store.set_quiz(doc_id, quiz)
    return doc["quiz"]


@app.get("/api/sections/{doc_id}")
async def get_sections(doc_id: str):
    """Genere la liste des blocs/parties du document via Gemini au premier appel,
    puis la sert depuis le cache. Contenu leger (titre + teaser) ; le texte complet
    de chaque bloc n'est genere qu'au clic, voir /api/explain."""
    doc = _get_document_or_404(doc_id)
    if doc["sections"] is None:
        try:
            sections = generate_sections(doc["text"])
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Echec du decoupage du document : {exc}")
        store.set_sections(doc_id, sections)
    return doc["sections"]


@app.get("/api/explain/{doc_id}/{section_id}")
async def explain_section(doc_id: str, section_id: str):
    """Genere (ou sert depuis le cache) la version claire et parlee d'un bloc precis
    du document, pretes a etre lues par le TTS."""
    doc = _get_document_or_404(doc_id)

    cached = store.get_explanation(doc_id, section_id)
    if cached is not None:
        return {"section_id": section_id, "text": cached}

    sections = doc["sections"]
    if sections is None:
        raise HTTPException(status_code=400, detail="Les sections n'ont pas encore ete generees pour ce document.")
    section = next((s for s in sections if s.get("id") == section_id), None)
    if section is None:
        raise HTTPException(status_code=404, detail="Section introuvable.")

    try:
        text = generate_section_explanation(doc["text"], section["title"], section.get("teaser", ""))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Echec de l'explication du bloc : {exc}")

    store.set_explanation(doc_id, section_id, text)
    return {"section_id": section_id, "text": text}


@app.post("/api/chat")
async def chat(payload: ChatRequest):
    """
    Repond a un message de l'utilisateur a propos du document deja analyse (mode
    "chat"), ou pilote un tour d'interview/examen oral (mode "interview" / "exam").
    Utilise a la fois par le chat texte et par le mode vocal (Oral Practice).
    """
    doc = _get_document_or_404(payload.doc_id)

    try:
        reply = chat_with_document(
            doc["text"],
            payload.message,
            payload.history,
            mode=payload.mode or "chat",
            start=bool(payload.start),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Echec de la reponse IA : {exc}")

    if not payload.start:
        store.append_history(payload.doc_id, "user", payload.message)
    store.append_history(payload.doc_id, "voxy", reply)

    return {"reply": reply}


@app.get("/api/tts")
async def text_to_speech(background_tasks: BackgroundTasks, text: str, voice: str = "en-US-AriaNeural"):
    """
    Convertit un texte en audio MP3 via Microsoft Edge TTS et le retourne au client.
    Fichier temporaire unique par requete, supprime juste apres l'envoi.
    """
    output_audio = f"speech_{uuid.uuid4().hex}.mp3"
    await generate_speech(text, output_audio, voice)
    background_tasks.add_task(os.remove, output_audio)
    return FileResponse(output_audio, media_type="audio/mpeg", background=background_tasks)
