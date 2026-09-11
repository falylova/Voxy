import { useEffect, useRef, useState } from "react";
import { Layers, Volume2, Loader2, AlertTriangle, Pause } from "lucide-react";
import { fetchSections, fetchSectionExplanation } from "../api/documentApi";
import { getEdgeAudioUrl } from "../api/oralApi";
import type { Section } from "../types";
import { cn } from "../utils/cn";

/**
 * "Explained" : le document est présenté comme une suite de blocs (parties du
 * livre). Cliquer sur un bloc déclenche : (1) une réécriture claire et parlée de
 * cette partie par Gemini (générée une fois puis mise en cache côté backend),
 * (2) sa lecture à voix haute par le TTS. Jamais d'image — uniquement du texte
 * adapté à l'oral.
 */
export default function Chat({ docId }: { docId: string }) {
  const [sections, setSections] = useState<Section[] | null>(null);
  const [sectionsError, setSectionsError] = useState<string | null>(null);

  const [textById, setTextById] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSections(null);
    setSectionsError(null);
    setActiveId(null);
    setTextById({});
    stopAudio();

    fetchSections(docId)
      .then((data) => {
        if (!cancelled) setSections(data);
      })
      .catch((err) => {
        if (!cancelled) setSectionsError(err instanceof Error ? err.message : "Something went wrong.");
      });

    return () => {
      cancelled = true;
      stopAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  const stopAudio = () => {
    audioRef.current?.pause();
    setPlayingId(null);
  };

  const playText = (id: string, text: string) => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.pause();
    audio.src = getEdgeAudioUrl(text);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
    setPlayingId(id);
    audio.play().catch(() => setPlayingId(null));
  };

  const handleSelect = async (section: Section) => {
    setExplainError(null);

    // Cliquer sur le bloc en cours de lecture met en pause.
    if (playingId === section.id) {
      stopAudio();
      return;
    }

    stopAudio();
    setActiveId(section.id);

    const cached = textById[section.id];
    if (cached) {
      playText(section.id, cached);
      return;
    }

    setLoadingId(section.id);
    try {
      const { text } = await fetchSectionExplanation(docId, section.id);
      setTextById((m) => ({ ...m, [section.id]: text }));
      setLoadingId(null);
      playText(section.id, text);
    } catch (err) {
      setLoadingId(null);
      setExplainError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Explained</h1>
          <p className="text-sm text-slate-500">
            Tap a part of the document — VOXY will explain it simply and read it out loud.
          </p>
        </div>
      </div>

      {sectionsError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-rose-500" />
          <p className="mt-2 text-sm font-medium text-rose-800">{sectionsError}</p>
        </div>
      )}

      {!sections && !sectionsError && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-800">Splitting your document into parts…</p>
          <p className="mt-2 text-sm text-slate-500">VOXY is mapping out the document so you can explore it piece by piece.</p>
        </div>
      )}

      {sections && (
        <div className="space-y-3">
          {sections.map((section, i) => {
            const isActive = activeId === section.id;
            const isLoading = loadingId === section.id;
            const isPlaying = playingId === section.id;
            const text = textById[section.id];

            return (
              <div
                key={section.id}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-white shadow-sm transition",
                  isActive ? "border-indigo-300" : "border-slate-200"
                )}
              >
                <button
                  onClick={() => handleSelect(section)}
                  className="flex w-full items-center gap-3 p-4 text-left sm:p-5"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold",
                      isPlaying ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{section.title}</p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">{section.teaser}</p>
                  </div>
                  <Volume2
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isPlaying ? "text-indigo-500" : "text-slate-300"
                    )}
                  />
                </button>

                {isActive && text && (
                  <div className="animate-fade-in border-t border-slate-100 bg-slate-50 px-4 py-4 sm:px-5">
                    <p className="text-sm leading-relaxed text-slate-600">{text}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {explainError && (
        <p className="animate-fade-in mt-4 text-sm font-medium text-rose-500">{explainError}</p>
      )}
    </div>
  );
}
