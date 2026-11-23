"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ResumeDoc } from "@/lib/core/resume-document";
import { getResume, saveResume, type ResumeRecord } from "@/lib/storage/db";

export type SaveState = "saved" | "saving" | "unsaved" | "error";
export type Mutator = (doc: ResumeDoc) => void;

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1200;
const SAVE_DELAY_MS = 500;

/**
 * Loads one resume and keeps it in sync with IndexedDB. Document edits go through
 * `update`, which records undo history; typing in one field within a moment of the last
 * keystroke merges into a single undo step.
 */
export function useResumeEditor(id: string) {
  const [record, setRecord] = useState<ResumeRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  // Undo history lives in refs (updated outside React's state updaters); `historyVersion`
  // only triggers a re-render so canUndo/canRedo stay current.
  const past = useRef<ResumeDoc[]>([]);
  const future = useRef<ResumeDoc[]>([]);
  const [, setHistoryVersion] = useState(0);
  const bumpHistory = () => setHistoryVersion((v) => v + 1);

  const recordRef = useRef<ResumeRecord | null>(null);
  const lastEdit = useRef<{ key: string; at: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dirty = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getResume(id)
      .then((found) => {
        if (cancelled) return;
        if (!found) { setStatus("missing"); return; }
        recordRef.current = found;
        setRecord(found);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));
    return () => { cancelled = true; };
  }, [id]);

  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current);
    const current = recordRef.current;
    if (!current || !dirty.current) return;
    dirty.current = false;
    setSaveState("saving");
    try {
      const saved = await saveResume(current);
      // Keep the newer in-memory copy if the user kept typing while we saved.
      if (recordRef.current === current) recordRef.current = saved;
      setSaveState(dirty.current ? "unsaved" : "saved");
    } catch {
      dirty.current = true;
      setSaveState("error");
    }
  }, []);

  const commit = useCallback((next: ResumeRecord) => {
    recordRef.current = next;
    setRecord(next);
    dirty.current = true;
    setSaveState("unsaved");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
  }, [flush]);

  // Save before the tab is hidden or closed.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") void flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  /** Edit the document. Pass `coalesce` (e.g. a field id) to merge rapid edits into one undo step. */
  const update = useCallback((mutate: Mutator, coalesce?: string) => {
    const current = recordRef.current;
    if (!current) return;
    const nextDoc = structuredClone(current.doc);
    mutate(nextDoc);
    const now = Date.now();
    const merge = coalesce !== undefined && lastEdit.current?.key === coalesce && now - lastEdit.current.at < COALESCE_MS;
    if (!merge) past.current = [...past.current.slice(-(HISTORY_LIMIT - 1)), current.doc];
    future.current = [];
    bumpHistory();
    lastEdit.current = coalesce !== undefined ? { key: coalesce, at: now } : null;
    commit({ ...current, doc: nextDoc });
  }, [commit]);

  /** Change record settings (title, template, page options, job). Not part of undo. */
  const patch = useCallback((changes: Partial<Omit<ResumeRecord, "id" | "doc">>) => {
    const current = recordRef.current;
    if (current) commit({ ...current, ...changes });
  }, [commit]);

  const undo = useCallback(() => {
    const current = recordRef.current;
    if (!current) return;
    const previous = past.current.at(-1);
    if (!previous) return;
    past.current = past.current.slice(0, -1);
    future.current = [current.doc, ...future.current];
    lastEdit.current = null;
    bumpHistory();
    commit({ ...current, doc: previous });
  }, [commit]);

  const redo = useCallback(() => {
    const current = recordRef.current;
    if (!current) return;
    const [next, ...rest] = future.current;
    if (!next) return;
    future.current = rest;
    past.current = [...past.current, current.doc];
    lastEdit.current = null;
    bumpHistory();
    commit({ ...current, doc: next });
  }, [commit]);

  return { record, status, saveState, update, patch, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0, flush };
}
