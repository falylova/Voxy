"""
Stockage en mémoire des documents importés : texte brut, pages, et tout ce que
Gemini génère à la demande (overview, quiz, sections, explications par bloc,
historique de chat). Chaque élément généré est mis en cache ici pour ne jamais
rappeler l'API Gemini deux fois pour la même chose.
Suffisant pour un usage local mono-instance ; à remplacer par une vraie base de
données si l'application doit un jour tourner en multi-utilisateurs / multi-worker.
"""
import uuid
from typing import Any, Optional

_DOCUMENTS: dict[str, dict[str, Any]] = {}


def save_document(text: str, pages: int) -> str:
    doc_id = uuid.uuid4().hex
    _DOCUMENTS[doc_id] = {
        "text": text,
        "pages": pages,
        "overview": None,
        "quiz": None,
        "sections": None,
        "explanations": {},
        "history": [],
    }
    return doc_id


def get_document(doc_id: str) -> Optional[dict[str, Any]]:
    return _DOCUMENTS.get(doc_id)


def set_overview(doc_id: str, overview: dict) -> None:
    doc = _DOCUMENTS.get(doc_id)
    if doc is not None:
        doc["overview"] = overview


def set_quiz(doc_id: str, quiz: dict) -> None:
    doc = _DOCUMENTS.get(doc_id)
    if doc is not None:
        doc["quiz"] = quiz


def set_sections(doc_id: str, sections: list) -> None:
    doc = _DOCUMENTS.get(doc_id)
    if doc is not None:
        doc["sections"] = sections


def get_explanation(doc_id: str, section_id: str) -> Optional[str]:
    doc = _DOCUMENTS.get(doc_id)
    if doc is None:
        return None
    return doc["explanations"].get(section_id)


def set_explanation(doc_id: str, section_id: str, text: str) -> None:
    doc = _DOCUMENTS.get(doc_id)
    if doc is not None:
        doc["explanations"][section_id] = text


def append_history(doc_id: str, role: str, text: str) -> None:
    doc = _DOCUMENTS.get(doc_id)
    if doc is not None:
        doc["history"].append({"role": role, "text": text})
