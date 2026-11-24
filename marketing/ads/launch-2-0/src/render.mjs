// Render src/index.html to video by seeking its timeline frame by frame.
// Usage:
//   node render.mjs stills 1.0 5.2 9.8 ... -> out/stills/t-<sec>.png
//   node render.mjs video out/video.mp4    -> silent H.264 at 30fps
// Needs playwright-core (PW_PATH env points at its folder) and a Chromium build (CHROME env).
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(process.env.PW_PATH || here, "package.json"));
const { chromium } = require("playwright-core");

const W = +(process.env.W || 1080), H = +(process.env.H || 1350);
const [mode, ...args] = process.argv.slice(2);

const browser = await chromium.launch({ executablePath: process.env.CHROME });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(resolve(here, "index.html")).href + (process.env.FMT ? `?f=${process.env.FMT}` : ""));
await page.evaluate(() => window.ready);
const { DUR, FPS } = await page.evaluate(() => ({ DUR: window.DUR, FPS: window.FPS }));

if (mode === "stills") {
  const out = resolve(here, "../out/stills");
  mkdirSync(out, { recursive: true });
  for (const s of args) {
    await page.evaluate((t) => window.render(t), +s);
    await page.screenshot({ path: `${out}/t-${(+s).toFixed(2)}.png` });
  }
} else {
  const outFile = resolve(args[0] || resolve(here, "../out/video.mp4"));
  mkdirSync(dirname(outFile), { recursive: true });
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outFile], { stdio: ["pipe", "inherit", "inherit"] });
  const total = Math.round(DUR * FPS);
  for (let f = 0; f < total; f++) {
    await page.evaluate((t) => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 60 === 0) process.stdout.write(`frame ${f}/${total}\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
}
await browser.close();
