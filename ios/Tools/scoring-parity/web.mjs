// Prints the website checker's analysis as JSON, for comparison with the app.
import { readFileSync } from "node:fs";
import { analyzeResumePreview } from "../../../web/lib/resume-preview.ts";
const [resume, job] = process.argv.slice(2).map((p) => readFileSync(p, "utf8"));
const r = analyzeResumePreview(resume, job);
// The browser hides the total under 5 terms; compare the number the app would show.
const keys = ["bulletsWithoutImpact","formattingQuality","formattingWarnings","impactQuality","jdKeywords","keywordCoverage","matchedKeywords","missingKeywords","partialMatches","score","sections","structureQuality","weakBullets","wordCount"];
const out = Object.fromEntries(keys.map((k) => [k, k === "sections" ? Object.fromEntries(Object.entries(r.sections).sort()) : r[k]]));
console.log(JSON.stringify(out));
