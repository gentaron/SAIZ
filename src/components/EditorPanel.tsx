import type { Sample } from "../lib/samples";
import { SAMPLES } from "../lib/samples";
import { LanternMark } from "./icons";

export const CHAR_LIMIT = 10000;

export default function EditorPanel({
  text,
  onChange,
  onGenerate,
  running,
  onSample,
  shake,
}: {
  text: string;
  onChange: (t: string) => void;
  onGenerate: () => void;
  running: boolean;
  onSample: (s: Sample) => void;
  shake: boolean;
}) {
  const len = text.length;
  const pct = Math.min(100, (len / CHAR_LIMIT) * 100);
  const meterColor = pct > 95 ? "bg-verm" : pct > 80 ? "bg-gold" : "bg-mint";
  const counterColor = pct > 95 ? "text-verm" : pct > 80 ? "text-gold" : "text-mut";

  return (
    <section className="flex h-full flex-col rounded-md border border-line bg-panel/80 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-lg font-bold tracking-wide text-ink">原稿</h2>
          <span className="font-mono text-[10px] tracking-[0.3em] text-dim">MANUSCRIPT</span>
        </div>
        <span className={`font-mono text-xs tabular-nums transition-colors ${counterColor}`}>
          {len.toLocaleString()} <span className="text-dim">/ {CHAR_LIMIT.toLocaleString()}</span>
        </span>
      </div>

      {/* 文字数メーター */}
      <div className="h-[3px] w-full bg-white/5">
        <div
          className={`h-full ${meterColor} transition-[width,background-color] duration-300 ${running ? "bar-busy" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* テキストエリア */}
      <div className={`relative flex-1 p-3 ${shake ? "shake-x" : ""}`}>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value.slice(0, CHAR_LIMIT))}
          maxLength={CHAR_LIMIT}
          spellCheck={false}
          placeholder={
            "ここに本文を貼りつけてください。\n\n・空行を挟んだ短い行は「見出し（章）」として認識されます\n・10,000字まで。箇条書き・レポート・記事など何でも\n・まずは下のサンプルで灯してみるのもおすすめです"
          }
          className="h-full min-h-[340px] w-full resize-none rounded-sm border border-line bg-page2/70 p-4 font-body text-[14.5px] leading-7 text-ink placeholder:text-dim focus:border-line2 lg:min-h-0"
        />
      </div>

      {/* フッター */}
      <div className="border-t border-line p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] tracking-[0.22em] text-dim">サンプル原稿</span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSample(s)}
                className="rounded-full border border-line px-3 py-1 font-body text-xs font-medium text-mut transition-all duration-200 hover:-translate-y-px hover:border-gold/60 hover:text-gold"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={running || len === 0}
          className="group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-sm bg-gold font-display text-xl font-bold tracking-[0.18em] text-[#221708] shadow-[0_14px_34px_-14px_rgba(228,172,85,0.65)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f0bf70] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <LanternMark className={`h-6 w-6 ${running ? "spin-slow" : "transition-transform duration-500 group-hover:rotate-90"}`} />
          {running ? "灯しています" : "幻灯に灯す"}
          <span className="absolute right-4 font-mono text-[10px] font-medium tracking-[0.14em] opacity-70">
            {running ? "ANALYZING…" : "約10枚 ・ 数秒"}
          </span>
        </button>
        <p className="mt-2.5 text-center font-mono text-[10px] tracking-[0.1em] text-dim">
          見出し行は「章」として認識 ・ すべてブラウザ内で処理
        </p>
      </div>
    </section>
  );
}
