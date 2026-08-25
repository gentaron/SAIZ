import { useEffect } from "react";
import type { Deck } from "../lib/deck";
import { themeById } from "../lib/themes";
import SlideView from "./SlideView";
import { IconClose } from "./icons";

export default function PresentMode({
  deck,
  themeId,
  terms,
  idx,
  onIdx,
  onExit,
}: {
  deck: Deck;
  themeId: string;
  terms: string[];
  idx: number;
  onIdx: (i: number) => void;
  onExit: () => void;
}) {
  const theme = themeById(themeId);
  const n = deck.slides.length;

  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) {
        e.preventDefault();
        onIdx(Math.min(idx + 1, n - 1));
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        onIdx(Math.max(idx - 1, 0));
      } else if (e.key === "Escape") {
        onExit();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [idx, n, onIdx, onExit]);

  const slide = deck.slides[idx];

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#060f0b]">
      {/* トップバー */}
      <div className="flex h-12 shrink-0 items-center justify-between px-5">
        <span className="truncate font-mono text-[11px] tracking-[0.22em] text-mut">
          {deck.title} <span className="text-dim">— PRESENTATION</span>
        </span>
        <div className="flex items-center gap-4">
          <span className="hidden font-mono text-[11px] tabular-nums text-dim sm:inline">
            ESC で終了 ・ → で次へ
          </span>
          <button
            type="button"
            onClick={onExit}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-line text-mut transition-colors hover:border-verm/70 hover:text-verm"
            aria-label="プレゼンを終了"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* スライド */}
      <div
        className="flex min-h-0 flex-1 cursor-pointer items-center justify-center px-6"
        onClick={(e) => {
          if (e.clientX < window.innerWidth * 0.35) onIdx(Math.max(idx - 1, 0));
          else onIdx(Math.min(idx + 1, n - 1));
        }}
      >
        <div
          key={idx}
          className="slide-swap shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
          style={{ width: "min(94vw, calc((100vh - 130px) * 1.7778))" }}
        >
          <SlideView
            slide={slide}
            theme={theme}
            index={idx}
            total={n}
            deckTitle={deck.title}
            terms={terms}
          />
        </div>
      </div>

      {/* 進捗バー */}
      <div className="flex h-14 shrink-0 items-center gap-5 px-6">
        <div className="h-[3px] flex-1 overflow-hidden rounded bg-white/10">
          <div
            className="h-full bg-gold transition-[width] duration-300"
            style={{ width: `${((idx + 1) / n) * 100}%` }}
          />
        </div>
        <span className="font-mono text-xs tabular-nums tracking-[0.2em] text-mut">
          {String(idx + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
