import json
import os
from typing import Optional

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

MODEL_NAME = "gemini-3.6-flash"


def _model() -> genai.GenerativeModel:
    return genai.GenerativeModel(MODEL_NAME)


def _excerpt(text: str, limit: int = 15000) -> str:
    return text[:limit]


def generate_overview(pdf_text: str) -> dict:
    """Résumé + concepts clés + prérequis + parcours d'apprentissage. Appelé une seule
    fois par document (mis en cache ensuite côté store)."""
    prompt = f"""
You are VOXY, an AI study assistant. Read the document excerpt below and produce an overview.
Respond in the same language as the document.

Return ONLY a valid JSON object with EXACTLY this shape (no markdown, no comments, no trailing text):

{{
  "summary": "2-4 sentence overview of the document",
  "concepts": [
    {{"title": "...", "description": "...", "icon": "one of: zap, clock, trend, shuffle, sparkles, book, target, brain"}}
  ],
  "fundamentals": ["...", "...", "..."],
  "learningPath": [
    {{"title": "...", "description": "...", "duration": "e.g. 10 min"}}
  ]
}}

Content rules:
- "concepts" must contain exactly 5 items.
- "fundamentals" must contain exactly 3 short prerequisites the reader should know before starting the document.
- "learningPath" must contain between 4 and 6 ordered steps.
- Base everything strictly on the document content below. Do not invent facts that aren't supported by it.

DOCUMENT EXCERPT:
\"\"\"
{_excerpt(pdf_text)}
\"\"\"
"""
    response = _model().generate_content(
        prompt, generation_config={"response_mime_type": "application/json"}
    )
    return json.loads(response.text)


def generate_quiz(pdf_text: str) -> dict:
    """Quiz à 3 niveaux de difficulté. Appelé une seule fois par document (mis en
    cache ensuite côté store)."""
    prompt = f"""
You are VOXY, an AI study assistant. Read the document excerpt below and create a quiz.
Respond in the same language as the document.

Return ONLY a valid JSON object with EXACTLY this shape (no markdown, no comments, no trailing text):

{{
  "easy": [ {{"question": "...", "options": ["...", "...", "...", "..."], "answer": 0, "explanation": "..."}} ],
  "medium": [ {{"question": "...", "options": ["...", "...", "...", "..."], "answer": 0, "explanation": "..."}} ],
  "hard": [ {{"question": "...", "options": ["...", "...", "...", "..."], "answer": 0, "explanation": "..."}} ]
}}

Content rules:
- Each of "easy", "medium" and "hard" must contain exactly 5 questions, each with exactly 4 options.
- "answer" is the zero-based index of the correct option in "options".
- Do not ask question about the bibliography just the content
- Base everything strictly on the document content below. Do not invent facts that aren't supported by it.

DOCUMENT EXCERPT:
\"\"\"
{_excerpt(pdf_text)}
\"\"\"
"""
    response = _model().generate_content(
        prompt, generation_config={"response_mime_type": "application/json"}
    )
    return json.loads(response.text)


def generate_sections(pdf_text: str) -> list[dict]:
    """Découpe le document en quelques grandes parties (table des matières courte).
    Léger et bon marché : juste des titres + une phrase d'accroche, pas de contenu
    complet. Le contenu détaillé n'est généré qu'au clic (voir generate_section_explanation)."""
    prompt = f"""
You are VOXY, an AI study assistant. Read the document excerpt below and split it into its
main parts/sections, in reading order. Respond in the same language as the document.

Return ONLY a valid JSON array with EXACTLY this shape (no markdown, no comments, no trailing text):

[
  {{"id": "s1", "title": "Short section title", "teaser": "One short sentence about what this part covers"}}
]

Content rules:
- Produce between 4 and 8 sections covering the whole document, in order.
- "id" values must be "s1", "s2", "s3", etc.
- Base everything strictly on the document content below.

DOCUMENT EXCERPT:
\"\"\"
{_excerpt(pdf_text)}
\"\"\"
"""
    response = _model().generate_content(
        prompt, generation_config={"response_mime_type": "application/json"}
    )
    return json.loads(response.text)


def generate_section_explanation(pdf_text: str, section_title: str, section_teaser: str) -> str:
    """Réécrit la partie du document correspondant à ce bloc dans une version claire,
    simple à comprendre à l'oral, sans jamais faire référence à des images/figures/
    tableaux (le rendu est uniquement audio + texte). Généré à la demande, une seule
    fois par bloc (mis en cache ensuite côté store)."""
    prompt = f"""
You are VOXY, an AI study assistant. Below is the full text of a document, and the title of
one specific part of it. Explain ONLY that part, in a clear, simple, spoken-friendly way, as if
reading it aloud to a student. Respond in the same language as the document.

Rules:
- Plain text only. No markdown, no headers, no bullet points, no numbering.
- Never reference images, figures, diagrams, charts, or tables — describe concepts in words only.
- 4 to 15 short sentences. Simple vocabulary. No filler like "in this section".
- Base it strictly on the document content below.

SECTION TITLE: {section_title}
SECTION HINT: {section_teaser}

FULL DOCUMENT:
\"\"\"
{_excerpt(pdf_text)}
\"\"\"
"""
    response = _model().generate_content(prompt)
    return response.text.strip()


_MODE_INSTRUCTIONS = {
    "chat": (
        "You are VOXY, a friendly and encouraging study assistant. Answer the student's "
        "question using ONLY the document. Keep your answer concise and clear. If the "
        "answer isn't covered by the document, say so honestly rather than inventing facts, "
        "and offer your best related help instead."
    ),
    "interview": (
        "You are VOXY, conducting a friendly practice interview with the student about the "
        "document. Ask ONE focused question at a time to check their understanding. After "
        "they answer, briefly react (a sentence or less) and then ask the next question. "
        "Never ask more than one question per turn. Keep it conversational and encouraging."
    ),
    "exam": (
        "You are VOXY, acting as a strict but fair oral examiner testing the student on the "
        "document. Ask ONE exam-style question at a time. After their answer, briefly say "
        "whether it was correct and why (a sentence or two), then move to the next question. "
        "Never ask more than one question per turn. After roughly 5 questions, give a final "
        "grade out of 20 with one short sentence of feedback, and stop asking new questions."
    ),
}


def chat_with_document(
    pdf_text: str,
    message: str,
    history: Optional[list[dict]] = None,
    mode: str = "chat",
    start: bool = False,
) -> str:
    """
    Répond à une question de l'utilisateur (mode "chat"), ou pilote une session
    d'interview/examen oral (mode "interview" / "exam") en s'appuyant uniquement
    sur le contenu du document.
    """
    excerpt = _excerpt(pdf_text)
    history = history or []
    instructions = _MODE_INSTRUCTIONS.get(mode, _MODE_INSTRUCTIONS["chat"])

    convo = "\n".join(
        f"{'Student' if h.get('role') == 'user' else 'VOXY'}: {h.get('text', '')}"
        for h in history[-10:]
    )

    if start:
        turn = (
            "This is the very start of the session. There is no student message yet. "
            "Greet the student in one short sentence and then ask your first question."
        )
    else:
        turn = f"Student: {message}\nVOXY:"

    prompt = f"""
{instructions}
Respond in the same language as the student (default to the document's language if unclear).

DOCUMENT:
\"\"\"
{excerpt}
\"\"\"

CONVERSATION SO FAR:
{convo if convo else "(no previous messages)"}

{turn}
"""
    response = _model().generate_content(prompt)
    return response.text.strip()
