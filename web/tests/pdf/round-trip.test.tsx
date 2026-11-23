// Renders each template, reads the PDF back the way the checker does, and checks an ATS
// would recover the same content and score. Run with: npm run test:pdf
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import { analyzeResumePreview } from "../../lib/resume-preview.ts";
import { fromIOSDocument } from "../../lib/core/resume-document.ts";
import { parseResume } from "../../lib/core/resume-parser.ts";
import { documentToText } from "../../lib/core/resume-text.ts";
import { joinPdfTextItems } from "../../lib/extract-resume-file.ts";
import { registerFonts } from "../../lib/pdf/fonts.ts";
import { ResumePdf } from "../../lib/pdf/ResumePdf.tsx";
import { templates } from "../../lib/pdf/templates.ts";

registerFonts(fileURLToPath(new URL("../../public/fonts", import.meta.url)));

const sample = readFileSync(new URL("../../../ios/Tools/parser-parity/cases/one-line-headers.txt", import.meta.url), "utf8");
const job = readFileSync(new URL("../../../ios/Tools/scoring-parity/cases/1-job.txt", import.meta.url), "utf8");

async function pdfText(buffer: Buffer): Promise<string> {
  const document = await getDocument({ data: new Uint8Array(buffer), useSystemFonts: false }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= document.numPages; n++) pages.push(joinPdfTextItems((await (await document.getPage(n)).getTextContent()).items));
  return pages.join("\n");
}

const doc = fromIOSDocument(parseResume(sample));
doc.contact.name = "Łukasz Śmigielski-Jordan";
doc.experience[0].bullets[0].text = "Built an efficient offline sync with Core Data, cutting support tickets by 30%";

for (const template of templates) {
  for (const pageSize of ["LETTER", "A4"] as const) {
    test(`${template.name} (${pageSize}) reads back like the original`, async () => {
      const buffer = await renderToBuffer(<ResumePdf doc={doc} template={template} options={{ pageSize, density: "standard" }} />);
      const text = await pdfText(buffer);

      // Names with extended Latin letters survive, and ligatures read back as plain letters.
      assert.ok(text.toLowerCase().includes("łukasz śmigielski-jordan"), "name");
      // Every heading reads back as one word an ATS can find.
      for (const heading of ["SUMMARY", "EXPERIENCE", "PROJECTS", "SKILLS", "EDUCATION", "CERTIFICATIONS"]) {
        assert.match(text, new RegExp(`^${heading}\\s*$`, "m"), heading);
      }
      assert.ok(text.includes("efficient offline sync"), "ligature text");

      const back = parseResume(text);
      const original = documentToText(doc);
      assert.deepEqual(back.experience.map((e) => e.company), doc.experience.map((e) => e.company));
      assert.deepEqual(back.experience.map((e) => e.dateRange), doc.experience.map((e) => e.dateRange.replace(/[—–]/g, "-")));
      assert.equal(back.experience.flatMap((e) => e.bullets).length, doc.experience.flatMap((e) => e.bullets).length);
      assert.equal(back.email, doc.contact.email);

      const fromPdf = analyzeResumePreview(text, job);
      const fromEditor = analyzeResumePreview(original, job);
      assert.deepEqual(fromPdf.matchedKeywords, fromEditor.matchedKeywords);
      assert.ok(Math.abs((fromPdf.score ?? 0) - (fromEditor.score ?? 0)) <= 1, `score ${fromPdf.score} vs ${fromEditor.score}`);
    });
  }
}
