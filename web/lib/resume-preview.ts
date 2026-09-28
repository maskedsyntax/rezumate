// Deterministic browser preview. The four score weights match the iPhone app;
// browser-specific matching rules can differ and are explained on the checker page.
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
  "redis", "graphql", "api", "microservices", "ci/cd", "git",
  "github", "sql", "nosql", "spark", "kafka", "airflow", "pandas",
  "machine learning", "ml", "ai", "llm", "nlp", "tensorflow",
  "pytorch", "scikit-learn", "data analysis", "analytics", "excel",
  "power bi", "tableau", "figma", "product management", "agile", "scrum",
  "html", "css", "json", "rest api", "rest apis", "responsive design",
  "accessibility", "ui", "frontend", "nextjs",
  "tailwind", "tailwind css", "apis", "k8s", "salesforce",
  "hubspot", "jira", "asana", "google analytics", "ga4",
  "google ads", "meta ads", "seo", "sem", "financial modeling",
  "budgeting", "forecasting", "customer success", "account management",
  "stakeholder management", "user research", "ux research",
  "wireframing", "prototyping", "a/b testing", "project management",
  "program management", "quickbooks", "sap", "erp"
];

const canonicalKeywords: Record<string, string> = {
  apis: "api", api: "api", nextjs: "next.js", "next.js": "next.js",
  "node.js": "node.js", golang: "go", k8s: "kubernetes", postgres: "postgresql",
  "rest api": "rest api", "rest apis": "rest api",
  tailwind: "tailwind css", "tailwind css": "tailwind css"
};

const keywordAliases: Record<string, string[]> = {
  aws: ["amazon web services"],
  gcp: ["google cloud", "google cloud platform"],
  kubernetes: ["k8s"],
  postgresql: ["postgres"],
  "node.js": ["nodejs"],
  "next.js": ["nextjs"],
  "rest api": ["rest apis", "restful api", "restful apis"],
  "ci/cd": ["ci-cd", "continuous integration and continuous delivery", "continuous integration and deployment"],
  "power bi": ["powerbi"],
  "a/b testing": ["ab testing", "split testing"],
  ga4: ["google analytics 4"]
};

// Only these incomplete expressions receive partial credit. Arbitrary substrings
// (such as "data" inside "database") must never count as a skill match.
const partialAliases: Record<string, string[]> = {
  "rest api": ["api", "apis"],
  "ci/cd": ["continuous integration", "continuous delivery"],
  "responsive design": ["responsive"]
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
  "resulting", "saved", "grew", "expanded"
];

const measurableImpactRegex = /(?:\b\d+(?:\.\d+)?%|\$[\d,.]+|\b\d+(?:\.\d+)?\s*(?:x|k|m|million|billion|users|customers|requests|seconds|minutes|hours|days|teams|projects|clients|accounts)\b)/i;
const bulletPrefixRegex = /^([-*•]|\d+[.)])\s+/;

export type PreviewAnalysis = {
  score: number | null;
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
  coverageWarning: string | null;
  sections: Record<string, boolean>;
  wordCount: number;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isNegatedMention(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 75), start).split(/[\n.;!?]/).at(-1) ?? "";
  const after = text.slice(end, end + 35);
  return /\b(?:no|without|lacks?|lacking|not|never)(?:\s+[\w-]+){0,5}\s*$/i.test(before)
    || /^\s+(?:(?:is|are|was|were)\s+)?not\s+(?:required|needed|used|supported)\b/i.test(after)
    || /^\s+(?:isn't|aren't|wasn't|weren't)\s+(?:required|needed|used|supported)\b/i.test(after);
}

function hasPositiveMatch(pattern: RegExp, text: string): boolean {
  for (const match of text.matchAll(pattern)) {
    if (!isNegatedMention(text, match.index, match.index + match[0].length)) return true;
  }
  return false;
}

function containsExactPhrase(phrase: string, text: string): boolean {
  const escaped = escapeRegex(phrase).replace(/ /g, "\\s+");
  return hasPositiveMatch(new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "gi"), text);
}

function keywordInText(keyword: string, text: string): boolean {
  if (keyword === "go") return hasPositiveMatch(/(?<![a-z])Go(?=\s*(?:[,;/.]|\s+(?:and|or|developer|engineer|programming|language|services|backend|experience|skills)\b))/g, text) || containsExactPhrase("golang", text);
  if (keyword === "api") return containsExactPhrase("api", text) || containsExactPhrase("apis", text);
  if (keyword === "rest api") return hasPositiveMatch(/(?<![a-z0-9])rest\s+apis?(?![a-z0-9])/gi, text) || (keywordAliases[keyword] ?? []).some((alias) => containsExactPhrase(alias, text));
  if (keyword === "next.js") return hasPositiveMatch(/(?<![a-z0-9])next[.\s-]?js(?![a-z0-9])/gi, text);
  if (keyword === "node.js") return hasPositiveMatch(/(?<![a-z0-9])node[.\s-]?js(?![a-z0-9])/gi, text);
  return [keyword, ...(keywordAliases[keyword] ?? [])].some((alias) => containsExactPhrase(alias, text));
}

function partialKeywordInText(keyword: string, text: string): boolean {
  return (partialAliases[keyword] ?? []).some((alias) => containsExactPhrase(alias, text));
}

export function extractKeywords(jobDescription: string): string[] {
  const found = new Set<string>();
  for (const skill of knownSkills) {
    if (keywordInText(skill, jobDescription)) found.add(canonicalKeywords[skill] ?? skill);
  }
  if (found.has("api") && ["rest api", "graphql", "fastapi"].some((skill) => found.has(skill))) {
    found.delete("api");
  }
  if (found.has("ga4")) {
    found.delete("google analytics");
    found.delete("analytics");
  } else if (found.has("google analytics")) {
    found.delete("analytics");
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

  const matchedKeywords: string[] = [];
  const partialMatches: string[] = [];
  const missingKeywords: string[] = [];
  for (const keyword of jdKeywords) {
    if (keywordInText(keyword, resume)) matchedKeywords.push(keyword);
    else if (partialKeywordInText(keyword, resume)) partialMatches.push(keyword);
    else missingKeywords.push(keyword);
  }

  const bullets = extractBullets(resume);
  const weakBullets = bullets.filter((bullet) => weakBulletStarters.some((starter) => bullet.toLowerCase().startsWith(starter)) || bullet.split(/\s+/).length < 7);
  const bulletsWithoutImpact = bullets.filter((bullet) => !measurableImpactRegex.test(bullet) && !qualitativeImpactSignals.some((signal) => containsExactPhrase(signal, bullet)));
  const lines = resume.split(/\r?\n/);
  const normalizedLines = new Set(lines.map((line) => line.trim().toLowerCase().replace(/^:+|:+$/g, "")));
  const sections = Object.fromEntries(Object.entries(sectionAliases).map(([section, aliases]) => [section, aliases.some((alias) => normalizedLines.has(alias))]));
  const wordCount = resume.split(/\s+/).filter(Boolean).length;
  const formattingWarnings: string[] = [];
  if (wordCount < 100) formattingWarnings.push("Resume appears unusually short after extraction.");
  if (wordCount > 1200) formattingWarnings.push("Resume appears long; consider tightening for recruiter scanning.");
  if (resume.includes("\t")) formattingWarnings.push("Tabs were detected and may indicate table-like formatting.");
  if (lines.filter((line) => line.length > 140).length >= 5) formattingWarnings.push("Several long lines may indicate layout extraction issues.");

  const keywordCoverage = percent(matchedKeywords.length + partialMatches.length * 0.5, jdKeywords.length);
  const impactQuality = percent(bullets.length - bulletsWithoutImpact.length, bullets.length);
  const structureQuality = percent(
    Number(sections.summary) + Number(sections.experience || sections.projects) + Number(sections.skills) + Number(sections.education),
    4
  );
  const formattingQuality = Math.max(0, 100 - formattingWarnings.length * 20);

  return {
    score: jdKeywords.length < 5 ? null : Math.round(keywordCoverage * 0.45 + impactQuality * 0.25 + structureQuality * 0.20 + formattingQuality * 0.10),
    keywordCoverage, impactQuality, structureQuality, formattingQuality,
    jdKeywords, matchedKeywords, partialMatches, missingKeywords,
    weakBullets: weakBullets.slice(0, 8), bulletsWithoutImpact: bulletsWithoutImpact.slice(0, 8),
    formattingWarnings,
    coverageWarning: jdKeywords.length < 5 ? `Only ${jdKeywords.length} supported role ${jdKeywords.length === 1 ? "term was" : "terms were"} recognized in this posting. A total score would be misleading, so review the findings instead.` : null,
    sections, wordCount
  };
}
