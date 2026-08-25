import type { CSSProperties } from "react";

export interface DeckTheme {
  id: string;
  name: string;      // 和名
  latin: string;     // 英名
  bg: string;
  ink: string;
  sub: string;
  accent: string;
  line: string;
  display: "mincho" | "sans";
  pattern: "dots" | "grid" | "diag" | "glow" | "plain";
}

export const THEMES: DeckTheme[] = [
  {
    id: "kami",
    name: "紙",
    latin: "PAPER",
    bg: "#f6f3ea",
    ink: "#211d15",
    sub: "#746c5c",
    accent: "#bf4327",
    line: "rgba(33,29,21,0.14)",
    display: "mincho",
    pattern: "dots",
  },
  {
    id: "sumi",
    name: "墨",
    latin: "CHARCOAL",
    bg: "#1b1c1f",
    ink: "#ece7da",
    sub: "#8f8b7f",
    accent: "#e4ac55",
    line: "rgba(236,231,218,0.14)",
    display: "mincho",
    pattern: "glow",
  },
  {
    id: "ai",
    name: "藍",
    latin: "INDIGO",
    bg: "#15223d",
    ink: "#e9edf6",
    sub: "#92a0bd",
    accent: "#8fb0e8",
    line: "rgba(233,237,246,0.13)",
    display: "sans",
    pattern: "grid",
  },
  {
    id: "koke",
    name: "苔",
    latin: "MOSS",
    bg: "#1c2a22",
    ink: "#eae6d4",
    sub: "#94a08d",
    accent: "#d8b25c",
    line: "rgba(234,230,212,0.14)",
    display: "mincho",
    pattern: "diag",
  },
  {
    id: "shiro",
    name: "霜",
    latin: "FROST",
    bg: "#f2f4f1",
    ink: "#1d242b",
    sub: "#5d6771",
    accent: "#2e6e8c",
    line: "rgba(29,36,43,0.13)",
    display: "sans",
    pattern: "plain",
  },
];

export const themeById = (id: string): DeckTheme =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];

/** スライドラップに渡す CSS 変数 + 背景パターン */
export function themeVars(t: DeckTheme): CSSProperties {
  const v = {
    "--s-bg": t.bg,
    "--s-ink": t.ink,
    "--s-sub": t.sub,
    "--s-accent": t.accent,
    "--s-line": t.line,
  } as CSSProperties;
  v.background = t.bg;
  v.color = t.ink;
  switch (t.pattern) {
    case "dots":
      v.backgroundImage = `radial-gradient(${t.line} 1.1px, transparent 1.1px)`;
      v.backgroundSize = "26px 26px";
      break;
    case "grid":
      v.backgroundImage = `linear-gradient(${t.line} 1px, transparent 1px), linear-gradient(90deg, ${t.line} 1px, transparent 1px)`;
      v.backgroundSize = "48px 48px";
      break;
    case "diag":
      v.backgroundImage = `repeating-linear-gradient(45deg, ${t.line} 0 1px, transparent 1px 18px)`;
      break;
    case "glow":
      v.backgroundImage = `radial-gradient(75% 90% at 85% 8%, ${t.accent}1f, transparent 60%)`;
      break;
    case "plain":
      v.backgroundImage = `linear-gradient(180deg, transparent 60%, ${t.line})`;
      break;
  }
  return v;
}

export const slideFont = (t: DeckTheme): string =>
  t.display === "mincho"
    ? "'Shippori Mincho', 'Hiragino Mincho ProN', serif"
    : "'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', sans-serif";
