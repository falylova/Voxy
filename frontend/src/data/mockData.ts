import type { Difficulty } from "../types";

/* ------------------------------------------------------------------ */
/*  Quiz difficulty labels (UI-only, not document content)             */
/* ------------------------------------------------------------------ */

export const difficultyMeta: Record<Difficulty, { label: string; hint: string }> = {
  easy: { label: "Easy", hint: "Warm-up questions" },
  medium: { label: "Medium", hint: "Test your understanding" },
  hard: { label: "Hard", hint: "Challenge yourself" },
};

/* ------------------------------------------------------------------ */
/*  Document info helper                                               */
/* ------------------------------------------------------------------ */

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
