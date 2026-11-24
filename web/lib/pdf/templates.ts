// Resume templates. Every template shares one ATS-safe layout (single column, real
// selectable text, standard headings, no tables, icons, or images) and differs only in
// typography and spacing, so none of them can drift into something an ATS can't read.
// There is deliberately no letter-spacing: tracked text extracts as "E X P E R I E N C E".

export type FontKey = "sans" | "serif";

export type TemplateSpec = {
  id: string;
  name: string;
  description: string;
  /** Needs Rezumate Pro to export. Free templates are always free. */
  pro: boolean;
  font: FontKey;
  margin: number;
  nameStyle: { size: number; weight: 600 | 700; align: "center" | "left"; uppercase: boolean };
  headline: { size: number };
  contact: { size: number; align: "center" | "left"; separator: string };
  heading: { size: number; uppercase: boolean; rule: { width: number; color: string } | null; gapBefore: number; gapAfter: number };
  body: { size: number; lineHeight: number };
  meta: { size: number };
  entryGap: number;
  bulletGap: number;
  bulletIndent: number;
  colors: { text: string; muted: string };
};

const classic: TemplateSpec = {
  // Matches the iPhone app's PDF (LaTeXStylePDFRenderer.swift): Letter, 0.5in margins,
  // centered name, 2pt light-grey rules, dates and locations right-aligned.
  id: "classic",
  name: "Classic",
  description: "The LaTeX-style layout from the iPhone app. Centered header, light rules, dates on the right.",
  pro: false,
  font: "sans",
  margin: 36,
  nameStyle: { size: 18, weight: 700, align: "center", uppercase: false },
  headline: { size: 10 },
  contact: { size: 8, align: "center", separator: "  |  " },
  heading: { size: 11, uppercase: true, rule: { width: 2, color: "#d4d4d4" }, gapBefore: 8, gapAfter: 7 },
  body: { size: 10, lineHeight: 1.25 },
  meta: { size: 8.5 },
  entryGap: 4,
  bulletGap: 1.5,
  bulletIndent: 12,
  colors: { text: "#141414", muted: "#4d4d4d" }
};

const modern: TemplateSpec = {
  id: "modern",
  name: "Modern",
  description: "Left-aligned header with room for a headline, and thin ink rules under each heading.",
  pro: false,
  font: "sans",
  margin: 42,
  nameStyle: { size: 22, weight: 700, align: "left", uppercase: false },
  headline: { size: 11 },
  contact: { size: 8.5, align: "left", separator: "  ·  " },
  heading: { size: 9.5, uppercase: true, rule: { width: 0.75, color: "#141414" }, gapBefore: 12, gapAfter: 7 },
  body: { size: 10, lineHeight: 1.3 },
  meta: { size: 9 },
  entryGap: 7,
  bulletGap: 2,
  bulletIndent: 11,
  colors: { text: "#141414", muted: "#555555" }
};

const compact: TemplateSpec = {
  id: "compact",
  name: "Compact",
  description: "Tighter type and spacing for a dense, one-page resume.",
  pro: true,
  font: "sans",
  margin: 28,
  nameStyle: { size: 16, weight: 700, align: "center", uppercase: true },
  headline: { size: 9 },
  contact: { size: 7.5, align: "center", separator: "  |  " },
  heading: { size: 9.5, uppercase: true, rule: { width: 1, color: "#9a9a9a" }, gapBefore: 6, gapAfter: 4 },
  body: { size: 9, lineHeight: 1.2 },
  meta: { size: 8 },
  entryGap: 3,
  bulletGap: 0.5,
  bulletIndent: 10,
  colors: { text: "#141414", muted: "#4d4d4d" }
};

const executive: TemplateSpec = {
  id: "executive",
  name: "Executive",
  description: "IBM Plex Serif with a larger name and generous spacing for senior roles.",
  pro: true,
  font: "serif",
  margin: 48,
  nameStyle: { size: 24, weight: 600, align: "center", uppercase: false },
  headline: { size: 11.5 },
  contact: { size: 9, align: "center", separator: "  ·  " },
  heading: { size: 11, uppercase: true, rule: { width: 0.5, color: "#141414" }, gapBefore: 12, gapAfter: 8 },
  body: { size: 10.5, lineHeight: 1.3 },
  meta: { size: 9.5 },
  entryGap: 7,
  bulletGap: 2,
  bulletIndent: 12,
  colors: { text: "#141414", muted: "#4d4d4d" }
};

export const templates: TemplateSpec[] = [classic, modern, compact, executive];

export function templateById(id: string): TemplateSpec {
  return templates.find((template) => template.id === id) ?? classic;
}

export const densityScale = { comfortable: 1.25, standard: 1, compact: 0.75 } as const;

/** Smallest body text "fit to one page" will go to, in points. */
export const MIN_BODY_SIZE = 8.5;
/** Smallest page margin "fit to one page" will go to, in points (about 0.4in). */
export const MIN_MARGIN = 28;

/** The lowest text scale a template allows before body text gets too small to read. */
export function minTextScale(spec: TemplateSpec): number {
  return Math.min(1, Math.max(0.85, MIN_BODY_SIZE / spec.body.size));
}

/** Scales a template's type and margins together, for "fit to one page". */
export function scaleTemplate(spec: TemplateSpec, scale: number): TemplateSpec {
  const f = Math.min(1, Math.max(minTextScale(spec), scale));
  if (f === 1) return spec;
  const size = (n: number) => Math.round(n * f * 100) / 100;
  return {
    ...spec,
    margin: Math.max(Math.min(spec.margin, MIN_MARGIN), Math.round(spec.margin * f)),
    nameStyle: { ...spec.nameStyle, size: size(spec.nameStyle.size) },
    headline: { size: size(spec.headline.size) },
    contact: { ...spec.contact, size: size(spec.contact.size) },
    heading: { ...spec.heading, size: size(spec.heading.size) },
    body: { ...spec.body, size: size(spec.body.size) },
    meta: { size: size(spec.meta.size) },
  };
}
