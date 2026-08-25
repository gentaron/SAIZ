import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AnalysisStats } from "../lib/analyzer";
import type { Deck } from "../lib/deck";
import type { Sample } from "../lib/samples";
import { SAMPLES } from "../lib/samples";
import { THEMES, themeById } from "../lib/themes";
import SlideView from "./SlideView";
import {
  IconCheck,
  IconChevronL,
  IconChevronR,
  IconDoc,
  IconDownload,
  IconEdit,
  IconPlay,
  IconPrinter,
  LanternMark,
} from "./icons";

export type ExportKind = "md" | "json" | "print";

/* ---------------- テーマ選択 ---------------- */
function ThemePicker({ themeId, onTheme }: { themeId: string; onTheme: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="mr-0.5 font-mono text-[10px] tracking-[0.22em] text-dim">THEME</span>
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          title={`${t.name} ${t.latin}`}
          onClick={() => onTheme(t.id)}
          className={`h-6 w-6 rounded-full border transition-all duration-200 hover:scale-110 ${
            themeId === t.id
              ? "scale-110 border-gold ring-2 ring-gold/50 ring-offset-2 ring-offset-panel"
              : "border-white/20"
          }`}
          style={{ background: t.bg, boxShadow: `inset 0 0 0 2.5px ${t.accent}` }}
        />
      ))}
    </div>
  );
}

/* ---------------- エクスポートメニュー ---------------- */
function ExportMenu({ onExport }: { onExport: (k: ExportKind) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const items: { k: ExportKind; label: string; icon: ReactNode }[] = [
    { k: "md", label: "Markdown (.md)", icon: <IconDoc className="h-4 w-4" /> },
    { k: "json", label: "JSON (.json)", icon: <IconDownload className="h-4 w-4" /> },
    { k: "print", label: "プリント / PDF", icon: <IconPrinter className="h-4 w-4" /> },
  ];
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-sm border border-line px-3.5 font-mono text-[11px] tracking-[0.14em] text-mut transition-all duration-200 hover:border-line2 hover:text-ink"
      >
        <IconDownload className="h-3.5 w-3.5" />
        書出
      </button>
      {open && (
        <div
          className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-sm border border-line2 bg-panel2 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]"
          style={{ animation: "rise-in 0.22s ease both" }}
        >
          {items.map((it) => (
            <button
              key={it.k}
              type="button"
              onClick={() => {
                setOpen(false);
                onExport(it.k);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left font-body text-[13px] text-mut transition-colors hover:bg-raise hover:text-ink"
            >
              <span className="text-gold">{it.icon}</span>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- 生成オーバーレイ ---------------- */
function GeneratingOverlay({ steps, step }: { steps: string[]; step: number }) {
  return (
    <div className="absolute inset-0 z-10 grid place-items-center rounded-md bg-page/70 backdrop-blur-[3px]">
      <div className="w-[330px] border border-line bg-panel2/95 px-8 py-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
        <div className="mb-5 flex items-center gap-4">
          <span className="lantern-pulse flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 text-gold">
            <LanternMark className="h-6 w-6" />
          </span>
          <div>
            <div className="font-display text-lg font-bold tracking-wide text-ink">点火中</div>
            <div className="font-mono text-[10px] tracking-[0.28em] text-dim">GENTŌ ENGINE</div>
          </div>
        </div>
        <ul>
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 py-[7px] font-mono text-[12px]">
              {i < step ? (
                <span className="step-check flex h-4 w-4 items-center justify-center text-gold">
                  <IconCheck className="h-4 w-4" />
                </span>
              ) : i === step ? (
                <span className="ml-0.5 h-3 w-3 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              ) : (
                <span className="ml-0.5 h-3 w-3 rounded-full border border-line2" />
              )}
              <span className={i < step ? "text-mut" : i === step ? "text-ink" : "text-dim"}>{s}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 h-[3px] w-full overflow-hidden rounded bg-white/5">
          <div
            className="bar-busy h-full transition-[width] duration-500"
            style={{ width: `${Math.min(100, ((step + 1) / steps.length) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------- 本体 ---------------- */
export default function DeckPanel({
  status,
  step,
  steps,
  deck,
  themeId,
  onTheme,
  idx,
  onIdx,
  stats,
  terms,
  onPresent,
  onExport,
  onEditTitle,
  onEditBullet,
  onSample,
}: {
  status: "idle" | "running" | "ready";
  step: number;
  steps: string[];
  deck: Deck | null;
  themeId: string;
  onTheme: (id: string) => void;
  idx: number;
  onIdx: (i: number) => void;
  stats: AnalysisStats | null;
  terms: string[];
  onPresent: () => void;
  onExport: (k: ExportKind) => void;
  onEditTitle: (slideId: string, text: string) => void;
  onEditBullet: (slideId: string, i: number, text: string) => void;
  onSample: (s: Sample) => void;
}) {
  const theme = themeById(themeId);
  const ready = status === "ready" && !!deck;
  const n = deck?.slides.length ?? 0;

  return (
    <section className="flex h-full flex-col">
      {/* ツールバー */}
      {ready && stats && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.1em] text-mut">
            {[
              [stats.sentences.toLocaleString(), "文"],
              [stats.sections.toString(), "章"],
              [stats.keywords.toString(), "語"],
              [`${stats.ms}`, "ms"],
            ].map(([v, u], i) => (
              <span key={i} className="flex items-baseline gap-1 rounded-sm border border-line bg-panel/70 px-2.5 py-1">
                <b className="text-[12px] font-semibold text-gold">{v}</b>
                <span className="text-dim">{u}</span>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ThemePicker themeId={themeId} onTheme={onTheme} />
            <ExportMenu onExport={onExport} />
            <button
              type="button"
              onClick={onPresent}
              className="flex h-9 items-center gap-2 rounded-sm bg-gold px-4 font-body text-[13px] font-bold tracking-[0.12em] text-[#221708] shadow-[0_10px_26px_-12px_rgba(228,172,85,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0bf70]"
            >
              <IconPlay className="h-3.5 w-3.5" />
              プレゼン
            </button>
          </div>
        </div>
      )}

      {/* プレビュー領域 */}
      <div
        className={`relative min-h-[300px] flex-1 lg:min-h-0 ${
          !ready ? "rounded-md border border-dashed border-line" : ""
        }`}
      >
        {ready && deck ? (
          <div className="grid h-full place-items-center">
            <div className="w-full max-w-[840px]">
              <div
                key={idx}
                className="slide-swap rounded-[3px] shadow-[0_36px_90px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/10"
              >
                <SlideView
                  slide={deck.slides[idx]}
                  theme={theme}
                  index={idx}
                  total={n}
                  deckTitle={deck.title}
                  terms={terms}
                  editable
                  onEditTitle={(t) => onEditTitle(deck.slides[idx].id, t)}
                  onEditBullet={(i, t) => onEditBullet(deck.slides[idx].id, i, t)}
                />
              </div>
            </div>
          </div>
        ) : status === "running" ? (
          <GeneratingOverlay steps={steps} step={step} />
        ) : (
          <div className="grid h-full place-items-center p-8">
            <div className="max-w-md text-center">
              <LanternMark className="spin-slow mx-auto mb-7 h-16 w-16 text-gold/30" />
              <h3 className="font-display text-2xl font-bold text-ink md:text-3xl">幻灯機は、待機中。</h3>
              <p className="mt-4 font-body text-[13.5px] leading-7 text-mut">
                左に原稿を貼りつけて「幻灯に灯す」を押すと、
                ここに約10枚のスライドが灯ります。
                まずはサンプル原稿で、光を試すのもおすすめです。
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onSample(s)}
                    className="rounded-full border border-line px-4 py-1.5 font-body text-[12.5px] font-medium text-mut transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/60 hover:text-gold"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* コントロール + フィルムストリップ */}
      {ready && deck && (
        <>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onIdx(Math.max(0, idx - 1))}
                disabled={idx === 0}
                aria-label="前のスライド"
                className="flex h-9 w-9 items-center justify-center rounded-sm border border-line text-mut transition-all duration-200 hover:border-gold/60 hover:text-gold disabled:pointer-events-none disabled:opacity-30"
              >
                <IconChevronL className="h-4 w-4" />
              </button>
              <span className="font-mono text-xs tabular-nums tracking-[0.2em] text-mut">
                {String(idx + 1).padStart(2, "0")} <span className="text-dim">/ {String(n).padStart(2, "0")}</span>
              </span>
              <button
                type="button"
                onClick={() => onIdx(Math.min(n - 1, idx + 1))}
                disabled={idx === n - 1}
                aria-label="次のスライド"
                className="flex h-9 w-9 items-center justify-center rounded-sm border border-line text-mut transition-all duration-200 hover:border-gold/60 hover:text-gold disabled:pointer-events-none disabled:opacity-30"
              >
                <IconChevronR className="h-4 w-4" />
              </button>
            </div>
            <span className="hidden items-center gap-2 font-mono text-[10.5px] tracking-[0.12em] text-dim sm:flex">
              <IconEdit className="h-3.5 w-3.5 text-gold/70" />
              スライドの文字をクリック → そのまま編集 ・ Enter で確定
            </span>
          </div>

          <div className="mt-4 flex gap-2.5 overflow-x-auto pb-2">
            {deck.slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onIdx(i)}
                aria-label={`スライド ${i + 1}`}
                className={`w-[168px] shrink-0 overflow-hidden rounded-[3px] text-left transition-all duration-200 ${
                  i === idx
                    ? "shadow-[0_10px_30px_-10px_rgba(228,172,85,0.45)] ring-2 ring-gold"
                    : "opacity-60 ring-1 ring-white/10 hover:-translate-y-0.5 hover:opacity-100"
                }`}
              >
                <div className="pointer-events-none">
                  <SlideView slide={s} theme={theme} index={i} total={n} deckTitle={deck.title} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
