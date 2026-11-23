"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";

import { createBlank, createFromText, createSample } from "@/lib/app/create";
import { extractResumeFile } from "@/lib/extract-resume-file";

/** Upload, paste, blank, or sample: every way to start a resume. */
export function StartOptions({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [isOver, setIsOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");

  const run = async (label: string, create: () => Promise<{ id: string }>) => {
    setError("");
    setBusy(label);
    try {
      const record = await create();
      router.push(`/app/resumes/${record.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Try again.");
      setBusy(null);
    }
  };

  const importFile = (file: File | undefined) => {
    if (!file) return;
    void run("Reading your resume…", async () => createFromText(await extractResumeFile(file), { fileName: file.name, templateId }));
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsOver(false);
    importFile(event.dataTransfer.files[0]);
  };

  return (
    <div className="start-grid">
      <label
        className={`drop-zone${isOver ? " is-over" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setIsOver(true); }}
        onDragLeave={() => setIsOver(false)}
        onDrop={onDrop}
      >
        <input ref={fileInput} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => importFile(event.target.files?.[0])} disabled={!!busy} />
        <span className="drop-zone-icon" aria-hidden="true">PDF</span>
        <strong>{busy ?? "Drop your current resume"}</strong>
        <span className="muted">PDF or DOCX, up to 8 MB. It&apos;s read in your browser and never uploaded.</span>
        <span className="button small secondary" aria-hidden="true">Choose a file</span>
      </label>

      <div className="start-options">
        {pasting ? (
          <div className="card start-option" style={{ display: "grid", cursor: "default" }}>
            <label className="field">
              <span>Paste your resume text</span>
              <textarea className="textarea" rows={9} value={pasted} onChange={(event) => setPasted(event.target.value)} placeholder={"Your Name\nemail@example.com | City, ST\n\nEXPERIENCE\nCompany  2021 - Present\nRole\n• What you did and the result"} autoFocus />
            </label>
            <div className="popover-actions">
              <button className="button small" type="button" disabled={!pasted.trim() || !!busy} onClick={() => run("Reading…", () => createFromText(pasted, { templateId }))}>Use this text</button>
              <button className="text-button" type="button" onClick={() => setPasting(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="card start-option" type="button" onClick={() => setPasting(true)} disabled={!!busy}>
            <span className="start-option-glyph" aria-hidden="true">¶</span>
            <span><strong>Paste text</strong><span>Copy from Word, Google Docs, or LinkedIn.</span></span>
          </button>
        )}
        <button className="card start-option" type="button" onClick={() => run("Creating…", () => createBlank(templateId))} disabled={!!busy}>
          <span className="start-option-glyph" aria-hidden="true">+</span>
          <span><strong>Start from scratch</strong><span>Fill in a clean, ATS-safe structure.</span></span>
        </button>
        <button className="card start-option" type="button" onClick={() => run("Opening the sample…", () => createSample(templateId))} disabled={!!busy}>
          <span className="start-option-glyph" aria-hidden="true">✦</span>
          <span><strong>Try a sample</strong><span>A resume and job posting to explore with.</span></span>
        </button>
        {error ? <p className="notice error" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
