import type { Deck, Slide } from "./deck";

function slideToMarkdown(s: Slide, index: number): string {
  const head = `<!-- ${String(index + 1).padStart(2, "0")} / ${s.kind} -->`;
  switch (s.kind) {
    case "title":
      return `${head}\n# ${s.title ?? ""}\n\n> ${s.subtitle ?? ""}\n\n_${(s.meta ?? []).join(" ・ ")}_`;
    case "agenda":
      return `${head}\n## ${s.title ?? "構成"}\n\n${(s.items ?? []).map((it, i) => `${i + 1}. ${it.label}`).join("\n")}`;
    case "content":
      return `${head}\n## ${s.title ?? ""}\n\n${(s.bullets ?? []).map((b) => `- ${b}`).join("\n")}`;
    case "data":
      return `${head}\n## ${s.title ?? "数字で見る"}\n\n${(s.items ?? []).map((it) => `- **${it.value ?? ""}** — ${it.label}`).join("\n")}`;
    case "quote":
      return `${head}\n> ${s.quote ?? ""}\n\n_${s.subtitle ?? "— 本文より"}_`;
    case "closing": {
      const tags = (s.tags ?? []).map((t) => `\`${t}\``).join(" ");
      return `${head}\n## ${s.title ?? "まとめ"}\n\n${(s.bullets ?? []).map((b, i) => `${i + 1}. ${b}`).join("\n")}\n\n${tags}`;
    }
  }
}

export function deckToMarkdown(deck: Deck, themeName: string): string {
  const body = deck.slides.map((s, i) => slideToMarkdown(s, i)).join("\n\n---\n\n");
  return `# ${deck.title}\n\n_幻燈 GENTŌ で生成 ・ テーマ「${themeName}」 ・ ${deck.slides.length}枚_\n\n---\n\n${body}\n`;
}

export function deckToJson(deck: Deck): string {
  return JSON.stringify(deck, null, 2);
}

function slug(title: string): string {
  const s = title.replace(/[^0-9A-Za-zぁ-んァ-ヶ一-龠]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s.slice(0, 24) || "deck";
}

export function deckBaseName(deck: Deck): string {
  const d = new Date(deck.createdAt);
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `gento-${slug(deck.title)}-${ymd}`;
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}
