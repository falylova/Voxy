import { API_BASE_URL } from "./config";
import type { Difficulty, Overview, QuizQuestion, Section, UploadResult } from "../types";

async function readErrorDetail(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    return data?.detail ?? fallback;
  } catch {
    return fallback;
  }
}

async function getJson<T>(path: string, fallbackError: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    throw new Error("Couldn't reach VOXY's backend. Make sure it's running on " + API_BASE_URL + ".");
  }
  if (!response.ok) {
    throw new Error(await readErrorDetail(response, fallbackError));
  }
  return response.json();
}

/** Extrait uniquement le texte + le nombre de pages du PDF. Aucun appel Gemini — rapide. */
export async function analyzeDocument(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/analyze-pdf`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(
      "Couldn't reach VOXY's backend. Make sure it's running on " + API_BASE_URL + "."
    );
  }

  if (!response.ok) {
    throw new Error(await readErrorDetail(response, `VOXY couldn't read this document (${response.status}).`));
  }

  return response.json();
}

/** Généré par Gemini au premier appel puis mis en cache côté backend. */
export function fetchOverview(docId: string): Promise<Overview> {
  return getJson<Overview>(`/api/overview/${docId}`, "VOXY couldn't generate the overview.");
}

/** Généré par Gemini au premier appel puis mis en cache côté backend. */
export function fetchQuiz(docId: string): Promise<Record<Difficulty, QuizQuestion[]>> {
  return getJson(`/api/quiz/${docId}`, "VOXY couldn't generate the quiz.");
}

/** Liste légère des blocs du document (titres + teaser) — mise en cache côté backend. */
export function fetchSections(docId: string): Promise<Section[]> {
  return getJson<Section[]>(`/api/sections/${docId}`, "VOXY couldn't split this document into sections.");
}

/** Explication claire d'un bloc précis — générée à la demande puis mise en cache. */
export function fetchSectionExplanation(docId: string, sectionId: string): Promise<{ section_id: string; text: string }> {
  return getJson(`/api/explain/${docId}/${sectionId}`, "VOXY couldn't explain this part.");
}
