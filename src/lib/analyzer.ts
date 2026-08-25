/* ------------------------------------------------------------------
 * 幻燈 GENTŌ — 文章解析エンジン
 * テキスト → 文 → 章 → キーワード重み付け → 重要文採点 → 数値/引用抽出
 * ------------------------------------------------------------------ */

export interface Keyword {
  term: string;
  score: number;
}
export interface Section {
  title: string;
  sentences: string[];
}
export interface DataPoint {
  value: string; // 表示用 (例: "約35%")
  label: string;
}
export interface AnalysisStats {
  chars: number;
  sentences: number;
  sections: number;
  keywords: number;
  ms: number;
}
export interface Analysis {
  title: string;
  subtitle: string;
  sections: Section[];
  keywords: Keyword[];
  dataPoints: DataPoint[];
  quote: string | null;
  takeaways: string[];
  stats: AnalysisStats;
}

/* ---------------- 停止語 ---------------- */
const KANA_STOP = new Set([
  "パーセント", "ポイント", "ケース", "タイプ", "スタイル", "レベル", "ベース",
  "もの", "こと", "ため", "よう", "など", "わけ", "はず", "ほど", "だけ", "まで",
  "から", "より", "および", "または", "について", "として", "による", "そして",
  "しかし", "さらに", "つまり", "たとえば", "例えば", "一方", "これ", "それ",
  "この", "その", "ある", "いる", "する", "なる", "できる", "ない", "とき",
  "ところ", "すべて", "こちら", "それぞれ", "さまざま", "とおり",
]);
const ALPHA_STOP = new Set([
  "the", "and", "for", "with", "this", "that", "from", "are", "was", "were",
  "have", "has", "had", "not", "you", "all", "can", "will", "its", "into",
  "about", "there", "their", "which", "when", "what", "your", "been", "more",
  "also", "than", "then", "them", "these", "those", "some", "such", "only",
  "other", "very", "just", "over", "under", "after", "before", "between",
  "because", "while", "during", "http", "https", "www", "com", "org", "net",
  "co", "jp", "it", "of", "to", "in", "on", "by", "an", "as", "be", "or",
]);
const CONJ_START = /^(しかし|また|そして|だが|つまり|なお|さらに|すなわち|たとえば|例えば|一方|ただし|ただ|なぜなら|したがって|ところで|さて)/;

const KATA_RE = /[ァ-ヶー]{2,}/g;
const KANJI_RE = /[\u4E00-\u9FFF]{2,}/g;
const ALPHA_RE = /[A-Za-z][A-Za-z0-9&\-']{1,}/g;
const SENT_SPLIT_RE = /[^。！？!?]+[。！？!?]?/g;
const HEADING_STRIP_RE = /^(\s*[#＃]+\s*|[■●◆▼▲☆★]\s*|(?:第[0-9一二三四五六七八九十]+[章節部回]\s*)|(?:[0-9]{1,2}[.、．]\s*))/;

function isHeadingLine(raw: string): boolean {
  const line = raw.trim();
  if (line.length < 2 || line.length > 30) return false;
  if (/[。、,.!?！？;；)）」』】]$/.test(line)) return false;
  if (CONJ_START.test(line)) return false;
  if (!/[一-龠ァ-ヶA-Za-z0-9]/.test(line)) return false;
  return true;
}

function splitSentences(line: string): string[] {
  const parts = line.match(SENT_SPLIT_RE) ?? [];
  const out: string[] = [];
  for (const p of parts) {
    const s = p.trim();
    if (!s) continue;
    if (s.length < 6 && !/[。！？!?]$/.test(s) && out.length > 0) {
      out[out.length - 1] += s;
      continue;
    }
    out.push(s);
  }
  return out;
}

/* ---------------- キーワード抽出 ---------------- */
function extractKeywords(
  sentences: string[],
  headingTerms: string[],
): Keyword[] {
  const freq = new Map<string, { display: string; weight: number }>();
  const bump = (key: string, display: string, w: number) => {
    const cur = freq.get(key);
    if (cur) cur.weight += w;
    else freq.set(key, { display, weight: w });
  };
  const feed = (text: string, w: number) => {
    for (const m of text.matchAll(KATA_RE)) {
      if (!KANA_STOP.has(m[0])) bump(m[0], m[0], w);
    }
    for (const m of text.matchAll(KANJI_RE)) {
      const run = m[0];
      if (run.length <= 4) bump(run, run, w);
      else {
        bump(run, run, w * 0.9);
        for (let n = 2; n <= 4; n++)
          for (let i = 0; i + n <= run.length; i++)
            bump(run.slice(i, i + n), run.slice(i, i + n), w * 0.55);
      }
    }
    for (const m of text.matchAll(ALPHA_RE)) {
      const low = m[0].toLowerCase();
      if (ALPHA_STOP.has(low) || low.length < 2) continue;
      bump(low, m[0], w);
    }
  };

  sentences.forEach((s, i) => feed(s, i < 3 ? 1.5 : 1));
  headingTerms.forEach((h) => feed(h, 3.2));

  const scored: Keyword[] = [];
  for (const { display, weight } of freq.values()) {
    const len = display.length;
    scored.push({ term: display, score: weight * (1 + 0.18 * Math.max(0, len - 2)) });
  }
  scored.sort((a, b) => b.score - a.score);

  // 部分文字列の重複を整理（上位語を優先）
  const kept: Keyword[] = [];
  for (const c of scored) {
    if (c.score < 2) break;
    const clash = kept.find(
      (k) => k.term !== c.term && (k.term.includes(c.term) || c.term.includes(k.term)),
    );
    if (clash) {
      if (c.term.length >= clash.term.length) continue;
      if (c.score < clash.score * 1.7) continue;
    }
    kept.push(c);
    if (kept.length >= 12) break;
  }
  return kept;
}

/* ---------------- 文の採点 ---------------- */
function scoreSentence(s: string, kws: Keyword[], first: boolean): number {
  let base = 0;
  for (const k of kws) if (s.includes(k.term)) base += Math.min(k.score, 14);
  let score = base / Math.pow(Math.max(s.length, 8), 0.5);
  if (first) score *= 1.3;
  if (s.length >= 24 && s.length <= 82) score *= 1.18;
  return score;
}

function overlapRatio(a: string, b: string): number {
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  if (s.length === 0) return 0;
  let common = 0;
  const lc = l.split("");
  for (const ch of s.split("")) if (lc.includes(ch)) common++;
  return common / s.length;
}

function trimSentence(s: string, max = 64): string {
  let t = s.replace(/^(しかし|また|そして|だが|つまり|なお|さらに|すなわち|たとえば|例えば|一方|ただし|ただ)、/, "");
  t = t.trim();
  if (t.length <= max) return t.replace(/。$/, "");
  const cut = t.lastIndexOf("。", max - 1);
  if (cut >= 30) return t.slice(0, cut);
  return t.slice(0, max - 1) + "…";
}

/* ---------------- 数値の抽出 ---------------- */
const NUM_RE =
  /([約およそ]+)?(\d[\d,]*(?:\.\d+)?)\s*(%|％|倍|兆円|億円|万円|円|億ドル|万ドル|ドル|ユーロ|万人|億人|万匹|万羽|万台|万個|万社|万店|人|社|台|個|機|基|本|店|km|万km|メートル|万トン|トン|kg|グラム|年|カ月|ヶ月|時間)/g;

function extractDataPoints(sentences: string[]): DataPoint[] {
  const out: DataPoint[] = [];
  const seen = new Set<string>();
  for (const s of sentences) {
    for (const m of s.matchAll(NUM_RE)) {
      const prefix = m[1] ?? "";
      const num = m[2];
      const unit = m[3];
      if (unit === "年" && /^\d{4}$/.test(num) && +num >= 1900 && +num <= 2099) continue;
      const key = num + unit;
      if (seen.has(key)) continue;
      seen.add(key);
      const before = s.slice(0, m.index ?? 0).replace(/[（(][^）)]*$/, "");
      let label = before.slice(-16).replace(/^[^一-龠ァ-ヶA-Za-z0-9]+/, "");
      if (!label || label.length < 3) {
        label = s.replace(NUM_RE, "").replace(/[。、]/g, "").slice(0, 14);
      }
      if (!label) continue;
      out.push({ value: `${prefix}${num}${unit}`, label: label.slice(-16) });
      if (out.length >= 6) return out;
    }
  }
  return out;
}

/* ---------------- 章立て ---------------- */
function chunkSentences(all: string[], target: number): string[][] {
  const chunks: string[][] = Array.from({ length: target }, () => []);
  all.forEach((s, i) => chunks[Math.floor((i * target) / all.length)].push(s));
  return chunks.filter((c) => c.length > 0);
}

function titleFromKeywords(sentences: string[], kws: Keyword[]): string {
  const hits = kws
    .map((k) => ({ k, n: sentences.filter((s) => s.includes(k.term)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n * b.k.score - a.n * a.k.score);
  if (hits.length === 0) return "ポイント";
  if (hits.length === 1) return hits[0].k.term;
  return `${hits[0].k.term}と${hits[1].k.term}`;
}

/* ---------------- 本体 ---------------- */
export function analyze(text: string): Analysis {
  const t0 = performance.now();
  const normalized = text.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ");
  const lines = normalized.split("\n").map((l) => l.trim());

  // 1) 見出し検出 & 文分割
  const headings: string[] = [];
  const headSections: { title: string; sentences: string[] }[] = [];
  const allSentences: string[] = [];
  let current: { title: string; sentences: string[] } | null = null;

  for (const line of lines) {
    if (!line) continue;
    if (isHeadingLine(line)) {
      const title = line.replace(HEADING_STRIP_RE, "").trim();
      headings.push(title);
      current = { title, sentences: [] };
      headSections.push(current);
      continue;
    }
    const sents = splitSentences(line);
    allSentences.push(...sents);
    if (!current) {
      current = { title: "", sentences: [] };
      headSections.push(current);
    }
    current.sentences.push(...sents);
  }

  // 2) キーワード（見出し語は重み付け済み）
  const keywords = extractKeywords(allSentences, headings);

  // 3) 章の確定
  let sections: Section[] = [];
  const withContent = headSections.filter((s) => s.sentences.length > 0 || s.title);
  const realHeadings = withContent.filter((s) => s.title).length;

  if (realHeadings >= 2) {
    for (const s of withContent) {
      const body = s.sentences.join("").length;
      const last = sections[sections.length - 1];
      if (last && (s.sentences.length === 0 || (body < 70 && s.sentences.length <= 1 && !s.title))) {
        last.sentences.push(...s.sentences);
      } else if (s.sentences.length > 0 || s.title) {
        sections.push({ title: s.title, sentences: [...s.sentences] });
      }
    }
    sections = sections.filter((s) => s.sentences.length > 0);
  }

  if (sections.length < 2) {
    const target = Math.max(3, Math.min(6, Math.round(allSentences.length / 6)));
    sections = chunkSentences(allSentences, target).map((c) => ({
      title: "",
      sentences: c,
    }));
  }

  // タイトルが無い章は見出し語から生成
  sections = sections.map((s) =>
    s.title ? s : { ...s, title: titleFromKeywords(s.sentences, keywords) },
  );

  // 章が多すぎるときは統合（6章を目安に）
  if (sections.length > 7) {
    const groups: Section[] = [];
    const per = Math.ceil(sections.length / 6);
    for (let i = 0; i < sections.length; i += per) {
      const part = sections.slice(i, i + per);
      groups.push({
        title: part[0].title,
        sentences: part.flatMap((p) => p.sentences),
      });
    }
    sections = groups;
  }

  // 4) 重要文の採点
  const scoredBySection = sections.map((sec, si) =>
    sec.sentences
      .map((s, i) => ({ s, score: scoreSentence(s, keywords, i === 0) + (si === 0 ? 0.4 : 0) }))
      .sort((a, b) => b.score - a.score),
  );

  // まとめ用：全体の上位文
  const flat = scoredBySection
    .flatMap((arr) => arr)
    .sort((a, b) => b.score - a.score);
  const takeaways: string[] = [];
  for (const c of flat) {
    if (takeaways.length >= 3) break;
    if (takeaways.some((t) => overlapRatio(t, c.s) > 0.62)) continue;
    takeaways.push(trimSentence(c.s, 58));
  }

  // 5) 章ごとの箇条書き（重複排除・章内順）
  sections.forEach((sec, si) => {
    const picked: string[] = [];
    const order = sec.sentences;
    const ranked = scoredBySection[si];
    for (const c of ranked) {
      if (picked.length >= 4) break;
      if (picked.some((p) => overlapRatio(p, c.s) > 0.66)) continue;
      picked.push(c.s);
    }
    picked.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    sec.sentences = picked.map((s) => trimSentence(s));
  });

  // 6) 数値・引用
  const dataPoints = extractDataPoints(allSentences);
  let quote: string | null = null;
  const quoted = flat.filter((c) => c.s.includes("「") && c.s.includes("」"));
  const qSrc =
    quoted.length > 0
      ? quoted[0]
      : flat.find(
          (c) =>
            c.s.length >= 32 &&
            c.s.length <= 92 &&
            !takeaways.includes(trimSentence(c.s, 58)),
        );
  if (qSrc) {
    quote = qSrc.s.replace(/。$/, "");
    if (!quote.startsWith("「")) quote = `「${quote}」`;
  }

  // 7) タイトル・サブタイトル
  const docTitle = headings[0] ?? "";
  const title =
    docTitle ||
    (keywords.length >= 2
      ? `${keywords[0].term}と${keywords[1].term}`
      : keywords[0]?.term ?? "無題の原稿");
  const subtitle =
    headings[1] ??
    (flat[0] ? trimSentence(flat[0].s, 42) : `${title}の要点を、数枚の幻灯に。`);

  return {
    title,
    subtitle,
    sections,
    keywords,
    dataPoints,
    quote,
    takeaways,
    stats: {
      chars: text.length,
      sentences: allSentences.length,
      sections: sections.length,
      keywords: keywords.length,
      ms: Math.max(1, Math.round(performance.now() - t0)),
    },
  };
}
