// Fails when the home page's JavaScript grows past the budget: the file parsers must stay lazy.
// Builds, serves, measures, and compares with docs/home-js-budget.json.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const { baselineGzipKB, allowedGrowthKB } = JSON.parse(readFileSync("docs/home-js-budget.json", "utf8"));
const port = process.env.PORT ?? 3299;
const distDir = process.env.NEXT_DIST_DIR ?? ".next-check";

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, NEXT_DIST_DIR: distDir } });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });

await run("pnpm", ["build"]);
const server = spawn("pnpm", ["start", "--port", String(port)], { env: { ...process.env, NEXT_DIST_DIR: distDir } });
try {
  for (let i = 0; i < 40; i++) {
    try {
      await fetch(`http://localhost:${port}/`);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  const html = await (await fetch(`http://localhost:${port}/`)).text();
  const srcs = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)].map((m) => m[1]))];
  let gz = 0;
  for (const src of srcs) {
    gz += gzipSync(Buffer.from(await (await fetch(new URL(src, `http://localhost:${port}`))).arrayBuffer())).length;
  }
  const gzipKB = +(gz / 1024).toFixed(1);
  const growth = +(gzipKB - baselineGzipKB).toFixed(1);
  console.log(`home page JavaScript: ${gzipKB} KB gzip (${growth >= 0 ? "+" : ""}${growth} KB vs baseline ${baselineGzipKB} KB)`);
  if (growth > allowedGrowthKB) throw new Error(`grew ${growth} KB, more than the ${allowedGrowthKB} KB allowed: keep the parsers lazy`);
} finally {
  server.kill();
}
