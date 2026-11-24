// "Fit to one page": tries the smallest change first (tighter spacing), then smaller
// text, and stops at the first setting that fits. Text never goes below MIN_BODY_SIZE.

import type { ResumeDoc } from "../core/resume-document.ts";
import type { RenderOptions } from "./ResumePdf.tsx";
import { minTextScale, templateById } from "./templates.ts";

type Density = RenderOptions["density"];
const densities: Density[] = ["comfortable", "standard", "compact"];

/** Counts pages in a PDF made by the renderer, without loading a PDF reader. */
export function countPdfPages(bytes: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(bytes);
  return (text.match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length;
}

/** The settings to try, in order, starting from (and never looser than) the current ones. */
export function fitCandidates(templateId: string, options: RenderOptions): RenderOptions[] {
  const start = Math.max(0, densities.indexOf(options.density));
  const current = options.textScale ?? 1;
  const floor = minTextScale(templateById(templateId));
  const out: RenderOptions[] = [];
  for (const density of densities.slice(start)) out.push({ ...options, density, textScale: current });
  for (let scale = Math.round((current - 0.03) * 100) / 100; scale > floor; scale = Math.round((scale - 0.03) * 100) / 100) {
    out.push({ ...options, density: "compact", textScale: scale });
  }
  if (floor < current) out.push({ ...options, density: "compact", textScale: floor });
  return out.slice(1);
}

export type FitResult = { fits: boolean; options: RenderOptions; pages: number };

export async function fitToOnePage(
  doc: ResumeDoc,
  templateId: string,
  options: RenderOptions,
  render: (doc: ResumeDoc, templateId: string, options: RenderOptions) => Promise<Blob>,
): Promise<FitResult> {
  let last: FitResult = { fits: false, options, pages: Infinity };
  for (const candidate of fitCandidates(templateId, options)) {
    const pages = countPdfPages(new Uint8Array(await (await render(doc, templateId, candidate)).arrayBuffer()));
    last = { fits: pages <= 1, options: candidate, pages };
    if (last.fits) return last;
  }
  return last;
}
