import assert from "node:assert/strict";
import test from "node:test";

import { analyzeResumePreview, extractKeywords } from "../lib/resume-preview.ts";

const job = "We need a developer who can build REST APIs with Python and PostgreSQL, use React and TypeScript for accessible web applications, and deploy with Docker. Experience with Git and AWS is useful for this production role.";
const resume = `SUMMARY
Software engineer working on APIs and internal tools.
EXPERIENCE
• Worked on backend services using Python and PostgreSQL for reporting.
• Built an internal React interface for the support team.
SKILLS
Python, PostgreSQL, React, TypeScript, Git
EDUCATION
Bachelor of Science in Computer Science`;

test("extracts canonical role terms without substring false positives", () => {
  assert.deepEqual(extractKeywords("React and TypeScript with REST APIs, Node.js, CI/CD, C++ and C# are required."), ["c#", "c++", "ci/cd", "node.js", "react", "rest api", "typescript"]);
  assert.deepEqual(extractKeywords("Pythonic writing and society events are valued."), []);
});

test("shows concrete matched and missing skills with a bounded score", () => {
  const result = analyzeResumePreview(resume, job);
  assert.ok(result.score > 0 && result.score < 100);
  assert.ok(result.matchedKeywords.includes("python"));
  assert.ok(result.matchedKeywords.includes("react"));
  assert.ok(result.missingKeywords.includes("docker"));
  assert.ok(result.missingKeywords.includes("aws"));
  assert.ok(result.weakBullets.some((bullet) => bullet.startsWith("Worked on")));
  assert.equal(result.sections.experience, true);
  assert.equal(result.sections.projects, false);
});

test("rejects incomplete inputs rather than showing an arbitrary score", () => {
  assert.throws(() => analyzeResumePreview("", job), /resume/i);
  assert.throws(() => analyzeResumePreview(resume, "Python developer"), /fuller job description/i);
  assert.throws(() => analyzeResumePreview(resume, "We need a reliable team member who communicates clearly, plans thoughtfully, helps colleagues, and writes clearly for a diverse audience every day."), /No supported skills/i);
});
