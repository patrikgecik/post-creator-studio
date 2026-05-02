import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_DATA,
  DEFAULT_THEME,
  FORMATS,
  TEMPLATES,
  renderPost,
  type FormatKey,
  type PostData,
  type TemplateKey,
  type Theme,
} from "@/lib/canvas-render";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Post Editor — Instagram Creator" },
      { name: "description", content: "Generuj krásne Instagram posty s prispôsobiteľnými šablónami a formátmi." },
    ],
  }),
  component: Editor,
});

const TEMPLATE_KEYS: TemplateKey[] = ["announcement", "benefits", "quote", "numbers"];

function Editor() {
  const [format, setFormat] = useState<FormatKey>("square");
  const [template, setTemplate] = useState<TemplateKey>("announcement");
  const [data, setData] = useState<PostData>(DEFAULT_DATA);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fm = FORMATS[format];

  // Re-render whenever inputs change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = fm.w;
    canvas.height = fm.h;
    const run = () => renderPost(canvas, template, data, theme);
    if (document.fonts?.ready) {
      document.fonts.ready.then(run);
    } else {
      run();
    }
  }, [fm.w, fm.h, template, data, theme]);

  const previewSize = useMemo(() => {
    const maxW = 460;
    const maxH = 600;
    const scale = Math.min(maxW / fm.w, maxH / fm.h);
    return { w: Math.round(fm.w * scale), h: Math.round(fm.h * scale) };
  }, [fm.w, fm.h]);

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `post-${template}-${format}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const updateData = <K extends keyof PostData>(key: K, value: PostData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const updateCard = (i: number, field: keyof PostData["cards"][number], value: string) =>
    setData((d) => ({ ...d, cards: d.cards.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)) }));

  const updateChip = (i: number, field: "ico" | "val", value: string) =>
    setData((d) => ({ ...d, chips: d.chips.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)) }));

  const updateStat = (i: number, field: "v" | "l", value: string) =>
    setData((d) => ({ ...d, stats: d.stats.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)) }));

  return (
    <div className="flex h-screen flex-col bg-[var(--editor-bg)] text-[var(--editor-text)] font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[var(--editor-border)] bg-[var(--editor-surf)] px-5 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full" style={{ background: theme.primary, boxShadow: `0 0 10px ${theme.primary}aa` }} />
          <div>
            <div className="text-[13px] font-bold">Post Editor</div>
            <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--editor-muted)]">Instagram Creator</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[var(--editor-muted)]">{fm.w}×{fm.h}</span>
          <button
            onClick={exportPNG}
            className="rounded-md border border-[var(--editor-border2)] bg-transparent px-3.5 py-1.5 text-[12px] font-bold text-[color:var(--editor-primary)] transition hover:bg-[var(--editor-primary-bg)]"
            style={{ "--editor-primary": theme.primary } as React.CSSProperties}
          >
            ↓ PNG
          </button>
        </div>
      </header>

      <div className="grid flex-1 overflow-hidden" style={{ gridTemplateColumns: "320px minmax(0,1fr)" }}>
        {/* Editor panel */}
        <aside className="overflow-y-auto border-r border-[var(--editor-border)] bg-[var(--editor-surf)]">
          <Section title="Formát">
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(FORMATS) as FormatKey[]).map((k) => (
                <FmtBtn key={k} active={format === k} onClick={() => setFormat(k)} primary={theme.primary}>
                  <div className="text-[12px] font-bold">{FORMATS[k].ratio}</div>
                  <div className="text-[9px] font-semibold tracking-wide">{FORMATS[k].label}</div>
                </FmtBtn>
              ))}
            </div>
          </Section>

          <Section title="Šablóna">
            <div className="grid grid-cols-2 gap-1.5">
              {TEMPLATE_KEYS.map((k) => (
                <FmtBtn key={k} active={template === k} onClick={() => setTemplate(k)} primary={theme.primary}>
                  <div className="text-base">{TEMPLATES[k].icon}</div>
                  <div className="text-[10px] font-semibold">{TEMPLATES[k].name}</div>
                </FmtBtn>
              ))}
            </div>
          </Section>

          <Section title="Farby">
            <div className="grid grid-cols-2 gap-2">
              <ColorField label="Akcent" value={theme.primary} onChange={(v) => setTheme({ ...theme, primary: v, primaryBg: v + "22" })} />
              <ColorField label="Pozadie" value={theme.bg} onChange={(v) => setTheme({ ...theme, bg: v })} />
            </div>
          </Section>

          <Section title="Hlavný obsah">
            <Field label="Badge" value={data.badge} onChange={(v) => updateData("badge", v)} />
            <Field label="Eyebrow" value={data.eye} onChange={(v) => updateData("eye", v)} />
            <Field label="Nadpis 1" value={data.hl1} onChange={(v) => updateData("hl1", v)} />
            <Field label="Nadpis 2 (akcent)" value={data.hl2} onChange={(v) => updateData("hl2", v)} />
            <Field label="Podnadpis" value={data.sub} onChange={(v) => updateData("sub", v)} textarea />
          </Section>

          <Section title="Kartičky">
            {data.cards.map((card, i) => (
              <div key={i} className="mb-2 rounded-lg border border-[var(--editor-border)] bg-[var(--editor-surf3)] p-2.5">
                <div className="mb-1.5 text-[9px] uppercase tracking-wider text-[var(--editor-muted)]">Karta {i + 1}</div>
                <div className="grid grid-cols-[40px_1fr_60px] gap-1.5">
                  <input className={inp} value={card.ico} onChange={(e) => updateCard(i, "ico", e.target.value)} />
                  <input className={inp} value={card.name} onChange={(e) => updateCard(i, "name", e.target.value)} />
                  <input className={inp} value={card.badge} onChange={(e) => updateCard(i, "badge", e.target.value)} />
                </div>
                <input className={`${inp} mt-1.5`} value={card.desc} onChange={(e) => updateCard(i, "desc", e.target.value)} />
              </div>
            ))}
          </Section>

          <Section title="Chips (spodok)">
            {data.chips.map((chip, i) => (
              <div key={i} className="mb-1.5 grid grid-cols-[40px_1fr] gap-1.5">
                <input className={inp} value={chip.ico} onChange={(e) => updateChip(i, "ico", e.target.value)} />
                <input className={inp} value={chip.val} onChange={(e) => updateChip(i, "val", e.target.value)} />
              </div>
            ))}
          </Section>

          <Section title="Štatistiky (Čísla)">
            {data.stats.map((s, i) => (
              <div key={i} className="mb-1.5 grid grid-cols-2 gap-1.5">
                <input className={inp} placeholder="Hodnota" value={s.v} onChange={(e) => updateStat(i, "v", e.target.value)} />
                <input className={inp} placeholder="Popis" value={s.l} onChange={(e) => updateStat(i, "l", e.target.value)} />
              </div>
            ))}
          </Section>

          <Section title="Autor / Firma">
            <div className="grid grid-cols-[60px_1fr] gap-1.5">
              <input className={inp} value={data.author.init} onChange={(e) => setData({ ...data, author: { ...data.author, init: e.target.value } })} />
              <input className={inp} value={data.author.name} onChange={(e) => setData({ ...data, author: { ...data.author, name: e.target.value } })} />
            </div>
            <input className={`${inp} mt-1.5`} value={data.author.desc} onChange={(e) => setData({ ...data, author: { ...data.author, desc: e.target.value } })} />
          </Section>

          <Section title="CTA & Číslo">
            <Field label="CTA" value={data.cta} onChange={(v) => updateData("cta", v)} />
            <Field label="Číslo postu" value={data.num} onChange={(v) => updateData("num", v)} />
          </Section>
        </aside>

        {/* Preview */}
        <div className="flex flex-col items-center gap-3 overflow-auto bg-[#040a06] p-5">
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-[var(--editor-muted)]">
            <span>{fm.label} · {fm.ratio}</span>
            <span className="font-mono text-[var(--editor-dim)]">{fm.w} × {fm.h} px</span>
          </div>
          <div
            className="overflow-hidden rounded-lg border border-[var(--editor-border)] shadow-[0_0_50px_rgba(0,232,135,0.06)]"
            style={{ width: previewSize.w, height: previewSize.h }}
          >
            <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const inp =
  "w-full rounded-md border border-[var(--editor-border)] bg-[var(--editor-surf3)] px-2.5 py-1.5 text-[12px] text-[var(--editor-text)] outline-none transition focus:border-[var(--editor-primary)] placeholder:text-[var(--editor-dim)]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--editor-border)] px-3 py-3">
      <div className="mb-2 text-[9px] font-bold uppercase tracking-[2.5px] text-[var(--editor-muted)]">{title}</div>
      {children}
    </section>
  );
}

function Field({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  return (
    <div className="mb-2 flex flex-col gap-1">
      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--editor-muted)]">{label}</label>
      {textarea ? (
        <textarea className={`${inp} resize-y min-h-[44px]`} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={inp} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] font-bold uppercase tracking-wider text-[var(--editor-muted)]">{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-[var(--editor-border)] bg-transparent p-0.5" />
        <input className={inp} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function FmtBtn({ children, active, onClick, primary }: { children: React.ReactNode; active: boolean; onClick: () => void; primary: string }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 rounded-lg border bg-[var(--editor-surf2)] px-1 py-2 text-center transition"
      style={{
        borderColor: active ? primary : "var(--editor-border)",
        color: active ? primary : "var(--editor-muted)",
        background: active ? `${primary}15` : "var(--editor-surf2)",
      }}
    >
      {children}
    </button>
  );
}
