/* ==================================================================
 * 幻燈 GENTŌ — テキストを幻灯にする（自己完結モジュール）
 * 原稿 → 解析 → 約10枚のデッキ → ステージ / プレゼン / 書出
 * ================================================================== */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type SVGProps,
} from "react";
import { analyze, type Analysis, type DataPoint, type Keyword } from "./lib/analyzer";
import { SAMPLES } from "./lib/samples";

/* ---------------- hooks ---------------- */
function useFitScale(designW: number, designH: number, mode: "width" | "contain") {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const s =
        mode === "width" ? r.width / designW : Math.min(r.width / designW, r.height / designH);
      setScale(Math.max(0, s));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designW, designH, mode]);
  return { ref, scale };
}

function usePrefersReducedMotion(): boolean {
  const [prm, setPrm] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fn = () => setPrm(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return prm;
}

/* ---------------- icons ---------------- */
type IP = SVGProps<SVGSVGElement> & { size?: number };
const svgBase = (p: IP) => {
  const { size = 16, ...rest } = p;
  return {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 1.8,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const, ...rest,
  };
};
const Lantern = (p: IP) => (
  <svg {...svgBase(p)}><circle cx="12" cy="12" r="8.2" /><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" /><path d="M12 1.8v3.4M12 18.8v3.4M1.8 12h3.4M18.8 12h3.4" /></svg>
);
const ArrowLeft = (p: IP) => (<svg {...svgBase(p)}><path d="M15 5l-7 7 7 7" /></svg>);
const ArrowRight = (p: IP) => (<svg {...svgBase(p)}><path d="M9 5l7 7-7 7" /></svg>);
const Play = (p: IP) => (<svg {...svgBase(p)}><path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" /></svg>);
const Download = (p: IP) => (<svg {...svgBase(p)}><path d="M12 4v10m0 0l-4-4m4 4l4-4" /><path d="M4.5 19.5h15" /></svg>);
const DocText = (p: IP) => (<svg {...svgBase(p)}><path d="M6 3.5h8l4 4v13H6z" /><path d="M14 3.5v4h4M9 12h6M9 15.5h6" /></svg>);
const PrintGlyph = (p: IP) => (<svg {...svgBase(p)}><path d="M7 8V3.5h10V8" /><rect x="4" y="8" width="16" height="8" rx="1.5" /><path d="M7 13.5h10v7H7z" /></svg>);
const Close = (p: IP) => (<svg {...svgBase(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>);
const Spark = (p: IP) => (<svg {...svgBase(p)}><path d="M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z" fill="currentColor" stroke="none" /></svg>);
const Check = (p: IP) => (<svg {...svgBase(p)}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>);
const Film = (p: IP) => (<svg {...svgBase(p)}><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M8 5v14M16 5v14M3.5 9.5H8M3.5 14.5H8M16 9.5h4.5M16 14.5h4.5" /></svg>);
const Eraser = (p: IP) => (<svg {...svgBase(p)}><path d="M7 20h13" /><path d="M9.5 19.5L4 14l8-8 6.5 6.5-5 5a2.8 2.8 0 01-4 0z" /></svg>);
const Shuffle = (p: IP) => (<svg {...svgBase(p)}><path d="M3.5 7h3l10 10h4M20.5 7h-4l-2.6 2.6M3.5 17h3l2.6-2.6M16.5 4.5L20.5 7l-4 2.5M16.5 14.5l4 2.5-4 2.5" /></svg>);

/* ==================================================================
 * テーマ & デッキ構成
 * ================================================================== */
type SlideKind = "cover" | "agenda" | "content" | "data" | "quote" | "keywords" | "closing";

interface Slide {
  id: string; kind: SlideKind; kicker: string; title: string;
  subtitle?: string; bullets?: string[]; items?: DataPoint[]; tags?: Keyword[]; quote?: string;
}

interface SlideTheme {
  id: string; name: string; nameEn: string;
  bg: string; panel: string; ink: string; sub: string; accent: string;
  rule: string; markBg: string; tagBg: string; tagInk: string;
}

const THEMES: SlideTheme[] = [
  { id: "kami", name: "紙", nameEn: "PAPER", bg: "#F5F2E8", panel: "#EDE9DB", ink: "#20261F", sub: "#6B7268", accent: "#C7472A", rule: "rgba(32,38,31,0.16)", markBg: "rgba(199,71,42,0.16)", tagBg: "rgba(32,38,31,0.07)", tagInk: "#3A423A" },
  { id: "sumi", name: "墨", nameEn: "INK", bg: "#17181A", panel: "#1E2023", ink: "#ECE9E2", sub: "#97948B", accent: "#E0532F", rule: "rgba(236,233,226,0.14)", markBg: "rgba(224,83,47,0.24)", tagBg: "rgba(236,233,226,0.08)", tagInk: "#D8D4CA" },
  { id: "ai", name: "藍", nameEn: "INDIGO NIGHT", bg: "#0F1B26", panel: "#142331", ink: "#E9EEF2", sub: "#8FA3B0", accent: "#E4AC55", rule: "rgba(233,238,242,0.14)", markBg: "rgba(228,172,85,0.22)", tagBg: "rgba(233,238,242,0.08)", tagInk: "#CFDAE2" },
  { id: "matsu", name: "松", nameEn: "PINE", bg: "#0E241C", panel: "#123026", ink: "#E6F0E7", sub: "#93AC9C", accent: "#86C9A5", rule: "rgba(230,240,231,0.14)", markBg: "rgba(134,201,165,0.22)", tagBg: "rgba(230,240,231,0.08)", tagInk: "#CBE0D0" },
];

function pickEven(n: number, k: number): number[] {
  if (k >= n) return Array.from({ length: n }, (_, i) => i);
  return Array.from({ length: k }, (_, i) => Math.floor((i * n) / k));
}

function buildDeck(a: Analysis, target: number, customTitle?: string): Slide[] {
  const sections = a.sections;
  const cover: Slide = { id: "s-cover", kind: "cover", kicker: "GENTŌ AUTO-DECK", title: (customTitle?.trim() || a.title).slice(0, 40), subtitle: a.subtitle, tags: a.keywords.slice(0, 5) };
  const closing: Slide = { id: "s-closing", kind: "closing", kicker: "まとめ / SUMMARY", title: "きょうの要点", bullets: a.takeaways };
  const agenda: Slide = { id: "s-agenda", kind: "agenda", kicker: "構成 / AGENDA", title: "お話のながれ", bullets: sections.map((s) => s.title) };
  const data: Slide = { id: "s-data", kind: "data", kicker: "数値 / DATA", title: "数字で読むポイント", items: a.dataPoints.slice(0, 6) };
  const quote: Slide = { id: "s-quote", kind: "quote", kicker: "引用 / QUOTE", title: "本文のことば", quote: a.quote ?? undefined };
  const keywords: Slide = { id: "s-keywords", kind: "keywords", kicker: "重要語 / KEYWORDS", title: "押さえておきたい語", tags: a.keywords.slice(0, 8) };
  const contentSlides: Slide[] = sections.map((sec, i) => ({
    id: `s-c${i}`, kind: "content",
    kicker: `第${i + 1}節 / SECTION ${String(i + 1).padStart(2, "0")}`,
    title: sec.title, bullets: sec.sentences.slice(0, 4),
  }));
  const splitOf = (s: Slide): [Slide, Slide] => {
    const b = s.bullets ?? [];
    const half = Math.ceil(b.length / 2);
    return [
      { ...s, id: `${s.id}a`, title: `${s.title}（前編）`, bullets: b.slice(0, half) },
      { ...s, id: `${s.id}b`, title: `${s.title}（後編）`, bullets: b.slice(half) },
    ];
  };

  const wantAgenda = target >= 8 && sections.length >= 3;
  const wantData = target >= 9 && a.dataPoints.length >= 2;
  const wantKeywords = target >= 8 && a.keywords.length >= 5;
  const wantQuote = target >= 11 && !!a.quote;

  let optionalCount = (wantAgenda ? 1 : 0) + (wantData ? 1 : 0) + (wantKeywords ? 1 : 0) + (wantQuote ? 1 : 0);
  let bodyBudget = target - 2 - optionalCount;
  const minBody = Math.min(2, sections.length);
  while (bodyBudget < minBody && optionalCount > 0) { optionalCount -= 1; bodyBudget += 1; }

  const contentCount = Math.min(sections.length, bodyBudget);
  const body: Slide[] = pickEven(sections.length, contentCount).map((i) => contentSlides[i]);

  let spare = bodyBudget - body.length;
  while (spare > 0) {
    let best = -1;
    let bestLen = 2;
    body.forEach((s, i) => {
      const len = s.bullets?.length ?? 0;
      if (len >= 3 && len > bestLen) { best = i; bestLen = len; }
    });
    if (best === -1) break;
    const [x, y] = splitOf(body[best]);
    body.splice(best, 1, x, y);
    spare -= 1;
  }

  const out: Slide[] = [cover];
  if (wantAgenda && sections.length >= 3) out.push(agenda);
  out.push(...body);
  if (wantData && a.dataPoints.length >= 2) out.push(data);
  if (wantQuote && a.quote) out.push(quote);
  if (wantKeywords && a.keywords.length >= 5) out.push(keywords);
  out.push(closing);
  return out.slice(0, target);
}

function deckToMarkdown(slides: Slide[], themeName: string): string {
  const lines: string[] = [];
  slides.forEach((s, i) => {
    lines.push(`## ${i + 1}. ${s.title}`);
    if (s.kind === "cover") {
      if (s.subtitle) lines.push(`> ${s.subtitle}`);
      if (s.tags?.length) lines.push(`キーワード: ${s.tags.map((t) => t.term).join(" / ")}`);
    } else if (s.subtitle) lines.push(`_${s.subtitle}_`);
    if (s.bullets) s.bullets.forEach((b) => lines.push(`- ${b}`));
    if (s.items) s.items.forEach((d) => lines.push(`- **${d.value}** — ${d.label}`));
    if (s.quote) lines.push(`> ${s.quote}`);
    if (s.tags && s.kind === "keywords") lines.push(s.tags.map((t) => `\`${t.term}\``).join(" "));
    lines.push("");
  });
  lines.push(`---`, `幻燈 GENTŌ で生成（テーマ: ${themeName} / 全${slides.length}枚）`);
  return lines.join("\n");
}

function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob(["\uFEFF" + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

/* ==================================================================
 * スライドフェイス（960×540）
 * ================================================================== */
const MONO = '"IBM Plex Mono", monospace';
const BODY = '"Zen Kaku Gothic New", sans-serif';
const DISPLAY = '"Shippori Mincho", serif';

function Hi({ text, terms, theme }: { text: string; terms: string[]; theme: SlideTheme }) {
  if (!terms.length) return <>{text}</>;
  const esc = [...new Set(terms)]
    .filter((t) => t.length > 0)
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!esc.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${esc.join("|")})`, "g"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} style={{ background: theme.markBg, color: "inherit", padding: "0 3px", borderRadius: 3, fontWeight: 700 }}>{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function Editable({ value, editable, onCommit, style }: { value: string; editable: boolean; onCommit: (v: string) => void; style?: CSSProperties }) {
  return (
    <div
      className={editable ? "editable" : undefined}
      style={style}
      contentEditable={editable || undefined}
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={(e) => {
        const t = (e.currentTarget.textContent ?? "").trim();
        if (t && t !== value) onCommit(t);
        else e.currentTarget.textContent = value;
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); }
      }}
    >
      {value}
    </div>
  );
}

const Kicker = ({ text, theme }: { text: string; theme: SlideTheme }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: "0.22em", color: theme.accent, fontWeight: 600 }}>{text}</span>
    <span style={{ height: 1.5, width: 64, background: theme.accent, opacity: 0.55 }} />
  </div>
);

const PageFoot = ({ page, total, theme }: { page: number; total: number; theme: SlideTheme }) => (
  <div style={{ position: "absolute", left: 64, right: 64, bottom: 26, display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: MONO, fontSize: 11, letterSpacing: "0.18em", color: theme.sub }}>
    <span>幻燈 GENTŌ</span>
    <span>{String(page).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
  </div>
);

const GhostNum = ({ n, theme }: { n: string; theme: SlideTheme }) => (
  <div aria-hidden style={{ position: "absolute", right: 26, bottom: -46, fontFamily: DISPLAY, fontWeight: 800, fontSize: 220, lineHeight: 1, color: theme.ink, opacity: 0.05, pointerEvents: "none", userSelect: "none" }}>{n}</div>
);

function SlideFace({ slide, theme, page, total, highlightTerms = [], editable = false, onEdit }: {
  slide: Slide; theme: SlideTheme; page: number; total: number;
  highlightTerms?: string[]; editable?: boolean;
  onEdit?: (slideId: string, field: string, value: string) => void;
}) {
  const commit = (field: string) => (v: string) => onEdit?.(slide.id, field, v);
  const commitBullet = (i: number) => (v: string) => onEdit?.(slide.id, `bullet:${i}`, v);
  const shell: CSSProperties = { position: "relative", width: 960, height: 540, background: theme.bg, color: theme.ink, fontFamily: BODY, overflow: "hidden" };

  if (slide.kind === "cover") {
    return (
      <div style={shell}>
        <div aria-hidden style={{ position: "absolute", top: -70, right: 42, writingMode: "vertical-rl", fontFamily: DISPLAY, fontWeight: 800, fontSize: 300, lineHeight: 1, color: theme.ink, opacity: 0.05, pointerEvents: "none", userSelect: "none", letterSpacing: "-0.08em" }}>幻灯</div>
        <div style={{ position: "absolute", top: 0, bottom: 0, right: 34, width: 5, background: theme.accent }} />
        <div style={{ position: "absolute", left: 64, right: 88, top: 58 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.24em", color: theme.accent, fontWeight: 600 }}>{slide.kicker}</span>
            <span style={{ height: 1.5, flex: 1, background: theme.rule }} />
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em", color: theme.sub }}>{new Date().toLocaleDateString("ja-JP")}</span>
          </div>
        </div>
        <div style={{ position: "absolute", left: 64, right: 96, top: 168 }}>
          <Editable value={slide.title} editable={editable} onCommit={commit("title")}
            style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 58, lineHeight: 1.28, letterSpacing: "0.01em", overflowWrap: "anywhere" }} />
          <div style={{ width: 72, height: 5, background: theme.accent, margin: "22px 0 18px" }} />
          {slide.subtitle && (
            <Editable value={slide.subtitle} editable={editable} onCommit={commit("subtitle")}
              style={{ fontSize: 19, lineHeight: 1.7, color: theme.sub, maxWidth: 620, overflowWrap: "anywhere" }} />
          )}
        </div>
        {slide.tags && slide.tags.length > 0 && (
          <div style={{ position: "absolute", left: 64, bottom: 62, display: "flex", gap: 10, flexWrap: "wrap", maxWidth: 700 }}>
            {slide.tags.map((t) => (
              <span key={t.term} style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.06em", padding: "6px 12px", borderRadius: 999, background: theme.tagBg, color: theme.tagInk, border: `1px solid ${theme.rule}` }}>#{t.term}</span>
            ))}
          </div>
        )}
        <PageFoot page={page} total={total} theme={theme} />
      </div>
    );
  }

  if (slide.kind === "agenda") {
    return (
      <div style={{ ...shell, padding: "54px 64px 64px" }}>
        <Kicker text={slide.kicker} theme={theme} />
        <Editable value={slide.title} editable={editable} onCommit={commit("title")}
          style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, margin: "14px 0 26px" }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {(slide.bullets ?? []).map((b, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 22, padding: "13px 4px", borderBottom: `1px solid ${theme.rule}` }}>
              <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: theme.accent, minWidth: 44 }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontSize: 20, fontWeight: 700, flex: 1, overflowWrap: "anywhere" }}><Hi text={b} terms={highlightTerms} theme={theme} /></span>
            </div>
          ))}
        </div>
        <PageFoot page={page} total={total} theme={theme} />
      </div>
    );
  }

  if (slide.kind === "content") {
    const num = slide.kicker.match(/第(\d+)節/)?.[1] ?? "";
    return (
      <div style={{ ...shell, padding: "50px 64px 64px" }}>
        <GhostNum n={num} theme={theme} />
        <Kicker text={slide.kicker} theme={theme} />
        <Editable value={slide.title} editable={editable} onCommit={commit("title")}
          style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 37, margin: "12px 0 22px", lineHeight: 1.3, overflowWrap: "anywhere" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 15, maxWidth: 800 }}>
          {(slide.bullets ?? []).map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <span aria-hidden style={{ width: 11, height: 11, marginTop: 9, background: theme.accent, transform: "rotate(45deg)", flexShrink: 0 }} />
              <Editable value={b} editable={editable} onCommit={commitBullet(i)}
                style={{ fontSize: 18.5, lineHeight: 1.72, overflowWrap: "anywhere", flex: 1 }} />
            </div>
          ))}
        </div>
        <PageFoot page={page} total={total} theme={theme} />
      </div>
    );
  }

  if (slide.kind === "data") {
    return (
      <div style={{ ...shell, padding: "54px 64px 64px" }}>
        <Kicker text={slide.kicker} theme={theme} />
        <Editable value={slide.title} editable={editable} onCommit={commit("title")}
          style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, margin: "14px 0 30px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {(slide.items ?? []).map((d, i) => (
            <div key={i} style={{ background: theme.panel, border: `1px solid ${theme.rule}`, borderLeft: `4px solid ${theme.accent}`, padding: "20px 22px", borderRadius: 4, minHeight: 118 }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, color: theme.accent, lineHeight: 1.2 }}>{d.value}</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: theme.sub, marginTop: 8, overflowWrap: "anywhere" }}>{d.label}</div>
            </div>
          ))}
        </div>
        <PageFoot page={page} total={total} theme={theme} />
      </div>
    );
  }

  if (slide.kind === "quote") {
    return (
      <div style={{ ...shell, padding: "54px 72px 64px" }}>
        <Kicker text={slide.kicker} theme={theme} />
        <div aria-hidden style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 150, lineHeight: 0.6, color: theme.accent, margin: "44px 0 6px -10px", opacity: 0.9 }}>「</div>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 31, lineHeight: 1.66, maxWidth: 760, overflowWrap: "anywhere" }}>
          <Hi text={(slide.quote ?? "").replace(/[「」]/g, "")} terms={highlightTerms} theme={theme} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: "0.2em", color: theme.sub, marginTop: 26 }}>— 本文より / FROM THE MANUSCRIPT</div>
        <PageFoot page={page} total={total} theme={theme} />
      </div>
    );
  }

  if (slide.kind === "keywords") {
    const max = Math.max(...(slide.tags ?? []).map((t) => t.score), 1);
    return (
      <div style={{ ...shell, padding: "54px 64px 64px" }}>
        <Kicker text={slide.kicker} theme={theme} />
        <Editable value={slide.title} editable={editable} onCommit={commit("title")}
          style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, margin: "14px 0 30px" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, maxWidth: 820 }}>
          {(slide.tags ?? []).map((t, i) => (
            <div key={`${t.term}-${i}`} style={{ border: `1px solid ${theme.rule}`, background: theme.panel, borderRadius: 6, padding: "13px 18px", minWidth: 150 }}>
              <div style={{ fontSize: 18, fontWeight: 700, display: "flex", alignItems: "baseline", gap: 10 }}>
                {t.term}
                <span style={{ fontFamily: MONO, fontSize: 11, color: theme.sub }}>×{Math.round(t.score)}</span>
              </div>
              <div style={{ height: 4, background: theme.rule, borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
                <div style={{ width: `${Math.max(12, (t.score / max) * 100)}%`, height: "100%", background: theme.accent, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
        <PageFoot page={page} total={total} theme={theme} />
      </div>
    );
  }

  return (
    <div style={{ ...shell, padding: "50px 64px 64px" }}>
      <GhostNum n="終" theme={theme} />
      <Kicker text={slide.kicker} theme={theme} />
      <Editable value={slide.title} editable={editable} onCommit={commit("title")}
        style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 37, margin: "12px 0 24px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 800 }}>
        {(slide.bullets ?? []).map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
            <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: theme.accent, minWidth: 36 }}>{String(i + 1).padStart(2, "0")}</span>
            <Editable value={b} editable={editable} onCommit={commitBullet(i)}
              style={{ fontSize: 18.5, lineHeight: 1.72, overflowWrap: "anywhere", flex: 1 }} />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 64, bottom: 66, fontFamily: DISPLAY, fontWeight: 700, fontSize: 20, color: theme.sub, letterSpacing: "0.08em" }}>
        ご清聴、ありがとうございました。
      </div>
      <PageFoot page={page} total={total} theme={theme} />
    </div>
  );
}

function ScaledSlide({ width, children, className, style }: { width: number; children: ReactNode; className?: string; style?: CSSProperties }) {
  const scale = width / 960;
  return (
    <div className={className} style={{ width, height: 540 * scale, overflow: "hidden", position: "relative", ...style }}>
      <div style={{ width: 960, height: 540, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none" }}>{children}</div>
    </div>
  );
}

/* ==================================================================
 * 左カラム — 原稿・仕立て・生成
 * ================================================================== */
const MAX_CHARS = 10000;
const MIN_CHARS = 40;
const fmt = (n: number) => n.toLocaleString("ja-JP");

function InputPanel(props: {
  text: string; onText: (v: string) => void;
  slideCount: number; onSlideCount: (n: number) => void;
  themeId: string; onThemeId: (id: string) => void;
  customTitle: string; onCustomTitle: (v: string) => void;
  onGenerate: () => void; busy: boolean;
}) {
  const { text, onText, slideCount, onSlideCount, themeId, onThemeId, customTitle, onCustomTitle, onGenerate, busy } = props;
  const len = text.length;
  const remaining = MAX_CHARS - len;
  const ratio = len / MAX_CHARS;
  const counterColor = ratio >= 0.98 ? "var(--color-verm)" : ratio >= 0.9 ? "var(--color-gold)" : "var(--color-dim)";
  const ready = len >= MIN_CHARS && !busy;

  return (
    <aside className="flex flex-col gap-5">
      <div className="rounded-lg border border-line bg-panel/90 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.65)]">
        <div className="flex items-baseline justify-between px-5 pt-4 pb-2">
          <h2 className="flex items-baseline gap-2.5">
            <span className="font-mono text-[11px] tracking-[0.28em] text-gold">01</span>
            <span className="font-display text-lg font-bold tracking-wider">原稿を入れる</span>
          </h2>
          <span className="font-mono text-[11px] tabular-nums tracking-wider" style={{ color: counterColor }}>
            {fmt(len)} / {fmt(MAX_CHARS)} 字
          </span>
        </div>
        <div className="px-5">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => onText(e.target.value.slice(0, MAX_CHARS))}
              maxLength={MAX_CHARS}
              spellCheck={false}
              placeholder={"ここに文章を貼りつけてください。\n\n見出し行（「1. はじめに」「■ 背景」など）があると、\n節ごとのスライドに仕上がります。\nMarkdown の # 見出しにも対応。"}
              className="h-[248px] w-full resize-y rounded-md border border-line bg-page2/80 px-4 py-3 text-[13.5px] leading-relaxed text-ink placeholder:text-dim/70 transition-colors focus:border-gold/60 focus:bg-page2"
            />
            {busy && (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] overflow-hidden rounded-t-md">
                <div className="bar-busy h-full w-full" />
              </div>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono text-[10.5px] tracking-wider text-dim">
            <span>{remaining >= 0 ? `のこり ${fmt(remaining)} 字` : "上限に達しました"}</span>
            <button type="button" onClick={() => onText("")} disabled={!text || busy}
              className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-mut transition-all hover:bg-raise hover:text-ink disabled:pointer-events-none disabled:opacity-30">
              <Eraser size={13} />消す
            </button>
          </div>
        </div>
        <div className="px-5 pb-4 pt-1">
          <p className="mb-2 font-mono text-[10.5px] tracking-[0.22em] text-dim">SAMPLE — まず試す</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLES.map((s) => (
              <button key={s.id} type="button" disabled={busy} onClick={() => onText(s.text)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-panel2 px-3.5 py-1.5 text-xs font-medium text-mut transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/60 hover:text-gold active:translate-y-0 disabled:pointer-events-none disabled:opacity-40">
                <Spark size={11} className="text-gold/70 transition-transform group-hover:rotate-45" />
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-panel/90 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.65)]">
        <div className="px-5 pt-4 pb-2">
          <h2 className="flex items-baseline gap-2.5">
            <span className="font-mono text-[11px] tracking-[0.28em] text-gold">02</span>
            <span className="font-display text-lg font-bold tracking-wider">仕立てを選ぶ</span>
          </h2>
        </div>
        <div className="flex flex-col gap-5 px-5 pb-5">
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <label htmlFor="slide-count" className="text-xs font-bold tracking-wider text-mut">スライド枚数</label>
              <span className="font-mono text-sm font-semibold tabular-nums text-gold">
                {slideCount}<span className="ml-1 text-[10px] text-dim">枚</span>
              </span>
            </div>
            <input id="slide-count" type="range" min={6} max={14} step={1} value={slideCount} disabled={busy}
              onChange={(e) => onSlideCount(Number(e.target.value))} className="gen-range w-full"
              style={{ "--fill": `${((slideCount - 6) / 8) * 100}%` } as CSSProperties} />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-dim"><span>6</span><span>10</span><span>14</span></div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold tracking-wider text-mut">スライドの紙と墨</p>
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map((t) => {
                const active = t.id === themeId;
                return (
                  <button key={t.id} type="button" disabled={busy} onClick={() => onThemeId(t.id)} aria-pressed={active} title={`テーマ「${t.name}」`}
                    className={`group flex flex-col items-center gap-1.5 rounded-md border px-2 py-2.5 transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${
                      active ? "border-gold/70 bg-raise shadow-[0_0_0_1px_rgba(228,172,85,0.25)]" : "border-line bg-panel2 hover:-translate-y-0.5 hover:border-line2"
                    }`}>
                    <span className="flex h-7 w-11 items-center justify-center rounded-[3px] border transition-transform group-hover:scale-105" style={{ background: t.bg, borderColor: "rgba(0,0,0,0.15)" }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: t.accent }} />
                    </span>
                    <span className={`font-display text-[12px] font-bold leading-none ${active ? "text-gold" : "text-mut"}`}>{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="custom-title" className="mb-2 block text-xs font-bold tracking-wider text-mut">
              タイトル指定 <span className="font-normal text-dim">（任意・未入力は自動採題）</span>
            </label>
            <input id="custom-title" type="text" value={customTitle} disabled={busy} maxLength={40}
              onChange={(e) => onCustomTitle(e.target.value)} placeholder="例：光合成 — 地球を回す緑のエンジン"
              className="w-full rounded-md border border-line bg-page2/80 px-3.5 py-2.5 text-[13px] text-ink placeholder:text-dim/70 transition-colors focus:border-gold/60" />
          </div>
        </div>
      </div>

      <div>
        <button type="button" onClick={onGenerate} disabled={!ready}
          className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-lg border border-gold/40 bg-gold px-6 py-4 font-display text-lg font-extrabold tracking-[0.12em] text-page shadow-[0_10px_36px_-10px_rgba(228,172,85,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0bd6b] hover:shadow-[0_16px_44px_-10px_rgba(228,172,85,0.7)] active:translate-y-0 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-35 disabled:shadow-none">
          <Lantern size={20} className={busy ? "lantern-pulse rounded-full" : "transition-transform duration-500 group-hover:rotate-90"} />
          {busy ? "幻灯を仕込み中…" : "スライドを生成する"}
          <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        </button>
        {!ready && !busy && (
          <p className="mt-2 text-center font-mono text-[11px] tracking-wider text-dim">まずは {MIN_CHARS} 字以上の原稿を入れてください</p>
        )}
      </div>

      <details className="acc group rounded-lg border border-line bg-panel/70">
        <summary className="flex items-center justify-between px-5 py-3.5">
          <span className="flex items-baseline gap-2.5">
            <span className="font-mono text-[11px] tracking-[0.28em] text-gold">03</span>
            <span className="font-display text-sm font-bold tracking-wider">つかいかた</span>
          </span>
          <span className="acc-icon font-mono text-lg leading-none text-gold">+</span>
        </summary>
        <ol className="space-y-3 px-5 pb-4 text-[12.5px] leading-relaxed text-mut">
          <li className="flex gap-3"><span className="font-mono text-[11px] font-semibold text-gold">壱</span>原稿を貼る。見出し行があると節がきれいに分かれます（# や「1.」「■」にも対応）。</li>
          <li className="flex gap-3"><span className="font-mono text-[11px] font-semibold text-gold">弐</span>枚数とテーマを選び、生成。キーワード抽出から重要文の採点まで、すべてブラウザ内で完了します。</li>
          <li className="flex gap-3"><span className="font-mono text-[11px] font-semibold text-gold">参</span>スライドの文字はクリックで直接書き換えられます。← → キーで送り、F キーで全画面プレゼン。</li>
        </ol>
        <p className="border-t border-line px-5 py-3 font-mono text-[10.5px] leading-relaxed tracking-wider text-dim">PRIVACY — 文章はこの端末の外へ一切送信されません。</p>
      </details>
    </aside>
  );
}

/* ==================================================================
 * 右カラム — 空状態 / 生成中
 * ================================================================== */
function EmptyState() {
  return (
    <div className="flex h-full min-h-[540px] flex-col items-center justify-center gap-10 px-8 py-12 text-center">
      <div className="relative h-[150px] w-[300px]">
        <svg viewBox="0 0 300 150" className="absolute inset-0 h-full w-full text-gold" fill="none">
          <circle cx="70" cy="75" r="42" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <circle cx="70" cy="75" r="16" stroke="currentColor" strokeWidth="2" opacity="0.55" />
          <circle cx="70" cy="75" r="5" fill="currentColor" />
          <path d="M112 75 L262 22 L262 128 Z" fill="currentColor" opacity="0.07" />
          <path d="M112 75 L262 22 M112 75 L262 128" stroke="currentColor" strokeWidth="1.4" opacity="0.5" strokeDasharray="3 6" />
          <rect x="252" y="34" width="34" height="82" stroke="currentColor" strokeWidth="2" opacity="0.85" />
          <rect x="259" y="44" width="20" height="12" fill="currentColor" opacity="0.35" />
          <rect x="259" y="62" width="20" height="12" fill="currentColor" opacity="0.25" />
          <rect x="259" y="80" width="20" height="12" fill="currentColor" opacity="0.35" />
          <path d="M52 122h36M60 130h20" stroke="currentColor" strokeWidth="2" opacity="0.4" strokeLinecap="round" />
        </svg>
        <span className="glyph-float drift-a left-[6%] top-[4%] text-[54px]">幻</span>
        <span className="glyph-float drift-b right-[2%] top-[30%] text-[40px]">燈</span>
      </div>
      <div>
        <p className="font-mono text-[11px] tracking-[0.34em] text-dim">STAGE — まっさらな幕</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold leading-snug tracking-wide text-ink sm:text-4xl">
          原稿を入れると、ここで<br /><span className="text-gold">幻灯</span>が幕を開ける。
        </h2>
        <p className="mx-auto mt-4 max-w-md text-[13.5px] leading-relaxed text-mut">
          10,000字までのテキストから、表紙・構成・本文・まとめまで約10枚のデッキをその場で組み立てます。通信は使いません。
        </p>
      </div>
      <ol className="w-full max-w-sm text-left">
        {[
          ["壱", "左の原稿欄に文章を貼る（サンプルもあり）"],
          ["弐", "枚数とテーマを選ぶ"],
          ["参", "生成を押すと、右にスライドが写る"],
        ].map(([n, t]) => (
          <li key={n} className="flex items-baseline gap-4 border-t border-line px-2 py-3.5 last:border-b">
            <span className="font-display text-xl font-bold text-gold">{n}</span>
            <span className="text-[13px] text-mut">{t}</span>
          </li>
        ))}
      </ol>
      <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.22em] text-dim">
        <Film size={13} />ALL PROCESSING IN YOUR BROWSER
      </p>
    </div>
  );
}

const GEN_STEPS = [
  { label: "原稿を読み込んでいる" },
  { label: "文と節を解析している" },
  { label: "キーワードを重み付けしている" },
  { label: "重要文を採点している" },
  { label: "スライドを配分している" },
];
const STEP_MS = [430, 560, 640, 470, 400];

function GeneratingPanel({ current, analysis, slideCount }: { current: number; analysis: Analysis | null; slideCount: number }) {
  const a = analysis;
  const detailFor = (i: number): string | undefined => {
    if (!a) return undefined;
    switch (i) {
      case 0: return `${a.stats.chars.toLocaleString()} 字を読み込み`;
      case 1: return `${a.stats.sentences} 文 / ${a.stats.sections} 節を検出`;
      case 2: return `${a.stats.keywords} 語に重み付け`;
      case 3: return `上位文を ${Math.min(a.takeaways.length + 6, a.stats.sentences)} 件抽出`;
      case 4: return `全 ${slideCount} 枚を配分`;
      default: return undefined;
    }
  };
  return (
    <div className="flex h-full min-h-[540px] flex-col items-center justify-center gap-9 px-8 py-12">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg viewBox="0 0 96 96" className="spin-slow h-full w-full text-gold" fill="none" stroke="currentColor">
          <circle cx="48" cy="48" r="44" strokeWidth="2" opacity="0.5" />
          <circle cx="48" cy="48" r="8" strokeWidth="2" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <rect key={deg} x="42" y="14" width="12" height="16" rx="3" strokeWidth="1.6" opacity="0.75" transform={`rotate(${deg} 48 48)`} />
          ))}
        </svg>
        <span className="lantern-pulse absolute h-3 w-3 rounded-full bg-gold" />
      </div>
      <div className="w-full max-w-md">
        <p className="mb-5 text-center font-mono text-[11px] tracking-[0.3em] text-gold">DEVELOPING — 幻灯を現像中</p>
        <ol className="space-y-1">
          {GEN_STEPS.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={s.label}
                className={`flex items-baseline gap-3.5 rounded-md px-3 py-2.5 transition-all duration-300 ${active ? "bg-panel2/80" : ""} ${done || active ? "opacity-100" : "opacity-30"}`}>
                <span className="flex w-5 justify-center">
                  {done ? (
                    <span className="step-check inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gold text-page"><Check size={11} /></span>
                  ) : active ? (
                    <span className="blink-caret" />
                  ) : (
                    <span className="inline-block h-[7px] w-[7px] rounded-full border border-dim" />
                  )}
                </span>
                <span className={`flex-1 text-[13.5px] font-medium ${active ? "text-ink" : "text-mut"}`}>
                  {s.label}
                  {active && <span className="blink-caret" />}
                </span>
                {done && <span className="font-mono text-[10.5px] tabular-nums tracking-wider text-dim">{detailFor(i)}</span>}
              </li>
            );
          })}
        </ol>
      </div>
      <p className="max-w-sm text-center font-mono text-[10.5px] leading-relaxed tracking-[0.18em] text-dim">
        解析はこのブラウザの中で完結します — 原稿はどこへも送信されません
      </p>
    </div>
  );
}

/* ==================================================================
 * デッキビューワー
 * ================================================================== */
const pad = (n: number) => String(n).padStart(2, "0");

function ToolBtn({ children, onClick, label }: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel2 px-2.5 py-2 font-mono text-[11px] font-medium tracking-wider text-mut transition-all duration-200 hover:-translate-y-0.5 hover:border-line2 hover:text-ink active:translate-y-0 active:scale-95">
      {children}
    </button>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <span className="flex items-baseline gap-2">
    <span className="font-mono text-[10px] tracking-[0.22em] text-dim">{label}</span>
    <span className="font-mono text-[13px] font-semibold tabular-nums text-gold">{value}</span>
  </span>
);

function DeckViewer({ slides, index, onIndex, theme, onCycleTheme, highlightTerms, analysis, onEdit, onPresent, toast, deckTitle }: {
  slides: Slide[]; index: number; onIndex: (i: number) => void;
  theme: SlideTheme; onCycleTheme: () => void; highlightTerms: string[];
  analysis: Analysis; onEdit: (slideId: string, field: string, value: string) => void;
  onPresent: () => void; toast: (msg: string) => void; deckTitle: string;
}) {
  const prm = usePrefersReducedMotion();
  const { ref, scale } = useFitScale(960, 540, "width");
  const [dir, setDir] = useState<1 | -1>(1);
  const thumbRef = useRef<HTMLDivElement>(null);
  const total = slides.length;
  const cur = slides[index];

  const go = (n: number) => {
    const next = Math.max(0, Math.min(total - 1, n));
    if (next !== index) {
      setDir(next > index ? 1 : -1);
      onIndex(next);
    }
  };

  useEffect(() => {
    const rail = thumbRef.current;
    const el = rail?.children[index] as HTMLElement | undefined;
    if (rail && el) {
      const left = el.offsetLeft - rail.clientWidth / 2 + el.clientWidth / 2;
      rail.scrollTo({ left, behavior: prm ? "auto" : "smooth" });
    }
  }, [index, prm]);

  const slug = deckTitle.replace(/[\\/:*?"<>|\s]+/g, "-").slice(0, 24) || "gentou-deck";

  const exportJSON = () => {
    downloadText(`${slug}.json`, JSON.stringify({ meta: { tool: "幻燈 GENTŌ", theme: theme.name, generated: new Date().toISOString(), slides: total }, slides }, null, 2), "application/json");
    toast("JSON を書き出しました");
  };
  const exportMD = () => {
    downloadText(`${slug}.md`, deckToMarkdown(slides, theme.name), "text/markdown");
    toast("Markdown を書き出しました");
  };
  const copyMD = async () => {
    try {
      await navigator.clipboard.writeText(deckToMarkdown(slides, theme.name));
      toast("スライド全文をコピーしました");
    } catch {
      toast("コピーできませんでした");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-[0.26em] text-dim">STAGE</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-ink">
            {pad(index + 1)}<span className="mx-1 text-dim">/</span><span className="text-mut">{pad(total)}</span>
          </span>
          <span className="hidden font-mono text-[10.5px] tracking-wider text-dim sm:inline">テーマ「{theme.name}」</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ToolBtn onClick={onCycleTheme} label="テーマ切替"><Shuffle size={14} /><span className="hidden sm:inline">テーマ</span></ToolBtn>
          <ToolBtn onClick={copyMD} label="全文コピー"><DocText size={14} /><span className="hidden sm:inline">コピー</span></ToolBtn>
          <ToolBtn onClick={exportMD} label="Markdown 書出"><Download size={14} /><span className="hidden sm:inline">MD</span></ToolBtn>
          <ToolBtn onClick={exportJSON} label="JSON 書出"><Download size={14} /><span className="hidden sm:inline">JSON</span></ToolBtn>
          <ToolBtn onClick={() => window.print()} label="印刷 / PDF"><PrintGlyph size={14} /><span className="hidden sm:inline">印刷</span></ToolBtn>
          <button type="button" onClick={onPresent}
            className="ml-1 inline-flex items-center gap-2 rounded-md border border-gold/50 bg-gold/15 px-3.5 py-2 font-display text-[13px] font-bold tracking-wider text-gold transition-all duration-200 hover:-translate-y-0.5 hover:bg-gold hover:text-page active:translate-y-0 active:scale-95">
            <Play size={13} />プレゼン
          </button>
        </div>
      </div>

      <div className="relative">
        <div ref={ref} className="relative w-full overflow-hidden rounded-lg border border-line2/70 bg-[#0a0f0c] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)]" style={{ aspectRatio: "16 / 9" }}>
          <div aria-hidden className="pointer-events-none absolute inset-0 z-10"
            style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(228,172,85,0.05), transparent 55%), linear-gradient(to bottom, rgba(255,255,255,0.03), transparent 18%)" }} />
          {cur && scale > 0 && (
            <div key={cur.id + theme.id + index} className={prm ? undefined : "slide-swap"}
              style={{ position: "absolute", top: 0, left: 0, width: 960, height: 540, transform: `scale(${scale})`, transformOrigin: "top left", animationDirection: dir === -1 ? "reverse" : undefined }}>
              <SlideFace slide={cur} theme={theme} page={index + 1} total={total} highlightTerms={highlightTerms} editable onEdit={onEdit} />
            </div>
          )}
          <button type="button" aria-label="前のスライド" onClick={() => go(index - 1)} disabled={index === 0}
            className="group absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-line2 bg-page/70 p-2.5 text-mut backdrop-blur transition-all hover:border-gold/60 hover:text-gold active:scale-90 disabled:pointer-events-none disabled:opacity-25">
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          </button>
          <button type="button" aria-label="次のスライド" onClick={() => go(index + 1)} disabled={index === total - 1}
            className="group absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-line2 bg-page/70 p-2.5 text-mut backdrop-blur transition-all hover:border-gold/60 hover:text-gold active:scale-90 disabled:pointer-events-none disabled:opacity-25">
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
        <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-panel2">
          <div className="h-full rounded-full bg-gradient-to-r from-golddeep to-gold transition-all duration-500 ease-out" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
      </div>

      <div ref={thumbRef} className="flex gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin]">
        {slides.map((s, i) => (
          <button key={s.id} type="button" onClick={() => go(i)} aria-label={`スライド ${i + 1} へ`} aria-current={i === index}
            className={`group relative shrink-0 overflow-hidden rounded-[5px] border transition-all duration-200 ${
              i === index
                ? "border-gold shadow-[0_0_0_1.5px_rgba(228,172,85,0.5),0_8px_24px_-8px_rgba(228,172,85,0.4)]"
                : "border-line opacity-60 hover:-translate-y-1 hover:border-line2 hover:opacity-100"
            }`}
            style={{ width: 148 }}>
            <ScaledSlide width={148}>
              <SlideFace slide={s} theme={theme} page={i + 1} total={total} highlightTerms={highlightTerms} />
            </ScaledSlide>
            <span className={`absolute bottom-1 right-1.5 rounded-sm px-1.5 py-0.5 font-mono text-[9.5px] font-semibold tabular-nums ${i === index ? "bg-gold text-page" : "bg-page/70 text-mut"}`}>
              {pad(i + 1)}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-line bg-panel/70 px-5 py-3">
        <Stat label="原稿" value={`${analysis.stats.chars.toLocaleString()} 字`} />
        <Stat label="文" value={`${analysis.stats.sentences}`} />
        <Stat label="節" value={`${analysis.stats.sections}`} />
        <Stat label="キーワード" value={`${analysis.stats.keywords} 語`} />
        <Stat label="解析時間" value={`${analysis.stats.ms} ms`} />
        <span className="ml-auto hidden items-center gap-2 font-mono text-[10.5px] tracking-wider text-dim md:flex">
          <span className="kbd">←</span><span className="kbd">→</span>スライド送り
          <span className="kbd ml-3">F</span>プレゼン
          <span className="ml-3 text-gold/80">文字はクリックで直接編集できます</span>
        </span>
      </div>
    </div>
  );
}

/* ==================================================================
 * 全画面プレゼン
 * ================================================================== */
function GentoPresent({ slides, start, theme, highlightTerms, onClose }: {
  slides: Slide[]; start: number; theme: SlideTheme; highlightTerms: string[]; onClose: () => void;
}) {
  const [index, setIndex] = useState(start);
  const [cursorHidden, setCursorHidden] = useState(false);
  const prm = usePrefersReducedMotion();
  const { ref, scale } = useFitScale(960, 540, "contain");
  const total = slides.length;
  const cur = slides[index];

  const go = useCallback((n: number) => setIndex(Math.max(0, Math.min(total - 1, n))), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(index + 1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") go(index - 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(total - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, total, go, onClose]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const reset = () => {
      setCursorHidden(false);
      clearTimeout(t);
      t = setTimeout(() => setCursorHidden(true), 2600);
    };
    reset();
    window.addEventListener("mousemove", reset);
    return () => { clearTimeout(t); window.removeEventListener("mousemove", reset); };
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-label="全画面プレゼン"
      className="fixed inset-0 z-[80] flex flex-col bg-[#050807]"
      style={{ cursor: cursorHidden ? "none" : "auto" }}
      onClick={() => go(index + 1)}>
      <div aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(90% 70% at 50% 42%, rgba(228,172,85,0.05), transparent 60%), radial-gradient(140% 100% at 50% 120%, rgba(0,0,0,0.75), transparent 55%)" }} />
      <div ref={ref} className="relative flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
        {cur && scale > 0 && (
          <div key={cur.id + theme.id + index} className={prm ? undefined : "slide-swap"}
            style={{ width: 960 * scale, height: 540 * scale, boxShadow: "0 40px 120px -20px rgba(0,0,0,0.9), 0 0 0 1px rgba(228,172,85,0.12)" }}>
            <div style={{ width: 960, height: 540, transform: `scale(${scale})`, transformOrigin: "top left" }}>
              <SlideFace slide={cur} theme={theme} page={index + 1} total={total} highlightTerms={highlightTerms} />
            </div>
          </div>
        )}
        <button type="button" aria-label="前へ" onClick={(e) => { e.stopPropagation(); go(index - 1); }} disabled={index === 0}
          className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-line2 bg-page/60 p-3 text-mut backdrop-blur transition-all duration-300 hover:border-gold/60 hover:text-gold active:scale-90 disabled:pointer-events-none disabled:opacity-0 sm:left-5 ${cursorHidden ? "opacity-0" : ""}`}>
          <ArrowLeft size={18} />
        </button>
        <button type="button" aria-label="次へ" onClick={(e) => { e.stopPropagation(); go(index + 1); }} disabled={index === total - 1}
          className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-line2 bg-page/60 p-3 text-mut backdrop-blur transition-all duration-300 hover:border-gold/60 hover:text-gold active:scale-90 disabled:pointer-events-none disabled:opacity-0 sm:right-5 ${cursorHidden ? "opacity-0" : ""}`}>
          <ArrowRight size={18} />
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); }}
          className={`absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-line2 bg-page/70 px-3.5 py-2 font-mono text-[11px] tracking-[0.2em] text-mut backdrop-blur transition-all duration-300 hover:border-verm/70 hover:text-verm sm:right-5 sm:top-5 ${cursorHidden ? "opacity-0" : ""}`}>
          <Close size={13} />ESC で終了
        </button>
      </div>
      <div className={`relative z-10 flex items-center gap-4 px-5 pb-4 transition-opacity duration-300 ${cursorHidden ? "opacity-0" : "opacity-100"}`}
        onClick={(e) => e.stopPropagation()}>
        <span className="font-mono text-xs font-semibold tabular-nums tracking-[0.2em] text-gold">
          {pad(index + 1)} <span className="text-dim">/ {pad(total)}</span>
        </span>
        <div className="flex flex-1 items-center gap-[5px]">
          {slides.map((s, i) => (
            <button key={s.id} type="button" aria-label={`スライド ${i + 1}`} onClick={() => go(i)}
              className={`h-[5px] flex-1 rounded-full transition-all duration-300 ${i === index ? "bg-gold" : i < index ? "bg-gold/35" : "bg-panel2 hover:bg-line2"}`} />
          ))}
        </div>
        <span className="hidden font-mono text-[10px] tracking-[0.22em] text-dim sm:block">SPACE / クリックで進む</span>
      </div>
    </div>
  );
}

/* ==================================================================
 * アプリ本体
 * ================================================================== */
type Phase = "idle" | "working" | "ready";

export default function GentoApp() {
  const prm = usePrefersReducedMotion();

  const [text, setText] = useState("");
  const [slideCount, setSlideCount] = useState(10);
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [customTitle, setCustomTitle] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [genStep, setGenStep] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [present, setPresent] = useState(false);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const [entered, setEntered] = useState(false);

  const timers = useRef<number[]>([]);
  const busy = phase === "working";
  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];
  const highlightTerms = (analysis?.keywords.slice(0, 6) ?? []).map((k) => k.term);

  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 60);
    return () => {
      window.clearTimeout(t);
      timers.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast({ id: Date.now(), msg });
    window.setTimeout(() => setToast((t) => (t && Date.now() - t.id > 2200 ? null : t)), 2500);
  }, []);

  const generate = useCallback(() => {
    if (busy || text.length < 40) return;
    const a = analyze(text);
    setAnalysis(a);
    setPhase("working");
    setGenStep(0);
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    let acc = 0;
    GEN_STEPS.forEach((_, i) => {
      acc += prm ? 60 : (STEP_MS[i] ?? 400);
      timers.current.push(window.setTimeout(() => setGenStep(i + 1), acc));
    });
    acc += prm ? 120 : 520;
    timers.current.push(
      window.setTimeout(() => {
        setSlides(buildDeck(a, slideCount, customTitle));
        setIndex(0);
        setPhase("ready");
        showToast("幻灯が出来上がりました");
      }, acc),
    );
  }, [busy, text, slideCount, customTitle, prm, showToast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable;
      if (present || typing || phase !== "ready") return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(slides.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      else if (e.key === "Home") setIndex(0);
      else if (e.key === "End") setIndex(slides.length - 1);
      else if (e.key === "f" || e.key === "F") setPresent(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, present, slides.length]);

  const onEdit = useCallback((slideId: string, field: string, value: string) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== slideId) return s;
        if (field === "title" || field === "subtitle") return { ...s, [field]: value };
        if (field.startsWith("bullet:")) {
          const i = Number(field.slice(7));
          const bullets = [...(s.bullets ?? [])];
          bullets[i] = value;
          return { ...s, bullets };
        }
        return s;
      }),
    );
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeId((cur) => {
      const i = THEMES.findIndex((t) => t.id === cur);
      const next = THEMES[(i + 1) % THEMES.length];
      showToast(`テーマ「${next.name}」に切り替えました`);
      return next.id;
    });
  }, [showToast]);

  const deckTitle = slides[0]?.title ?? "幻灯デッキ";

  return (
    <>
      <div className="app-chrome relative min-h-screen">
        <div className="bg-ambient" aria-hidden />
        <div className="bg-noise" aria-hidden />
        <span aria-hidden className="glyph-float drift-a left-[44%] top-[6%] text-[170px]">幻</span>
        <span aria-hidden className="glyph-float drift-b left-[3%] bottom-[8%] text-[130px]">燈</span>
        <span aria-hidden className="glyph-float drift-a right-[4%] top-[38%] text-[90px]">映</span>

        <header className={`relative z-10 border-b border-line transition-all duration-700 ${entered ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"}`}>
          <div className="mx-auto flex max-w-[1440px] items-center gap-4 px-5 py-3.5 sm:px-8">
            <a href="#" className="group flex items-center gap-3" onClick={(e) => e.preventDefault()}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/50 text-gold transition-transform duration-500 group-hover:rotate-90">
                <Lantern size={22} />
              </span>
              <span className="leading-none">
                <span className="block font-display text-[26px] font-extrabold tracking-[0.14em] text-ink">幻燈</span>
                <span className="mt-1 block font-mono text-[9.5px] tracking-[0.5em] text-gold/80">GENTŌ</span>
              </span>
            </a>
            <p className="ml-2 hidden border-l border-line pl-4 font-display text-[13px] leading-snug text-mut md:block">
              テキストを、幻灯のように。<br />
              <span className="text-[11px] text-dim">原稿からデッキを組み立てる幻灯機</span>
            </p>
            <div className="ml-auto flex items-center gap-2.5">
              <span className="hidden rounded-full border border-line bg-panel px-3.5 py-1.5 font-mono text-[10.5px] tracking-[0.14em] text-mut sm:block">10,000 字 → 約10枚</span>
              <span className="flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3.5 py-1.5 font-mono text-[10.5px] tracking-[0.14em] text-mint">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" />BROWSER-ONLY
              </span>
            </div>
          </div>
        </header>

        <main className={`relative z-10 mx-auto grid max-w-[1440px] gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[408px_minmax(0,1fr)] lg:gap-8 ${entered ? "opacity-100" : "opacity-0"} transition-opacity duration-700 delay-150`}>
          <div className="lg:sticky lg:top-6 lg:self-start">
            <InputPanel
              text={text} onText={setText}
              slideCount={slideCount} onSlideCount={setSlideCount}
              themeId={themeId} onThemeId={setThemeId}
              customTitle={customTitle} onCustomTitle={setCustomTitle}
              onGenerate={generate} busy={busy}
            />
          </div>
          <section aria-label="スライドステージ" className="min-w-0">
            {phase === "ready" && analysis ? (
              <DeckViewer
                slides={slides} index={index} onIndex={setIndex}
                theme={theme} onCycleTheme={cycleTheme} highlightTerms={highlightTerms}
                analysis={analysis} onEdit={onEdit} onPresent={() => setPresent(true)}
                toast={showToast} deckTitle={deckTitle}
              />
            ) : phase === "working" ? (
              <GeneratingPanel current={genStep} analysis={analysis} slideCount={slideCount} />
            ) : (
              <EmptyState />
            )}
          </section>
        </main>

        <footer className={`relative z-10 mt-6 border-t border-line transition-all duration-700 delay-300 ${entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-5 sm:px-8">
            <span className="flex items-center gap-2 font-display text-sm font-bold tracking-[0.12em] text-mut">
              <Lantern size={15} className="text-gold" />幻燈 GENTŌ
            </span>
            <span className="font-mono text-[10.5px] tracking-[0.16em] text-dim">
              原稿の解析・採点・配分は、すべてこのブラウザの中で。あなたの文章はどこへも旅立ちません。
            </span>
            <span className="ml-auto font-mono text-[10.5px] tracking-[0.16em] text-dim">MMXXVI — A SLIDE LANTERN FOR YOUR MANUSCRIPTS</span>
          </div>
        </footer>
      </div>

      <div id="print-sheet">
        {slides.map((s, i) => (
          <ScaledSlide key={s.id} width={1122} className="print-slide">
            <SlideFace slide={s} theme={theme} page={i + 1} total={slides.length} highlightTerms={highlightTerms} />
          </ScaledSlide>
        ))}
      </div>

      {present && slides.length > 0 && (
        <GentoPresent slides={slides} start={index} theme={theme} highlightTerms={highlightTerms} onClose={() => setPresent(false)} />
      )}

      {toast && (
        <div key={toast.id} role="status"
          className="toast-in fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full border border-gold/50 bg-page2/95 px-5 py-2.5 font-mono text-xs tracking-wider text-gold shadow-[0_12px_40px_-8px_rgba(228,172,85,0.4)]">
          {toast.msg}
        </div>
      )}
    </>
  );
}
