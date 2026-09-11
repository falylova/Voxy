import { useEffect, useState } from "react";
import {
  ListChecks,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  ChevronRight,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { difficultyMeta } from "../data/mockData";
import { fetchQuiz } from "../api/documentApi";
import type { Difficulty, QuizQuestion } from "../types";
import { cn } from "../utils/cn";

type Phase = "setup" | "quiz" | "result";

export default function Quiz({ docId }: { docId: string }) {
  const [questions, setQuestions] = useState<Record<Difficulty, QuizQuestion[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("setup");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    setQuestions(null);
    setError(null);
    setPhase("setup");

    fetchQuiz(docId)
      .then((data) => {
        if (!cancelled) setQuestions(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      });

    return () => {
      cancelled = true;
    };
  }, [docId]);

  const currentQuestions = questions?.[difficulty] ?? [];
  const current = currentQuestions[index];

  const start = (d: Difficulty) => {
    if (!questions) return;
    setDifficulty(d);
    setAnswers(new Array(questions[d].length).fill(null));
    setIndex(0);
    setSelected(null);
    setPhase("quiz");
  };

  const select = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    const next = [...answers];
    next[index] = i;
    setAnswers(next);
  };

  const next = () => {
    if (index + 1 < currentQuestions.length) {
      setIndex(index + 1);
      setSelected(null);
    } else {
      setPhase("result");
    }
  };

  const score = answers.filter((a, i) => a === currentQuestions[i].answer).length;
  const pct = Math.round((score / currentQuestions.length) * 100);

  if (error) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm animate-fade-up">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
        <p className="mt-3 text-lg font-semibold text-rose-800">{error}</p>
      </div>
    );
  }

  if (!questions) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm animate-fade-up">
        <p className="text-lg font-semibold text-slate-800">Preparing your quiz…</p>
        <p className="mt-2 text-sm text-slate-500">VOXY is crafting questions tailored to this document.</p>
      </div>
    );
  }

  /* ---------- SETUP ---------- */
  if (phase === "setup") {
    return (
      <div className="animate-fade-up mx-auto max-w-xl">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Quiz
          </h1>
          <p className="text-slate-500">
            VOXY generated questions from your document. Pick a level to begin.
          </p>
        </div>

        <div className="mt-8 grid gap-3">
          {(Object.keys(difficultyMeta) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => start(d)}
              className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-300 hover:shadow-md"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-base font-bold",
                      d === "easy" && "text-emerald-600",
                      d === "medium" && "text-amber-600",
                      d === "hard" && "text-rose-600"
                    )}
                  >
                    {difficultyMeta[d].label}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                    {questions[d].length} questions
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {difficultyMeta[d].hint}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- RESULT ---------- */
  if (phase === "result") {
    return (
      <div className="animate-fade-up mx-auto max-w-xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-600">
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">
            {pct >= 80 ? "Great job!" : pct >= 50 ? "Nice work!" : "Keep going!"}
          </h1>
          <p className="mt-1 text-slate-500">
            You scored{" "}
            <span className="font-bold text-slate-800">
              {score} / {currentQuestions.length}
            </span>{" "}
            on {difficultyMeta[difficulty].label}.
          </p>

          {/* score bar */}
          <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                pct >= 80
                  ? "bg-emerald-500"
                  : pct >= 50
                    ? "bg-amber-500"
                    : "bg-rose-500"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-600">{pct}% correct</p>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={() => start(difficulty)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <RotateCcw className="h-4 w-4" />
              Try again
            </button>
            <button
              onClick={() => setPhase("setup")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <BarChart3 className="h-4 w-4" />
              Change level
            </button>
          </div>
        </div>

        {/* Review */}
        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Review your answers
          </h2>
          {currentQuestions.map((q, i) => {
            const correct = answers[i] === q.answer;
            return (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {correct ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {q.question}
                    </p>
                    {!correct && (
                      <p className="mt-1.5 text-sm text-slate-500">
                        Correct answer:{" "}
                        <span className="font-medium text-emerald-600">
                          {q.options[q.answer]}
                        </span>
                      </p>
                    )}
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                      {q.explanation}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ---------- QUIZ ---------- */
  const progress = ((index + (selected !== null ? 1 : 0)) / currentQuestions.length) * 100;

  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      {/* header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-indigo-500" />
          <h1 className="text-xl font-extrabold text-slate-900">
            {difficultyMeta[difficulty].label} quiz
          </h1>
        </div>
        <span className="text-sm font-semibold text-slate-500">
          {index + 1} / {currentQuestions.length}
        </span>
      </div>

      {/* progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* question card */}
      <div key={index} className="animate-fade-up mt-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">
            {current.question}
          </h2>

          <div className="mt-6 space-y-3">
            {current.options.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = selected !== null && i === current.answer;
              const isWrong = selected === i && i !== current.answer;
              return (
                <button
                  key={i}
                  onClick={() => select(i)}
                  disabled={selected !== null}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-4 text-left text-sm font-medium transition",
                    selected === null &&
                      "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50",
                    isCorrect && "border-emerald-400 bg-emerald-50 text-emerald-800",
                    isWrong && "border-rose-400 bg-rose-50 text-rose-800",
                    selected !== null && !isSelected && !isCorrect && "border-slate-200 bg-white text-slate-400"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isCorrect
                        ? "bg-emerald-500 text-white"
                        : isWrong
                          ? "bg-rose-500 text-white"
                          : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* explanation after answering */}
          {selected !== null && (
            <div className="animate-fade-in mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-sm leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">Why? </span>
                {current.explanation}
              </p>
            </div>
          )}
        </div>

        {selected !== null && (
          <div className="animate-fade-in mt-4 flex justify-end">
            <button
              onClick={next}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              {index + 1 === currentQuestions.length ? "See results" : "Next question"}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
