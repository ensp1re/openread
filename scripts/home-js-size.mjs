// Prints the gzip size of the JavaScript the home page loads, from a production build served on PORT.
import { gzipSync } from "node:zlib";
const base = `http://localhost:${process.env.PORT ?? 3260}`;
const html = await (await fetch(`${base}/`)).text();
const srcs = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js[^"]*)"/g)].map((m) => m[1]))];
let raw = 0, gz = 0;
for (const src of srcs) {
  const buf = Buffer.from(await (await fetch(new URL(src, base))).arrayBuffer());
  raw += buf.length;
  gz += gzipSync(buf).length;
}
console.log(JSON.stringify({ scripts: srcs.length, rawKB: +(raw / 1024).toFixed(1), gzipKB: +(gz / 1024).toFixed(1) }));
