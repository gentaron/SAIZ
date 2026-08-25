import { useCallback, useEffect, useRef, useState } from "react";
import DeckPanel, { type ExportKind } from "./components/DeckPanel";
import EditorPanel from "./components/EditorPanel";
import LowerSections from "./components/LowerSections";
import PresentMode from "./components/PresentMode";
import SlideView from "./components/SlideView";
import { IconArrowDown, IconPlay, LanternMark } from "./components/icons";
import { analyze, type AnalysisStats } from "./lib/analyzer";
import { composeDeck, type Deck, type Slide } from "./lib/deck";
import { deckBaseName, deckToJson, deckToMarkdown, downloadText } from "./lib/exporters";
import type { Sample } from "./lib/samples";
import { themeById } from "./lib/themes";

const GEN_STEPS = [
  "原稿を整えています",
  "文と章を分けています",
  "キーワードに重みをつけています",
  "重要な文を採点しています",
  "スライドを組んでいます",
];

const LS = {
  text: "gento.text.v1",
  deck: "gento.deck.v1",
  theme: "gento.theme.v1",
  terms: "gento.terms.v1",
  stats: "gento.stats.v1",
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* 容量超過などは黙って諦める */
  }
}

export default function App() {
  const [text, setText] = useState<string>(() => {
    try {
      return localStorage.getItem(LS.text) ?? "";
    } catch {
      return "";
    }
  });
  const [deck, setDeck] = useState<Deck | null>(() => loadJSON<Deck | null>(LS.deck, null));
  const [themeId, setThemeId] = useState<string>(() => {
    try {
      return localStorage.getItem(LS.theme) ?? "sumi";
    } catch {
      return "sumi";
    }
  });
  const [terms, setTerms] = useState<string[]>(() => loadJSON<string[]>(LS.terms, []));
  const [stats, setStats] = useState<AnalysisStats | null>(() => loadJSON<AnalysisStats | null>(LS.stats, null));
  const [status, setStatus] = useState<"idle" | "running" | "ready">(() =>
    loadJSON<Deck | null>(LS.deck, null) ? "ready" : "idle",
  );
  const [step, setStep] = useState(0);
  const [idx, setIdx] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "warn" } | null>(null);
  const [shake, setShake] = useState(false);

  const timerRef = useRef<number | null>(null);
  const commitRef = useRef<number | null>(null);
  const toastRef = useRef<number | null>(null);
  const shakeRef = useRef<number | null>(null);

  /* ---------- 永続化 ---------- */
  useEffect(() => {
    try {
      localStorage.setItem(LS.text, text);
    } catch {
      /* noop */
    }
  }, [text]);
  useEffect(() => saveJSON(LS.deck, deck), [deck]);
  useEffect(() => {
    try {
      localStorage.setItem(LS.theme, themeId);
    } catch {
      /* noop */
    }
  }, [themeId]);
  useEffect(() => saveJSON(LS.terms, terms), [terms]);
  useEffect(() => saveJSON(LS.stats, stats), [stats]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (commitRef.current) window.clearTimeout(commitRef.current);
      if (toastRef.current) window.clearTimeout(toastRef.current);
    },
    [],
  );

  const showToast = useCallback((msg: string, tone: "ok" | "warn" = "ok") => {
    setToast({ msg, tone });
    if (toastRef.current) window.clearTimeout(toastRef.current);
    toastRef.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  /* ---------- 生成 ---------- */
  const generate = useCallback(
    (srcArg?: string) => {
      const src = (srcArg ?? text).trim();
      if (src.length < 80) {
        showToast("原稿が少し短いようです。80字以上が目安です", "warn");
        setShake(true);
        if (shakeRef.current) window.clearTimeout(shakeRef.current);
        shakeRef.current = window.setTimeout(() => setShake(false), 650);
        return;
      }
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (commitRef.current) window.clearTimeout(commitRef.current);

      setPresenting(false);
      setStatus("running");
      setStep(0);

      // 実際の解析は即時に終わる。工程をひとつずつ見せてから結像する。
      const analysis = analyze(src);
      const nextDeck = composeDeck(analysis);
      const nextTerms = analysis.keywords.slice(0, 6).map((k) => k.term);

      let s = 0;
      timerRef.current = window.setInterval(() => {
        s += 1;
        setStep(s);
        if (s >= GEN_STEPS.length) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          commitRef.current = window.setTimeout(() => {
            setDeck(nextDeck);
            setTerms(nextTerms);
            setStats(analysis.stats);
            setIdx(0);
            setStatus("ready");
            showToast(`${nextDeck.slides.length}枚の幻灯が灯りました`, "ok");
          }, 420);
        }
      }, 430);
    },
    [text, showToast],
  );

  const handleSample = useCallback(
    (s: Sample) => {
      setText(s.text);
      generate(s.text);
    },
    [generate],
  );

  /* ---------- スライド編集 ---------- */
  const patchSlide = useCallback((id: string, fn: (s: Slide) => Slide) => {
    setDeck((d) => (d ? { ...d, slides: d.slides.map((s) => (s.id === id ? fn(s) : s)) } : d));
  }, []);
  const onEditTitle = useCallback(
    (id: string, t: string) => patchSlide(id, (s) => ({ ...s, title: t || s.title })),
    [patchSlide],
  );
  const onEditBullet = useCallback(
    (id: string, i: number, t: string) =>
      patchSlide(id, (s) => ({ ...s, bullets: (s.bullets ?? []).map((b, j) => (j === i ? t || b : b)) })),
    [patchSlide],
  );

  /* ---------- 書出 ---------- */
  const onExport = useCallback(
    (kind: ExportKind) => {
      if (!deck) return;
      if (kind === "md") {
        downloadText(`${deckBaseName(deck)}.md`, deckToMarkdown(deck, themeById(themeId).name), "text/markdown");
        showToast("Markdown を書き出しました", "ok");
      } else if (kind === "json") {
        downloadText(`${deckBaseName(deck)}.json`, deckToJson(deck), "application/json");
        showToast("JSON を書き出しました", "ok");
      } else {
        showToast("印刷ダイアログを開きます。「PDFに保存」でPDF化できます", "ok");
        window.setTimeout(() => window.print(), 350);
      }
    },
    [deck, themeId, showToast],
  );

  /* ---------- キーボード ---------- */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable)) return;
      if (presenting || !deck) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setIdx((i) => Math.min(i + 1, deck.slides.length - 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "p" || e.key === "P") {
        setPresenting(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [deck, presenting]);

  const theme = themeById(themeId);

  return (
    <>
      {/* 背景レイヤー */}
      <div className="bg-ambient" aria-hidden />
      <div className="bg-noise" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <span className="glyph-float drift-a -right-[6vw] -top-[9vw] text-[36vw]">幻</span>
        <span className="glyph-float drift-b -bottom-[11vw] -left-[5vw] text-[32vw]">燈</span>
      </div>

      <div className="app-chrome relative z-10">
        {/* ---------- ヘッダー ---------- */}
        <header className="sticky top-0 z-40 border-b border-line bg-page/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 md:px-8">
            <a href="#top" className="group flex items-center gap-3">
              <LanternMark className="h-8 w-8 text-gold transition-transform duration-700 group-hover:rotate-180" />
              <span>
                <span className="block font-display text-[22px] font-extrabold leading-none tracking-[0.1em] text-ink">
                  幻燈
                </span>
                <span className="mt-1 block font-mono text-[9px] tracking-[0.32em] text-dim">
                  GENTŌ ・ TEXT→SLIDE ENGINE
                </span>
              </span>
            </a>
            {deck ? (
              <div className="flex items-center gap-4">
                <span className="hidden max-w-[240px] truncate font-mono text-[11px] tracking-[0.1em] text-dim md:block">
                  {deck.title}
                </span>
                <span className="rounded-sm border border-line px-2.5 py-1 font-mono text-[11px] tabular-nums text-mut">
                  {deck.slides.length}枚
                </span>
                <button
                  type="button"
                  onClick={() => setPresenting(true)}
                  className="flex h-9 items-center gap-2 rounded-sm bg-gold px-4 font-body text-[13px] font-bold tracking-[0.12em] text-[#221708] shadow-[0_10px_26px_-12px_rgba(228,172,85,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0bf70]"
                >
                  <IconPlay className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">プレゼン</span>
                </button>
              </div>
            ) : (
              <a
                href="#how"
                className="flex items-center gap-2 font-mono text-[11px] tracking-[0.22em] text-mut transition-colors hover:text-gold"
              >
                しくみを見る
                <IconArrowDown className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </header>

        <main id="top" className="mx-auto max-w-[1400px] px-5 md:px-8">
          {/* ---------- 導入 ---------- */}
          <div className="mb-9 mt-12 flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
            <div>
              <div className="mb-4 font-mono text-[11px] tracking-[0.42em] text-gold">
                LOCAL SLIDE ENGINE — 全文ブラウザ内処理
              </div>
              <h1 className="font-display text-4xl font-extrabold leading-[1.18] tracking-tight text-ink md:text-6xl">
                文章を、幻灯機にかける。<span className="blink-caret" aria-hidden />
              </h1>
            </div>
            <p className="max-w-md pb-1 font-body text-[13.5px] leading-7 text-mut">
              10,000字までのテキストを貼りつければ、見出しと重要文から
              <b className="font-bold text-ink">約10枚のスライド</b>
              をその場で生成。原稿は端末の外へは出ません。
            </p>
          </div>

          {/* ---------- ワークベンチ ---------- */}
          <div className="grid gap-6 lg:h-[calc(100vh-330px)] lg:min-h-[620px] lg:grid-cols-[minmax(340px,430px)_minmax(0,1fr)]">
            <EditorPanel
              text={text}
              onChange={setText}
              onGenerate={() => generate()}
              running={status === "running"}
              onSample={handleSample}
              shake={shake}
            />
            <DeckPanel
              status={status}
              step={step}
              steps={GEN_STEPS}
              deck={deck}
              themeId={themeId}
              onTheme={setThemeId}
              idx={idx}
              onIdx={setIdx}
              stats={stats}
              terms={terms}
              onPresent={() => setPresenting(true)}
              onExport={onExport}
              onEditTitle={onEditTitle}
              onEditBullet={onEditBullet}
              onSample={handleSample}
            />
          </div>

          {/* ---------- 下部セクション ---------- */}
          <LowerSections />
        </main>

        {/* ---------- フッター ---------- */}
        <footer className="mt-24 border-t border-line">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-6 px-5 py-10 md:px-8">
            <div className="flex items-center gap-3.5">
              <LanternMark className="h-7 w-7 text-gold/80" />
              <div>
                <div className="font-display text-lg font-bold text-ink">
                  幻燈
                  <span className="ml-2 font-mono text-[10px] tracking-[0.3em] text-dim">GENTŌ</span>
                </div>
                <div className="mt-0.5 font-body text-[12px] text-dim">文章を、幻灯機にかけるように。</div>
              </div>
            </div>
            <div className="font-mono text-[10px] tracking-[0.22em] text-dim">
              10,000字 → 約10枚 ・ LOCAL ONLY ・ © 2026 GENTŌ
            </div>
          </div>
        </footer>
      </div>

      {/* プレゼンモード */}
      {presenting && deck && (
        <PresentMode
          deck={deck}
          themeId={themeId}
          terms={terms}
          idx={idx}
          onIdx={setIdx}
          onExit={() => setPresenting(false)}
        />
      )}

      {/* 印刷用シート */}
      {deck && (
        <div id="print-sheet">
          {deck.slides.map((s, i) => (
            <div className="print-slide" key={s.id}>
              <SlideView
                slide={s}
                theme={theme}
                index={i}
                total={deck.slides.length}
                deckTitle={deck.title}
                terms={terms}
              />
            </div>
          ))}
        </div>
      )}

      {/* トースト */}
      {toast && (
        <div
          role="status"
          className={`toast-in fixed bottom-8 left-1/2 z-[80] rounded-sm border px-5 py-3 font-mono text-xs tracking-[0.08em] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] ${
            toast.tone === "warn"
              ? "border-verm/50 bg-[#2a130b] text-[#f2b8a2]"
              : "border-gold/40 bg-panel2 text-ink"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </>
  );
}
