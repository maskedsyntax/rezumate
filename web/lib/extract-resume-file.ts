const MAX_FILE_BYTES = 8 * 1024 * 1024;

export async function extractResumeFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Choose a PDF or DOCX smaller than 8 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return extractPdf(file);
  if (extension === "docx") return extractDocx(file);
  throw new Error("Choose a text-based PDF or DOCX resume.");
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const pdf = await loadingTask.promise;
    if (pdf.numPages > 15) throw new Error("This PDF has more than 15 pages. Choose a shorter resume.");
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let pageText = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        pageText += item.str;
        pageText += item.hasEOL ? "\n" : " ";
      }
      pages.push(pageText.trim());
    }
    const text = pages.join("\n").trim();
    if (text.length < 40) throw new Error("No usable text was found. Scanned or image-only PDFs need a text-based version.");
    return text;
  } catch (cause) {
    if (cause instanceof Error && (cause.message.includes("more than 15 pages") || cause.message.includes("No usable text"))) throw cause;
    throw new Error("This PDF could not be read. Try exporting it again as a text-based PDF or DOCX.");
  } finally {
    await loadingTask.destroy();
  }
}

async function extractDocx(file: File): Promise<string> {
  const { unzipSync } = await import("fflate");
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: (entry) => entry.name === "word/document.xml" && entry.originalSize <= 4 * 1024 * 1024
    });
  } catch {
    throw new Error("This DOCX could not be read. Try exporting it again as a standard DOCX or PDF.");
  }
  const documentXml = files["word/document.xml"];
  if (!documentXml) throw new Error("This DOCX has no readable document text.");
  const document = new DOMParser().parseFromString(new TextDecoder().decode(documentXml), "application/xml");
  if (document.querySelector("parsererror")) throw new Error("This DOCX contains invalid document text.");
  const wordNamespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const paragraphs = [...document.getElementsByTagNameNS(wordNamespace, "p")];
  const text = paragraphs.map((paragraph) => {
    let line = "";
    for (const element of [...paragraph.getElementsByTagName("*")]) {
      if (element.namespaceURI !== wordNamespace) continue;
      if (element.localName === "t") line += element.textContent ?? "";
      if (element.localName === "tab") line += "\t";
      if (element.localName === "br") line += "\n";
    }
    return line;
  }).join("\n").trim();
  if (text.length < 40) throw new Error("No usable text was found in this DOCX.");
  return text;
}
