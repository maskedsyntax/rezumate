// "Fit to one page" must shrink only as far as needed, never past the minimum text size,
// and its page counter must agree with a real PDF reader.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import { fromIOSDocument, line, type ResumeDoc } from "../../lib/core/resume-document.ts";
import { parseResume } from "../../lib/core/resume-parser.ts";
import { countPdfPages, fitCandidates, fitToOnePage } from "../../lib/pdf/fit.ts";
import { registerFonts } from "../../lib/pdf/fonts.ts";
import { ResumePdf, type RenderOptions } from "../../lib/pdf/ResumePdf.tsx";
import { MIN_BODY_SIZE, minTextScale, scaleTemplate, templateById, templates } from "../../lib/pdf/templates.ts";

registerFonts(fileURLToPath(new URL("../../public/fonts", import.meta.url)));

const sample = readFileSync(new URL("../../../ios/Tools/parser-parity/cases/one-line-headers.txt", import.meta.url), "utf8");

const render = async (doc: ResumeDoc, templateId: string, options: RenderOptions) =>
  new Blob([new Uint8Array(await renderToBuffer(<ResumePdf doc={doc} template={templateById(templateId)} options={options} />))]);

/** The sample with extra bullets until it spills onto a second page at standard spacing. */
async function slightlyLong(templateId: string): Promise<ResumeDoc> {
  const doc = fromIOSDocument(parseResume(sample));
  for (let i = 0; i < 40; i++) {
    const pages = countPdfPages(new Uint8Array(await (await render(doc, templateId, { pageSize: "LETTER", density: "standard" })).arrayBuffer()));
    if (pages > 1) return doc;
    doc.experience[i % doc.experience.length].bullets.push(line(`Led a cross-team review of release tooling and cut build failures by ${10 + i}% over two quarters`));
  }
  throw new Error("sample never reached two pages");
}

test("the page counter agrees with pdf.js", async () => {
  const doc = await slightlyLong("classic");
  for (const options of [{ pageSize: "LETTER", density: "standard" }, { pageSize: "A4", density: "compact" }] as RenderOptions[]) {
    const bytes = new Uint8Array(await (await render(doc, "classic", options)).arrayBuffer());
    const pdf = await getDocument({ data: bytes.slice() }).promise;
    assert.equal(countPdfPages(bytes), pdf.numPages);
  }
});

test("candidates tighten spacing before shrinking text, and stop at the floor", () => {
  const list = fitCandidates("classic", { pageSize: "LETTER", density: "standard" });
  assert.deepEqual(list[0], { pageSize: "LETTER", density: "compact", textScale: 1 });
  assert.ok(list.slice(1).every((o) => o.density === "compact" && (o.textScale ?? 1) < 1));
  assert.equal(list.at(-1)?.textScale, minTextScale(templateById("classic")));
  for (const t of templates) assert.ok(scaleTemplate(t, 0.5).body.size >= Math.min(t.body.size, MIN_BODY_SIZE) - 0.01, t.id);
});

test("a resume that is slightly too long fits on one page", async () => {
  for (const id of ["classic", "executive"]) {
    const doc = await slightlyLong(id);
    const result = await fitToOnePage(doc, id, { pageSize: "LETTER", density: "standard" }, render);
    assert.ok(result.fits, `${id}: still ${result.pages} pages`);
    assert.equal(result.pages, 1);
  }
});

test("an already-tight resume that can't fit reports it instead of shrinking forever", async () => {
  const doc = fromIOSDocument(parseResume(sample));
  for (let i = 0; i < 80; i++) doc.experience[0].bullets.push(line(`Shipped feature ${i} for the payments team and reduced errors by ${i}%`));
  const result = await fitToOnePage(doc, "compact", { pageSize: "LETTER", density: "compact" }, render);
  assert.equal(result.fits, false);
  assert.ok(result.pages > 1);
  assert.ok((result.options.textScale ?? 1) >= minTextScale(templateById("compact")));
});
