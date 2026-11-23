// The resume model. `IOS*` types mirror ios/RezumateNative/Models/ResumeDocument.swift
// exactly (what the parser produces). `ResumeDoc` is the web editor's model: the same
// content plus stable ids, section order, hidden sections and custom headings.

export type IOSExperienceEntry = { company: string; dateRange: string; title: string; location: string; bullets: string[] };
export type IOSProjectEntry = { name: string; bullets: string[] };
export type IOSSkillCategory = { name: string; items: string };
export type IOSEducationEntry = { institution: string; dateRange: string; degree: string; location: string; details: string[] };
export type IOSAdditionalSection = { title: string; lines: string[] };

export type IOSResumeDocument = {
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin: string | null;
  github: string | null;
  location: string | null;
  summary: string | null;
  experience: IOSExperienceEntry[];
  projects: IOSProjectEntry[];
  skillCategories: IOSSkillCategory[];
  education: IOSEducationEntry[];
  additionalSections: IOSAdditionalSection[];
  unmappedContent: string[];
};

// ── Web model ──

export type Line = { id: string; text: string };

export type Contact = {
  name: string;
  /** A short line under the name, such as "Senior iOS Engineer". Optional. */
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  /** Stored as written; a bare handle is shown as linkedin.com/in/<handle>. */
  linkedin: string;
  github: string;
};

export type ExperienceEntry = { id: string; company: string; title: string; location: string; dateRange: string; bullets: Line[] };
export type ProjectEntry = { id: string; name: string; link: string; dateRange: string; bullets: Line[] };
export type SkillGroup = { id: string; name: string; items: string };
export type EducationEntry = { id: string; institution: string; degree: string; location: string; dateRange: string; details: Line[] };
export type CustomSection = { id: string; title: string; lines: Line[] };

export type BuiltInSection = "summary" | "experience" | "projects" | "skills" | "education";
/** A built-in section, or `custom:<id>`. */
export type SectionKey = BuiltInSection | `custom:${string}`;

export type ResumeDoc = {
  version: 2;
  contact: Contact;
  summary: string;
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillGroup[];
  education: EducationEntry[];
  custom: CustomSection[];
  /** Render order. Every built-in section and every custom section appears exactly once. */
  sectionOrder: SectionKey[];
  hidden: SectionKey[];
  /** Headings the user renamed. Missing keys use the default heading. */
  titles: Partial<Record<SectionKey, string>>;
  /** Lines from import that weren't placed in a section, for the user to sort. */
  unmapped: string[];
};

export const builtInSections: BuiltInSection[] = ["summary", "experience", "projects", "skills", "education"];

export const defaultTitles: Record<BuiltInSection, string> = {
  summary: "Summary",
  experience: "Experience",
  projects: "Projects",
  skills: "Skills",
  education: "Education"
};

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function line(text = ""): Line {
  return { id: newId(), text };
}

export function emptyContact(): Contact {
  return { name: "", headline: "", email: "", phone: "", location: "", website: "", linkedin: "", github: "" };
}

export function emptyDoc(): ResumeDoc {
  return {
    version: 2,
    contact: emptyContact(),
    summary: "",
    experience: [],
    projects: [],
    skills: [],
    education: [],
    custom: [],
    sectionOrder: [...builtInSections],
    hidden: [],
    titles: {},
    unmapped: []
  };
}

export function newExperience(): ExperienceEntry {
  return { id: newId(), company: "", title: "", location: "", dateRange: "", bullets: [line()] };
}

export function newProject(): ProjectEntry {
  return { id: newId(), name: "", link: "", dateRange: "", bullets: [line()] };
}

export function newSkillGroup(): SkillGroup {
  return { id: newId(), name: "", items: "" };
}

export function newEducation(): EducationEntry {
  return { id: newId(), institution: "", degree: "", location: "", dateRange: "", details: [] };
}

export function customKey(section: CustomSection): SectionKey {
  return `custom:${section.id}`;
}

export function sectionTitle(doc: ResumeDoc, key: SectionKey): string {
  const renamed = doc.titles[key]?.trim();
  if (renamed) return renamed;
  if (key.startsWith("custom:")) return doc.custom.find((section) => customKey(section) === key)?.title || "Section";
  return defaultTitles[key as BuiltInSection];
}

/** Sections in render order, without hidden ones. */
export function visibleSections(doc: ResumeDoc): SectionKey[] {
  return normalizedOrder(doc).filter((key) => !doc.hidden.includes(key));
}

/** The stored order, repaired so every section appears exactly once. */
export function normalizedOrder(doc: ResumeDoc): SectionKey[] {
  const valid = new Set<SectionKey>([...builtInSections, ...doc.custom.map(customKey)]);
  const order = [...new Set(doc.sectionOrder)].filter((key) => valid.has(key));
  for (const key of valid) if (!order.includes(key)) order.push(key);
  return order;
}

export function linkedinDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/linkedin\.com/i.test(trimmed)) return trimmed.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  return `linkedin.com/in/${trimmed}`;
}

export function githubDisplay(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/github\.com/i.test(trimmed)) return trimmed.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
  return `github.com/${trimmed}`;
}

export function websiteDisplay(value: string): string {
  return value.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function hrefFor(display: string): string {
  if (!display) return "";
  if (/^mailto:|^https?:\/\//i.test(display)) return display;
  return `https://${display}`;
}

/** Contact items in display order, with links where they have one. */
export function contactItems(contact: Contact): { text: string; href?: string }[] {
  const items: { text: string; href?: string }[] = [];
  if (contact.email.trim()) items.push({ text: contact.email.trim(), href: `mailto:${contact.email.trim()}` });
  if (contact.phone.trim()) items.push({ text: contact.phone.trim() });
  if (contact.location.trim()) items.push({ text: contact.location.trim() });
  const site = websiteDisplay(contact.website);
  if (site) items.push({ text: site, href: hrefFor(site) });
  const linkedin = linkedinDisplay(contact.linkedin);
  if (linkedin) items.push({ text: linkedin, href: hrefFor(linkedin) });
  const github = githubDisplay(contact.github);
  if (github) items.push({ text: github, href: hrefFor(github) });
  return items;
}

// ── Conversions ──

const lines = (values: string[]) => values.map((text) => line(text));

export function fromIOSDocument(source: IOSResumeDocument): ResumeDoc {
  const doc = emptyDoc();
  doc.contact = {
    ...emptyContact(),
    name: source.name,
    email: source.email ?? "",
    phone: source.phone ?? "",
    location: source.location ?? "",
    website: source.website ?? "",
    linkedin: source.linkedin ?? "",
    github: source.github ?? ""
  };
  doc.summary = source.summary ?? "";
  doc.experience = source.experience.map((entry) => ({ id: newId(), ...entry, bullets: lines(entry.bullets) }));
  doc.projects = source.projects.map((entry) => ({ id: newId(), name: entry.name, link: "", dateRange: "", bullets: lines(entry.bullets) }));
  doc.skills = source.skillCategories.map((group) => ({ id: newId(), ...group }));
  doc.education = source.education.map((entry) => ({ id: newId(), ...entry, details: lines(entry.details) }));
  doc.custom = source.additionalSections.map((section) => ({ id: newId(), title: toTitleCase(section.title), lines: lines(section.lines) }));
  doc.sectionOrder = [...builtInSections, ...doc.custom.map(customKey)];
  doc.unmapped = [...source.unmappedContent];
  return doc;
}

export function toIOSDocument(doc: ResumeDoc): IOSResumeDocument {
  const text = (value: string) => value.trim() || null;
  return {
    name: doc.contact.name,
    email: text(doc.contact.email),
    phone: text(doc.contact.phone),
    website: text(doc.contact.website),
    linkedin: text(doc.contact.linkedin),
    github: text(doc.contact.github),
    location: text(doc.contact.location),
    summary: text(doc.summary),
    experience: doc.experience.map(({ company, dateRange, title, location, bullets }) => ({ company, dateRange, title, location, bullets: bullets.map((b) => b.text) })),
    projects: doc.projects.map(({ name, bullets }) => ({ name, bullets: bullets.map((b) => b.text) })),
    skillCategories: doc.skills.map(({ name, items }) => ({ name, items })),
    education: doc.education.map(({ institution, dateRange, degree, location, details }) => ({ institution, dateRange, degree, location, details: details.map((d) => d.text) })),
    additionalSections: doc.custom.map(({ title, lines: values }) => ({ title, lines: values.map((l) => l.text) })),
    unmappedContent: [...doc.unmapped]
  };
}

/** "CERTIFICATIONS" reads better as "Certifications" in an editor; mixed-case titles are kept. */
function toTitleCase(title: string): string {
  if (title !== title.toUpperCase()) return title;
  return title.toLowerCase().replace(/(^|[\s/&-])(\p{L})/gu, (_, sep: string, char: string) => sep + char.toUpperCase());
}
