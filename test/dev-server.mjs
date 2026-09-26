// Local stand-in for Netlify: serves public/ and runs netlify/functions/api.mjs.
// Run: node --import ./test/register.mjs test/dev-server.mjs [port]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { default: handler } = await import(path.join(ROOT, "netlify/functions/api.mjs"));
const PORT = +process.argv[2] || 8888;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  if (u.pathname.startsWith("/api/") || u.pathname.startsWith("/go/")) {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const r = await handler(new Request(u, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body }),
      { ip: req.socket.remoteAddress, geo: { city: "Abu Dhabi", country: { code: "AE", name: "United Arab Emirates" } } });
    res.writeHead(r.status, Object.fromEntries(r.headers)); return res.end(Buffer.from(await r.arrayBuffer()));
  }
  let f = u.pathname === "/" ? "/index.html" : u.pathname;
  if (f === "/.well-known/assetlinks.json") f = "/assetlinks.json";
  const fp = path.join(ROOT, "public", path.normalize(f));
  if (!fp.startsWith(path.join(ROOT, "public")) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "content-type": TYPES[path.extname(fp)] || "application/octet-stream", "access-control-allow-origin": "*" }); fs.createReadStream(fp).pipe(res);
}).listen(PORT, () => console.log("Xtreme Marketing dev server on http://127.0.0.1:" + PORT));
