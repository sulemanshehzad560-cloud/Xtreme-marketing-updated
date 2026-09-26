// Lets the real server code import "@netlify/blobs" while running locally.
import { register } from "node:module";
register("data:text/javascript," + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if (spec === "@netlify/blobs") return { url: new URL("./mock-blobs.mjs", ${JSON.stringify(import.meta.url)}).href, shortCircuit: true };
  return next(spec, ctx);
}`));
