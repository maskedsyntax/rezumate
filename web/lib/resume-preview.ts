// Browser preview of the deterministic rules in ios/RezumateNative/Services/ATSScoringService.swift.
// Keep changes to keyword aliases, weights, and warnings in sync with the iPhone app.
const sectionAliases: Record<string, string[]> = {
  summary: ["summary", "profile", "objective"],
  experience: ["experience", "work experience", "employment", "professional experience"],
  projects: ["projects", "project experience"],
  skills: ["skills", "technical skills", "technologies"],
  education: ["education", "academic background"]
};

const knownSkills = [
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "linux",
  "python", "java", "javascript", "typescript", "go", "golang", "rust",
  "c++", "c#", "react", "next.js", "node.js", "fastapi", "django",
  "flask", "spring", "postgresql", "postgres", "mysql", "mongodb",
  "redis", "graphql", "rest", "api", "microservices", "ci/cd", "git",
  "github", "sql", "nosql", "spark", "kafka", "airflow", "pandas",
  "machine learning", "ml", "ai", "llm", "nlp", "tensorflow",
  "pytorch", "scikit-learn", "data analysis", "analytics", "excel",
  "power bi", "tableau", "figma", "product management", "agile", "scrum",
  "html", "css", "json", "rest api", "rest apis", "responsive design",
  "accessibility", "web applications", "ui", "frontend", "nextjs",
  "tailwind", "tailwind css", "node", "apis"
];

const canonicalKeywords: Record<string, string> = {
  apis: "api", api: "api", nextjs: "next.js", "next.js": "next.js",
  node: "node.js", "node.js": "node.js", rest: "rest api",
  "rest api": "rest api", "rest apis": "rest api",
  tailwind: "tailwind css", "tailwind css": "tailwind css"
};

const weakBulletStarters = [
  "worked on", "helped with", "responsible for", "involved in",
  "participated in", "assisted with", "handled", "did", "made"
];

const actionLineStarters = [
  "built", "created", "developed", "designed", "implemented", "improved",
  "integrated", "launched", "led", "maintained", "managed", "optimized",
  "shipped", "worked on", "helped with", "responsible for", "assisted with"
];

const qualitativeImpactSignals = [
  "improved", "improving", "reduced", "increased", "optimized",
  "streamlined", "accelerated", "enabled", "delivered", "supporting",
  "resulting", "reliability", "performance", "usability", "quality",
  "efficiency", "accuracy", "scalability", "maintainability"
];

const measurableImpactRegex = /(\d+[%+]?|\$[\d,.]+|[<>]\s*\d+|\b\d+\s*(x|k|m|million|billion|users|customers|requests|seconds|minutes|hours|days)\b)/i;
const bulletPrefixRegex = /^([-*•]|\d+[.)])\s+/;

export type PreviewAnalysis = {
  score: number;
  keywordCoverage: number;
  impactQuality: number;
  structureQuality: number;
  formattingQuality: number;
  jdKeywords: string[];
  matchedKeywords: string[];
  partialMatches: string[];
  missingKeywords: string[];
  weakBullets: string[];
  bulletsWithoutImpact: string[];
  formattingWarnings: string[];
  sections: Record<string, boolean>;
  wordCount: number;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordInText(keyword: string, textLower: string): boolean {
  const escaped = escapeRegex(keyword.toLowerCase()).replace(/ /g, "\\s+");
  if (new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`).test(textLower)) return true;
  if (keyword === "api") return /(?<![a-z0-9])apis?(?![a-z0-9])/.test(textLower);
  if (keyword === "rest api") return /(?<![a-z0-9])rest\s+apis?(?![a-z0-9])/.test(textLower);
  if (keyword === "next.js") return /(?<![a-z0-9])next[.\s-]?js(?![a-z0-9])/.test(textLower);
  if (keyword === "node.js") return /(?<![a-z0-9])node[.\s-]?js(?![a-z0-9])/.test(textLower);
  return false;
}

export function extractKeywords(jobDescription: string): string[] {
  const textLower = jobDescription.toLowerCase();
  const found = new Set<string>();
  for (const skill of knownSkills) {
    if (keywordInText(skill, textLower)) found.add(canonicalKeywords[skill] ?? skill);
  }
  if (found.has("api") && ["rest api", "graphql", "fastapi"].some((skill) => found.has(skill))) {
    found.delete("api");
  }
  return [...found].sort();
}

function validBullet(value: string): boolean {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length < 12 || normalized.length > 320 || /([a-z])\1{7,}/i.test(normalized)) return false;
  const compact = normalized.toLowerCase().replace(/[^a-z]/g, "");
  if (compact.length >= 40 && new Set(compact).size <= 5) return false;
  const words = normalized.match(/[A-Za-z][A-Za-z+#./-]*/g) ?? [];
  return words.length >= 3 && words.join("").length / words.length <= 18;
}

function extractBullets(text: string): string[] {
  const bullets: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const stripped = line.trim();
    const prefix = stripped.match(bulletPrefixRegex);
    if (prefix) {
      const bullet = stripped.slice(prefix[0].length).trim();
      if (validBullet(bullet)) bullets.push(bullet);
    } else if (
      stripped.split(/\s+/).length >= 5 &&
      !stripped.endsWith(":") &&
      actionLineStarters.some((starter) => stripped.toLowerCase().startsWith(starter)) &&
      validBullet(stripped)
    ) {
      bullets.push(stripped);
    }
  }
  return bullets;
}

function percent(numerator: number, denominator: number): number {
  return denominator <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

export function analyzeResumePreview(resumeText: string, jobDescription: string): PreviewAnalysis {
  const resume = resumeText.trim();
  const job = jobDescription.trim();
  if (!resume) throw new Error("Add a text-based PDF, DOCX, or pasted resume before checking it.");
  if (job.length < 120) throw new Error("Paste a fuller job description (at least 120 characters) for a meaningful comparison.");
  if (job.length > 5000) throw new Error("Job descriptions can contain up to 5,000 characters. Shorten this one before checking.");

  const jdKeywords = extractKeywords(job);
  if (jdKeywords.length === 0) throw new Error("No supported skills or tools were found in the job description. Try the complete posting.");

  const resumeLower = resume.toLowerCase();
  const matchedKeywords: string[] = [];
  const partialMatches: string[] = [];
  const missingKeywords: string[] = [];
  for (const keyword of jdKeywords) {
    if (keywordInText(keyword, resumeLower)) matchedKeywords.push(keyword);
    else if (keyword.split(/[ /+-]/).filter((part) => part.length > 2).some((part) => resumeLower.includes(part))) partialMatches.push(keyword);
    else missingKeywords.push(keyword);
  }

  const bullets = extractBullets(resume);
  const weakBullets = bullets.filter((bullet) => weakBulletStarters.some((starter) => bullet.toLowerCase().startsWith(starter)) || bullet.split(/\s+/).length < 7);
  const bulletsWithoutImpact = bullets.filter((bullet) => !measurableImpactRegex.test(bullet) && !qualitativeImpactSignals.some((signal) => bullet.toLowerCase().includes(signal)));
  const lines = resume.split(/\r?\n/);
  const normalizedLines = new Set(lines.map((line) => line.trim().toLowerCase().replace(/^:+|:+$/g, "")));
  const sections = Object.fromEntries(Object.entries(sectionAliases).map(([section, aliases]) => [section, aliases.some((alias) => normalizedLines.has(alias))]));
  const wordCount = resume.split(/\s+/).filter(Boolean).length;
  const formattingWarnings: string[] = [];
  if (wordCount < 250) formattingWarnings.push("Resume appears unusually short after extraction.");
  if (wordCount > 1200) formattingWarnings.push("Resume appears long; consider tightening for recruiter scanning.");
  if (resume.includes("\t")) formattingWarnings.push("Tabs were detected and may indicate table-like formatting.");
  if (lines.filter((line) => line.length > 140).length >= 5) formattingWarnings.push("Several long lines may indicate layout extraction issues.");

  const keywordCoverage = percent(matchedKeywords.length + partialMatches.length * 0.5, jdKeywords.length);
  const impactQuality = percent(bullets.length - bulletsWithoutImpact.length, bullets.length);
  const structureQuality = percent(Object.values(sections).filter(Boolean).length, Object.keys(sections).length);
  const formattingQuality = Math.max(0, 100 - formattingWarnings.length * 20);

  return {
    score: Math.round(keywordCoverage * 0.45 + impactQuality * 0.25 + structureQuality * 0.20 + formattingQuality * 0.10),
    keywordCoverage, impactQuality, structureQuality, formattingQuality,
    jdKeywords, matchedKeywords, partialMatches, missingKeywords,
    weakBullets: weakBullets.slice(0, 8), bulletsWithoutImpact: bulletsWithoutImpact.slice(0, 8),
    formattingWarnings, sections, wordCount
  };
}
