import { useState } from "react";
import Landing from "./components/Landing";
import AppShell from "./components/AppShell";
import Overview from "./components/Overview";
import Quiz from "./components/Quiz";
import Chat from "./components/Chat";
import OralPractice from "./components/OralPractice";
import { LogoMark, Wordmark } from "./components/Logo";
import { analyzeDocument } from "./api/documentApi";
import type { DocumentInfo, View } from "./types";

export default function App() {
  const [document, setDocument] = useState<DocumentInfo | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  // Oral Practice s'ouvre en premier : c'est la fonctionnalité phare, et elle ne
  // nécessite aucun appel Gemini avant que l'élève parle (contrairement à
  // Overview/Quiz qui déclenchent leur génération à l'ouverture de l'onglet).
  const [view, setView] = useState<View>("oral");
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleStart = async (file: File, meta: DocumentInfo) => {
    setUploadError(null);
    setDocument(meta);
    setAnalyzing(true);

    try {
      // Extraction du texte uniquement — aucun appel Gemini ici, donc quasi instantané.
      const { doc_id, pages } = await analyzeDocument(file);
      setDocId(doc_id);
      setDocument((d) => (d ? { ...d, pages } : d));
      setAnalyzing(false);
      setView("oral");
    } catch (err) {
      setAnalyzing(false);
      setDocument(null);
      setUploadError(
        err instanceof Error
          ? err.message
          : "Something went wrong while reading your document."
      );
    }
  };

  const handleNewDocument = () => {
    setDocument(null);
    setDocId(null);
    setAnalyzing(false);
    setUploadError(null);
    setView("oral");
  };

  if (analyzing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="h-16 w-16 animate-pulse" />
          <Wordmark className="mt-5 text-3xl" />
          <div className="mt-10 flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="typing-dot h-2.5 w-2.5 rounded-full bg-indigo-500"
              />
            ))}
          </div>
          <p className="animate-fade-in mt-4 text-lg font-semibold text-slate-700">
            Reading your document…
          </p>
          <p className="mt-2 text-sm text-slate-400">{document?.name}</p>
        </div>
      </div>
    );
  }

  if (!document || !docId) {
    return <Landing onStart={handleStart} uploadError={uploadError} />;
  }

  return (
    <AppShell
      document={document}
      view={view}
      onViewChange={setView}
      onNewDocument={handleNewDocument}
    >
      {view === "overview" && <Overview document={document} docId={docId} />}
      {view === "quiz" && <Quiz docId={docId} />}
      {view === "chat" && <Chat docId={docId} />}
      {view === "oral" && <OralPractice docId={docId} />}
    </AppShell>
  );
}
