// Runs the bundled parse worker from a production build (NEXT_DIST_DIR, default .next-check):
// a normal page must parse, a pathological page must hit the time limit while the main thread stays free.
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { Worker } from "node:worker_threads";

const dir = resolve(process.env.NEXT_DIST_DIR || ".next-check", "server/chunks/ssr");
const entry = readdirSync(dir).find((f) => f.includes("parse-worker") && f.endsWith(".js"));
if (!entry) throw new Error(`no parse-worker chunk in ${dir}; build first`);
const LIMIT = 8000;

function run(html) {
  return new Promise((done) => {
    const t0 = Date.now();
    let ticks = 0;
    const tick = setInterval(() => ticks++, 100);
    const w = new Worker(join(dir, entry), { workerData: { html, url: "https://example.com/a", options: {} } });
    const end = (r) => { clearInterval(tick); clearTimeout(timer); w.terminate(); done({ ...r, ms: Date.now() - t0, ticks }); };
    const timer = setTimeout(() => end({ timedOut: true }), LIMIT);
    w.once("message", (article) => end({ article }));
    w.once("error", (e) => end({ error: e.message }));
  });
}

const p = `<p>${"A normal paragraph with enough words to be prose. ".repeat(20)}</p>`;
const normal = await run(`<html><head><title>Normal</title></head><body><article>${p.repeat(40)}</article></body></html>`);
const evil = await run(`<html><head><title>Evil</title></head><body>${"<a><div>x".repeat(12500)}</body></html>`);
console.log({ normal: { ms: normal.ms, title: normal.article?.title }, evil: { ms: evil.ms, timedOut: evil.timedOut, ticks: evil.ticks } });
if (normal.article?.title !== "Normal" || normal.ms > 3000) throw new Error("normal page did not parse quickly");
if (!evil.timedOut || evil.ticks < (LIMIT / 100) * 0.8) throw new Error("pathological page was not contained by the worker");
console.log("parse worker ok");
