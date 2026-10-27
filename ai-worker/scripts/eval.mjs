// Runs every AI task on the sample resumes in scripts/samples against real OpenAI, through a
// local `wrangler dev`, and writes the outputs plus token usage and cost to eval-output/.
//
//   npm run eval
//   npm run eval -- --writing-model gpt-6-astra --writing-effort medium
//
// Needs OPENAI_API_KEY in .dev.vars. Uses the local D1 database, never production.

import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

// USD per 1M tokens (input, output). Reasoning tokens are billed as output.
const PRICES = {
  "gpt-6-astra": [10, 50],
  "gpt-6.1-sol": [2, 10],
  "gpt-6-luna": [0.1, 0.5],
};

const PORT = 8799;
const BASE = `http://localhost:${PORT}`;
const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith("--") ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);

const vars = {
  DEVICECHECK_MODE: "off",
  TRIAL_ACTIONS: "1000",
  DAILY_REQUEST_LIMIT: "1000",
  ...(args["writing-model"] && { OPENAI_WRITING_MODEL: args["writing-model"] }),
  ...(args["writing-effort"] && { OPENAI_WRITING_EFFORT: args["writing-effort"] }),
  ...(args["extract-model"] && { OPENAI_EXTRACT_MODEL: args["extract-model"] }),
  ...(args["extract-effort"] && { OPENAI_EXTRACT_EFFORT: args["extract-effort"] }),
};

const logs = [];
const dev = spawn(
  "npx",
  ["wrangler", "dev", "--port", String(PORT), ...Object.entries(vars).flatMap(([k, v]) => ["--var", `${k}:${v}`])],
  { stdio: ["ignore", "pipe", "pipe"] },
);
const ready = new Promise((resolve, reject) => {
  const onData = (chunk) => {
    // Wrangler colors its log lines, so strip the escape codes before parsing.
    for (const line of chunk.toString().replace(/\x1b\[[0-9;]*m/g, "").split("\n")) {
      const json = line.slice(line.indexOf("{"));
      if (line.includes('"message":"ai task"') || line.includes('"message":"openai')) {
        try {
          logs.push(JSON.parse(json));
        } catch {}
      }
      if (line.includes("Ready on")) resolve();
    }
  };
  dev.stdout.on("data", onData);
  dev.stderr.on("data", onData);
  dev.on("exit", (code) => reject(new Error(`wrangler dev exited (${code})`)));
});

async function post(path, body, token) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  return { status: response.status, json };
}

function cost(entry) {
  const [input, output] = PRICES[entry.model] ?? [0, 0];
  return (entry.usage.input * input + entry.usage.output * output) / 1e6;
}

const report = [];
const write = (line = "") => report.push(line);

try {
  await ready;
  const { json: session } = await post("/v1/session", { installId: randomUUID() });
  const token = session.token;

  const samplesDir = new URL("./samples/", import.meta.url).pathname;
  for (const file of readdirSync(samplesDir).filter((f) => f.endsWith(".json"))) {
    const sample = JSON.parse(readFileSync(join(samplesDir, file), "utf8"));
    const jobDescription = sample.jobDescription.slice(0, 4000);
    write(`## ${sample.name}`);

    for (const bullet of sample.rewriteBullets) {
      const run = await post("/v1/ai/rewrite-bullet", { bullet, jobTitle: sample.jobTitle, jobDescription, allowedKeywords: [], resumeExcerpt: sample.resume }, token);
      write(`\n### Rewrite: "${bullet}"`);
      write(run.status === 200 ? run.json.result.rewrites.map((r) => `- ${r}`).join("\n") : `**${run.status}** ${JSON.stringify(run.json)}`);
    }

    // Ask for details on the first bullet, then rewrite it using the sample's scripted answers.
    const detailBullet = sample.rewriteBullets[0];
    const asked = await post("/v1/ai/bullet-questions", { bullet: detailBullet, jobTitle: sample.jobTitle, jobDescription, allowedKeywords: [] }, token);
    write(`\n### Questions for "${detailBullet}"`);
    if (asked.status === 200) {
      const questions = asked.json.result.questions;
      const details = questions.slice(0, sample.detailAnswers.length).map((q, i) => ({ question: q.question, answer: sample.detailAnswers[i] }));
      write(questions.map((q, i) => `- ${q.question} _(${q.placeholder})_${details[i] ? `\n  > ${details[i].answer}` : ""}`).join("\n"));
      const withDetails = await post("/v1/ai/rewrite-bullet", { bullet: detailBullet, jobTitle: sample.jobTitle, jobDescription, allowedKeywords: [], resumeExcerpt: sample.resume, details }, token);
      write(`\nRewrite with details:`);
      write(withDetails.status === 200 ? withDetails.json.result.rewrites.map((r) => `- ${r}`).join("\n") : `**${withDetails.status}** ${JSON.stringify(withDetails.json)}`);
    } else {
      write(`**${asked.status}** ${JSON.stringify(asked.json)}`);
    }

    const improve = await post("/v1/ai/improve-bullets", { bullets: sample.weakBullets, jobTitle: sample.jobTitle, jobDescription, allowedKeywords: [] }, token);
    write(`\n### Improve Resume`);
    if (improve.status === 200) {
      for (const item of improve.json.result.items) {
        write(`- ${sample.weakBullets[item.id - 1] ?? `(unknown id ${item.id})`}\n  → ${item.rewrite}`);
      }
    } else {
      write(`**${improve.status}** ${JSON.stringify(improve.json)}`);
    }

    const letter = await post("/v1/ai/cover-letter", { resume: sample.resume, jobDescription: sample.jobDescription, jobTitle: sample.jobTitle, allowedKeywords: [] }, token);
    write(`\n### Cover letter`);
    write(letter.status === 200 ? `\n${letter.json.result.letter}` : `**${letter.status}** ${JSON.stringify(letter.json)}`);

    const insights = await post("/v1/ai/job-insights", { jobDescription: sample.jobDescription }, token);
    write(`\n### Job requirements`);
    write(insights.status === 200 ? insights.json.result.requirements.map((r) => `${r.term} (${r.importance})`).join(", ") : `**${insights.status}** ${JSON.stringify(insights.json)}`);
    write();
  }

  // Give wrangler a moment to flush the last log lines.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const tasks = logs.filter((entry) => entry.message === "ai task");
  write(`## Usage and cost`);
  write(`| Task | Model | Effort | Input | Output (reasoning) | Cost |`);
  write(`|---|---|---|---|---|---|`);
  const byTask = {};
  for (const entry of tasks) {
    write(`| ${entry.task} | ${entry.model} | ${entry.effort} | ${entry.usage.input} | ${entry.usage.output} (${entry.usage.reasoning}) | $${cost(entry).toFixed(4)} |`);
    (byTask[entry.task] ??= []).push(cost(entry));
  }
  write();
  for (const [task, costs] of Object.entries(byTask)) {
    write(`- ${task}: average $${(costs.reduce((a, b) => a + b, 0) / costs.length).toFixed(4)} per call`);
  }
  for (const entry of logs.filter((e) => e.message !== "ai task")) write(`- ⚠️ ${JSON.stringify(entry)}`);

  mkdirSync("eval-output", { recursive: true });
  const path = `eval-output/${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
  writeFileSync(path, `# AI eval\n\nWriting: ${vars.OPENAI_WRITING_MODEL ?? "(wrangler.jsonc)"}, extract: ${vars.OPENAI_EXTRACT_MODEL ?? "(wrangler.jsonc)"}\n\n${report.join("\n")}\n`);
  console.log(report.join("\n"));
  console.log(`\nSaved to ${path}`);
} finally {
  dev.kill();
}
