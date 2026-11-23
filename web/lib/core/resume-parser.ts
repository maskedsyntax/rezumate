// Line-for-line port of the iPhone app's ResumeParser
// (ios/RezumateNative/Services/ResumeParser.swift), so the same text gives the same
// document on both. Change both together and run ios/Tools/parser-parity/check.sh.

import type { IOSResumeDocument, IOSExperienceEntry, IOSEducationEntry, IOSProjectEntry, IOSSkillCategory } from "./resume-document.ts";

type DetectedSection = { key: string; title: string };

const sectionAliases: Record<string, string> = {
  summary: "summary",
  objective: "summary",
  "professional summary": "summary",
  "career summary": "summary",
  profile: "summary",
  about: "summary",
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  employment: "experience",
  "employment history": "experience",
  "work history": "experience",
  projects: "projects",
  "personal projects": "projects",
  "project experience": "projects",
  "side projects": "projects",
  "open source": "projects",
  education: "education",
  "academic background": "education",
  "academic history": "education",
  skills: "skills",
  "technical skills": "skills",
  technologies: "skills",
  "core competencies": "skills",
  "technical competencies": "skills",
  certifications: "certifications",
  awards: "awards",
  publications: "publications",
  volunteer: "volunteer",
  volunteering: "volunteer"
};

// Known single-word or short location indicators.
const knownLocations = new Set([
  "remote", "india", "usa", "us", "uk", "united kingdom", "united states",
  "new york", "san francisco", "los angeles", "london", "berlin", "toronto",
  "singapore", "australia", "canada", "germany", "france", "europe", "asia",
  "worldwide", "globally", "anywhere", "hybrid"
]);
const knownLocationsLongestFirst = [...knownLocations].sort((a, b) => length(b) - length(a));

const month = String.raw`(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)`;
// Matches "Jan. 2022 -- Present", "2019 - 2022", etc.
const dateSource = String.raw`(?:${month}\.?\s+)?\d{4}\s*[-–—]+\s*(?:Present|Current|\d{4}|${month}\.?\s+\d{4})`;

const jobTitleWords = new Set([
  "engineer", "developer", "programmer", "manager", "designer", "analyst", "intern", "lead",
  "director", "specialist", "consultant", "scientist", "architect", "coordinator", "associate",
  "officer", "administrator", "assistant", "nurse", "technician", "representative", "executive",
  "head", "founder", "cofounder", "president", "strategist", "writer", "editor", "researcher",
  "accountant", "recruiter", "teacher", "instructor", "therapist", "pharmacist", "physician",
  "marketer", "owner", "supervisor", "advisor", "agent", "clerk", "tester"
]);

// ── Swift string semantics ──
// `.whitespaces` is spaces and tabs (Unicode Zs plus \t), not newlines.
const ws = String.raw`[\p{Zs}\t]`;
const trimWsRegex = new RegExp(`^${ws}+|${ws}+$`, "gu");
const splitWsRegex = new RegExp(ws, "u");

function trimWs(value: string): string {
  return value.replace(trimWsRegex, "");
}

function words(value: string): string[] {
  return value.split(splitWsRegex).filter(Boolean);
}

/** Swift's `String.count`, close enough: code points rather than grapheme clusters. */
function length(value: string): number {
  return [...value].length;
}

function dropFirstCharacter(value: string): string {
  return [...value].slice(1).join("");
}

function isUppercaseCharacter(char: string | undefined): boolean {
  return !!char && /[\p{Lu}\p{Lt}]/u.test(char);
}

function isLowercaseCharacter(char: string | undefined): boolean {
  return !!char && /\p{Ll}/u.test(char);
}

function emptyDocument(): IOSResumeDocument {
  return {
    name: "", email: null, phone: null, website: null, linkedin: null, github: null, location: null,
    summary: null, experience: [], projects: [], skillCategories: [], education: [],
    additionalSections: [], unmappedContent: []
  };
}

// ── Public ──

export function parseResume(text: string): IOSResumeDocument {
  const doc = emptyDocument();
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map(trimWs);

  let idx = 0;

  // Skip leading blanks, then grab the name.
  while (idx < lines.length && lines[idx] === "") idx += 1;
  if (idx >= lines.length) return doc;
  doc.name = lines[idx];
  idx += 1;

  // Contact block: lines before the first section header.
  while (idx < lines.length) {
    const line = lines[idx];
    if (line === "") { idx += 1; continue; }
    if (detectedSection(line)) break;
    if (!parseContactLine(line, doc)) doc.unmappedContent.push(line);
    idx += 1;
  }

  // Section parsing.
  let currentSection: DetectedSection | null = null;
  let sectionContent: string[] = [];
  while (idx < lines.length) {
    const line = lines[idx];
    idx += 1;
    const section = detectedSection(line);
    if (section) {
      if (currentSection) processSection(currentSection, sectionContent, doc);
      currentSection = section;
      sectionContent = [];
    } else {
      sectionContent.push(line);
    }
  }
  if (currentSection) processSection(currentSection, sectionContent, doc);

  return doc;
}

// ── Section detection ──

function detectedSection(line: string): DetectedSection | null {
  const trimmed = trimWs(line);
  const count = length(trimmed);
  if (!trimmed || count < 3 || count > 50) return null;

  const lower = trimmed.toLowerCase();
  if (sectionAliases[lower]) return { key: sectionAliases[lower], title: trimmed };

  // All-uppercase line: every letter is a capital.
  const letters = [...trimmed].filter((char) => /[\p{L}\p{M}]/u.test(char));
  if (letters.length === 0) return null;
  if (letters.every(isUppercaseCharacter)) return { key: sectionAliases[lower] ?? lower, title: trimmed };
  return null;
}

// ── Contact parsing ──

function parseContactLine(line: string, doc: IOSResumeDocument): boolean {
  const parts = line.split(/[|•·$]/).map(trimWs).filter(Boolean);
  let parsedAny = false;
  for (const part of parts.length > 1 ? parts : [line]) {
    const lower = part.toLowerCase();
    const email = doc.email === null ? extractEmail(part) : null;
    if (email) {
      doc.email = email;
      parsedAny = true;
    } else if (lower.includes("linkedin.com/in/")) {
      doc.linkedin = doc.linkedin ?? (extractLinkedIn(part) ?? part);
      parsedAny = true;
    } else if (lower.includes("github.com/")) {
      doc.github = doc.github ?? (extractGitHub(part) ?? part);
      parsedAny = true;
    } else if (lower.startsWith("http") || lower.startsWith("www.")
      || lower.includes(".dev") || lower.includes(".io")
      || (lower.includes(".com") && !lower.includes("@"))
      || (lower.includes(".app") && !lower.includes("@"))) {
      if (doc.website === null) doc.website = part;
      parsedAny = true;
    } else if (doc.phone === null && extractPhone(part)) {
      doc.phone = extractPhone(part);
      parsedAny = true;
    } else if (isLikelyLocation(part)) {
      if (doc.location === null) doc.location = part;
      parsedAny = true;
    }
  }
  return parsedAny;
}

function extractEmail(text: string): string | null {
  return /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.exec(text)?.[0] ?? null;
}

function extractPhone(text: string): string | null {
  for (const match of text.matchAll(/(?<![A-Za-z0-9])\+?[0-9(][0-9\s().-]{8,}[0-9](?![A-Za-z0-9])/g)) {
    const candidate = match[0].trim();
    const digits = candidate.replace(/\D/g, "").length;
    if (digits >= 10 && digits <= 15) return candidate;
  }
  return null;
}

function extractLinkedIn(text: string): string | null {
  return /linkedin\.com\/in\/([a-zA-Z0-9\-]+)/i.exec(text)?.[1] ?? null;
}

function extractGitHub(text: string): string | null {
  return /github\.com\/([a-zA-Z0-9\-]+)/i.exec(text)?.[1] ?? null;
}

function isLikelyLocation(text: string): boolean {
  const lower = trimWs(text.toLowerCase());
  if (knownLocations.has(lower)) return true;
  // "City, ST" pattern.
  if (/^[a-z\s]+,\s*[a-z]{2}$/.test(lower)) return true;
  // A single short, capitalized word with no special characters is likely a city or country.
  const parts = words(text);
  if (parts.length <= 3 && !text.includes("@") && !text.includes(".") && !text.includes("/")) {
    const allCapped = parts.every((word) => isUppercaseCharacter([...word][0]));
    if (allCapped && parts.length === 1 && length(text) >= 3) return true;
  }
  return false;
}

// ── Section processing ──

function processSection(section: DetectedSection, lines: string[], doc: IOSResumeDocument) {
  switch (section.key) {
    case "summary":
      doc.summary = lines.filter(Boolean).join(" ");
      break;
    case "experience":
      doc.experience = parseExperienceEntries(lines);
      break;
    case "projects":
      doc.projects = parseProjectEntries(lines);
      break;
    case "education":
      doc.education = parseEducationEntries(lines);
      break;
    case "skills":
      doc.skillCategories = parseSkillsSection(lines);
      break;
    default: {
      const meaningful = lines.filter((line) => line.trim() !== "");
      if (meaningful.length > 0) doc.additionalSections.push({ title: section.title, lines: meaningful });
    }
  }
}

// ── Experience ──

function parseExperienceEntries(lines: string[]): IOSExperienceEntry[] {
  const entries: IOSExperienceEntry[] = [];
  let current: IOSExperienceEntry | null = null;
  let expectTitle = false;

  for (const line of lines) {
    if (line === "") continue;

    const bullet = asBullet(line);
    if (bullet !== null) {
      current?.bullets.push(bullet);
      expectTitle = false;
      continue;
    }

    if (current === null) {
      current = experienceHeader(line);
      expectTitle = current.title === "";
    } else if (expectTitle) {
      const [title, location] = splitTitleAndLocation(line);
      current.title = title;
      current.location = location;
      expectTitle = false;
    } else if (current.bullets.length > 0 && splitNameAndDate(line)[1] === "") {
      appendToLastBullet(line, current.bullets);
    } else {
      entries.push(current);
      current = experienceHeader(line);
      expectTitle = current.title === "";
    }
  }

  if (current) entries.push(current);
  return entries;
}

/**
 * Starts an entry from its first line. Usually that's "Company  Date" with the title on the
 * next line, but many resumes put everything on one line:
 * "iOS Developer, Brightline Apps, Austin, TX  Mar 2022 - Present".
 */
function experienceHeader(line: string): IOSExperienceEntry {
  const entry: IOSExperienceEntry = { company: "", dateRange: "", title: "", location: "", bullets: [] };
  const [name, date] = splitNameAndDate(line);
  entry.dateRange = date;
  const parts = splitOneLineHeader(name);
  if (parts) {
    entry.title = parts.title;
    entry.company = parts.company;
    entry.location = parts.location;
  } else {
    entry.company = name;
  }
  return entry;
}

/**
 * Splits "Title, Company, City, ST", "Title | Company | Location", "Company - Title", or
 * "Title at Company" when exactly one of the two names reads like a job title.
 */
export function splitOneLineHeader(text: string): { title: string; company: string; location: string } | null {
  let parts: string[];
  const at = / at /i.exec(text);
  if (at) {
    const before = text.slice(0, at.index);
    const after = text.slice(at.index + at[0].length);
    parts = [before, ...after.split(",")];
  } else {
    parts = text.split(/[,|•·]/)
      .flatMap((part) => part.split(" – "))
      .flatMap((part) => part.split(" — "))
      .flatMap((part) => part.split(" - "));
  }
  parts = parts.map(trimWs).filter(Boolean);

  // A trailing "City, ST", a known place, or "Remote" is the location.
  let location = "";
  const last = parts.at(-1);
  if (parts.length >= 2 && last && /^[A-Za-z]{2}$/.test(last)) {
    location = `${parts[parts.length - 2]}, ${last.toUpperCase()}`;
    parts.splice(parts.length - 2, 2);
  } else if (last && (knownLocations.has(last.toLowerCase()) || last.toLowerCase() === "remote")) {
    location = last;
    parts.pop();
  }

  if (parts.length !== 2) return null;
  const firstIsRole = looksLikeJobTitle(parts[0]);
  const secondIsRole = looksLikeJobTitle(parts[1]);
  if (firstIsRole === secondIsRole) return null;
  return firstIsRole
    ? { title: parts[0], company: parts[1], location }
    : { title: parts[1], company: parts[0], location };
}

function looksLikeJobTitle(text: string): boolean {
  return text.toLowerCase().split(/[^\p{L}]+/u).some((word) => jobTitleWords.has(word));
}

// ── Projects ──

function parseProjectEntries(lines: string[]): IOSProjectEntry[] {
  const entries: IOSProjectEntry[] = [];
  let current: IOSProjectEntry | null = null;

  for (const line of lines) {
    if (line === "") continue;

    const bullet = asBullet(line);
    if (bullet !== null) {
      if (current === null) current = { name: "", bullets: [] };
      current.bullets.push(bullet);
      continue;
    }

    if (shouldContinuePreviousProjectBullet(line, current)) {
      appendToLastBullet(line, current!.bullets);
      continue;
    }

    if (current) entries.push(current);
    // Strip a trailing date range from the project name line.
    const [name] = splitNameAndDate(line);
    current = { name: name === "" ? line : name, bullets: [] };
  }

  if (current) entries.push(current);
  return entries;
}

// ── Education ──

function parseEducationEntries(lines: string[]): IOSEducationEntry[] {
  const entries: IOSEducationEntry[] = [];
  let current: IOSEducationEntry | null = null;
  let expectDegree = false;

  const start = (line: string): IOSEducationEntry => {
    const [institution, dateRange] = splitNameAndDate(line);
    return { institution, dateRange, degree: "", location: "", details: [] };
  };

  for (const line of lines) {
    if (line === "") continue;

    const bullet = asBullet(line);
    if (bullet !== null) {
      current?.details.push(bullet);
      expectDegree = false;
      continue;
    }

    if (current === null) {
      current = start(line);
      expectDegree = true;
    } else if (expectDegree) {
      const [degree, location] = splitTitleAndLocation(line);
      current.degree = degree;
      current.location = location;
      expectDegree = false;
    } else {
      entries.push(current);
      current = start(line);
      expectDegree = true;
    }
  }

  if (current) entries.push(current);
  return entries;
}

// ── Skills ──

function parseSkillsSection(lines: string[]): IOSSkillCategory[] {
  const categories: IOSSkillCategory[] = [];
  for (const line of lines) {
    if (line === "") continue;
    const colon = line.indexOf(":");
    if (colon !== -1) {
      const name = trimWs(line.slice(0, colon));
      const items = trimWs(line.slice(colon + 1));
      if (name && items && length(name) < 40) {
        categories.push({ name, items });
        continue;
      }
    }
    categories.push({ name: "", items: line });
  }
  return categories;
}

// ── Helpers ──

const bulletChars = new Set(["•", "·", "▪", "▸", "◦", "‣", "–", "—"]);

export function asBullet(line: string): string | null {
  const t = trimWs(line);
  const first = [...t][0];
  if (first && bulletChars.has(first)) return trimWs(dropFirstCharacter(t));
  if (t.startsWith("- ") || t.startsWith("* ")) return trimWs(t.slice(2));
  return null;
}

function appendToLastBullet(line: string, bullets: string[]) {
  if (bullets.length === 0) return;
  const continuation = trimWs(line);
  if (!continuation) return;
  bullets[bullets.length - 1] += ` ${continuation}`;
}

function shouldContinuePreviousProjectBullet(line: string, current: IOSProjectEntry | null): boolean {
  if (!current || current.bullets.length === 0) return false;
  const trimmed = trimWs(line);
  if (!trimmed) return false;
  if (splitNameAndDate(trimmed)[1] !== "") return false;
  if (length(trimmed) > 38) return true;
  const first = [...trimmed][0];
  return isLowercaseCharacter(first) || "(),;:/".includes(first);
}

/** Splits "Company Name Feb. 2026 -- Present" into ["Company Name", "Feb. 2026 -- Present"]. */
export function splitNameAndDate(line: string): [string, string] {
  let last: RegExpExecArray | null = null;
  for (const match of line.matchAll(new RegExp(dateSource, "gi"))) last = match as RegExpExecArray;
  if (!last) return [line, ""];
  const date = trimWs(last[0]);
  const name = trimWs(line.slice(0, last.index));
  return name === "" ? [line, ""] : [name, date];
}

/** Splits "Founder & Lead Engineer Remote" into ["Founder & Lead Engineer", "Remote"]. */
function splitTitleAndLocation(line: string): [string, string] {
  const parts = words(line);
  if (parts.length <= 1) return [line, ""];

  // Preserve a complete "City, ST" suffix. PDF text extraction commonly removes column
  // spacing, so "iOS Engineer  San Francisco, CA" arrives as one line. Prefer a known
  // multi-word city, then fall back to the last word.
  const comma = line.lastIndexOf(",");
  if (comma !== -1) {
    const state = trimWs(line.slice(comma + 1));
    const beforeComma = trimWs(line.slice(0, comma));
    if (/^[A-Za-z]{2}$/.test(state)) {
      const lowerBeforeComma = beforeComma.toLowerCase();
      const knownCity = knownLocationsLongestFirst.find((city) => lowerBeforeComma === city || lowerBeforeComma.endsWith(` ${city}`));

      let city = "";
      let rawTitle = "";
      if (knownCity) {
        const chars = [...beforeComma];
        city = chars.slice(chars.length - length(knownCity)).join("");
        rawTitle = chars.slice(0, chars.length - length(knownCity)).join("");
      } else {
        const cityStart = Math.max(...[...beforeComma.matchAll(/\s/g)].map((m) => m.index), -1);
        if (cityStart !== -1) {
          city = beforeComma.slice(cityStart + 1);
          rawTitle = beforeComma.slice(0, cityStart);
        }
      }

      const title = rawTitle.replace(/^[ |–—\-\t]+|[ |–—\-\t]+$/g, "");
      if (title && city) return [title, `${city}, ${state.toUpperCase()}`];
    }
  }

  const lastWord = parts.at(-1)!;
  if (knownLocations.has(lastWord.toLowerCase())) {
    const title = parts.slice(0, -1).join(" ");
    return [title || line, lastWord];
  }
  if (parts.length >= 3) {
    const lastTwo = parts.slice(-2).join(" ");
    if (knownLocations.has(lastTwo.toLowerCase())) {
      const title = parts.slice(0, -2).join(" ");
      return [title || line, lastTwo];
    }
  }
  return [line, ""];
}

// ── Lint helpers for the editor (not part of the app's parser) ──

/** Whether a date range is in a format the parser (and most ATSs) recognize, like "Mar 2022 - Present". */
export function isRecognizedDateRange(value: string): boolean {
  return new RegExp(`^${dateSource}$`, "i").test(trimWs(value));
}

/** The built-in section a heading maps to ("Work History" → "experience"), or null for a custom heading. */
export function headingKey(title: string): string | null {
  const key = sectionAliases[trimWs(title).toLowerCase()];
  return key && ["summary", "experience", "projects", "skills", "education"].includes(key) ? key : null;
}
