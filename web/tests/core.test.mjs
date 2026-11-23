import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { emptyDoc, fromIOSDocument, line, newExperience, toIOSDocument, visibleSections } from "../lib/core/resume-document.ts";
import { parseResume } from "../lib/core/resume-parser.ts";
import { documentToText } from "../lib/core/resume-text.ts";
import { scoreDocument } from "../lib/core/ats-score.ts";
import { strengthenBullet } from "../lib/core/local-strengthen.ts";

const cases = new URL("../../ios/Tools/parser-parity/cases/", import.meta.url);
const sample = readFileSync(new URL("one-line-headers.txt", cases), "utf8");

// Content only: ids differ between parses and the contact block isn't reproduced verbatim.
function content(doc) {
  const ios = toIOSDocument(doc);
  return { experience: ios.experience, projects: ios.projects, skillCategories: ios.skillCategories, education: ios.education, summary: ios.summary, additionalSections: ios.additionalSections.map((s) => ({ ...s, title: s.title.toUpperCase() })) };
}

test("document text parses back to the same content", () => {
  const doc = fromIOSDocument(parseResume(sample));
  const again = fromIOSDocument(parseResume(documentToText(doc)));
  assert.deepEqual(content(again), content(doc));
  assert.equal(again.contact.name, doc.contact.name);
  assert.equal(again.contact.email, doc.contact.email);
  assert.equal(again.contact.phone, doc.contact.phone);
});

test("hidden sections and renamed headings are reflected in the text", () => {
  const doc = fromIOSDocument(parseResume(sample));
  doc.hidden = ["projects"];
  doc.titles = { experience: "Work History" };
  const text = documentToText(doc);
  assert.ok(!text.includes("PROJECTS"));
  assert.ok(text.includes("\nWORK HISTORY\n"));
  assert.ok(!visibleSections(doc).includes("projects"));
});

test("a built document scores the same as its text in the checker", () => {
  const doc = emptyDoc();
  doc.contact.name = "Sam Rivera";
  doc.contact.email = "sam@example.com";
  doc.summary = "Backend engineer building APIs.";
  const job = newExperience();
  job.company = "Acme";
  job.title = "Software Engineer";
  job.dateRange = "2021 - Present";
  job.bullets = [line("Built Python services on PostgreSQL that cut report time by 40%"), line("Worked on the React admin dashboard")];
  doc.experience = [job];
  doc.skills = [{ id: "s", name: "Languages", items: "Python, TypeScript, SQL" }];
  const jd = "We need a backend engineer with Python, PostgreSQL, Docker, AWS and React experience to build reliable APIs and internal tools for a growing product team.";
  const result = scoreDocument(doc, jd);
  assert.equal(result.ok, true);
  assert.ok(result.analysis.matchedKeywords.includes("python"));
  assert.ok(result.analysis.missingKeywords.includes("docker"));
  assert.ok(result.analysis.weakBullets.some((b) => b.startsWith("Worked on")));
  assert.equal(scoreDocument(doc, "too short").ok, false);
});

test("free strengthen matches the app's verb upgrades", () => {
  assert.equal(strengthenBullet("• Worked on the billing service"), "Contributed to the billing service");
  assert.equal(strengthenBullet("handled support escalations"), "Managed support escalations");
  assert.equal(strengthenBullet("Built the billing service"), "Built the billing service");
});
