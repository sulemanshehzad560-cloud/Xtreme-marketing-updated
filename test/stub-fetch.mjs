// Test-only: fake answers for Google autocomplete and the competitor site (no internet in tests).
const real = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  const url = new URL(typeof u === "string" ? u : u.url);
  if (url.hostname === "suggestqueries.google.com") {
    const q = url.searchParams.get("q");
    return new Response(JSON.stringify([q, [q + " price", q + " near me", q + " company", "best " + q]]), { headers: { "content-type": "application/json" } });
  }
  if (url.hostname === "rival.test") {
    return new Response(`<!doctype html><html lang="en"><head><title>Rival Cleaning Abu Dhabi | Deep cleaning experts</title><meta name="description" content="Rival cleaning company in Abu Dhabi offering deep cleaning, maid service and more for villas."><meta name="viewport" content="width=device-width"><link rel="canonical" href="https://rival.test/"><script type="application/ld+json">{"@type":"LocalBusiness","name":"Rival"}</script></head><body><h1>Cleaning in Abu Dhabi</h1><h2>A</h2><h2>B</h2><p>${"word ".repeat(700)}</p></body></html>`, { headers: { "content-type": "text/html" } });
  }
  return real(u, o);
};
