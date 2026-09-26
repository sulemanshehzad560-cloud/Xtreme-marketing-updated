// Screenshots of every section (phone + desktop). Run with the dev server up: node test/shots.mjs <port> <outdir> [tag]
import fs0 from "node:fs";
const { chromium } = await import("playwright").catch(() => import(process.env.PLAYWRIGHT_PATH || "/opt/node22/lib/node_modules/playwright/index.mjs"));
const EXE = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((x) => fs0.existsSync(x));
const [port, out, tag = "v"] = process.argv.slice(2), BASE = "http://127.0.0.1:" + port;
const b = await chromium.launch(EXE ? { executablePath: EXE } : {});
const errs = [];
async function run(vp, name) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: 1 });
  p.on("pageerror", (e) => errs.push(name + ": " + e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/fonts\.g|net::ERR|Failed to load resource/.test(m.text())) errs.push(name + " console: " + m.text()); });
  await p.goto(BASE); await p.waitForSelector("#g-login:not([hidden]), #g-change:not([hidden]), .tiles .tile", { timeout: 15000 });
  if (await p.isVisible("#g-login")) { await p.fill("#g-user", "boss"); await p.fill("#g-pw", "secret123"); await p.click("#g-go"); await p.waitForTimeout(800); }
  if (await p.isVisible("#g-login")) { await p.fill("#g-user", "admin"); await p.fill("#g-pw", "admin"); await p.click("#g-go"); await p.waitForSelector("#g-change:not([hidden])");
    await p.fill("#gc-user", "boss"); await p.fill("#gc-cur", "admin"); await p.fill("#gc-pw", "secret123"); await p.fill("#gc-pw2", "secret123"); await p.click("#gc-go"); }
  await p.waitForSelector(".tiles .tile"); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/${tag}-${name}-home.png`, fullPage: true });
  const tabs = await p.$$eval(".tabs .tab:not([hidden])", (t) => t.map((x) => x.id));
  for (const id of tabs.slice(1)) { await p.evaluate((k) => go(k), id.slice(2)); await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/${tag}-${name}-${id.slice(2)}.png`, fullPage: true }); }
  await p.close();
}
await run({ width: 390, height: 844 }, "phone");
await run({ width: 1366, height: 860 }, "desk");
await b.close();
console.log(errs.length ? "ERRORS:\n" + errs.join("\n") : "no page errors");
