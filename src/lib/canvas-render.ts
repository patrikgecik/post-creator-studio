// Canvas render logic for Instagram post editor.
// Ported from vanilla JS app.js. Layouts adapt to format (1:1, 4:5, 9:16, 1.9:1).

export type FormatKey = "square" | "portrait" | "story" | "landscape";

export interface FormatSpec {
  w: number;
  h: number;
  ratio: string;
  label: string;
}

export const FORMATS: Record<FormatKey, FormatSpec> = {
  square: { w: 1080, h: 1080, ratio: "1:1", label: "Post" },
  portrait: { w: 1080, h: 1350, ratio: "4:5", label: "Feed" },
  story: { w: 1080, h: 1920, ratio: "9:16", label: "Story" },
  landscape: { w: 1080, h: 566, ratio: "1.9:1", label: "Ad" },
};

export interface Card {
  ico: string;
  name: string;
  desc: string;
  badge: string;
}

export interface Chip {
  ico: string;
  val: string;
}

export interface Author {
  init: string;
  name: string;
  desc: string;
}

export interface Stat {
  v: string;
  l: string;
}

export interface PostData {
  badge: string;
  eye: string;
  hl1: string;
  hl2: string;
  sub: string;
  cards: Card[];
  chips: Chip[];
  author: Author;
  cta: string;
  num: string;
  stats: Stat[];
}

export interface Theme {
  bg: string;
  surf: string;
  surf2: string;
  border: string;
  primary: string; // accent (was GREEN)
  primaryBg: string;
  muted: string;
  dim: string;
  orange: string;
  orangeBg: string;
  white: string;
}

export const DEFAULT_THEME: Theme = {
  bg: "#0D1117",
  surf: "#122519",
  surf2: "#0F1C14",
  border: "#1e4a2e",
  primary: "#00E887",
  primaryBg: "#0D2B1A",
  muted: "#6b9e7a",
  dim: "#2a4a35",
  orange: "#E8A020",
  orangeBg: "#1f1408",
  white: "#FFFFFF",
};

export const DEFAULT_DATA: PostData = {
  badge: "NOVINKY · REZERVAČNÝ SYSTÉM",
  eye: "SPRÁVA PRE FIRMY",
  hl1: "Rezervujte",
  hl2: "online.",
  sub: "Zákazníci si rezervujú sami, vy sa staráte o biznis.",
  cards: [
    { ico: "📅", name: "Online booking", desc: "Zákazníci rezervujú 24/7 bez telefónu", badge: "NEW" },
    { ico: "🔔", name: "Automatické notifikácie", desc: "SMS a email potvrdenia automaticky", badge: "AUTO" },
    { ico: "📊", name: "Prehľad a analytika", desc: "Štatistiky rezervácií v reálnom čase", badge: "PRO" },
  ],
  chips: [
    { ico: "⏱", val: "24/7" },
    { ico: "📍", val: "Slovensko" },
    { ico: "💶", val: "od €25/mes" },
  ],
  author: { init: "RS", name: "Rezervačný Systém", desc: "SaaS · Slovensko · rezervacie.sk" },
  cta: "✉  Napíšte nám alebo vyskúšajte zadarmo",
  num: "01 / SÉRIA",
  stats: [
    { v: "24/7", l: "Online booking" },
    { v: "−8h", l: "Notifikácie" },
    { v: "od €25", l: "Analytika" },
    { v: "99.9%", l: "Uptime" },
  ],
};

type Ctx = CanvasRenderingContext2D;

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | null, stroke: string | null, sw = 1.5) {
  if (w <= 0 || h <= 0) return;
  const radius = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + radius, y);
  c.lineTo(x + w - radius, y);
  c.arcTo(x + w, y, x + w, y + radius, radius);
  c.lineTo(x + w, y + h - radius);
  c.arcTo(x + w, y + h, x + w - radius, y + h, radius);
  c.lineTo(x + radius, y + h);
  c.arcTo(x, y + h, x, y + h - radius, radius);
  c.lineTo(x, y + radius);
  c.arcTo(x, y, x + radius, y, radius);
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = sw;
    c.stroke();
  }
}

function pill(c: Ctx, x: number, y: number, w: number, h: number, fill: string | null, stroke: string | null, sw = 1.5) {
  rr(c, x, y, w, h, h / 2, fill, stroke, sw);
}

function txt(c: Ctx, s: string, x: number, y: number, sz: number, col: string, wt = "400", al: CanvasTextAlign = "left", font = "Sora") {
  if (!s) return;
  c.fillStyle = col;
  c.font = `${wt} ${sz}px "${font}",sans-serif`;
  c.textAlign = al;
  c.fillText(s, x, y);
}

function tw(c: Ctx, s: string, sz: number, wt = "400", font = "Sora") {
  c.font = `${wt} ${sz}px "${font}",sans-serif`;
  return c.measureText(s).width;
}

function layoutFor(w: number, h: number) {
  const p = Math.max(48, Math.min(64, Math.round(Math.min(w, h) * 0.06)));
  const gap = Math.max(10, Math.round(h * 0.018));
  const numH = 30;
  const numY = h - p - numH;
  return { p, gap, numH, numY, innerW: w - p * 2, contentTop: p + gap, contentBottom: numY - gap };
}

function stackLayout(total: number, count: number, minItem: number, minGap: number) {
  const gap = Math.max(6, Math.floor(minGap));
  const compactMin = Math.max(36, Math.floor(minItem * 0.72));
  const target = Math.max(total, compactMin * count + gap * (count - 1));
  const item = Math.max(compactMin, Math.floor((target - gap * (count - 1)) / count));
  const used = item * count;
  const itemGap = count > 1 ? Math.max(gap, Math.floor((target - used) / (count - 1))) : 0;
  return { item, gap: itemGap };
}

function base(c: Ctx, w: number, h: number, t: Theme) {
  c.fillStyle = t.bg;
  c.fillRect(0, 0, w, h);
  const grd = c.createRadialGradient(w * 0.75, h * 0.08, 0, w * 0.75, h * 0.08, w * 0.75);
  grd.addColorStop(0, t.surf);
  grd.addColorStop(1, "transparent");
  c.fillStyle = grd;
  c.fillRect(0, 0, w, h);

  c.strokeStyle = t.surf2;
  c.lineWidth = 1;
  for (let i = 1; i < 4; i += 1) {
    c.beginPath();
    c.moveTo((w * i) / 4, 0);
    c.lineTo((w * i) / 4, h);
    c.stroke();
    c.beginPath();
    c.moveTo(0, (h * i) / 4);
    c.lineTo(w, (h * i) / 4);
    c.stroke();
  }
  rr(c, 40, 40, w - 80, h - 80, 20, null, t.border, 1.5);
}

function drawBadge(c: Ctx, label: string, w: number, y: number, t: Theme) {
  const badgeW = Math.min(tw(c, label, 15, "600") + 58, w - 120);
  const badgeX = w / 2 - badgeW / 2;
  pill(c, badgeX, y, badgeW, 36, t.primaryBg, t.primary, 1.5);
  c.beginPath();
  c.arc(badgeX + 22, y + 18, 6, 0, Math.PI * 2);
  c.fillStyle = t.primary;
  c.fill();
  txt(c, label, w / 2 + 6, y + 24, 15, t.primary, "600", "center");
  return 36;
}

function drawCard(c: Ctx, x: number, y: number, w: number, h: number, card: Card, t: Theme) {
  if (h < 40) return;
  rr(c, x, y, w, h, 12, t.surf2, t.border, 1);
  const iconRadius = Math.min(h * 0.28, 28);
  const iconX = x + 18 + iconRadius;
  const iconY = y + h / 2;
  rr(c, x + 18, y + h / 2 - iconRadius, iconRadius * 2, iconRadius * 2, Math.max(6, iconRadius * 0.4), t.primaryBg, t.primary, 1.5);
  txt(c, card.ico, iconX, iconY + iconRadius * 0.38, iconRadius * 0.95, t.white, "400", "center");

  const textX = x + 18 + iconRadius * 2 + 20;
  const nameSize = Math.min(20, h * 0.2, w * 0.035);
  const descSize = Math.min(16, h * 0.16, w * 0.03);
  txt(c, card.name, textX, y + h * 0.4, nameSize, t.white, "700");
  txt(c, card.desc, textX, y + h * 0.68, descSize, t.muted, "400");

  if (card.badge) {
    const badgeW = tw(c, card.badge, 13, "700") + 22;
    pill(c, x + w - badgeW - 16, y + h / 2 - 14, badgeW, 28, t.primaryBg, t.primary, 1.5);
    txt(c, card.badge, x + w - badgeW / 2 - 16, y + h / 2 + 6, 13, t.primary, "700", "center");
  }
}

function drawChips(c: Ctx, chips: Chip[], x: number, y: number, w: number, h: number, t: Theme) {
  if (h < 40) return;
  const chipW = (w - 2 * 14) / 3;
  chips.forEach((chip, i) => {
    const chipX = x + i * (chipW + 14);
    rr(c, chipX, y, chipW, h, 10, t.surf2, t.border, 1);
    const iconSize = Math.min(h * 0.32, 24);
    const valSize = Math.min(h * 0.28, 20);
    txt(c, chip.ico, chipX + chipW / 2, y + h * 0.44, iconSize, t.primary, "400", "center");
    txt(c, chip.val, chipX + chipW / 2, y + h * 0.74, valSize, t.white, "700", "center");
  });
}

function drawAuthor(c: Ctx, author: Author, x: number, y: number, w: number, h: number, t: Theme) {
  if (h < 36) return;
  rr(c, x, y, w, h, Math.min(14, h / 2), t.surf2, t.border, 1);
  const avatarR = Math.min(h * 0.38, 28);
  const avatarX = x + avatarR + 16;
  const avatarY = y + h / 2;
  c.beginPath();
  c.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
  c.fillStyle = t.primaryBg;
  c.fill();
  c.strokeStyle = t.primary;
  c.lineWidth = 1.5;
  c.stroke();
  txt(c, author.init, avatarX, avatarY + avatarR * 0.36, Math.min(avatarR * 0.72, 18), t.primary, "700", "center");

  const textX = avatarX + avatarR + 16;
  txt(c, author.name, textX, y + h * 0.4, Math.min(18, h * 0.22), t.white, "700");
  txt(c, author.desc, textX, y + h * 0.72, Math.min(14, h * 0.18), t.muted, "400");
}

function drawCTA(c: Ctx, cta: string, x: number, y: number, w: number, h: number, t: Theme) {
  if (h < 30) return;
  rr(c, x, y, w, h, h / 2, t.primary, null);
  txt(c, cta, x + w / 2, y + h * 0.61, Math.min(20, h * 0.35), "#0D1117", "700", "center");
}

function drawNum(c: Ctx, num: string, w: number, h: number, t: Theme) {
  const m = layoutFor(w, h);
  const badgeW = tw(c, num, 14, "600") + 36;
  pill(c, w / 2 - badgeW / 2, m.numY, badgeW, m.numH, t.primaryBg, t.primary, 1.5);
  txt(c, num, w / 2, m.numY + 21, 14, t.primary, "600", "center");
}

// ===== TEMPLATES =====

function tplAnnouncement(c: Ctx, d: PostData, w: number, h: number, t: Theme) {
  base(c, w, h, t);
  const m = layoutFor(w, h);
  const { p, innerW, gap } = m;
  const hBadge = 36;
  const hEye = Math.round(h * 0.025);
  const hHl = Math.round(h * 0.108);
  const hSub = Math.round(h * 0.025);
  const hSecLabel = Math.round(h * 0.022);
  const hChips = Math.round(h * 0.086);
  const hAuthor = Math.round(h * 0.072);
  const hCTA = Math.round(h * 0.072);

  let cy = p + gap;
  drawBadge(c, d.badge, w, cy, t);
  cy += hBadge + gap;

  txt(c, d.eye, p, cy, Math.min(15, hEye * 0.8), t.muted, "600");
  cy += hEye + gap;

  const hfs = Math.min(hHl * 0.85, 94);
  txt(c, d.hl1, p, cy, hfs, t.white, "700", "left", "Playfair Display");
  cy += hHl;

  txt(c, d.hl2, p, cy, hfs, t.primary, "700", "left", "Playfair Display");
  const hl2w = tw(c, d.hl2, hfs, "700", "Playfair Display");
  const dotR = Math.round(hfs * 0.065);
  c.beginPath();
  c.arc(p + hl2w + dotR * 2, cy - hHl * 0.18, dotR, 0, Math.PI * 2);
  c.fillStyle = t.primary;
  c.fill();
  cy += Math.round(hHl * 0.4) + gap;

  txt(c, d.sub.slice(0, 80), p, cy, Math.min(16, hSub * 0.75), t.muted, "400");
  cy += hSub + gap;

  txt(c, "ČO PONÚKAME", p, cy, 12, t.muted, "700");
  cy += hSecLabel + gap;

  const cardsTotal = m.contentBottom - cy - hChips - hAuthor - hCTA - gap * 3;
  const cl = stackLayout(cardsTotal, 3, 72, Math.max(8, Math.floor(gap * 0.5)));
  d.cards.forEach((card, i) => {
    drawCard(c, p, cy, innerW, cl.item, card, t);
    cy += cl.item + (i < 2 ? cl.gap : gap);
  });

  drawChips(c, d.chips, p, cy, innerW, hChips, t);
  cy += hChips + gap;
  drawAuthor(c, d.author, p, cy, innerW, hAuthor, t);
  cy += hAuthor + gap;
  drawCTA(c, d.cta, p, cy, innerW, hCTA, t);
  drawNum(c, d.num, w, h, t);
}

function tplBenefits(c: Ctx, d: PostData, w: number, h: number, t: Theme) {
  base(c, w, h, t);
  const m = layoutFor(w, h);
  const { p, innerW, gap } = m;
  const hBadge = 36;
  const hEye = Math.round(h * 0.024);
  const hHl = Math.round(h * 0.1);
  const hSub = Math.round(h * 0.024);
  const hChips = Math.round(h * 0.082);
  const hAuthor = Math.round(h * 0.07);
  const hCTA = Math.round(h * 0.07);

  let cy = p + gap;
  drawBadge(c, d.badge, w, cy, t);
  cy += hBadge + gap;
  txt(c, d.eye, p, cy, 13, t.muted, "600");
  cy += hEye + gap;

  const hfs = Math.min(hHl * 0.84, 90);
  txt(c, d.hl1, p, cy, hfs, t.white, "700", "left", "Playfair Display");
  cy += hHl;
  txt(c, d.hl2, p, cy, hfs, t.primary, "700", "left", "Playfair Display");
  cy += Math.round(hHl * 0.38) + gap;

  txt(c, d.sub.slice(0, 80), p, cy, 14, t.muted, "400");
  cy += hSub + gap;

  const cardsTotal = m.contentBottom - cy - hChips - hAuthor - hCTA - gap * 3;
  const cardsArea = Math.max(160, cardsTotal);
  const bigH = Math.max(86, Math.floor((cardsArea - gap) * 0.58));
  const smallH = Math.max(64, cardsArea - bigH - gap);

  const cw = (innerW - 16) / 2;
  drawCard(c, p, cy, cw, bigH, d.cards[0], t);
  drawCard(c, p + cw + 16, cy, cw, bigH, d.cards[1], t);
  cy += bigH + gap;
  drawCard(c, p, cy, innerW, smallH, d.cards[2], t);
  cy += smallH + gap;

  drawChips(c, d.chips, p, cy, innerW, hChips, t);
  cy += hChips + gap;
  drawAuthor(c, d.author, p, cy, innerW, hAuthor, t);
  cy += hAuthor + gap;
  drawCTA(c, d.cta, p, cy, innerW, hCTA, t);
  drawNum(c, d.num, w, h, t);
}

function tplQuote(c: Ctx, d: PostData, w: number, h: number, t: Theme) {
  base(c, w, h, t);
  const m = layoutFor(w, h);
  const { p, innerW, gap } = m;
  const hBadge = 36;
  const hAuthor = Math.round(h * 0.08);
  const hCTA = Math.round(h * 0.072);
  const hStats = Math.round(h * 0.082);

  let cy = p + gap;
  drawBadge(c, d.badge, w, cy, t);
  cy += hBadge + gap;

  const quoteH = Math.max(160, m.contentBottom - cy - hStats - hAuthor - hCTA - gap * 3);
  rr(c, p, cy, innerW, quoteH, 16, t.surf, t.border, 1.5);
  c.fillStyle = t.primary;
  c.fillRect(p, cy, innerW, 5);

  c.fillStyle = t.surf2;
  c.font = `700 ${quoteH * 0.6}px serif`;
  c.textAlign = "left";
  c.fillText('"', p + 10, cy + quoteH * 0.65);

  const quoteSize = Math.min(quoteH * 0.14, 42);
  txt(c, d.eye, p + 24, cy + quoteH * 0.16, 12, t.primary, "700");

  c.fillStyle = t.white;
  c.font = `700 ${quoteSize}px "Sora",sans-serif`;
  c.textAlign = "left";
  const quoteString = `"${d.hl1} ${d.hl2}"`;
  const words = quoteString.split(" ");
  let line = "";
  let qy = cy + quoteH * 0.32;
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (c.measureText(test).width > innerW - 48 && line) {
      c.fillText(line, p + 24, qy);
      line = word;
      qy += quoteSize * 1.2;
    } else {
      line = test;
    }
  });
  if (line) c.fillText(line, p + 24, qy);

  txt(c, d.sub.slice(0, 72), p + 24, cy + quoteH * 0.76, 14, t.muted, "400");
  txt(c, "★★★★★", p + 24, cy + quoteH * 0.9, 24, t.orange, "400");
  cy += quoteH + gap;

  rr(c, p, cy, innerW, hStats, 12, t.surf2, t.border, 1.5);
  d.chips.forEach((chip, i) => {
    const x = p + (innerW * i) / 3 + innerW / 6;
    txt(c, chip.val, x, cy + hStats * 0.44, Math.min(22, hStats * 0.28), t.primary, "700", "center");
    txt(c, chip.ico, x, cy + hStats * 0.76, Math.min(14, hStats * 0.2), t.muted, "400", "center");
    if (i < 2) {
      c.strokeStyle = t.border;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(p + (innerW * (i + 1)) / 3, cy + hStats * 0.15);
      c.lineTo(p + (innerW * (i + 1)) / 3, cy + hStats * 0.85);
      c.stroke();
    }
  });
  cy += hStats + gap;

  drawAuthor(c, d.author, p, cy, innerW, hAuthor, t);
  cy += hAuthor + gap;
  drawCTA(c, d.cta, p, cy, innerW, hCTA, t);
  drawNum(c, d.num, w, h, t);
}

function tplNumbers(c: Ctx, d: PostData, w: number, h: number, t: Theme) {
  base(c, w, h, t);
  const m = layoutFor(w, h);
  const { p, innerW, gap } = m;
  const hBadge = 36;
  const hHl = Math.round(h * 0.092);
  const hSub = Math.round(h * 0.022);
  const hChips = Math.round(h * 0.082);
  const hCTA = Math.round(h * 0.072);
  const nw = (innerW - gap) / 2;
  const clrs: Array<[string, string]> = [
    [t.primary, t.primaryBg],
    [t.orange, t.orangeBg],
    [t.primary, t.primaryBg],
    [t.muted, t.surf2],
  ];

  let cy = p + gap;
  drawBadge(c, d.badge, w, cy, t);
  cy += hBadge + gap;

  const hfs = Math.min(hHl * 0.82, 86);
  txt(c, d.hl1, w / 2, cy, hfs, t.white, "700", "center", "Playfair Display");
  cy += hHl;
  txt(c, d.hl2, w / 2, cy, hfs, t.primary, "700", "center", "Playfair Display");
  cy += Math.round(hHl * 0.36) + gap;

  txt(c, d.sub.slice(0, 66), w / 2, cy, 14, t.muted, "400", "center");
  cy += hSub + gap;

  const numsTotal = m.contentBottom - cy - hChips - hCTA - gap * 3;
  const nh = Math.max(92, Math.floor(numsTotal / 2));

  d.stats.forEach((s, i) => {
    const x = p + (i % 2) * (nw + gap);
    const y = cy + Math.floor(i / 2) * (nh + gap);
    rr(c, x, y, nw, nh, 14, t.surf2, t.border, 1.5);
    txt(c, s.v, x + 28, y + nh * 0.66, Math.min(56, nh * 0.34), clrs[i][0], "800");
    txt(c, s.l, x + 28, y + nh * 0.84, Math.min(16, nw * 0.065), t.white, "600");
    pill(c, x + nw - 80, y + 14, 68, 26, clrs[i][1], clrs[i][0], 1.5);
    txt(c, "↑ trend", x + nw - 46, y + 31, 11, clrs[i][0], "600", "center");
  });
  cy += nh * 2 + gap * 2;

  drawChips(c, d.chips, p, cy, innerW, hChips, t);
  cy += hChips + gap;
  drawCTA(c, d.cta, p, cy, innerW, hCTA, t);
  drawNum(c, d.num, w, h, t);
}

export type TemplateKey = "announcement" | "benefits" | "quote" | "numbers";

export const TEMPLATES: Record<TemplateKey, { name: string; icon: string; render: (c: Ctx, d: PostData, w: number, h: number, t: Theme) => void }> = {
  announcement: { name: "Oznámenie", icon: "📣", render: tplAnnouncement },
  benefits: { name: "Výhody", icon: "✅", render: tplBenefits },
  quote: { name: "Citát", icon: "💬", render: tplQuote },
  numbers: { name: "Čísla", icon: "📊", render: tplNumbers },
};

export function renderPost(canvas: HTMLCanvasElement, template: TemplateKey, data: PostData, theme: Theme) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  try {
    TEMPLATES[template].render(ctx, data, canvas.width, canvas.height, theme);
  } catch (e) {
    console.warn("render err", e);
  }
}
