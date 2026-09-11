import { useEffect, useRef, useState } from "react";
import { Mic, Square, X, Loader2, MessageCircle, GraduationCap, ClipboardCheck } from "lucide-react";
import { fetchChatReply, fetchSessionOpener } from "../api/chatApi";
import { getEdgeAudioUrl } from "../api/oralApi";
import type { ChatMessage, OralMode } from "../types";
import { cn } from "../utils/cn";

type Phase = "idle" | "listening" | "thinking" | "speaking";

const SILENCE_TIMEOUT_MS = 15000;
const WAVE_BARS = 28;
const GREETING = "Tap the microphone and start talking about your document.";

const MODES: { id: OralMode; label: string; icon: typeof MessageCircle; hint: string }[] = [
  { id: "chat", label: "Chat", icon: MessageCircle, hint: "Ask VOXY anything, out loud" },
  { id: "interview", label: "Interview", icon: GraduationCap, hint: "VOXY asks, you answer" },
  { id: "exam", label: "Exam", icon: ClipboardCheck, hint: "Graded oral exam" },
];

function getRecognitionCtor(): { new (): SpeechRecognition } | undefined {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

function highlightLastWord(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const last = words.pop();
  return (
    <>
      <span className="text-slate-400">{words.join(" ")}{words.length ? " " : ""}</span>
      <span className="text-white font-semibold">{last}</span>
    </>
  );
}

export default function OralPractice({ docId }: { docId: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [mode, setMode] = useState<OralMode>("chat");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);
  const sessionActiveRef = useRef(false);
  const transcriptRef = useRef("");
  const interimRef = useRef("");
  const modeRef = useRef<OralMode>("chat");

  const speechSupported = !!getRecognitionCtor();

  useEffect(() => {
    return () => {
      sessionActiveRef.current = false;
      clearSilenceTimer();
      recognitionRef.current?.stop();
      audioRef.current?.pause();
    };
  }, []);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const armSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      void finishTurn();
    }, SILENCE_TIMEOUT_MS);
  };

  const startListening = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("Speech recognition isn't supported in this browser.");
      return;
    }

    setError(null);
    setTranscript("");
    setInterim("");
    transcriptRef.current = "";
    interimRef.current = "";

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i];
        if (chunk.isFinal) finalChunk += chunk[0].transcript;
        else interimChunk += chunk[0].transcript;
      }
      if (finalChunk) {
        transcriptRef.current = `${transcriptRef.current} ${finalChunk}`.trim();
        setTranscript(transcriptRef.current);
      }
      interimRef.current = interimChunk;
      setInterim(interimChunk);
      armSilenceTimer();
    };

    recognition.onerror = () => {
      setError("VOXY couldn't hear you. Check your microphone permissions.");
      sessionActiveRef.current = false;
      setPhase("idle");
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    armSilenceTimer();
    setPhase("listening");
  };

  const finishTurn = async () => {
    clearSilenceTimer();
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    const message = `${transcriptRef.current} ${interimRef.current}`.trim();
    if (!message) {
      if (sessionActiveRef.current) startListening();
      return;
    }

    setPhase("thinking");
    try {
      const answer = await fetchChatReply(docId, message, historyRef.current, modeRef.current);
      historyRef.current = [
        ...historyRef.current,
        { role: "user", text: message },
        { role: "voxy", text: answer },
      ];
      setReply(answer);
      speak(answer);
    } catch {
      setError("VOXY couldn't reach the backend. Check it's running and try again.");
      sessionActiveRef.current = false;
      setPhase("idle");
    }
  };

  const speak = (text: string) => {
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.pause();
    audio.src = getEdgeAudioUrl(text);
    audio.onended = () => {
      if (sessionActiveRef.current) startListening();
      else setPhase("idle");
    };
    audio.onerror = () => {
      if (sessionActiveRef.current) startListening();
      else setPhase("idle");
    };
    setPhase("speaking");
    audio.play().catch(() => {
      if (sessionActiveRef.current) startListening();
      else setPhase("idle");
    });
  };

  const beginGuidedSession = async () => {
    sessionActiveRef.current = true;
    setReply("");
    setError(null);
    setPhase("thinking");
    try {
      const opener = await fetchSessionOpener(docId, modeRef.current);
      historyRef.current = [{ role: "voxy", text: opener }];
      setReply(opener);
      speak(opener);
    } catch {
      setError("VOXY couldn't reach the backend. Check it's running and try again.");
      sessionActiveRef.current = false;
      setPhase("idle");
    }
  };

  const toggleSession = () => {
    if (phase === "idle") {
      modeRef.current = mode;
      if (mode === "chat") {
        sessionActiveRef.current = true;
        setReply("");
        startListening();
      } else {
        void beginGuidedSession();
      }
      return;
    }
    if (phase === "listening") {
      void finishTurn();
    }
  };

  const endSession = () => {
    sessionActiveRef.current = false;
    clearSilenceTimer();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    audioRef.current?.pause();
    historyRef.current = [];
    transcriptRef.current = "";
    interimRef.current = "";
    setTranscript("");
    setInterim("");
    setReply("");
    setError(null);
    setPhase("idle");
  };

  const topText =
    phase === "listening"
      ? `${transcript} ${interim}`.trim() || "Listening..."
      : phase === "thinking"
        ? "Thinking..."
        : phase === "speaking"
          ? reply
          : GREETING;

  const active = phase === "listening" || phase === "speaking";

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
          <Mic className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Oral Practice</h1>
          <p className="text-sm text-slate-500">
            Talk to VOXY about your document. Pause for a moment and it will answer.
          </p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              disabled={phase !== "idle"}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border px-3 py-3 text-center transition disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-semibold">{m.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">
        {MODES.find((m) => m.id === mode)?.hint}
      </p>

      <div className="relative mt-5 overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 p-8 text-center shadow-lg">
        {phase !== "idle" && (
          <button
            onClick={endSession}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
            aria-label="End conversation"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <p className="mx-auto max-w-md text-lg font-medium leading-relaxed">
          {highlightLastWord(topText)}
        </p>

        <div className="mt-10 flex h-16 items-center justify-center gap-[3px]">
          {Array.from({ length: WAVE_BARS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "wave-bar w-[3px] rounded-full bg-gradient-to-t from-indigo-400 to-cyan-300",
                active ? "opacity-100" : "opacity-30"
              )}
              style={{
                height: `${20 + ((i * 37) % 44)}px`,
                animationDelay: `${(i % 7) * 0.09}s`,
                animationPlayState: active ? "running" : "paused",
              }}
            />
          ))}
        </div>

        <div className="mt-10 flex items-center justify-center">
          {speechSupported ? (
            <button
              onClick={toggleSession}
              disabled={phase === "thinking" || phase === "speaking"}
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition disabled:opacity-60",
                phase === "listening" ? "animate-pulse-ring bg-rose-500" : "bg-white"
              )}
              aria-label={phase === "listening" ? "Stop and let VOXY answer" : "Start speaking"}
            >
              {phase === "thinking" ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-700" />
              ) : phase === "listening" ? (
                <Square className="h-6 w-6 text-white" />
              ) : (
                <Mic className="h-6 w-6 text-slate-800" />
              )}
            </button>
          ) : (
            <span className="rounded-full bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300">
              Speech recognition not supported here
            </span>
          )}
        </div>
      </div>

      {error && <p className="animate-fade-in mt-3 text-sm font-medium text-rose-500">{error}</p>}
    </div>
  );
}
