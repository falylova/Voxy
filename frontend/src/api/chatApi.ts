import { API_BASE_URL } from "./config";
import type { ChatMessage, OralMode } from "../types";

async function postChat(body: Record<string, unknown>): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail ?? "Erreur réseau");
  }

  const data = await response.json();
  return data.reply as string;
}

export function fetchChatReply(
  docId: string,
  message: string,
  history: ChatMessage[],
  mode: OralMode = "chat"
): Promise<string> {
  return postChat({
    doc_id: docId,
    message,
    history: history.map((m) => ({ role: m.role, text: m.text })),
    mode,
  });
}

/** Démarre une session guidée (interview/exam) : VOXY parle en premier, sans message de l'élève. */
export function fetchSessionOpener(docId: string, mode: OralMode): Promise<string> {
  return postChat({ doc_id: docId, message: "", history: [], mode, start: true });
}
