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

test("recognizes common aliases without counting one skill twice", () => {
  const terms = extractKeywords("We need a Go engineer who has used Golang, Postgres, Amazon Web Services, K8s, REST APIs, and continuous integration and deployment in production systems.");
  assert.deepEqual(terms, ["aws", "ci/cd", "go", "kubernetes", "postgresql", "rest api"]);
  const aliasResume = "SUMMARY\nGo engineer\nEXPERIENCE\n• Improved Golang and PostgreSQL services by 30% with Amazon Web Services and Kubernetes.\nSKILLS\nGolang, PostgreSQL, AWS, Kubernetes, CI/CD, REST APIs\nEDUCATION\nComputer Science";
  const result = analyzeResumePreview(aliasResume, "We need a Go engineer who has used Postgres, Amazon Web Services, K8s, REST APIs, and continuous integration and deployment in production systems.");
  assert.equal(result.missingKeywords.length, 0);
  assert.equal(result.keywordCoverage, 100);
});

test("covers business roles and marks sparse vocabulary as limited", () => {
  const terms = extractKeywords("Lead customer success using Salesforce, HubSpot, Google Analytics 4, project management, forecasting, and account management.");
  assert.deepEqual(terms, ["account management", "customer success", "forecasting", "ga4", "hubspot", "project management", "salesforce"]);
  const sparse = analyzeResumePreview(resume, "We are hiring a Python engineer who can write code, communicate with teammates, review work, document decisions, and deliver reliable services to customers every week.");
  assert.equal(sparse.score, null);
  assert.match(sparse.coverageWarning, /total score would be misleading/);
});

test("does not infer skills from arbitrary substrings", () => {
  const jd = "The analyst needs data analysis and REST APIs to build reports, work with stakeholders, and make reliable decisions across business systems and customer-facing applications.";
  const candidate = "SUMMARY\nDatabase administrator.\nEXPERIENCE\n• Built APIs for reporting and database administration.\nSKILLS\nSQL, database administration\nEDUCATION\nBusiness degree";
  const result = analyzeResumePreview(candidate, jd);
  assert.ok(result.missingKeywords.includes("data analysis"));
  assert.ok(result.partialMatches.includes("rest api"));
  assert.ok(!result.matchedKeywords.includes("rest api"));
});

test("treats projects as an alternative to experience and ignores bare years as impact", () => {
  const projectResume = "SUMMARY\nDeveloper.\nPROJECTS\n• Built a Python tool for internal reporting in 2024.\nSKILLS\nPython, Git\nEDUCATION\nComputer Science";
  const role = "We need a Python developer with Git, Docker, AWS, and React skills to build internal tools, collaborate on reliable systems, test changes, and maintain reporting workflows for a busy product team.";
  const projectResult = analyzeResumePreview(projectResume, role);
  assert.equal(projectResult.structureQuality, 100);
  assert.equal(projectResult.impactQuality, 0);
  const outcomeResult = analyzeResumePreview(projectResume.replace("in 2024", "and reduced reporting time by 30%"), role);
  assert.equal(outcomeResult.impactQuality, 100);
  assert.ok(outcomeResult.score > projectResult.score);
});

test("does not count a skill that is explicitly negated", () => {
  assert.deepEqual(extractKeywords("Python is required. Docker is not required, and we do not use Kubernetes."), ["python"]);
  const role = "We need Python and Docker experience to develop production services, maintain deployment workflows, collaborate with engineers, and keep applications reliable for customers.";
  const noDocker = "SUMMARY\nPython engineer with no experience with Docker.\nEXPERIENCE\n• Built Python services for internal teams.\nSKILLS\nPython\nEDUCATION\nComputer Science";
  const result = analyzeResumePreview(noDocker, role);
  assert.ok(result.missingKeywords.includes("docker"));
  assert.ok(analyzeResumePreview(noDocker + "\n• Later built Docker images for production services.", role).matchedKeywords.includes("docker"));
});

test("does not mistake go-to-market copy for the Go language", () => {
  assert.deepEqual(extractKeywords("Go to market quickly with Salesforce and customer success operations."), ["customer success", "salesforce"]);
  assert.deepEqual(extractKeywords("We need a Go engineer with PostgreSQL experience."), ["go", "postgresql"]);
});
