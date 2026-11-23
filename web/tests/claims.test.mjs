import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

// Claims that became false or stale with Rezumate 2.0 (subscription Pro + AI).
// See marketing/CLAIMS.md. The terms page may still mention earlier Lifetime purchases.
const banned = [/14\.99/, /100% local/i, /no cloud (resume )?upload/i, /never leaves/i, /lifetime pro unlock/i, /pay once/i, /no server connection/i];
const allowed = new Set(["app/(marketing)/terms/page.tsx"]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(tsx?|css)$/.test(name) ? [path] : [];
  });
}

test("site copy has no outdated 2.0 claims", () => {
  const root = new URL("..", import.meta.url).pathname;
  const offenders = [];
  for (const file of [...walk(join(root, "app")), ...walk(join(root, "lib"))]) {
    const rel = relative(root, file);
    if (allowed.has(rel)) continue;
    const text = readFileSync(file, "utf8");
    for (const pattern of banned) {
      if (pattern.test(text)) offenders.push(`${rel}: ${pattern}`);
    }
  }
  assert.deepEqual(offenders, []);
});
