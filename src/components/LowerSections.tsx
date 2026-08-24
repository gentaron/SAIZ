import Reveal from "./Reveal";
import {
  IconBrace,
  IconDiamond,
  IconFrames,
  IconPlus,
  IconScale,
  IconSplit,
} from "./icons";

const PIPELINE = [
  {
    icon: IconBrace,
    title: "採文",
    desc: "原稿を正規化し、「。！？」を境にひとつひとつの文へ。空行を挟んだ短い単独行は、見出しの候補として印をつけます。",
  },
  {
    icon: IconSplit,
    title: "分章",
    desc: "見出し候補と段落のまとまりから章立てを構築。見出しが無い原稿は、文数のバランスを見て自動的に章へ分割します。",
  },
  {
    icon: IconScale,
    title: "採点",
    desc: "漢字の連なり・カタカナ語・英単語の出現に重みづけし、全文を採点。重要な文・数字・引用を本文中から掘り出します。",
  },
  {
    icon: IconFrames,
    title: "結像",
    desc: "表紙・構成・本文・数字・引用・まとめの順に並べ、約10枚の幻灯として結像。キーワードは本文中で自動強調されます。",
  },
];

const SHORTCUTS: { keys: string[]; desc: string }[] = [
  { keys: ["←", "→"], desc: "スライドを切り替え" },
  { keys: ["Space"], desc: "次へ（プレゼン中）" },
  { keys: ["P"], desc: "プレゼンを開始" },
  { keys: ["Esc"], desc: "プレゼンを終了" },
];

const TIPS = [
  "スライドの文字をクリックすると、その場で編集できます。Enter で確定。",
  "テーマは「紙・墨・藍・苔・霜」の5種類。右上のドットで即切替。",
  "Markdown / JSON への書出と、印刷による PDF 化に対応。",
  "原稿とデッキはブラウザに自動保存。閉じても消えません。",
  "原稿を直して、もう一度「幻灯に灯す」と再生成されます。",
];

const FAQ = [
  {
    q: "どんな文章が向いていますか？",
    a: "見出しつきの説明文・レポート・記事が最もきれいに灯ります。400字以上が目安です。小説や議事録でも動作しますが、章立ては自動分割になります。箇条書きの短い行は「見出し」として扱われる点だけご注意ください。",
  },
  {
    q: "通信は発生しますか？",
    a: "いいえ。解析もスライド生成も、すべてあなたのブラウザの中で完結します。原稿が外部に送信されることは一切なく、オフラインでも生成できます（初回のフォント読込を除く）。",
  },
  {
    q: "生成後のスライドは編集できますか？",
    a: "はい。プレビュー上のタイトルや箇条書きをクリックすると、そのまま直接編集できます。Enter で確定し、編集結果は自動保存されます。「幻灯に灯す」を押すと原稿から再生成されます。",
  },
  {
    q: "文字数の上限は？",
    a: "10,000字です。エディタ上部のメーターが残り文字数を示し、上限に近づくと琥珀色・赤へと変わります。長い原稿は章ごとに分けて生成し、書出後にまとめるのがおすすめです。",
  },
];

export default function LowerSections() {
  return (
    <div className="mx-auto mt-28 w-full max-w-6xl px-5 md:px-8">
      {/* ---------- パイプライン ---------- */}
      <section id="how">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="mb-3 font-mono text-[11px] tracking-[0.42em] text-gold">PIPELINE</div>
              <h2 className="font-display text-3xl font-bold leading-tight text-ink md:text-5xl">
                灯るまでの、<br className="md:hidden" />四つの工程。
              </h2>
            </div>
            <p className="max-w-sm font-body text-[13.5px] leading-7 text-mut">
              幻燈のエンジンは、文章を「文 → 章 → 重み → 像」の順に
              絞り込んでいきます。大規模言語モデルは使いません。
              だから速く、そして原稿は手元から出ません。
            </p>
          </div>
        </Reveal>

        <div className="mt-14">
          {PIPELINE.map((p, i) => (
            <Reveal key={p.title} delay={i * 90}>
              <div className="group grid grid-cols-[70px_1fr] gap-4 md:grid-cols-[110px_1fr] md:gap-8">
                <div className="pb-12 text-right font-mono text-5xl font-semibold leading-none text-gold/15 transition-colors duration-500 group-hover:text-gold/40 md:text-7xl">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="relative border-l border-line pb-12 pl-6 md:pl-10">
                  <span className="absolute -left-[5.5px] top-1.5 h-2.5 w-2.5 rotate-45 bg-gold/70 transition-transform duration-300 group-hover:scale-125 group-hover:bg-gold" />
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-line bg-panel text-gold transition-all duration-300 group-hover:-translate-y-1 group-hover:border-gold/50">
                      <p.icon className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-2xl font-bold text-ink md:text-3xl">{p.title}</h3>
                  </div>
                  <p className="mt-3 max-w-xl font-body text-[13.5px] leading-7 text-mut">{p.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- ショートカット + ヒント ---------- */}
      <section className="mt-8 grid gap-12 md:grid-cols-2 md:gap-16">
        <Reveal>
          <div className="mb-6 font-mono text-[11px] tracking-[0.42em] text-gold">SHORTCUTS</div>
          <h3 className="mb-7 font-display text-2xl font-bold text-ink md:text-3xl">指先の操作。</h3>
          <ul className="space-y-4">
            {SHORTCUTS.map((s) => (
              <li key={s.desc} className="flex items-center justify-between gap-6 border-b border-line pb-4">
                <span className="font-body text-[13.5px] text-mut">{s.desc}</span>
                <span className="flex shrink-0 gap-1.5">
                  {s.keys.map((k) => (
                    <kbd key={k} className="kbd">{k}</kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120}>
          <div className="mb-6 font-mono text-[11px] tracking-[0.42em] text-gold">TIPS</div>
          <h3 className="mb-7 font-display text-2xl font-bold text-ink md:text-3xl">編集のヒント。</h3>
          <ul className="space-y-4">
            {TIPS.map((t) => (
              <li key={t} className="flex items-start gap-3.5 border-b border-line pb-4">
                <IconDiamond className="mt-1.5 h-2.5 w-2.5 shrink-0 text-gold" />
                <span className="font-body text-[13.5px] leading-6 text-mut">{t}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="mt-24">
        <Reveal>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 font-mono text-[11px] tracking-[0.42em] text-gold">QUESTIONS</div>
              <h3 className="font-display text-2xl font-bold text-ink md:text-4xl">よくある問い。</h3>
            </div>
          </div>
        </Reveal>
        <div className="border-t border-line">
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="acc group border-b border-line">
                <summary className="flex items-center justify-between gap-6 py-5 transition-colors hover:bg-panel/50">
                  <span className="font-display text-lg font-bold text-ink transition-colors group-hover:text-gold md:text-xl">
                    {f.q}
                  </span>
                  <IconPlus className="acc-icon h-4 w-4 shrink-0 text-gold" />
                </summary>
                <p className="max-w-2xl pb-6 pl-1 font-body text-[13.5px] leading-7 text-mut">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
