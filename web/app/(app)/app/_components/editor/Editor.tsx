"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { normalizedOrder } from "@/lib/core/resume-document";
import { addSnapshot, type Density } from "@/lib/storage/db";
import { useToast } from "../useToast";
import { HistoryMenu } from "./HistoryMenu";
import { MatchPane } from "./MatchPane";
import { PreviewPane } from "./PreviewPane";
import { ContactForm, SectionForm } from "./SectionForms";
import { SectionRail } from "./SectionRail";
import { TemplateMenu } from "./TemplateMenu";
import { useResumeEditor, type SaveState } from "./useResumeEditor";

type SideTab = "preview" | "match";
type View = "edit" | SideTab;

const saveLabels: Record<SaveState, string> = { saved: "Saved on this device", saving: "Saving…", unsaved: "Saving…", error: "Couldn't save. Retrying on next edit." };
const densityLabels: Record<Density, string> = { comfortable: "Roomy", standard: "Standard", compact: "Compact" };

export function Editor({ id }: { id: string }) {
  const { record, status, saveState, update, replaceDoc, patch, undo, redo, canUndo, canRedo, flush } = useResumeEditor(id);
  const [side, setSide] = useState<SideTab>("preview");
  const [view, setView] = useState<View>("edit");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [fitting, setFitting] = useState(false);
  const [toast, showToast] = useToast();

  // ?tab=match opens the match panel (from "Tailor for a job" and the checker).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tab") === "match") {
      setSide("match");
      setView("match");
    }
  }, []);

  // ⌘Z / ⇧⌘Z everywhere except inside a text field, where the browser's own undo applies first.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea")) return;
      event.preventDefault();
      if (event.shiftKey) redo(); else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const focusBullet = useCallback((lineId: string) => {
    setView("edit");
    setFocusId(null);
    requestAnimationFrame(() => setFocusId(lineId));
  }, []);

  if (status === "loading") return <main className="app-main"><div className="app-loading">Opening your resume…</div></main>;
  if (status !== "ready" || !record) {
    return (
      <main className="app-main">
        <p className="notice error" role="alert">
          {status === "missing" ? "This resume isn't saved in this browser. It may have been deleted, or it was made on another device." : "Local storage isn't available in this browser."}
        </p>
        <p style={{ marginTop: 16 }}><Link className="button small" href="/app">Back to your resumes</Link></p>
      </main>
    );
  }

  const doc = record.doc;

  const exportPdf = async () => {
    setExporting(true);
    try {
      await flush();
      const { renderResumePdf, pdfFilename } = await import("@/lib/pdf/render");
      const blob = await renderResumePdf(doc, record.templateId, record.options);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = pdfFilename(doc);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      void addSnapshot(record.id, doc, "Exported PDF");
      showToast("PDF downloaded");
    } catch {
      showToast("The PDF couldn't be created. Try again.");
    } finally {
      setExporting(false);
    }
  };

  const fitToPage = async () => {
    setFitting(true);
    try {
      const [{ renderResumePdf }, { fitToOnePage }] = await Promise.all([import("@/lib/pdf/render"), import("@/lib/pdf/fit")]);
      const result = await fitToOnePage(doc, record.templateId, record.options, renderResumePdf);
      if (result.fits) {
        patch({ options: { ...record.options, ...result.options } });
        const scale = result.options.textScale ?? 1;
        const spacing = densityLabels[result.options.density].toLowerCase();
        showToast(scale < 1 ? `Fits on one page: ${spacing} spacing, text at ${Math.round(scale * 100)}%` : `Fits on one page with ${spacing} spacing`);
      } else {
        showToast("Still too long at the smallest readable size. Cut older or weaker bullets to fit.");
      }
    } catch {
      showToast("Couldn't fit the page. Try again.");
    } finally {
      setFitting(false);
    }
  };

  const sideContent = side === "preview"
    ? <PreviewPane
        doc={doc}
        templateId={record.templateId}
        options={record.options}
        fit={{ fitting, onFit: fitToPage, onResetScale: () => patch({ options: { ...record.options, textScale: 1 } }) }}
      />
    : <MatchPane doc={doc} job={record.job} onJob={(job) => patch({ job })} update={update} onFocusBullet={focusBullet} toast={showToast} />;

  return (
    <main className="editor" data-view={view}>
      <div className="editor-bar">
        <Link className="icon-button" href="/app" aria-label="All resumes" title="All resumes">←</Link>
        <input className="editor-title" value={record.title} aria-label="Resume name" onChange={(event) => patch({ title: event.target.value })} />
        <span className="save-state" aria-live="polite">{saveLabels[saveState]}</span>
        <div className="editor-bar-group">
          <button className="icon-button" type="button" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (⌘Z)">↶</button>
          <button className="icon-button" type="button" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (⇧⌘Z)">↷</button>
          <HistoryMenu resumeId={record.id} doc={doc} onRestore={replaceDoc} toast={showToast} />
        </div>
        <div className="editor-bar-end">
          <TemplateMenu value={record.templateId} onChange={(templateId) => patch({ templateId })} />
          <div className="segmented" role="group" aria-label="Page size">
            {(["LETTER", "A4"] as const).map((size) => (
              <button key={size} type="button" aria-pressed={record.options.pageSize === size} onClick={() => patch({ options: { ...record.options, pageSize: size } })}>{size === "LETTER" ? "Letter" : "A4"}</button>
            ))}
          </div>
          <label className="sr-only" htmlFor="density">Spacing</label>
          <select id="density" className="select" style={{ width: "auto", padding: "6px 8px", fontSize: 12 }} value={record.options.density} onChange={(event) => patch({ options: { ...record.options, density: event.target.value as Density } })}>
            {(Object.keys(densityLabels) as Density[]).map((d) => <option key={d} value={d}>{densityLabels[d]}</option>)}
          </select>
          <button className="button small yellow" type="button" onClick={exportPdf} disabled={exporting}>{exporting ? "Creating PDF…" : "Download PDF"}</button>
        </div>
      </div>

      <div className="mobile-tabs">
        <div className="segmented" role="tablist" aria-label="Editor view">
          {(["edit", "preview", "match"] as const).map((tab) => (
            <button key={tab} type="button" role="tab" aria-selected={view === tab} onClick={() => { setView(tab); if (tab !== "edit") setSide(tab); }}>
              {tab === "edit" ? "Edit" : tab === "preview" ? "Preview" : "Job match"}
            </button>
          ))}
        </div>
      </div>

      <SectionRail doc={doc} update={update} />

      <div className="editor-form">
        <div className="editor-form-inner">
          {doc.unmapped.length ? (
            <section className="card form-section unmapped" aria-label="Lines to sort">
              <div className="form-section-head"><h2>Sort these lines</h2></div>
              <p style={{ margin: "0 0 12px", fontSize: 13 }}>These lines from your file didn&apos;t fit a section. Place them, or dismiss what you don&apos;t need.</p>
              <div className="form-grid">
                {doc.unmapped.map((text, index) => (
                  <div className="unmapped-line" key={`${index}-${text}`}>
                    <span>{text}</span>
                    <button className="text-button" type="button" onClick={() => update((d) => { d.contact.headline ||= text; d.unmapped.splice(index, 1); })} disabled={!!doc.contact.headline}>Use as headline</button>
                    <button className="text-button" type="button" onClick={() => update((d) => { d.summary = [d.summary.trim(), text].filter(Boolean).join(" "); d.unmapped.splice(index, 1); })}>Add to summary</button>
                    <button className="text-button danger" type="button" onClick={() => update((d) => { d.unmapped.splice(index, 1); })}>Dismiss</button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <ContactForm contact={doc.contact} update={update} />
          {normalizedOrder(doc).map((key) => <SectionForm key={key} sectionKey={key} doc={doc} update={update} focusId={focusId} />)}
        </div>
      </div>

      <aside className="editor-side" aria-label={side === "preview" ? "PDF preview" : "Job match"}>
        <div className="side-tabs">
          <div className="segmented" role="tablist" aria-label="Side panel">
            <button type="button" role="tab" aria-selected={side === "preview"} onClick={() => setSide("preview")}>Preview</button>
            <button type="button" role="tab" aria-selected={side === "match"} onClick={() => setSide("match")}>Job match</button>
          </div>
          {record.job ? <span className="chip partial" style={{ marginLeft: "auto" }}>Tailored</span> : null}
        </div>
        <div className="side-body">{sideContent}</div>
      </aside>
      {toast}
    </main>
  );
}
