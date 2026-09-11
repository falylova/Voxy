import edge_tts

async def generate_speech(text: str, output_path: str, voice: str = "fr-FR-HenriNeural"):
    """
    Convertit le texte en fichier audio MP3 via le moteur vocal Microsoft Edge.
    Voix conseillées :
    - Français : fr-FR-HenriNeural ou fr-FR-DeniseNeural
    - Anglais : en-US-ChristopherNeural
    """
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)