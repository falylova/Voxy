from pypdf import PdfReader
from fastapi import UploadFile


def extract_text_from_pdf(file: UploadFile) -> tuple[str, int]:
    """
    Extrait le texte complet et le nombre de pages d'un fichier PDF importé.
    Retourne un tuple (texte_extrait, nombre_de_pages).
    """
    reader = PdfReader(file.file)
    extracted_text = ""
    for page in reader.pages:
        text = page.extract_text()
        if text:
            extracted_text += text + "\n"
    return extracted_text, len(reader.pages)
