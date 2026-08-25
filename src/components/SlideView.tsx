import type { CSSProperties, ElementType, FocusEvent, KeyboardEvent, ReactNode } from "react";
import type { Slide } from "../lib/deck";
import type { DeckTheme } from "../lib/themes";
import { slideFont, themeVars } from "../lib/themes";

/* ---------- キーワード強調 ---------- */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length || !text) return <>{text}</>;
  const esc = terms
    .slice(0, 6)
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${esc.join("|")})`, "g"));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <em key={i} style={{ color: "var(--s-accent)", fontStyle: "normal", fontWeight: 700 }}>
            {part}
          </em>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/* ---------- そのまま編集できるテキスト ---------- */
function Editable({
  as = "div",
  value,
  terms = [],
  onCommit,
  style,
  className = "",
}: {
  as?: ElementType;
  value: string;
  terms?: string[];
  onCommit: (text: string) => void;
  style?: CSSProperties;
  className?: string;
}) {
  const Tag = as as ElementType;
  const handleBlur = (e: FocusEvent<HTMLElement>) => {
    onCommit((e.currentTarget.textContent ?? "").replace(/\n+/g, " ").trim());
  };
  const handleKey = (e: KeyboardEvent<HTMLElement>) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };
  return (
    <Tag
      className={`editable ${className}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onBlur={handleBlur}
      onKeyDown={handleKey}
    >
      <Highlight text={value} terms={terms} />
    </Tag>
  );
}

const Txt = ({ text, terms }: { text: string; terms: string[] }) => (
  <Highlight text={text} terms={terms} />
);

const Aperture = ({ style }: { style?: CSSProperties }) => (
  <svg viewBox="0 0 100 100" fill="none" style={style} className="spin-slow">
    <circle cx="50" cy="50" r="46" stroke="var(--s-accent)" strokeWidth="1.6" />
    <circle cx="50" cy="50" r="30" stroke="var(--s-accent)" strokeWidth="1" opacity="0.7" />
    <circle cx="50" cy="50" r="13" stroke="var(--s-accent)" strokeWidth="1" opacity="0.5" />
    <path d="M50 4v14M50 82v14M4 50h14M82 50h14" stroke="var(--s-accent)" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M17.5 17.5 27 27M73 73l9.5 9.5M82.5 17.5 73 27M27 73l-9.5 9.5" stroke="var(--s-accent)" strokeWidth="0.9" opacity="0.55" strokeLinecap="round" />
  </svg>
);

export interface SlideViewProps {
  slide: Slide;
  theme: DeckTheme;
  index: number;
  total: number;
  deckTitle: string;
  terms?: string[];
  editable?: boolean;
  onEditTitle?: (text: string) => void;
  onEditBullet?: (i: number, text: string) => void;
  animate?: boolean;
}

export default function SlideView({
  slide,
  theme,
  index,
  total,
  deckTitle,
  terms = [],
  editable = false,
  onEditTitle,
  onEditBullet,
  animate = false,
}: SlideViewProps) {
  const style: CSSProperties = {
    ...themeVars(theme),
    fontFamily: slideFont(theme),
    containerType: "inline-size",
  };
  const mono = "'IBM Plex Mono', monospace";
  const display = slideFont(theme);

  const renderTitle = (text: string, size: string, weight = 700) =>
    editable && onEditTitle ? (
      <Editable value={text} terms={terms} onCommit={onEditTitle} style={{ fontSize: size, fontWeight: weight, lineHeight: 1.22 }} />
    ) : (
      <div style={{ fontSize: size, fontWeight: weight, lineHeight: 1.22 }}>
        <Txt text={text} terms={terms} />
      </div>
    );

  const bullet = (text: string, i: number, size = "2.55cqi") => {
    const row = (node: ReactNode) => (
      <li key={i} className="flex items-start" style={{ gap: "1.9cqi" }}>
        <span
          className="shrink-0"
          style={{
            width: "0.95cqi",
            height: "0.95cqi",
            background: "var(--s-accent)",
            transform: "rotate(45deg) translateY(1.55cqi)",
          }}
        />
        <div style={{ fontSize: size, lineHeight: 1.72, fontWeight: 500 }}>{node}</div>
      </li>
    );
    if (editable && onEditBullet) {
      return row(
        <Editable
          as="div"
          value={text}
          terms={terms}
          onCommit={(t) => onEditBullet(i, t)}
          style={{ fontSize: size, lineHeight: 1.72, fontWeight: 500, minWidth: "20cqi" }}
        />,
      );
    }
    return row(<Txt text={text} terms={terms} />);
  };

  let body: ReactNode = null;
  switch (slide.kind) {
    case "title":
      body = (
        <div className="relative flex h-full flex-col justify-between">
          <Aperture style={{ position: "absolute", right: "-4cqi", top: "50%", transform: "translateY(-50%)", width: "46cqi", height: "46cqi", opacity: 0.4 }} />
          <div className="relative" style={{ fontSize: "1.65cqi", fontFamily: mono, letterSpacing: "0.42em", color: "var(--s-accent)", fontWeight: 600 }}>
            {slide.kicker}
          </div>
          <div className="relative" style={{ maxWidth: "82%" }}>
            <div style={{ width: "7.5cqi", height: "0.72cqi", background: "var(--s-accent)", marginBottom: "2.6cqi" }} />
            {renderTitle(slide.title ?? "", "7.6cqi", 700)}
            <div style={{ fontSize: "2.85cqi", color: "var(--s-sub)", marginTop: "2.2cqi", lineHeight: 1.6, maxWidth: "92%" }}>
              {slide.subtitle}
            </div>
          </div>
          <div className="relative flex" style={{ gap: "2.4cqi", fontSize: "1.7cqi", fontFamily: mono, color: "var(--s-sub)", letterSpacing: "0.08em" }}>
            {(slide.meta ?? []).map((m, i) => (
              <span key={i} className="flex items-center" style={{ gap: "2.4cqi" }}>
                {i > 0 && <span style={{ width: "0.5cqi", height: "0.5cqi", background: "var(--s-accent)", transform: "rotate(45deg)", display: "inline-block" }} />}
                {m}
              </span>
            ))}
          </div>
        </div>
      );
      break;

    case "agenda":
      body = (
        <div className="flex h-full flex-col">
          <div style={{ fontSize: "1.65cqi", fontFamily: mono, letterSpacing: "0.42em", color: "var(--s-accent)", fontWeight: 600 }}>{slide.kicker}</div>
          <div style={{ marginTop: "1.8cqi" }}>{renderTitle(slide.title ?? "構成", "5cqi")}</div>
          <div className="flex flex-1 flex-col justify-evenly" style={{ marginTop: "3cqi" }}>
            {(slide.items ?? []).map((it, i) => (
              <div key={i} className="flex items-baseline" style={{ gap: "2.8cqi", borderBottom: "1px solid var(--s-line)", paddingBottom: "1.5cqi" }}>
                <span style={{ fontFamily: mono, fontSize: "2.5cqi", color: "var(--s-accent)", fontWeight: 600, minWidth: "6.5cqi" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontSize: "2.95cqi", fontWeight: 600, letterSpacing: "0.02em" }}>
                  <Txt text={it.label} terms={terms} />
                </span>
              </div>
            ))}
          </div>
        </div>
      );
      break;

    case "content":
      body = (
        <div className="flex h-full flex-col">
          <div style={{ fontSize: "1.65cqi", fontFamily: mono, letterSpacing: "0.42em", color: "var(--s-accent)", fontWeight: 600 }}>{slide.kicker}</div>
          <div style={{ marginTop: "1.8cqi", marginBottom: "3.2cqi", maxWidth: "88%" }}>{renderTitle(slide.title ?? "", "5cqi")}</div>
          <ul className="flex flex-col" style={{ gap: "2.5cqi" }}>
            {(slide.bullets ?? []).map((b, i) => bullet(b, i))}
          </ul>
        </div>
      );
      break;

    case "data":
      body = (
        <div className="flex h-full flex-col">
          <div style={{ fontSize: "1.65cqi", fontFamily: mono, letterSpacing: "0.42em", color: "var(--s-accent)", fontWeight: 600 }}>{slide.kicker}</div>
          <div style={{ marginTop: "1.8cqi" }}>{renderTitle(slide.title ?? "数字で見る", "5cqi")}</div>
          <div className="grid grid-cols-2" style={{ gap: "3.6cqi 6cqi", marginTop: "4.4cqi" }}>
            {(slide.items ?? []).map((it, i) => (
              <div key={i} style={{ borderLeft: "0.45cqi solid var(--s-accent)", paddingLeft: "2.6cqi" }}>
                <div style={{ fontSize: "6.2cqi", fontWeight: 700, fontFamily: display, letterSpacing: "-0.02em", color: "var(--s-ink)", lineHeight: 1.1 }}>
                  {it.value}
                </div>
                <div style={{ fontSize: "2.15cqi", color: "var(--s-sub)", marginTop: "0.9cqi", lineHeight: 1.5 }}>
                  <Txt text={it.label} terms={terms} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      break;

    case "quote":
      body = (
        <div className="flex h-full flex-col justify-center">
          <div style={{ fontFamily: display, fontSize: "9cqi", lineHeight: 0.6, color: "var(--s-accent)", fontWeight: 700 }}>「</div>
          <div style={{ fontSize: "4.1cqi", fontWeight: 600, lineHeight: 1.66, marginTop: "2.4cqi", maxWidth: "88%" }}>
            <Txt text={slide.quote ?? ""} terms={terms} />
          </div>
          <div style={{ fontSize: "1.8cqi", fontFamily: mono, color: "var(--s-sub)", letterSpacing: "0.3em", marginTop: "3.4cqi" }}>
            {slide.subtitle}
          </div>
        </div>
      );
      break;

    case "closing":
      body = (
        <div className="flex h-full flex-col">
          <div style={{ fontSize: "1.65cqi", fontFamily: mono, letterSpacing: "0.42em", color: "var(--s-accent)", fontWeight: 600 }}>{slide.kicker}</div>
          <div style={{ marginTop: "1.8cqi", marginBottom: "3cqi" }}>{renderTitle(slide.title ?? "まとめ", "5cqi")}</div>
          <ol className="flex flex-col" style={{ gap: "2.2cqi" }}>
            {(slide.bullets ?? []).map((b, i) => (
              <li key={i} className="flex items-baseline" style={{ gap: "2.4cqi" }}>
                <span style={{ fontFamily: mono, fontSize: "2.3cqi", color: "var(--s-accent)", fontWeight: 600, minWidth: "5.5cqi" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ fontSize: "2.6cqi", lineHeight: 1.65, fontWeight: 500, borderBottom: "1px solid var(--s-line)", paddingBottom: "1.4cqi", flex: 1 }}>
                  <Txt text={b} terms={terms} />
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center" style={{ gap: "1.2cqi", marginTop: "auto" }}>
            {(slide.tags ?? []).map((t) => (
              <span key={t} style={{ border: "1px solid var(--s-line)", borderRadius: "99px", padding: "0.75cqi 1.9cqi", fontFamily: mono, fontSize: "1.75cqi", color: "var(--s-sub)", letterSpacing: "0.06em" }}>
                #{t}
              </span>
            ))}
          </div>
        </div>
      );
      break;
  }

  return (
    <div
      className={`relative aspect-[16/9] w-full overflow-hidden ${animate ? "slide-swap" : ""}`}
      style={{ ...style, padding: "5.4cqi 6cqi 4.6cqi" }}
    >
      {body}
      {/* フッター */}
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-between"
        style={{ padding: "1.6cqi 6cqi", borderTop: "1px solid var(--s-line)", fontSize: "1.5cqi", fontFamily: mono, color: "var(--s-sub)", letterSpacing: "0.14em" }}
      >
        <span className="truncate" style={{ maxWidth: "60%" }}>{deckTitle}</span>
        <span style={{ color: "var(--s-accent)", fontWeight: 600 }}>
          {String(index + 1).padStart(2, "0")} <span style={{ color: "var(--s-sub)", fontWeight: 400 }}>/ {String(total).padStart(2, "0")}</span>
        </span>
      </div>
    </div>
  );
}
