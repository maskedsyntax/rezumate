// Prints the website's parsed document as JSON, for comparison with the app.
import { readFileSync } from "node:fs";
import { parseResume } from "../../../web/lib/core/resume-parser.ts";
const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;
console.log(JSON.stringify(sortKeys(parseResume(readFileSync(process.argv[2], "utf8")))));
