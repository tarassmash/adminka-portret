// Portretto: сервер собран в один файл.
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server.mjs
import http from "node:http";
import fs5 from "node:fs";
import path5 from "node:path";
import crypto4 from "node:crypto";
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
async function stripe(method, path6, body) {
  const res2 = await fetch(STRIPE_API + path6, {
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
function verifyWebhook(raw, header2) {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret || !header2) return null;
  const parts = Object.fromEntries(header2.split(",").map((p) => p.split("=")));
  const t = parts.t;
  const sigs = header2.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
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
  const list2 = coverStyles().filter((s) => !ids || ids.includes(s.id));
  const results = [];
  for (const s of list2) {
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
  const list2 = data?.images || (data?.image ? [data.image] : []);
  return list2.map((i) => typeof i === "string" ? i : i?.url).filter(Boolean);
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

// src/examples.mjs
import fs3 from "node:fs";
import path3 from "node:path";
var { UserError: UserError2 } = fal_exports;
var EX_DIR = path3.join(DATA_DIR, "examples");
var SELFIE_MODEL = process.env.FAL_COVER_MODEL || "fal-ai/nano-banana-pro";
var TIMEOUT = 10 * 60 * 1e3;
fs3.mkdirSync(EX_DIR, { recursive: true });
db.examples ||= [];
var AUTO_SET = [
  { style: "business", gender: "male", person: "a man in his late 30s with short brown hair and a light beard" },
  { style: "editorial", gender: "female", person: "a woman in her late 20s with long dark wavy hair" },
  { style: "golden_hour", gender: "female", person: "a woman in her early 40s with shoulder-length blonde hair and freckles" },
  { style: "bw_classic", gender: "male", person: "a man in his mid 50s with short grey hair and rectangular glasses" }
];
function selfiePrompt(person) {
  return [
    `A casual, ordinary smartphone selfie of ${person}.`,
    "The person is fictional, not a real or famous person.",
    "Taken at arm's length at home: mixed warm indoor light, slightly soft phone-camera focus, everyday clothes, a plain wall or kitchen behind, natural relaxed expression, no makeup look, no professional lighting, no retouching.",
    "A realistic amateur phone photo with the face clearly visible and facing the camera, vertical framing."
  ].join(" ");
}
var extOf = (type) => /png/.test(type) ? "png" : /webp/.test(type) ? "webp" : "jpg";
function writeImg(name, buf, type) {
  for (const f of fs3.readdirSync(EX_DIR)) if (f.startsWith(name + ".")) fs3.rmSync(path3.join(EX_DIR, f), { force: true });
  const file = `${name}.${extOf(type)}`;
  fs3.writeFileSync(path3.join(EX_DIR, file), buf);
  return `/examples/${file}?v=${Date.now()}`;
}
var fileOf = (urlPath) => path3.join(EX_DIR, urlPath.replace(/^\/examples\//, "").replace(/\?.*$/, ""));
function beforeDataUrl(ex) {
  const f = fileOf(ex.before);
  const type = f.endsWith(".png") ? "image/png" : f.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return `data:${type};base64,${fs3.readFileSync(f).toString("base64")}`;
}
async function download(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u0441\u043D\u0438\u043C\u043E\u043A");
  return { buf: Buffer.from(await r.arrayBuffer()), type: r.headers.get("content-type") || "" };
}
function fail(ex, err) {
  ex.status = "failed";
  ex.error = String(err || "\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C").slice(0, 300);
  if (ex.gen) dropFace(ex.gen.id);
  delete ex.gen;
  delete ex.selfieJob;
}
var find = (id) => {
  const ex = db.examples.find((e) => e.id === id);
  if (!ex) throw new UserError2("\u041F\u0440\u0438\u043C\u0435\u0440 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.", 404);
  return ex;
};
async function startSelfie(ex) {
  const url = `https://queue.fal.run/${SELFIE_MODEL}`;
  const input = { prompt: selfiePrompt(ex.person), num_images: 1, output_format: "jpeg", aspect_ratio: "3:4", resolution: "1K" };
  let r = await falFetch(url, { method: "POST", body: JSON.stringify(input) });
  if (r.status === 422) r = await falFetch(url, { method: "POST", body: JSON.stringify({ prompt: input.prompt, num_images: 1 }) });
  if (!r.ok || !r.data.request_id) return fail(ex, falError(r.status, r.data).admin);
  ex.status = "selfie";
  ex.error = "";
  ex.started = Date.now();
  ex.selfieJob = { statusUrl: r.data.status_url, responseUrl: r.data.response_url };
}
async function startPortrait(ex) {
  const style = STYLES.find((s) => s.id === ex.style);
  ex.gen = { id: newId(), model: ex.model, count: 1, format: ex.format };
  const err = await start(ex.gen, {
    prompt: buildPrompt(style, ex.text),
    photos: [beforeDataUrl(ex)],
    resolution: RESOLUTION,
    swap: ex.swap ? { gender: ex.gender, hair: "user_hair" } : null
  });
  if (err) return fail(ex, err.admin);
  ex.status = "working";
  ex.error = "";
  ex.started = Date.now();
}
var DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
var parseImg = (v, msg) => {
  const m = DATA_URL.exec(v || "");
  if (!m) throw new UserError2(msg);
  return { buf: Buffer.from(m[2], "base64"), type: m[1] };
};
async function create(o) {
  const style = STYLES.find((s) => s.id === o.style);
  if (!style) throw new UserError2("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0431\u0440\u0430\u0437.");
  const source = ["upload", "pair"].includes(o.source) ? o.source : "ai";
  const caption = String(o.caption || "").trim().slice(0, 60);
  if (source === "pair") {
    const b = parseImg(o.image, "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u043E\u0442\u043E \xAB\u0434\u043E\xBB (JPG, PNG \u0438\u043B\u0438 WEBP).");
    const a = parseImg(o.imageAfter, "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u043E\u0442\u043E \xAB\u043F\u043E\u0441\u043B\u0435\xBB (JPG, PNG \u0438\u043B\u0438 WEBP).");
    const ex2 = {
      id: newId(),
      source,
      caption,
      person: "",
      gender: "",
      style: style.id,
      text: "",
      model: "",
      format: "4:5",
      swap: false,
      publishOnDone: false,
      published: o.publish !== false,
      status: "done",
      error: "",
      before: "",
      after: "",
      created: Date.now()
    };
    ex2.before = writeImg(`${ex2.id}-before`, b.buf, b.type);
    ex2.after = writeImg(`${ex2.id}-after`, a.buf, a.type);
    db.examples.unshift(ex2);
    save();
    return ex2;
  }
  const text = String(o.text || "").trim().slice(0, 600);
  if (style.custom && text.length < 8) throw new UserError2("\u0414\u043B\u044F \xAB\u0421\u0432\u043E\u0435\u0433\u043E \u043E\u0431\u0440\u0430\u0437\u0430\xBB \u043E\u043F\u0438\u0448\u0438\u0442\u0435 \u0441\u0446\u0435\u043D\u0443 \u0445\u043E\u0442\u044F \u0431\u044B \u043F\u0430\u0440\u043E\u0439 \u0444\u0440\u0430\u0437.");
  const swap = o.swap !== false;
  const gender = ["male", "female", "non-binary"].includes(o.gender) ? o.gender : "";
  if (swap && !gender) throw new UserError2("\u0414\u043B\u044F \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0441\u0445\u043E\u0434\u0441\u0442\u0432\u0430 \u0443\u043A\u0430\u0436\u0438\u0442\u0435 \u043F\u043E\u043B \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430 \u043D\u0430 \u0444\u043E\u0442\u043E.");
  const ex = {
    id: newId(),
    source,
    caption,
    person: "",
    gender,
    style: style.id,
    text,
    model: modelById(o.model) ? o.model : "nano_pro",
    format: FORMATS.find((f) => f.id === o.format)?.id || "4:5",
    swap,
    publishOnDone: o.publish !== false,
    published: false,
    status: "",
    error: "",
    before: "",
    after: "",
    created: Date.now()
  };
  if (ex.source === "upload") {
    const b = parseImg(o.image, "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u043E\u0442\u043E \xAB\u0434\u043E\xBB (JPG, PNG \u0438\u043B\u0438 WEBP).");
    ex.before = writeImg(`${ex.id}-before`, b.buf, b.type);
    db.examples.unshift(ex);
    await startPortrait(ex);
  } else {
    ex.person = String(o.person || "").trim().slice(0, 200);
    if (ex.person.length < 5) throw new UserError2("\u041E\u043F\u0438\u0448\u0438\u0442\u0435 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430 \u0434\u043B\u044F \u0441\u0435\u043B\u0444\u0438, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440: \xAB\u0436\u0435\u043D\u0449\u0438\u043D\u0430 30 \u043B\u0435\u0442, \u0442\u0451\u043C\u043D\u044B\u0435 \u043A\u0443\u0434\u0440\u044F\u0432\u044B\u0435 \u0432\u043E\u043B\u043E\u0441\u044B\xBB.");
    db.examples.unshift(ex);
    await startSelfie(ex);
  }
  save();
  return ex;
}
async function autoSet({ model, publish }) {
  for (const p of AUTO_SET) await create({ ...p, source: "ai", model, swap: true, format: "4:5", publish: publish !== false });
}
async function retry(id) {
  const ex = find(id);
  if (ex.status === "selfie" || ex.status === "working") throw new UserError2("\u042D\u0442\u043E\u0442 \u043F\u0440\u0438\u043C\u0435\u0440 \u0435\u0449\u0451 \u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0435\u0442\u0441\u044F.");
  if (ex.source === "pair") throw new UserError2("\u042D\u0442\u043E \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u0430\u044F \u043F\u0430\u0440\u0430: \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u043C\u0435\u043D\u044F\u0442\u044C \u0444\u043E\u0442\u043E, \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u044C \xAB\u0434\u043E\xBB\xBB \u0438\u043B\u0438 \xAB\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u044C \xAB\u043F\u043E\u0441\u043B\u0435\xBB\xBB.");
  ex.publishOnDone = ex.published;
  if (ex.before) await startPortrait(ex);
  else if (ex.source === "ai") await startSelfie(ex);
  else throw new UserError2("\u041D\u0435\u0442 \u0444\u043E\u0442\u043E \xAB\u0434\u043E\xBB. \u0423\u0434\u0430\u043B\u0438\u0442\u0435 \u043F\u0440\u0438\u043C\u0435\u0440 \u0438 \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E.");
  save();
}
function replace(id, which, image) {
  const ex = find(id);
  if (ex.status === "selfie" || ex.status === "working") throw new UserError2("\u0414\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438.");
  if (which !== "before" && which !== "after") throw new UserError2("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441.");
  const img = parseImg(image, "\u041D\u0443\u0436\u043D\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 JPG, PNG \u0438\u043B\u0438 WEBP.");
  ex[which] = writeImg(`${ex.id}-${which}`, img.buf, img.type);
  if (which === "before" && ex.source === "ai") {
    ex.source = "upload";
    ex.person = "";
  }
  if (ex.before && ex.after) {
    ex.status = "done";
    ex.error = "";
  }
  save();
}
function setCaption(id, caption) {
  find(id).caption = String(caption || "").trim().slice(0, 60);
  save();
}
function update(id, { published: published2 }) {
  const ex = find(id);
  if (published2 && ex.status !== "done" && !ex.after) throw new UserError2("\u041F\u0440\u0438\u043C\u0435\u0440 \u0435\u0449\u0451 \u043D\u0435 \u0433\u043E\u0442\u043E\u0432.");
  ex.published = !!published2;
  save();
}
function remove(id) {
  const ex = find(id);
  if (ex.gen) dropFace(ex.gen.id);
  for (const f of fs3.readdirSync(EX_DIR)) if (f.startsWith(id + "-")) fs3.rmSync(path3.join(EX_DIR, f), { force: true });
  db.examples = db.examples.filter((e) => e.id !== id);
  save();
}
var running = null;
function poll() {
  if (!running) running = step().finally(() => {
    running = null;
  });
  return running;
}
async function step() {
  for (const ex of db.examples) {
    try {
      if (ex.status === "selfie") {
        const st = await falFetch(ex.selfieJob.statusUrl);
        if (!st.ok) {
          if (st.status < 500) fail(ex, falError(st.status, st.data).admin);
          continue;
        }
        if (st.data.status === "COMPLETED") {
          const out = await falFetch(ex.selfieJob.responseUrl);
          const img = out.ok ? (out.data.images || [])[0] : null;
          const src = typeof img === "string" ? img : img?.url;
          if (!src) {
            fail(ex, out.ok ? "\u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u0441\u0435\u043B\u0444\u0438" : falError(out.status, out.data).admin);
            continue;
          }
          const d = await download(src);
          ex.before = writeImg(`${ex.id}-before`, d.buf, d.type);
          delete ex.selfieJob;
          await startPortrait(ex);
        }
      } else if (ex.status === "working") {
        const r = await advance(ex.gen);
        if (r.state === "failed") {
          fail(ex, ex.gen.error);
          continue;
        }
        if (r.state === "done") {
          const d = await download(ex.gen.images[0]);
          ex.after = writeImg(`${ex.id}-after`, d.buf, d.type);
          ex.status = "done";
          ex.error = "";
          if (ex.publishOnDone) ex.published = true;
          delete ex.gen;
        }
      }
      if ((ex.status === "selfie" || ex.status === "working") && Date.now() - ex.started > TIMEOUT) fail(ex, "\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043E\u043B\u0433\u043E, \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437");
    } catch (e) {
      fail(ex, e.message);
    }
  }
  save();
  return list();
}
var busy = () => db.examples.some((e) => e.status === "selfie" || e.status === "working");
var list = () => db.examples.map(({ gen, selfieJob, ...e }) => e);
var publicList = () => db.examples.filter((e) => e.published && e.before && e.after).slice(0, 12).map((e) => ({ id: e.id, style: e.style, caption: e.caption || "", before: e.before, after: e.after, ai: e.source === "ai" }));
function serve(res2, name) {
  if (!/^[a-f0-9]{16}-(before|after)\.(jpg|png|webp)$/.test(name)) return false;
  const file = path3.join(EX_DIR, name);
  if (!fs3.existsSync(file)) return false;
  const type = name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg";
  res2.writeHead(200, { "content-type": type, "cache-control": "public, max-age=86400" });
  fs3.createReadStream(file).pipe(res2);
  return true;
}

// src/blog.mjs
import fs4 from "node:fs";
import path4 from "node:path";
import crypto3 from "node:crypto";

// src/md.mjs
var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var TR = { \u0430: "a", \u0431: "b", \u0432: "v", \u0433: "g", \u0434: "d", \u0435: "e", \u0451: "e", \u0436: "zh", \u0437: "z", \u0438: "i", \u0439: "y", \u043A: "k", \u043B: "l", \u043C: "m", \u043D: "n", \u043E: "o", \u043F: "p", \u0440: "r", \u0441: "s", \u0442: "t", \u0443: "u", \u0444: "f", \u0445: "h", \u0446: "ts", \u0447: "ch", \u0448: "sh", \u0449: "sch", \u044A: "", \u044B: "y", \u044C: "", \u044D: "e", \u044E: "yu", \u044F: "ya", \u0456: "i", \u0457: "yi", \u0454: "ye", \u0491: "g" };
function slugify(s) {
  return String(s || "").toLowerCase().split("").map((c) => TR[c] ?? c).join("").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/, "");
}
var safeUrl = (u) => /^(https?:\/\/|\/)[^\s"'<>]*$/i.test(u);
function inline(text) {
  return text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) => safeUrl(src) ? `<img src="${src}" alt="${alt}" loading="lazy">` : alt).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => safeUrl(u) ? `<a href="${u}"${/^https?:/i.test(u) ? ' rel="noopener" target="_blank"' : ""}>${t}</a>` : t).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>").replace(/`([^`]+)`/g, "<code>$1</code>");
}
function renderMarkdown(md, { linker } = {}) {
  const lines = String(md || "").replace(/\r/g, "").split("\n");
  const out = [], toc = [], ids = /* @__PURE__ */ new Set(), para = [];
  const L = (h) => linker ? linker(h) : h;
  const flush2 = () => {
    if (para.length) {
      out.push(`<p>${L(inline(esc(para.join(" "))))}</p>`);
      para.length = 0;
    }
  };
  const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let m;
    if (!line.trim()) {
      flush2();
      i++;
      continue;
    }
    if (m = line.match(/^(#{2,4})\s+(.+?)\s*#*$/)) {
      flush2();
      const lvl = m[1].length, txt = m[2].trim();
      let id = slugify(txt) || "section", n = 2;
      while (ids.has(id)) id = `${slugify(txt) || "section"}-${n++}`;
      ids.add(id);
      if (lvl === 2) toc.push({ id, text: txt });
      out.push(`<h${lvl} id="${id}">${inline(esc(txt))}</h${lvl}>`);
      i++;
      continue;
    }
    if (/^#\s+/.test(line)) {
      flush2();
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flush2();
      out.push("<hr>");
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      flush2();
      const q = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        q.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<blockquote><p>${L(inline(esc(q.join(" "))))}</p></blockquote>`);
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      flush2();
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      out.push(`<ul>${items.map((t) => `<li>${L(inline(esc(t)))}</li>`).join("")}</ul>`);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      flush2();
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      out.push(`<ol>${items.map((t) => `<li>${L(inline(esc(t)))}</li>`).join("")}</ol>`);
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flush2();
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        if (!/^\s*\|?\s*:?-{2,}/.test(lines[i])) rows.push(cells(lines[i]));
        i++;
      }
      if (rows.length) {
        const [head2, ...body] = rows;
        out.push(`<div class="tbl"><table><thead><tr>${head2.map((c) => `<th>${inline(esc(c))}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(esc(c))}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      }
      continue;
    }
    para.push(line.trim());
    i++;
  }
  flush2();
  return { html: out.join("\n"), toc };
}
function makeLinker(rules, { max = 6, selfUrl = "" } = {}) {
  const used = /* @__PURE__ */ new Set();
  let count = 0;
  const compiled = [];
  for (const r of rules) {
    if (!r.url || r.url === selfUrl) continue;
    for (const a of String(r.anchors || "").split(/[,;\n]/).map((x) => x.trim()).filter((x) => x.length >= 3)) {
      compiled.push({ url: r.url, len: a.length, re: new RegExp(`(?<![\\p{L}\\p{N}])(${escRe(esc(a))})(?![\\p{L}\\p{N}])`, "iu") });
    }
  }
  compiled.sort((a, b) => b.len - a.len);
  const linker = (html) => {
    for (const r of compiled) {
      if (count >= max) break;
      if (used.has(r.url)) continue;
      const parts = html.split(/(<a\b[^>]*>[\s\S]*?<\/a>|<[^>]+>)/);
      for (let k = 0; k < parts.length; k += 2) {
        const m = parts[k].match(r.re);
        if (!m) continue;
        parts[k] = parts[k].slice(0, m.index) + `<a href="${esc(r.url)}" class="il">${m[1]}</a>` + parts[k].slice(m.index + m[1].length);
        used.add(r.url);
        count++;
        html = parts.join("");
        break;
      }
    }
    return html;
  };
  linker.links = () => [...used];
  return linker;
}
var stripMd = (md) => String(md || "").replace(/```[\s\S]*?```/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/[*_`>|#-]/g, " ").replace(/\s+/g, " ").trim();
var wordCount = (md) => (stripMd(md).match(/[\p{L}\p{N}]+/gu) || []).length;

// src/blog.mjs
var { UserError: UserError3 } = fal_exports;
var BRAND = process.env.STUDIO_NAME || "Portretto";
var IMG_DIR = path4.join(DATA_DIR, "blog-img");
fs4.mkdirSync(IMG_DIR, { recursive: true });
var COVER_MODEL2 = process.env.FAL_COVER_MODEL || "fal-ai/nano-banana-pro";
var LLM_MODELS = [
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro (\u043B\u0443\u0447\u0448\u0435\u0435 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E)" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5 (\u043B\u0443\u0447\u0448\u0438\u0439 \u0441\u0442\u0438\u043B\u044C \u0442\u0435\u043A\u0441\u0442\u0430)" },
  { id: "openai/gpt-4.1", name: "GPT-4.1" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash (\u0431\u044B\u0441\u0442\u0440\u043E \u0438 \u0434\u0451\u0448\u0435\u0432\u043E)" }
];
db.posts ||= [];
db.seoJobs ||= [];
db.seo ||= {};
var S = db.seo;
S.home ||= { ru: { title: "", description: "" }, en: { title: "", description: "" } };
S.verify ||= { google: "", yandex: "", bing: "" };
S.analytics ||= { ga4: "", metrika: "" };
S.links ||= [];
S.maxLinks ??= 6;
S.llm ||= LLM_MODELS[0].id;
S.indexnow ??= true;
S.indexnowKey ||= crypto3.randomBytes(16).toString("hex");
S.plan ||= [];
S.ogImage ||= "";
S.autoCover ??= true;
var seo = S;
var DEFAULT_HOME = {
  ru: { title: `${BRAND} \u2014 AI-\u0444\u043E\u0442\u043E\u0441\u0442\u0443\u0434\u0438\u044F: \u0441\u0442\u0443\u0434\u0438\u0439\u043D\u044B\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0438\u0437 \u0441\u0435\u043B\u0444\u0438`, description: "\u041F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0438\u0437 \u043E\u0431\u044B\u0447\u043D\u043E\u0433\u043E \u0441\u0435\u043B\u0444\u0438: \u0434\u0435\u043B\u043E\u0432\u043E\u0439, \u0436\u0443\u0440\u043D\u0430\u043B\u044C\u043D\u044B\u0439, \u0447\u0451\u0440\u043D\u043E-\u0431\u0435\u043B\u044B\u0439 \u0438 \u0434\u0440\u0443\u0433\u0438\u0435 \u043E\u0431\u0440\u0430\u0437\u044B. \u0412\u0430\u0448\u0435 \u043B\u0438\u0446\u043E, \u0441\u0442\u0443\u0434\u0438\u0439\u043D\u044B\u0439 \u0441\u0432\u0435\u0442, \u0432\u044B\u0441\u043E\u043A\u043E\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u0437\u0430 30\u201360 \u0441\u0435\u043A\u0443\u043D\u0434." },
  en: { title: `${BRAND} \u2014 AI photo studio: a studio portrait from a selfie`, description: "Turn an everyday selfie into a professional portrait: business, magazine, black-and-white and more. Your face, studio lighting, high resolution in 30\u201360 seconds." }
};
var homeMeta = (lang2) => ({ title: S.home[lang2]?.title || DEFAULT_HOME[lang2].title, description: S.home[lang2]?.description || DEFAULT_HOME[lang2].description });
var blogBase = (lang2) => lang2 === "en" ? "/en/blog" : "/blog";
var postUrl = (p) => `${blogBase(p.lang)}/${p.slug}`;
var tagUrl = (lang2, tag) => `${blogBase(lang2)}/tag/${encodeURIComponent(slugify(tag) || tag)}`;
function originOf(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const o = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers["x-forwarded-host"] || req.headers.host}`;
  if (!/localhost|127\.0\.0\.1/.test(o)) S.origin = o;
  return o;
}
var knownOrigin = () => (process.env.PUBLIC_URL || S.origin || "").replace(/\/$/, "");
var published = (lang2) => db.posts.filter((p) => p.status === "published" && (!lang2 || p.lang === lang2)).sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
var findPost = (id) => db.posts.find((p) => p.id === id);
var findBySlug = (lang2, slug) => db.posts.find((p) => p.lang === lang2 && p.slug === slug && p.status === "published");
function uniqueSlug(lang2, base, selfId) {
  let s = slugify(base) || "post", n = 2;
  const taken = (x) => db.posts.some((p) => p.lang === lang2 && p.slug === x && p.id !== selfId);
  const root = s;
  while (taken(s)) s = `${root}-${n++}`;
  return s;
}
var clean = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
function normalizePost(input, existing) {
  const lang2 = input.lang === "en" ? "en" : "ru";
  const p = existing || { id: newId(), created: Date.now(), views: 0, daily: {}, status: "draft" };
  p.lang = lang2;
  p.title = clean(input.title, 140);
  if (!p.title) throw new UserError3("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0441\u0442\u0430\u0442\u044C\u0438.");
  p.keyword = clean(input.keyword, 80);
  p.description = clean(input.description, 300);
  p.anchors = clean(Array.isArray(input.anchors) ? input.anchors.join(", ") : input.anchors, 300);
  p.tags = (Array.isArray(input.tags) ? input.tags : String(input.tags || "").split(",")).map((t) => clean(t, 40)).filter(Boolean).slice(0, 6);
  p.body = String(input.body ?? p.body ?? "").slice(0, 12e4);
  p.faq = (Array.isArray(input.faq) ? input.faq : []).map((f) => ({ q: clean(f.q, 240), a: String(f.a || "").trim().slice(0, 1500) })).filter((f) => f.q && f.a).slice(0, 10);
  p.coverAlt = clean(input.coverAlt, 200) || p.title;
  if (input.coverPrompt !== void 0) p.coverPrompt = clean(input.coverPrompt, 600);
  p.translationId = db.posts.some((x) => x.id === input.translationId && x.lang !== lang2) ? input.translationId : "";
  p.slug = uniqueSlug(lang2, input.slug || p.slug || p.title, p.id);
  p.updated = Date.now();
  return p;
}
function savePost(input) {
  const existing = input.id ? findPost(input.id) : null;
  if (input.id && !existing) throw new UserError3("\u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
  const p = normalizePost(input, existing);
  if (!existing) db.posts.unshift(p);
  for (const x of db.posts) if (x.translationId === p.id && x.id !== p.translationId) x.translationId = "";
  if (p.translationId) findPost(p.translationId).translationId = p.id;
  save();
  return p;
}
function setPublished(id, on) {
  const p = findPost(id);
  if (!p) throw new UserError3("\u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
  if (on && wordCount(p.body) < 150) throw new UserError3("\u0412 \u0441\u0442\u0430\u0442\u044C\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u043E \u0442\u0435\u043A\u0441\u0442\u0430 \u0434\u043B\u044F \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438.");
  p.status = on ? "published" : "draft";
  if (on && !p.publishedAt) p.publishedAt = Date.now();
  p.updated = Date.now();
  save();
  return p;
}
function deletePost(id) {
  const p = findPost(id);
  if (!p) return;
  for (const f of fs4.readdirSync(IMG_DIR)) if (f.startsWith(id + ".")) fs4.rmSync(path4.join(IMG_DIR, f), { force: true });
  for (const x of db.posts) if (x.translationId === id) x.translationId = "";
  db.posts = db.posts.filter((x) => x.id !== id);
  save();
}
var BUILTIN = { ru: [{ anchors: "AI-\u0444\u043E\u0442\u043E\u0441\u0442\u0443\u0434\u0438\u044F, \u0418\u0418-\u0444\u043E\u0442\u043E\u0441\u0442\u0443\u0434\u0438\u044F, AI-\u0444\u043E\u0442\u043E\u0441\u0442\u0443\u0434\u0438\u0438, \u0418\u0418-\u0444\u043E\u0442\u043E\u0441\u0442\u0443\u0434\u0438\u0438", url: "/" }], en: [{ anchors: "AI photo studio", url: "/" }] };
function linkRules(lang2) {
  const auto = published(lang2).filter((p) => p.keyword).map((p) => ({ anchors: [p.keyword, p.anchors].filter(Boolean).join(", "), url: postUrl(p), auto: true }));
  const manual = S.links.filter((l) => l.lang === lang2 || l.lang === "all");
  return [...manual, ...auto, ...BUILTIN[lang2]];
}
function renderPost(p) {
  const linker = makeLinker(linkRules(p.lang), { max: S.maxLinks, selfUrl: postUrl(p) });
  const r = renderMarkdown(p.body, { linker });
  return { ...r, links: linker.links() };
}
function related(p, n = 3) {
  const kw = new Set(String(p.keyword || "").toLowerCase().split(/\s+/).filter((w) => w.length > 3));
  return published(p.lang).filter((x) => x.id !== p.id).map((x) => ({ x, s: x.tags.filter((t) => p.tags.includes(t)).length * 3 + String(x.keyword || "").toLowerCase().split(/\s+/).filter((w) => kw.has(w)).length })).sort((a, b) => b.s - a.s || (b.x.publishedAt || 0) - (a.x.publishedAt || 0)).slice(0, n).map((r) => r.x);
}
function linkGraph() {
  const incoming = {}, outgoing = {};
  for (const p of published()) {
    const links = renderPost(p).links;
    outgoing[p.id] = links.length;
    for (const u of links) incoming[u] = (incoming[u] || 0) + 1;
  }
  return { incoming, outgoing };
}
function analyze(p) {
  const kw = String(p.keyword || "").toLowerCase().trim();
  const text = stripMd(p.body).toLowerCase();
  const words = wordCount(p.body);
  const firstPara = (String(p.body || "").split(/\n\s*\n/).map(stripMd).find((x) => x.length > 40) || "").toLowerCase();
  const h2 = (String(p.body || "").match(/^##\s+.+$/gm) || []).map((h) => h.toLowerCase());
  const kwStem = kw.split(/\s+/).filter(Boolean).map((w) => w.slice(0, Math.max(4, w.length - 2)));
  const has = (s) => kw && kwStem.every((st) => s.includes(st));
  const kwCount = kw ? (text.match(new RegExp(kwStem.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\p{L}]*\\s+"), "giu")) || []).length : 0;
  const density = words ? kwCount * Math.max(1, kw.split(/\s+/).length) / words * 100 : 0;
  const paras = String(p.body || "").split(/\n\s*\n/).map(stripMd).filter((x) => x.length > 0 && !/^#/.test(x));
  const avgPara = paras.length ? paras.reduce((s, x) => s + x.split(/\s+/).length, 0) / paras.length : 0;
  const rendered = renderPost(p);
  const tl = (p.title || "").length, dl = (p.description || "").length;
  const checks = [
    { w: 8, ok: !!kw, t: "\u0417\u0430\u0434\u0430\u043D\u043E \u043A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E", tip: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0433\u043B\u0430\u0432\u043D\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441, \u043F\u043E \u043A\u043E\u0442\u043E\u0440\u043E\u043C\u0443 \u0441\u0442\u0430\u0442\u044C\u044F \u0434\u043E\u043B\u0436\u043D\u0430 \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u044C\u0441\u044F." },
    { w: 10, ok: tl >= 30 && tl <= 65, warn: tl > 0, t: `\u0414\u043B\u0438\u043D\u0430 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430 ${tl} \u0441\u0438\u043C\u0432. (\u043B\u0443\u0447\u0448\u0435 30\u201365)`, tip: "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0442\u0435\u0440\u044F\u0435\u0442 \u0441\u043B\u043E\u0432\u0430, \u0434\u043B\u0438\u043D\u043D\u044B\u0439 \u043E\u0431\u0440\u0435\u0437\u0430\u0435\u0442\u0441\u044F \u0432 \u043F\u043E\u0438\u0441\u043A\u0435." },
    { w: 10, ok: has((p.title || "").toLowerCase()), t: "\u041A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0432 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0435", tip: "\u041F\u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0437\u0430\u043F\u0440\u043E\u0441 \u0431\u043B\u0438\u0436\u0435 \u043A \u043D\u0430\u0447\u0430\u043B\u0443 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0430." },
    { w: 10, ok: dl >= 110 && dl <= 165, warn: dl > 0, t: `\u0414\u043B\u0438\u043D\u0430 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F ${dl} \u0441\u0438\u043C\u0432. (\u043B\u0443\u0447\u0448\u0435 110\u2013165)`, tip: "\u042D\u0442\u043E \u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u0434 \u0441\u0441\u044B\u043B\u043A\u043E\u0439 \u0432 \u043F\u043E\u0438\u0441\u043A\u0435: \u043E\u0442 \u043D\u0435\u0433\u043E \u0437\u0430\u0432\u0438\u0441\u0438\u0442, \u043A\u043B\u0438\u043A\u043D\u0443\u0442 \u043B\u0438." },
    { w: 5, ok: has((p.description || "").toLowerCase()), t: "\u041A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0438", tip: "\u041F\u043E\u0438\u0441\u043A\u043E\u0432\u0438\u043A \u0432\u044B\u0434\u0435\u043B\u044F\u0435\u0442 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u044F \u0436\u0438\u0440\u043D\u044B\u043C." },
    { w: 4, ok: (p.slug || "").length > 0 && (p.slug || "").length <= 60, t: "\u041A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0430\u0434\u0440\u0435\u0441 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B", tip: "\u0414\u043E 60 \u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432, \u043B\u0430\u0442\u0438\u043D\u0438\u0446\u0435\u0439." },
    { w: 8, ok: has(firstPara), t: "\u041A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0432 \u043F\u0435\u0440\u0432\u043E\u043C \u0430\u0431\u0437\u0430\u0446\u0435", tip: "\u0421\u0440\u0430\u0437\u0443 \u043F\u043E\u043A\u0430\u0436\u0438\u0442\u0435, \u043E \u0447\u0451\u043C \u0441\u0442\u0430\u0442\u044C\u044F." },
    { w: 6, ok: density >= 0.4 && density <= 3, warn: kwCount > 0, t: `\u0427\u0430\u0441\u0442\u043E\u0442\u0430 \u043A\u043B\u044E\u0447\u0435\u0432\u043E\u0433\u043E \u0441\u043B\u043E\u0432\u0430 ${density.toFixed(1)}% (\u043B\u0443\u0447\u0448\u0435 0,4\u20133%)`, tip: "\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0447\u0430\u0441\u0442\u043E \u2014 \u044D\u0442\u043E \u043F\u0435\u0440\u0435\u0441\u043F\u0430\u043C, \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0440\u0435\u0434\u043A\u043E \u2014 \u0442\u0435\u043C\u0430 \u043D\u0435\u044F\u0441\u043D\u0430." },
    { w: 12, ok: words >= 1e3, warn: words >= 600, t: `\u041E\u0431\u044A\u0451\u043C ${words} \u0441\u043B\u043E\u0432 (\u043B\u0443\u0447\u0448\u0435 \u043E\u0442 1000)`, tip: "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u044B\u0435 \u0441\u0442\u0430\u0442\u044C\u0438 \u0447\u0430\u0449\u0435 \u0437\u0430\u043D\u0438\u043C\u0430\u044E\u0442 \u0432\u0435\u0440\u0445\u043D\u0438\u0435 \u043F\u043E\u0437\u0438\u0446\u0438\u0438." },
    { w: 7, ok: h2.length >= 3, t: `\u041F\u043E\u0434\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u043E\u0432 H2: ${h2.length} (\u043D\u0443\u0436\u043D\u043E \u043E\u0442 3)`, tip: "\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0430 \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u0438 \u0447\u0438\u0442\u0430\u0442\u0435\u043B\u044E, \u0438 \u043F\u043E\u0438\u0441\u043A\u043E\u0432\u0438\u043A\u0443." },
    { w: 4, ok: h2.some(has), t: "\u041A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0432 \u043F\u043E\u0434\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0435", tip: "\u0425\u043E\u0442\u044F \u0431\u044B \u0432 \u043E\u0434\u043D\u043E\u043C H2." },
    { w: 5, ok: !!p.cover, t: "\u0415\u0441\u0442\u044C \u043E\u0431\u043B\u043E\u0436\u043A\u0430", tip: "\u041A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 \u043D\u0443\u0436\u043D\u0430 \u0434\u043B\u044F \u0441\u043E\u0446\u0441\u0435\u0442\u0435\u0439 \u0438 Google Discover." },
    { w: 6, ok: rendered.links.length >= 2, warn: rendered.links.length === 1, t: `\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u0445 \u0441\u0441\u044B\u043B\u043E\u043A: ${rendered.links.length} (\u043D\u0443\u0436\u043D\u043E \u043E\u0442 2)`, tip: "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u043F\u0435\u0440\u0435\u043B\u0438\u043D\u043A\u043E\u0432\u043A\u0438 \u0438\u043B\u0438 \u0431\u043E\u043B\u044C\u0448\u0435 \u0441\u0442\u0430\u0442\u0435\u0439 \u043F\u043E \u0442\u0435\u043C\u0435." },
    { w: 3, ok: (p.faq || []).length >= 3, t: `\u0412\u043E\u043F\u0440\u043E\u0441\u043E\u0432 \u0432 FAQ: ${(p.faq || []).length} (\u043D\u0443\u0436\u043D\u043E \u043E\u0442 3)`, tip: "FAQ \u043B\u043E\u0432\u0438\u0442 \u0434\u043B\u0438\u043D\u043D\u044B\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u0438\u0437 \u043F\u043E\u0438\u0441\u043A\u0430." },
    { w: 2, ok: avgPara > 0 && avgPara <= 90, t: "\u0410\u0431\u0437\u0430\u0446\u044B \u043D\u0435 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043B\u0438\u043D\u043D\u044B\u0435", tip: "\u0412 \u0441\u0440\u0435\u0434\u043D\u0435\u043C \u0434\u043E 90 \u0441\u043B\u043E\u0432 \u043D\u0430 \u0430\u0431\u0437\u0430\u0446." }
  ];
  const score = Math.round(checks.reduce((s, c) => s + (c.ok ? c.w : c.warn ? c.w * 0.5 : 0), 0));
  return {
    score,
    words,
    kwCount,
    density: +density.toFixed(2),
    checks: checks.map(({ w, ok, warn, t, tip }) => ({ ok, warn: !ok && !!warn, t, tip, w })),
    html: rendered.html,
    toc: rendered.toc,
    links: rendered.links,
    readMin: Math.max(1, Math.round(words / 200))
  };
}
function audit(req) {
  const pub = published();
  const graph = linkGraph();
  const titles = {};
  for (const p of pub) titles[p.title.toLowerCase()] = (titles[p.title.toLowerCase()] || 0) + 1;
  const thin = pub.filter((p) => wordCount(p.body) < 600);
  const noDesc = pub.filter((p) => (p.description || "").length < 50);
  const noCover = pub.filter((p) => !p.cover);
  const orphans = pub.filter((p) => !graph.incoming[postUrl(p)]);
  const dupes = Object.values(titles).filter((n) => n > 1).length;
  const low = pub.filter((p) => analyze(p).score < 60);
  const home = ["ru", "en"].map((l) => homeMeta(l));
  const C = (w, ok, t, tip, warn) => ({ w, ok, warn: !ok && !!warn, t, tip });
  const checks = [
    C(8, !!process.env.PUBLIC_URL, "\u0417\u0430\u0434\u0430\u043D \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u0439 \u0430\u0434\u0440\u0435\u0441 \u0441\u0430\u0439\u0442\u0430 (PUBLIC_URL)", "Railway \u2192 Variables \u2192 PUBLIC_URL = https://\u0432\u0430\u0448-\u0434\u043E\u043C\u0435\u043D. \u0411\u0435\u0437 \u044D\u0442\u043E\u0433\u043E canonical \u0438 sitemap \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442 \u0430\u0434\u0440\u0435\u0441 \u0438\u0437 \u0437\u0430\u043F\u0440\u043E\u0441\u0430.", !!knownOrigin()),
    C(6, !!process.env.RAILWAY_VOLUME_MOUNT_PATH || !!process.env.DATA_DIR, "\u0421\u0442\u0430\u0442\u044C\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u043D\u0430 Volume", "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u0435 Volume /data, \u0438\u043D\u0430\u0447\u0435 \u0441\u0442\u0430\u0442\u044C\u0438 \u043F\u0440\u043E\u043F\u0430\u0434\u0443\u0442 \u043F\u0440\u0438 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0438."),
    C(8, !!S.verify.google, "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D Google Search Console", "\u0411\u0435\u0437 \u043D\u0435\u0433\u043E \u043D\u0435 \u0432\u0438\u0434\u043D\u043E, \u043F\u043E \u043A\u0430\u043A\u0438\u043C \u0437\u0430\u043F\u0440\u043E\u0441\u0430\u043C \u0432\u0430\u0441 \u043D\u0430\u0445\u043E\u0434\u044F\u0442, \u0438 \u043D\u0435\u043B\u044C\u0437\u044F \u0443\u0441\u043A\u043E\u0440\u0438\u0442\u044C \u0438\u043D\u0434\u0435\u043A\u0441\u0430\u0446\u0438\u044E."),
    C(4, !!S.verify.yandex, "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D \u042F\u043D\u0434\u0435\u043A\u0441.\u0412\u0435\u0431\u043C\u0430\u0441\u0442\u0435\u0440", "\u0412\u0430\u0436\u043D\u043E \u0434\u043B\u044F \u0440\u0443\u0441\u0441\u043A\u043E\u044F\u0437\u044B\u0447\u043D\u043E\u0433\u043E \u0442\u0440\u0430\u0444\u0438\u043A\u0430."),
    C(3, !!S.verify.bing, "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D Bing Webmaster", "Bing \u0442\u0430\u043A\u0436\u0435 \u043F\u0438\u0442\u0430\u0435\u0442 \u043F\u043E\u0438\u0441\u043A \u0432 ChatGPT \u0438 Copilot."),
    C(6, !!(S.analytics.ga4 || S.analytics.metrika), "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u0430\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430", "Google Analytics 4 \u0438\u043B\u0438 \u042F\u043D\u0434\u0435\u043A\u0441.\u041C\u0435\u0442\u0440\u0438\u043A\u0430."),
    C(5, home.every((h) => h.title.length <= 65 && h.description.length <= 170), "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0438 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0433\u043B\u0430\u0432\u043D\u043E\u0439 \u0432 \u043D\u043E\u0440\u043C\u0435", "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u2192 \u0433\u043B\u0430\u0432\u043D\u0430\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430."),
    C(15, pub.length >= 20, `\u041E\u043F\u0443\u0431\u043B\u0438\u043A\u043E\u0432\u0430\u043D\u043E \u0441\u0442\u0430\u0442\u0435\u0439: ${pub.length} (\u0446\u0435\u043B\u044C \u2014 \u043E\u0442 20, \u043B\u0443\u0447\u0448\u0435 50+)`, "\u0422\u0440\u0430\u0444\u0438\u043A \u0440\u0430\u0441\u0442\u0451\u0442 \u043E\u0442 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0430 \u043F\u043E\u043B\u0435\u0437\u043D\u044B\u0445 \u0441\u0442\u0440\u0430\u043D\u0438\u0446 \u043F\u043E \u0440\u0430\u0437\u043D\u044B\u043C \u0437\u0430\u043F\u0440\u043E\u0441\u0430\u043C.", pub.length >= 5),
    C(5, published("en").length >= 3, `\u0421\u0442\u0430\u0442\u0435\u0439 \u043D\u0430 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u043E\u043C: ${published("en").length}`, "\u0410\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439 \u0434\u0430\u0451\u0442 \u0432 \u0440\u0430\u0437\u044B \u0431\u043E\u043B\u044C\u0448\u0438\u0439 \u0440\u044B\u043D\u043E\u043A."),
    C(10, thin.length === 0, `\u0421\u043B\u0430\u0431\u044B\u0435 \u0441\u0442\u0430\u0442\u044C\u0438 (< 600 \u0441\u043B\u043E\u0432): ${thin.length}`, "\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0438\u043B\u0438 \u0441\u043D\u0438\u043C\u0438\u0442\u0435 \u0441 \u043F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438: \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0442\u044F\u043D\u0443\u0442 \u0441\u0430\u0439\u0442 \u0432\u043D\u0438\u0437.", thin.length <= 2),
    C(6, noDesc.length === 0, `\u0411\u0435\u0437 \u043C\u0435\u0442\u0430-\u043E\u043F\u0438\u0441\u0430\u043D\u0438\u044F: ${noDesc.length}`, "\u0417\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0443 \u043A\u0430\u0436\u0434\u043E\u0439 \u0441\u0442\u0430\u0442\u044C\u0438."),
    C(4, noCover.length === 0, `\u0411\u0435\u0437 \u043E\u0431\u043B\u043E\u0436\u043A\u0438: ${noCover.length}`, "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0439\u0442\u0435 \u0438\u043B\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043E\u0431\u043B\u043E\u0436\u043A\u0443."),
    C(8, orphans.length === 0, `\u0421\u0442\u0430\u0442\u044C\u0438-\u0441\u0438\u0440\u043E\u0442\u044B \u0431\u0435\u0437 \u0432\u0445\u043E\u0434\u044F\u0449\u0438\u0445 \u0441\u0441\u044B\u043B\u043E\u043A: ${orphans.length}`, "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0438\u0445 \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430 \u0432 \u0434\u0440\u0443\u0433\u0438\u0435 \u0441\u0442\u0430\u0442\u044C\u0438 \u0438\u043B\u0438 \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u043F\u0435\u0440\u0435\u043B\u0438\u043D\u043A\u043E\u0432\u043A\u0438.", orphans.length <= 2),
    C(4, dupes === 0, `\u041F\u043E\u0432\u0442\u043E\u0440\u044F\u044E\u0449\u0438\u0435\u0441\u044F \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043A\u0438: ${dupes}`, "\u0423 \u043A\u0430\u0436\u0434\u043E\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A."),
    C(8, low.length === 0, `\u0421\u0442\u0430\u0442\u044C\u0438 \u0441 SEO-\u043E\u0446\u0435\u043D\u043A\u043E\u0439 \u043D\u0438\u0436\u0435 60: ${low.length}`, "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0442\u0430\u0442\u044C\u044E \u0438 \u043F\u0440\u043E\u0439\u0434\u0438\u0442\u0435 \u043F\u043E \u0447\u0435\u043A-\u043B\u0438\u0441\u0442\u0443 \u0441\u043F\u0440\u0430\u0432\u0430.", low.length <= 2)
  ];
  const score = Math.round(checks.reduce((s, c) => s + (c.ok ? c.w : c.warn ? c.w * 0.5 : 0), 0) / checks.reduce((s, c) => s + c.w, 0) * 100);
  return { score, checks: checks.map(({ w, ...c }) => c), orphans: orphans.map((p) => p.id) };
}
var BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|lighthouse|headless/i;
var day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
function countView(p, req) {
  if (BOT.test(req.headers["user-agent"] || "")) return;
  p.views = (p.views || 0) + 1;
  p.daily ||= {};
  const d = day();
  p.daily[d] = (p.daily[d] || 0) + 1;
  const keys = Object.keys(p.daily);
  if (keys.length > 120) for (const k of keys.sort().slice(0, keys.length - 120)) delete p.daily[k];
  save();
}
function viewsByDay(n = 30) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = day(Date.now() - i * 864e5);
    out.push({ day: d, views: db.posts.reduce((s, p) => s + (p.daily?.[d] || 0), 0) });
  }
  return out;
}
async function indexNow(urls) {
  const origin2 = knownOrigin();
  if (!S.indexnow) return { skipped: "IndexNow \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445" };
  if (!origin2 || /localhost|127\.0\.0\.1/.test(origin2)) return { skipped: "\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u0435\u043D \u0430\u0434\u0440\u0435\u0441 \u0441\u0430\u0439\u0442\u0430: \u0437\u0430\u0434\u0430\u0439\u0442\u0435 PUBLIC_URL" };
  const host = new URL(origin2).host;
  const list2 = [...new Set(urls.map((u) => u.startsWith("http") ? u : origin2 + u))].slice(0, 1e4);
  try {
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key: S.indexnowKey, keyLocation: `${origin2}/${S.indexnowKey}.txt`, urlList: list2 })
    });
    S.lastIndexNow = { at: Date.now(), status: r.status, count: list2.length };
  } catch (e) {
    S.lastIndexNow = { at: Date.now(), status: 0, count: list2.length, error: e.message };
  }
  save();
  return S.lastIndexNow;
}
var allUrls = () => ["/", "/?lang=en", "/blog", "/en/blog", ...published().map(postUrl)];
function saveImage2(id, buf, type) {
  for (const f of fs4.readdirSync(IMG_DIR)) if (f.startsWith(id + ".")) fs4.rmSync(path4.join(IMG_DIR, f), { force: true });
  const ext = /png/.test(type) ? "png" : /webp/.test(type) ? "webp" : "jpg";
  fs4.writeFileSync(path4.join(IMG_DIR, `${id}.${ext}`), buf);
  return `/blog-img/${id}.${ext}?v=${Date.now()}`;
}
function uploadCover2(id, dataUrl) {
  const p = findPost(id);
  if (!p) throw new UserError3("\u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!m) throw new UserError3("\u041D\u0443\u0436\u043D\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 JPG, PNG \u0438\u043B\u0438 WEBP.");
  p.cover = saveImage2(p.id, Buffer.from(m[2], "base64"), m[1]);
  save();
  return p;
}
function uploadOg(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!m) throw new UserError3("\u041D\u0443\u0436\u043D\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0430 JPG, PNG \u0438\u043B\u0438 WEBP.");
  S.ogImage = saveImage2("og-default", Buffer.from(m[2], "base64"), m[1]);
  save();
}
function serveImage(res2, name) {
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(name)) return false;
  const file = path4.join(IMG_DIR, name);
  if (!fs4.existsSync(file)) return false;
  res2.writeHead(200, { "content-type": name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg", "cache-control": "public, max-age=604800" });
  fs4.createReadStream(file).pipe(res2);
  return true;
}
var LANG_NAME = { ru: "Russian", en: "English" };
var SYSTEM = (lang2) => [
  `You are a senior SEO editor and an experienced portrait photographer writing for ${BRAND}, an online AI photo studio that turns ordinary selfies into studio-quality portraits (business headshots, magazine covers, black and white, golden hour and more) while preserving the person's real face.`,
  "Write genuinely helpful, expert and specific content that demonstrates first-hand experience (E-E-A-T): concrete settings, examples, checklists and common mistakes.",
  "No filler, no clich\xE9s, no invented statistics, studies, quotes or experts, and no claims you cannot support.",
  `Write in ${LANG_NAME[lang2]} only, in a natural native style.`
].join(" ");
function parseJSON(text) {
  const t = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const a = [t.indexOf("{"), t.indexOf("[")].filter((i) => i >= 0);
  const b = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (!a.length || b < Math.min(...a)) throw new Error("\u0418\u0418 \u0432\u0435\u0440\u043D\u0443\u043B \u043E\u0442\u0432\u0435\u0442 \u043D\u0435 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 JSON");
  return JSON.parse(t.slice(Math.min(...a), b + 1));
}
async function submitLLM(prompt, system, maxTokens) {
  const url = "https://queue.fal.run/fal-ai/any-llm";
  const input = { prompt, system_prompt: system, model: S.llm, max_tokens: maxTokens, temperature: 0.7 };
  let r = await falFetch(url, { method: "POST", body: JSON.stringify(input) });
  if (r.status === 422) r = await falFetch(url, { method: "POST", body: JSON.stringify({ prompt, system_prompt: system, model: "google/gemini-2.5-flash" }) });
  return r;
}
async function submitImage(prompt) {
  const url = `https://queue.fal.run/${COVER_MODEL2}`;
  const input = { prompt, num_images: 1, output_format: "jpeg", aspect_ratio: "16:9", resolution: "1K" };
  let r = await falFetch(url, { method: "POST", body: JSON.stringify(input) });
  if (r.status === 422) r = await falFetch(url, { method: "POST", body: JSON.stringify({ prompt, num_images: 1 }) });
  return r;
}
function articlePrompt({ keyword, title, intent, lang: lang2 }) {
  return [
    "Write an in-depth blog article.",
    `Focus keyword: ${keyword}`,
    title ? `Working title: ${title}` : "",
    intent ? `Search intent: ${intent}` : "",
    "Requirements:",
    "- 1600\u20132200 words.",
    "- No H1. Start with a 2\u20133 sentence intro paragraph that contains the focus keyword naturally.",
    "- 5\u20138 sections with ## headings and ### subheadings where useful. Put the focus keyword (or a close variant) in at least one ## heading.",
    "- Use the focus keyword naturally 3\u20136 times in total, plus related terms and synonyms. Never stuff keywords.",
    "- Be practical: step-by-step instructions, checklists, concrete examples (lighting, poses, clothing, background, what photo to upload), typical mistakes and how to avoid them.",
    `- Mention ${BRAND} naturally 1\u20132 times only where it genuinely helps the reader (for example, as a way to get a studio portrait from a selfie). It must not read like an advertisement.`,
    "- Do not add any links; internal links are added automatically.",
    "- Markdown only: paragraphs, ## and ### headings, bullet and numbered lists, **bold**, optionally one table. Keep paragraphs short (2\u20134 sentences).",
    "- Also write 4\u20135 FAQ questions people really search for, with concise 2\u20134 sentence answers that do not repeat the article verbatim.",
    `- Language: ${LANG_NAME[lang2]}.`,
    "Return ONLY valid JSON without code fences, with this exact shape:",
    '{"title":"SEO title, 45\u201360 characters, contains the focus keyword","description":"meta description, 130\u2013155 characters, contains the focus keyword, ends with a soft call to action","slug":"short-latin-url-slug-3-to-6-words","tags":["2\u20134 short topic tags"],"anchors":["2\u20133 grammatical variants of the focus keyword for internal links"],"cover_prompt":"English prompt for a photorealistic editorial cover photo that illustrates the topic; no text, no logos, no celebrities","body":"the article in Markdown","faq":[{"q":"question","a":"answer"}]}'
  ].filter(Boolean).join("\n");
}
function planPrompt({ seed, lang: lang2, count, existing }) {
  return [
    `Create a content plan of ${count} blog articles for ${BRAND}.`,
    `Niche and topics: ${seed}`,
    `Language of keywords and titles: ${LANG_NAME[lang2]}.`,
    "Mix search intents: informational (how-to, guides, ideas), commercial (best options, comparisons, prices) and long-tail questions people actually type into Google.",
    "Prefer realistic low-competition long-tail keywords that a new site can rank for. Group topics into clusters so articles can link to each other.",
    existing.length ? `Do not duplicate these existing topics: ${existing.slice(0, 80).join("; ")}` : "",
    'Return ONLY a valid JSON array without code fences: [{"keyword":"...","title":"...","intent":"informational|commercial|transactional","cluster":"..."}]'
  ].filter(Boolean).join("\n");
}
async function startArticle({ keyword, title, intent, lang: lang2, planId }) {
  keyword = clean(keyword, 100);
  if (keyword.length < 3) throw new UserError3("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0438\u043B\u0438 \u0442\u0435\u043C\u0443 \u0441\u0442\u0430\u0442\u044C\u0438.");
  lang2 = lang2 === "en" ? "en" : "ru";
  const r = await submitLLM(articlePrompt({ keyword, title: clean(title, 140), intent: clean(intent, 40), lang: lang2 }), SYSTEM(lang2), 12e3);
  if (!r.ok || !r.data.request_id) throw new UserError3("\u0418\u0418 \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u0437\u0430\u0434\u0430\u0447\u0443: " + falError(r.status, r.data).admin, 502);
  const job = { id: newId(), type: "article", status: "working", input: { keyword, title, intent, lang: lang2, planId }, statusUrl: r.data.status_url, responseUrl: r.data.response_url, created: Date.now() };
  db.seoJobs.unshift(job);
  if (planId) {
    const it = S.plan.find((x) => x.id === planId);
    if (it) {
      it.status = "writing";
      it.jobId = job.id;
    }
  }
  save();
  return job;
}
async function startPlan({ seed, lang: lang2, count }) {
  lang2 = lang2 === "en" ? "en" : "ru";
  count = Math.max(5, Math.min(40, parseInt(count, 10) || 20));
  seed = clean(seed, 600) || (lang2 === "en" ? "AI headshots, professional portraits from a selfie, LinkedIn photos, CV photos, personal branding photos" : "AI-\u043F\u043E\u0440\u0442\u0440\u0435\u0442\u044B, \u0444\u043E\u0442\u043E \u0434\u043B\u044F \u0440\u0435\u0437\u044E\u043C\u0435 \u0438 LinkedIn, \u0434\u0435\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442, \u0444\u043E\u0442\u043E \u0434\u043B\u044F \u0441\u043E\u0446\u0441\u0435\u0442\u0435\u0439 \u0438 \u0430\u0432\u0430\u0442\u0430\u0440\u043E\u043A, \u043B\u0438\u0447\u043D\u044B\u0439 \u0431\u0440\u0435\u043D\u0434");
  const existing = [...db.posts.map((p) => p.title), ...S.plan.map((x) => x.title)];
  const r = await submitLLM(planPrompt({ seed, lang: lang2, count, existing }), SYSTEM(lang2), 6e3);
  if (!r.ok || !r.data.request_id) throw new UserError3("\u0418\u0418 \u043D\u0435 \u043F\u0440\u0438\u043D\u044F\u043B \u0437\u0430\u0434\u0430\u0447\u0443: " + falError(r.status, r.data).admin, 502);
  const job = { id: newId(), type: "plan", status: "working", input: { seed, lang: lang2, count }, statusUrl: r.data.status_url, responseUrl: r.data.response_url, created: Date.now() };
  db.seoJobs.unshift(job);
  save();
  return job;
}
async function startCover(postId) {
  const p = findPost(postId);
  if (!p) throw new UserError3("\u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
  const prompt = [
    p.coverPrompt || `Editorial photograph illustrating the topic: ${p.title}`,
    "Photorealistic, high-end editorial photography, natural colours, shallow depth of field, clean composition with negative space.",
    "No text, no letters, no watermark, no logo. Any people are fictional, not real or famous persons."
  ].join(" ");
  const r = await submitImage(prompt);
  if (!r.ok || !r.data.request_id) throw new UserError3("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u043E\u0431\u043B\u043E\u0436\u043A\u0443: " + falError(r.status, r.data).admin, 502);
  const job = { id: newId(), type: "cover", status: "working", input: { postId }, statusUrl: r.data.status_url, responseUrl: r.data.response_url, created: Date.now() };
  db.seoJobs.unshift(job);
  p.coverJob = job.id;
  save();
  return job;
}
async function improveMeta({ title, description, keyword, body, lang: lang2 }) {
  lang2 = lang2 === "en" ? "en" : "ru";
  const prompt = [
    "Rewrite the SEO title and meta description for this article to maximise click-through rate from Google while staying accurate.",
    `Focus keyword: ${clean(keyword, 100)}`,
    `Current title: ${clean(title, 140)}`,
    `Current description: ${clean(description, 300)}`,
    `Article start: ${stripMd(body).slice(0, 1500)}`,
    "Title: 45\u201360 characters, focus keyword near the beginning, specific benefit or number if it fits, no clickbait, no ALL CAPS.",
    "Description: 130\u2013155 characters, includes the focus keyword, promises a concrete outcome, ends with a soft call to action.",
    `Language: ${LANG_NAME[lang2]}.`,
    'Return ONLY JSON: {"title":"...","description":"..."}'
  ].join("\n");
  const r = await falFetch("https://fal.run/fal-ai/any-llm", { method: "POST", body: JSON.stringify({ prompt, system_prompt: SYSTEM(lang2), model: S.llm, temperature: 0.6 }) });
  if (!r.ok) throw new UserError3("\u0418\u0418 \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B: " + falError(r.status, r.data).admin, 502);
  const j = parseJSON(r.data.output);
  return { title: clean(j.title, 140), description: clean(j.description, 300) };
}
var running2 = null;
function pollJobs() {
  if (!running2) running2 = stepJobs().finally(() => {
    running2 = null;
  });
  return running2;
}
async function stepJobs() {
  for (const job of db.seoJobs) {
    if (job.status !== "working") continue;
    try {
      const st = await falFetch(job.statusUrl);
      if (!st.ok) {
        if (st.status < 500) failJob(job, falError(st.status, st.data).admin);
        continue;
      }
      if (st.data.status !== "COMPLETED") {
        if (Date.now() - job.created > 15 * 60 * 1e3) failJob(job, "\u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0434\u043E\u043B\u0433\u043E");
        continue;
      }
      const out = await falFetch(job.responseUrl);
      if (!out.ok) {
        failJob(job, falError(out.status, out.data).admin);
        continue;
      }
      if (job.type === "cover") {
        const img = (out.data.images || [])[0];
        const src = typeof img === "string" ? img : img?.url;
        const p = findPost(job.input.postId);
        if (!src) {
          failJob(job, "\u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u0432\u0435\u0440\u043D\u0443\u043B\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443");
          continue;
        }
        if (p) {
          const res2 = await fetch(src);
          if (!res2.ok) {
            failJob(job, "\u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u043E\u0431\u043B\u043E\u0436\u043A\u0443");
            continue;
          }
          p.cover = saveImage2(p.id, Buffer.from(await res2.arrayBuffer()), res2.headers.get("content-type") || "");
          p.coverAlt ||= p.title;
          delete p.coverJob;
        }
        job.status = "done";
        continue;
      }
      if (out.data.error) {
        failJob(job, out.data.error);
        continue;
      }
      const data = parseJSON(out.data.output);
      if (job.type === "plan") {
        const items = (Array.isArray(data) ? data : data.items || []).map((x) => ({
          id: newId(),
          lang: job.input.lang,
          keyword: clean(x.keyword, 100),
          title: clean(x.title, 140),
          intent: clean(x.intent, 30),
          cluster: clean(x.cluster, 60),
          status: "idea",
          created: Date.now()
        })).filter((x) => x.keyword && x.title);
        S.plan.unshift(...items);
        job.result = { added: items.length };
        job.status = "done";
      } else if (job.type === "article") {
        const p = savePost({
          lang: job.input.lang,
          title: data.title || job.input.title || job.input.keyword,
          keyword: job.input.keyword,
          description: data.description,
          slug: data.slug,
          tags: data.tags,
          anchors: data.anchors,
          body: data.body,
          faq: data.faq,
          coverPrompt: data.cover_prompt
        });
        p.ai = true;
        job.result = { postId: p.id };
        job.status = "done";
        if (job.input.planId) {
          const it = S.plan.find((x) => x.id === job.input.planId);
          if (it) {
            it.status = "done";
            it.postId = p.id;
          }
        }
        if (S.autoCover) await startCover(p.id).catch(() => {
        });
      }
    } catch (e) {
      failJob(job, e.message);
    }
  }
  if (db.seoJobs.length > 300) db.seoJobs.length = 300;
  save();
}
function failJob(job, err) {
  job.status = "failed";
  job.error = String(err || "\u043E\u0448\u0438\u0431\u043A\u0430").slice(0, 300);
  if (job.type === "article" && job.input.planId) {
    const it = S.plan.find((x) => x.id === job.input.planId);
    if (it) it.status = "idea";
  }
  if (job.type === "cover") {
    const p = findPost(job.input.postId);
    if (p) delete p.coverJob;
  }
}
var jobsBusy = () => db.seoJobs.some((j) => j.status === "working");
var code = (v) => clean(v, 120).replace(/[^\w\-.:]/g, "");
function saveSettings(b) {
  for (const l of ["ru", "en"]) S.home[l] = { title: clean(b.home?.[l]?.title, 120), description: clean(b.home?.[l]?.description, 300) };
  S.verify = { google: code(b.verify?.google), yandex: code(b.verify?.yandex), bing: code(b.verify?.bing) };
  const ga = clean(b.analytics?.ga4, 30).toUpperCase(), ym = clean(b.analytics?.metrika, 20);
  if (ga && !/^G-[A-Z0-9]{4,}$/.test(ga)) throw new UserError3("ID Google Analytics \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u0442\u0430\u043A: G-XXXXXXXXXX.");
  if (ym && !/^\d{5,12}$/.test(ym)) throw new UserError3("\u041D\u043E\u043C\u0435\u0440 \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0430 \u042F\u043D\u0434\u0435\u043A\u0441.\u041C\u0435\u0442\u0440\u0438\u043A\u0438 \u2014 \u0442\u043E\u043B\u044C\u043A\u043E \u0446\u0438\u0444\u0440\u044B.");
  S.analytics = { ga4: ga, metrika: ym };
  if (LLM_MODELS.some((m) => m.id === b.llm)) S.llm = b.llm;
  S.indexnow = b.indexnow !== false;
  S.autoCover = b.autoCover !== false;
  save();
}
function saveLinks(b) {
  S.links = (Array.isArray(b.links) ? b.links : []).map((l) => ({
    anchors: clean(l.anchors, 300),
    url: clean(l.url, 300),
    lang: ["ru", "en", "all"].includes(l.lang) ? l.lang : "ru"
  })).filter((l) => l.anchors && /^(\/|https?:\/\/)/.test(l.url)).slice(0, 300);
  S.maxLinks = Math.max(1, Math.min(20, parseInt(b.maxLinks, 10) || 6));
  save();
}
function removePlanItem(id) {
  S.plan = S.plan.filter((x) => x.id !== id);
  save();
}
var postSummary = (p) => {
  const a = analyze(p);
  return {
    id: p.id,
    lang: p.lang,
    title: p.title,
    slug: p.slug,
    keyword: p.keyword,
    status: p.status,
    ai: !!p.ai,
    cover: p.cover || "",
    coverBusy: !!p.coverJob,
    views: p.views || 0,
    words: a.words,
    score: a.score,
    created: p.created,
    updated: p.updated,
    publishedAt: p.publishedAt || 0,
    url: postUrl(p),
    translationId: p.translationId || ""
  };
};

// src/pages.mjs
var T = {
  ru: { blog: "\u0411\u043B\u043E\u0433", blogTitle: "\u0411\u043B\u043E\u0433 \u043E \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u0430\u0445 \u0438 \u0444\u043E\u0442\u043E", blogLead: "\u0421\u043E\u0432\u0435\u0442\u044B, \u043A\u0430\u043A \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0441\u0438\u043B\u044C\u043D\u044B\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442: \u0441\u0432\u0435\u0442, \u043E\u0431\u0440\u0430\u0437, \u043E\u0434\u0435\u0436\u0434\u0430, \u0444\u043E\u0442\u043E \u0434\u043B\u044F \u0440\u0435\u0437\u044E\u043C\u0435 \u0438 \u0441\u043E\u0446\u0441\u0435\u0442\u0435\u0439.", home: "\u0413\u043B\u0430\u0432\u043D\u0430\u044F", create: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u043E\u0440\u0442\u0440\u0435\u0442", all: "\u0412\u0441\u0435 \u0441\u0442\u0430\u0442\u044C\u0438", read: "\u043C\u0438\u043D \u0447\u0442\u0435\u043D\u0438\u044F", toc: "\u0421\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435", faq: "\u0427\u0430\u0441\u0442\u044B\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B", related: "\u0427\u0438\u0442\u0430\u0439\u0442\u0435 \u0442\u0430\u043A\u0436\u0435", tag: "\u0422\u0435\u043C\u0430", ctaT: "\u0421\u0442\u0443\u0434\u0438\u0439\u043D\u044B\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0438\u0437 \u0432\u0430\u0448\u0435\u0433\u043E \u0441\u0435\u043B\u0444\u0438", ctaP: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u043E\u0442\u043E, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0431\u0440\u0430\u0437 \u0438 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0435 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0437\u0430 \u043C\u0438\u043D\u0443\u0442\u0443. \u041B\u0438\u0446\u043E \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0432\u0430\u0448\u0438\u043C.", ctaB: "\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C", empty: "\u0421\u0442\u0430\u0442\u044C\u0438 \u0441\u043A\u043E\u0440\u043E \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F.", prev: "\u2190 \u041D\u043E\u0432\u0435\u0435", next: "\u0421\u0442\u0430\u0440\u0448\u0435 \u2192", page: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430", nf: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430", nfP: "\u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E, \u0435\u0451 \u0443\u0434\u0430\u043B\u0438\u043B\u0438 \u0438\u043B\u0438 \u0430\u0434\u0440\u0435\u0441 \u043D\u0430\u0431\u0440\u0430\u043D \u0441 \u043E\u0448\u0438\u0431\u043A\u043E\u0439.", updated: "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u043E", other: "English" },
  en: { blog: "Blog", blogTitle: "Portrait and photo blog", blogLead: "Practical advice for a strong portrait: lighting, styling, wardrobe, CV and social media photos.", home: "Home", create: "Create portrait", all: "All articles", read: "min read", toc: "Contents", faq: "FAQ", related: "Read next", tag: "Topic", ctaT: "A studio portrait from your selfie", ctaP: "Upload a photo, pick a look and get your portrait in a minute. Your face stays yours.", ctaB: "Try it", empty: "Articles are coming soon.", prev: "\u2190 Newer", next: "Older \u2192", page: "Page", nf: "Page not found", nfP: "It may have been removed or the address is mistyped.", updated: "Updated", other: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439" }
};
var fmtDate = (ts, lang2) => new Date(ts).toLocaleDateString(lang2 === "en" ? "en-GB" : "ru-RU", { day: "numeric", month: "long", year: "numeric" });
var iso = (ts) => new Date(ts || Date.now()).toISOString();
var ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
function headExtras() {
  const s = seo, out = [];
  if (s.verify.google) out.push(`<meta name="google-site-verification" content="${esc(s.verify.google)}">`);
  if (s.verify.yandex) out.push(`<meta name="yandex-verification" content="${esc(s.verify.yandex)}">`);
  if (s.verify.bing) out.push(`<meta name="msvalidate.01" content="${esc(s.verify.bing)}">`);
  if (s.analytics.ga4) out.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(s.analytics.ga4)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","${esc(s.analytics.ga4)}");</script>`);
  if (s.analytics.metrika) out.push(`<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${s.analytics.metrika},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});</script>`);
  return out.join("\n");
}
function ogImageAbs(origin2, img) {
  return img ? img.startsWith("http") ? img : origin2 + img : "";
}
function head({ lang: lang2, title, description, canonical, origin: origin2, image, type = "website", alternates = [], robots: robots2 = "index,follow", jsonld = [], extra = "" }) {
  const img = ogImageAbs(origin2, image || seo.ogImage);
  return `<!doctype html>
<html lang="${lang2}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots2},max-image-preview:large">
${canonical ? `<link rel="canonical" href="${esc(origin2 + canonical)}">` : ""}
${alternates.map((a) => `<link rel="alternate" hreflang="${a.lang}" href="${esc(origin2 + a.url)}">`).join("\n")}
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(BRAND)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${canonical ? `<meta property="og:url" content="${esc(origin2 + canonical)}">` : ""}
${img ? `<meta property="og:image" content="${esc(img)}"><meta name="twitter:image" content="${esc(img)}">` : ""}
<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">
<link rel="alternate" type="application/rss+xml" title="${esc(BRAND)} \u2014 ${T[lang2].blog}" href="${blogBase(lang2)}/rss.xml">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%231c2733'/%3E%3Ccircle cx='13' cy='13' r='5' fill='%23e8b64c'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tenor+Sans&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
${jsonld.map(ld).join("\n")}
${headExtras()}
${extra}
<style>${CSS}</style>
</head>`;
}
var CSS = `
:root{--paper:#eceef0;--card:#fff;--ink:#18212b;--muted:#5b6672;--line:#d5dae0;--lamp:#e0a82e;--lamp-ink:#18212b;--soft:#e2e6ea;--link:#1f4f86;
--f-display:"Tenor Sans","Manrope",Georgia,serif;--f-body:"Manrope",system-ui,-apple-system,"Segoe UI",sans-serif;--f-mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--paper:#11161b;--card:#181f26;--ink:#e9edf0;--muted:#9aa6b1;--line:#2a343e;--lamp:#f0c150;--lamp-ink:#11161b;--soft:#202932;--link:#8fbef0;color-scheme:dark}}
*{box-sizing:border-box}html,body{margin:0}body{background:var(--paper);color:var(--ink);font:17px/1.65 var(--f-body);-webkit-font-smoothing:antialiased}
a{color:var(--link)}img{max-width:100%;height:auto}
:focus-visible{outline:2px solid var(--lamp);outline-offset:2px}
.wrap{max-width:1120px;margin:0 auto;padding-inline:20px}
.bar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-block:16px;flex-wrap:wrap}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink)}
.logo i{width:28px;height:28px;border-radius:8px;background:var(--ink);position:relative;flex:none}
.logo i::after{content:"";position:absolute;width:9px;height:9px;border-radius:50%;background:var(--lamp);left:7px;top:7px;box-shadow:0 0 10px var(--lamp)}
.logo b{font:21px/1 var(--f-display)}
.nav{display:flex;gap:16px;align-items:center;font-size:15px}.nav a{color:var(--muted);text-decoration:none}.nav a:hover{color:var(--ink)}
.nav a.btn{color:var(--card)}.nav a.btn:hover{color:var(--card);filter:brightness(1.15)}
.btn{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:9px 18px;font-weight:700;font-size:15px;text-decoration:none;background:var(--ink);color:var(--card);border:0}
.btn.lamp{background:var(--lamp);color:var(--lamp-ink)}
.crumbs{font:13px var(--f-mono);color:var(--muted);margin:8px 0 18px;display:flex;flex-wrap:wrap;gap:6px}.crumbs a{color:var(--muted)}
h1{font:400 clamp(32px,5vw,52px)/1.08 var(--f-display);margin:0 0 14px;letter-spacing:-.01em;text-wrap:balance}
.lead{color:var(--muted);font-size:18px;max-width:62ch;margin:0 0 28px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;display:grid;grid-template-rows:auto 1fr;text-decoration:none;color:var(--ink)}
.card:hover{border-color:var(--ink)}
.card .ph{aspect-ratio:16/9;background:linear-gradient(135deg,var(--soft),var(--line))}.card .ph img{width:100%;height:100%;object-fit:cover;display:block}
.card .tx{padding:16px 18px 18px;display:grid;gap:8px;align-content:start}
.card h2,.card h3{font:600 19px/1.3 var(--f-body);margin:0;text-wrap:balance}
.card p{margin:0;color:var(--muted);font-size:15px;line-height:1.5}
.meta{font:12.5px var(--f-mono);color:var(--muted);display:flex;gap:10px;flex-wrap:wrap}
.tags{display:flex;gap:6px;flex-wrap:wrap}.tags a{font-size:13px;border:1px solid var(--line);border-radius:999px;padding:3px 10px;text-decoration:none;color:var(--muted);background:var(--card)}
.art{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:48px;align-items:start}
@media(max-width:960px){.art{grid-template-columns:minmax(0,1fr)}.side{display:none}}
.cover{border-radius:16px;overflow:hidden;margin:18px 0 26px;aspect-ratio:16/9;background:var(--soft)}.cover img{width:100%;height:100%;object-fit:cover;display:block}
.prose{max-width:70ch;font-size:18px;line-height:1.75}
.prose h2{font:400 30px/1.2 var(--f-display);margin:44px 0 12px;scroll-margin-top:20px}
.prose h3{font:700 21px/1.3 var(--f-body);margin:30px 0 8px}.prose h4{font:700 18px/1.3 var(--f-body);margin:24px 0 6px}
.prose p{margin:0 0 18px}.prose ul,.prose ol{padding-left:24px;margin:0 0 18px}.prose li{margin:6px 0}
.prose blockquote{margin:22px 0;padding:6px 20px;border-left:3px solid var(--lamp);color:var(--muted)}
.prose a.il{text-decoration-color:var(--lamp);text-decoration-thickness:2px;text-underline-offset:3px}
.prose code{font:15px var(--f-mono);background:var(--soft);padding:1px 6px;border-radius:4px}
.prose hr{border:0;border-top:1px solid var(--line);margin:32px 0}
.tbl{overflow-x:auto;margin:0 0 20px}.prose table{border-collapse:collapse;width:100%;font-size:16px}.prose th,.prose td{border-bottom:1px solid var(--line);padding:9px 10px;text-align:left;vertical-align:top}.prose th{font:600 13px var(--f-mono);text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.side{position:sticky;top:20px;display:grid;gap:16px}
.box{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px}
.box h2{font:600 12px var(--f-mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0 0 10px}
.box ol{margin:0;padding-left:18px;font-size:14.5px;line-height:1.5}.box li{margin:6px 0}.box a{color:var(--ink);text-decoration:none}.box a:hover{text-decoration:underline}
.cta{background:var(--ink);color:var(--card);border-radius:18px;padding:28px;display:grid;gap:10px;margin:36px 0}
.cta b{font:400 26px/1.2 var(--f-display)}.cta p{margin:0;opacity:.85}.cta .btn{justify-self:start;background:var(--lamp);color:var(--lamp-ink)}
.side .cta{margin:0;padding:20px}.side .cta b{font-size:20px}
.faq{max-width:70ch}.faq details{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 18px;margin:0 0 10px}
.faq summary{cursor:pointer;font-weight:700}.faq details p{margin:10px 0 0;color:var(--muted)}
.sec{margin-top:56px}.sec>h2{font:400 30px/1.2 var(--f-display);margin:0 0 18px}
.pager{display:flex;justify-content:space-between;gap:12px;margin:32px 0;font-weight:700}
footer{border-top:1px solid var(--line);margin-top:64px;padding-block:28px 40px;color:var(--muted);font-size:14px;display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
footer a{color:var(--muted)}`;
function header(lang2, otherHref) {
  const t = T[lang2];
  return `<body><header class="wrap bar"><a class="logo" href="${lang2 === "en" ? "/?lang=en" : "/"}"><i aria-hidden="true"></i><b>${esc(BRAND)}</b></a>
<nav class="nav"><a href="${blogBase(lang2)}">${t.blog}</a>${otherHref ? `<a href="${otherHref}" hreflang="${lang2 === "en" ? "ru" : "en"}">${t.other}</a>` : ""}<a class="btn" href="/#studio">${t.create}</a></nav></header>`;
}
function footer(lang2) {
  const t = T[lang2];
  return `<footer class="wrap"><span>\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${esc(BRAND)}</span><span><a href="/">${t.home}</a> \xB7 <a href="${blogBase(lang2)}">${t.blog}</a> \xB7 <a href="${blogBase(lang2)}/rss.xml">RSS</a> \xB7 <a href="/sitemap.xml">Sitemap</a></span></footer></body></html>`;
}
var card = (p, lang2, h = "h2") => `<a class="card" href="${postUrl(p)}"><div class="ph">${p.cover ? `<img src="${esc(p.cover)}" alt="${esc(p.coverAlt || p.title)}" loading="lazy" width="640" height="360">` : ""}</div><div class="tx"><div class="meta"><span>${fmtDate(p.publishedAt, lang2)}</span><span>${Math.max(1, Math.round(wordCount(p.body) / 200))} ${T[lang2].read}</span></div><${h}>${esc(p.title)}</${h}><p>${esc(p.description)}</p></div></a>`;
var orgLd = (origin2) => ({ "@type": "Organization", "@id": origin2 + "/#org", name: BRAND, url: origin2 + "/" });
function blogList(req, lang2, { page = 1, tag = "" } = {}) {
  const origin2 = originOf(req), t = T[lang2], per = 12;
  let posts = published(lang2);
  let tagName = "";
  if (tag) {
    posts = posts.filter((p) => p.tags.some((x) => (slugify(x) || x) === tag));
    tagName = posts[0]?.tags.find((x) => (slugify(x) || x) === tag) || "";
    if (!posts.length) return null;
  }
  const pages = Math.max(1, Math.ceil(posts.length / per));
  if (page > pages) return null;
  const slice = posts.slice((page - 1) * per, page * per);
  const base = tag ? tagUrl(lang2, tagName) : blogBase(lang2);
  const canonical = page > 1 ? `${base}?page=${page}` : base;
  const title = tag ? `${tagName} \u2014 ${t.blog} ${BRAND}` : `${t.blogTitle} \u2014 ${BRAND}${page > 1 ? ` \xB7 ${t.page} ${page}` : ""}`;
  const desc = tag ? `${t.tag}: ${tagName}. ${t.blogLead}` : t.blogLead;
  const other = lang2 === "en" ? "/blog" : "/en/blog";
  const tags = [...new Set(published(lang2).flatMap((p) => p.tags))].slice(0, 30);
  const html = head({
    lang: lang2,
    title,
    description: desc,
    canonical,
    origin: origin2,
    alternates: tag ? [] : [{ lang: "ru", url: "/blog" }, { lang: "en", url: "/en/blog" }, { lang: "x-default", url: "/blog" }],
    robots: tag && posts.length < 2 ? "noindex,follow" : "index,follow",
    jsonld: [{
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      url: origin2 + canonical,
      inLanguage: lang2,
      isPartOf: { "@type": "WebSite", name: BRAND, url: origin2 + "/" },
      breadcrumb: { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: t.home, item: origin2 + "/" }, { "@type": "ListItem", position: 2, name: t.blog, item: origin2 + blogBase(lang2) }, ...tag ? [{ "@type": "ListItem", position: 3, name: tagName, item: origin2 + base }] : []] }
    }]
  }) + header(lang2, tag ? "" : other) + `<main class="wrap">
<nav class="crumbs" aria-label="breadcrumbs"><a href="/">${t.home}</a><span>\u203A</span>${tag ? `<a href="${blogBase(lang2)}">${t.blog}</a><span>\u203A</span><span>${esc(tagName)}</span>` : `<span>${t.blog}</span>`}</nav>
<h1>${tag ? esc(tagName) : t.blogTitle}</h1><p class="lead">${esc(desc)}</p>
${tags.length && !tag ? `<div class="tags" style="margin-bottom:24px">${tags.map((x) => `<a href="${tagUrl(lang2, x)}">${esc(x)}</a>`).join("")}</div>` : ""}
${slice.length ? `<div class="grid">${slice.map((p) => card(p, lang2)).join("")}</div>` : `<p>${t.empty}</p>`}
${pages > 1 ? `<nav class="pager">${page > 1 ? `<a href="${page === 2 ? base : `${base}?page=${page - 1}`}" rel="prev">${t.prev}</a>` : "<span></span>"}${page < pages ? `<a href="${base}?page=${page + 1}" rel="next">${t.next}</a>` : "<span></span>"}</nav>` : ""}
<div class="cta"><b>${t.ctaT}</b><p>${t.ctaP}</p><a class="btn" href="/#studio">${t.ctaB}</a></div>
</main>` + footer(lang2);
  return html;
}
function article(req, p) {
  const origin2 = originOf(req), lang2 = p.lang, t = T[lang2];
  const a = analyze(p);
  const tr = p.translationId ? findPost(p.translationId) : null;
  const trPub = tr && tr.status === "published" ? tr : null;
  const rel = related(p);
  const url = postUrl(p);
  const alternates = trPub ? [{ lang: lang2, url }, { lang: trPub.lang, url: postUrl(trPub) }, { lang: "x-default", url: lang2 === "ru" ? url : postUrl(trPub) }] : [];
  const crumbs = [{ n: t.home, u: "/" }, { n: t.blog, u: blogBase(lang2) }, ...p.tags[0] ? [{ n: p.tags[0], u: tagUrl(lang2, p.tags[0]) }] : [], { n: p.title, u: url }];
  const jsonld = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": origin2 + url + "#article",
      mainEntityOfPage: origin2 + url,
      headline: p.title.slice(0, 110),
      description: p.description,
      image: p.cover ? [ogImageAbs(origin2, p.cover)] : void 0,
      datePublished: iso(p.publishedAt),
      dateModified: iso(p.updated || p.publishedAt),
      inLanguage: lang2,
      wordCount: a.words,
      keywords: [p.keyword, ...p.tags].filter(Boolean).join(", "),
      author: orgLd(origin2),
      publisher: orgLd(origin2)
    },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.n, item: origin2 + c.u })) },
    ...p.faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []
  ];
  const extra = `<meta property="article:published_time" content="${iso(p.publishedAt)}"><meta property="article:modified_time" content="${iso(p.updated)}">${p.tags.map((x) => `<meta property="article:tag" content="${esc(x)}">`).join("")}`;
  let body = a.html;
  const h2s = [...body.matchAll(/<h2 /g)];
  const ctaHtml = `<div class="cta"><b>${t.ctaT}</b><p>${t.ctaP}</p><a class="btn" href="/#studio">${t.ctaB}</a></div>`;
  if (h2s.length >= 4) body = body.slice(0, h2s[3].index) + ctaHtml + body.slice(h2s[3].index);
  return head({ lang: lang2, title: `${p.title} \u2014 ${BRAND}`, description: p.description || p.title, canonical: url, origin: origin2, image: p.cover, type: "article", alternates, jsonld, extra }) + header(lang2, trPub ? postUrl(trPub) : "") + `<main class="wrap">
<nav class="crumbs" aria-label="breadcrumbs">${crumbs.slice(0, -1).map((c) => `<a href="${c.u}">${esc(c.n)}</a><span>\u203A</span>`).join("")}</nav>
<div class="art"><article>
<h1>${esc(p.title)}</h1>
<div class="meta"><time datetime="${iso(p.publishedAt)}">${fmtDate(p.publishedAt, lang2)}</time>${p.updated - (p.publishedAt || 0) > 864e5 ? `<span>${t.updated}: ${fmtDate(p.updated, lang2)}</span>` : ""}<span>${a.readMin} ${t.read}</span></div>
${p.cover ? `<figure class="cover"><img src="${esc(p.cover)}" alt="${esc(p.coverAlt || p.title)}" width="1280" height="720" fetchpriority="high"></figure>` : `<div style="height:20px"></div>`}
<div class="prose">${body}</div>
${h2s.length < 4 ? ctaHtml : ""}
${p.faq.length ? `<section class="sec faq"><h2>${t.faq}</h2>${p.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</section>` : ""}
${p.tags.length ? `<div class="tags" style="margin-top:28px">${p.tags.map((x) => `<a href="${tagUrl(lang2, x)}">${esc(x)}</a>`).join("")}</div>` : ""}
</article>
<aside class="side">${a.toc.length >= 3 ? `<nav class="box" aria-label="${t.toc}"><h2>${t.toc}</h2><ol>${a.toc.map((x) => `<li><a href="#${x.id}">${esc(x.text)}</a></li>`).join("")}</ol></nav>` : ""}<div class="cta"><b>${t.ctaT}</b><a class="btn" href="/#studio">${t.ctaB}</a></div></aside></div>
${rel.length ? `<section class="sec"><h2>${t.related}</h2><div class="grid">${rel.map((x) => card(x, lang2, "h3")).join("")}</div></section>` : ""}
</main>` + footer(lang2);
}
function notFound(req, lang2 = "ru") {
  const t = T[lang2], origin2 = originOf(req);
  const latest = published(lang2).slice(0, 3);
  return head({ lang: lang2, title: `${t.nf} \u2014 ${BRAND}`, description: t.nfP, canonical: "", origin: origin2, robots: "noindex,follow" }) + header(lang2, "") + `<main class="wrap"><h1>${t.nf}</h1><p class="lead">${t.nfP}</p><p><a class="btn" href="/">${t.home}</a></p>${latest.length ? `<section class="sec"><h2>${t.blog}</h2><div class="grid">${latest.map((p) => card(p, lang2, "h3")).join("")}</div></section>` : ""}</main>` + footer(lang2);
}
function sitemap(req) {
  const origin2 = originOf(req);
  const urls = [
    { loc: "/", lastmod: Date.now(), pr: "1.0", alt: [["ru", "/"], ["en", "/?lang=en"]] },
    { loc: "/?lang=en", lastmod: Date.now(), pr: "0.9", alt: [["ru", "/"], ["en", "/?lang=en"]] },
    { loc: "/blog", lastmod: published("ru")[0]?.updated, pr: "0.8", alt: [["ru", "/blog"], ["en", "/en/blog"]] },
    { loc: "/en/blog", lastmod: published("en")[0]?.updated, pr: "0.8", alt: [["ru", "/blog"], ["en", "/en/blog"]] }
  ];
  for (const p of published()) {
    const tr = p.translationId && findPost(p.translationId);
    urls.push({ loc: postUrl(p), lastmod: p.updated || p.publishedAt, pr: "0.7", img: p.cover, alt: tr && tr.status === "published" ? [[p.lang, postUrl(p)], [tr.lang, postUrl(tr)]] : [] });
  }
  for (const lang2 of ["ru", "en"]) {
    const counts = {};
    for (const p of published(lang2)) for (const x2 of p.tags) counts[x2] = (counts[x2] || 0) + 1;
    for (const [x2, n] of Object.entries(counts)) if (n >= 2) urls.push({ loc: tagUrl(lang2, x2), pr: "0.4", alt: [] });
  }
  const x = (s) => esc(origin2 + s);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map((u) => `<url><loc>${x(u.loc)}</loc>${u.lastmod ? `<lastmod>${iso(u.lastmod).slice(0, 10)}</lastmod>` : ""}<priority>${u.pr}</priority>${u.alt.map(([l, h]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${x(h)}"/>`).join("")}${u.img ? `<image:image><image:loc>${esc(ogImageAbs(origin2, u.img))}</image:loc></image:image>` : ""}</url>`).join("\n")}
</urlset>`;
}
function robots(req) {
  const origin2 = originOf(req);
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /editor
Disallow: /seo
Disallow: /api/

Sitemap: ${origin2}/sitemap.xml
`;
}
function rss(req, lang2) {
  const origin2 = originOf(req), t = T[lang2];
  const items = published(lang2).slice(0, 30);
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${esc(BRAND)} \u2014 ${t.blog}</title><link>${esc(origin2 + blogBase(lang2))}</link><description>${esc(t.blogLead)}</description><language>${lang2}</language>
<atom:link href="${esc(origin2 + blogBase(lang2))}/rss.xml" rel="self" type="application/rss+xml"/>
${items.map((p) => `<item><title>${esc(p.title)}</title><link>${esc(origin2 + postUrl(p))}</link><guid isPermaLink="true">${esc(origin2 + postUrl(p))}</guid><pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate><description>${esc(p.description)}</description></item>`).join("\n")}
</channel></rss>`;
}
function latestFor(lang2, n = 3) {
  return published(lang2).slice(0, n).map((p) => ({ url: postUrl(p), title: p.title, description: p.description, cover: p.cover || "", alt: p.coverAlt || p.title, date: fmtDate(p.publishedAt, lang2) }));
}
function injectHome(html, req, { packs: packs2 = [], currency: currency2 = "eur", lang: lang2 = "ru" } = {}) {
  const origin2 = originOf(req);
  const ru = homeMeta("ru"), en = homeMeta("en");
  const cur = lang2 === "en" ? en : ru;
  const self = lang2 === "en" ? "/?lang=en" : "/";
  const prices = packs2.map((p) => p.price);
  const jsonld = [
    { "@context": "https://schema.org", ...orgLd(origin2) },
    { "@context": "https://schema.org", "@type": "WebSite", "@id": origin2 + "/#site", name: BRAND, url: origin2 + "/", inLanguage: ["ru", "en"], publisher: { "@id": origin2 + "/#org" } },
    ...prices.length ? [{
      "@context": "https://schema.org",
      "@type": "Service",
      name: ru.title,
      serviceType: "AI portrait photography",
      provider: { "@id": origin2 + "/#org" },
      areaServed: "Worldwide",
      url: origin2 + "/",
      offers: { "@type": "AggregateOffer", priceCurrency: currency2.toUpperCase(), lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length }
    }] : []
  ];
  const img = ogImageAbs(origin2, seo.ogImage);
  const headAdd = [
    `<link rel="canonical" href="${esc(origin2 + self)}">`,
    `<link rel="alternate" hreflang="ru" href="${esc(origin2)}/"><link rel="alternate" hreflang="en" href="${esc(origin2)}/?lang=en"><link rel="alternate" hreflang="x-default" href="${esc(origin2)}/">`,
    `<meta property="og:type" content="website"><meta property="og:url" content="${esc(origin2 + self)}"><meta property="og:site_name" content="${esc(BRAND)}"><meta property="og:locale" content="${lang2 === "en" ? "en_US" : "ru_RU"}">`,
    img ? `<meta property="og:image" content="${esc(img)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(img)}">` : `<meta name="twitter:card" content="summary">`,
    `<link rel="alternate" type="application/rss+xml" title="${esc(BRAND)}" href="${blogBase(lang2)}/rss.xml">`,
    ...jsonld.map(ld),
    `<script>window.__SEO=${JSON.stringify({ ru, en }).replace(/</g, "\\u003c")};</script>`,
    headExtras()
  ].join("\n");
  const posts = latestFor(lang2);
  const cards = posts.map((p) => `<a class="post" href="${esc(p.url)}"><span class="ph">${p.cover ? `<img src="${esc(p.cover)}" alt="${esc(p.alt)}" loading="lazy">` : ""}</span><span class="tx"><span class="d">${esc(p.date)}</span><b>${esc(p.title)}</b><span class="s">${esc(p.description)}</span></span></a>`).join("");
  return html.replace('<html lang="ru">', `<html lang="${lang2}">`).replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(cur.title)}</title>`).replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(cur.description)}">`).replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(cur.title)}">`).replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(cur.description)}">`).replace("<!--SEO_HEAD-->", headAdd).replace("<!--LATEST_POSTS-->", cards).replace('<section class="sec" id="blogPosts" hidden>', posts.length ? '<section class="sec" id="blogPosts">' : '<section class="sec" id="blogPosts" hidden>');
}

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
var { UserError: UserError4 } = fal_exports;
var BRAND2 = process.env.STUDIO_NAME || "Portretto";
var CONTACT = process.env.CONTACT_EMAIL || "";
var MAX_VARIANTS = 4;
var ROOT = path5.dirname(fileURLToPath(import.meta.url));
var PUBLIC = fs5.existsSync(path5.join(ROOT, "public", "index.html")) ? path5.join(ROOT, "public") : ROOT;
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
    if (size2 > limit) throw new UserError4("\u0424\u043E\u0442\u043E \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u0438\u0435. \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 \u0441\u043D\u0438\u043C\u043A\u043E\u0432.", 413);
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString("utf8");
}
var parse = (raw) => {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new UserError4("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0437\u0430\u043F\u0440\u043E\u0441.");
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
    if (required) throw new UserError4("\u041A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043E\u0434 \u0438\u043B\u0438 \u043A\u0443\u043F\u0438\u0442\u0435 \u043F\u0430\u043A\u0435\u0442.", 401);
    return null;
  }
  return { key: k, rec };
}
function isAdmin(req) {
  const pass = process.env.ADMIN_PASSWORD || "";
  const got = String(req.headers["x-admin"] || "");
  if (!pass) throw new UserError4("\u0410\u0434\u043C\u0438\u043D\u043A\u0430 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u0430: \u0437\u0430\u0434\u0430\u0439\u0442\u0435 ADMIN_PASSWORD \u0432 Railway \u2192 Variables.", 403);
  const a = crypto4.createHash("sha256").update(pass).digest();
  const b = crypto4.createHash("sha256").update(got).digest();
  if (!crypto4.timingSafeEqual(a, b)) throw new UserError4("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C.", 401);
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
    brand: BRAND2,
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
    faceSwap: faceSwapSettings().enabled,
    examples: publicList(),
    latest: { ru: latestFor("ru"), en: latestFor("en") }
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
    const list2 = db.gens.filter((g) => g.key === key && g.status === "done").slice(0, 60).map((g) => ({ id: g.id, style: g.style, format: g.format, images: g.images, created: g.created }));
    json(res2, list2);
  },
  "POST /api/checkout": async (req, res2) => {
    if (!stripeEnabled()) throw new UserError4("\u041E\u043F\u043B\u0430\u0442\u0430 \u0435\u0449\u0451 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430.", 503);
    const body = parse(await readBody(req));
    const pack = packs().find((p) => p.id === body.pack);
    if (!pack) throw new UserError4("\u041F\u0430\u043A\u0435\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.");
    const key = db.keys[normKey(body.key)] ? normKey(body.key) : "";
    const s = await createCheckout({ pack, currency: currency(), key, origin: origin(req), lang: lang(body.lang), brand: BRAND2 });
    json(res2, { url: s.url });
  },
  "GET /api/checkout/confirm": async (req, res2, url) => {
    const id = url.searchParams.get("session_id") || "";
    if (!/^cs_[\w]+$/.test(id)) throw new UserError4("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043F\u043B\u0430\u0442\u0451\u0436.");
    const s = await retrieveSession(id);
    const r = fulfill(s);
    if (!r) throw new UserError4("\u041F\u043B\u0430\u0442\u0451\u0436 \u0435\u0449\u0451 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043D\u0443\u0442\u0443.", 402);
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
    if (!photos.length) throw new UserError4("\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E \u0444\u043E\u0442\u043E.");
    if (!photos.every((p) => typeof p === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p))) throw new UserError4("\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0444\u043E\u0442\u043E JPG, PNG \u0438\u043B\u0438 WEBP.");
    const style = STYLES.find((s) => s.id === body.style);
    if (!style) throw new UserError4("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0431\u0440\u0430\u0437.");
    const format = FORMATS.find((f) => f.id === body.format)?.id || "4:5";
    const count = Math.min(MAX_VARIANTS, Math.max(1, parseInt(body.count, 10) || 1));
    const wishes = typeof body.wishes === "string" ? body.wishes.trim().slice(0, 600) : "";
    if (style.custom && wishes.length < 8) throw new UserError4("\u041E\u043F\u0438\u0448\u0438\u0442\u0435 \u0441\u0432\u043E\u0439 \u043E\u0431\u0440\u0430\u0437 \u0445\u043E\u0442\u044F \u0431\u044B \u043F\u0430\u0440\u043E\u0439 \u0444\u0440\u0430\u0437.");
    const ms = modelSettings();
    const modelId = ms.enabled.includes(body.model) ? body.model : ms.default;
    const model = modelById(modelId);
    const unit = ms.credits[modelId] ?? model.credits;
    const fs_ = faceSwapSettings();
    const useSwap = fs_.enabled && body.swap !== false;
    const gender = ["male", "female", "non-binary"].includes(body.gender) ? body.gender : "";
    if (useSwap && !gender) throw new UserError4("\u0423\u043A\u0430\u0436\u0438\u0442\u0435, \u043A\u0442\u043E \u043D\u0430 \u0444\u043E\u0442\u043E: \u043C\u0443\u0436\u0447\u0438\u043D\u0430 \u0438\u043B\u0438 \u0436\u0435\u043D\u0449\u0438\u043D\u0430. \u042D\u0442\u043E \u043D\u0443\u0436\u043D\u043E \u0434\u043B\u044F \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0441\u0445\u043E\u0434\u0441\u0442\u0432\u0430.");
    const cost = count * unit;
    if (rec.credits < cost) throw new UserError4(rec.credits ? `\u041D\u0435\u0434\u043E\u0441\u0442\u0430\u0442\u043E\u0447\u043D\u043E \u043A\u0440\u0435\u0434\u0438\u0442\u043E\u0432: \u043D\u0443\u0436\u043D\u043E ${cost}, \u043E\u0441\u0442\u0430\u043B\u043E\u0441\u044C ${rec.credits}. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043C\u0435\u043D\u044C\u0448\u0435 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432 \u0438\u043B\u0438 \u043F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0431\u0430\u043B\u0430\u043D\u0441.` : "\u041A\u0440\u0435\u0434\u0438\u0442\u044B \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0438\u0441\u044C. \u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0431\u0430\u043B\u0430\u043D\u0441.", 402);
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
        throw new UserError4(err.msg, 502);
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
    if (!gen) throw new UserError4("\u0417\u0430\u0434\u0430\u0447\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
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
    if (!enabled.length) throw new UserError4("\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u0443 \u043C\u043E\u0434\u0435\u043B\u044C.");
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
      brand: BRAND2,
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
    if (!g || !g.images.includes(url)) throw new UserError4("\u0421\u043D\u0438\u043C\u043E\u043A \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.", 404);
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
  "GET /api/admin/examples": async (req, res2) => {
    isAdmin(req);
    json(res2, await poll());
  },
  "POST /api/admin/examples": async (req, res2) => {
    isAdmin(req);
    await create(parse(await readBody(req)));
    json(res2, list());
  },
  "POST /api/admin/examples/auto": async (req, res2) => {
    isAdmin(req);
    await autoSet(parse(await readBody(req)));
    json(res2, list());
  },
  "POST /api/admin/examples/update": async (req, res2) => {
    isAdmin(req);
    const { id, published: published2 } = parse(await readBody(req));
    update(id, { published: published2 });
    json(res2, list());
  },
  "POST /api/admin/examples/replace": async (req, res2) => {
    isAdmin(req);
    const { id, which, image } = parse(await readBody(req));
    replace(id, which, image);
    json(res2, list());
  },
  "POST /api/admin/examples/caption": async (req, res2) => {
    isAdmin(req);
    const { id, caption } = parse(await readBody(req));
    setCaption(id, caption);
    json(res2, list());
  },
  "POST /api/admin/examples/retry": async (req, res2) => {
    isAdmin(req);
    await retry(parse(await readBody(req)).id);
    json(res2, list());
  },
  "POST /api/admin/examples/remove": async (req, res2) => {
    isAdmin(req);
    remove(parse(await readBody(req)).id);
    json(res2, list());
  },
  // ---------- Блог и SEO ----------
  "GET /api/admin/seo": async (req, res2) => {
    isAdmin(req);
    originOf(req);
    if (jobsBusy()) await pollJobs();
    const graph = linkGraph();
    json(res2, {
      brand: BRAND2,
      origin: originOf(req),
      publicUrl: !!process.env.PUBLIC_URL,
      settings: { home: seo.home, defaults: DEFAULT_HOME, verify: seo.verify, analytics: seo.analytics, llm: seo.llm, indexnow: seo.indexnow, autoCover: seo.autoCover, ogImage: seo.ogImage, indexnowKey: seo.indexnowKey, lastIndexNow: seo.lastIndexNow || null },
      llmModels: LLM_MODELS,
      posts: db.posts.map((p) => ({ ...postSummary(p), incoming: graph.incoming[postUrl(p)] || 0, outgoing: graph.outgoing[p.id] || 0 })),
      jobs: db.seoJobs.slice(0, 40).map(({ statusUrl, responseUrl, ...j }) => j),
      plan: seo.plan.slice(0, 300),
      links: { manual: seo.links, max: seo.maxLinks, auto: ["ru", "en"].flatMap((l) => linkRules(l).filter((r) => r.auto).map((r) => ({ ...r, lang: l }))) },
      audit: audit(req),
      views: viewsByDay(30)
    });
  },
  "GET /api/admin/seo/post": async (req, res2, url) => {
    isAdmin(req);
    const p = findPost(url.searchParams.get("id"));
    if (!p) throw new UserError4("\u0421\u0442\u0430\u0442\u044C\u044F \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430.", 404);
    json(res2, { post: p, analysis: analyze(p) });
  },
  "POST /api/admin/seo/post": async (req, res2) => {
    isAdmin(req);
    const p = savePost(parse(await readBody(req, 2e6)));
    if (p.status === "published") indexNow([postUrl(p), "/sitemap.xml"]).catch(() => {
    });
    json(res2, { post: p, analysis: analyze(p) });
  },
  "POST /api/admin/seo/analyze": async (req, res2) => {
    isAdmin(req);
    const b = parse(await readBody(req, 2e6));
    const p = { lang: b.lang === "en" ? "en" : "ru", title: String(b.title || ""), keyword: String(b.keyword || ""), description: String(b.description || ""), slug: slugify(b.slug || b.title || ""), body: String(b.body || ""), faq: Array.isArray(b.faq) ? b.faq : [], tags: [], anchors: "", cover: b.cover || "", id: b.id || "" };
    json(res2, analyze(p));
  },
  "POST /api/admin/seo/publish": async (req, res2) => {
    isAdmin(req);
    const { id, published: on } = parse(await readBody(req));
    const p = setPublished(id, !!on);
    const r = on ? await indexNow([postUrl(p), "/blog", "/en/blog", "/sitemap.xml"]) : null;
    json(res2, { post: postSummary(p), indexnow: r });
  },
  "POST /api/admin/seo/delete": async (req, res2) => {
    isAdmin(req);
    deletePost(parse(await readBody(req)).id);
    json(res2, { ok: true });
  },
  "POST /api/admin/seo/cover": async (req, res2) => {
    isAdmin(req);
    const b = parse(await readBody(req));
    if (b.image) {
      uploadCover2(b.id, b.image);
      return json(res2, { ok: true, post: findPost(b.id) });
    }
    await startCover(b.id);
    json(res2, { ok: true, post: findPost(b.id) });
  },
  "POST /api/admin/seo/ai/article": async (req, res2) => {
    isAdmin(req);
    const b = parse(await readBody(req));
    const items = Array.isArray(b.items) ? b.items.slice(0, 10) : [b];
    for (const it of items) await startArticle(it);
    json(res2, { ok: true, started: items.length });
  },
  "POST /api/admin/seo/ai/plan": async (req, res2) => {
    isAdmin(req);
    await startPlan(parse(await readBody(req)));
    json(res2, { ok: true });
  },
  "POST /api/admin/seo/ai/meta": async (req, res2) => {
    isAdmin(req);
    json(res2, await improveMeta(parse(await readBody(req, 2e6))));
  },
  "POST /api/admin/seo/plan/remove": async (req, res2) => {
    isAdmin(req);
    removePlanItem(parse(await readBody(req)).id);
    json(res2, { ok: true });
  },
  "POST /api/admin/seo/links": async (req, res2) => {
    isAdmin(req);
    saveLinks(parse(await readBody(req)));
    json(res2, { ok: true });
  },
  "POST /api/admin/seo/settings": async (req, res2) => {
    isAdmin(req);
    saveSettings(parse(await readBody(req)));
    json(res2, { ok: true });
  },
  "POST /api/admin/seo/og": async (req, res2) => {
    isAdmin(req);
    uploadOg(parse(await readBody(req)).image);
    json(res2, { ok: true, ogImage: seo.ogImage });
  },
  "POST /api/admin/seo/indexnow": async (req, res2) => {
    isAdmin(req);
    originOf(req);
    json(res2, await indexNow(allUrls()));
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
    if (!c) throw new UserError4("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u043E \u043A\u0440\u0435\u0434\u0438\u0442\u043E\u0432.");
    const key = newKey();
    db.keys[key] = { credits: c, spent: 0, email: String(email || "").slice(0, 120), created: Date.now(), source: "promo", note: String(note || "").slice(0, 120) };
    save();
    json(res2, { key, ...db.keys[key] });
  },
  "POST /api/admin/keys/adjust": async (req, res2) => {
    isAdmin(req);
    const { key, delta } = parse(await readBody(req));
    const rec = db.keys[normKey(key)];
    if (!rec) throw new UserError4("\u041A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.", 404);
    rec.credits = Math.max(0, rec.credits + (parseInt(delta, 10) || 0));
    save();
    json(res2, { key: normKey(key), credits: rec.credits });
  },
  "POST /api/admin/packs": async (req, res2) => {
    isAdmin(req);
    const { packs: list2, currency: cur } = parse(await readBody(req));
    if (!Array.isArray(list2) || !list2.length || list2.length > 6) throw new UserError4("\u041D\u0443\u0436\u043D\u043E \u043E\u0442 1 \u0434\u043E 6 \u043F\u0430\u043A\u0435\u0442\u043E\u0432.");
    db.settings.packs = list2.map((p, i) => ({
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
      if (!/^[\w-]+\/[\w\-./]+$/.test(body.endpoint || "") || body.endpoint.includes("..")) throw new UserError4("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C.");
      if (body.input?.num_images > 4) body.input.num_images = 4;
      r = await falFetch(`https://queue.fal.run/${body.endpoint}`, { method: "POST", body: JSON.stringify(body.input || {}) });
    } else if (body.action === "get") {
      if (!/^https:\/\/queue\.fal\.run\/[\w\-./]+\/requests\/[\w-]+(\/status)?(\?logs=1)?$/.test(body.url || "")) throw new UserError4("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u0437\u0430\u0434\u0430\u0447\u0438.");
      r = await falFetch(body.url);
    } else throw new UserError4("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u043E\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435.");
    json(res2, r.data, r.status);
  }
};
var TYPES = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webp": "image/webp" };
var PAGES = { "/": "index.html", "/admin": "admin.html", "/editor": "editor.html", "/seo": "seo.html" };
var send = (res2, status, type, body, cache = "no-cache") => {
  res2.writeHead(status, { "content-type": type, "cache-control": cache, "x-content-type-options": "nosniff" });
  res2.end(body);
};
var HTML = "text/html; charset=utf-8";
function serveStatic(req, res2, pathname) {
  const page = PAGES[pathname];
  let name = page || pathname.replace(/^\/+/, "");
  const file = path5.join(PUBLIC, name);
  if ((page || /^[\w.-]+\.(png|jpe?g|svg|ico|webp)$/i.test(name)) && fs5.existsSync(file)) {
    if (pathname === "/") return send(res2, 200, HTML, injectHome(fs5.readFileSync(file, "utf8"), req, { packs: packs(), currency: currency(), lang: new URL(req.url, "http://x").searchParams.get("lang") === "en" ? "en" : "ru" }));
    if (page && page !== "index.html") res2.setHeader("x-robots-tag", "noindex, nofollow");
    res2.writeHead(200, { "content-type": TYPES[path5.extname(file).toLowerCase()] || "application/octet-stream", "x-content-type-options": "nosniff" });
    return fs5.createReadStream(file).pipe(res2);
  }
  send(res2, 404, HTML, notFound(req, pathname.startsWith("/en/") ? "en" : "ru"));
}
function dynamic(req, res2, url) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const p = url.pathname;
  if (p.length > 1 && p.endsWith("/")) {
    res2.writeHead(301, { location: p.replace(/\/+$/, "") + url.search });
    res2.end();
    return true;
  }
  if (p === "/sitemap.xml") return send(res2, 200, "application/xml; charset=utf-8", sitemap(req)), true;
  if (p === "/robots.txt") return send(res2, 200, "text/plain; charset=utf-8", robots(req)), true;
  if (p === `/${seo.indexnowKey}.txt`) return send(res2, 200, "text/plain; charset=utf-8", seo.indexnowKey), true;
  if (p.startsWith("/blog-img/")) return serveImage(res2, p.slice(10));
  const m = p.match(/^(\/en)?\/blog(?:\/(rss\.xml|tag\/([^/]+)|([a-z0-9-]+)))?$/);
  if (!m) return false;
  const lang2 = m[1] ? "en" : "ru";
  const page = Math.max(1, parseInt(url.searchParams.get("page"), 10) || 1);
  if (m[2] === "rss.xml") return send(res2, 200, "application/rss+xml; charset=utf-8", rss(req, lang2)), true;
  if (m[3]) {
    const html2 = blogList(req, lang2, { page, tag: decodeURIComponent(m[3]) });
    return send(res2, html2 ? 200 : 404, HTML, html2 || notFound(req, lang2)), true;
  }
  if (m[4]) {
    const post = findBySlug(lang2, m[4]);
    if (!post) return send(res2, 404, HTML, notFound(req, lang2)), true;
    countView(post, req);
    return send(res2, 200, HTML, article(req, post)), true;
  }
  const html = blogList(req, lang2, { page });
  return send(res2, html ? 200 : 404, HTML, html || notFound(req, lang2)), true;
}
http.createServer(async (req, res2) => {
  const url = new URL(req.url, "http://x");
  const handler = routes[`${req.method} ${url.pathname}`];
  try {
    if (handler) return await handler(req, res2, url);
    if (url.pathname.startsWith("/api/")) return json(res2, { error: "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" }, 404);
    if (url.pathname.startsWith("/covers/") && serveCover(res2, url.pathname.slice(8))) return;
    if (url.pathname.startsWith("/examples/") && serve(res2, url.pathname.slice(10))) return;
    if (dynamic(req, res2, url)) return;
    serveStatic(req, res2, url.pathname);
  } catch (e) {
    if (!(e instanceof UserError4)) console.error(e);
    if (!res2.headersSent) json(res2, { error: e instanceof UserError4 ? e.message : "\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u044F\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437." }, e.status || 500);
  }
}).listen(PORT, () => console.log(`${BRAND2}: \u0441\u0442\u0443\u0434\u0438\u044F \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430 \u043D\u0430 \u043F\u043E\u0440\u0442\u0443 ${PORT}. \u0414\u0430\u043D\u043D\u044B\u0435: ${DATA_DIR}${PERSISTENT ? "" : " (Volume \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D!)"}`));
setInterval(() => {
  if (Object.values(db.coverJobs || {}).some((j) => j.status === "working")) pollCovers().catch(() => {
  });
}, 5e3);
setInterval(() => {
  if (busy()) poll().catch(() => {
  });
}, 5e3);
setInterval(() => {
  if (jobsBusy()) pollJobs().catch(() => {
  });
}, 5e3);
