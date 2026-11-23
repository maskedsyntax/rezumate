// Renders each template with the sample resume to public/templates/<id>.png (and .pdf)
// for the marketing pages. Run after changing a template: npm run templates:previews
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createCanvas } from "@napi-rs/canvas";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import { sampleResumeText } from "../lib/app/sample.ts";
import { fromIOSDocument } from "../lib/core/resume-document.ts";
import { parseResume } from "../lib/core/resume-parser.ts";
import { registerFonts } from "../lib/pdf/fonts.ts";
import { ResumePdf } from "../lib/pdf/ResumePdf.tsx";
import { templates } from "../lib/pdf/templates.ts";

const out = fileURLToPath(new URL("../public/templates/", import.meta.url));
mkdirSync(out, { recursive: true });
registerFonts(fileURLToPath(new URL("../public/fonts", import.meta.url)));

const doc = fromIOSDocument(parseResume(sampleResumeText));
doc.contact.headline = "Software Engineer";
const WIDTH = 900;

for (const template of templates) {
  const pdf = await renderToBuffer(<ResumePdf doc={doc} template={template} options={{ pageSize: "LETTER", density: "standard" }} />);
  writeFileSync(`${out}${template.id}.pdf`, pdf);
  const document = await getDocument({ data: new Uint8Array(pdf) }).promise;
  const page = await document.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: WIDTH / base.width });
  const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
  await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;
  writeFileSync(`${out}${template.id}.png`, canvas.toBuffer("image/png"));
  console.log(`${template.id}: ${Math.floor(viewport.width)}x${Math.floor(viewport.height)}`);
}
