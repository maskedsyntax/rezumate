// Deterministic browser preview. This is a line-for-line port of the iPhone app's
// ATSScoringService (ios/RezumateNative/Services/ATSScoringService.swift), so the same
// resume text and job description get the same score. Change both together.
export const scoreVersion = "ats-v4";

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
  "tailwind", "tailwind css", "node", "apis",
  // Mobile
  "ios", "swift", "swiftui", "uikit", "objective-c", "xcode", "xctest",
  "core data", "swiftdata", "app store", "testflight", "android", "kotlin",
  "jetpack compose", "react native", "flutter", "unit testing", "ui testing",
  "unit tests", "unit test", "ui tests", "ui test", "push notifications", "push notification",
  "xcode cloud", "github actions", "gitlab ci",
  // Healthcare
  "patient care", "patient education", "medication administration", "triage",
  "bls", "acls", "pals", "ehr", "emr", "telemetry", "icu", "infection control",
  "care planning", "vital signs", "hipaa",
  // Marketing
  "seo", "sem", "ppc", "google analytics", "google ads", "hubspot", "salesforce",
  "crm", "content marketing", "email marketing", "social media", "copywriting",
  "a/b testing", "marketing automation", "campaign management", "brand strategy",
  "google analytics 4", "ga4", "meta ads",
  // Product, project, design, and business
  "jira", "asana", "k8s", "financial modeling", "budgeting", "forecasting",
  "customer success", "account management", "stakeholder management", "user research",
  "ux research", "wireframing", "prototyping", "project management", "program management",
  "quickbooks", "sap", "erp"
];

const canonicalKeywords: Record<string, string> = {
  apis: "api", api: "api", nextjs: "next.js", postgres: "postgresql", postgresql: "postgresql",
  "next.js": "next.js", node: "node.js", "node.js": "node.js", rest: "rest api",
  "rest api": "rest api", "rest apis": "rest api", tailwind: "tailwind css",
  "tailwind css": "tailwind css", "unit tests": "unit testing", "unit test": "unit testing",
  "ui tests": "ui testing", "ui test": "ui testing", "push notification": "push notifications",
  golang: "go", k8s: "kubernetes", "google analytics 4": "ga4"
};

// Other spellings that count as the same skill ("unit tests" for "unit testing").
const keywordVariants: Record<string, string[]> = {
  "unit testing": ["unit tests", "unit test"],
  "ui testing": ["ui tests", "ui test"],
  "push notifications": ["push notification"],
  aws: ["amazon web services"],
  gcp: ["google cloud platform", "google cloud"],
  kubernetes: ["k8s"],
  go: ["golang"],
  "rest api": ["restful apis", "restful api"],
  "ci/cd": ["continuous integration and continuous delivery", "continuous integration and deployment", "ci-cd"],
  "power bi": ["powerbi"],
  "a/b testing": ["ab testing", "split testing"],
  ga4: ["google analytics 4"]
};

// "Go" is also an everyday word, so it only counts written as the language.
const goLanguagePattern = String.raw`(?<![A-Za-z])Go(?=[ \t]*(?:[,;/.)|]|$|(?:and|or|developer|engineer|programming|language|services|backend|experience|skills)\b))`;
const negationBeforeRegex = /\b(?:no|without|lacks?|lacking|not|never)(?:\s+[\w-]+){0,5}\s*$/i;
const negationAfterRegex = /^\s+(?:(?:(?:is|are|was|were)\s+)?not|isn't|aren't|wasn't|weren't)\s+(?:required|needed|used|supported)\b/i;

// Separators that make neighbouring skills alternatives: "Core Data or SwiftData", "Kotlin/Java".
const alternativeSeparatorRegex = /^[ \t]*(?:,[ \t]*)?(?:or|and\/or|\/)[ \t]*$/i;
const commaSeparatorRegex = /^[ \t]*,[ \t]*$/;

const redundantKeywords: Record<string, string[]> = {
  api: ["rest api", "graphql", "fastapi"],
  ui: ["swiftui", "uikit", "ui testing", "jetpack compose", "frontend", "figma"]
};

// Words too common to signal a partial match on their own ("data" in "Core Data").
const genericKeywordParts = new Set([
  "administration", "analysis", "api", "apis", "app", "applications", "automation",
  "brand", "campaign", "care", "compose", "content", "control", "core", "data",
  "design", "education", "email", "google", "infection", "learning", "machine",
  "management", "marketing", "media", "medication", "objective", "patient",
  "planning", "power", "product", "responsive", "signs", "social", "store",
  "strategy", "test", "testing", "unit", "vital", "web",
  "account", "ads", "customer", "financial", "meta", "modeling", "program", "project",
  "research", "stakeholder", "success", "user"
]);

const optionalHeadingRegex = /nice[\s-]to[\s-]have|preferred|bonus|good to have|desired|desirable|pluses|optional/i;
const optionalInlineRegex = /\ba plus\b|nice[\s-]to[\s-]have|\bpreferred\b|\bbonus\b/i;

// Profile links like github.com/name would otherwise match the "github" skill.
const linkRegex = /(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\b[\w-]+(?:\.[\w-]+)*\.(?:com|io|dev|org|me|co|app|ai)(?:\/\S*)?/gi;

const keywordNoise = new Set([
  "ability", "basic", "collaborating", "communication", "developer",
  "development", "engineer", "engineering", "experience", "familiarity",
  "good", "intern", "internship", "knowledge", "learn", "learning",
  "nice", "requirements", "responsibilities", "responsibility", "role",
  "strong", "understanding", "web", "willingness", "work", "working"
]);

const weakBulletStarters = [
  "worked on", "helped with", "responsible for", "involved in",
  "participated in", "assisted with", "handled", "did", "made"
];

const actionLineStarters = [
  "built", "created", "developed", "designed", "implemented", "improved",
  "integrated", "launched", "led", "maintained", "managed", "optimized",
  "shipped", "worked on", "helped with", "responsible for", "assisted with"
];

const impactSignalWeight = 0.75;
const strongWordingWeight = 0.25;
const measurableImpactRegex = /(\d+[%+]?|\$[\d,.]+|[<>]\s*\d+|\b\d+\s*(x|k|m|million|billion|users|customers|requests|seconds|minutes|hours|days)\b)/i;
const qualitativeImpactSignals = [
  "improved", "improving", "reduced", "increased", "optimized",
  "streamlined", "accelerated", "enabled", "delivered", "supporting",
  "resulting", "reliability", "performance", "usability", "quality",
  "efficiency", "accuracy", "scalability", "maintainability"
];
const bulletPrefixRegex = /^([-*•]|\d+[.)])\s+/;

// How skills are written when plain title case would get them wrong ("Uikit", "Github").
const displayNames: Record<string, string> = {
  "a/b testing": "A/B testing", acls: "ACLS", ai: "AI", api: "API", aws: "AWS",
  bls: "BLS", "c#": "C#", "c++": "C++", "ci/cd": "CI/CD", crm: "CRM", css: "CSS",
  ehr: "EHR", emr: "EMR", fastapi: "FastAPI", gcp: "GCP", github: "GitHub",
  graphql: "GraphQL", hipaa: "HIPAA", html: "HTML", hubspot: "HubSpot", icu: "ICU",
  ios: "iOS", javascript: "JavaScript", json: "JSON", llm: "LLM", ml: "ML",
  mongodb: "MongoDB", mysql: "MySQL", "next.js": "Next.js", nextjs: "Next.js",
  nlp: "NLP", "node.js": "Node.js", nosql: "NoSQL", "objective-c": "Objective-C",
  pals: "PALS", postgresql: "PostgreSQL", "power bi": "Power BI", ppc: "PPC",
  pytorch: "PyTorch", "rest api": "REST API", "rest apis": "REST APIs",
  "scikit-learn": "scikit-learn", sem: "SEM", seo: "SEO", sql: "SQL",
  swiftdata: "SwiftData", swiftui: "SwiftUI", "tailwind css": "Tailwind CSS",
  tensorflow: "TensorFlow", testflight: "TestFlight", typescript: "TypeScript",
  ui: "UI", "ui testing": "UI testing", uikit: "UIKit", xcode: "Xcode", xctest: "XCTest",
  "unit testing": "Unit testing", "push notifications": "Push notifications", "xcode cloud": "Xcode Cloud",
  "github actions": "GitHub Actions", "gitlab ci": "GitLab CI", "app store": "App Store", "core data": "Core Data"
};

export function displayName(keyword: string): string {
  return displayNames[keyword.toLowerCase()]
    ?? keyword.split(" ").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ");
}

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

// Each pattern is compiled once; scoring runs them many times per analysis.
const regexCache = new Map<string, RegExp>();
function cachedRegex(pattern: string): RegExp {
  let regex = regexCache.get(pattern);
  if (!regex) {
    // Everything matches regardless of case except "Go", whose capital letter is the signal.
    regex = new RegExp(pattern, pattern === goLanguagePattern ? "gm" : "gim");
    regexCache.set(pattern, regex);
  }
  return regex;
}

// Cached regexes are global, so `test` and `matchAll` would otherwise carry `lastIndex` over
// from the previous use and skip matches. Always start from the beginning.
function matchesPattern(pattern: string, text: string): boolean {
  const regex = cachedRegex(pattern);
  regex.lastIndex = 0;
  const found = regex.test(text);
  regex.lastIndex = 0;
  return found;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

// Regexes that find the skill as a whole word, including its known spellings.
function patterns(keyword: string): string[] {
  const wholeWord = (term: string) => `(?<![a-z0-9])${escapeRegex(term.toLowerCase()).replace(/ /g, "\\s+")}(?![a-z0-9])`;
  const variants = (keywordVariants[keyword] ?? []).map(wholeWord);
  return [keyword === "go" ? goLanguagePattern : wholeWord(keyword), ...variants];
}

// Whether the text (with links removed) mentions the skill.
function keywordInText(keyword: string, text: string): boolean {
  if (patterns(keyword).some((pattern) => matchesPattern(pattern, text))) return true;
  if (keyword === "api") return matchesPattern("(?<![a-z0-9])apis?(?![a-z0-9])", text);
  if (keyword === "rest api") return matchesPattern("(?<![a-z0-9])rest\\s+apis?(?![a-z0-9])", text);
  if (keyword === "postgresql") return matchesPattern("(?<![a-z0-9])postgres(?:ql)?(?![a-z0-9])", text);
  if (keyword === "next.js") return matchesPattern("(?<![a-z0-9])next[.\\s-]?js(?![a-z0-9])", text);
  if (keyword === "node.js") return matchesPattern("(?<![a-z0-9])node[.\\s-]?js(?![a-z0-9])", text);
  return false;
}

function removingLinks(text: string): string {
  return text.replace(linkRegex, " ");
}

function canonicalize(keyword: string): string {
  return canonicalKeywords[keyword] ?? keyword;
}

const skillsLongestFirst = [...new Set(knownSkills)]
  .filter((skill) => !keywordNoise.has(skill))
  .sort((a, b) => (a.length !== b.length ? b.length - a.length : a < b ? -1 : a > b ? 1 : 0));

function isNegatedMention(text: string, start: number, end: number): boolean {
  const before = text.slice(Math.max(0, start - 75), start).split(/[\n.;!?]/).at(-1) ?? "";
  const after = text.slice(end, end + 35);
  return negationBeforeRegex.test(before) || negationAfterRegex.test(after);
}

type Mention = { keyword: string; start: number; end: number };

// Every skill the text mentions, with where. Longer skills are matched first and blanked
// out, so "GitHub Actions" doesn't also count as "GitHub". Negated mentions don't count.
function skillMentions(input: string): Mention[] {
  let text = removingLinks(input);
  const mentions: Mention[] = [];
  for (const skill of skillsLongestFirst) {
    const keyword = canonicalize(skill);
    for (const pattern of patterns(skill)) {
      const regex = cachedRegex(pattern);
      regex.lastIndex = 0;
      const matches = [...text.matchAll(regex)];
      if (matches.length === 0) continue;
      let masked = text;
      for (const match of matches) {
        const start = match.index, end = start + match[0].length;
        if (!isNegatedMention(text, start, end)) mentions.push({ keyword, start, end });
        masked = masked.slice(0, start) + " ".repeat(end - start) + masked.slice(end);
      }
      text = masked;
    }
  }
  return mentions.sort((a, b) => a.start - b.start);
}

export function extractKeywords(jobDescription: string): string[] {
  const found = new Set(skillMentions(jobDescription).map((mention) => mention.keyword));
  for (const [keyword, stronger] of Object.entries(redundantKeywords)) {
    if (found.has(keyword) && stronger.some((skill) => found.has(skill))) found.delete(keyword);
  }
  return [...found].sort();
}

// Groups of skills the job offers as alternatives, such as ["core data", "swiftdata"].
function alternativeGroups(jobDescription: string): string[][] {
  const text = removingLinks(jobDescription);
  const mentions = skillMentions(jobDescription);
  const groups: string[][] = [];
  let current: string[] = [];
  let hasOr = false;
  const close = () => {
    const unique = [...new Set(current)].sort();
    if (hasOr && unique.length > 1) groups.push(unique);
    current = [];
    hasOr = false;
  };
  mentions.forEach((mention, index) => {
    if (index > 0) {
      const previousEnd = mentions[index - 1].end;
      const gap = previousEnd <= mention.start ? text.slice(previousEnd, mention.start) : "";
      if (alternativeSeparatorRegex.test(gap)) hasOr = true;
      else if (!commaSeparatorRegex.test(gap)) close();
    }
    current.push(mention.keyword);
  });
  close();
  return groups;
}

// Required skills first, then by how often the job mentions them, then by first mention.
function prioritizedKeywords(keywords: string[], jobDescription: string): string[] {
  const lines = removingLinks(jobDescription).split(/\r\n|\r|\n/);
  let inOptionalSection = false;
  const lineIsOptional = lines.map((line) => {
    const trimmed = line.replace(/^[ \t]+|[ \t]+$/g, "");
    const wordCount = trimmed.split(" ").filter(Boolean).length;
    const isHeading = wordCount > 0 && wordCount <= 6 && !/^[-•*]/.test(trimmed);
    if (isHeading) inOptionalSection = optionalHeadingRegex.test(trimmed);
    return inOptionalSection || optionalInlineRegex.test(trimmed);
  });
  const importance = new Map(keywords.map((keyword) => {
    const value = { requiredHits: 0, optionalHits: 0, firstLine: Number.MAX_SAFE_INTEGER };
    lines.forEach((line, index) => {
      if (!keywordInText(keyword, line)) return;
      if (lineIsOptional[index]) value.optionalHits += 1; else value.requiredHits += 1;
      value.firstLine = Math.min(value.firstLine, index);
    });
    // Canonical forms ("rest api" from "REST") may not match line by line; treat as required.
    if (value.requiredHits + value.optionalHits === 0) value.requiredHits = 1;
    return [keyword, value] as const;
  }));
  return [...keywords].sort((lhs, rhs) => {
    const a = importance.get(lhs)!, b = importance.get(rhs)!;
    if ((a.requiredHits > 0) !== (b.requiredHits > 0)) return a.requiredHits > 0 ? -1 : 1;
    if (a.requiredHits !== b.requiredHits) return b.requiredHits - a.requiredHits;
    if (a.firstLine !== b.firstLine) return a.firstLine - b.firstLine;
    return lhs < rhs ? -1 : lhs > rhs ? 1 : 0;
  });
}

// Only multi-word skills can partially match, through a distinctive word matched whole.
function partialKeywordMatch(keyword: string, resume: string): boolean {
  return keyword.split(/[ /+-]/)
    .filter((part) => [...part].length > 2 && !genericKeywordParts.has(part))
    .some((part) => keywordInText(part, resume));
}

function hasImpactSignal(bullet: string): boolean {
  if (measurableImpactRegex.test(bullet)) return true;
  const lowered = bullet.toLowerCase();
  return qualitativeImpactSignals.some((signal) => lowered.includes(signal));
}

function hasRepetitiveNoise(value: string): boolean {
  const lowered = value.toLowerCase();
  if (/([a-z])\1{7,}/.test(lowered)) return true;
  const compact = lowered.replace(/[^a-z]/g, "");
  return compact.length >= 40 && new Set(compact).size <= 5;
}

function isValidBulletText(value: string): boolean {
  const normalized = value.replace(/\s+/g, " ").trim();
  const length = [...normalized].length;
  if (length < 12 || length > 320 || hasRepetitiveNoise(normalized)) return false;
  const words = normalized.match(/[A-Za-z][A-Za-z+#./-]*/g) ?? [];
  return words.length >= 3 && words.join("").length / words.length <= 18;
}

function wordsIn(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function isWeakBullet(bullet: string): boolean {
  const normalized = bullet.trim().toLowerCase();
  if (!normalized || !isValidBulletText(bullet)) return false;
  return weakBulletStarters.some((starter) => normalized.startsWith(starter)) || wordsIn(normalized) < 7;
}

function looksLikeResumeActionLine(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized || wordsIn(normalized) < 5 || normalized.endsWith(":")) return false;
  return actionLineStarters.some((starter) => normalized.startsWith(starter));
}

function extractBullets(text: string): string[] {
  const bullets: string[] = [];
  for (const line of text.split(/\r\n|\r|\n/)) {
    const stripped = line.trim();
    if (bulletPrefixRegex.test(stripped)) {
      const bullet = stripped.replace(bulletPrefixRegex, "").trim();
      if (isValidBulletText(bullet)) bullets.push(bullet);
    } else if (looksLikeResumeActionLine(stripped) && isValidBulletText(stripped)) {
      bullets.push(stripped);
    }
  }
  return bullets;
}

function detectSections(text: string): Record<string, boolean> {
  const lines = new Set(text.split(/\r\n|\r|\n/).map((line) => line.trim().toLowerCase().replace(/^:+|:+$/g, "")));
  return Object.fromEntries(Object.entries(sectionAliases).map(([section, aliases]) => [section, aliases.some((alias) => lines.has(alias))]));
}

function percent(numerator: number, denominator: number): number {
  return denominator <= 0 ? 0 : Math.max(0, Math.min(100, (numerator / denominator) * 100));
}

export function analyzeResumePreview(resumeText: string, jobDescription: string): PreviewAnalysis {
  const resume = resumeText.trim();
  const job = jobDescription.trim();
  if (!resume) throw new Error("Add a text-based PDF, DOCX, or pasted resume before checking it.");
  if ([...job].length < 120) throw new Error("Paste a fuller job description (at least 120 characters) for a meaningful comparison.");
  if ([...job].length > 5000) throw new Error("Job descriptions can contain up to 5,000 characters. Shorten this one before checking.");

  const resumeClean = removingLinks(resume);
  // "Core Data or SwiftData": having one option meets the requirement.
  let jdKeywords = extractKeywords(job);
  if (jdKeywords.length === 0) throw new Error("No supported skills or tools were found in the job description. Try the complete posting.");
  for (const group of alternativeGroups(job)) {
    const have = group.filter((keyword) => keywordInText(keyword, resumeClean));
    if (have.length > 0) jdKeywords = jdKeywords.filter((keyword) => !group.includes(keyword) || have.includes(keyword));
  }

  const matchedKeywords: string[] = [];
  const partialMatches: string[] = [];
  const missingKeywords: string[] = [];
  for (const keyword of prioritizedKeywords(jdKeywords, job)) {
    if (keywordInText(keyword, resumeClean)) matchedKeywords.push(keyword);
    else if (partialKeywordMatch(keyword, resumeClean)) partialMatches.push(keyword);
    else missingKeywords.push(keyword);
  }

  const bullets = extractBullets(resume);
  const weakBullets = bullets.filter(isWeakBullet);
  const bulletsWithoutImpact = bullets.filter((bullet) => !hasImpactSignal(bullet));
  const sections = detectSections(resume);
  const wordCount = wordsIn(resume);

  // Length is reported, but it says nothing about layout, so it doesn't cost formatting points.
  const lengthWarnings: string[] = [];
  if (wordCount < 250) lengthWarnings.push("Resume appears unusually short after extraction.");
  if (wordCount > 1200) lengthWarnings.push("Resume appears long; consider tightening for ATS and recruiter scanning.");
  const layoutWarnings: string[] = [];
  if (resume.includes("\t")) layoutWarnings.push("Tabs were detected and may indicate table-like formatting.");
  if (resume.split(/\r\n|\r|\n/).filter((line) => [...line].length > 140).length >= 5) {
    layoutWarnings.push("Several very long lines were detected, which may indicate layout extraction issues.");
  }

  const keywordCoverage = percent(matchedKeywords.length + partialMatches.length * 0.5, jdKeywords.length);
  // Most credit for showing an outcome, the rest for strong wording.
  const impactPoints = bullets.reduce((total, bullet) => total + (hasImpactSignal(bullet) ? impactSignalWeight : 0) + (isWeakBullet(bullet) ? 0 : strongWordingWeight), 0);
  const impactQuality = percent(impactPoints, bullets.length);
  const structureQuality = percent(Object.values(sections).filter(Boolean).length, Object.keys(sections).length);
  const formattingQuality = Math.max(0, 100 - layoutWarnings.length * 20);
  const score = Math.round(keywordCoverage * 0.45 + impactQuality * 0.25 + structureQuality * 0.20 + formattingQuality * 0.10);

  // The browser preview withholds a total when too few terms were recognized; the findings still show.
  const limited = jdKeywords.length < 5;
  return {
    score: limited ? null : score,
    keywordCoverage: Math.round(keywordCoverage),
    impactQuality: Math.round(impactQuality),
    structureQuality: Math.round(structureQuality),
    formattingQuality: Math.round(formattingQuality),
    jdKeywords, matchedKeywords, partialMatches, missingKeywords,
    weakBullets: weakBullets.slice(0, 8), bulletsWithoutImpact: bulletsWithoutImpact.slice(0, 8),
    formattingWarnings: [...lengthWarnings, ...layoutWarnings],
    coverageWarning: limited ? `Only ${jdKeywords.length} supported role ${jdKeywords.length === 1 ? "term was" : "terms were"} recognized in this posting. A total score would be misleading, so review the findings instead.` : null,
    sections, wordCount
  };
}
