// Portretto: сервер собран в один файл.
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server.mjs
import http from "node:http";
import fs4 from "node:fs";
import path4 from "node:path";
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
async function stripe(method, path5, body) {
  const res2 = await fetch(STRIPE_API + path5, {
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
    metadata: { pack: pack.id, credits: pack.credits, key: key || "", site: origin2 },
    // Код клиента попадает в описание платежа и в чек Stripe
    payment_intent_data: {
      description: lang2 === "en" ? `${brand}: ${pack.credits} portraits. Your personal code: ${key} \u2014 enter it on ${origin2}` : `${brand}: ${pack.credits} \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u043E\u0432. \u0412\u0430\u0448 \u043B\u0438\u0447\u043D\u044B\u0439 \u043A\u043E\u0434: ${key} \u2014 \u0432\u0432\u0435\u0434\u0438\u0442\u0435 \u0435\u0433\u043E \u043D\u0430 ${origin2}`,
      metadata: { key }
    }
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
async function start(gen, { prompt, photos, resolution, swap, model }) {
  const m = model || modelById(gen.model);
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
  if (swap && photos.length) {
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

// src/landings.mjs
var LANDINGS = [
  {
    id: "resume",
    look: "business",
    ru: {
      slug: "foto-dlya-rezyume",
      title: "\u0424\u043E\u0442\u043E \u0434\u043B\u044F \u0440\u0435\u0437\u044E\u043C\u0435 \u043E\u043D\u043B\u0430\u0439\u043D: \u0434\u0435\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0438\u0437 \u0441\u0435\u043B\u0444\u0438 \u0437\u0430 \u043C\u0438\u043D\u0443\u0442\u0443 | Portretto",
      desc: "\u0421\u0434\u0435\u043B\u0430\u0439\u0442\u0435 \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u0444\u043E\u0442\u043E \u0434\u043B\u044F \u0440\u0435\u0437\u044E\u043C\u0435 \u0431\u0435\u0437 \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0430. \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0441\u0435\u043B\u0444\u0438 \u0438 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0435 \u0434\u0435\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0432 \u043A\u043E\u0441\u0442\u044E\u043C\u0435 \u043D\u0430 \u043D\u0435\u0439\u0442\u0440\u0430\u043B\u044C\u043D\u043E\u043C \u0444\u043E\u043D\u0435. \u041B\u0438\u0446\u043E \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0432\u0430\u0448\u0438\u043C, \u043E\u0442 {{PER_FROM}} \u0437\u0430 \u043F\u043E\u0440\u0442\u0440\u0435\u0442.",
      h1: "\u0424\u043E\u0442\u043E \u0434\u043B\u044F \u0440\u0435\u0437\u044E\u043C\u0435 \u0438\u0437 \u043E\u0431\u044B\u0447\u043D\u043E\u0433\u043E \u0441\u0435\u043B\u0444\u0438",
      lead: "\u0420\u0435\u043A\u0440\u0443\u0442\u0435\u0440 \u0441\u043C\u043E\u0442\u0440\u0438\u0442 \u043D\u0430 \u0440\u0435\u0437\u044E\u043C\u0435 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u0441\u0435\u043A\u0443\u043D\u0434, \u0438 \u0444\u043E\u0442\u043E \u0437\u0430\u043C\u0435\u0447\u0430\u0435\u0442 \u043F\u0435\u0440\u0432\u044B\u043C. \u0410\u043A\u043A\u0443\u0440\u0430\u0442\u043D\u044B\u0439 \u0434\u0435\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u043D\u0430 \u043D\u0435\u0439\u0442\u0440\u0430\u043B\u044C\u043D\u043E\u043C \u0444\u043E\u043D\u0435 \u0434\u0435\u043B\u0430\u0435\u0442 \u0440\u0435\u0437\u044E\u043C\u0435 \u0441\u0435\u0440\u044C\u0451\u0437\u043D\u0435\u0435 \u0438 \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u0437\u0430\u043F\u043E\u043C\u043D\u0438\u0442\u044C\u0441\u044F. \u041F\u043E\u0440\u0442\u0440\u0435\u0442\u0442\u043E \u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u0442\u0430\u043A\u043E\u0439 \u0441\u043D\u0438\u043C\u043E\u043A \u0438\u0437 \u0432\u0430\u0448\u0435\u0433\u043E \u0441\u0435\u043B\u0444\u0438 \u0437\u0430 \u043C\u0438\u043D\u0443\u0442\u0443.",
      benefits: ["\u0421\u0442\u0440\u043E\u0433\u0438\u0439 \u043A\u043E\u0441\u0442\u044E\u043C \u0438\u043B\u0438 \u043F\u0438\u0434\u0436\u0430\u043A \u0438 \u043D\u0435\u0439\u0442\u0440\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u0435\u0440\u044B\u0439 \u0444\u043E\u043D, \u043A\u0430\u043A \u0432 \u0441\u0442\u0443\u0434\u0438\u0438", "\u041B\u0438\u0446\u043E \u0438 \u0447\u0435\u0440\u0442\u044B \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0432\u0430\u0448\u0438\u043C\u0438: \u043D\u0435\u0439\u0440\u043E\u0441\u0435\u0442\u044C \u043C\u0435\u043D\u044F\u0435\u0442 \u0441\u0432\u0435\u0442, \u043E\u0434\u0435\u0436\u0434\u0443 \u0438 \u0444\u043E\u043D", "\u041A\u0432\u0430\u0434\u0440\u0430\u0442 \u0438\u043B\u0438 \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 4:5, \u043F\u043E\u0434\u0445\u043E\u0434\u0438\u0442 \u0434\u043B\u044F hh.ru, LinkedIn \u0438 PDF-\u0440\u0435\u0437\u044E\u043C\u0435"],
      tips: ["\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0444\u043E\u0442\u043E \u0430\u043D\u0444\u0430\u0441 \u043F\u0440\u0438 \u0434\u043D\u0435\u0432\u043D\u043E\u043C \u0441\u0432\u0435\u0442\u0435: \u0442\u0430\u043A \u0441\u0445\u043E\u0434\u0441\u0442\u0432\u043E \u0431\u0443\u0434\u0435\u0442 \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u044B\u043C", "\u0414\u043B\u044F \u0440\u0435\u0437\u044E\u043C\u0435 \u0432\u044B\u0431\u0438\u0440\u0430\u0439\u0442\u0435 \u0441\u043F\u043E\u043A\u043E\u0439\u043D\u043E\u0435 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0441 \u043B\u0451\u0433\u043A\u043E\u0439 \u0443\u043B\u044B\u0431\u043A\u043E\u0439", "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0434\u0435\u0442\u0430\u043B\u0438, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \xAB\u0441\u0432\u0435\u0442\u043B\u043E-\u0441\u0435\u0440\u044B\u0439 \u043F\u0438\u0434\u0436\u0430\u043A, \u0431\u0435\u0437 \u0433\u0430\u043B\u0441\u0442\u0443\u043A\u0430\xBB", "\u0421\u0434\u0435\u043B\u0430\u0439\u0442\u0435 2\u20134 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430 \u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043B\u0443\u0447\u0448\u0438\u0439: \u043A\u0430\u0436\u0434\u044B\u0439 \u043D\u0435\u043C\u043D\u043E\u0433\u043E \u043E\u0442\u043B\u0438\u0447\u0430\u0435\u0442\u0441\u044F"],
      faq: [["\u041A\u0430\u043A\u043E\u0435 \u0444\u043E\u0442\u043E \u043D\u0443\u0436\u043D\u043E \u0434\u043B\u044F \u0440\u0435\u0437\u044E\u043C\u0435?", "\u041F\u043E\u0440\u0442\u0440\u0435\u0442 \u043F\u043E \u043F\u043B\u0435\u0447\u0438 \u0438\u043B\u0438 \u043F\u043E \u043F\u043E\u044F\u0441, \u043B\u0438\u0446\u043E \u0445\u043E\u0440\u043E\u0448\u043E \u0432\u0438\u0434\u043D\u043E, \u043D\u0435\u0439\u0442\u0440\u0430\u043B\u044C\u043D\u044B\u0439 \u0444\u043E\u043D, \u0434\u0435\u043B\u043E\u0432\u0430\u044F \u043E\u0434\u0435\u0436\u0434\u0430 \u0438 \u0441\u043F\u043E\u043A\u043E\u0439\u043D\u043E\u0435 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0435. \u0418\u043C\u0435\u043D\u043D\u043E \u0442\u0430\u043A \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D \u043E\u0431\u0440\u0430\u0437 \xAB\u0414\u0435\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442\xBB."], ["\u041C\u043E\u0436\u043D\u043E \u043B\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C AI-\u0444\u043E\u0442\u043E \u0432 \u0440\u0435\u0437\u044E\u043C\u0435?", "\u0414\u0430, \u0435\u0441\u043B\u0438 \u043D\u0430 \u0444\u043E\u0442\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0442\u0435\u043B\u044C\u043D\u043E \u0432\u044B. \u041F\u043E\u0440\u0442\u0440\u0435\u0442\u0442\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u0447\u0435\u0440\u0442\u044B \u043B\u0438\u0446\u0430, \u043C\u0435\u043D\u044F\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0432\u0435\u0442, \u0444\u043E\u043D \u0438 \u043E\u0434\u0435\u0436\u0434\u0443, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0447\u0435\u0441\u0442\u043D\u043E \u043F\u0435\u0440\u0435\u0434\u0430\u0451\u0442 \u0432\u0430\u0448\u0443 \u0432\u043D\u0435\u0448\u043D\u043E\u0441\u0442\u044C."], ["\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u043E \u0441\u0442\u043E\u0438\u0442?", "\u041E\u043F\u043B\u0430\u0442\u0430 \u043F\u0430\u043A\u0435\u0442\u0430\u043C\u0438 \u0431\u0435\u0437 \u043F\u043E\u0434\u043F\u0438\u0441\u043A\u0438: \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0441\u0442\u043E\u0438\u0442 \u043E\u0442 {{PER_FROM}} \u0432 \u0437\u0430\u0432\u0438\u0441\u0438\u043C\u043E\u0441\u0442\u0438 \u043E\u0442 \u043F\u0430\u043A\u0435\u0442\u0430."]]
    },
    en: {
      slug: "ai-headshots-for-resume",
      title: "AI Headshot for Your Resume: Professional CV Photo from a Selfie | Portretto",
      desc: "Get a professional resume photo without a photographer. Upload a selfie and receive a business headshot with a suit and neutral backdrop. Your face stays yours. From {{PER_FROM}} per photo.",
      h1: "A resume photo from a simple selfie",
      lead: "Recruiters spend seconds on a CV and the photo is the first thing they notice. A clean business headshot on a neutral backdrop makes your resume look serious and memorable. Portretto creates one from your selfie in about a minute.",
      benefits: ["Tailored suit or blazer on a neutral grey backdrop, just like a studio", "Your face and features stay yours: the AI changes light, clothes and background", "Square or 4:5 portrait format for job boards, LinkedIn and PDF resumes"],
      tips: ["Upload a front-facing photo in daylight for the best likeness", "For a resume, pick a calm expression with a soft smile", 'Add details to the description, e.g. "light grey blazer, no tie"', "Create 2\u20134 variants and choose the best one: each is slightly different"],
      faq: [["What makes a good resume photo?", "Head-and-shoulders framing, a clearly visible face, a neutral background, business clothing and a calm expression. The Business headshot look is set up exactly like that."], ["Is it OK to use an AI photo on a resume?", "Yes, as long as it really shows you. Portretto keeps your facial features and only changes lighting, background and clothing, so the portrait is an honest likeness."], ["How much does it cost?", "Credit packs, no subscription: a portrait costs from {{PER_FROM}} depending on the pack."]]
    }
  },
  {
    id: "linkedin",
    look: "office",
    ru: {
      slug: "foto-dlya-linkedin",
      title: "\u0424\u043E\u0442\u043E \u0434\u043B\u044F LinkedIn: \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0430 \u0438\u0437 \u0441\u0435\u043B\u0444\u0438 | Portretto",
      desc: "\u041F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u0444\u043E\u0442\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u0434\u043B\u044F LinkedIn \u0437\u0430 \u043C\u0438\u043D\u0443\u0442\u0443. \u0421\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0439 \u043E\u0444\u0438\u0441 \u0438\u043B\u0438 \u0441\u0442\u0443\u0434\u0438\u0439\u043D\u044B\u0439 \u0444\u043E\u043D, \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u0430\u044F \u0443\u043B\u044B\u0431\u043A\u0430, \u0432\u0430\u0448\u0435 \u043B\u0438\u0446\u043E. \u0411\u0435\u0437 \u0444\u043E\u0442\u043E\u0441\u0435\u0441\u0441\u0438\u0438 \u0438 \u0437\u0430\u043F\u0438\u0441\u0438.",
      h1: "\u0424\u043E\u0442\u043E \u0434\u043B\u044F LinkedIn, \u043A\u043E\u0442\u043E\u0440\u043E\u0435 \u0432\u044B\u0437\u044B\u0432\u0430\u0435\u0442 \u0434\u043E\u0432\u0435\u0440\u0438\u0435",
      lead: "\u041F\u0440\u043E\u0444\u0438\u043B\u0438 \u0441 \u0445\u043E\u0440\u043E\u0448\u0438\u043C \u0444\u043E\u0442\u043E \u0447\u0430\u0449\u0435 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u044E\u0442 \u0438 \u0447\u0430\u0449\u0435 \u043E\u0442\u0432\u0435\u0447\u0430\u044E\u0442 \u043D\u0430 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F. \u0414\u043B\u044F LinkedIn \u043B\u0443\u0447\u0448\u0435 \u0432\u0441\u0435\u0433\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0434\u0440\u0443\u0436\u0435\u043B\u044E\u0431\u043D\u044B\u0439 \u0434\u0435\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442: \u0441\u0432\u0435\u0442\u043B\u044B\u0439 \u0444\u043E\u043D, \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0439 \u0432\u0437\u0433\u043B\u044F\u0434, \u0430\u043A\u043A\u0443\u0440\u0430\u0442\u043D\u0430\u044F \u043E\u0434\u0435\u0436\u0434\u0430. \u0412\u0441\u0451 \u044D\u0442\u043E \u043C\u043E\u0436\u043D\u043E \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u044C \u0438\u0437 \u043E\u0431\u044B\u0447\u043D\u043E\u0433\u043E \u0441\u0435\u043B\u0444\u0438.",
      benefits: ["\u041E\u0431\u0440\u0430\u0437\u044B \xAB\u0421\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0439 \u043E\u0444\u0438\u0441\xBB \u0438 \xAB\u0414\u0435\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442\xBB \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u044C\u043D\u043E \u0434\u043B\u044F \u043F\u0440\u043E\u0444\u0438\u043B\u044F", "\u0424\u043E\u0440\u043C\u0430\u0442 1:1 \u0443\u0436\u0435 \u043F\u043E\u0434\u0445\u043E\u0434\u0438\u0442 \u0434\u043B\u044F \u043A\u0440\u0443\u0433\u043B\u043E\u0439 \u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0438 LinkedIn", "\u041C\u043E\u0436\u043D\u043E \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0435\u0434\u0438\u043D\u044B\u0439 \u0441\u0442\u0438\u043B\u044C \u0444\u043E\u0442\u043E \u0434\u043B\u044F \u0432\u0441\u0435\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u044B"],
      tips: ["\u041B\u0438\u0446\u043E \u0434\u043E\u043B\u0436\u043D\u043E \u0437\u0430\u043D\u0438\u043C\u0430\u0442\u044C \u0431\u043E\u043B\u044C\u0448\u0443\u044E \u0447\u0430\u0441\u0442\u044C \u043A\u0430\u0434\u0440\u0430: \u0432\u044B\u0431\u0438\u0440\u0430\u0439\u0442\u0435 \u043A\u0430\u0434\u0440 \u043F\u043E \u043F\u043B\u0435\u0447\u0438", "\u0421\u0432\u0435\u0442\u043B\u044B\u0439 \u0444\u043E\u043D \u043B\u0443\u0447\u0448\u0435 \u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F \u0432 \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0439 \u043A\u0440\u0443\u0433\u043B\u043E\u0439 \u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0435", "\u041B\u0451\u0433\u043A\u0430\u044F \u0443\u043B\u044B\u0431\u043A\u0430 \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u0434\u0440\u0443\u0436\u0435\u043B\u044E\u0431\u043D\u0435\u0435, \u0447\u0435\u043C \u0441\u0435\u0440\u044C\u0451\u0437\u043D\u044B\u0439 \u0432\u0437\u0433\u043B\u044F\u0434", "\u0414\u043B\u044F \u043E\u0431\u043B\u043E\u0436\u043A\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u0441\u0434\u0435\u043B\u0430\u0439\u0442\u0435 \u0433\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u044C\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 3:2"],
      faq: [["\u041A\u0430\u043A\u043E\u0439 \u0440\u0430\u0437\u043C\u0435\u0440 \u0444\u043E\u0442\u043E \u043D\u0443\u0436\u0435\u043D \u0434\u043B\u044F LinkedIn?", "LinkedIn \u0440\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u0435\u0442 \u043A\u0432\u0430\u0434\u0440\u0430\u0442\u043D\u043E\u0435 \u0444\u043E\u0442\u043E \u043E\u0442 400\xD7400 \u043F\u0438\u043A\u0441\u0435\u043B\u0435\u0439. \u041F\u043E\u0440\u0442\u0440\u0435\u0442\u0442\u043E \u0432\u044B\u0434\u0430\u0451\u0442 \u0441\u043D\u0438\u043C\u043A\u0438 \u0432 \u0432\u044B\u0441\u043E\u043A\u043E\u043C \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0438 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 1:1 \u0438 \u0434\u0440\u0443\u0433\u0438\u0445."], ["\u0411\u0443\u0434\u0435\u0442 \u043B\u0438 \u0444\u043E\u0442\u043E \u043F\u043E\u0445\u043E\u0436\u0435 \u043D\u0430 \u043C\u0435\u043D\u044F?", "\u0421\u0445\u043E\u0434\u0441\u0442\u0432\u043E \u043B\u0438\u0446\u0430 \u0432 \u043F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442\u0435. \u0414\u043B\u044F \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0439 \u0442\u043E\u0447\u043D\u043E\u0441\u0442\u0438 \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 \xAB\u041C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0435 \u0441\u0445\u043E\u0434\u0441\u0442\u0432\u043E\xBB \u0438\u043B\u0438 \u043E\u0431\u0443\u0447\u0438\u0442\u0435 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u0443\u044E \u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0430 10\u201320 \u0441\u0432\u043E\u0438\u0445 \u0444\u043E\u0442\u043E."], ["\u041C\u043E\u0436\u043D\u043E \u043B\u0438 \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0444\u043E\u0442\u043E \u0432\u0441\u0435\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u0435?", "\u0414\u0430: \u043A\u0430\u0436\u0434\u044B\u0439 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442 \u0441\u0432\u043E\u0451 \u0441\u0435\u043B\u0444\u0438 \u0438 \u0432\u044B\u0431\u0438\u0440\u0430\u0435\u0442 \u043E\u0434\u0438\u043D \u0438 \u0442\u043E\u0442 \u0436\u0435 \u043E\u0431\u0440\u0430\u0437, \u0438 \u0444\u043E\u0442\u043E \u043F\u043E\u043B\u0443\u0447\u0430\u044E\u0442\u0441\u044F \u0432 \u0435\u0434\u0438\u043D\u043E\u043C \u0441\u0442\u0438\u043B\u0435."]]
    },
    en: {
      slug: "linkedin-profile-photo",
      title: "LinkedIn Profile Photo from a Selfie: AI Headshot Generator | Portretto",
      desc: "A professional LinkedIn profile picture in a minute. Modern office or studio backdrop, a natural smile and your real face. No photo shoot, no booking.",
      h1: "A LinkedIn photo that builds trust",
      lead: "Profiles with a good photo get more views and more replies. On LinkedIn the best photo is a friendly business portrait: a light background, an open look and neat clothing. You can get all of that from an ordinary selfie.",
      benefits: ["Modern office and Business headshot looks made for profiles", "1:1 format fits LinkedIn's round profile frame", "Give your whole team a consistent photo style"],
      tips: ["Your face should fill most of the frame: go for head and shoulders", "A light background reads better in a small round avatar", "A soft smile looks more approachable than a serious stare", "Make a 3:2 landscape version for your profile banner"],
      faq: [["What size should a LinkedIn photo be?", "LinkedIn recommends a square photo of at least 400\xD7400 pixels. Portretto delivers high-resolution images in 1:1 and other formats."], ["Will it look like me?", "Likeness comes first. For the most accurate result, turn on Maximum likeness or train a personal model on 10\u201320 of your photos."], ["Can I make photos for my whole team?", "Yes: each person uploads a selfie and picks the same look, so the photos come out in one consistent style."]]
    }
  },
  {
    id: "business",
    look: "business",
    ru: {
      slug: "delovoy-portret",
      title: "\u0414\u0435\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u043E\u043D\u043B\u0430\u0439\u043D: \u0431\u0438\u0437\u043D\u0435\u0441-\u0444\u043E\u0442\u043E \u0431\u0435\u0437 \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0430 | Portretto",
      desc: "\u0414\u0435\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0434\u043B\u044F \u0441\u0430\u0439\u0442\u0430, \u0432\u0438\u0437\u0438\u0442\u043A\u0438, \u043F\u0440\u0435\u0437\u0435\u043D\u0442\u0430\u0446\u0438\u0438 \u0438 \u0441\u043E\u0446\u0441\u0435\u0442\u0435\u0439. \u0421\u0442\u0443\u0434\u0438\u0439\u043D\u044B\u0439 \u0441\u0432\u0435\u0442, \u0441\u0442\u0440\u043E\u0433\u0438\u0439 \u0441\u0442\u0438\u043B\u044C, \u0432\u0430\u0448\u0435 \u043B\u0438\u0446\u043E. \u0413\u043E\u0442\u043E\u0432\u043E \u0437\u0430 \u043C\u0438\u043D\u0443\u0442\u0443, \u043E\u043F\u043B\u0430\u0442\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0437\u0430 \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u044B.",
      h1: "\u0414\u0435\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0431\u0435\u0437 \u0441\u0442\u0443\u0434\u0438\u0438 \u0438 \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0430",
      lead: "\u0414\u0435\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u043D\u0443\u0436\u0435\u043D \u0434\u043B\u044F \u0441\u0430\u0439\u0442\u0430, \u0432\u0438\u0437\u0438\u0442\u043A\u0438, \u043F\u0440\u0435\u0437\u0435\u043D\u0442\u0430\u0446\u0438\u0438, \u0441\u0442\u0430\u0442\u044C\u0438 \u0438\u043B\u0438 \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u0432 \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u0435. \u041E\u0431\u044B\u0447\u043D\u043E \u044D\u0442\u043E \u0437\u0430\u043F\u0438\u0441\u044C \u043A \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0443, \u0430\u0440\u0435\u043D\u0434\u0430 \u0441\u0442\u0443\u0434\u0438\u0438 \u0438 \u043D\u0435\u0434\u0435\u043B\u044F \u043E\u0436\u0438\u0434\u0430\u043D\u0438\u044F. \u0412 \u041F\u043E\u0440\u0442\u0440\u0435\u0442\u0442\u043E \u0432\u044B \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442\u0435 \u0441\u0442\u0443\u0434\u0438\u0439\u043D\u044B\u0439 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0438\u0437 \u0441\u0435\u043B\u0444\u0438, \u043D\u0435 \u0432\u044B\u0445\u043E\u0434\u044F \u0438\u0437 \u0434\u043E\u043C\u0430.",
      benefits: ["\u0421\u0432\u0435\u0442 \u043A\u0430\u043A \u043D\u0430 \u043A\u043E\u043C\u043C\u0435\u0440\u0447\u0435\u0441\u043A\u043E\u0439 \u0441\u044A\u0451\u043C\u043A\u0435: \u043E\u043A\u0442\u043E\u0431\u043E\u043A\u0441 \u0438 \u043A\u043E\u043D\u0442\u0440\u043E\u0432\u043E\u0439 \u0441\u0432\u0435\u0442", "\u0421\u0442\u0440\u043E\u0433\u0438\u0435 \u0438 \u0441\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0435 \u043E\u0431\u0440\u0430\u0437\u044B: \u0441\u0442\u0443\u0434\u0438\u044F, \u043E\u0444\u0438\u0441, \u043F\u0440\u0435\u043C\u0438\u0443\u043C \u043B\u043E\u0443-\u043A\u0438, \u043A\u043B\u0430\u0441\u0441\u0438\u043A\u0430 \u0427/\u0411", "\u041C\u043E\u0436\u043D\u043E \u0438\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043B\u044E\u0431\u0443\u044E \u0434\u0435\u0442\u0430\u043B\u044C \u043A\u043D\u043E\u043F\u043A\u043E\u0439 \xAB\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C\xBB"],
      tips: ["\u0414\u043B\u044F \u0441\u0430\u0439\u0442\u0430 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0434\u0438\u043D \u043E\u0431\u0440\u0430\u0437 \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u043E\u0432", "\u0422\u0451\u043C\u043D\u044B\u0439 \u043E\u0431\u0440\u0430\u0437 \xAB\u041F\u0440\u0435\u043C\u0438\u0443\u043C \u043B\u043E\u0443-\u043A\u0438\xBB \u0445\u043E\u0440\u043E\u0448\u043E \u043F\u043E\u0434\u0445\u043E\u0434\u0438\u0442 \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u044F\u043C", "\u0427\u0451\u0440\u043D\u043E-\u0431\u0435\u043B\u044B\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0441\u043C\u043E\u0442\u0440\u0438\u0442\u0441\u044F \u0441\u043E\u043B\u0438\u0434\u043D\u043E \u0432 \u0441\u0442\u0430\u0442\u044C\u044F\u0445 \u0438 \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E", "\u041F\u0438\u0448\u0438\u0442\u0435 \u043F\u043E\u0436\u0435\u043B\u0430\u043D\u0438\u044F \u043A \u043E\u0434\u0435\u0436\u0434\u0435: \xAB\u0442\u0451\u043C\u043D\u043E-\u0441\u0438\u043D\u0438\u0439 \u043A\u043E\u0441\u0442\u044E\u043C\xBB, \xAB\u0432\u043E\u0434\u043E\u043B\u0430\u0437\u043A\u0430\xBB"],
      faq: [["\u0427\u0435\u043C \u0434\u0435\u043B\u043E\u0432\u043E\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u043E\u0442\u043B\u0438\u0447\u0430\u0435\u0442\u0441\u044F \u043E\u0442 \u043E\u0431\u044B\u0447\u043D\u043E\u0433\u043E \u0444\u043E\u0442\u043E?", "\u041F\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u043E\u0439 \u0441\u0432\u0435\u0442\u0430, \u043D\u0435\u0439\u0442\u0440\u0430\u043B\u044C\u043D\u044B\u043C \u0444\u043E\u043D\u043E\u043C, \u0434\u0435\u043B\u043E\u0432\u043E\u0439 \u043E\u0434\u0435\u0436\u0434\u043E\u0439 \u0438 \u0443\u0432\u0435\u0440\u0435\u043D\u043D\u043E\u0439 \u043F\u043E\u0437\u043E\u0439. \u0412\u0441\u0451 \u044D\u0442\u043E \u0437\u0430\u0434\u0430\u0451\u0442\u0441\u044F \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u043C \u043E\u0431\u0440\u0430\u0437\u043E\u043C."], ["\u041C\u043E\u0436\u043D\u043E \u043B\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0432 \u0440\u0435\u043A\u043B\u0430\u043C\u0435 \u0438 \u043D\u0430 \u0441\u0430\u0439\u0442\u0435?", "\u0414\u0430, \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u044B \u043C\u043E\u0436\u043D\u043E \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u043D\u0430 \u0441\u0430\u0439\u0442\u0435, \u0432 \u043F\u0440\u0435\u0437\u0435\u043D\u0442\u0430\u0446\u0438\u044F\u0445, \u0440\u0435\u043A\u043B\u0430\u043C\u0435 \u0438 \u043F\u0435\u0447\u0430\u0442\u0438."], ["\u0427\u0442\u043E \u0435\u0441\u043B\u0438 \u0447\u0442\u043E-\u0442\u043E \u043D\u0435 \u043F\u043E\u043D\u0440\u0430\u0432\u0438\u0442\u0441\u044F?", "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u0418\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C\xBB \u0438 \u043E\u043F\u0438\u0448\u0438\u0442\u0435, \u0447\u0442\u043E \u043F\u043E\u043C\u0435\u043D\u044F\u0442\u044C. \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u044D\u0442\u0430 \u0434\u0435\u0442\u0430\u043B\u044C."]]
    },
    en: {
      slug: "professional-business-headshots",
      title: "Professional Business Headshots Online, No Photographer Needed | Portretto",
      desc: "Business headshots for your website, speaker bio, presentations and social media. Studio lighting, polished style, your real face. Ready in a minute, pay per portrait.",
      h1: "Business headshots without a studio or photographer",
      lead: "You need a business headshot for your website, speaker bio, pitch deck or company page. Usually that means booking a photographer, renting a studio and waiting a week. With Portretto you get a studio result from a selfie without leaving home.",
      benefits: ["Commercial-shoot lighting: octabox key light and rim light", "Formal and modern looks: studio, office, luxury low-key, classic B&W", "Fix any detail with the Fix button"],
      tips: ["For a company site, use one look for every team member", "The dark Luxury low-key look suits executives", "A black-and-white portrait looks authoritative in articles and interviews", 'Describe the outfit you want: "navy suit", "black turtleneck"'],
      faq: [["How is a business headshot different from a regular photo?", "Lighting, a neutral backdrop, business attire and a confident pose. All of that comes from the look you choose."], ["Can I use the headshots for marketing?", "Yes, you can use them on websites, presentations, ads and in print."], ["What if I don't like something?", "Click Fix and describe what to change. Only that detail will be edited."]]
    }
  },
  {
    id: "aiphotoshoot",
    look: "custom",
    ru: {
      slug: "neyrofotosessiya",
      title: "\u041D\u0435\u0439\u0440\u043E\u0444\u043E\u0442\u043E\u0441\u0435\u0441\u0441\u0438\u044F \u043E\u043D\u043B\u0430\u0439\u043D: \u0418\u0418-\u0444\u043E\u0442\u043E\u0441\u0435\u0441\u0441\u0438\u044F \u0441 \u0432\u0430\u0448\u0438\u043C \u043B\u0438\u0446\u043E\u043C | Portretto",
      desc: "\u041D\u0435\u0439\u0440\u043E\u0444\u043E\u0442\u043E\u0441\u0435\u0441\u0441\u0438\u044F \u0432 \u043B\u044E\u0431\u043E\u043C \u043E\u0431\u0440\u0430\u0437\u0435: \u0436\u0443\u0440\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u043E\u0431\u043B\u043E\u0436\u043A\u0430, \u0437\u043E\u043B\u043E\u0442\u043E\u0439 \u0447\u0430\u0441, \u043A\u0438\u043D\u043E-\u043D\u0435\u043E\u043D \u0438\u043B\u0438 \u0432\u0430\u0448 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 \u0441\u0446\u0435\u043D\u0430\u0440\u0438\u0439. \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0441\u0435\u043B\u0444\u0438, \u043E\u043F\u0438\u0448\u0438\u0442\u0435 \u043E\u0431\u0440\u0430\u0437 \u0438 \u043F\u043E\u043B\u0443\u0447\u0438\u0442\u0435 \u0444\u043E\u0442\u043E \u0437\u0430 \u043C\u0438\u043D\u0443\u0442\u0443.",
      h1: "\u041D\u0435\u0439\u0440\u043E\u0444\u043E\u0442\u043E\u0441\u0435\u0441\u0441\u0438\u044F \u0432 \u043B\u044E\u0431\u043E\u043C \u043E\u0431\u0440\u0430\u0437\u0435",
      lead: "\u041D\u0435\u0439\u0440\u043E\u0444\u043E\u0442\u043E\u0441\u0435\u0441\u0441\u0438\u044F \u2014 \u044D\u0442\u043E \u0444\u043E\u0442\u043E\u0441\u0435\u0441\u0441\u0438\u044F, \u043A\u043E\u0442\u043E\u0440\u0443\u044E \u0441\u043D\u0438\u043C\u0430\u0435\u0442 \u043D\u0435\u0439\u0440\u043E\u0441\u0435\u0442\u044C. \u0412\u044B \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0435 \u0441\u0432\u043E\u0438 \u0444\u043E\u0442\u043E, \u0432\u044B\u0431\u0438\u0440\u0430\u0435\u0442\u0435 \u043E\u0431\u0440\u0430\u0437 \u0438\u043B\u0438 \u043E\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442\u0435 \u0435\u0433\u043E \u0441\u043B\u043E\u0432\u0430\u043C\u0438, \u0438 \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442\u0435 \u0441\u043D\u0438\u043C\u043A\u0438, \u0431\u0443\u0434\u0442\u043E \u0441\u0434\u0435\u043B\u0430\u043D\u043D\u044B\u0435 \u0432 \u0441\u0442\u0443\u0434\u0438\u0438 \u0438\u043B\u0438 \u043D\u0430 \u0432\u044B\u0435\u0437\u0434\u0435. \u0411\u0435\u0437 \u0441\u0442\u0438\u043B\u0438\u0441\u0442\u0430, \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0430 \u0438 \u0430\u0440\u0435\u043D\u0434\u044B.",
      benefits: ["8 \u0433\u043E\u0442\u043E\u0432\u044B\u0445 \u043E\u0431\u0440\u0430\u0437\u043E\u0432 \u0438 \xAB\u0421\u0432\u043E\u0439 \u043E\u0431\u0440\u0430\u0437\xBB: \u043E\u043F\u0438\u0448\u0438\u0442\u0435 \u043B\u044E\u0431\u0443\u044E \u0441\u0446\u0435\u043D\u0443 \u0441\u0432\u043E\u0438\u043C\u0438 \u0441\u043B\u043E\u0432\u0430\u043C\u0438", "8 \u043D\u0435\u0439\u0440\u043E\u0441\u0435\u0442\u0435\u0439 \u043D\u0430 \u0432\u044B\u0431\u043E\u0440, \u0432\u043A\u043B\u044E\u0447\u0430\u044F Nano Banana Pro \u0438 FLUX", "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0430 10\u201320 \u0444\u043E\u0442\u043E \u0434\u043B\u044F \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0441\u0445\u043E\u0434\u0441\u0442\u0432\u0430"],
      tips: ["\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 2\u20133 \u0444\u043E\u0442\u043E \u0441 \u0440\u0430\u0437\u043D\u044B\u0445 \u0440\u0430\u043A\u0443\u0440\u0441\u043E\u0432: \u043D\u0435\u0439\u0440\u043E\u0441\u0435\u0442\u044C \u043B\u0443\u0447\u0448\u0435 \u043F\u043E\u0439\u043C\u0451\u0442 \u043B\u0438\u0446\u043E", "\u0412 \xAB\u0421\u0432\u043E\u0451\u043C \u043E\u0431\u0440\u0430\u0437\u0435\xBB \u043E\u043F\u0438\u0448\u0438\u0442\u0435 \u043C\u0435\u0441\u0442\u043E, \u043E\u0434\u0435\u0436\u0434\u0443, \u0441\u0432\u0435\u0442 \u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435", "\u041F\u0438\u0448\u0438\u0442\u0435 \u043D\u0430 \u043B\u044E\u0431\u043E\u043C \u044F\u0437\u044B\u043A\u0435, \u043C\u043E\u0434\u0435\u043B\u044C \u043F\u043E\u0439\u043C\u0451\u0442", "\u0415\u0441\u043B\u0438 \u043D\u0440\u0430\u0432\u0438\u0442\u0441\u044F \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442, \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u0435\u0433\u043E \u0438 \u0441\u0434\u0435\u043B\u0430\u0439\u0442\u0435 \u0435\u0449\u0451 \u0432\u0430\u0440\u0438\u0430\u0446\u0438\u0438"],
      faq: [["\u0427\u0442\u043E \u0442\u0430\u043A\u043E\u0435 \u043D\u0435\u0439\u0440\u043E\u0444\u043E\u0442\u043E\u0441\u0435\u0441\u0441\u0438\u044F?", "\u042D\u0442\u043E \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0444\u043E\u0442\u043E\u0433\u0440\u0430\u0444\u0438\u0439 \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u043D\u0435\u0439\u0440\u043E\u0441\u0435\u0442\u0438 \u043F\u043E \u0432\u0430\u0448\u0438\u043C \u0441\u043D\u0438\u043C\u043A\u0430\u043C. \u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u043A\u0430\u043A \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u0444\u043E\u0442\u043E\u0441\u0435\u0441\u0441\u0438\u044F, \u0430 \u043B\u0438\u0446\u043E \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u0432\u0430\u0448\u0438\u043C."], ["\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0444\u043E\u0442\u043E \u043D\u0443\u0436\u043D\u043E \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C?", "\u0414\u043B\u044F \u043E\u0431\u044B\u0447\u043D\u043E\u0439 \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438 \u0445\u0432\u0430\u0442\u0438\u0442 1\u20133 \u0444\u043E\u0442\u043E. \u0414\u043B\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438 \u043D\u0443\u0436\u043D\u043E 10\u201320 \u0444\u043E\u0442\u043E."], ["\u0425\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u043B\u0438 \u043C\u043E\u0438 \u0444\u043E\u0442\u043E?", "\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0444\u043E\u0442\u043E \u043D\u0435 \u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435. \u0413\u043E\u0442\u043E\u0432\u044B\u0435 \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u044B \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E \u0432\u0430\u0448\u0435\u043C\u0443 \u043B\u0438\u0447\u043D\u043E\u043C\u0443 \u043A\u043E\u0434\u0443."]]
    },
    en: {
      slug: "ai-photoshoot",
      title: "AI Photoshoot Online: Any Look, Your Real Face | Portretto",
      desc: "An AI photoshoot in any look: magazine cover, golden hour, cinematic neon or your own idea. Upload a selfie, describe the scene and get photos in a minute.",
      h1: "An AI photoshoot in any look",
      lead: "An AI photoshoot is a photo session shot by a neural network. You upload your photos, pick a look or describe it in words, and get images that look like they were shot in a studio or on location. No stylist, no photographer, no rental.",
      benefits: ["8 ready-made looks plus Your own idea: describe any scene in your words", "8 AI models to choose from, including Nano Banana Pro and FLUX", "A personal model trained on 10\u201320 photos for maximum likeness"],
      tips: ["Upload 2\u20133 photos from different angles so the AI understands your face", "With Your own idea, describe the place, outfit, light and mood", "Write in any language, the model understands", "Found a result you love? Save it and make more variations"],
      faq: [["What is an AI photoshoot?", "Creating photos with an AI from your own pictures. The result looks like a professional photo session while your face stays yours."], ["How many photos should I upload?", "1\u20133 photos are enough for a regular generation. A personal model needs 10\u201320 photos."], ["Are my photos stored?", "Source photos are not stored on the server. Finished portraits are available only with your personal code."]]
    }
  },
  {
    id: "avatar",
    look: "editorial",
    ru: {
      slug: "avatarka-dlya-socsetey",
      title: "\u0410\u0432\u0430\u0442\u0430\u0440\u043A\u0430 \u0434\u043B\u044F \u0441\u043E\u0446\u0441\u0435\u0442\u0435\u0439: \u044F\u0440\u043A\u043E\u0435 \u0444\u043E\u0442\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u0418\u0418 | Portretto",
      desc: "\u0421\u0442\u0438\u043B\u044C\u043D\u0430\u044F \u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0430 \u0434\u043B\u044F Instagram, Telegram, WhatsApp \u0438 TikTok. \u0416\u0443\u0440\u043D\u0430\u043B\u044C\u043D\u044B\u0439 \u0441\u0442\u0438\u043B\u044C, \u043A\u0438\u043D\u043E-\u043D\u0435\u043E\u043D \u0438\u043B\u0438 \u0437\u043E\u043B\u043E\u0442\u043E\u0439 \u0447\u0430\u0441. \u0412\u0430\u0448\u0435 \u043B\u0438\u0446\u043E, \u0441\u0442\u0443\u0434\u0438\u0439\u043D\u043E\u0435 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E, \u0437\u0430 \u043C\u0438\u043D\u0443\u0442\u0443.",
      h1: "\u0410\u0432\u0430\u0442\u0430\u0440\u043A\u0430, \u043A\u043E\u0442\u043E\u0440\u0443\u044E \u0437\u0430\u043C\u0435\u0447\u0430\u044E\u0442",
      lead: "\u0424\u043E\u0442\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F \u2014 \u043F\u0435\u0440\u0432\u043E\u0435, \u0447\u0442\u043E \u0432\u0438\u0434\u044F\u0442 \u043F\u043E\u0434\u043F\u0438\u0441\u0447\u0438\u043A\u0438 \u0438 \u0441\u043E\u0431\u0435\u0441\u0435\u0434\u043D\u0438\u043A\u0438. \u041F\u043E\u0440\u0442\u0440\u0435\u0442\u0442\u043E \u043F\u0440\u0435\u0432\u0440\u0430\u0449\u0430\u0435\u0442 \u043E\u0431\u044B\u0447\u043D\u043E\u0435 \u0441\u0435\u043B\u0444\u0438 \u0432 \u044F\u0440\u043A\u0438\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0432 \u0441\u0442\u0438\u043B\u0435 \u0436\u0443\u0440\u043D\u0430\u043B\u044C\u043D\u043E\u0439 \u043E\u0431\u043B\u043E\u0436\u043A\u0438, \u043A\u0438\u043D\u043E\u043A\u0430\u0434\u0440\u0430 \u0438\u043B\u0438 \u0437\u0430\u043A\u0430\u0442\u043D\u043E\u0439 \u0441\u044A\u0451\u043C\u043A\u0438, \u0442\u0430\u043A \u0447\u0442\u043E \u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0430 \u0432\u044B\u0434\u0435\u043B\u044F\u0435\u0442\u0441\u044F \u0432 \u043B\u0435\u043D\u0442\u0435 \u0438 \u0447\u0430\u0442\u0430\u0445.",
      benefits: ["\u0421\u043C\u0435\u043B\u044B\u0435 \u043E\u0431\u0440\u0430\u0437\u044B: \u043E\u0431\u043B\u043E\u0436\u043A\u0430 \u0436\u0443\u0440\u043D\u0430\u043B\u0430, \u043A\u0438\u043D\u043E-\u043D\u0435\u043E\u043D, \u0437\u043E\u043B\u043E\u0442\u043E\u0439 \u0447\u0430\u0441", "\u041A\u0432\u0430\u0434\u0440\u0430\u0442 1:1 \u0434\u043B\u044F \u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0438 \u0438 9:16 \u0434\u043B\u044F \u0441\u0442\u043E\u0440\u0438\u0441", "\u041C\u043E\u0436\u043D\u043E \u0434\u043E\u043F\u0438\u0441\u0430\u0442\u044C \u0434\u0435\u0442\u0430\u043B\u0438: \u0446\u0432\u0435\u0442 \u0444\u043E\u043D\u0430, \u043E\u0434\u0435\u0436\u0434\u0443, \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435"],
      tips: ["\u0414\u043B\u044F \u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0438 \u0432\u044B\u0431\u0438\u0440\u0430\u0439\u0442\u0435 \u043A\u0430\u0434\u0440 \u043A\u0440\u0443\u043F\u043D\u044B\u043C \u043F\u043B\u0430\u043D\u043E\u043C", "\u041A\u043E\u043D\u0442\u0440\u0430\u0441\u0442\u043D\u044B\u0439 \u0446\u0432\u0435\u0442\u043D\u043E\u0439 \u0444\u043E\u043D \u0445\u043E\u0440\u043E\u0448\u043E \u0441\u043C\u043E\u0442\u0440\u0438\u0442\u0441\u044F \u0432 \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u043C \u043A\u0440\u0443\u0436\u043A\u0435", "\u0414\u043B\u044F \u0441\u0442\u043E\u0440\u0438\u0441 \u0441\u0434\u0435\u043B\u0430\u0439\u0442\u0435 \u0432\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 9:16", "\u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043E\u0431\u0440\u0430\u0437\u043E\u0432 \u0438 \u043E\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0442\u043E\u0442, \u0447\u0442\u043E \u0431\u043B\u0438\u0436\u0435 \u0432\u0430\u043C"],
      faq: [["\u0414\u043B\u044F \u043A\u0430\u043A\u0438\u0445 \u0441\u043E\u0446\u0441\u0435\u0442\u0435\u0439 \u043F\u043E\u0434\u0445\u043E\u0434\u0438\u0442?", "\u0414\u043B\u044F \u043B\u044E\u0431\u044B\u0445: Instagram, Telegram, WhatsApp, TikTok, Facebook, X \u0438 \u043C\u0435\u0441\u0441\u0435\u043D\u0434\u0436\u0435\u0440\u043E\u0432. \u0415\u0441\u0442\u044C \u0444\u043E\u0440\u043C\u0430\u0442\u044B 1:1, 4:5 \u0438 9:16."], ["\u041C\u043E\u0436\u043D\u043E \u043B\u0438 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0441\u0432\u043E\u0439 \u0446\u0432\u0435\u0442 \u0444\u043E\u043D\u0430?", "\u0414\u0430, \u043F\u0440\u043E\u0441\u0442\u043E \u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0438, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \xAB\u044F\u0440\u043A\u043E-\u0436\u0451\u043B\u0442\u044B\u0439 \u0444\u043E\u043D\xBB."], ["\u041C\u043E\u0436\u043D\u043E \u043B\u0438 \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0430\u0432\u0430\u0442\u0430\u0440\u043A\u0443 \u0432 \u043D\u0435\u043E\u0431\u044B\u0447\u043D\u043E\u043C \u043E\u0431\u0440\u0430\u0437\u0435?", "\u0414\u0430, \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \xAB\u0421\u0432\u043E\u0439 \u043E\u0431\u0440\u0430\u0437\xBB \u0438 \u043E\u043F\u0438\u0448\u0438\u0442\u0435 \u043B\u044E\u0431\u0443\u044E \u0441\u0446\u0435\u043D\u0443."]]
    },
    en: {
      slug: "ai-profile-picture",
      title: "AI Profile Picture Generator for Instagram, TikTok & More | Portretto",
      desc: "A stylish profile picture for Instagram, Telegram, WhatsApp and TikTok. Magazine style, cinematic neon or golden hour. Your face, studio quality, in a minute.",
      h1: "A profile picture people notice",
      lead: "Your profile photo is the first thing followers and contacts see. Portretto turns an ordinary selfie into a bold portrait styled like a magazine cover, a film still or a sunset shoot, so your avatar stands out in feeds and chats.",
      benefits: ["Bold looks: magazine cover, cinematic neon, golden hour", "1:1 square for avatars and 9:16 for stories", "Add details: background color, outfit, mood"],
      tips: ["For avatars, go for a close-up crop", "A contrasting colored background works well in a small circle", "Make a vertical 9:16 version for stories", "Try a few looks and keep the one that feels most like you"],
      faq: [["Which social networks is it for?", "Any of them: Instagram, Telegram, WhatsApp, TikTok, Facebook, X and messengers. Formats 1:1, 4:5 and 9:16 are available."], ["Can I pick my own background color?", 'Yes, just write it in the description, e.g. "bright yellow background".'], ["Can I make an unusual avatar?", "Yes, choose Your own idea and describe any scene."]]
    }
  },
  {
    id: "team",
    look: "office",
    ru: {
      slug: "foto-dlya-sayta-kompanii",
      title: "\u0424\u043E\u0442\u043E \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u043E\u0432 \u0434\u043B\u044F \u0441\u0430\u0439\u0442\u0430 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438 \u0432 \u0435\u0434\u0438\u043D\u043E\u043C \u0441\u0442\u0438\u043B\u0435 | Portretto",
      desc: "\u0424\u043E\u0442\u043E \u0432\u0441\u0435\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0434\u043B\u044F \u0441\u0430\u0439\u0442\u0430, \u043F\u0440\u0435\u0437\u0435\u043D\u0442\u0430\u0446\u0438\u0439 \u0438 LinkedIn \u0432 \u0435\u0434\u0438\u043D\u043E\u043C \u0441\u0442\u0438\u043B\u0435, \u0431\u0435\u0437 \u0432\u044B\u0435\u0437\u0434\u043D\u043E\u0439 \u0444\u043E\u0442\u043E\u0441\u0435\u0441\u0441\u0438\u0438. \u041A\u0430\u0436\u0434\u044B\u0439 \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442 \u0441\u0435\u043B\u0444\u0438, \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u043E \u043F\u0440\u043E\u0444\u0435\u0441\u0441\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0439.",
      h1: "\u0424\u043E\u0442\u043E \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0434\u043B\u044F \u0441\u0430\u0439\u0442\u0430 \u0432 \u0435\u0434\u0438\u043D\u043E\u043C \u0441\u0442\u0438\u043B\u0435",
      lead: "\u041A\u043E\u0433\u0434\u0430 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0438 \u0440\u0430\u0431\u043E\u0442\u0430\u044E\u0442 \u0432 \u0440\u0430\u0437\u043D\u044B\u0445 \u0433\u043E\u0440\u043E\u0434\u0430\u0445 \u0438\u043B\u0438 \u0443\u0434\u0430\u043B\u0451\u043D\u043D\u043E, \u0441\u043E\u0431\u0440\u0430\u0442\u044C \u0432\u0441\u0435\u0445 \u043D\u0430 \u0444\u043E\u0442\u043E\u0441\u0435\u0441\u0441\u0438\u044E \u043F\u043E\u0447\u0442\u0438 \u043D\u0435\u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E. \u0421 \u041F\u043E\u0440\u0442\u0440\u0435\u0442\u0442\u043E \u043A\u0430\u0436\u0434\u044B\u0439 \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442 \u0441\u0432\u043E\u0451 \u0441\u0435\u043B\u0444\u0438 \u0438 \u0432\u044B\u0431\u0438\u0440\u0430\u0435\u0442 \u043E\u0434\u0438\u043D \u0438 \u0442\u043E\u0442 \u0436\u0435 \u043E\u0431\u0440\u0430\u0437, \u0430 \u0441\u0430\u0439\u0442 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438 \u043F\u043E\u043B\u0443\u0447\u0430\u0435\u0442 \u0430\u043A\u043A\u0443\u0440\u0430\u0442\u043D\u044B\u0435 \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u044B \u0432 \u0435\u0434\u0438\u043D\u043E\u043C \u0441\u0442\u0438\u043B\u0435.",
      benefits: ["\u041E\u0434\u0438\u043D \u043E\u0431\u0440\u0430\u0437 \u0438 \u0444\u043E\u0440\u043C\u0430\u0442 \u0434\u043B\u044F \u0432\u0441\u0435\u0445: \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u0439 \u0441\u0432\u0435\u0442, \u0444\u043E\u043D \u0438 \u043A\u0430\u0434\u0440", "\u041D\u0435 \u043D\u0443\u0436\u043D\u043E \u0441\u043E\u0431\u0438\u0440\u0430\u0442\u044C \u043B\u044E\u0434\u0435\u0439 \u0432 \u043E\u0434\u043D\u043E\u043C \u043C\u0435\u0441\u0442\u0435 \u0438 \u0430\u0440\u0435\u043D\u0434\u043E\u0432\u0430\u0442\u044C \u0441\u0442\u0443\u0434\u0438\u044E", "\u041D\u043E\u0432\u044B\u0435 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0438 \u043F\u043E\u043B\u0443\u0447\u0430\u044E\u0442 \u0444\u043E\u0442\u043E \u0432 \u0442\u043E\u043C \u0436\u0435 \u0441\u0442\u0438\u043B\u0435 \u0437\u0430 \u043C\u0438\u043D\u0443\u0442\u0443"],
      tips: ["\u0414\u043E\u0433\u043E\u0432\u043E\u0440\u0438\u0442\u0435\u0441\u044C \u043E \u0435\u0434\u0438\u043D\u043E\u043C \u043E\u0431\u0440\u0430\u0437\u0435, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \xAB\u0421\u043E\u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u0439 \u043E\u0444\u0438\u0441\xBB", "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043E\u0434\u0438\u043D \u0444\u043E\u0440\u043C\u0430\u0442, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \u043A\u0432\u0430\u0434\u0440\u0430\u0442 1:1, \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A", "\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u043E\u0434\u0435\u0436\u0434\u044B: \xAB\u0442\u0451\u043C\u043D\u044B\u0439 \u043F\u0438\u0434\u0436\u0430\u043A, \u0431\u0435\u043B\u0430\u044F \u0440\u0443\u0431\u0430\u0448\u043A\u0430\xBB", "\u0414\u043B\u044F \u0440\u0443\u043A\u043E\u0432\u043E\u0434\u0438\u0442\u0435\u043B\u0435\u0439 \u043F\u043E\u0434\u043E\u0439\u0434\u0451\u0442 \u0442\u043E\u0442 \u0436\u0435 \u043E\u0431\u0440\u0430\u0437 \u0432 \u0447\u0451\u0440\u043D\u043E-\u0431\u0435\u043B\u043E\u043C \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0435"],
      faq: [["\u041A\u0430\u043A \u043E\u043F\u043B\u0430\u0442\u0438\u0442\u044C \u0444\u043E\u0442\u043E \u0434\u043B\u044F \u0432\u0441\u0435\u0439 \u043A\u043E\u043C\u0430\u043D\u0434\u044B?", "\u041A\u0443\u043F\u0438\u0442\u0435 \u043F\u0430\u043A\u0435\u0442 \u043D\u0430 \u043D\u0443\u0436\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u043E\u0432 \u0438 \u0440\u0430\u0437\u0434\u0430\u0439\u0442\u0435 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0430\u043C \u043E\u0434\u0438\u043D \u043A\u043E\u0434, \u0438\u043B\u0438 \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043A\u0430\u0436\u0434\u043E\u043C\u0443 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0439."], ["\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u044D\u0442\u043E \u0437\u0430\u0439\u043C\u0451\u0442?", "\u041A\u0430\u0436\u0434\u043E\u043C\u0443 \u0441\u043E\u0442\u0440\u0443\u0434\u043D\u0438\u043A\u0443 \u043D\u0443\u0436\u043D\u043E 2\u20133 \u043C\u0438\u043D\u0443\u0442\u044B: \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0441\u0435\u043B\u0444\u0438, \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u043E\u0431\u0440\u0430\u0437 \u0438 \u0441\u043A\u0430\u0447\u0430\u0442\u044C \u043B\u0443\u0447\u0448\u0438\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442."], ["\u0411\u0443\u0434\u0443\u0442 \u043B\u0438 \u0444\u043E\u0442\u043E \u043E\u0434\u0438\u043D\u0430\u043A\u043E\u0432\u044B\u043C\u0438 \u043F\u043E \u0441\u0442\u0438\u043B\u044E?", "\u0414\u0430, \u0435\u0441\u043B\u0438 \u0432\u0441\u0435 \u0432\u044B\u0431\u0438\u0440\u0430\u044E\u0442 \u043E\u0434\u0438\u043D \u043E\u0431\u0440\u0430\u0437 \u0438 \u0444\u043E\u0440\u043C\u0430\u0442: \u0441\u0432\u0435\u0442, \u0444\u043E\u043D \u0438 \u043A\u0430\u0434\u0440 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u044E\u0442."]]
    },
    en: {
      slug: "team-headshots-for-company-website",
      title: "Team Headshots for Your Company Website in One Consistent Style | Portretto",
      desc: "Consistent headshots for your whole team for the website, decks and LinkedIn, with no on-site shoot. Everyone uploads a selfie and gets an equally professional result.",
      h1: "Team headshots in one consistent style",
      lead: "When your team works remotely or across cities, getting everyone to one photo shoot is almost impossible. With Portretto each person uploads a selfie and picks the same look, and your website gets neat portraits in one consistent style.",
      benefits: ["One look and format for everyone: same lighting, backdrop and framing", "No need to gather people in one place or rent a studio", "New hires get a matching photo in a minute"],
      tips: ["Agree on one look, for example Modern office", "Use one format, e.g. 1:1 square, for every team card", 'Add the same outfit description: "dark blazer, white shirt"', "For leadership, use the same look in black and white"],
      faq: [["How do we pay for the whole team?", "Buy a pack with enough portraits and share one code with the team, or create a separate code for each person."], ["How long does it take?", "About 2\u20133 minutes per person: upload a selfie, pick the look and download the best variant."], ["Will the photos match in style?", "Yes, if everyone chooses the same look and format: lighting, backdrop and framing match."]]
    }
  },
  {
    id: "bw",
    look: "bw_classic",
    ru: {
      slug: "chyorno-beloe-foto-portret",
      title: "\u0427\u0451\u0440\u043D\u043E-\u0431\u0435\u043B\u044B\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u043E\u043D\u043B\u0430\u0439\u043D: \u043A\u043B\u0430\u0441\u0441\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0441\u0442\u0443\u0434\u0438\u0439\u043D\u0430\u044F \u0441\u044A\u0451\u043C\u043A\u0430 \u0438\u0437 \u0441\u0435\u043B\u0444\u0438 | Portretto",
      desc: "\u0411\u043B\u0430\u0433\u043E\u0440\u043E\u0434\u043D\u044B\u0439 \u0447\u0451\u0440\u043D\u043E-\u0431\u0435\u043B\u044B\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0441 \u0440\u0435\u043C\u0431\u0440\u0430\u043D\u0434\u0442\u043E\u0432\u0441\u043A\u0438\u043C \u0441\u0432\u0435\u0442\u043E\u043C \u0438\u0437 \u043E\u0431\u044B\u0447\u043D\u043E\u0433\u043E \u0441\u0435\u043B\u0444\u0438. \u0414\u043B\u044F \u0441\u0442\u0430\u0442\u0435\u0439, \u043A\u043D\u0438\u0433, \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E \u0438 \u043F\u043E\u0434\u0430\u0440\u043A\u0430. \u0412\u0430\u0448\u0435 \u043B\u0438\u0446\u043E, \u0441\u0442\u0443\u0434\u0438\u0439\u043D\u043E\u0435 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u043E.",
      h1: "\u0427\u0451\u0440\u043D\u043E-\u0431\u0435\u043B\u044B\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0432 \u0434\u0443\u0445\u0435 \u0441\u0442\u0443\u0434\u0438\u0439\u043D\u043E\u0439 \u043A\u043B\u0430\u0441\u0441\u0438\u043A\u0438",
      lead: "\u0427\u0451\u0440\u043D\u043E-\u0431\u0435\u043B\u044B\u0439 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u043D\u0435 \u0432\u044B\u0445\u043E\u0434\u0438\u0442 \u0438\u0437 \u043C\u043E\u0434\u044B: \u043E\u043D \u0443\u0431\u0438\u0440\u0430\u0435\u0442 \u0432\u0441\u0451 \u043B\u0438\u0448\u043D\u0435\u0435 \u0438 \u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440. \u041E\u0431\u0440\u0430\u0437 \xAB\u041A\u043B\u0430\u0441\u0441\u0438\u043A\u0430 \u0427/\u0411\xBB \u0432\u043E\u0441\u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u0440\u0435\u043C\u0431\u0440\u0430\u043D\u0434\u0442\u043E\u0432\u0441\u043A\u0438\u0439 \u0441\u0432\u0435\u0442 \u0438 \u043C\u044F\u0433\u043A\u0443\u044E \u043F\u043B\u0451\u043D\u043E\u0447\u043D\u0443\u044E \u0437\u0435\u0440\u043D\u0438\u0441\u0442\u043E\u0441\u0442\u044C, \u043A\u0430\u043A \u0443 \u043C\u0430\u0441\u0442\u0435\u0440\u043E\u0432 \u0441\u0442\u0443\u0434\u0438\u0439\u043D\u043E\u0433\u043E \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u0430.",
      benefits: ["\u0420\u0435\u043C\u0431\u0440\u0430\u043D\u0434\u0442\u043E\u0432\u0441\u043A\u0438\u0439 \u0441\u0432\u0435\u0442 \u0441 \u0445\u0430\u0440\u0430\u043A\u0442\u0435\u0440\u043D\u044B\u043C \u0442\u0440\u0435\u0443\u0433\u043E\u043B\u044C\u043D\u0438\u043A\u043E\u043C \u043D\u0430 \u0449\u0435\u043A\u0435", "\u0413\u043B\u0443\u0431\u043E\u043A\u0438\u0439 \u0447\u0451\u0440\u043D\u044B\u0439 \u0444\u043E\u043D \u0438 \u043F\u043B\u0451\u043D\u043E\u0447\u043D\u0430\u044F \u0437\u0435\u0440\u043D\u0438\u0441\u0442\u043E\u0441\u0442\u044C", "\u041F\u043E\u0434\u0445\u043E\u0434\u0438\u0442 \u0434\u043B\u044F \u0441\u0442\u0430\u0442\u0435\u0439, \u043A\u043D\u0438\u0433, \u0438\u043D\u0442\u0435\u0440\u0432\u044C\u044E \u0438 \u043F\u0435\u0447\u0430\u0442\u0438 \u043D\u0430 \u0441\u0442\u0435\u043D\u0443"],
      tips: ["\u0412\u044B\u0431\u0438\u0440\u0430\u0439\u0442\u0435 \u0444\u043E\u0442\u043E \u0441 \u0447\u0451\u0442\u043A\u0438\u043C\u0438 \u0447\u0435\u0440\u0442\u0430\u043C\u0438 \u043B\u0438\u0446\u0430 \u0438 \u0431\u0435\u0437 \u0441\u0438\u043B\u044C\u043D\u044B\u0445 \u0442\u0435\u043D\u0435\u0439", "\u0421\u043F\u043E\u043A\u043E\u0439\u043D\u043E\u0435 \u0437\u0430\u0434\u0443\u043C\u0447\u0438\u0432\u043E\u0435 \u0432\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0441\u043C\u043E\u0442\u0440\u0438\u0442\u0441\u044F \u0441\u0438\u043B\u044C\u043D\u0435\u0435 \u0432\u0441\u0435\u0433\u043E", "\u0414\u043B\u044F \u043F\u0435\u0447\u0430\u0442\u0438 \u0432\u044B\u0431\u0438\u0440\u0430\u0439\u0442\u0435 \u0444\u043E\u0440\u043C\u0430\u0442 4:5 \u0438\u043B\u0438 3:2", "\u0421\u0434\u0435\u043B\u0430\u0439\u0442\u0435 \u043F\u0430\u0440\u043D\u044B\u0439 \u0446\u0432\u0435\u0442\u043D\u043E\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u0432 \u043E\u0431\u0440\u0430\u0437\u0435 \xAB\u041F\u0440\u0435\u043C\u0438\u0443\u043C \u043B\u043E\u0443-\u043A\u0438\xBB"],
      faq: [["\u041C\u043E\u0436\u043D\u043E \u043B\u0438 \u043D\u0430\u043F\u0435\u0447\u0430\u0442\u0430\u0442\u044C \u043F\u043E\u0440\u0442\u0440\u0435\u0442?", "\u0414\u0430, \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u044B \u0441\u043E\u0437\u0434\u0430\u044E\u0442\u0441\u044F \u0432 \u0432\u044B\u0441\u043E\u043A\u043E\u043C \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0438 \u0438 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0442 \u0434\u043B\u044F \u043F\u0435\u0447\u0430\u0442\u0438."], ["\u041C\u043E\u0436\u043D\u043E \u043B\u0438 \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0432 \u043F\u043E\u0434\u0430\u0440\u043E\u043A?", "\u0414\u0430, \u044D\u0442\u043E \u043F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u044B\u0439 \u043F\u043E\u0434\u0430\u0440\u043E\u043A. \u041D\u0443\u0436\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E \u0444\u043E\u0442\u043E \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430, \u043D\u0430 \u043A\u043E\u0442\u043E\u0440\u043E\u0435 \u043E\u043D \u0441\u043E\u0433\u043B\u0430\u0441\u0435\u043D."], ["\u041C\u043E\u0436\u043D\u043E \u043B\u0438 \u043F\u043E\u043C\u0435\u043D\u044F\u0442\u044C \u043E\u0434\u0435\u0436\u0434\u0443 \u043D\u0430 \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u0435?", "\u0414\u0430, \u043D\u0430\u043F\u0438\u0448\u0438\u0442\u0435 \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0438, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \xAB\u0447\u0451\u0440\u043D\u0430\u044F \u0432\u043E\u0434\u043E\u043B\u0430\u0437\u043A\u0430\xBB."]]
    },
    en: {
      slug: "black-and-white-portrait",
      title: "Black and White Portrait Online: Classic Studio Look from a Selfie | Portretto",
      desc: "A timeless black-and-white portrait with Rembrandt lighting, made from a selfie. For articles, books, interviews and gifts. Your face, studio quality.",
      h1: "A black-and-white portrait in the classic studio style",
      lead: "A black-and-white portrait never goes out of style: it strips away distractions and leaves character. The Classic B&W look recreates Rembrandt lighting and soft film grain, like the masters of studio portraiture.",
      benefits: ["Rembrandt lighting with the signature triangle on the cheek", "Deep black backdrop and film-like grain", "Great for articles, books, interviews and wall prints"],
      tips: ["Choose a photo with clear features and no harsh shadows", "A calm, thoughtful expression looks strongest", "For prints, choose 4:5 or 3:2", "Make a matching color version with the Luxury low-key look"],
      faq: [["Can I print the portrait?", "Yes, portraits are created in high resolution and are suitable for print."], ["Can I make one as a gift?", "Yes, it is a popular gift. You just need a photo of the person, with their consent."], ["Can I change the clothing?", 'Yes, write it in the description, e.g. "black turtleneck".']]
    }
  },
  {
    id: "dating",
    look: "golden_hour",
    ru: {
      slug: "foto-dlya-znakomstv",
      title: "\u0424\u043E\u0442\u043E \u0434\u043B\u044F \u0441\u0430\u0439\u0442\u043E\u0432 \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432: \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u0441\u043D\u0438\u043C\u043A\u0438 \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u0418\u0418 | Portretto",
      desc: "\u0416\u0438\u0432\u044B\u0435 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u0444\u043E\u0442\u043E \u0434\u043B\u044F Tinder, Bumble \u0438 Badoo: \u0437\u043E\u043B\u043E\u0442\u043E\u0439 \u0447\u0430\u0441, \u0441\u0432\u0435\u0442\u043B\u044B\u0439 \u0445\u0430\u0439-\u043A\u0438, \u0443\u043B\u044B\u0431\u043A\u0430. \u0412\u044B\u0433\u043B\u044F\u0434\u0438\u0442\u0435 \u0441\u043E\u0431\u043E\u0439 \u0432 \u0441\u0432\u043E\u0439 \u043B\u0443\u0447\u0448\u0438\u0439 \u0434\u0435\u043D\u044C. \u0418\u0437 \u043E\u0431\u044B\u0447\u043D\u043E\u0433\u043E \u0441\u0435\u043B\u0444\u0438 \u0437\u0430 \u043C\u0438\u043D\u0443\u0442\u0443.",
      h1: "\u0424\u043E\u0442\u043E \u0434\u043B\u044F \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432, \u043D\u0430 \u043A\u043E\u0442\u043E\u0440\u044B\u0445 \u0432\u044B \u2014 \u044D\u0442\u043E \u0432\u044B",
      lead: "\u0412 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F\u0445 \u0434\u043B\u044F \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432 \u0432\u044B\u0438\u0433\u0440\u044B\u0432\u0430\u044E\u0442 \u0436\u0438\u0432\u044B\u0435 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u0441\u043D\u0438\u043C\u043A\u0438 \u0441 \u0442\u0451\u043F\u043B\u044B\u043C \u0441\u0432\u0435\u0442\u043E\u043C \u0438 \u0438\u0441\u043A\u0440\u0435\u043D\u043D\u0435\u0439 \u0443\u043B\u044B\u0431\u043A\u043E\u0439. \u041F\u043E\u0440\u0442\u0440\u0435\u0442\u0442\u043E \u0441\u043E\u0437\u0434\u0430\u0451\u0442 \u0442\u0430\u043A\u0438\u0435 \u0444\u043E\u0442\u043E \u0438\u0437 \u0432\u0430\u0448\u0435\u0433\u043E \u0441\u0435\u043B\u0444\u0438 \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u0432\u0430\u0448\u0435 \u043B\u0438\u0446\u043E, \u0442\u0430\u043A \u0447\u0442\u043E \u043F\u0440\u0438 \u0432\u0441\u0442\u0440\u0435\u0447\u0435 \u0432\u0430\u0441 \u0443\u0437\u043D\u0430\u044E\u0442.",
      benefits: ["\u0422\u0451\u043F\u043B\u044B\u0435 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u043E\u0431\u0440\u0430\u0437\u044B: \u0437\u043E\u043B\u043E\u0442\u043E\u0439 \u0447\u0430\u0441 \u0438 \u0441\u0432\u0435\u0442\u043B\u044B\u0439 \u0445\u0430\u0439-\u043A\u0438", "\u041B\u0438\u0446\u043E \u043D\u0435 \xAB\u0443\u043B\u0443\u0447\u0448\u0430\u0435\u0442\u0441\u044F\xBB \u0434\u043E \u043D\u0435\u0443\u0437\u043D\u0430\u0432\u0430\u0435\u043C\u043E\u0441\u0442\u0438: \u0447\u0435\u0440\u0442\u044B \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0432\u0430\u0448\u0438\u043C\u0438", "\u0412\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 4:5 \u0438 9:16 \u0434\u043B\u044F \u0430\u043D\u043A\u0435\u0442"],
      tips: ["\u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0432 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0445\u043E\u0431\u0431\u0438: \xAB\u0441 \u0433\u0438\u0442\u0430\u0440\u043E\u0439\xBB, \xAB\u043D\u0430 \u0432\u0435\u043B\u043E\u0441\u0438\u043F\u0435\u0434\u0435\xBB", "\u0415\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u0430\u044F \u0443\u043B\u044B\u0431\u043A\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u043B\u0443\u0447\u0448\u0435 \u043F\u043E\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F", "\u0421\u0434\u0435\u043B\u0430\u0439\u0442\u0435 3\u20134 \u0440\u0430\u0437\u043D\u044B\u0445 \u043E\u0431\u0440\u0430\u0437\u0430 \u0434\u043B\u044F \u0440\u0430\u0437\u043D\u043E\u043E\u0431\u0440\u0430\u0437\u0438\u044F \u0430\u043D\u043A\u0435\u0442\u044B", "\u041D\u0435 \u043C\u0435\u043D\u044F\u0439\u0442\u0435 \u0432\u043D\u0435\u0448\u043D\u043E\u0441\u0442\u044C \u0441\u0438\u043B\u044C\u043D\u043E: \u043B\u0443\u0447\u0448\u0435 \u0447\u0435\u0441\u0442\u043D\u044B\u0435 \u0438 \u043A\u0440\u0430\u0441\u0438\u0432\u044B\u0435 \u0444\u043E\u0442\u043E"],
      faq: [["\u041D\u0435 \u0431\u0443\u0434\u0435\u0442 \u043B\u0438 \u044D\u0442\u043E \u043E\u0431\u043C\u0430\u043D\u043E\u043C?", "\u041F\u043E\u0440\u0442\u0440\u0435\u0442\u0442\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u0432\u0430\u0448\u0438 \u0447\u0435\u0440\u0442\u044B \u043B\u0438\u0446\u0430 \u0438 \u0432\u043E\u0437\u0440\u0430\u0441\u0442, \u043C\u0435\u043D\u044F\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0441\u0432\u0435\u0442, \u0444\u043E\u043D \u0438 \u043E\u0434\u0435\u0436\u0434\u0443. \u042D\u0442\u043E \u043A\u0430\u043A \u0445\u043E\u0440\u043E\u0448\u0430\u044F \u0444\u043E\u0442\u043E\u0441\u0435\u0441\u0441\u0438\u044F, \u0430 \u043D\u0435 \u0434\u0440\u0443\u0433\u0430\u044F \u0432\u043D\u0435\u0448\u043D\u043E\u0441\u0442\u044C."], ["\u041A\u0430\u043A\u0438\u0435 \u043E\u0431\u0440\u0430\u0437\u044B \u043B\u0443\u0447\u0448\u0435 \u0434\u043B\u044F \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432?", "\xAB\u0417\u043E\u043B\u043E\u0442\u043E\u0439 \u0447\u0430\u0441\xBB \u0438 \xAB\u0421\u0432\u0435\u0442\u043B\u044B\u0439 \u0445\u0430\u0439-\u043A\u0438\xBB \u0434\u0430\u044E\u0442 \u0442\u0451\u043F\u043B\u044B\u0435 \u0435\u0441\u0442\u0435\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u0441\u043D\u0438\u043C\u043A\u0438. \u041C\u043E\u0436\u043D\u043E \u043E\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u0432\u043E\u044E \u0441\u0446\u0435\u043D\u0443."], ["\u041A\u0430\u043A\u043E\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u043D\u0443\u0436\u0435\u043D \u0434\u043B\u044F \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0439?", "\u0411\u043E\u043B\u044C\u0448\u0438\u043D\u0441\u0442\u0432\u043E \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0439 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442 \u0432\u0435\u0440\u0442\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0435 \u0444\u043E\u0442\u043E, \u043F\u043E\u0434\u043E\u0439\u0434\u0443\u0442 \u0444\u043E\u0440\u043C\u0430\u0442\u044B 4:5 \u0438 9:16."]]
    },
    en: {
      slug: "dating-profile-photos",
      title: "AI Dating Profile Photos That Look Like You | Portretto",
      desc: "Natural, lively photos for Tinder, Bumble and Hinge: golden hour, bright high-key, a real smile. Look like yourself on your best day. From a selfie in a minute.",
      h1: "Dating photos that still look like you",
      lead: "On dating apps, natural photos with warm light and a genuine smile win. Portretto creates them from your selfie while keeping your face, so people recognise you when you meet.",
      benefits: ["Warm, natural looks: golden hour and bright high-key", "No beauty filter that changes who you are: your features stay yours", "Vertical 4:5 and 9:16 formats for profiles"],
      tips: ['Add a hobby to the description: "with a guitar", "on a bike"', "A natural smile works better than posing", "Make 3\u20134 different looks for a varied profile", "Don't change your appearance much: honest, beautiful photos work best"],
      faq: [["Isn't this misleading?", "Portretto keeps your facial features and age and only changes lighting, background and clothing. It's like a great photo shoot, not a different face."], ["Which looks work best for dating?", "Golden hour and Bright high-key give warm, natural shots. You can also describe your own scene."], ["What format do dating apps use?", "Most apps use vertical photos, so 4:5 and 9:16 work well."]]
    }
  }
];

// src/landing-page.mjs
var esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var landingPath = (page, lang2) => (lang2 === "en" ? "/en/" : "/") + page[lang2].slug;
function findLanding(pathname) {
  for (const p of LANDINGS) {
    if (pathname === "/" + p.ru.slug) return { page: p, lang: "ru" };
    if (pathname === "/en/" + p.en.slug) return { page: p, lang: "en" };
  }
  return null;
}
var UI = {
  ru: { cta: "\u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043F\u043E\u0440\u0442\u0440\u0435\u0442", ctaBig: "\u041F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441", how: "\u041A\u0430\u043A \u044D\u0442\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442", steps: [["\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0441\u0435\u043B\u0444\u0438", "\u041E\u0434\u043D\u043E-\u0442\u0440\u0438 \u0444\u043E\u0442\u043E, \u0433\u0434\u0435 \u0445\u043E\u0440\u043E\u0448\u043E \u0432\u0438\u0434\u043D\u043E \u043B\u0438\u0446\u043E."], ["\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0431\u0440\u0430\u0437", "\u041C\u044B \u0443\u0436\u0435 \u0432\u044B\u0431\u0440\u0430\u043B\u0438 \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0449\u0438\u0439, \u043C\u043E\u0436\u043D\u043E \u043F\u043E\u043C\u0435\u043D\u044F\u0442\u044C."], ["\u0421\u043A\u0430\u0447\u0430\u0439\u0442\u0435 \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u044B", "\u0427\u0435\u0440\u0435\u0437 30\u201360 \u0441\u0435\u043A\u0443\u043D\u0434, \u0432 \u0432\u044B\u0441\u043E\u043A\u043E\u043C \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0438."]], why: "\u041F\u043E\u0447\u0435\u043C\u0443 Portretto", tips: "\u0421\u043E\u0432\u0435\u0442\u044B \u0434\u043B\u044F \u043B\u0443\u0447\u0448\u0435\u0433\u043E \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430", faq: "\u0412\u043E\u043F\u0440\u043E\u0441\u044B \u0438 \u043E\u0442\u0432\u0435\u0442\u044B", more: "\u0414\u0440\u0443\u0433\u0438\u0435 \u0438\u0434\u0435\u0438 \u0434\u043B\u044F \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u043E\u0432", home: "\u0413\u043B\u0430\u0432\u043D\u0430\u044F", priv: "\u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 \u043A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438", sample: "\u041F\u0440\u0438\u043C\u0435\u0440 \u043E\u0431\u0440\u0430\u0437\u0430", band: "\u0412\u0430\u0448 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u0433\u043E\u0442\u043E\u0432 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043D\u0443\u0442\u0443", lang: "EN", langLabel: "English", eyebrow: "AI-\u0444\u043E\u0442\u043E\u0441\u0442\u0443\u0434\u0438\u044F", foot: "\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0444\u043E\u0442\u043E \u043D\u0435 \u0445\u0440\u0430\u043D\u044F\u0442\u0441\u044F \u043D\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0435." },
  en: { cta: "Create portrait", ctaBig: "Try it now", how: "How it works", steps: [["Upload a selfie", "One to three photos with your face clearly visible."], ["Pick a look", "We've preselected a good one, you can change it."], ["Download portraits", "In 30\u201360 seconds, in high resolution."]], why: "Why Portretto", tips: "Tips for the best result", faq: "Questions and answers", more: "More portrait ideas", home: "Home", priv: "Privacy policy", sample: "Sample look", band: "Your portrait is a minute away", lang: "RU", langLabel: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", eyebrow: "AI photo studio", foot: "Source photos are not stored on the server." }
};
function renderLanding(page, lang2, ctx) {
  const d = page[lang2], u = UI[lang2], other = lang2 === "en" ? "ru" : "en";
  const sub = (s) => String(s).replaceAll("{{PER_FROM}}", ctx.perFrom[lang2]).replaceAll("Portretto", ctx.brand);
  const url = ctx.base + landingPath(page, lang2);
  const studio = (lang2 === "en" ? "/en" : "/") + `?look=${encodeURIComponent(page.look)}#studio`;
  const cover = page.look !== "custom" && ctx.covers[page.look] ? ctx.base + ctx.covers[page.look] : Object.values(ctx.covers)[0] ? ctx.base + Object.values(ctx.covers)[0] : "";
  const title = sub(d.title), desc = sub(d.desc);
  const faq = d.faq.map(([q, a]) => [sub(q), sub(a)]);
  const ld = [
    { "@context": "https://schema.org", "@type": "WebPage", name: title, description: desc, url, inLanguage: lang2, isPartOf: { "@type": "WebSite", name: ctx.brand, url: ctx.base + "/" }, ...cover ? { primaryImageOfPage: cover } : {} },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: ctx.brand, item: ctx.base + (lang2 === "en" ? "/en" : "/") }, { "@type": "ListItem", position: 2, name: sub(d.h1), item: url }] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }
  ];
  const more = LANDINGS.filter((p) => p !== page).map((p) => `<a href="${landingPath(p, lang2)}">${esc(sub(p[lang2].h1))}</a>`).join("");
  return `<!doctype html>
<html lang="${lang2}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url)}">
<link rel="alternate" hreflang="${lang2}" href="${esc(url)}">
<link rel="alternate" hreflang="${other}" href="${esc(ctx.base + landingPath(page, other))}">
<link rel="alternate" hreflang="x-default" href="${esc(ctx.base + landingPath(page, "ru"))}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(ctx.brand)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="${lang2 === "en" ? "en_US" : "ru_RU"}">
${cover ? `<meta property="og:image" content="${esc(cover)}"><meta name="twitter:image" content="${esc(cover)}">` : ""}
<meta name="twitter:card" content="${cover ? "summary_large_image" : "summary"}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%231c2733'/%3E%3Ccircle cx='13' cy='13' r='5' fill='%23e8b64c'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Tenor+Sans&family=Manrope:wght@400;600;700&family=IBM+Plex+Mono:wght@500&display=swap">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>
:root { --paper:#eceef0; --card:#fff; --ink:#18212b; --muted:#5b6672; --line:#d5dae0; --lamp:#e0a82e; --lamp-ink:#18212b; --action:#18212b; --action-fg:#fff; --ok:#1f7a4d;
  --fd:"Tenor Sans","Manrope",Georgia,serif; --fb:"Manrope",system-ui,-apple-system,"Segoe UI",sans-serif; --fm:"IBM Plex Mono",ui-monospace,monospace; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --paper:#11161b; --card:#181f26; --ink:#e9edf0; --muted:#9aa6b1; --line:#2a343e; --lamp:#f0c150; --lamp-ink:#11161b; --action:#f0c150; --action-fg:#11161b; --ok:#5fd39a; color-scheme: dark; } }
:root[data-theme="dark"] { --paper:#11161b; --card:#181f26; --ink:#e9edf0; --muted:#9aa6b1; --line:#2a343e; --lamp:#f0c150; --lamp-ink:#11161b; --action:#f0c150; --action-fg:#11161b; --ok:#5fd39a; color-scheme: dark; }
* { box-sizing: border-box; } [hidden] { display: none !important; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.6 var(--fb); }
a { color: inherit; } img { max-width: 100%; }
.wrap { max-width: 1080px; margin: 0 auto; padding-inline: 20px; }
.nav { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-block: 16px; }
.logo { display: flex; gap: 10px; align-items: center; text-decoration: none; font: 22px var(--fd); }
.logo i { width: 28px; height: 28px; border-radius: 8px; background: var(--ink); position: relative; }
.logo i::after { content: ""; position: absolute; width: 9px; height: 9px; border-radius: 50%; background: var(--lamp); left: 7px; top: 7px; }
.navr { display: flex; gap: 10px; align-items: center; }
.btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 10px 18px; font-weight: 700; font-size: 15px; text-decoration: none; border: 1.5px solid var(--line); background: var(--card); }
.btn.solid { background: var(--action); color: var(--action-fg); border-color: var(--action); }
.btn.big { padding: 15px 28px; font-size: 17px; }
.hero { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, .8fr); gap: 40px; align-items: center; padding-block: 30px 10px; }
@media (max-width: 820px) { .hero { grid-template-columns: minmax(0, 1fr); gap: 24px; } }
.eyebrow { font: 500 11.5px var(--fm); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
h1 { font: 400 clamp(34px, 5.4vw, 58px)/1.05 var(--fd); margin: 10px 0 16px; text-wrap: balance; }
.lead { font-size: 18px; color: var(--muted); max-width: 60ch; margin: 0 0 22px; }
.cover { border-radius: 16px; overflow: hidden; aspect-ratio: 4 / 5; background: var(--card); border: 1px solid var(--line); position: relative; max-width: 420px; }
.cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover span { position: absolute; left: 10px; bottom: 10px; font: 500 10.5px var(--fm); background: rgba(10,14,18,.62); color: #fff; padding: 3px 8px; border-radius: 4px; }
section { padding-block: 44px 0; }
h2 { font: 400 clamp(26px, 3.4vw, 36px)/1.15 var(--fd); margin: 0 0 18px; }
.grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 760px) { .grid3 { grid-template-columns: minmax(0, 1fr); } }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 20px; }
.card b { display: block; font-size: 17px; margin-bottom: 4px; }
.card p { margin: 0; color: var(--muted); }
.n { width: 28px; height: 28px; border-radius: 50%; background: var(--lamp); color: var(--lamp-ink); display: grid; place-items: center; font: 500 13px var(--fm); margin-bottom: 10px; }
ul.ticks { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; font-size: 16.5px; max-width: 70ch; }
ul.ticks li { display: grid; grid-template-columns: 22px 1fr; gap: 8px; } ul.ticks li::before { content: "\u2713"; color: var(--ok); font-weight: 700; }
.faq details { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 14px 18px; margin-bottom: 10px; max-width: 820px; }
.faq summary { cursor: pointer; font-weight: 700; } .faq p { margin: 8px 0 0; color: var(--muted); }
.more { display: flex; flex-wrap: wrap; gap: 8px; } .more a { border: 1.5px solid var(--line); background: var(--card); border-radius: 999px; padding: 7px 14px; text-decoration: none; font-size: 14.5px; }
.more a:hover, .btn:hover { border-color: var(--ink); }
.band { margin-top: 56px; background: var(--ink); color: var(--card); border-radius: 20px; padding: 36px 30px; display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; }
.band h2 { color: inherit; margin: 0; } .band .btn { background: var(--lamp); color: var(--lamp-ink); border-color: var(--lamp); }
footer { display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding-block: 36px 40px; color: var(--muted); font-size: 13.5px; }
.consent { position: fixed; left: 16px; right: 16px; bottom: 16px; z-index: 9; max-width: 540px; margin-inline: auto; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; box-shadow: 0 20px 50px -20px rgba(0,0,0,.4); font-size: 14px; display: grid; gap: 10px; }
.consent p { margin: 0; color: var(--muted); } .consent .row { display: flex; gap: 8px; justify-content: flex-end; }
.consent button { font: inherit; font-weight: 700; cursor: pointer; border-radius: 999px; padding: 8px 16px; border: 1.5px solid var(--line); background: var(--card); color: var(--ink); }
.consent button.y { background: var(--action); color: var(--action-fg); border-color: var(--action); }
:focus-visible { outline: 2px solid var(--lamp); outline-offset: 2px; }
</style>
${ctx.ga}
</head>
<body>
<div class="wrap">
  <header class="nav">
    <a class="logo" href="${lang2 === "en" ? "/en" : "/"}"><i aria-hidden="true"></i>${esc(ctx.brand)}</a>
    <div class="navr"><a class="btn" href="${landingPath(page, other)}" hreflang="${other}" lang="${other}" aria-label="${u.langLabel}">${u.lang}</a><a class="btn solid" href="${studio}">${u.cta}</a></div>
  </header>

  <div class="hero">
    <div>
      <div class="eyebrow">${u.eyebrow}</div>
      <h1>${esc(sub(d.h1))}</h1>
      <p class="lead">${esc(sub(d.lead))}</p>
      <a class="btn solid big" href="${studio}">${u.ctaBig} \u2192</a>
    </div>
    ${cover ? `<div class="cover"><img src="${esc(cover)}" alt="${esc(sub(d.h1))}" width="840" height="1050" fetchpriority="high"><span>${u.sample}</span></div>` : ""}
  </div>

  <section><h2>${u.why}</h2><ul class="ticks">${d.benefits.map((b) => `<li>${esc(sub(b))}</li>`).join("")}</ul></section>

  <section><h2>${u.how}</h2><div class="grid3">${u.steps.map(([t, p], i) => `<div class="card"><div class="n">${i + 1}</div><b>${t}</b><p>${p}</p></div>`).join("")}</div></section>

  <section><h2>${u.tips}</h2><ul class="ticks">${d.tips.map((b) => `<li>${esc(sub(b))}</li>`).join("")}</ul></section>

  <section class="faq"><h2>${u.faq}</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>

  <section><h2>${u.more}</h2><nav class="more">${more}</nav></section>

  <div class="band"><h2>${u.band}</h2><a class="btn big" href="${studio}">${u.cta} \u2192</a></div>

  <footer><span>${esc(ctx.brand)} \xB7 <a href="${lang2 === "en" ? "/en" : "/"}">${u.home}</a></span><span>${u.foot} <a href="/privacy">${u.priv}</a></span></footer>
</div>
${ctx.ga ? `<div class="consent" id="cc" hidden><p>${lang2 === "en" ? "We use Google Analytics cookies to understand how to improve the site." : "\u041C\u044B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u043C cookie Google Analytics, \u0447\u0442\u043E\u0431\u044B \u043F\u043E\u043D\u0438\u043C\u0430\u0442\u044C, \u043A\u0430\u043A \u0443\u043B\u0443\u0447\u0448\u0438\u0442\u044C \u0441\u0430\u0439\u0442."} <a href="/privacy">${u.priv}</a></p><div class="row"><button type="button" id="ccn">${lang2 === "en" ? "Decline" : "\u041E\u0442\u043A\u043B\u043E\u043D\u0438\u0442\u044C"}</button><button type="button" class="y" id="ccy">${lang2 === "en" ? "Accept" : "\u041F\u0440\u0438\u043D\u044F\u0442\u044C"}</button></div></div>
<script>(()=>{let c=null;try{c=localStorage.getItem("pt_consent")}catch(e){}if(c)return;const b=document.getElementById("cc");b.hidden=false;const d=v=>{try{localStorage.setItem("pt_consent",v)}catch(e){}if(window.gtag)gtag("consent","update",{analytics_storage:v});b.hidden=true};document.getElementById("ccy").onclick=()=>d("granted");document.getElementById("ccn").onclick=()=>d("denied");})();</script>` : ""}
</body>
</html>`;
}
function landingLinksHtml(lang2, brand) {
  const title = lang2 === "en" ? "Popular portrait ideas" : "\u041F\u043E\u043F\u0443\u043B\u044F\u0440\u043D\u044B\u0435 \u0437\u0430\u043F\u0440\u043E\u0441\u044B";
  const links = LANDINGS.map((p) => `<a href="${landingPath(p, lang2)}">${esc(p[lang2].h1.replaceAll("Portretto", brand))}</a>`).join("");
  return `<section class="sec" id="ideas"><div class="sec-head"><div class="eyebrow">${lang2 === "en" ? "Ideas" : "\u0418\u0434\u0435\u0438"}</div><h2 class="title">${title}</h2></div><nav class="ideas">${links}</nav></section>`;
}

// src/lora.mjs
import fs3 from "node:fs";
import path3 from "node:path";
import crypto3 from "node:crypto";
var TRAIN_DIR = path3.join(DATA_DIR, "train");
fs3.mkdirSync(TRAIN_DIR, { recursive: true });
var TRAINERS = {
  fast: { endpoint: "fal-ai/flux-lora-fast-training", name: "FLUX LoRA Fast (\u2248 $2)", input: (url, trigger, steps) => ({ images_data_url: url, trigger_word: trigger, create_masks: true, steps }) },
  portrait: { endpoint: "fal-ai/flux-lora-portrait-trainer", name: "FLUX LoRA Portrait (\u2248 $0.0024 \u0437\u0430 \u0448\u0430\u0433)", input: (url, trigger, steps) => ({ images_data_url: url, trigger_phrase: trigger, steps, subject_crop: true }) }
};
var LORA_GEN_ENDPOINT = "fal-ai/flux-lora";
function loraSettings() {
  const l = db.settings.lora || {};
  return {
    enabled: l.enabled !== false,
    credits: Math.max(1, parseInt(l.credits, 10) || 20),
    // сколько кредитов стоит обучение
    perImage: Math.max(1, parseInt(l.perImage, 10) || 1),
    // кредитов за портрет персональной моделью
    trainer: TRAINERS[l.trainer] ? l.trainer : "fast",
    steps: Math.max(500, Math.min(4e3, parseInt(l.steps, 10) || 1e3))
  };
}
var CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
  return c;
});
var crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ c >>> 8;
  return (c ^ -1) >>> 0;
};
function makeZip(files) {
  const parts = [], central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const n = Buffer.from(name), crc = crc32(data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(67324752, 0);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0, 6);
    h.writeUInt16LE(0, 8);
    h.writeUInt32LE(0, 10);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(data.length, 18);
    h.writeUInt32LE(data.length, 22);
    h.writeUInt16LE(n.length, 26);
    h.writeUInt16LE(0, 28);
    parts.push(h, n, data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(33639248, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0, 8);
    c.writeUInt16LE(0, 10);
    c.writeUInt32LE(0, 12);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(data.length, 24);
    c.writeUInt16LE(n.length, 28);
    c.writeUInt32LE(0, 30);
    c.writeUInt32LE(0, 34);
    c.writeUInt32LE(0, 38);
    c.writeUInt32LE(offset, 42);
    central.push(c, n);
    offset += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(101010256, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cd, end]);
}
var dropZip = (token) => {
  if (token) fs3.rmSync(path3.join(TRAIN_DIR, token + ".zip"), { force: true });
};
async function startTraining(keyRec, photos, origin2) {
  const s = loraSettings();
  const files = photos.map((p, i) => {
    const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(p);
    return { name: `photo_${String(i + 1).padStart(2, "0")}.${m[1] === "jpeg" ? "jpg" : m[1]}`, data: Buffer.from(m[2], "base64") };
  });
  const token = crypto3.randomBytes(24).toString("hex");
  fs3.writeFileSync(path3.join(TRAIN_DIR, token + ".zip"), makeZip(files));
  const trigger = "ptx" + crypto3.randomBytes(3).toString("hex");
  const t = TRAINERS[s.trainer];
  const r = await falFetch(`https://queue.fal.run/${t.endpoint}`, { method: "POST", body: JSON.stringify(t.input(`${origin2}/train/${token}.zip`, trigger, s.steps)) });
  if (!r.ok || !r.data.request_id) {
    dropZip(token);
    return falError(r.status, r.data);
  }
  keyRec.lora = { status: "training", trigger, token, trainer: s.trainer, statusUrl: r.data.status_url, responseUrl: r.data.response_url, started: Date.now(), cost: s.credits, photos: photos.length };
  save();
  return null;
}
async function pollTraining(keyRec) {
  const l = keyRec.lora;
  if (!l) return { status: "none" };
  if (l.status === "training") {
    try {
      const st = await falFetch(l.statusUrl);
      if (!st.ok && st.status >= 400 && st.status < 500) fail(keyRec, falError(st.status, st.data).admin);
      else if (st.ok && st.data.status === "COMPLETED") {
        const out = await falFetch(l.responseUrl);
        const url = out.ok ? out.data.diffusers_lora_file?.url || out.data.lora_file?.url : null;
        if (url) {
          l.status = "ready";
          l.url = url;
          l.done = Date.now();
          dropZip(l.token);
          delete l.token;
          save();
        } else fail(keyRec, out.ok ? "\u043D\u0435\u0442 \u0444\u0430\u0439\u043B\u0430 \u043C\u043E\u0434\u0435\u043B\u0438 \u0432 \u043E\u0442\u0432\u0435\u0442\u0435" : falError(out.status, out.data).admin);
      } else if (st.ok) {
        l.queue = st.data.status === "IN_QUEUE" ? st.data.queue_position ?? null : null;
      }
      if (l.status === "training" && Date.now() - l.started > 60 * 60 * 1e3) fail(keyRec, "\u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0435 \u0434\u043B\u0438\u043B\u043E\u0441\u044C \u0431\u043E\u043B\u044C\u0448\u0435 \u0447\u0430\u0441\u0430");
    } catch (e) {
    }
  }
  return publicState(keyRec);
}
function fail(keyRec, reason) {
  const l = keyRec.lora;
  l.status = "failed";
  l.error = reason;
  keyRec.credits += l.cost || 0;
  dropZip(l.token);
  delete l.token;
  save();
}
function publicState(keyRec) {
  const l = keyRec?.lora;
  if (!l) return { status: "none" };
  return { status: l.status, started: l.started, done: l.done || null, queue: l.queue ?? null, error: l.status === "failed" ? "\u041E\u0431\u0443\u0447\u0435\u043D\u0438\u0435 \u043D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C, \u043A\u0440\u0435\u0434\u0438\u0442\u044B \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0435\u043D\u044B." : "" };
}
function serveZip(res2, name) {
  if (!/^[a-f0-9]{48}\.zip$/.test(name)) return false;
  const file = path3.join(TRAIN_DIR, name);
  if (!fs3.existsSync(file)) return false;
  res2.writeHead(200, { "content-type": "application/zip", "cache-control": "no-store" });
  fs3.createReadStream(file).pipe(res2);
  return true;
}
function loraModel(keyRec) {
  const l = keyRec.lora;
  const RATIO2 = { "4:5": [4, 5], "1:1": [1, 1], "9:16": [9, 16], "3:2": [3, 2] };
  return {
    id: "lora",
    endpoint: LORA_GEN_ENDPOINT,
    batch: true,
    cost: 0.05,
    input: ({ prompt, format, count }) => {
      const [w, h] = RATIO2[format] || RATIO2["4:5"];
      const k = 1344 / Math.max(w, h);
      return { prompt, loras: [{ path: l.url, scale: 1 }], image_size: { width: Math.round(w * k / 16) * 16, height: Math.round(h * k / 16) * 16 }, num_images: count, guidance_scale: 3.5, num_inference_steps: 28, output_format: "jpeg" };
    }
  };
}
function loraPrompt(keyRec, style, text) {
  const t = keyRec.lora.trigger;
  const scene = style.custom ? text : [style.prompt, text].filter(Boolean).join(" ");
  return `A photo of ${t} person. ${scene}

${QUALITY}`;
}

// src/email.mjs
var KEY = () => (process.env.RESEND_API_KEY || "").trim();
var FROM = () => (process.env.EMAIL_FROM || "").trim();
var emailEnabled = () => Boolean(KEY() && FROM());
var esc2 = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
async function sendCodeEmail({ to, key, credits, added, brand, site }) {
  if (!emailEnabled() || !to) return { ok: false, error: emailEnabled() ? "\u043D\u0435\u0442 email" : "\u043F\u043E\u0447\u0442\u0430 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430" };
  const link = `${site}/?code=${encodeURIComponent(key)}`;
  const html = `<!doctype html><html><body style="margin:0;background:#eceef0;font-family:Arial,Helvetica,sans-serif;color:#18212b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceef0;padding:32px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:28px">
    <tr><td style="font-size:22px;font-family:Georgia,serif">${esc2(brand)}</td></tr>
    <tr><td style="padding-top:18px;font-size:16px;line-height:1.5">
      <b>\u0421\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u043F\u043E\u043A\u0443\u043F\u043A\u0443!</b> ${added ? `\u041D\u0430 \u0432\u0430\u0448 \u0431\u0430\u043B\u0430\u043D\u0441 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E ${added} \u043A\u0440\u0435\u0434\u0438\u0442\u043E\u0432.` : ""} \u0412\u0430\u0448 \u043B\u0438\u0447\u043D\u044B\u0439 \u043A\u043E\u0434:
    </td></tr>
    <tr><td style="padding:16px 0"><div style="font-family:'Courier New',monospace;font-size:22px;font-weight:bold;letter-spacing:2px;background:#eceef0;border:2px dashed #e0a82e;border-radius:10px;padding:14px;text-align:center">${esc2(key)}</div></td></tr>
    <tr><td style="font-size:15px;line-height:1.5">\u0411\u0430\u043B\u0430\u043D\u0441: <b>${credits}</b> \u043A\u0440\u0435\u0434\u0438\u0442\u043E\u0432. \u041A\u043E\u0434 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u0432\u0430\u0448 \u0431\u0430\u043B\u0430\u043D\u0441 \u0438 \u0432\u0441\u0435 \u043F\u043E\u0440\u0442\u0440\u0435\u0442\u044B \u043D\u0430 \u043B\u044E\u0431\u043E\u043C \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0435.</td></tr>
    <tr><td style="padding:20px 0"><a href="${esc2(link)}" style="background:#18212b;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:999px;font-weight:bold;display:inline-block">\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u0442\u0443\u0434\u0438\u044E</a></td></tr>
    <tr><td style="border-top:1px solid #d5dae0;padding-top:16px;font-size:14px;color:#5b6672;line-height:1.5">
      <b>Thank you for your purchase!</b> ${added ? `${added} credits were added.` : ""} Your personal code is shown above. Balance: ${credits} credits. Use it to open your balance and portraits on any device.
    </td></tr>
  </table></td></tr></table></body></html>`;
  const text = `${brand}

\u0412\u0430\u0448 \u043B\u0438\u0447\u043D\u044B\u0439 \u043A\u043E\u0434 / Your code: ${key}
\u0411\u0430\u043B\u0430\u043D\u0441 / Balance: ${credits}

${link}`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: "Bearer " + KEY(), "content-type": "application/json" },
      body: JSON.stringify({ from: FROM(), to: [to], subject: `${brand}: \u0432\u0430\u0448 \u043A\u043E\u0434 / your code ${key}`, html, text })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: d?.message || `Resend ${r.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// src/server.mjs
function modelSettings() {
  const m = db.settings.models || {};
  const ids = MODELS.map((x) => x.id);
  const enabled = (m.enabled || ["nano_pro", "nano2", "seedream45"]).filter((id) => ids.includes(id));
  const def = enabled.includes(m.default) ? m.default : enabled[0] || "nano_pro";
  return { enabled: enabled.length ? enabled : ["nano_pro"], default: def, credits: m.credits || {} };
}
var EDIT_MODELS = ["nano_pro", "nano2", "seedream45", "flux2pro", "gpt2", "kontext_max", "qwen"];
function editSettings() {
  const e = db.settings.edit || {};
  return { enabled: e.enabled !== false, credits: Math.max(1, parseInt(e.credits, 10) || 1), model: EDIT_MODELS.includes(e.model) ? e.model : "nano_pro" };
}
function editPrompt(text) {
  return [
    "Edit the first image (a finished portrait). Apply ONLY this change requested by the client (the request may be in any language): " + text,
    "Keep everything else exactly the same: the same person with identical facial identity, the same pose, framing, clothing, background, lighting and color grading, unless the request explicitly asks to change them.",
    "If a second image is provided, it is a reference photo of the same person: use it only to keep the face accurate.",
    "Photorealistic, natural skin texture, no artifacts, no text, no watermark."
  ].join("\n\n");
}
function faceSwapSettings() {
  const f = db.settings.faceSwap || {};
  return { enabled: f.enabled !== false, hair: f.hair === "target_hair" ? "target_hair" : "user_hair" };
}
var { UserError: UserError2 } = fal_exports;
var BRAND = process.env.STUDIO_NAME || "Portretto";
var CONTACT = process.env.CONTACT_EMAIL || "";
var MAX_VARIANTS = 4;
var ROOT = path4.dirname(fileURLToPath(import.meta.url));
var PUBLIC = fs4.existsSync(path4.join(ROOT, "public", "index.html")) ? path4.join(ROOT, "public") : ROOT;
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
  const a = crypto4.createHash("sha256").update(pass).digest();
  const b = crypto4.createHash("sha256").update(got).digest();
  if (!crypto4.timingSafeEqual(a, b)) throw new UserError2("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043F\u0430\u0440\u043E\u043B\u044C.", 401);
}
function fulfill(session) {
  if (!session || session.payment_status !== "paid") return null;
  const existing = db.orders.find((o) => o.id === session.id);
  if (existing) return { key: existing.key, added: 0, credits: db.keys[existing.key]?.credits ?? 0 };
  const credits = parseInt(session.metadata?.credits, 10) || 0;
  let key = normKey(session.metadata?.key);
  const email = session.customer_details?.email || session.customer_email || "";
  if (!db.keys[key]) {
    if (!/^PT-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) key = newKey();
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
  const site = (process.env.PUBLIC_URL || session.metadata?.site || "").replace(/\/$/, "");
  if (email) sendCodeEmail({ to: email, key, credits: db.keys[key].credits, added: credits, brand: BRAND, site }).then((r) => {
    db.orders[0] && db.orders.find((o) => o.id === session.id) && (db.orders.find((o) => o.id === session.id).emailed = r.ok ? Date.now() : "\u043E\u0448\u0438\u0431\u043A\u0430: " + r.error);
    save();
  });
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
    faceSwap: faceSwapSettings().enabled,
    edit: (({ enabled, credits }) => ({ enabled, credits }))(editSettings()),
    lora: (({ enabled, credits, perImage }) => ({ enabled, credits, perImage }))(loraSettings()),
    email: emailEnabled(),
    legal: { name: process.env.LEGAL_NAME || BRAND }
  }),
  "GET /api/showcase": async (req, res2) => {
    const items = [];
    for (const g of db.gens) for (const url of g.showcase || []) items.push({ url, style: g.style, format: g.format });
    json(res2, items.slice(0, 24));
  },
  "GET /api/balance": async (req, res2) => {
    const { key, rec } = clientKey(req);
    json(res2, { key, credits: rec.credits, lora: publicState(rec) });
  },
  "GET /api/my": async (req, res2) => {
    const { key } = clientKey(req);
    const list = db.gens.filter((g) => g.key === key && g.status === "done").slice(0, 80).map((g) => ({ id: g.id, style: g.style, format: g.format, images: g.images, created: g.created, kind: g.kind || "", text: g.kind === "edit" ? g.text : "" }));
    json(res2, list);
  },
  "POST /api/checkout": async (req, res2) => {
    if (!stripeEnabled()) throw new UserError2("\u041E\u043F\u043B\u0430\u0442\u0430 \u0435\u0449\u0451 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430.", 503);
    const body = parse(await readBody(req));
    const pack = packs().find((p) => p.id === body.pack);
    if (!pack) throw new UserError2("\u041F\u0430\u043A\u0435\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.");
    const key = db.keys[normKey(body.key)] ? normKey(body.key) : newKey();
    const s = await createCheckout({ pack, currency: currency(), key, origin: origin(req), lang: lang(body.lang), brand: BRAND });
    json(res2, { url: s.url });
  },
  "GET /api/checkout/confirm": async (req, res2, url) => {
    const id = url.searchParams.get("session_id") || "";
    if (!/^cs_[\w]+$/.test(id)) throw new UserError2("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u043F\u043B\u0430\u0442\u0451\u0436.");
    const s = await retrieveSession(id);
    const r = fulfill(s);
    if (!r) throw new UserError2("\u041F\u043B\u0430\u0442\u0451\u0436 \u0435\u0449\u0451 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043D. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443 \u0447\u0435\u0440\u0435\u0437 \u043C\u0438\u043D\u0443\u0442\u0443.", 402);
    const o = db.orders.find((x) => x.id === s.id);
    json(res2, { ...r, order: o ? { id: o.id, amount: o.amount, currency: (o.currency || currency()).toUpperCase(), pack: o.pack, credits: o.credits } : null });
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
    const useLora = body.model === "lora";
    if (useLora && (!loraSettings().enabled || rec.lora?.status !== "ready")) throw new UserError2("\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u0430\u044F \u043C\u043E\u0434\u0435\u043B\u044C \u0435\u0449\u0451 \u043D\u0435 \u0433\u043E\u0442\u043E\u0432\u0430.");
    if (!photos.length && !useLora) throw new UserError2("\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0445\u043E\u0442\u044F \u0431\u044B \u043E\u0434\u043D\u043E \u0444\u043E\u0442\u043E.");
    if (!photos.every((p) => typeof p === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p))) throw new UserError2("\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0444\u043E\u0442\u043E JPG, PNG \u0438\u043B\u0438 WEBP.");
    const style = STYLES.find((s) => s.id === body.style);
    if (!style) throw new UserError2("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043E\u0431\u0440\u0430\u0437.");
    const format = FORMATS.find((f) => f.id === body.format)?.id || "4:5";
    const count = Math.min(MAX_VARIANTS, Math.max(1, parseInt(body.count, 10) || 1));
    const wishes = typeof body.wishes === "string" ? body.wishes.trim().slice(0, 600) : "";
    if (style.custom && wishes.length < 8) throw new UserError2("\u041E\u043F\u0438\u0448\u0438\u0442\u0435 \u0441\u0432\u043E\u0439 \u043E\u0431\u0440\u0430\u0437 \u0445\u043E\u0442\u044F \u0431\u044B \u043F\u0430\u0440\u043E\u0439 \u0444\u0440\u0430\u0437.");
    const ms = modelSettings();
    const modelId = useLora ? "lora" : ms.enabled.includes(body.model) ? body.model : ms.default;
    const model = useLora ? loraModel(rec) : modelById(modelId);
    const unit = useLora ? loraSettings().perImage : ms.credits[modelId] ?? model.credits;
    const fs_ = faceSwapSettings();
    const useSwap = fs_.enabled && body.swap !== false && photos.length > 0;
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
      const prompt = useLora ? loraPrompt(rec, style, wishes) : buildPrompt(style, wishes);
      const err = await start(gen, { prompt, photos, resolution: RESOLUTION, swap: useSwap ? { gender, hair: fs_.hair } : null, model });
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
  "POST /api/edit": async (req, res2) => {
    const { key, rec } = clientKey(req);
    const es = editSettings();
    if (!es.enabled) throw new UserError2("\u041F\u0440\u0430\u0432\u043A\u0438 \u0441\u0435\u0439\u0447\u0430\u0441 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B.", 403);
    const body = parse(await readBody(req));
    const image = String(body.image || "");
    const text = String(body.text || "").trim().slice(0, 400);
    if (text.length < 3) throw new UserError2("\u041E\u043F\u0438\u0448\u0438\u0442\u0435, \u0447\u0442\u043E \u0438\u0441\u043F\u0440\u0430\u0432\u0438\u0442\u044C.");
    const parent = db.gens.find((g) => g.key === key && g.status === "done" && (g.images || []).includes(image));
    if (!parent) throw new UserError2("\u042D\u0442\u043E\u0442 \u043F\u043E\u0440\u0442\u0440\u0435\u0442 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u0432\u0430\u0448\u0435\u0439 \u0438\u0441\u0442\u043E\u0440\u0438\u0438.", 404);
    const ref = typeof body.photo === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(body.photo) ? body.photo : null;
    if (rec.credits < es.credits) throw new UserError2(rec.credits ? `\u0414\u043B\u044F \u043F\u0440\u0430\u0432\u043A\u0438 \u043D\u0443\u0436\u043D\u043E ${es.credits} \u043A\u0440., \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0435 ${rec.credits}.` : "\u041A\u0440\u0435\u0434\u0438\u0442\u044B \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B\u0438\u0441\u044C. \u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0431\u0430\u043B\u0430\u043D\u0441.", 402);
    rec.credits -= es.credits;
    rec.spent = (rec.spent || 0) + es.credits;
    const gen = { id: newId(), key, kind: "edit", parent: parent.id, source: image, style: parent.style, format: parent.format, count: 1, unit: es.credits, model: es.model, swapOn: false, text, status: "queued", images: [], created: Date.now(), showcase: [] };
    db.gens.unshift(gen);
    save();
    try {
      const err = await start(gen, { prompt: editPrompt(text), photos: ref ? [image, ref] : [image], resolution: RESOLUTION, swap: null, model: modelById(es.model) });
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
  "POST /api/lora/train": async (req, res2) => {
    const { rec } = clientKey(req);
    const s = loraSettings();
    if (!s.enabled) throw new UserError2("\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u044B\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 \u0441\u0435\u0439\u0447\u0430\u0441 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B.", 403);
    if (rec.lora?.status === "training") throw new UserError2("\u041C\u043E\u0434\u0435\u043B\u044C \u0443\u0436\u0435 \u043E\u0431\u0443\u0447\u0430\u0435\u0442\u0441\u044F. \u0414\u043E\u0436\u0434\u0438\u0442\u0435\u0441\u044C \u043E\u043A\u043E\u043D\u0447\u0430\u043D\u0438\u044F.");
    const body = parse(await readBody(req, 12e6));
    const photos = Array.isArray(body.photos) ? body.photos.slice(0, 20) : [];
    if (photos.length < 8) throw new UserError2("\u041D\u0443\u0436\u043D\u043E \u043C\u0438\u043D\u0438\u043C\u0443\u043C 8 \u0444\u043E\u0442\u043E, \u043B\u0443\u0447\u0448\u0435 12\u201320.");
    if (!photos.every((p) => typeof p === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p))) throw new UserError2("\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0444\u043E\u0442\u043E JPG, PNG \u0438\u043B\u0438 WEBP.");
    if (rec.credits < s.credits) throw new UserError2(`\u0414\u043B\u044F \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u044F \u043D\u0443\u0436\u043D\u043E ${s.credits} \u043A\u0440\u0435\u0434\u0438\u0442\u043E\u0432, \u043D\u0430 \u0431\u0430\u043B\u0430\u043D\u0441\u0435 ${rec.credits}. \u041F\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435 \u0431\u0430\u043B\u0430\u043D\u0441.`, 402);
    rec.credits -= s.credits;
    rec.spent = (rec.spent || 0) + s.credits;
    save();
    let err = null;
    try {
      err = await startTraining(rec, photos, origin(req));
    } catch (e) {
      err = { msg: e.message };
    }
    if (err) {
      rec.credits += s.credits;
      rec.spent -= s.credits;
      save();
      throw new UserError2(err.msg || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u0435.", 502);
    }
    json(res2, { lora: publicState(rec), credits: rec.credits });
  },
  "GET /api/lora/status": async (req, res2) => {
    const { rec } = clientKey(req);
    const st = await pollTraining(rec);
    json(res2, { lora: st, credits: rec.credits });
  },
  "POST /api/admin/keys/email": async (req, res2) => {
    isAdmin(req);
    const { key, to } = parse(await readBody(req));
    const rec = db.keys[normKey(key)];
    if (!rec) throw new UserError2("\u041A\u043E\u0434 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D.", 404);
    const addr = String(to || rec.email || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) throw new UserError2("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 email \u043A\u043B\u0438\u0435\u043D\u0442\u0430.");
    if (!emailEnabled()) throw new UserError2("\u041F\u043E\u0447\u0442\u0430 \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430: \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 RESEND_API_KEY \u0438 EMAIL_FROM \u0432 Railway.");
    const r = await sendCodeEmail({ to: addr, key: normKey(key), credits: rec.credits, added: 0, brand: BRAND, site: origin(req) });
    if (!r.ok) throw new UserError2("\u041F\u0438\u0441\u044C\u043C\u043E \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E: " + r.error, 502);
    if (!rec.email) {
      rec.email = addr;
      save();
    }
    json(res2, { ok: true });
  },
  "GET /api/admin/models": async (req, res2) => {
    isAdmin(req);
    json(res2, { models: MODELS.map(({ id, name, desc, endpoint, cost, credits }) => ({ id, name: name.ru, desc: desc.ru, endpoint, cost, credits })), settings: modelSettings(), faceSwap: faceSwapSettings(), swapCost: FACE_SWAP.cost, edit: editSettings(), editModels: EDIT_MODELS, lora: loraSettings(), trainers: Object.fromEntries(Object.entries(TRAINERS).map(([k, v]) => [k, v.name])) });
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
    if (b.edit) db.settings.edit = { enabled: !!b.edit.enabled, credits: parseInt(b.edit.credits, 10) || 1, model: EDIT_MODELS.includes(b.edit.model) ? b.edit.model : "nano_pro" };
    if (b.lora) db.settings.lora = { enabled: !!b.lora.enabled, credits: parseInt(b.lora.credits, 10) || 20, perImage: parseInt(b.lora.perImage, 10) || 1, trainer: TRAINERS[b.lora.trainer] ? b.lora.trainer : "fast", steps: parseInt(b.lora.steps, 10) || 1e3 };
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
      admin: process.env.ADMIN_PASSWORD ? "\u0432\u043A\u043B\u044E\u0447\u0435\u043D\u0430" : "\u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u0430 (ADMIN_PASSWORD)",
      email: emailEnabled() ? "\u043F\u0438\u0441\u044C\u043C\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u044B (Resend)" : "\u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u044B (RESEND_API_KEY, EMAIL_FROM)",
      analytics: /^G-[A-Z0-9]{4,}$/.test(GA_ID) ? "Google Analytics \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D" : "\u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430 (GA_MEASUREMENT_ID)"
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
        dataDir: DATA_DIR,
        indexnow: db.settings.indexnow || null,
        pages: allUrls("").length,
        email: emailEnabled(),
        contact: CONTACT,
        legal: process.env.LEGAL_NAME || "",
        analytics: /^G-[A-Z0-9]{4,}$/.test(GA_ID)
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
    json(res2, Object.entries(db.keys).map(([key, v]) => ({ key, ...v, lora: v.lora ? { status: v.lora.status, error: v.lora.error || "" } : null })).sort((a, b) => b.created - a.created).slice(0, 500));
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
var PAGES = { "/": "index.html", "/en": "index-en.html", "/admin": "admin.html", "/editor": "editor.html", "/privacy": "privacy.html" };
var siteBase = (req) => (process.env.PUBLIC_URL || origin(req)).replace(/\/$/, "");
var escA = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
function seoBlock(req, lang2, html) {
  const base = siteBase(req);
  const url = base + (lang2 === "en" ? "/en" : "/");
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || BRAND;
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
  const covers = db.settings.covers || {};
  const cover = covers.business || Object.values(covers)[0] || "";
  const image = cover ? base + cover : "";
  const cur = currency().toUpperCase();
  const org = { "@type": "Organization", "@id": base + "/#org", name: BRAND, url: base + "/", ...CONTACT ? { email: CONTACT } : {} };
  const ld = [
    { "@context": "https://schema.org", ...org },
    { "@context": "https://schema.org", "@type": "WebSite", name: BRAND, url: base + "/", inLanguage: ["ru", "en"] },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: lang2 === "en" ? "AI headshots and studio portraits" : "\u041D\u0435\u0439\u0440\u043E\u0444\u043E\u0442\u043E\u0441\u0435\u0441\u0441\u0438\u044F: \u0441\u0442\u0443\u0434\u0438\u0439\u043D\u044B\u0435 AI-\u043F\u043E\u0440\u0442\u0440\u0435\u0442\u044B",
      serviceType: lang2 === "en" ? "AI photo studio" : "AI-\u0444\u043E\u0442\u043E\u0441\u0442\u0443\u0434\u0438\u044F",
      provider: { "@id": base + "/#org" },
      areaServed: "Worldwide",
      url,
      ...image ? { image } : {},
      offers: packs().map((p) => ({ "@type": "Offer", name: `${p.name[lang2] || p.name.ru}: ${p.credits} ${lang2 === "en" ? "portraits" : "\u043F\u043E\u0440\u0442\u0440\u0435\u0442\u043E\u0432"}`, price: p.price.toFixed(2), priceCurrency: cur, url: url + "#pricing", availability: "https://schema.org/InStock" }))
    }
  ];
  return [
    `<link rel="canonical" href="${escA(url)}">`,
    `<link rel="alternate" hreflang="ru" href="${escA(base)}/">`,
    `<link rel="alternate" hreflang="en" href="${escA(base)}/en">`,
    `<link rel="alternate" hreflang="x-default" href="${escA(base)}/">`,
    `<meta name="robots" content="index, follow, max-image-preview:large">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escA(BRAND)}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${desc}">`,
    `<meta property="og:url" content="${escA(url)}">`,
    `<meta property="og:locale" content="${lang2 === "en" ? "en_US" : "ru_RU"}">`,
    `<meta property="og:locale:alternate" content="${lang2 === "en" ? "ru_RU" : "en_US"}">`,
    ...image ? [`<meta property="og:image" content="${escA(image)}">`, `<meta name="twitter:image" content="${escA(image)}">`] : [],
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${desc}">`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`
  ].join("\n");
}
function perFrom() {
  const cur = currency().toUpperCase();
  const min = Math.min(...packs().map((p) => p.price / p.credits));
  const f = (loc) => new Intl.NumberFormat(loc, { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(Math.round(min * 100) / 100);
  return { ru: f("ru-RU"), en: f("en-GB") };
}
function allUrls(base) {
  return [base + "/", base + "/en", ...LANDINGS.flatMap((p) => [base + landingPath(p, "ru"), base + landingPath(p, "en")])];
}
var INDEXNOW_KEY = crypto4.createHash("sha256").update("indexnow:" + (process.env.PUBLIC_URL || "portretto")).digest("hex").slice(0, 32);
async function pingIndexNow() {
  if (!process.env.PUBLIC_URL) return;
  const base = process.env.PUBLIC_URL.replace(/\/$/, "");
  try {
    const r = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: new URL(base).host, key: INDEXNOW_KEY, keyLocation: `${base}/${INDEXNOW_KEY}.txt`, urlList: allUrls(base) })
    });
    db.settings.indexnow = { at: Date.now(), status: r.status };
    save();
    console.log("IndexNow:", r.status);
  } catch (e) {
    console.log("IndexNow error:", e.message);
  }
}
setTimeout(pingIndexNow, 6e4);
function robotsTxt(req) {
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /editor
Disallow: /api/
Disallow: /train/

Sitemap: ${siteBase(req)}/sitemap.xml
`;
}
function sitemapXml(req) {
  const b = siteBase(req), d = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const alt = `<xhtml:link rel="alternate" hreflang="ru" href="${b}/"/><xhtml:link rel="alternate" hreflang="en" href="${b}/en"/><xhtml:link rel="alternate" hreflang="x-default" href="${b}/"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
<url><loc>${b}/</loc><lastmod>${d}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority>${alt}</url>
<url><loc>${b}/en</loc><lastmod>${d}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority>${alt}</url>
` + LANDINGS.map((p) => {
    const a = `<xhtml:link rel="alternate" hreflang="ru" href="${b}${landingPath(p, "ru")}"/><xhtml:link rel="alternate" hreflang="en" href="${b}${landingPath(p, "en")}"/><xhtml:link rel="alternate" hreflang="x-default" href="${b}${landingPath(p, "ru")}"/>`;
    return `<url><loc>${b}${landingPath(p, "ru")}</loc><lastmod>${d}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority>${a}</url>
<url><loc>${b}${landingPath(p, "en")}</loc><lastmod>${d}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority>${a}</url>
`;
  }).join("") + `<url><loc>${b}/privacy</loc><lastmod>${d}</lastmod><changefreq>yearly</changefreq><priority>0.2</priority></url>
</urlset>
`;
}
var pageCache = {};
var GA_ID = (process.env.GA_MEASUREMENT_ID || "G-NJZ6M4T6WL").trim().toUpperCase();
var gaSnippet = () => !/^G-[A-Z0-9]{4,}$/.test(GA_ID) ? "" : `<script>window.PT_GA=${JSON.stringify(GA_ID)};window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}var c=null;try{c=localStorage.getItem("pt_consent")}catch(e){}gtag("consent","default",{ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",analytics_storage:c==="granted"?"granted":"denied",wait_for_update:500});gtag("js",new Date());gtag("config",${JSON.stringify(GA_ID)},{anonymize_ip:true});</script><script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>`;
function serveStatic(res2, pathname, req) {
  let name = PAGES[pathname] || pathname.replace(/^\/+/, "");
  let file = path4.join(PUBLIC, name);
  if (!PAGES[pathname] && (!/^[\w.-]+\.(png|jpe?g|svg|ico|webp)$/i.test(name) || !fs4.existsSync(file))) {
    res2.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    return res2.end(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430 \xB7 ${escA(BRAND)}</title><style>body{margin:0;font:16px/1.6 system-ui,sans-serif;background:#eceef0;color:#18212b;display:grid;place-items:center;min-height:100vh;padding:16px;text-align:center}a{color:#18212b;font-weight:700}@media(prefers-color-scheme:dark){body{background:#11161b;color:#e9edf0}a{color:#e9edf0}}</style></head><body><div><h1 style="font-weight:400;font-family:Georgia,serif">404</h1><p>\u0422\u0430\u043A\u043E\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043D\u0435\u0442 \xB7 Page not found</p><p><a href="/">${escA(BRAND)} \u2192</a></p></div></body></html>`);
  }
  if (name === "privacy.html") {
    const site = origin(req).replace(/^https?:\/\//, "");
    const html = fs4.readFileSync(file, "utf8").replaceAll("{{BRAND}}", BRAND).replaceAll("{{LEGAL}}", process.env.LEGAL_NAME || BRAND).replaceAll("{{CONTACT}}", CONTACT || "\u2014").replaceAll("{{SITE}}", site).replaceAll("{{UPDATED}}", process.env.PRIVACY_UPDATED || "29.09.2026").replaceAll("{{CANON}}", siteBase(req) + "/privacy");
    res2.writeHead(200, { "content-type": "text/html; charset=utf-8", "x-content-type-options": "nosniff" });
    return res2.end(html);
  }
  if (name === "index.html" || name === "index-en.html") {
    const lang2 = name === "index-en.html" ? "en" : "ru";
    pageCache[name] ||= fs4.readFileSync(file, "utf8");
    let html = pageCache[name].replace("<!--SEO-->", seoBlock(req, lang2, pageCache[name])).replace("<!--LINKS-->", landingLinksHtml(lang2, BRAND));
    if (GA_ID) html = html.replace("</head>", gaSnippet() + "\n</head>");
    res2.writeHead(200, { "content-type": "text/html; charset=utf-8", "x-content-type-options": "nosniff", "content-language": lang2 });
    return res2.end(html);
  }
  res2.writeHead(200, { "content-type": TYPES[path4.extname(file).toLowerCase()] || "application/octet-stream", "x-content-type-options": "nosniff" });
  fs4.createReadStream(file).pipe(res2);
}
http.createServer(async (req, res2) => {
  const url = new URL(req.url, "http://x");
  const handler = routes[`${req.method} ${url.pathname}`];
  try {
    if (handler) return await handler(req, res2, url);
    if (url.pathname.startsWith("/api/")) return json(res2, { error: "\u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E" }, 404);
    const pub = process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL) : null;
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").toLowerCase();
    if (pub && req.method === "GET" && host && host !== pub.host.toLowerCase() && !url.pathname.startsWith("/covers/") && !url.pathname.startsWith("/train/")) {
      res2.writeHead(301, { location: pub.origin + url.pathname + url.search });
      return res2.end();
    }
    if (url.pathname === `/${INDEXNOW_KEY}.txt`) {
      res2.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      return res2.end(INDEXNOW_KEY);
    }
    const lp = findLanding(url.pathname);
    if (lp) {
      const base = siteBase(req);
      const html = renderLanding(lp.page, lp.lang, { base, brand: BRAND, covers: db.settings.covers || {}, perFrom: perFrom(), ga: GA_ID ? gaSnippet() : "" });
      res2.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-language": lp.lang, "x-content-type-options": "nosniff" });
      return res2.end(html);
    }
    if (url.pathname.length > 1 && url.pathname.endsWith("/") && findLanding(url.pathname.slice(0, -1))) {
      res2.writeHead(301, { location: url.pathname.slice(0, -1) + url.search });
      return res2.end();
    }
    if (url.pathname === "/robots.txt") {
      res2.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      return res2.end(robotsTxt(req));
    }
    if (url.pathname === "/sitemap.xml") {
      res2.writeHead(200, { "content-type": "application/xml; charset=utf-8" });
      return res2.end(sitemapXml(req));
    }
    if (url.pathname === "/index.html") {
      res2.writeHead(301, { location: "/" });
      return res2.end();
    }
    if (url.pathname.length > 1 && url.pathname.endsWith("/") && PAGES[url.pathname.slice(0, -1)]) {
      res2.writeHead(301, { location: url.pathname.slice(0, -1) + url.search });
      return res2.end();
    }
    if (url.pathname.startsWith("/covers/") && serveCover(res2, url.pathname.slice(8))) return;
    if (url.pathname.startsWith("/train/") && serveZip(res2, url.pathname.slice(7))) return;
    serveStatic(res2, url.pathname, req);
  } catch (e) {
    if (!(e instanceof UserError2)) console.error(e);
    if (!res2.headersSent) json(res2, { error: e instanceof UserError2 ? e.message : "\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u044F\u044F \u043E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437." }, e.status || 500);
  }
}).listen(PORT, () => console.log(`${BRAND}: \u0441\u0442\u0443\u0434\u0438\u044F \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u0430 \u043D\u0430 \u043F\u043E\u0440\u0442\u0443 ${PORT}. \u0414\u0430\u043D\u043D\u044B\u0435: ${DATA_DIR}${PERSISTENT ? "" : " (Volume \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D!)"}`));
setInterval(() => {
  if (Object.values(db.coverJobs || {}).some((j) => j.status === "working")) pollCovers().catch(() => {
  });
}, 5e3);
