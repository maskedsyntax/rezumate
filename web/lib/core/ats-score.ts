// Scores the editor's document with the same engine as the checker and the iPhone app.
import { analyzeResumePreview, type PreviewAnalysis } from "../resume-preview.ts";
import type { ResumeDoc } from "./resume-document.ts";
import { documentToText } from "./resume-text.ts";

export { analyzeResumePreview, displayName, extractKeywords, hasImpactSignal, isWeakBullet, scoreVersion, type PreviewAnalysis } from "../resume-preview.ts";

export type ScoreResult = { ok: true; analysis: PreviewAnalysis } | { ok: false; error: string };

/** Never throws: incomplete inputs come back as a message to show instead of a score. */
export function scoreDocument(doc: ResumeDoc, jobDescription: string): ScoreResult {
  try {
    return { ok: true, analysis: analyzeResumePreview(documentToText(doc), jobDescription) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "This resume couldn't be scored." };
  }
}
