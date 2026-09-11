import type { ReactNode } from "react";
import { BookOpen, Layers, ListChecks, Mic, Plus } from "lucide-react";
import { LogoMark, Wordmark } from "./Logo";
import type { DocumentInfo, View } from "../types";
import { cn } from "../utils/cn";

interface AppShellProps {
  document: DocumentInfo;
  view: View;
  onViewChange: (view: View) => void;
  onNewDocument: () => void;
  children: ReactNode;
}

const tabs: { id: View; label: string; icon: typeof BookOpen }[] = [
  { id: "oral", label: "Oral Practice", icon: Mic },
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "quiz", label: "Quiz", icon: ListChecks },
  { id: "chat", label: "Explained", icon: Layers },
];

export default function AppShell({
  document,
  view,
  onViewChange,
  onNewDocument,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={onNewDocument}
            className="flex items-center gap-2.5 text-left"
          >
            <LogoMark className="h-9 w-9" />
            <Wordmark className="text-xl" />
          </button>

          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden max-w-[220px] truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 sm:block">
              {document.name}
            </div>
            <button
              onClick={onNewDocument}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:px-4 sm:py-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New document</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Desktop tabs */}
        <nav className="mx-auto hidden max-w-5xl gap-1 px-4 pb-0 sm:flex sm:px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onViewChange(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "text-indigo-600"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {active && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-indigo-600" />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Mobile tabs (top scrollable strip) */}
      <div className="sticky top-[61px] z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sm:hidden">
        <nav className="nice-scroll flex gap-1 overflow-x-auto px-3 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onViewChange(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
