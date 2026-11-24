"use client";

import { useEffect, useRef, useState } from "react";

import type { ResumeDoc } from "@/lib/core/resume-document";
import { addSnapshot, listSnapshots, type Snapshot } from "@/lib/storage/db";

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function when(at: number): string {
  const minutes = Math.round((at - Date.now()) / 60000);
  if (minutes > -1) return "Just now";
  if (minutes > -60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours > -24) return relative.format(hours, "hour");
  return new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function summary(doc: ResumeDoc): string {
  const bullets = doc.experience.reduce((n, e) => n + e.bullets.filter((b) => b.text.trim()).length, 0)
    + doc.projects.reduce((n, p) => n + p.bullets.filter((b) => b.text.trim()).length, 0);
  const roles = doc.experience.length;
  return `${roles} ${roles === 1 ? "role" : "roles"}, ${bullets} ${bullets === 1 ? "bullet" : "bullets"}`;
}

/**
 * Saved versions of this resume: one when it's opened (at most every 30 minutes), one on
 * every PDF download, and any saved by hand. Restoring is itself undoable.
 */
export function HistoryMenu({ resumeId, doc, onRestore, toast }: { resumeId: string; doc: ResumeDoc; onRestore: (doc: ResumeDoc) => void; toast: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Snapshot[] | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listSnapshots(resumeId).then((list) => { if (!cancelled) setVersions(list); }).catch(() => { if (!cancelled) setVersions([]); });
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open, resumeId]);

  const current = JSON.stringify(doc);

  const saveNow = async () => {
    try {
      await addSnapshot(resumeId, doc, "Saved by you");
      setVersions(await listSnapshots(resumeId));
      toast("Version saved");
    } catch {
      toast("Couldn't save a version.");
    }
  };

  const restore = async (version: Snapshot) => {
    try {
      await addSnapshot(resumeId, doc, "Before restoring");
    } catch {
      // Undo still covers this restore even if the safety copy fails.
    }
    onRestore(version.doc);
    setOpen(false);
    toast(`Restored the version from ${when(version.createdAt).toLowerCase()}. Undo with ⌘Z.`);
  };

  return (
    <div className="template-menu" ref={root}>
      <button className="button small secondary" type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        History ▾
      </button>
      {open ? (
        <div className="template-list history-list" aria-label="Version history">
          <button className="button small" type="button" onClick={saveNow}>Save this version</button>
          {versions === null ? <span className="field-hint">Loading…</span> : null}
          {versions?.length === 0 ? <span className="field-hint">No saved versions yet. One is kept each time you open or download this resume.</span> : null}
          {versions?.map((version) => {
            const same = JSON.stringify(version.doc) === current;
            return (
              <div className="history-item" key={version.id}>
                <div>
                  <strong>{version.label}</strong>
                  <span>{when(version.createdAt)} · {summary(version.doc)}</span>
                </div>
                {same
                  ? <span className="chip matched">Current</span>
                  : <button className="text-button" type="button" onClick={() => void restore(version)}>Restore</button>}
              </div>
            );
          })}
          <span className="field-hint">Versions are kept in this browser, up to 20 per resume.</span>
        </div>
      ) : null}
    </div>
  );
}
