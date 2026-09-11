export type View = "overview" | "quiz" | "chat" | "oral";

export interface DocumentInfo {
  name: string;
  size: string;
  pages: number;
  type: string;
  uploadedAt: string;
}

export interface Concept {
  title: string;
  description: string;
  icon: string;
}

export interface LearningStep {
  title: string;
  description: string;
  duration: string;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface ChatMessage {
  role: "user" | "voxy";
  text: string;
}

export interface Overview {
  summary: string;
  concepts: Concept[];
  fundamentals: string[];
  learningPath: LearningStep[];
}

/** Réponse de POST /api/analyze-pdf — juste le texte extrait, aucun appel Gemini encore. */
export interface UploadResult {
  doc_id: string;
  pages: number;
}

/** Un bloc/partie du document (table des matières courte) — voir GET /api/sections. */
export interface Section {
  id: string;
  title: string;
  teaser: string;
}

export type OralMode = "chat" | "interview" | "exam";
