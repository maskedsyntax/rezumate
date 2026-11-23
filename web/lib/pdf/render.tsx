// Renders a resume to a PDF blob. Import this lazily: it pulls in the PDF engine.

import { pdf } from "@react-pdf/renderer";

import type { ResumeDoc } from "../core/resume-document.ts";
import { registerFonts } from "./fonts.ts";
import { ResumePdf, type RenderOptions } from "./ResumePdf.tsx";
import { templateById } from "./templates.ts";

export async function renderResumePdf(doc: ResumeDoc, templateId: string, options: RenderOptions): Promise<Blob> {
  registerFonts("/fonts");
  return pdf(<ResumePdf doc={doc} template={templateById(templateId)} options={options} />).toBlob();
}

export function pdfFilename(doc: ResumeDoc): string {
  const words = doc.contact.name.split(/[^\p{L}\p{N}_-]+/u).filter(Boolean).slice(0, 5);
  return `${words.length ? words.join("-") : "Resume"}-Resume.pdf`;
}
