// Turbopack ignores pdf.js's own worker import (vercel/next.js#65406), so the worker is served
// from /public instead. Runs on install; the copy is gitignored and must match the installed version.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
try {
  const pdfjs = dirname(require.resolve("pdfjs-dist/package.json"));
  mkdirSync("public", { recursive: true });
  copyFileSync(join(pdfjs, "build/pdf.worker.min.mjs"), "public/pdf.worker.min.mjs");
  console.log("copied pdf.worker.min.mjs to public/");
} catch (error) {
  console.warn("pdf worker not copied:", error.message);
}
