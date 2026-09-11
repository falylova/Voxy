import { useEffect, useState } from "react";
import { BookOpen, Sparkles, ListChecks, ArrowRight, AlertTriangle } from "lucide-react";
import { fetchOverview } from "../api/documentApi";
import type { DocumentInfo, Overview as OverviewData } from "../types";

export default function Overview({
  document,
  docId,
}: {
  document: DocumentInfo;
  docId: string;
}) {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOverview(null);
    setError(null);

    fetchOverview(docId)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      });

    return () => {
      cancelled = true;
    };
  }, [docId]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm animate-fade-up">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
        <p className="mt-3 text-lg font-semibold text-rose-800">{error}</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm animate-fade-up">
        <p className="text-lg font-semibold text-slate-800">Generating the overview…</p>
        <p className="mt-2 text-sm text-slate-500">VOXY is reading through the document to pull out the key takeaways.</p>
      </div>
    );
  }

  const { summary, concepts, fundamentals, learningPath } = overview;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Overview</h1>
        <p className="text-slate-500">
          Here's what VOXY learned from <span className="font-medium text-slate-700">{document.name}</span>.
        </p>
      </div>

      {/* Summary */}
      <Card icon={<BookOpen className="w-5 h-5" />} iconColor="bg-indigo-50 text-indigo-600" title="Summary">
        <p className="text-sm leading-relaxed text-slate-600">{summary}</p>
      </Card>

      {/* Key Concepts */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Key concepts
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {concepts.map((c) => (
            <div key={c.title} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-200">
              <h3 className="font-bold text-slate-900">{c.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{c.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fundamentals & Learning Path */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fundamentals */}
        <Card icon={<ListChecks className="w-5 h-5" />} iconColor="bg-amber-50 text-amber-600" title="Things to know before you start">
          <p className="mb-4 text-sm text-slate-500">A quick refresher before you dive in.</p>
          <ul className="space-y-3">
            {fundamentals.map((f, i) => (
              <li key={f} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full shrink-0 bg-amber-100 text-amber-700">
                  {i + 1}
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Learning Path */}
        <Card icon={<ArrowRight className="w-5 h-5" />} iconColor="bg-emerald-50 text-emerald-600" title="Suggested learning path">
          <ol className="mt-4 space-y-4">
            {learningPath.map((step, i) => (
              <li key={step.title} className="flex gap-3 text-sm">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full shrink-0 bg-emerald-100 text-emerald-700">
                  {i + 1}
                </span>
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <span>{step.title}</span>
                    <span className="text-[11px] font-normal text-slate-500">({step.duration})</span>
                  </div>
                  <p className="mt-0.5 text-slate-500">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}

{/* Shared Container Shell */}
function Card({ icon, iconColor, title, children }: { icon: React.ReactNode; iconColor: string; title: string; children: React.ReactNode }) {
  return (
    <section className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl">
      <div className="flex items-center gap-2.5 mb-4">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconColor}`}>{icon}</div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}
