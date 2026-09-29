// Portretto: сервер собран в один файл.
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server.mjs
import http from "node:http";
import fs3 from "node:fs";
import path3 from "node:path";
import crypto3 from "node:crypto";
import { fileURLToPath } from "node:url";

// src/db.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
var DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.DATA_DIR || path.resolve("data");
var PERSISTENT = Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.DATA_DIR);
var FILE = path.join(DATA_DIR, "portretto-db.json");
var DEFAULT_PACKS = [
  { id: "start", credits: 10, price: 9, name: { ru: "\u0421\u0442\u0430\u0440\u0442", en: "Starter" }, popular: false },
  { id: "pro", credits: 30, price: 19, name: { ru: "\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u044B\u0439", en: "Popular" }, popular: true },
  { id: "max", credits: 60, price: 29, name: { ru: "\u041F\u0440\u043E\u0444\u0438", en: "Pro" }, popular: false }
];
var empty = () => ({
  keys: {},
  // KEY -> { credits, email, created, source, note, spent }
  orders: [],
  // { id, key, email, pack, credits, amount, currency, created }
  gens: [],
  // { id, key, style, format, count, status, images, created, error, statusUrl, responseUrl, refunded, showcase: [] }
  settings: { packs: DEFAULT_PACKS, currency: "eur" }
});
var db = empty();
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(FILE)) db = { ...empty(), ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
} catch (e) {
  console.error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0431\u0430\u0437\u0443:", e.message);
}
var timer = null;
function save() {
  clearTimeout(timer);
  timer = setTimeout(flush, 200);
}
function flush() {
  try {
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, FILE);
  } catch (e) {
    console.error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0431\u0430\u0437\u0443:", e.message);
  }
}
process.on("SIGTERM", () => {
  flush();
  process.exit(0);
});
var ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newKey() {
  let k;
  do {
    const b = crypto.randomBytes(12);
    const chars = [...b].map((x) => ALPHABET[x % ALPHABET.length]).join("");
    k = `PT-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
  } while (db.keys[k]);
  return k;
}
var normKey = (k) => String(k || "").trim().toUpperCase();
var newId = () => crypto.randomBytes(8).toString("hex");

// src/styles.mjs
var IDENTITY = [
  "Use the person from the reference photo(s) as the only subject.",
  "Preserve their exact facial identity with maximum fidelity: identical face shape, jawline, eyes (shape, color, spacing), eyebrows, nose, lips, ears, skin tone, freckles, moles, scars, age, hairline, hair color and texture, facial hair.",
  "The result must be instantly recognizable as the same real person by friends and family.",
  "Do not change ethnicity, age, body type or facial proportions. Do not beautify into a different face, do not slim the face, do not enlarge the eyes.",
  "If the reference shows glasses, keep the same glasses.",
  "If several reference photos are given, they all show the same person from different angles: combine them to reconstruct the face precisely.",
  "Keep the exact skin tone and natural skin texture, the same eye color and the natural facial asymmetries. No beauty filter, no face reshaping, no makeup the person does not wear.",
  "Change only the clothing, background, lighting, pose and mood requested below; the face must stay a faithful photographic copy of the reference."
].join(" ");
var QUALITY = [
  "Photorealistic high-end commercial portrait photography, shot on a Phase One medium format camera with an 85mm lens.",
  "Tack-sharp focus on the eyes, natural catchlights, realistic skin texture with visible pores, subtle professional retouching (dodge and burn), no plastic or waxy skin, no oversmoothing.",
  "Accurate anatomy, natural hands if visible, correct teeth, no extra fingers, no distortion, no text, no watermark, no logo.",
  "Magazine-grade color grading, rich tonal range, clean highlights, deep but detailed shadows."
].join(" ");
var STYLES = [
  {
    id: "business",
    name: { ru: "\u0414\u0435\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442", en: "Business headshot" },
    desc: { ru: "\u0414\u043B\u044F \u0441\u0430\u0439\u0442\u0430 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438, \u0440\u0435\u0437\u044E\u043C\u0435 \u0438 LinkedIn. \u0421\u0442\u0440\u043E\u0433\u0438\u0439 \u043A\u043E\u0441\u0442\u044E\u043C, \u0441\u0435\u0440\u044B\u0439 \u0444\u043E\u043D.", en: "For your company site, CV and LinkedIn. Tailored suit, grey backdrop." },
    light: "85mm \xB7 f/4 \xB7 octabox 150 + rim",
    swatch: "radial-gradient(circle at 35% 30%, #d8dbe0 0%, #9aa1ab 45%, #4a5059 100%)",
    prompt: "Premium corporate headshot, chest-up framing, subject slightly turned, confident approachable expression with a subtle natural smile. Wardrobe: impeccably tailored dark navy or charcoal suit or blazer with a crisp shirt, styled appropriately for the person. Background: neutral mid-grey seamless studio paper with a soft gradient. Lighting: large octabox key light at 45 degrees, soft fill, gentle hair light separating the subject from the background."
  },
  {
    id: "office",
    name: { ru: "\u0421\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0439 \u043E\u0444\u0438\u0441", en: "Modern office" },
    desc: { ru: "\u0414\u0440\u0443\u0436\u0435\u043B\u044E\u0431\u043D\u044B\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0432 \u0441\u0432\u0435\u0442\u043B\u043E\u043C \u043E\u0444\u0438\u0441\u0435 \u0441 \u043C\u044F\u0433\u043A\u0438\u043C \u0440\u0430\u0437\u043C\u044B\u0442\u0438\u0435\u043C.", en: "A friendly portrait in a bright office with soft background blur." },
    light: "85mm \xB7 f/1.8 \xB7 window + bounce",
    swatch: "linear-gradient(135deg, #f4f1ea 0%, #c9d6de 45%, #7f98a8 100%)",
    prompt: "Modern professional portrait in a bright contemporary office with large windows, background beautifully blurred with creamy bokeh (glass, plants, warm wood). Waist-up framing, relaxed confident posture, genuine warm smile. Wardrobe: smart-casual, a quality blazer or knit over a clean shirt. Lighting: soft natural window light as key, white bounce fill, airy and optimistic mood."
  },
  {
    id: "bw_classic",
    name: { ru: "\u041A\u043B\u0430\u0441\u0441\u0438\u043A\u0430 \u0427/\u0411", en: "Classic B&W" },
    desc: { ru: "\u0411\u043B\u0430\u0433\u043E\u0440\u043E\u0434\u043D\u044B\u0439 \u0447\u0451\u0440\u043D\u043E-\u0431\u0435\u043B\u044B\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0432 \u0434\u0443\u0445\u0435 \u0441\u0442\u0443\u0434\u0438\u0439\u043D\u043E\u0439 \u043A\u043B\u0430\u0441\u0441\u0438\u043A\u0438.", en: "A timeless black-and-white studio portrait." },
    light: "105mm \xB7 f/5.6 \xB7 Rembrandt",
    swatch: "radial-gradient(circle at 30% 35%, #bdbdbd 0%, #505050 40%, #0e0e0e 80%)",
    prompt: "Timeless black and white fine-art studio portrait, head and shoulders, deep black background. Rembrandt lighting with a single key light creating a small triangle of light on the shadow cheek, dramatic yet refined contrast, silver gelatin film look with fine grain, thoughtful calm expression. Wardrobe: simple dark clothing, no patterns."
  },
  {
    id: "editorial",
    name: { ru: "\u041E\u0431\u043B\u043E\u0436\u043A\u0430 \u0436\u0443\u0440\u043D\u0430\u043B\u0430", en: "Magazine cover" },
    desc: { ru: "\u041C\u043E\u0434\u043D\u0430\u044F \u0441\u044A\u0451\u043C\u043A\u0430: \u0441\u043E\u0447\u043D\u044B\u0439 \u0446\u0432\u0435\u0442\u043D\u043E\u0439 \u0444\u043E\u043D, \u0441\u0432\u0435\u0442 \u043A\u0430\u043A \u043D\u0430 \u043E\u0431\u043B\u043E\u0436\u043A\u0435.", en: "Fashion editorial: bold colour backdrop, cover-style light." },
    light: "70mm \xB7 f/8 \xB7 beauty dish",
    swatch: "radial-gradient(circle at 50% 30%, #ffb38a 0%, #e0583a 45%, #7a1f1a 100%)",
    prompt: "High-fashion magazine editorial portrait, bold saturated solid color seamless backdrop that complements the subject's skin tone, beauty dish key light from above-front with a clean catchlight, crisp specular highlights. Stylish contemporary designer outfit, strong confident pose, editorial styling of hair. Vogue / GQ cover quality, leave clean negative space above the head."
  },
  {
    id: "golden_hour",
    name: { ru: "\u0417\u043E\u043B\u043E\u0442\u043E\u0439 \u0447\u0430\u0441", en: "Golden hour" },
    desc: { ru: "\u0422\u0451\u043F\u043B\u044B\u0439 \u0437\u0430\u043A\u0430\u0442\u043D\u044B\u0439 \u0441\u0432\u0435\u0442 \u043D\u0430 \u0443\u043B\u0438\u0446\u0435, \u0436\u0438\u0432\u043E\u0435 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435.", en: "Warm sunset light outdoors, relaxed and natural." },
    light: "135mm \xB7 f/2 \xB7 backlit sun",
    swatch: "radial-gradient(circle at 75% 25%, #fff0c2 0%, #f3b25e 35%, #8a5a3a 100%)",
    prompt: "Outdoor lifestyle portrait during golden hour, the low sun behind the subject creating a warm glowing rim light in the hair, soft golden fill on the face from a reflector, dreamy background of a park or city street dissolved into large warm bokeh. Relaxed natural expression. Wardrobe: tasteful casual clothing in warm neutral tones."
  },
  {
    id: "luxury",
    name: { ru: "\u041F\u0440\u0435\u043C\u0438\u0443\u043C \u043B\u043E\u0443-\u043A\u0438", en: "Luxury low-key" },
    desc: { ru: "\u0422\u0451\u043C\u043D\u044B\u0439, \u0434\u043E\u0440\u043E\u0433\u043E\u0439, \u043A\u0438\u043D\u0435\u043C\u0430\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u0447\u043D\u044B\u0439 \u043E\u0431\u0440\u0430\u0437.", en: "Dark, premium and cinematic." },
    light: "85mm \xB7 f/2.8 \xB7 stripbox + gobo",
    swatch: "radial-gradient(circle at 40% 40%, #3f5a5c 0%, #1b2627 50%, #07090a 100%)",
    prompt: "Luxurious low-key portrait, dark moody charcoal-teal painted canvas backdrop, narrow strip box key light sculpting the face, subtle warm accent light, cinematic color grade. Elegant premium wardrobe (dark tailored jacket, fine fabrics, understated accessories). Powerful, composed, successful look."
  },
  {
    id: "high_key",
    name: { ru: "\u0421\u0432\u0435\u0442\u043B\u044B\u0439 \u0445\u0430\u0439-\u043A\u0438", en: "Bright high-key" },
    desc: { ru: "\u0427\u0438\u0441\u0442\u044B\u0439 \u0431\u0435\u043B\u044B\u0439 \u0444\u043E\u043D, \u043C\u044F\u0433\u043A\u0438\u0439 \u0441\u0432\u0435\u0442, \u0441\u0432\u0435\u0436\u0438\u0439 \u0438 \u043B\u0451\u0433\u043A\u0438\u0439 \u0441\u043D\u0438\u043C\u043E\u043A.", en: "Clean white backdrop, soft light, fresh and airy." },
    light: "85mm \xB7 f/5.6 \xB7 2 softboxes + bg",
    swatch: "radial-gradient(circle at 50% 40%, #ffffff 0%, #f1f3f5 55%, #cfd5db 100%)",
    prompt: "Bright high-key studio portrait on a pure white seamless background, soft even wraparound lighting from two large softboxes plus background lights, very soft shadows, fresh and clean look, natural happy expression. Wardrobe: light neutral tones (white, cream, light grey)."
  },
  {
    id: "cinematic",
    name: { ru: "\u041A\u0438\u043D\u043E-\u043D\u0435\u043E\u043D", en: "Cinematic neon" },
    desc: { ru: "\u0426\u0432\u0435\u0442\u043D\u044B\u0435 \u0433\u0435\u043B\u0438, \u043A\u0430\u043A \u0432 \u043A\u0430\u0434\u0440\u0435 \u0438\u0437 \u0444\u0438\u043B\u044C\u043C\u0430.", en: "Coloured gels, like a still from a film." },
    light: "50mm \xB7 f/1.4 \xB7 magenta/cyan gels",
    swatch: "linear-gradient(120deg, #ff3fa4 0%, #6b2bd9 50%, #16c6d9 100%)",
    prompt: "Cinematic portrait with dual colored gel lighting: magenta key light from one side and cyan rim light from the other, dark background with subtle haze, anamorphic film look, moody and striking. Wardrobe: modern dark streetwear or a sleek jacket."
  }
];
var CUSTOM = {
  id: "custom",
  custom: true,
  name: { ru: "\u0421\u0432\u043E\u0439 \u043E\u0431\u0440\u0430\u0437", en: "Your own idea" },
  desc: { ru: "\u041E\u043F\u0438\u0448\u0438\u0442\u0435 \u0441\u043B\u043E\u0432\u0430\u043C\u0438, \u043A\u0430\u043A\u0438\u043C \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043F\u043E\u0440\u0442\u0440\u0435\u0442: \u043C\u0435\u0441\u0442\u043E, \u043E\u0434\u0435\u0436\u0434\u0430, \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435.", en: "Describe the portrait in your own words: place, outfit, mood." },
  light: "",
  swatch: "repeating-linear-gradient(135deg, #e7e9ec 0 12px, #dfe2e6 12px 24px)",
  prompt: ""
};
STYLES.push(CUSTOM);
var FORMATS = [
  { id: "4:5", name: { ru: "\u041F\u043E\u0440\u0442\u0440\u0435\u0442 4:5", en: "Portrait 4:5" } },
  { id: "1:1", name: { ru: "\u041A\u0432\u0430\u0434\u0440\u0430\u0442 1:1", en: "Square 1:1" } },
  { id: "9:16", name: { ru: "\u0421\u0442\u043E\u0440\u0438\u0441 9:16", en: "Story 9:16" } },
  { id: "3:2", name: { ru: "\u0413\u043E\u0440\u0438\u0437\u043E\u043D\u0442 3:2", en: "Landscape 3:2" } }
];
function buildPrompt(style, text) {
  const parts = [IDENTITY];
  if (style.custom) {
    parts.push("Create a professional portrait of this person exactly as the client describes (the description may be in any language; follow it closely for scene, wardrobe, pose, lighting and mood): " + text);
  } else {
    parts.push(style.prompt);
    if (text) parts.push("Client's own description (follow it closely; where it conflicts with the look above, the client's description wins; never change the person's identity): " + text);
  }
  parts.push(QUALITY);
  return parts.join("\n\n");
}

// src/fal.mjs
var fal_exports = {};
__export(fal_exports, {
  COST_PER_IMAGE: () => COST_PER_IMAGE,
  MODEL: () => MODEL,
  RESOLUTION: () => RESOLUTION,
  UserError: () => UserError,
  falError: () => falError,
  falFetch: () => falFetch,
  falKey: () => falKey,
  probe: () => probe,
  submit: () => submit
});
var MODEL = process.env.FAL_MODEL || "fal-ai/nano-banana-pro/edit";
var RESOLUTION = process.env.FAL_RESOLUTION || "2K";
var COST_PER_IMAGE = parseFloat(process.env.FAL_COST_PER_IMAGE || "0.15");
var UserError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
function falKey() {
  const k = (process.env.FAL_KEY || process.env.FAL_API_KEY || "").trim();
  if (!k) throw new UserError("\u041D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435 \u043D\u0435 \u0437\u0430\u0434\u0430\u043D FAL_KEY. Railway \u2192 \u0441\u0435\u0440\u0432\u0438\u0441 \u2192 Variables.", 500);
  return k;
}
async function falFetch(url, opts = {}) {
  const res2 = await fetch(url, {
    ...opts,
    headers: { authorization: "Key " + falKey(), "content-type": "application/json", ...opts.headers || {} }
  });
  const text = await res2.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: res2.ok, status: res2.status, data };
}
function falError(status, data) {
  let d = data?.detail ?? data?.error ?? data?.message ?? data?.raw ?? "";
  if (Array.isArray(d)) d = d.map((x) => x.msg || JSON.stringify(x)).join("; ");
  else if (typeof d === "object") d = JSON.stringify(d);
  d = String(d);
  if (status === 402 || /balance|credit|locked|billing/i.test(d)) return { msg: "\u0421\u0435\u0440\u0432\u0438\u0441 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.", admin: "\u041D\u0430 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0435 fal.ai \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0441\u044F \u0431\u0430\u043B\u0430\u043D\u0441." };
  if (status === 401 || status === 403) return { msg: "\u0421\u0435\u0440\u0432\u0438\u0441 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.", admin: `fal.ai \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u043A\u043B\u044E\u0447 (${status}).` };
  if (/nsfw|safety|content policy|flagged/i.test(d)) return { msg: "\u0424\u043E\u0442\u043E \u043D\u0435 \u043F\u0440\u043E\u0448\u043B\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u0438. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0435 \u0444\u043E\u0442\u043E.", admin: d.slice(0, 200) };
  return { msg: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u043E\u0440\u0442\u0440\u0435\u0442. \u041A\u0440\u0435\u0434\u0438\u0442\u044B \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u044B, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.", admin: `(${status}) ${d.slice(0, 300)}` };
}
async function submit(input) {
  const url = `https://queue.fal.run/${MODEL}`;
  const full = { ...input, aspect_ratio: input.aspect_ratio, resolution: RESOLUTION };
  let r = await falFetch(url, { method: "POST", body: JSON.stringify(full) });
  if (r.status === 422) {
    const { aspect_ratio, resolution, ...base } = full;
    r = await falFetch(url, { method: "POST", body: JSON.stringify(base) });
  }
  return r;
}
async function probe() {
  const key = (process.env.FAL_KEY || process.env.FAL_API_KEY || "").trim();
  if (!key) return { ok: false, text: "FAL_KEY \u043D\u0435 \u0437\u0430\u0434\u0430\u043D" };
  try {
    const app = MODEL.split("/").slice(0, 2).join("/");
    const r = await fetch(`https://queue.fal.run/${app}/requests/00000000-0000-0000-0000-000000000000/status`, { headers: { authorization: "Key " + key } });
    const t = await r.text();
    if (/balance|locked|billing/i.test(t)) return { ok: false, text: "\u041A\u043B\u044E\u0447 \u0432\u0435\u0440\u043D\u044B\u0439, \u043D\u043E \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0441\u044F \u0431\u0430\u043B\u0430\u043D\u0441 fal.ai" };
    if (r.status === 401 || r.status === 403) return { ok: false, text: "fal.ai \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u043A\u043B\u044E\u0447" };
    return { ok: true, text: "\u041A\u043B\u044E\u0447 \u043F\u0440\u0438\u043D\u044F\u0442" };
  } catch (e) {
    return { ok: false, text: "\u041D\u0435\u0442 \u0441\u0432\u044F\u0437\u0438 \u0441 fal.ai: " + e.message };
  }
}

// src/stripe.mjs
import crypto2 from "node:crypto";
var SK = () => (process.env.STRIPE_SECRET_KEY || "").trim();
var stripeEnabled = () => SK().startsWith("sk_");
var webhookEnabled = () => Boolean((process.env.STRIPE_WEBHOOK_SECRET || "").trim());
var STRIPE_API = process.env.STRIPE_API_BASE || "https://api.stripe.com";
function form(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === void 0 || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v, key, out);
    else out.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(v)));
  }
  return out.join("&");
}
async function stripe(method, path4, body) {
  const res2 = await fetch(STRIPE_API + path4, {
    method,
    headers: { authorization: "Bearer " + SK(), "content-type": "application/x-www-form-urlencoded" },
    body: body ? form(body) : void 0
  });
  const data = await res2.json().catch(() => ({}));
  if (!res2.ok) throw new Error(data?.error?.message || `Stripe ${res2.status}`);
  return data;
}
function createCheckout({ pack, currency: currency2, key, origin: origin2, lang: lang2, brand }) {
  return stripe("POST", "/v1/checkout/sessions", {
    mode: "payment",
    locale: lang2 === "en" ? "en" : "ru",
    success_url: `${origin2}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin2}/#pricing`,
    allow_promotion_codes: "true",
    line_items: {
      0: {
        quantity: 1,
        price_data: {
          currency: currency2,
          unit_amount: Math.round(pack.price * 100),
          product_data: {
            name: `${brand} \u2014 ${pack.name[lang2] || pack.name.ru}`,
            description: lang2 === "en" ? `${pack.credits} AI studio portraits` : `${pack.credits} \u0441\u0442\u0443\u0434\u0438\u0439\u043D\u044B\u0445 AI-\u043F\u043E\u0440\u0442\u0440\u0435\u0442\u043E\u0432`
          }
        }
      }
    },
    metadata: { pack: pack.id, credits: pack.credits, key: key || "" }
  });
}
var retrieveSession = (id) => stripe("GET", `/v1/checkout/sessions/${encodeURIComponent(id)}`);
function verifyWebhook(raw, header) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret || !header) return null;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const t = parts.t;
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || !sigs.length) return null;
  if (Math.abs(Date.now() / 1e3 - Number(t)) > 600) return null;
  const expected = crypto2.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  const ok = sigs.some((s) => s.length === expected.length && crypto2.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
  if (!ok) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// src/covers.mjs
import fs2 from "node:fs";
import path2 from "node:path";
var COVER_DIR = path2.join(DATA_DIR, "covers");
var COVER_MODEL = process.env.FAL_COVER_MODEL || "fal-ai/nano-banana-pro";
fs2.mkdirSync(COVER_DIR, { recursive: true });
var PERSONA = {
  business: "a confident man in his early 40s with short dark hair and light stubble",
  office: "a friendly woman in her early 30s with shoulder-length curly brown hair",
  bw_classic: "a distinguished man in his late 50s with a neat grey beard",
  editorial: "a striking woman in her mid 20s with sleek black hair in a low bun",
  golden_hour: "a young woman in her late 20s with auburn wavy hair and freckles",
  luxury: "an elegant Black man in his mid 30s with a well-groomed beard",
  high_key: "a cheerful woman in her mid 40s with a blonde bob haircut",
  cinematic: "a young East Asian man in his mid 20s with a textured undercut hairstyle"
};
db.settings.covers ||= {};
db.coverJobs ||= {};
var coverStyles = () => STYLES.filter((s) => !s.custom);
function coverPrompt(style) {
  const who = PERSONA[style.id] || "a fictional adult model";
  return [
    `Photorealistic portrait of ${who}. The person is a fictional model, not a real or famous person.`,
    style.prompt,
    QUALITY,
    "Portrait orientation, the face clearly visible, looking at or near the camera."
  ].join("\n\n");
}
async function startCovers(ids) {
  const list = coverStyles().filter((s) => !ids || ids.includes(s.id));
  const results = [];
  for (const s of list) {
    if (db.coverJobs[s.id]?.status === "working") {
      results.push({ id: s.id, status: "working" });
      continue;
    }
    const url = `https://queue.fal.run/${COVER_MODEL}`;
    const input = { prompt: coverPrompt(s), num_images: 1, output_format: "jpeg", aspect_ratio: "4:5", resolution: "1K" };
    let r = await falFetch(url, { method: "POST", body: JSON.stringify(input) });
    if (r.status === 422) r = await falFetch(url, { method: "POST", body: JSON.stringify({ prompt: input.prompt, num_images: 1 }) });
    if (!r.ok || !r.data.request_id) {
      const e = falError(r.status, r.data);
      db.coverJobs[s.id] = { status: "failed", error: e.admin, started: Date.now() };
      results.push({ id: s.id, status: "failed", error: e.admin });
      continue;
    }
    db.coverJobs[s.id] = { status: "working", statusUrl: r.data.status_url, responseUrl: r.data.response_url, started: Date.now() };
    results.push({ id: s.id, status: "working" });
  }
  save();
  return results;
}
async function saveImage(styleId, buf, type) {
  const ext = /png/.test(type) ? "png" : /webp/.test(type) ? "webp" : "jpg";
  for (const f of fs2.readdirSync(COVER_DIR)) if (f.startsWith(styleId + ".")) fs2.rmSync(path2.join(COVER_DIR, f), { force: true });
  const file = `${styleId}.${ext}`;
  fs2.writeFileSync(path2.join(COVER_DIR, file), buf);
  db.settings.covers[styleId] = `/covers/${file}?v=${Date.now()}`;
  save();
}
async function pollCovers() {
  for (const [id, job] of Object.entries(db.coverJobs)) {
    if (job.status !== "working") continue;
    try {
      const st = await falFetch(job.statusUrl);
      if (!st.ok) {
        if (st.status < 500) {
          job.status = "failed";
          job.error = falError(st.status, st.data).admin;
        }
        continue;
      }
      if (st.data.status !== "COMPLETED") continue;
      const out = await falFetch(job.responseUrl);
      const img = out.ok ? (out.data.images || [])[0] : null;
      const src = typeof img === "string" ? img : img?.url;
      if (!src) {
        job.status = "failed";
        job.error = out.ok ? "\u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u0441\u043D\u0438\u043C\u043E\u043A" : falError(out.status, out.data).admin;
        continue;
      }
      const res2 = await fetch(src);
      if (!res2.ok) {
        job.status = "failed";
        job.error = "\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0441\u043D\u0438\u043C\u043E\u043A";
        continue;
      }
      await saveImage(id, Buffer.from(await res2.arrayBuffer()), res2.headers.get("content-type") || "");
      job.status = "done";
    } catch (e) {
      job.status = "failed";
      job.error = e.message;
    }
  }
  if (Object.values(db.coverJobs).some((j) => j.status === "working" && Date.now() - j.started > 10 * 60 * 1e3)) {
    for (const j of Object.values(db.coverJobs)) if (j.status === "working" && Date.now() - j.started > 10 * 60 * 1e3) {
      j.status = "failed";
      j.error = "\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043E\u043B\u0433\u043E";
    }
  }
  save();
  return coverState();
}
function coverState() {
  return coverStyles().map((s) => ({ id: s.id, name: s.name.ru, cover: db.settings.covers[s.id] || "", job: db.coverJobs[s.id] ? { status: db.coverJobs[s.id].status, error: db.coverJobs[s.id].error || "" } : null }));
}
async function uploadCover(styleId, dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!m) throw new UserError("\u041D\u0443\u0436\u043D\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 JPG, PNG \u0438\u043B\u0438 WEBP.");
  if (!coverStyles().some((s) => s.id === styleId)) throw new UserError("\u041E\u0431\u0440\u0430\u0437 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.");
  await saveImage(styleId, Buffer.from(m[2], "base64"), m[1]);
}
function removeCover(styleId) {
  for (const f of fs2.readdirSync(COVER_DIR)) if (f.startsWith(styleId + ".")) fs2.rmSync(path2.join(COVER_DIR, f), { force: true });
  delete db.settings.covers[styleId];
  save();
}
function serveCover(res2, name) {
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(name)) return false;
  const file = path2.join(COVER_DIR, name);
  if (!fs2.existsSync(file)) return false;
  const type = name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg";
  res2.writeHead(200, { "content-type": type, "cache-control": "public, max-age=86400" });
  fs2.createReadStream(file).pipe(res2);
  return true;
}

// src/models.mjs
var RATIO = { "4:5": [4, 5], "1:1": [1, 1], "9:16": [9, 16], "3:2": [3, 2] };
var size = (format, longSide) => {
  const [w, h] = RATIO[format] || RATIO["4:5"];
  const k = longSide / Math.max(w, h);
  const r8 = (v) => Math.round(v * k / 16) * 16;
  return { width: r8(w), height: r8(h) };
};
var seedSize = (format) => {
  const [w, h] = RATIO[format] || RATIO["4:5"];
  let s = size(format, 2400);
  if (Math.min(s.width, s.height) < 1920) {
    const k = 1920 / Math.min(s.width, s.height);
    s = { width: Math.round(s.width * k), height: Math.round(s.height * k) };
  }
  return s;
};
var res = (r) => ["1K", "2K", "4K"].includes(r) ? r : "2K";
var MODELS = [
  {
    id: "nano_pro",
    endpoint: "fal-ai/nano-banana-pro/edit",
    cost: 0.15,
    credits: 1,
    batch: true,
    name: { ru: "Nano Banana Pro", en: "Nano Banana Pro" },
    desc: { ru: "\u041B\u0443\u0447\u0448\u0435\u0435 \u0441\u0445\u043E\u0434\u0441\u0442\u0432\u043E \u0438 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E. \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u043C.", en: "Best likeness and quality. Recommended." },
    input: ({ prompt, photos, format, count, resolution }) => ({ prompt, image_urls: photos, num_images: count, aspect_ratio: format, resolution: res(resolution), output_format: "png" })
  },
  {
    id: "nano2",
    endpoint: "fal-ai/nano-banana-2/edit",
    cost: 0.12,
    credits: 1,
    batch: true,
    name: { ru: "Nano Banana 2", en: "Nano Banana 2" },
    desc: { ru: "\u0411\u044B\u0441\u0442\u0440\u0435\u0435 \u0438 \u0434\u0435\u0448\u0435\u0432\u043B\u0435 Pro, \u043E\u0447\u0435\u043D\u044C \u0445\u043E\u0440\u043E\u0448\u0435\u0435 \u0441\u0445\u043E\u0434\u0441\u0442\u0432\u043E.", en: "Faster and cheaper than Pro, very good likeness." },
    input: ({ prompt, photos, format, count, resolution }) => ({ prompt, image_urls: photos, num_images: count, aspect_ratio: format, resolution: res(resolution), output_format: "png" })
  },
  {
    id: "seedream45",
    endpoint: "fal-ai/bytedance/seedream/v4.5/edit",
    cost: 0.04,
    credits: 1,
    batch: true,
    name: { ru: "Seedream 4.5", en: "Seedream 4.5" },
    desc: { ru: "\u0412\u044B\u0441\u043E\u043A\u043E\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435, \u0443\u0447\u0438\u0442\u044B\u0432\u0430\u0435\u0442 \u0432\u0441\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0435 \u0444\u043E\u0442\u043E.", en: "High resolution, uses every photo you upload." },
    input: ({ prompt, photos, format, count }) => ({ prompt, image_urls: photos, num_images: count, image_size: seedSize(format) })
  },
  {
    id: "flux2pro",
    endpoint: "fal-ai/flux-2-pro/edit",
    cost: 0.05,
    credits: 1,
    batch: false,
    name: { ru: "FLUX.2 Pro", en: "FLUX.2 Pro" },
    desc: { ru: "\u0424\u043E\u0442\u043E\u0440\u0435\u0430\u043B\u0438\u0437\u043C \u0438 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u0430\u044F \u043A\u043E\u0436\u0430.", en: "Photorealism and natural skin." },
    input: ({ prompt, photos, format }) => ({ prompt, image_urls: photos, image_size: size(format, 1536), output_format: "png", safety_tolerance: "2" })
  },
  {
    id: "gpt2",
    endpoint: "openai/gpt-image-2/edit",
    cost: 0.2,
    credits: 2,
    batch: true,
    name: { ru: "GPT Image 2", en: "GPT Image 2" },
    desc: { ru: "\u0422\u043E\u0447\u043D\u043E \u0441\u043B\u0435\u0434\u0443\u0435\u0442 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044E, \u0445\u043E\u0440\u043E\u0448 \u0434\u043B\u044F \u0441\u043B\u043E\u0436\u043D\u044B\u0445 \u0441\u0446\u0435\u043D.", en: "Follows descriptions precisely, great for complex scenes." },
    input: ({ prompt, photos, count }) => ({ prompt, image_urls: photos, num_images: count, quality: "high", output_format: "png" })
  },
  {
    id: "kontext_max",
    endpoint: "fal-ai/flux-pro/kontext/max",
    cost: 0.08,
    credits: 1,
    batch: true,
    name: { ru: "FLUX Kontext Max", en: "FLUX Kontext Max" },
    desc: { ru: "\u0410\u043A\u043A\u0443\u0440\u0430\u0442\u043D\u044B\u0435 \u043F\u0440\u0430\u0432\u043A\u0438 \u043E\u0434\u043D\u043E\u0433\u043E \u0444\u043E\u0442\u043E.", en: "Careful edits of a single photo." },
    input: ({ prompt, photos, format, count }) => ({ prompt, image_url: photos[0], num_images: count, aspect_ratio: format === "4:5" ? "3:4" : format, output_format: "png", safety_tolerance: "2" })
  },
  {
    id: "qwen",
    endpoint: "fal-ai/qwen-image-edit-2511",
    cost: 0.05,
    credits: 1,
    batch: true,
    name: { ru: "Qwen Image Edit", en: "Qwen Image Edit" },
    desc: { ru: "\u041D\u0435\u0434\u043E\u0440\u043E\u0433\u0430\u044F, \u0445\u043E\u0440\u043E\u0448\u043E \u0434\u0435\u0440\u0436\u0438\u0442 \u0434\u0435\u0442\u0430\u043B\u0438.", en: "Affordable, keeps details well." },
    input: ({ prompt, photos, format, count }) => ({ prompt, image_urls: photos, num_images: count, image_size: size(format, 1536), output_format: "png" })
  },
  {
    id: "pulid",
    endpoint: "fal-ai/flux-pulid",
    cost: 0.05,
    credits: 1,
    batch: false,
    name: { ru: "FLUX PuLID (Face ID)", en: "FLUX PuLID (Face ID)" },
    desc: { ru: "\u0421\u043F\u0435\u0446\u0438\u0430\u043B\u044C\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u0430 \u043B\u0438\u0446\u0430, \u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u043A\u0430\u0434\u0440 \u0441 \u043D\u0443\u043B\u044F.", en: "A dedicated face-ID model that builds the shot from scratch." },
    input: ({ prompt, photos, format }) => ({ prompt, reference_image_url: photos[0], image_size: size(format, 1344), id_weight: 1, num_inference_steps: 28, guidance_scale: 4 })
  }
];
var FACE_SWAP = {
  endpoint: "easel-ai/advanced-face-swap",
  cost: 0.05,
  input: ({ face, target, gender, hair }) => ({ face_image_0: face, gender_0: gender, target_image: target, workflow_type: hair === "target_hair" ? "target_hair" : "user_hair", upscale: true, detailer: true })
};
var modelById = (id) => MODELS.find((m) => m.id === id);

// src/pipeline.mjs
var OPTIONAL = ["aspect_ratio", "resolution", "image_size", "output_format", "safety_tolerance", "quality", "id_weight", "num_inference_steps", "guidance_scale"];
var faces = /* @__PURE__ */ new Map();
async function submit2(endpoint, input) {
  const url = `https://queue.fal.run/${endpoint}`;
  let r = await falFetch(url, { method: "POST", body: JSON.stringify(input) });
  if (r.status === 422) {
    const slim = { ...input };
    for (const k of OPTIONAL) delete slim[k];
    r = await falFetch(url, { method: "POST", body: JSON.stringify(slim) });
  }
  return r;
}
var imagesOf = (data) => {
  const list = data?.images || (data?.image ? [data.image] : []);
  return list.map((i) => typeof i === "string" ? i : i?.url).filter(Boolean);
};
async function start(gen, { prompt, photos, resolution, swap }) {
  const m = modelById(gen.model);
  const calls = m.batch ? [gen.count] : Array.from({ length: gen.count }, () => 1);
  gen.jobs = [];
  for (const n of calls) {
    const r = await submit2(m.endpoint, m.input({ prompt, photos, format: gen.format, count: n, resolution }));
    if (!r.ok || !r.data.request_id) {
      const e = falError(r.status, r.data);
      if (!gen.jobs.length) return e;
      gen.jobs.push({ status: "failed", error: e.admin });
      continue;
    }
    gen.jobs.push({ status: "working", statusUrl: r.data.status_url, responseUrl: r.data.response_url, images: [] });
  }
  gen.stage = "gen";
  if (swap) {
    gen.swap = { gender: swap.gender, hair: swap.hair };
    faces.set(gen.id, photos[0]);
  }
  return null;
}
async function pollJob(job, pick) {
  if (job.status !== "working") return;
  const st = await falFetch(job.statusUrl);
  if (!st.ok) {
    if (st.status >= 400 && st.status < 500) {
      job.status = "failed";
      job.error = falError(st.status, st.data).admin;
    }
    return;
  }
  if (st.data.status === "IN_QUEUE") {
    job.queue = st.data.queue_position ?? null;
    return;
  }
  if (st.data.status !== "COMPLETED") {
    job.queue = null;
    return;
  }
  const out = await falFetch(job.responseUrl);
  if (!out.ok) {
    job.status = "failed";
    job.error = falError(out.status, out.data).admin;
    return;
  }
  job.images = pick(out.data);
  job.status = job.images.length ? "done" : "failed";
  if (!job.images.length) job.error = "\u043F\u0443\u0441\u0442\u043E\u0439 \u043E\u0442\u0432\u0435\u0442 \u043C\u043E\u0434\u0435\u043B\u0438";
}
async function advance(gen) {
  if (gen.stage === "gen") {
    for (const j of gen.jobs) await pollJob(j, imagesOf);
    if (gen.jobs.some((j) => j.status === "working")) {
      const q = gen.jobs.find((j) => j.queue != null);
      return q ? { state: "queue", position: q.queue } : { state: "working" };
    }
    gen.raw = gen.jobs.flatMap((j) => j.images || []).slice(0, gen.count);
    if (!gen.raw.length) {
      gen.stage = "failed";
      gen.error = gen.jobs.map((j) => j.error).filter(Boolean).join("; ") || "\u043D\u0435\u0442 \u0441\u043D\u0438\u043C\u043A\u043E\u0432";
      faces.delete(gen.id);
      return { state: "failed" };
    }
    const face = faces.get(gen.id);
    if (gen.swap && face) {
      gen.swapJobs = [];
      for (const target of gen.raw) {
        const r = await submit2(FACE_SWAP.endpoint, FACE_SWAP.input({ face, target, gender: gen.swap.gender, hair: gen.swap.hair }));
        gen.swapJobs.push(r.ok && r.data.request_id ? { status: "working", statusUrl: r.data.status_url, responseUrl: r.data.response_url, images: [] } : { status: "failed", error: falError(r.status, r.data).admin });
      }
      gen.stage = "swap";
      return { state: "refining" };
    }
    gen.images = gen.raw;
    gen.stage = "done";
    faces.delete(gen.id);
    return { state: "done" };
  }
  if (gen.stage === "swap") {
    for (const j of gen.swapJobs) await pollJob(j, imagesOf);
    if (gen.swapJobs.some((j) => j.status === "working")) return { state: "refining" };
    gen.images = gen.raw.map((u, i) => gen.swapJobs[i]?.images?.[0] || u);
    gen.swapFailed = gen.swapJobs.filter((j) => j.status === "failed").length;
    gen.stage = "done";
    faces.delete(gen.id);
    return { state: "done" };
  }
  return { state: gen.stage === "done" ? "done" : "failed" };
}
var dropFace = (id) => faces.delete(id);

// src/server.mjs
function modelSettings() {
  const m = db.settings.models || {};
  const ids = MODELS.map((x) => x.id);
  const enabled = (m.enabled || ["nano_pro", "nano2", "seedream45"]).filter((id) => ids.includes(id));
  const def = enabled.includes(m.default) ? m.default : enabled[0] || "nano_pro";
  return { enabled: enabled.length ? enabled : ["nano_pro"], default: def, credits: m.credits || {} };
}
function faceSwapSettings() {
  const f = db.settings.faceSwap || {};
  return { enabled: f.enabled !== false, hair: f.hair === "target_hair" ? "target_hair" : "user_hair" };
}
var { UserError: UserError2 } = fal_exports;
var BRAND = process.env.STUDIO_NAME || "Portretto";
var CONTACT = process.env.CONTACT_EMAIL || "";
var MAX_VARIANTS = 4;
var ROOT = path3.dirname(fileURLToPath(import.meta.url));
var PUBLIC = fs3.existsSync(path3.join(ROOT, "public", "index.html")) ? path3.join(ROOT, "public") : ROOT;
var PORT = process.env.PORT || 3e3;
var json = (res2, data, status = 200) => {
  res2.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res2.end(JSON.stringify(data));
};
async function readBody(req, limit = 8e6) {
  const chunks = [];
  let size2 = 0;
  for await (const c of req) {
    size2 += c.length;
    if (size2 > limit) throw new UserError2("\u0424\u043E\u0442\u043E \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u0438\u0435. \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 \u0441\u043D\u0438\u043C\u043A\u043E\u0432.", 413);
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString("utf8");
}
var parse = (raw) => {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new UserError2("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441.");
  }
};
var origin = (req) => (process.env.PUBLIC_URL || `${req.headers["x-forwarded-proto"] || "http"}://${req.headers["x-forwarded-host"] || req.headers.host}`).replace(/\/$/, "");
var lang = (v) => v === "en" ? "en" : "ru";
var packs = () => db.settings.packs;
var currency = () => db.settings.currency || "eur";
function clientKey(req, required = true) {
  const k = normKey(req.headers["x-key"]);
  const rec = db.keys[k];
  if (!rec) {
    if (required) throw new UserError2("\u041A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043E\u0434 \u0438\u043B\u0438 \u043A\u0443\u043F\u0438\u0442\u0435 \u043F\u0430\u043A\u0435\u0442.", 401);
    return null;
  }
  return { key: k, rec };
}
function isAdmin(req) {
  const pass = process.env.ADMIN_PASSWORD || "";
  const got = String(req.headers["x-admin"] || "");
  if (!pass) throw new UserError2("\u0410\u0434\u043C\u0438\u043D\u043A\u0430 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u0430: \u0437\u0430\u0434\u0430\u0439\u0442\u0435 ADMIN_PASSWORD \u0432 Railway \u2192 Variables.", 403);
  const a = crypto3.createHash("sha256").update(pass).digest();
  const b = crypto3.createHash("sha256").update(got).digest();
  if (!crypto3.timingSafeEqual(a, b)) throw new UserError2("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C.", 401);
}
function fulfill(session) {
  if (!session || session.payment_status !== "paid") return null;
  const existing = db.orders.find((o) => o.id === session.id);
  if (existing) return { key: existing.key, added: 0, credits: db.keys[existing.key]?.credits ?? 0 };
  const credits = parseInt(session.metadata?.credits, 10) || 0;
  let key = normKey(session.metadata?.key);
  const email = session.customer_details?.email || session.customer_email || "";
  if (!db.keys[key]) {
    key = newKey();
    db.keys[key] = { credits: 0, spent: 0, email, created: Date.now(), source: "stripe", note: "" };
  }
  db.keys[key].credits += credits;
  if (email && !db.keys[key].email) db.keys[key].email = email;
  db.orders.unshift({
    id: session.id,
    key,
    email,
    pack: session.metadata?.pack || "",
    credits,
    amount: (session.amount_total || 0) / 100,
    currency: session.currency || currency(),
    created: Date.now()
  });
  save();
  return { key, added: credits, credits: db.keys[key].credits };
}
function refund(gen, reason) {
  if (gen.refunded) return;
  const rec = db.keys[gen.key];
  const back = gen.count * (gen.unit || 1);
  if (rec) {
    rec.credits += back;
    rec.spent = Math.max(0, (rec.spent || 0) - back);
  }
  dropFace(gen.id);
  gen.refunded = true;
  gen.status = "failed";
  gen.error = reason;
  save();
}
var routes = {
  "GET /api/config": async (req, res2) => json(res2, {
    brand: BRAND,
    contact: CONTACT,
    currency: currency(),
    maxVariants: MAX_VARIANTS,
    stripe: stripeEnabled(),
    packs: packs(),
    styles: STYLES.map(({ id, name, desc, light, swatch, custom }) => ({ id, name, desc, light, swatch, custom: !!custom })),
    formats: FORMATS,
    covers: db.settings.covers || {},
    models: modelSettings().enabled.map((id) => {
      const m = modelById(id);
      return { id, name: m.name, desc: m.desc, credits: modelSettings().credits[id] ?? m.credits };
    }),
    defaultModel: modelSettings().default,
    faceSwap: faceSwapSettings().enabled
  }),
  "GET /api/showcase": async (req, res2) => {
    const items = [];
    for (const g of db.gens) for (const url of g.showcase || []) items.push({ url, style: g.style, format: g.format });
    json(res2, items.slice(0, 24));
  },
  "GET /api/balance": async (req, res2) => {
    const { key, rec } = clientKey(req);
    json(res2, { key, credits: rec.credits });
  },
  "GET /api/my": async (req, res2) => {
    const { key } = clientKey(req);
    const list = db.gens.filter((g) => g.key === key && g.status === "done").slice(0, 60).map((g) => ({ id: g.id, style: g.style, format: g.format, images: g.images, created: g.created }));
    json(res2, list);
  },
  "POST /api/checkout": async (req, res2) => {
    if (!stripeEnabled()) throw new UserError2("\u041E\u043F\u043B\u0430\u0442\u0430 \u0435\u0449\u0451 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430.", 503);
    const body = parse(await readBody(req));
    const pack = packs().find((p) => p.id === body.pack);
    if (!pack) throw new UserError2("\u041F\u0430\u043A\u0435\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.");
    const key = db.keys[normKey(body.key)] ? normKey(body.key) : "";
    const s = await createCheckout({ pack, currency: currency(), key, origin: origin(req), lang: lang(body.lang), brand: BRAND });
    json(res2, { url: s.url });
  },
  "GET /api/checkout/confirm": async (req, res2, url) => {
    const id = url.searchParams.get("session_id") || "";
    if (!/^cs_[\w]+$/.test(id)) throw new UserError2("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043F\u043B\u0430\u0442\u0451\u0436.");
    const s = await retrieveSession(id);
    const r = fulfill(s);
    if (!r) throw new UserError2("\u041F\u043B\u0430\u0442\u0451\u0436 \u0435\u0449\u0451 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043D\u0443\u0442\u0443.", 402);
    json(res2, r);
  },
  "POST /api/stripe/webhook": async (req, res2) => {
    const raw = await readBody(req, 1e6);
    const event = verifyWebhook(raw, req.headers["stripe-signature"]);
    if (!event) return json(res2, { error: "bad signature" }, 400);
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") fulfill(event.data.object);
    json(res2, { received: true });
  },
  "POST /api/generate": async (req, res2) => {
    const { key, rec } = clientKey(req);
    const body = parse(await readBody(req));
    const photos = Array.isArray(body.photos) ? body.photos.slice(0, 3) : [];
    if (!photos.length) throw new UserError2("\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E \u0444\u043E\u0442\u043E.");
    if (!photos.every((p) => typeof p === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p))) throw new UserError2("\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0444\u043E\u0442\u043E JPG, PNG \u0438\u043B\u0438 WEBP.");
    const style = STYLES.find((s) => s.id === body.style);
    if (!style) throw new UserError2("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0431\u0440\u0430\u0437.");
    const format = FORMATS.find((f) => f.id === body.format)?.id || "4:5";
    const count = Math.min(MAX_VARIANTS, Math.max(1, parseInt(body.count, 10) || 1));
    const wishes = typeof body.wishes === "string" ? body.wishes.trim().slice(0, 600) : "";
    if (style.custom && wishes.length < 8) throw new UserError2("\u041E\u043F\u0438\u0448\u0438\u0442\u0435 \u0441\u0432\u043E\u0439 \u043E\u0431\u0440\u0430\u0437 \u0445\u043E\u0442\u044F \u0431\u044B \u043F\u0430\u0440\u043E\u0439 \u0444\u0440\u0430\u0437.");
    const ms = modelSettings();
    const modelId = ms.enabled.includes(body.model) ? body.model : ms.default;
    const model = modelById(modelId);
    const unit = ms.credits[modelId] ?? model.credits;
    const fs_ = faceSwapSettings();
    const useSwap = fs_.enabled && body.swap !== false;
    const gender = ["male", "female", "non-binary"].includes(body.gender) ? body.gender : "";
    if (useSwap && !gender) throw new UserError2("\u0423\u043A\u0430\u0436\u0438\u0442\u0435, \u043A\u0442\u043E \u043D\u0430 \u0444\u043E\u0442\u043E: \u043C\u0443\u0436\u0447\u0438\u043D\u0430 \u0438\u043B\u0438 \u0436\u0435\u043D\u0449\u0438\u043D\u0430. \u042D\u0442\u043E \u043D\u0443\u0436\u043D\u043E \u0434\u043B\u044F \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0441\u0445\u043E\u0434\u0441\u0442\u0432\u0430.");
    const cost = count * unit;
    if (rec.credits < cost) throw new UserError2(rec.credits ? `\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043A\u0440\u0435\u0434\u0438\u0442\u043E\u0432: \u043D\u0443\u0436\u043D\u043E ${cost}, \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C ${rec.credits}. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432 \u0438\u043B\u0438 \u043F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0431\u0430\u043B\u0430\u043D\u0441.` : "\u041A\u0440\u0435\u0434\u0438\u0442\u044B \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0438\u0441\u044C. \u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0431\u0430\u043B\u0430\u043D\u0441.", 402);
    rec.credits -= cost;
    rec.spent = (rec.spent || 0) + cost;
    const gen = { id: newId(), key, style: style.id, format, count, unit, model: modelId, swapOn: useSwap, text: wishes, status: "queued", images: [], created: Date.now(), showcase: [] };
    db.gens.unshift(gen);
    if (db.gens.length > 5e3) db.gens.length = 5e3;
    save();
    try {
      const err = await start(gen, { prompt: buildPrompt(style, wishes), photos, resolution: RESOLUTION, swap: useSwap ? { gender, hair: fs_.hair } : null });
      if (err) {
        refund(gen, err.admin);
        throw new UserError2(err.msg, 502);
      }
      save();
    } catch (e) {
      if (!gen.refunded) refund(gen, e.message);
      throw e;
    }
    json(res2, { job: gen.id, credits: rec.credits });
  },
  "POST /api/status": async (req, res2) => {
    const { key } = clientKey(req);
    const body = parse(await readBody(req));
    const gen = db.gens.find((g) => g.id === body.job && g.key === key);
    if (!gen) throw new UserError2("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
    const credits = () => db.keys[key].credits;
    if (gen.status === "done") return json(res2, { state: "done", images: gen.images, credits: credits() });
    if (gen.status === "failed") return json(res2, { state: "failed", error: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u043E\u0440\u0442\u0440\u0435\u0442. \u041A\u0440\u0435\u0434\u0438\u0442\u044B \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u044B.", credits: credits() });
    const r = await advance(gen);
    if (r.state === "failed") {
      refund(gen, gen.error);
      return json(res2, { state: "failed", error: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u043E\u0440\u0442\u0440\u0435\u0442. \u041A\u0440\u0435\u0434\u0438\u0442\u044B \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u044B, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437 \u0438\u043B\u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u0443\u044E \u043C\u043E\u0434\u0435\u043B\u044C.", credits: credits() });
    }
    if (r.state === "done") {
      const missing = gen.count - gen.images.length;
      if (missing > 0) {
        db.keys[key].credits += missing * gen.unit;
        gen.count = gen.images.length;
      }
      gen.status = "done";
      gen.done = Date.now();
      save();
      return json(res2, { state: "done", images: gen.images, credits: credits() });
    }
    save();
    json(res2, { ...r, credits: credits() });
  },
  "GET /api/admin/models": async (req, res2) => {
    isAdmin(req);
    json(res2, { models: MODELS.map(({ id, name, desc, endpoint, cost, credits }) => ({ id, name: name.ru, desc: desc.ru, endpoint, cost, credits })), settings: modelSettings(), faceSwap: faceSwapSettings(), swapCost: FACE_SWAP.cost });
  },
  "POST /api/admin/models": async (req, res2) => {
    isAdmin(req);
    const b = parse(await readBody(req));
    const ids = MODELS.map((m) => m.id);
    const enabled = (Array.isArray(b.enabled) ? b.enabled : []).filter((id) => ids.includes(id));
    if (!enabled.length) throw new UserError2("\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u0443 \u043C\u043E\u0434\u0435\u043B\u044C.");
    const def = enabled.includes(b.default) ? b.default : enabled[0];
    const credits = {};
    for (const id of ids) credits[id] = Math.max(1, Math.min(20, parseInt(b.credits?.[id], 10) || modelById(id).credits));
    db.settings.models = { enabled, default: def, credits };
    db.settings.faceSwap = { enabled: !!b.faceSwap?.enabled, hair: b.faceSwap?.hair === "target_hair" ? "target_hair" : "user_hair" };
    save();
    json(res2, { settings: db.settings.models, faceSwap: db.settings.faceSwap });
  },
  "GET /api/health": async (req, res2) => {
    const p = await probe();
    json(res2, {
      fal: p.text,
      falOk: p.ok,
      model: MODEL,
      stripe: stripeEnabled() ? "\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D" : "\u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D (STRIPE_SECRET_KEY)",
      webhook: webhookEnabled() ? "\u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D" : "\u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D (STRIPE_WEBHOOK_SECRET)",
      storage: PERSISTENT ? `\u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F (${DATA_DIR})` : "\u0412\u041D\u0418\u041C\u0410\u041D\u0418\u0415: Volume \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D, \u0434\u0430\u043D\u043D\u044B\u0435 \u043F\u0440\u043E\u043F\u0430\u0434\u0443\u0442 \u043F\u0440\u0438 \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u043A\u0435",
      admin: process.env.ADMIN_PASSWORD ? "\u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0430" : "\u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u0430 (ADMIN_PASSWORD)"
    });
  },
  // ---------- admin ----------
  "GET /api/admin/stats": async (req, res2) => {
    isAdmin(req);
    const DAY = 864e5;
    const start2 = /* @__PURE__ */ new Date();
    start2.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const from = start2.getTime() - i * DAY, to = from + DAY;
      const gs = db.gens.filter((g) => g.created >= from && g.created < to && g.status === "done");
      const os = db.orders.filter((o) => o.created >= from && o.created < to);
      days.push({ day: from, portraits: gs.reduce((s, g) => s + g.images.length, 0), revenue: os.reduce((s, o) => s + o.amount, 0), orders: os.length });
    }
    const done = db.gens.filter((g) => g.status === "done");
    const portraits = done.reduce((s, g) => s + g.images.length, 0);
    const since = (ms) => db.orders.filter((o) => o.created >= Date.now() - ms);
    const sum = (a) => a.reduce((s, o) => s + o.amount, 0);
    const styleCount = {};
    for (const g of done) styleCount[g.style] = (styleCount[g.style] || 0) + g.images.length;
    const p = await probe();
    json(res2, {
      brand: BRAND,
      currency: currency(),
      days,
      today: { portraits: days[13].portraits, revenue: days[13].revenue, orders: days[13].orders },
      revenue7: sum(since(7 * DAY)),
      revenue30: sum(since(30 * DAY)),
      revenueAll: sum(db.orders),
      orders: db.orders.length,
      portraits,
      failed: db.gens.filter((g) => g.status === "failed").length,
      falCost: +done.reduce((sum2, g) => sum2 + g.images.length * ((modelById(g.model)?.cost ?? COST_PER_IMAGE) + (g.swapOn ? FACE_SWAP.cost : 0)), 0).toFixed(2),
      costPerImage: COST_PER_IMAGE,
      creditsOutstanding: Object.values(db.keys).reduce((s, k) => s + k.credits, 0),
      clients: Object.keys(db.keys).length,
      styles: STYLES.map((s) => ({ id: s.id, name: s.name.ru, count: styleCount[s.id] || 0 })).sort((a, b) => b.count - a.count),
      system: {
        fal: p.text,
        falOk: p.ok,
        model: MODEL,
        stripe: stripeEnabled(),
        webhook: webhookEnabled(),
        persistent: PERSISTENT,
        dataDir: DATA_DIR
      }
    });
  },
  "GET /api/admin/gens": async (req, res2) => {
    isAdmin(req);
    json(res2, db.gens.slice(0, 120).map(({ statusUrl, responseUrl, ...g }) => ({ ...g, email: db.keys[g.key]?.email || "" })));
  },
  "POST /api/admin/showcase": async (req, res2) => {
    isAdmin(req);
    const { gen: id, url, on } = parse(await readBody(req));
    const g = db.gens.find((x) => x.id === id);
    if (!g || !g.images.includes(url)) throw new UserError2("\u0421\u043D\u0438\u043C\u043E\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.", 404);
    g.showcase = (g.showcase || []).filter((u) => u !== url);
    if (on) g.showcase.push(url);
    save();
    json(res2, { ok: true, showcase: g.showcase });
  },
  "GET /api/admin/covers": async (req, res2) => {
    isAdmin(req);
    json(res2, await pollCovers());
  },
  "POST /api/admin/covers/generate": async (req, res2) => {
    isAdmin(req);
    const { ids } = parse(await readBody(req));
    await startCovers(Array.isArray(ids) && ids.length ? ids : null);
    json(res2, coverState());
  },
  "POST /api/admin/covers/upload": async (req, res2) => {
    isAdmin(req);
    const { style, image } = parse(await readBody(req));
    await uploadCover(style, image);
    json(res2, coverState());
  },
  "POST /api/admin/covers/remove": async (req, res2) => {
    isAdmin(req);
    const { style } = parse(await readBody(req));
    removeCover(style);
    json(res2, coverState());
  },
  "GET /api/admin/orders": async (req, res2) => {
    isAdmin(req);
    json(res2, db.orders.slice(0, 300));
  },
  "GET /api/admin/keys": async (req, res2) => {
    isAdmin(req);
    json(res2, Object.entries(db.keys).map(([key, v]) => ({ key, ...v })).sort((a, b) => b.created - a.created).slice(0, 500));
  },
  "POST /api/admin/keys": async (req, res2) => {
    isAdmin(req);
    const { credits, note, email } = parse(await readBody(req));
    const c = Math.max(0, Math.min(1e4, parseInt(credits, 10) || 0));
    if (!c) throw new UserError2("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043A\u0440\u0435\u0434\u0438\u0442\u043E\u0432.");
    const key = newKey();
    db.keys[key] = { credits: c, spent: 0, email: String(email || "").slice(0, 120), created: Date.now(), source: "promo", note: String(note || "").slice(0, 120) };
    save();
    json(res2, { key, ...db.keys[key] });
  },
  "POST /api/admin/keys/adjust": async (req, res2) => {
    isAdmin(req);
    const { key, delta } = parse(await readBody(req));
    const rec = db.keys[normKey(key)];
    if (!rec) throw new UserError2("\u041A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.", 404);
    rec.credits = Math.max(0, rec.credits + (parseInt(delta, 10) || 0));
    save();
    json(res2, { key: normKey(key), credits: rec.credits });
  },
  "POST /api/admin/packs": async (req, res2) => {
    isAdmin(req);
    const { packs: list, currency: cur } = parse(await readBody(req));
    if (!Array.isArray(list) || !list.length || list.length > 6) throw new UserError2("\u041D\u0443\u0436\u043D\u043E \u043E\u0442 1 \u0434\u043E 6 \u043F\u0430\u043A\u0435\u0442\u043E\u0432.");
    db.settings.packs = list.map((p, i) => ({
      id: String(p.id || `pack${i}`).replace(/[^\w-]/g, "").slice(0, 20) || `pack${i}`,
      credits: Math.max(1, parseInt(p.credits, 10) || 1),
      price: Math.max(0.5, Math.round((parseFloat(p.price) || 1) * 100) / 100),
      name: { ru: String(p.name?.ru || "").slice(0, 40) || "\u041F\u0430\u043A\u0435\u0442", en: String(p.name?.en || "").slice(0, 40) || "Pack" },
      popular: Boolean(p.popular)
    }));
    if (["eur", "usd", "gbp"].includes(cur)) db.settings.currency = cur;
    save();
    json(res2, { packs: db.settings.packs, currency: db.settings.currency });
  },
  // Редактор для владельца: свободный запрос к любой модели fal.ai
  "POST /api/editor": async (req, res2) => {
    isAdmin(req);
    const body = parse(await readBody(req));
    let r;
    if (body.action === "submit") {
      if (!/^[\w-]+\/[\w\-./]+$/.test(body.endpoint || "") || body.endpoint.includes("..")) throw new UserError2("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C.");
      if (body.input?.num_images > 4) body.input.num_images = 4;
      r = await falFetch(`https://queue.fal.run/${body.endpoint}`, { method: "POST", body: JSON.stringify(body.input || {}) });
    } else if (body.action === "get") {
      if (!/^https:\/\/queue\.fal\.run\/[\w\-./]+\/requests\/[\w-]+(\/status)?(\?logs=1)?$/.test(body.url || "")) throw new UserError2("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u0437\u0430\u0434\u0430\u0447\u0438.");
      r = await falFetch(body.url);
    } else throw new UserError2("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435.");
    json(res2, r.data, r.status);
  }
};
var TYPES = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp" };
var PAGES = { "/": "index.html", "/admin": "admin.html", "/editor": "editor.html" };
function serveStatic(res2, pathname) {
  let name = PAGES[pathname] || pathname.replace(/^\/+/, "");
  if (!/^[\w.-]+\.(html|png|jpe?g|svg|ico|webp)$/i.test(name)) name = "index.html";
  let file = path3.join(PUBLIC, name);
  if (!fs3.existsSync(file)) file = path3.join(PUBLIC, "index.html");
  res2.writeHead(200, { "content-type": TYPES[path3.extname(file).toLowerCase()] || "application/octet-stream", "x-content-type-options": "nosniff" });
  fs3.createReadStream(file).pipe(res2);
}
http.createServer(async (req, res2) => {
  const url = new URL(req.url, "http://x");
  const handler = routes[`${req.method} ${url.pathname}`];
  try {
    if (handler) return await handler(req, res2, url);
    if (url.pathname.startsWith("/api/")) return json(res2, { error: "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" }, 404);
    if (url.pathname.startsWith("/covers/") && serveCover(res2, url.pathname.slice(8))) return;
    serveStatic(res2, url.pathname);
  } catch (e) {
    if (!(e instanceof UserError2)) console.error(e);
    if (!res2.headersSent) json(res2, { error: e instanceof UserError2 ? e.message : "\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u044F\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437." }, e.status || 500);
  }
}).listen(PORT, () => console.log(`${BRAND}: \u0441\u0442\u0443\u0434\u0438\u044F \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430 \u043D\u0430 \u043F\u043E\u0440\u0442\u0443 ${PORT}. \u0414\u0430\u043D\u043D\u044B\u0435: ${DATA_DIR}${PERSISTENT ? "" : " (Volume \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D!)"}`));
setInterval(() => {
  if (Object.values(db.coverJobs || {}).some((j) => j.status === "working")) pollCovers().catch(() => {
  });
}, 5e3);
