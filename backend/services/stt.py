import os


def _load_whisper_model():
    try:
        import whisper
    except Exception:
        return None

    try:
        return whisper.load_model("base")
    except Exception:
        return None


def transcribe_audio(file_path: str) -> str:
    """
    Transcrit un fichier audio (.webm, .wav, .mp3) en texte via Whisper si disponible.
    Si `whisper` (et ses dépendances comme `torch`) n'est pas installé, la
    fonction retourne une chaîne vide pour permettre au backend de démarrer
    sans planter.
    """
    if not os.path.exists(file_path):
        return ""

    model = _load_whisper_model()
    if model is None:
        # Pas de modèle disponible — on retourne vide pour que l'appelant
        return ""

    result = model.transcribe(file_path)
    return result.get("text", "").strip()