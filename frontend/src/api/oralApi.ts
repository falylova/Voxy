import { API_BASE_URL } from "./config";

export function getEdgeAudioUrl(text: string): string {
  return `${API_BASE_URL}/api/tts?text=${encodeURIComponent(text)}&voice=en-US-AriaNeural`;
}
