// Xtreme Marketing – server API (Netlify Functions v2)
// Sign-in for up to 10 accounts with per-user section access, shared team data (leads, content plan,
// campaigns, saved designs, listings, reviews, landing pages), Pexels photo search, QR/link scan tracking,
// free website analytics + quote form for the company website, SEO scans and Google Search Console.
// No paid APIs: everything here runs on free services.
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

export const config = { path: ["/api/*", "/go/*"] };

const VERSION = "3.0";
const SESSION_HOURS = 12, REMEMBER_DAYS = 30, MAX_FAILS = 5, LOCK_MIN = 15;
const MODULES = ["studio", "planner", "leads", "campaigns", "writer", "seo", "grow"];
const MAX_USERS = 10;
// which sections may read / write each shared collection
const COLS = {
  leads: { write: ["leads"], read: ["leads"] },
  posts: { write: ["planner"], read: ["planner"] },
  campaigns: { write: ["campaigns"], read: ["campaigns", "leads", "studio", "writer"] },
  designs: { write: ["studio"], read: ["studio", "planner"] },
  keywords: { write: ["seo"], read: ["seo", "grow"] },
  listings: { write: ["grow"], read: ["grow"] },
  reviews: { write: ["grow"], read: ["grow"] },
  pages: { write: ["grow"], read: ["grow", "writer"] },
};
const MAX_ITEMS = 3000;

const store = () => getStore({ name: "xtreme-marketing", consistency: "strong" });
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const b64u = (b) => Buffer.from(b).toString("base64url");
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString("hex");
const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const permsOf = (u) => {
  if (u.role === "admin" || !Array.isArray(u.perms)) return MODULES.slice();
  const p = u.perms.filter((m) => MODULES.includes(m));
  if (!u.pv3 && p.includes("seo") && !p.includes("grow")) p.push("grow"); // v2 accounts: Grow came out of SEO
  return p;
};
const can = (u, m) => permsOf(u).includes(m);
const canAny = (u, list) => list.some((m) => can(u, m));
const cleanUser = (u) => ({ id: u.id, username: u.username, role: u.role, mustChange: !!u.mustChange, active: !!u.active, perms: permsOf(u) });
const uid = () => Date.now().toString(36) + crypto.randomBytes(4).toString("hex");
const today = () => new Date(Date.now() + 4 * 36e5).toISOString().slice(0, 10); // Abu Dhabi date (UTC+4)

async function getUsers(st) {
  let u = await st.get("users", { type: "json" });
  if (!u) {
    const salt = crypto.randomBytes(16).toString("hex");
    u = [{ id: 1, username: "admin", salt, hash: hashPw("admin", salt), role: "admin", mustChange: true, active: true, tv: 1 }];
    await st.setJSON("users", u);
  }
  return u;
}
async function secret(st) {
  let s = await st.get("secret");
  if (!s) { s = crypto.randomBytes(32).toString("hex"); await st.set("secret", s); }
  return s;
}
async function makeToken(st, u, remember) {
  const p = b64u(JSON.stringify({ id: u.id, tv: u.tv, exp: Date.now() + (remember ? REMEMBER_DAYS * 864e5 : SESSION_HOURS * 36e5) }));
  const sig = crypto.createHmac("sha256", await secret(st)).update(p).digest("base64url");
  return p + "." + sig;
}
async function auth(st, req) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const [p, sig] = t.split(".");
  if (!p || !sig) return null;
  const good = crypto.createHmac("sha256", await secret(st)).update(p).digest("base64url");
  if (!safeEq(sig, good)) return null;
  let d; try { d = JSON.parse(Buffer.from(p, "base64url").toString()); } catch { return null; }
  if (!d.exp || d.exp < Date.now()) return null;
  const u = (await getUsers(st)).find((x) => x.id === d.id);
  if (!u || !u.active || u.tv !== d.tv) return null;
  return u;
}
function validPw(pw) {
  if (typeof pw !== "string" || pw.length < 6) return "Password must be at least 6 characters";
  if (pw.toLowerCase() === "admin") return "Choose a password other than admin";
  return null;
}
const validName = (n) => typeof n === "string" && /^[a-z0-9._-]{3,30}$/.test(n);

/* ---------------- settings ---------------- */
const DEF_SETTINGS = { waNumber: "971503641714", website: "https://www.xtreme-fmgroup.com", reviewLink: "", xtremeUrl: "https://xtremesalestoolkit.netlify.app", pexelsKey: "", gsc: null, gscSite: "", psiKey: "", competitors: [], goals: { leads: 30, posts: 12, reviews: 8 } };
async function settings(st) { return { ...DEF_SETTINGS, ...((await st.get("settings", { type: "json" })) || {}) }; }
const mask = (k) => (k ? "••••" + String(k).slice(-4) : "");
function publicSettings(s, admin, u) {
  const o = { waNumber: s.waNumber, website: s.website, reviewLink: s.reviewLink, xtremeUrl: s.xtremeUrl, pexels: !!s.pexelsKey, gsc: !!(s.gsc && s.gscSite), gscSite: s.gscSite,
    competitors: s.competitors || [], goals: { ...DEF_SETTINGS.goals, ...(s.goals || {}) } };
  if (u && can(u, "seo")) o.psiKey = s.psiKey || "";
  if (admin) Object.assign(o, { pexelsKeyMasked: mask(s.pexelsKey), gscEmail: s.gsc ? s.gsc.client_email : "" });
  return o;
}

/* ---------------- shared collections ---------------- */
async function readCol(st, name) { return (await st.get("col:" + name, { type: "json" })) || []; }
async function writeCol(st, name, items) { await st.setJSON("col:" + name, items.slice(0, MAX_ITEMS)); }
async function scansOf(st, code) { return (await st.get("scan:" + String(code).toUpperCase(), { type: "json" })) || { total: 0, days: {} }; }

/* ---------------- tracked link redirect ---------------- */
function waLink(num, text) { return "https://wa.me/" + String(num || "").replace(/\D/g, "") + (text ? "?text=" + encodeURIComponent(text) : ""); }
function withUtm(url, c) {
  try { const u = new URL(/^https?:/i.test(url) ? url : "https://" + url); u.searchParams.set("utm_source", (c.channel || "qr").toLowerCase().replace(/\W+/g, "-")); u.searchParams.set("utm_medium", "qr"); u.searchParams.set("utm_campaign", c.code); return u.toString(); } catch { return url; }
}
async function track(st, code) {
  const s = await settings(st);
  const c = (await readCol(st, "campaigns")).find((x) => String(x.code || "").toUpperCase() === code);
  if (!c) return Response.redirect(s.website || "https://www.xtreme-fmgroup.com", 302);
  const k = "scan:" + code, sc = await scansOf(st, code), d = today();
  sc.total = (sc.total || 0) + 1; sc.days = sc.days || {}; sc.days[d] = (sc.days[d] || 0) + 1; sc.last = Date.now();
  const keys = Object.keys(sc.days).sort(); if (keys.length > 400) delete sc.days[keys[0]];
  await st.setJSON(k, sc);
  let to;
  if (c.dest === "website") to = withUtm(c.url || s.website, c);
  else if (c.dest === "review") to = s.reviewLink || s.website;
  else if (c.dest === "link" && c.url) to = /^https?:/i.test(c.url) ? c.url : "https://" + c.url;
  else to = waLink(s.waNumber, (c.message || "Hello Xtreme, I'd like a quote please.") + ` (Ref: ${c.code})`);
  return new Response(null, { status: 302, headers: { location: to, "cache-control": "no-store" } });
}

/* ---------------- SEO: Google Search Console (service account) ---------------- */
async function gscToken(st, s, force) {
  const c = await st.get("gsc-token", { type: "json" });
  if (!force && c && c.exp > Date.now() + 60e3) return c.token;
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64u(JSON.stringify({ iss: s.gsc.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = crypto.createSign("RSA-SHA256").update(head + "." + claim).sign(s.gsc.private_key, "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${sig}` }) });
  const d = await r.json().catch(() => ({}));
  if (!d.access_token) throw new Error("Google refused the key" + (d.error_description ? `: ${d.error_description}` : d.error ? ` (${d.error})` : ""));
  await st.setJSON("gsc-token", { token: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000 });
  return d.access_token;
}
async function gsc(st, s, path, body) {
  const go = async (force) => fetch("https://www.googleapis.com/webmasters/v3/" + path, { method: body ? "POST" : "GET", headers: { Authorization: "Bearer " + (await gscToken(st, s, force)), "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  let r = await go(false); if (r.status === 401) r = await go(true);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const m = (d.error && d.error.message) || `Google error ${r.status}`;
    if (r.status === 403) throw new Error(`Google says no access to ${s.gscSite}. In Search Console › Settings › Users and permissions, add ${s.gsc.client_email} as a user.`);
    throw new Error(m);
  }
  return d;
}
const isoDay = (t) => new Date(t).toISOString().slice(0, 10);
async function gscSummary(st, s, days, words) {
  const site = encodeURIComponent(s.gscSite), end = isoDay(Date.now() - 864e5), start = isoDay(Date.now() - days * 864e5);
  const pEnd = isoDay(Date.now() - (days + 1) * 864e5), pStart = isoDay(Date.now() - (days * 2) * 864e5);
  const q = (b) => gsc(st, s, `sites/${site}/searchAnalytics/query`, { dataState: "all", ...b });
  const tot = (rows) => { const r = (rows || [])[0] || {}; return { clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || 0 }; };
  const [byDate, cur, prev, byQ, byPage, byDev, maps] = await Promise.all([
    q({ startDate: start, endDate: end, dimensions: ["date"], rowLimit: 500 }),
    q({ startDate: start, endDate: end }),
    q({ startDate: pStart, endDate: pEnd }),
    q({ startDate: start, endDate: end, dimensions: ["query"], rowLimit: 250 }),
    q({ startDate: start, endDate: end, dimensions: ["page"], rowLimit: 25 }),
    q({ startDate: start, endDate: end, dimensions: ["device"], rowLimit: 5 }),
    gsc(st, s, `sites/${site}/sitemaps`).catch(() => ({})),
  ]);
  const queries = (byQ.rows || []).map((r) => ({ q: r.keys[0], clicks: r.clicks, imp: r.impressions, ctr: r.ctr, pos: r.position }));
  const kw = await Promise.all((words || []).slice(0, 10).map(async (w) => {
    const d = await q({ startDate: start, endDate: end, dimensions: ["date"], rowLimit: 500, dimensionFilterGroups: [{ filters: [{ dimension: "query", operator: "contains", expression: w.toLowerCase() }] }] }).catch(() => ({ rows: [] }));
    const rows = d.rows || [], imp = rows.reduce((a, r) => a + r.impressions, 0), clicks = rows.reduce((a, r) => a + r.clicks, 0);
    const pos = imp ? rows.reduce((a, r) => a + r.position * r.impressions, 0) / imp : null;
    return { w, imp, clicks, pos, daily: rows.map((r) => ({ d: r.keys[0], pos: r.position, imp: r.impressions })) };
  }));
  return {
    site: s.gscSite, start, end, totals: tot(cur.rows), prev: tot(prev.rows),
    daily: (byDate.rows || []).map((r) => ({ d: r.keys[0], clicks: r.clicks, imp: r.impressions, pos: r.position, ctr: r.ctr })),
    queries: queries.slice(0, 40),
    opportunities: queries.filter((x) => x.pos >= 4 && x.pos <= 20 && x.imp >= 5).sort((a, b) => b.imp - a.imp).slice(0, 12),
    pages: (byPage.rows || []).map((r) => ({ page: r.keys[0], clicks: r.clicks, imp: r.impressions, ctr: r.ctr, pos: r.position })),
    devices: (byDev.rows || []).map((r) => ({ device: r.keys[0], clicks: r.clicks, imp: r.impressions })),
    sitemaps: (maps.sitemap || []).map((m) => ({ path: m.path, last: m.lastDownloaded, errors: +m.errors || 0, warnings: +m.warnings || 0, submitted: (m.contents || []).reduce((a, c) => a + (+c.submitted || 0), 0) })),
    keywords: kw,
  };
}

/* ---------------- SEO: live page scan ---------------- */
const bareHost = (u) => { try { return new URL(/^https?:/i.test(u) ? u : "https://" + u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } };
function hostOk(s, u) { const a = bareHost(u); return !!a && a === bareHost(s.website); }
const rivalOk = (s, u) => { const a = bareHost(u); return !!a && (s.competitors || []).some((c) => bareHost(c) === a); };
const strip = (x) => String(x || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const attr = (tag, name) => { const m = new RegExp(name + `\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag); return m ? (m[2] ?? m[3] ?? m[4] ?? "") : null; };
async function fetchTimed(u, ms) {
  const ctl = new AbortController(), t0 = Date.now(), tm = setTimeout(() => ctl.abort(), ms || 7000);
  try { const r = await fetch(u, { redirect: "follow", signal: ctl.signal, headers: { "user-agent": "Mozilla/5.0 (Linux; Android 14) XtremeSEO/3.0", accept: "text/html,application/xml;q=0.9,*/*;q=0.8" } }); const text = await r.text(); return { ok: r.ok, status: r.status, url: r.url, text, ms: Date.now() - t0, type: r.headers.get("content-type") || "" }; }
  finally { clearTimeout(tm); }
}
function analyse(html, url, res) {
  const head = (/<head[\s\S]*?<\/head>/i.exec(html) || [html])[0];
  const title = strip((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(head) || [])[1]);
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (n) => { const t = metas.find((m) => (attr(m, "name") || attr(m, "property") || "").toLowerCase() === n); return t ? attr(t, "content") || "" : null; };
  const desc = meta("description"), robots = meta("robots") || "", ogt = meta("og:title"), ogi = meta("og:image"), vp = meta("viewport");
  const canon = ([...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((l) => /rel\s*=\s*["']?canonical/i.test(l)) || "");
  const canonical = canon ? attr(canon, "href") : null;
  const lang = attr((/<html\b[^>]*>/i.exec(html) || [""])[0], "lang");
  const body = (/<body[\s\S]*<\/body>/i.exec(html) || [html])[0].replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const h1 = [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => strip(m[1])).filter(Boolean);
  const h2 = [...body.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => strip(m[1])).filter(Boolean);
  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]); const noAlt = imgs.filter((i) => !(attr(i, "alt") || "").trim()).length;
  const text = strip(body), words = text ? text.split(" ").length : 0;
  const links = [...body.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["']/gi)].map((m) => m[1]);
  let host = ""; try { host = new URL(url).hostname; } catch {}
  const internal = links.filter((l) => l.startsWith("/") || l.includes(host)).length;
  const schema = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].flatMap((m) => { try { const j = JSON.parse(m[1]); const arr = Array.isArray(j) ? j : j["@graph"] || [j]; return arr.map((x) => [].concat(x["@type"] || []).join("/")); } catch { return []; } }).filter(Boolean);
  const low = (title + " " + (desc || "") + " " + h1.join(" ") + " " + text.slice(0, 4000)).toLowerCase();
  const C = []; const add = (k, st2, label, fix, val) => C.push({ k, s: st2, label, fix, val });
  add("status", res.ok ? "ok" : "bad", `Page loads (HTTP ${res.status})`, res.ok ? "" : "The page returns an error. Fix or redirect it.");
  add("https", url.startsWith("https://") ? "ok" : "bad", "Secure (https)", "Serve the page over https.");
  add("speed", res.ms < 1200 ? "ok" : res.ms < 2500 ? "warn" : "bad", `Server response ${res.ms} ms`, "Compress images and remove unused apps/widgets to load faster.");
  add("title", !title ? "bad" : title.length < 30 || title.length > 65 ? "warn" : "ok", "Title", !title ? "Add a page title." : `Keep the title 30–65 characters (now ${title.length}). Put the service and "Abu Dhabi" first.`, title);
  add("desc", !desc ? "bad" : desc.length < 70 || desc.length > 160 ? "warn" : "ok", "Meta description", !desc ? "Add a 120–155 character description with the service, area and a call to action." : `Aim for 120–155 characters (now ${desc.length}).`, desc || "");
  add("h1", h1.length === 1 ? "ok" : h1.length === 0 ? "bad" : "warn", `Main heading (H1): ${h1.length}`, h1.length === 0 ? "Add one H1 that names the service and Abu Dhabi." : h1.length > 1 ? "Use only one H1 per page; make the others H2." : "", h1.join(" | "));
  add("h2", h2.length >= 2 ? "ok" : "warn", `Sub-headings (H2): ${h2.length}`, "Break the page into sections with H2 headings (What's included, Prices, Areas we cover, FAQ).");
  add("words", words >= 300 ? "ok" : words >= 150 ? "warn" : "bad", `Text on page: ${words} words`, "Google ranks pages with useful text. Aim for 300+ words describing the service, areas and FAQs.");
  add("alt", imgs.length === 0 ? "warn" : noAlt === 0 ? "ok" : "warn", `Images with descriptions: ${imgs.length - noAlt}/${imgs.length}`, noAlt ? `Add alt text to ${noAlt} image${noAlt > 1 ? "s" : ""}, e.g. "Deep cleaning of a kitchen in Abu Dhabi".` : imgs.length ? "" : "Add real photos of your work with alt text.");
  add("local", /abu dhabi/.test(low) ? "ok" : "bad", 'Mentions "Abu Dhabi"', 'Add "Abu Dhabi" (and areas like Al Reem, Khalifa City) to the title, H1 and text.');
  add("schema", schema.some((t) => /LocalBusiness|Organization|CleaningService|HomeAndConstructionBusiness|ProfessionalService/i.test(t)) ? "ok" : "warn", `Google business data (schema): ${schema.length ? schema.join(", ") : "none"}`, "Add LocalBusiness schema with your name, address, phone and opening hours. The app can write the code for you.");
  add("canonical", canonical ? "ok" : "warn", "Canonical link", "Add a canonical link so Google knows the main address of this page.", canonical || "");
  add("viewport", vp ? "ok" : "bad", "Mobile-friendly viewport", "Add a mobile viewport tag.");
  add("og", ogt && ogi ? "ok" : "warn", "Social sharing preview", "Add Open Graph title and image so links look good on WhatsApp and Facebook.");
  add("index", /noindex/i.test(robots) ? "bad" : "ok", /noindex/i.test(robots) ? "Hidden from Google (noindex)" : "Allowed in Google", "Remove noindex so the page can appear in search.");
  add("links", internal >= 3 ? "ok" : "warn", `Internal links: ${internal}`, "Link to your other service pages and the contact page.");
  add("lang", lang ? "ok" : "warn", `Language set${lang ? `: ${lang}` : ""}`, "Set the page language (lang attribute).");
  const w = { ok: 1, warn: 0.5, bad: 0 }, score = Math.round((C.reduce((a, c) => a + w[c.s], 0) / C.length) * 100);
  return { url: res.url || url, ms: res.ms, bytes: html.length, title, desc: desc || "", h1, words, images: imgs.length, noAlt, schema, score, checks: C };
}


/* ---------------- Website analytics (free, no cookies, no personal data) ----------------
   public/x.js on the company website sends one small beacon per page view and per WhatsApp / call /
   email click. We keep only daily totals per page, source, device and city. */
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400" };
const cors = (d, st2 = 200) => new Response(d == null ? null : JSON.stringify(d), { status: st2, headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" } });
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|monitor/i;
const MAP_CAP = 150;
function bump(map, key, n = 1) {
  if (!key) return;
  key = String(key).slice(0, 120);
  map[key] = (map[key] || 0) + n;
  const keys = Object.keys(map);
  if (keys.length > MAP_CAP) { keys.sort((a, b) => map[a] - map[b]); for (const k of keys.slice(0, keys.length - MAP_CAP)) delete map[k]; }
}
function sourceOf(ref, utm, own) {
  const us = String((utm && utm.source) || "").toLowerCase(), um = String((utm && utm.medium) || "").toLowerCase();
  if (us) {
    if (/^(ig|insta)/.test(us)) return "Instagram";
    if (/^(fb|facebook|meta)/.test(us)) return "Facebook";
    if (/google/.test(us)) return /cpc|ppc|paid|ads/.test(um) ? "Google Ads" : "Google";
    if (/qr|flyer|print/.test(us) || um === "qr") return "QR code";
    if (/whatsapp|wa$/.test(us)) return "WhatsApp";
    if (/tiktok|tt$/.test(us)) return "TikTok";
    if (/linkedin|^li$/.test(us)) return "LinkedIn";
    if (/mail|newsletter/.test(us)) return "Email";
    return us.charAt(0).toUpperCase() + us.slice(1, 30);
  }
  const h = bareHost(ref || "");
  if (!h || h === own) return "Direct";
  if (/(^|\.)google\./.test(h)) return "Google";
  if (/bing\.com$/.test(h)) return "Bing";
  if (/(duckduckgo|yahoo|yandex|ecosia|baidu)\./.test(h)) return "Other search";
  if (/instagram\.com$/.test(h)) return "Instagram";
  if (/(facebook\.com|fb\.com|fb\.me)$/.test(h)) return "Facebook";
  if (/(linkedin\.com|lnkd\.in)$/.test(h)) return "LinkedIn";
  if (/tiktok\.com$/.test(h)) return "TikTok";
  if (/(^t\.co$|twitter\.com$|^x\.com$)/.test(h)) return "X";
  if (/(wa\.me|whatsapp\.com)$/.test(h)) return "WhatsApp";
  if (/(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com)$/.test(h)) return "AI assistants";
  if (/(maps\.app\.goo\.gl|g\.page)$/.test(h)) return "Google Maps";
  return "Other sites";
}
function fromSite(s, req, url, body) {
  const o = req.headers.get("origin") || "", host = bareHost(o || body.h || "");
  return !!host && (host === bareHost(s.website) || host === url.hostname.replace(/^www\./, "")); // the company site, or the app itself
}
async function hit(st, s, req, url, ctx) {
  let b; try { b = JSON.parse(await req.text()); } catch { return cors(null, 204); }
  if (!b || typeof b !== "object" || BOTS.test(req.headers.get("user-agent") || "")) return cors(null, 204);
  if (!fromSite(s, req, url, b)) return cors({ error: "Not your website" }, 403);
  const k = "stats:" + today(), d = (await st.get(k, { type: "json" })) || { pv: 0, s: 0, nv: 0, ev: {}, pages: {}, src: {}, refs: {}, utm: {}, dev: {}, city: {}, conv: {} };
  const path = String(b.p || "/").split("?")[0].split("#")[0].slice(0, 120) || "/";
  const ev = ["wa", "call", "mail", "form"].includes(b.e) ? b.e : "pv";
  if (ev === "pv") {
    d.pv++; bump(d.pages, path);
    if (b.s) {
      d.s++; if (b.v) d.nv++;
      const own = bareHost(s.website), src = sourceOf(b.r, b.u, own); bump(d.src, src);
      if (src === "Other sites" || src === "Other search") bump(d.refs, bareHost(b.r));
      if (b.u && b.u.campaign) bump(d.utm, String(b.u.campaign).slice(0, 60));
      bump(d.dev, +b.w >= 1024 ? "Desktop" : +b.w >= 700 ? "Tablet" : "Mobile");
      const city = ctx && ctx.geo ? [ctx.geo.city, ctx.geo.country && ctx.geo.country.code].filter(Boolean).join(", ") : "";
      if (city) bump(d.city, city);
    }
  } else { d.ev[ev] = (d.ev[ev] || 0) + 1; bump(d.conv, path); }
  d.last = Date.now();
  await st.setJSON(k, d);
  return cors(null, 204);
}
async function statsFor(st, days) {
  const list = (n, off) => [...Array(n)].map((_, i) => new Date(Date.now() + 4 * 36e5 - (i + off) * 864e5).toISOString().slice(0, 10)).reverse();
  const cur = list(days, 0), prev = days <= 28 ? list(days, days) : [];
  const [a, b] = await Promise.all([Promise.all(cur.map((d) => st.get("stats:" + d, { type: "json" }))), Promise.all(prev.map((d) => st.get("stats:" + d, { type: "json" })))]);
  const tot = (rows) => rows.reduce((t, r) => { if (r) { t.pv += r.pv || 0; t.s += r.s || 0; t.nv += r.nv || 0; for (const e of ["wa", "call", "mail", "form"]) t[e] += (r.ev || {})[e] || 0; } return t; }, { pv: 0, s: 0, nv: 0, wa: 0, call: 0, mail: 0, form: 0 });
  const merge = (key, n) => { const m = {}; a.forEach((r) => { if (r && r[key]) for (const [k, v] of Object.entries(r[key])) m[k] = (m[k] || 0) + v; }); return Object.entries(m).sort((x, y) => y[1] - x[1]).slice(0, n).map(([k, v]) => ({ k, n: v })); };
  return {
    days, start: cur[0], end: cur[cur.length - 1], totals: tot(a), prev: prev.length ? tot(b) : null,
    daily: cur.map((d, i) => { const r = a[i] || {}; const ev = r.ev || {}; return { d, pv: r.pv || 0, s: r.s || 0, conv: (ev.wa || 0) + (ev.call || 0) + (ev.mail || 0) + (ev.form || 0) }; }),
    pages: merge("pages", 15), sources: merge("src", 12), refs: merge("refs", 10), utm: merge("utm", 10), devices: merge("dev", 3), cities: merge("city", 8), convPages: merge("conv", 8),
    last: Math.max(0, ...a.filter(Boolean).map((r) => r.last || 0)),
  };
}

/* ---------------- Website quote form -> Leads ---------------- */
async function webLead(st, s, req, url) {
  let b; try { b = JSON.parse(await req.text()); } catch { return cors({ error: "Bad request" }, 400); }
  if (!b || typeof b !== "object") return cors({ error: "Bad request" }, 400);
  if (!fromSite(s, req, url, b)) return cors({ error: "Not your website" }, 403);
  if (b.hp || +b.t < 2500) return cors({ ok: true }); // honeypot filled or sent too fast: a bot, pretend it worked
  const name = String(b.name || "").trim().slice(0, 60), phone = String(b.phone || "").replace(/[^\d+ ]/g, "").trim().slice(0, 20);
  if (!name || phone.replace(/\D/g, "").length < 7) return cors({ error: "Please add your name and a phone number" }, 400);
  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "ip";
  const rk = "rl:" + today() + ":" + crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16), n = +((await st.get(rk)) || 0);
  if (n >= 5) return cors({ error: "Thanks, we already have your request. We'll be in touch soon." }, 429);
  await st.set(rk, String(n + 1));
  const items = await readCol(st, "leads"), last9 = phone.replace(/\D/g, "").slice(-9), now = Date.now();
  const page = String(b.page || "").slice(0, 120), note = [String(b.msg || "").trim().slice(0, 600), page && "Page: " + page].filter(Boolean).join("\n");
  const dup = items.find((x) => !["won", "lost"].includes(x.status) && String(x.phone || "").replace(/\D/g, "").slice(-9) === last9);
  if (dup) {
    dup.log = [...(dup.log || []), { t: now, by: "website", x: "Sent the website form again" + (note ? ": " + note.replace(/\n/g, " · ") : "") }].slice(-60);
    dup.follow = today(); dup.updatedAt = now; dup.updatedBy = "website";
  } else {
    items.unshift({ id: uid(), createdAt: now, createdBy: "website", updatedAt: now, updatedBy: "website", status: "new", source: "Website", follow: today(), owner: "",
      name, phone, email: String(b.email || "").trim().slice(0, 80), service: String(b.service || "").slice(0, 60), area: String(b.area || "").slice(0, 60), notes: note,
      log: [{ t: now, by: "website", x: "Lead from the website quote form" }] });
  }
  await writeCol(st, "leads", items);
  const k = "stats:" + today(), d = (await st.get(k, { type: "json" })) || { pv: 0, s: 0, nv: 0, ev: {}, pages: {}, src: {}, refs: {}, utm: {}, dev: {}, city: {}, conv: {} };
  d.ev.form = (d.ev.form || 0) + 1; bump(d.conv, page.split("?")[0] || "/"); d.last = now; await st.setJSON(k, d);
  return cors({ ok: true, wa: waLink(s.waNumber, `Hello Xtreme, I just sent a quote request on your website. My name is ${name}.`) });
}

/* ---------------- Keyword ideas from Google autocomplete (free, no key) ---------------- */
async function suggest(st, q, deep) {
  q = String(q || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
  if (!q) return [];
  const ck = "sugg:" + (deep ? "d:" : "") + q, c = await st.get(ck, { type: "json" });
  if (c && c.t > Date.now() - 7 * 864e5) return c.list;
  const one = async (x) => {
    try {
      const r = await fetchTimed(`https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=ae&q=${encodeURIComponent(x)}`, 5000);
      const j = JSON.parse(r.text); return Array.isArray(j[1]) ? j[1].map(String) : [];
    } catch { return []; }
  };
  const seeds = [q];
  if (deep) seeds.push(...["best ", "cheap ", "how much ", "near me "].map((p) => p + q), ...[..."abcdefghijklmnoprstuvwy"].map((l) => q + " " + l), q + " price", q + " near me");
  const out = [];
  for (let i = 0; i < seeds.length; i += 8) (await Promise.all(seeds.slice(i, i + 8).map(one))).forEach((l) => out.push(...l));
  const list = [...new Set(out.map((x) => x.toLowerCase().trim()))].filter((x) => x && x !== q).slice(0, 120);
  await st.setJSON(ck, { t: Date.now(), list });
  return list;
}

/* ---------------- Router ---------------- */
export default async (req, ctx) => {
  const st = store();
  const url = new URL(req.url);
  if (url.pathname.startsWith("/go/")) {
    const code = url.pathname.slice(4).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    try { return await track(st, code); } catch { return Response.redirect("https://www.xtreme-fmgroup.com", 302); }
  }
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const route0 = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const body = req.method === "POST" && route0 !== "t" && route0 !== "lead" ? await req.json().catch(() => ({})) : {};
  try {
    if (route === "ping") return json({ ok: true, server: true, app: "xtreme-marketing", version: VERSION });
    if ((route === "t" || route === "lead") && req.method === "OPTIONS") return cors(null, 204);
    if (route === "t" && req.method === "POST") return await hit(st, await settings(st), req, url, ctx);
    if (route === "lead" && req.method === "POST") return await webLead(st, await settings(st), req, url);

    if (route === "login" && req.method === "POST") {
      const name = String(body.username || "").trim().toLowerCase();
      const fk = "fail:" + (name || "-");
      const f = (await st.get(fk, { type: "json" })) || { n: 0, until: 0 };
      if (f.until > Date.now()) return json({ error: `Too many attempts. Try again in ${Math.ceil((f.until - Date.now()) / 60000)} min.` }, 429);
      const u = (await getUsers(st)).find((x) => x.active && x.username === name);
      if (!u || !safeEq(hashPw(body.password || "", u.salt), u.hash)) {
        f.n += 1; if (f.n >= MAX_FAILS) { f.n = 0; f.until = Date.now() + LOCK_MIN * 60e3; }
        await st.setJSON(fk, f);
        await new Promise((r) => setTimeout(r, 600));
        return json({ error: "Wrong username or password" }, 401);
      }
      await st.delete(fk);
      return json({ token: await makeToken(st, u, !!body.remember), user: cleanUser(u) });
    }

    const me = await auth(st, req);
    if (!me) return json({ error: "Please sign in again" }, 401);

    if (route === "me") { const s = await settings(st); return json({ user: cleanUser(me), settings: publicSettings(s, me.role === "admin", me), version: VERSION }); }

    if (route === "password" && req.method === "POST") {
      const users = await getUsers(st), u = users.find((x) => x.id === me.id);
      if (!safeEq(hashPw(body.current || "", u.salt), u.hash)) return json({ error: "Current password is wrong" }, 400);
      const e = validPw(body.password); if (e) return json({ error: e }, 400);
      if (body.username !== undefined && body.username !== u.username) {
        const n = String(body.username).trim().toLowerCase();
        if (!validName(n)) return json({ error: "Username: 3–30 small letters, numbers, dot, dash or underscore" }, 400);
        if (users.some((x) => x.id !== u.id && x.username === n)) return json({ error: "That username is taken" }, 400);
        u.username = n;
      }
      u.salt = crypto.randomBytes(16).toString("hex"); u.hash = hashPw(body.password, u.salt); u.mustChange = false; u.tv += 1;
      await st.setJSON("users", users);
      return json({ token: await makeToken(st, u, !!body.remember), user: cleanUser(u) });
    }

    if (route === "users") {
      if (me.role !== "admin") return json({ error: "Only an admin can manage users" }, 403);
      const users = await getUsers(st);
      if (req.method === "POST") {
        const act = body.action || "save";
        if (act === "delete" || act === "disable" || act === "enable") {
          const u = users.find((x) => x.id === +body.id);
          if (!u) return json({ error: "User not found" }, 404);
          if (u.id === me.id) return json({ error: "You can't change your own account here" }, 400);
          if (act !== "enable" && u.role === "admin" && users.filter((x) => x.role === "admin" && x.active && x.id !== u.id).length === 0) return json({ error: "Keep at least one active admin" }, 400);
          if (act === "delete") users.splice(users.indexOf(u), 1);
          else { u.active = act === "enable"; u.tv += 1; }
        } else {
          const n = String(body.username || "").trim().toLowerCase();
          if (!validName(n)) return json({ error: "Username: 3–30 small letters, numbers, dot, dash or underscore" }, 400);
          let u = body.id ? users.find((x) => x.id === +body.id) : null;
          if (u && u.id === me.id) return json({ error: "Use Change username / password for your own account" }, 400);
          if (users.some((x) => x !== u && x.username === n)) return json({ error: "That username is taken" }, 400);
          if (!u) {
            if (users.length >= MAX_USERS) return json({ error: `Maximum ${MAX_USERS} users reached` }, 400);
            if (!body.password) return json({ error: "Set a password for the new user" }, 400);
            u = { id: Math.max(0, ...users.map((x) => x.id)) + 1, username: n, salt: "", hash: "", role: "user", mustChange: true, active: true, tv: 1, perms: MODULES.slice(), pv3: true };
            users.push(u);
          }
          if (body.password) { const e = validPw(body.password); if (e) return json({ error: e }, 400); u.salt = crypto.randomBytes(16).toString("hex"); u.hash = hashPw(body.password, u.salt); if (u.id !== me.id) u.mustChange = true; u.tv += 1; }
          if (u.id !== me.id && (body.role === "admin" || body.role === "user")) {
            if (u.role === "admin" && body.role === "user" && users.filter((x) => x.role === "admin" && x.active && x.id !== u.id).length === 0) return json({ error: "Keep at least one active admin" }, 400);
            u.role = body.role;
          }
          if (u.id !== me.id && Array.isArray(body.perms)) { const p = body.perms.filter((m) => MODULES.includes(m)); if (u.role !== "admin" && !p.length) return json({ error: "Give the user at least one section" }, 400); u.perms = p; u.pv3 = true; u.tv += 1; }
          u.username = n;
        }
        await st.setJSON("users", users);
      }
      return json({ users: users.map(cleanUser), max: MAX_USERS, me: me.id, modules: MODULES });
    }

    /* settings */
    if (route === "settings") {
      const s = await settings(st);
      if (req.method === "POST") {
        if (me.role !== "admin") return json({ error: "Only an admin can change settings" }, 403);
        const clean = (v) => String(v == null ? "" : v).replace(/[\s​-‍﻿]+/g, "");
        for (const k of ["waNumber", "website", "reviewLink", "xtremeUrl"]) if (body[k] !== undefined) s[k] = String(body[k]).trim();
        s.waNumber = s.waNumber.replace(/\D/g, "");
        if (body.pexelsKey !== undefined && body.pexelsKey !== "") s.pexelsKey = clean(body.pexelsKey);
        if (body.psiKey !== undefined) s.psiKey = clean(body.psiKey);
        if (body.gscJson) {
          let j; try { j = typeof body.gscJson === "string" ? JSON.parse(body.gscJson) : body.gscJson; } catch { return json({ error: "That isn't a valid Google key file (JSON)" }, 400); }
          if (!j.client_email || !j.private_key) return json({ error: "The key file needs client_email and private_key. Download a JSON key for the service account." }, 400);
          s.gsc = { client_email: j.client_email, private_key: j.private_key }; await st.delete("gsc-token");
        }
        if (body.gscSite !== undefined) s.gscSite = String(body.gscSite).trim();
        if (body.clear === "gsc") { s.gsc = null; s.gscSite = ""; await st.delete("gsc-token"); }
        if (body.clear === "pexels") s.pexelsKey = "";
        if (Array.isArray(body.competitors)) {
          s.competitors = body.competitors.map((c) => String(c || "").trim()).filter(Boolean).slice(0, 5).map((c) => {
            try { return new URL(/^https?:/i.test(c) ? c : "https://" + c).origin; } catch { return null; }
          }).filter(Boolean);
        }
        if (body.goals && typeof body.goals === "object") {
          const g = { ...DEF_SETTINGS.goals, ...(s.goals || {}) };
          for (const k of Object.keys(DEF_SETTINGS.goals)) if (body.goals[k] !== undefined) g[k] = Math.max(0, Math.min(10000, Math.round(+body.goals[k] || 0)));
          s.goals = g;
        }
        delete s.claudeKey; delete s.claudeModel; // v2 stored an optional paid Claude key; v3 doesn't use it
        await st.setJSON("settings", s);
      }
      return json({ settings: publicSettings(s, me.role === "admin", me) });
    }
    if (route === "settings/test" && req.method === "POST") {
      if (me.role !== "admin") return json({ error: "Only an admin can do this" }, 403);
      const s = await settings(st);
      if (body.which === "pexels") {
        if (!s.pexelsKey) return json({ error: "Add the Pexels key first" }, 400);
        const r = await fetch("https://api.pexels.com/v1/search?per_page=1&query=cleaning", { headers: { Authorization: s.pexelsKey } });
        return r.ok ? json({ ok: true }) : json({ error: `Pexels rejected the key (${r.status}). Copy the full key again — it is about 56 characters.` }, 400);
      }
      return json({ error: "Unknown test" }, 400);
    }

    /* shared data */
    const dm = /^data\/([a-z]+)$/.exec(route);
    if (dm) {
      const name = dm[1], rule = COLS[name];
      if (!rule) return json({ error: "Unknown list" }, 404);
      if (!canAny(me, rule.read)) return json({ error: "You don't have access to this section" }, 403);
      let items = await readCol(st, name);
      if (req.method === "POST") {
        if (!canAny(me, rule.write)) return json({ error: "You can view this list but not change it" }, 403);
        const ops = Array.isArray(body.ops) ? body.ops : [body];
        for (const op of ops.slice(0, 200)) {
          if (op.op === "del") { items = items.filter((x) => x.id !== op.id); if (name === "designs") await st.delete("design:" + op.id); continue; }
          if (op.op !== "put" || !op.item || typeof op.item !== "object") continue;
          const it = { ...op.item };
          if (JSON.stringify(it).length > 60000) return json({ error: "That item is too large" }, 400);
          if (!it.id) { it.id = uid(); it.createdAt = Date.now(); it.createdBy = me.username; }
          it.updatedAt = Date.now(); it.updatedBy = me.username;
          if (name === "campaigns") {
            it.code = String(it.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
            if (!it.code) it.code = "X" + crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
            if (items.some((x) => x.id !== it.id && x.code === it.code)) return json({ error: `Code ${it.code} is already used by another campaign` }, 400);
          }
          const i = items.findIndex((x) => x.id === it.id);
          if (i >= 0) items[i] = { ...items[i], ...it }; else items.unshift(it);
        }
        await writeCol(st, name, items);
      }
      if (name === "campaigns") items = await Promise.all(items.map(async (c) => ({ ...c, scans: await scansOf(st, c.code) })));
      return json({ items });
    }

    /* full design (with photos) */
    const ds = /^design\/([a-z0-9]+)$/.exec(route);
    if (ds) {
      if (!canAny(me, COLS.designs.read)) return json({ error: "You don't have access to this section" }, 403);
      const d = await st.get("design:" + ds[1], { type: "json" });
      return d ? json({ design: d }) : json({ error: "Design not found" }, 404);
    }
    if (route === "design" && req.method === "POST") {
      if (!can(me, "studio")) return json({ error: "You don't have access to the Studio" }, 403);
      const d = body.design, meta = body.meta;
      if (!d || !meta) return json({ error: "Nothing to save" }, 400);
      const size = JSON.stringify(d).length;
      if (size > 4_500_000) return json({ error: "The photos in this design are too large to save. Use fewer or smaller photos." }, 400);
      if ((meta.thumb || "").length > 80000) return json({ error: "Preview too large" }, 400);
      const items = await readCol(st, "designs");
      const id = meta.id && /^[a-z0-9]+$/.test(meta.id) ? meta.id : uid();
      const m = { ...meta, id, updatedAt: Date.now(), updatedBy: me.username };
      const i = items.findIndex((x) => x.id === id);
      if (i >= 0) items[i] = { ...items[i], ...m }; else items.unshift({ ...m, createdAt: Date.now(), createdBy: me.username });
      await st.setJSON("design:" + id, d);
      await writeCol(st, "designs", items);
      return json({ ok: true, id });
    }

    /* Pexels */
    if (route === "pexels") {
      if (!canAny(me, ["studio", "planner"])) return json({ error: "You don't have access to the Studio" }, 403);
      const s = await settings(st);
      if (!s.pexelsKey) return json({ error: me.role === "admin" ? "Add your Pexels key in Settings › Connections" : "Stock photos aren't set up yet. Ask the admin." }, 400);
      const q = String(url.searchParams.get("q") || "cleaning").slice(0, 80), page = Math.max(1, Math.min(20, +url.searchParams.get("page") || 1));
      const orient = ["portrait", "landscape", "square"].includes(url.searchParams.get("o")) ? url.searchParams.get("o") : "";
      const r = await fetch(`https://api.pexels.com/v1/search?per_page=24&page=${page}&query=${encodeURIComponent(q)}${orient ? "&orientation=" + orient : ""}`, { headers: { Authorization: s.pexelsKey } });
      if (!r.ok) return json({ error: `Pexels error ${r.status}. The admin may need to re-enter the key.` }, 400);
      const d = await r.json();
      return json({ photos: (d.photos || []).map((p) => ({ id: p.id, w: p.width, h: p.height, thumb: p.src.medium, full: p.src.large2x, by: p.photographer, alt: p.alt || "" })), next: !!d.next_page });
    }
    if (route === "photo") {
      const u = String(url.searchParams.get("u") || "");
      let host = ""; try { host = new URL(u).hostname; } catch {}
      if (host !== "images.pexels.com") return json({ error: "Only Pexels photos can be loaded" }, 400);
      const r = await fetch(u);
      if (!r.ok) return json({ error: "Photo not available" }, 400);
      return new Response(await r.arrayBuffer(), { headers: { "content-type": r.headers.get("content-type") || "image/jpeg", "cache-control": "private, max-age=86400" } });
    }


    /* website visitors */
    if (route === "stats") {
      if (!canAny(me, ["seo", "grow"])) return json({ error: "You don't have access to website stats" }, 403);
      const days = [7, 28, 90].includes(+url.searchParams.get("days")) ? +url.searchParams.get("days") : 28;
      return json(await statsFor(st, days));
    }

    /* SEO */
    if (route.startsWith("seo/")) {
      if (!canAny(me, ["seo", "grow"])) return json({ error: "You don't have access to SEO" }, 403);
      const s = await settings(st);
      if (route === "seo/sites") {
        if (me.role !== "admin") return json({ error: "Only an admin can do this" }, 403);
        if (!s.gsc) return json({ error: "Upload the Google key file first" }, 400);
        const d = await gsc(st, { ...s, gscSite: s.gscSite || "?" }, "sites");
        return json({ sites: (d.siteEntry || []).map((x) => ({ url: x.siteUrl, level: x.permissionLevel })), email: s.gsc.client_email });
      }
      if (route === "seo/gsc") {
        if (!s.gsc || !s.gscSite) return json({ error: "not-connected" }, 400);
        const days = [7, 28, 90].includes(+url.searchParams.get("days")) ? +url.searchParams.get("days") : 28;
        const words = (await readCol(st, "keywords")).map((k) => k.text).filter(Boolean);
        return json(await gscSummary(st, s, days, words));
      }
      if (route === "seo/site") {
        const base = (/^https?:/i.test(s.website) ? s.website : "https://" + s.website).replace(/\/+$/, "");
        const origin = new URL(base).origin;
        const [home, robots] = await Promise.all([fetchTimed(base + "/", 8000).catch((e) => ({ ok: false, status: 0, text: "", ms: 0, err: e.message })), fetchTimed(origin + "/robots.txt", 5000).catch(() => ({ ok: false, text: "" }))]);
        const smUrls = robots.ok ? [...robots.text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]) : [];
        if (!smUrls.length) smUrls.push(origin + "/sitemap.xml");
        let pages = [], sitemapOk = false;
        for (const sm of smUrls.slice(0, 2)) {
          const r = await fetchTimed(sm, 6000).catch(() => null); if (!r || !r.ok) continue; sitemapOk = true;
          let locs = [...r.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));
          if (/<sitemapindex/i.test(r.text)) { const subs = await Promise.all(locs.slice(0, 4).map((u) => fetchTimed(u, 5000).catch(() => null))); locs = subs.flatMap((x) => (x && x.ok ? [...x.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&")) : [])); }
          pages.push(...locs);
        }
        pages = [...new Set([home.url || base + "/", ...pages])].filter((u) => hostOk(s, u) && !/\.(jpg|jpeg|png|gif|webp|pdf|xml)$/i.test(u)).slice(0, 40);
        return json({ base, homeOk: home.ok, homeMs: home.ms, robots: robots.ok ? robots.text.slice(0, 1500) : null, blocksAll: robots.ok && /^\s*disallow:\s*\/\s*$/im.test(robots.text), sitemaps: smUrls, sitemapOk, pages });
      }
      if (route === "seo/suggest") return json({ list: await suggest(st, url.searchParams.get("q"), url.searchParams.get("deep") === "1") });
      if (route === "seo/page") {
        const u = String(url.searchParams.get("url") || "");
        if (!hostOk(s, u) && !rivalOk(s, u)) return json({ error: "Only pages on your own website or a saved competitor can be scanned" }, 400);
        let res; try { res = await fetchTimed(u, 8000); } catch (e) { return json({ url: u, error: e.name === "AbortError" ? "Timed out after 8 seconds" : e.message, score: 0, checks: [] }); }
        return json(analyse(res.text, u, res));
      }
      return json({ error: "Not found" }, 404);
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: e.message || "Server error" }, 500);
  }
};
