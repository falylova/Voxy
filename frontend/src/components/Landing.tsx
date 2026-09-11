import { useCallback, useRef, useState } from "react";
import {
  CloudUpload,
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Mic,
  X,
} from "lucide-react";
import { LogoMark, Wordmark } from "./Logo";
import { formatFileSize } from "../data/mockData";
import type { DocumentInfo } from "../types";
import { cn } from "../utils/cn";

interface LandingProps {
  onStart: (file: File, meta: DocumentInfo) => void;
  /** Erreur venant de l'analyse backend (échec réseau, PDF illisible, etc.) */
  uploadError?: string | null;
}

export default function Landing({ onStart, uploadError }: LandingProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptFile = useCallback((f: File | undefined | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setFileError("VOXY works with PDF files. Please choose a .pdf document.");
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(f);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const handleStart = () => {
    if (!file) return;
    const now = new Date();
    onStart(file, {
      name: file.name,
      size: formatFileSize(file.size),
      pages: 0,
      type: "PDF",
      uploadedAt: now.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    });
  };

  const displayedError = uploadError ?? fileError;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* soft background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-[-10%] h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-linear-to-br from-violet-200/50 via-indigo-100/40 to-transparent blur-3xl" />
      </div>

      <div className="flex w-full max-w-xl flex-col items-center text-center">
        {/* Logo */}
        <div className="animate-fade-up flex items-center gap-3">
          <LogoMark className="h-14 w-14" />
          <Wordmark className="text-4xl" />
        </div>

        {/* Tagline */}
        <h1
          className="animate-fade-up mt-8 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[2.6rem] sm:leading-[1.15]"
          style={{ animationDelay: "0.05s" }}
        >
          Learn faster, without the overwhelm.
        </h1>
        <p
          className="animate-fade-up mt-4 max-w-md text-base text-slate-500 sm:text-lg"
          style={{ animationDelay: "0.1s" }}
        >
          Upload any PDF and let VOXY turn it into an interactive study
          companion — summaries, quizzes, chat, and even spoken practice.
        </p>

        {/* Dropzone / file card */}
        <div
          className="animate-fade-up mt-10 w-full"
          style={{ animationDelay: "0.15s" }}
        >
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
              className={cn(
                "group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-white/70 px-6 py-14 text-center transition-all duration-200",
                dragging
                  ? "border-indigo-400 bg-indigo-50/80 scale-[1.01]"
                  : "border-slate-300 hover:border-indigo-300 hover:bg-white"
              )}
            >
              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-violet-100 to-indigo-100 text-indigo-600 transition-transform duration-200",
                  dragging ? "scale-110" : "group-hover:scale-105"
                )}
              >
                <CloudUpload className="h-8 w-8" />
              </div>
              <p className="mt-5 text-lg font-semibold text-slate-800">
                Drag &amp; drop your PDF here
              </p>
              <p className="mt-1 text-sm text-slate-500">
                or click to browse your files
              </p>
            </div>
          ) : (
            <div className="animate-fade-up flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-semibold text-slate-900">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {formatFileSize(file.size)} · PDF document
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Ready to study
                  </div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Remove file"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={handleStart}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-violet-700 hover:to-indigo-700"
              >
                <Sparkles className="h-5 w-5" />
                Start learning with VOXY
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          )}

          {displayedError && (
            <p className="animate-fade-in mt-3 text-sm font-medium text-rose-500">
              {displayedError}
            </p>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />

          {/* Upload button (always visible for clarity) */}
          {!file && (
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-violet-700 hover:to-indigo-700"
            >
              <CloudUpload className="h-5 w-5" />
              Upload PDF
            </button>
          )}
        </div>

        {/* reassurance footer */}
        <div
          className="animate-fade-up mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400"
          style={{ animationDelay: "0.2s" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> AI summaries
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> Smart quizzes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Mic className="h-4 w-4" /> Spoken practice
          </span>
        </div>
      </div>
    </div>
  );
}
