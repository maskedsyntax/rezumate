// Turns the editor's document into plain resume text in the layout the parser reads back
// (name, contact line, UPPERCASE headings, "Company  Date", "Title Location", "• bullet").
// Scoring and AI requests use this text, so the editor scores a resume the same way the
// checker scores its exported PDF.

import { contactItems, sectionTitle, visibleSections, type ResumeDoc, type SectionKey } from "./resume-document.ts";

const joinNonEmpty = (parts: string[], separator: string) => parts.map((part) => part.trim()).filter(Boolean).join(separator);

function sectionLines(doc: ResumeDoc, key: SectionKey): string[] {
  const out: string[] = [];
  const bullet = (text: string) => { if (text.trim()) out.push(`• ${text.trim()}`); };

  switch (key) {
    case "summary":
      if (doc.summary.trim()) out.push(doc.summary.trim().replace(/\s*\n+\s*/g, " "));
      break;
    case "experience":
      for (const entry of doc.experience) {
        const first = entry.company.trim() || entry.title.trim();
        if (!first && entry.bullets.every((b) => !b.text.trim())) continue;
        out.push(joinNonEmpty([first, entry.dateRange], "  "));
        if (entry.company.trim() && entry.title.trim()) out.push(joinNonEmpty([entry.title, entry.location], " "));
        entry.bullets.forEach((b) => bullet(b.text));
      }
      break;
    case "projects":
      for (const entry of doc.projects) {
        if (entry.name.trim()) out.push(joinNonEmpty([entry.name, entry.dateRange], "  "));
        entry.bullets.forEach((b) => bullet(b.text));
      }
      break;
    case "skills":
      for (const group of doc.skills) {
        if (!group.items.trim()) continue;
        out.push(group.name.trim() ? `${group.name.trim()}: ${group.items.trim()}` : group.items.trim());
      }
      break;
    case "education":
      for (const entry of doc.education) {
        if (!entry.institution.trim() && !entry.degree.trim()) continue;
        out.push(joinNonEmpty([entry.institution || entry.degree, entry.dateRange], "  "));
        if (entry.institution.trim() && entry.degree.trim()) out.push(joinNonEmpty([entry.degree, entry.location], " "));
        entry.details.forEach((d) => bullet(d.text));
      }
      break;
    default: {
      const section = doc.custom.find((candidate) => `custom:${candidate.id}` === key);
      for (const l of section?.lines ?? []) if (l.text.trim()) out.push(l.text.trim());
    }
  }
  return out;
}

export function documentToText(doc: ResumeDoc): string {
  const out: string[] = [];
  if (doc.contact.name.trim()) out.push(doc.contact.name.trim());
  if (doc.contact.headline.trim()) out.push(doc.contact.headline.trim());
  const contact = contactItems(doc.contact).map((item) => item.text);
  if (contact.length) out.push(contact.join(" | "));

  for (const key of visibleSections(doc)) {
    const body = sectionLines(doc, key);
    if (body.length === 0) continue;
    out.push("", sectionTitle(doc, key).toUpperCase(), ...body);
  }
  return out.join("\n");
}

/** Every bullet in the document with where it lives, for linting and AI. */
export function allBullets(doc: ResumeDoc): { section: SectionKey; entryId: string; lineId: string; text: string }[] {
  const result: { section: SectionKey; entryId: string; lineId: string; text: string }[] = [];
  for (const entry of doc.experience) for (const b of entry.bullets) result.push({ section: "experience", entryId: entry.id, lineId: b.id, text: b.text });
  for (const entry of doc.projects) for (const b of entry.bullets) result.push({ section: "projects", entryId: entry.id, lineId: b.id, text: b.text });
  return result.filter((item) => item.text.trim());
}
