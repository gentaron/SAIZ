import type { Analysis } from "./analyzer";

export type SlideKind = "title" | "agenda" | "content" | "data" | "quote" | "closing";

export interface SlideItem {
  label: string;
  value?: string;
}
export interface Slide {
  id: string;
  kind: SlideKind;
  kicker?: string;
  title?: string;
  subtitle?: string;
  bullets?: string[];
  items?: SlideItem[];
  quote?: string;
  tags?: string[];
  meta?: string[];
}
export interface Deck {
  title: string;
  createdAt: number;
  slides: Slide[];
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 解析結果から約10枚のデッキを構成する */
export function composeDeck(a: Analysis): Deck {
  const createdAt = Date.now();
  const slides: Slide[] = [];
  let uid = 0;
  const id = (kind: SlideKind) => `sl-${kind}-${(createdAt % 1e7).toString(36)}-${uid++}`;

  const hasAgenda = a.sections.length >= 3;
  const hasData = a.dataPoints.length >= 2;
  const hasQuote = !!a.quote;

  // 本文スライドに回せる枠（全体で12枚以内に収める）
  const extras = 2 + (hasAgenda ? 1 : 0) + (hasData ? 1 : 0) + (hasQuote ? 1 : 0);
  const slots = Math.max(3, 12 - extras);
  const sectionCount = Math.min(a.sections.length, slots);

  // 章を枠の数だけグループ化
  const groups: Analysis["sections"] = [];
  const per = Math.ceil(a.sections.length / sectionCount);
  for (let i = 0; i < a.sections.length; i += per) {
    const part = a.sections.slice(i, i + per);
    groups.push({
      title: part[0].title,
      sentences: part
        .flatMap((p) => p.sentences)
        .slice(0, 4),
    });
  }

  // 1. 表紙
  slides.push({
    id: id("title"),
    kind: "title",
    kicker: "GENTŌ DECK",
    title: a.title,
    subtitle: a.subtitle,
    meta: [fmtDate(createdAt), `${slides.length + 0} SLIDES`, `${a.stats.chars.toLocaleString()}字の原稿より`],
  });

  // 2. 構成
  if (hasAgenda) {
    slides.push({
      id: id("agenda"),
      kind: "agenda",
      kicker: "CONTENTS",
      title: "構成",
      items: groups.map((g) => ({ label: g.title })),
    });
  }

  // 3..n 本文
  groups.forEach((g, i) => {
    slides.push({
      id: id("content"),
      kind: "content",
      kicker: `SECTION ${String(i + 1).padStart(2, "0")}`,
      title: g.title,
      bullets: g.sentences,
    });
  });

  // 数値
  if (hasData) {
    slides.push({
      id: id("data"),
      kind: "data",
      kicker: "FIGURES",
      title: "数字で見る",
      items: a.dataPoints.slice(0, 4).map((d) => ({ value: d.value, label: d.label })),
    });
  }

  // 引用
  if (hasQuote && a.quote) {
    slides.push({
      id: id("quote"),
      kind: "quote",
      kicker: "PASSAGE",
      quote: a.quote,
      subtitle: "— 本文より",
    });
  }

  // まとめ
  slides.push({
    id: id("closing"),
    kind: "closing",
    kicker: "TAKEAWAYS",
    title: "まとめ",
    bullets: a.takeaways,
    tags: a.keywords.slice(0, 6).map((k) => k.term),
    meta: ["幻燈 GENTŌ", fmtDate(createdAt)],
  });

  // 表紙の枚数メタを確定
  slides[0].meta = [
    fmtDate(createdAt),
    `${slides.length} SLIDES`,
    `${a.stats.chars.toLocaleString()}字の原稿より`,
  ];

  return { title: a.title, createdAt, slides };
}
