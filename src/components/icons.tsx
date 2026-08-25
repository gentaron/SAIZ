import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  ...p,
});

/** 幻燈のマーク：光圈（絞り）と灯 */
export const LanternMark = (p: P) => (
  <svg viewBox="0 0 32 32" fill="none" {...p}>
    <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeWidth="2.1" />
    <circle cx="16" cy="16" r="4.6" fill="currentColor" />
    <path d="M16 2.5v6M16 23.5v6M2.5 16h6M23.5 16h6" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    <path d="M6.6 6.6l3.2 3.2M22.2 22.2l3.2 3.2M25.4 6.6l-3.2 3.2M9.8 22.2l-3.2 3.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
  </svg>
);

export const IconChevronL = (p: P) => (
  <svg {...base(p)}><path d="M14.5 5 8 12l6.5 7" /></svg>
);
export const IconChevronR = (p: P) => (
  <svg {...base(p)}><path d="M9.5 5 16 12l-6.5 7" /></svg>
);
export const IconPlay = (p: P) => (
  <svg {...base(p)}><path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" /></svg>
);
export const IconClose = (p: P) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)}><path d="M4.5 12.5 10 18 19.5 6.5" /></svg>
);
export const IconDownload = (p: P) => (
  <svg {...base(p)}><path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" /></svg>
);
export const IconPrinter = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 8V4h10v4M7 17H4.5V10h15v7H17" />
    <rect x="7" y="14" width="10" height="6" />
  </svg>
);
export const IconPlus = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconEdit = (p: P) => (
  <svg {...base(p)}><path d="M14.5 5.5 18.5 9.5 8.5 19.5H4.5v-4zM12.5 7.5l4 4" /></svg>
);
export const IconDoc = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 3.5h7l4 4v13H7z" />
    <path d="M14 3.5v4h4M9.5 12h5M9.5 15.5h5" />
  </svg>
);
export const IconBrace = (p: P) => (
  <svg {...base(p)}><path d="M8 4c-2 0-2.5 1-2.5 2.5v3C5.5 11 4.5 12 3.5 12c1 0 2 1 2 2.5v3C5.5 19 6 20 8 20M16 4c2 0 2.5 1 2.5 2.5v3c0 1.5 1 2.5 2 2.5-1 0-2 1-2 2.5v3c0 1.5-.5 2.5-2.5 2.5" /></svg>
);
export const IconSplit = (p: P) => (
  <svg {...base(p)}><path d="M4 6h16M4 12h9M4 18h13" /><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" /></svg>
);
export const IconScale = (p: P) => (
  <svg {...base(p)}><path d="M12 4v16M6 20h12M12 4 5 8m7-4 7 4" /><path d="M2.8 13.5 5 8l2.2 5.5a2.6 2.6 0 0 1-4.4 0zM16.8 13.5 19 8l2.2 5.5a2.6 2.6 0 0 1-4.4 0z" /></svg>
);
export const IconFrames = (p: P) => (
  <svg {...base(p)}><rect x="3.5" y="5" width="13" height="9.5" rx="0.5" /><path d="M7.5 18.5h13V9" /><path d="M6.5 8.5h7M6.5 11h4.5" /></svg>
);
export const IconArrowDown = (p: P) => (
  <svg {...base(p)}><path d="M12 4v16m0 0 6-6m-6 6-6-6" /></svg>
);
export const IconDiamond = (p: P) => (
  <svg {...base(p)} viewBox="0 0 12 12"><rect x="2.4" y="2.4" width="7.2" height="7.2" transform="rotate(45 6 6)" fill="currentColor" stroke="none" /></svg>
);
