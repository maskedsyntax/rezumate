// Ways to start a resume: from an imported file or pasted text, blank, or the sample.

import { emptyDoc, fromIOSDocument, line, newExperience, newEducation, newSkillGroup } from "../core/resume-document.ts";
import { parseResume } from "../core/resume-parser.ts";
import { createResume, type ResumeRecord, type TargetJob } from "../storage/db.ts";
import { sampleJob, sampleResumeText } from "./sample.ts";

export function jobTitle(job: TargetJob): string {
  const role = job.role.trim();
  const company = job.company.trim();
  if (role && company) return `${role} at ${company}`;
  return role || company || "Tailored resume";
}

function titleFor(name: string, fallback: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first ? `${first}'s resume` : fallback;
}

export async function createFromText(text: string, options: { fileName?: string; job?: TargetJob | null; templateId?: string } = {}): Promise<ResumeRecord> {
  const doc = fromIOSDocument(parseResume(text));
  const fromFile = options.fileName?.replace(/\.(pdf|docx)$/i, "").replace(/[_-]+/g, " ").trim();
  const job = options.job?.description.trim() ? options.job : null;
  return createResume({
    title: job ? jobTitle(job) : fromFile || titleFor(doc.contact.name, "Imported resume"),
    doc,
    job,
    templateId: options.templateId
  });
}

export async function createBlank(templateId?: string): Promise<ResumeRecord> {
  const doc = emptyDoc();
  doc.experience = [newExperience()];
  doc.education = [newEducation()];
  doc.skills = [{ ...newSkillGroup(), name: "Skills" }];
  return createResume({ title: "New resume", doc, templateId });
}

export async function createSample(templateId?: string): Promise<ResumeRecord> {
  return createFromText(sampleResumeText, { job: sampleJob, templateId });
}

export { line };
