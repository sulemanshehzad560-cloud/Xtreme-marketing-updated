// End-to-end test of Xtreme Marketing v3 against the real server code (storage and Google are faked).
// Run: node test/e2e.mjs   (needs Playwright + Chromium)
import fs0 from "node:fs";
const { chromium } = await import("playwright").catch(() => import(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright/index.mjs"));
const EXE = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((x) => fs0.existsSync(x));
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), ".."), APP = 8893, SITE = 8894, A = "http://127.0.0.1:" + APP, W = "http://127.0.0.1:" + SITE;
const OUT = process.env.OUT || "/tmp";
let pass = 0, fail = 0; const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? "  ✓ " : "  ✗ ") + m); };
// the fake company website, on a different origin from the app
const site = http.createServer((q, r) => {
  const p = q.url.split("?")[0];
  if (p === "/robots.txt") { r.writeHead(200, { "content-type": "text/plain" }); return r.end("User-agent: *\nAllow: /\nSitemap: " + W + "/sitemap.xml"); }
  if (p === "/sitemap.xml") { r.writeHead(200, { "content-type": "application/xml" }); return r.end(`<urlset><url><loc>${W}/</loc></url><url><loc>${W}/about.html</loc></url></urlset>`); }
  const html = fs.readFileSync(path.join(ROOT, "test/site/index.html"), "utf8").replace("__APP__", A);
  r.writeHead(200, { "content-type": "text/html" }); r.end(p === "/about.html" ? html.replace("<h1>", "<h1>About ").replace(/<h2>.*?<\/h2>/g, "") : html);
}).listen(SITE);
const srv = spawn(process.execPath, ["--import", "./test/register.mjs", "--import", "./test/stub-fetch.mjs", "test/dev-server.mjs", String(APP)], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
let log = ""; srv.stdout.on("data", (d) => (log += d)); srv.stderr.on("data", (d) => (log += d));
await new Promise((r) => setTimeout(r, 1500));
const b = await chromium.launch(EXE ? { executablePath: EXE } : {});
// a normal phone browser identity: the tracker ignores "headless" browsers as bots
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36" });
const errs = []; ctx.on("page", (pg) => pg.on("pageerror", (e) => errs.push(e.message)));
const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
const api = (path, body) => p.evaluate(([path, body]) => api(path, body), [path, body]);
try {
  console.log("Sign-in");
  await p.goto(A); await p.waitForSelector("#g-login:not([hidden])");
  await p.fill("#g-user", "admin"); await p.fill("#g-pw", "admin"); await p.click("#g-go");
  await p.waitForSelector("#g-change:not([hidden])"); ok(true, "first sign-in asks to change the admin password");
  await p.fill("#gc-user", "boss"); await p.fill("#gc-cur", "admin"); await p.fill("#gc-pw", "secret123"); await p.fill("#gc-pw2", "secret123"); await p.click("#gc-go");
  await p.waitForSelector(".tiles .tile"); ok(await p.waitForSelector("#h-grow-w .gauge", { timeout: 8000 }).then(() => true, () => false), "home shows the growth score");
  const s0 = await api("me"); ok(!("claude" in s0.settings) && !("claudeKeyMasked" in s0.settings), "no paid Claude API settings are exposed");
  await api("settings", { website: W, reviewLink: "https://g.page/r/xtreme-test/review", competitors: ["rival.test"] });
  await p.evaluate(() => refreshMe());

  console.log("Website snippet on the company site");
  const w = await ctx.newPage(); await w.goto(W + "/?utm_source=instagram&utm_medium=social&utm_campaign=eid-offer");
  await w.waitForSelector("[data-xtreme]", { state: "attached" }); ok(await w.locator("[data-xtreme] #q").isVisible(), "snippet loads on another website and adds its buttons");
  await w.evaluate(() => { document.getElementById("wa").addEventListener("click", (e) => e.preventDefault()); });
  await w.click("#wa"); await w.goto(W + "/about.html"); await w.waitForTimeout(300);
  const host = w.locator("[data-xtreme]");
  await host.locator("#q").click(); await w.waitForTimeout(2700);
  await host.locator("#n").fill("Fatima Test"); await host.locator("#ph").fill("050 111 2233"); await host.locator("#ar").fill("Al Reem Island");
  await host.locator("#go").click(); await host.locator(".done").waitFor({ timeout: 5000 });
  ok(/Thank you, Fatima Test/.test(await host.locator(".done").innerText()), "quote form sends and thanks the customer");
  await w.screenshot({ path: OUT + "/e2e-site.png" });
  const bot = await fetch(A + "/api/lead", { method: "POST", headers: { origin: W }, body: JSON.stringify({ name: "Bot", phone: "0501234567", hp: "spam", t: 9000 }) });
  ok(bot.ok, "honeypot bot submission is silently accepted");
  const bad = await fetch(A + "/api/t", { method: "POST", headers: { origin: "https://evil.example" }, body: JSON.stringify({ p: "/" }) });
  ok(bad.status === 403, "visits from other websites are refused");

  console.log("Visitors and leads in the app");
  await p.evaluate(() => { MOD.seo.tab("visitors"); go("seo"); }); await p.waitForSelector("#se-body .kpi", { timeout: 8000 });
  const kp = await p.locator("#se-body .kpi b").allInnerTexts();
  ok(+kp[0] === 1 && +kp[1] === 2, `1 visitor, 2 page views counted (got ${kp[0]}, ${kp[1]})`);
  ok(+kp[2] === 2, `WhatsApp click + quote form counted as 2 enquiries (got ${kp[2]})`);
  ok(/Instagram/.test(await p.locator("#se-body").innerText()), "visit is credited to Instagram from its UTM tag");
  await p.screenshot({ path: OUT + "/e2e-visitors.png", fullPage: true });
  const leads = (await api("data/leads")).items;
  ok(leads.length === 1 && leads[0].name === "Fatima Test" && leads[0].source === "Website" && leads[0].area === "Al Reem Island", "website request became a lead (bot request did not)");

  console.log("Keywords, competitors and site health");
  await p.evaluate(() => { MOD.seo.tab("keywords"); go("seo"); }); await p.waitForSelector("#id-go");
  await p.click("#id-go"); await p.waitForSelector("[data-idea]"); ok((await p.locator("[data-idea]").count()) > 5, "Google keyword ideas are listed");
  await p.evaluate(() => { MOD.seo.tab("rivals"); go("seo"); }); await p.waitForSelector("#rv-go"); await p.click("#rv-go");
  await p.waitForSelector("#se-body table tbody tr:nth-child(2)"); ok(/rival\.test/.test(await p.locator("#se-body table").innerText()), "competitor homepage compared with yours");
  await p.evaluate(() => { MOD.seo.tab("health"); go("seo"); }); await p.click("#se-scan");
  await p.waitForFunction(() => /2 pages scanned/.test(document.body.innerText), null, { timeout: 20000 }); ok(true, "site scan reads the sitemap and scores both pages");
  const denied = await api("seo/page?url=" + encodeURIComponent("https://example.org/")).then(() => false, () => true);
  ok(denied, "scanning a random website is refused");

  console.log("Grow");
  await p.evaluate(() => { MOD.grow.tab("listings"); go("grow"); }); await p.waitForSelector('[data-ls="gbp"]');
  await p.click('[data-ls="gbp"]'); await p.waitForTimeout(400); await p.click('[data-ls="gbp"]'); await p.waitForTimeout(400);
  ok(/Live/.test(await p.locator('[data-ls="gbp"]').innerText()), "listing status moves Not started › Submitted › Live");
  await p.evaluate(() => { MOD.grow.tab("reviews"); go("grow"); }); await p.waitForSelector("#rv-s");
  await p.fill("#rv-r", "4.8"); await p.fill("#rv-c", "57"); await p.click("#rv-s"); await p.waitForTimeout(500);
  const rk = await p.locator("#p-grow .kpi b").first().innerText(); ok(/4\.8/.test(rk), "Google rating logged (" + rk + ", " + JSON.stringify((await api("data/reviews")).items) + ")"); ok(await p.isVisible("#rv-qr"), "review QR code shown");
  await p.evaluate(() => { MOD.grow.tab("pages"); go("grow"); }); await p.waitForSelector("#lp-s");
  const txt = await p.locator(".out pre").first().innerText();
  ok(/Deep cleaning in Al Reem Island/.test(txt) && /From AED/.test(txt), "landing page written for service + area with prices");
  ok(/FAQPage/.test(await p.locator("pre.code-box").innerText()), "landing page includes Google FAQ code");
  await p.click("#lp-sv"); await p.waitForSelector("[data-lpub]"); await p.click("[data-lpub]"); await p.waitForTimeout(400);
  ok(/Published/.test(await p.locator("[data-lpub]").innerText()), "landing page saved and marked published");
  await p.evaluate(() => { MOD.grow.tab("score"); go("grow"); }); await p.waitForSelector(".score-parts");
  const sc = +(await p.locator("#p-grow .score-hero .gauge b").innerText()); ok(sc > 6, "growth score rises as work is done (now " + sc + ")");
  await p.screenshot({ path: OUT + "/e2e-grow.png", fullPage: true });
  const [rep] = await Promise.all([ctx.waitForEvent("page"), p.click("#gr-rep")]);
  await rep.waitForFunction(() => /Marketing report/.test(document.body.innerText), null, { timeout: 8000 });
  const rt = await rep.innerText("body"); ok(/Marketing report/.test(rt) && /\b1\s+visitors/.test(rt.replace(/\n/g, " ")), "monthly report opens with this month's numbers, including website visitors");
  await rep.screenshot({ path: OUT + "/e2e-report.png", fullPage: true });

  console.log("Existing sections still work");
  for (const k of ["studio", "planner", "leads", "campaigns", "writer"]) { await p.evaluate((k) => go(k), k); await p.waitForTimeout(700); ok((await p.locator("#p-" + k).innerText()).length > 40, k + " opens"); }
  await p.evaluate(() => go("studio")); await p.click('[data-new="offer"]'); await p.waitForTimeout(1200);
  const drawn = await p.evaluate(() => { const c = document.getElementById("st-cv"); const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 400) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return c.width > 100 && n > 20; });
  ok(drawn, "design studio draws a design"); await p.screenshot({ path: OUT + "/e2e-studio.png" });
  await p.evaluate(() => go("writer")); await p.click("#w-go"); await p.waitForSelector(".out pre"); ok(true, "free quick write makes captions");
  const noAi = await fetch(A + "/api/ai", { method: "POST", headers: { authorization: "Bearer " + (await p.evaluate(() => token())) }, body: "{}" });
  ok(noAi.status === 404, "paid AI endpoint is gone");
  ok(!errs.length, "no JavaScript errors" + (errs.length ? ": " + errs.join(" | ") : ""));
} catch (e) { fail++; console.log("  ✗ crashed: " + e.message); await p.screenshot({ path: OUT + "/e2e-crash.png", fullPage: true }).catch(() => {}); }
await b.close(); srv.kill(); site.close();
console.log(`\n${pass} passed, ${fail} failed`); if (fail) { console.log(log.slice(-2000)); process.exit(1); }
