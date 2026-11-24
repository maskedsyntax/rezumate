// Local-first storage. Resumes live in this browser's IndexedDB and never leave it unless
// the user exports a backup (or, later, turns on encrypted sync).

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import { emptyDoc, newId, type ResumeDoc } from "../core/resume-document.ts";

export type PageSize = "LETTER" | "A4";
export type Density = "comfortable" | "standard" | "compact";

export type ResumeOptions = {
  pageSize: PageSize;
  density: Density;
  /** Text and margin scale set by "fit to one page" (1 or missing means the template as designed). */
  textScale?: number;
};

/** The job a tailored version targets. */
export type TargetJob = { company: string; role: string; description: string };

export type ResumeRecord = {
  id: string;
  title: string;
  doc: ResumeDoc;
  templateId: string;
  options: ResumeOptions;
  /** Set on tailored versions: the resume it was copied from. */
  baseId: string | null;
  job: TargetJob | null;
  createdAt: number;
  updatedAt: number;
};

export type Snapshot = { id: string; resumeId: string; label: string; doc: ResumeDoc; createdAt: number };

export type JobStatus = "saved" | "applied" | "interviewing" | "offer" | "closed";
export type JobRecord = {
  id: string;
  company: string;
  role: string;
  url: string;
  location: string;
  salary: string;
  status: JobStatus;
  description: string;
  notes: string;
  resumeId: string | null;
  appliedAt: number | null;
  followUpAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type CoverLetterRecord = { id: string; resumeId: string; jobId: string | null; body: string; createdAt: number; updatedAt: number };

interface RezumateDB extends DBSchema {
  resumes: { key: string; value: ResumeRecord; indexes: { updatedAt: number } };
  snapshots: { key: string; value: Snapshot; indexes: { resumeId: string } };
  jobs: { key: string; value: JobRecord; indexes: { status: string; updatedAt: number } };
  coverLetters: { key: string; value: CoverLetterRecord; indexes: { resumeId: string } };
  settings: { key: string; value: unknown };
}

const DB_NAME = "rezumate";
const DB_VERSION = 1;
const MAX_SNAPSHOTS = 20;

let dbPromise: Promise<IDBPDatabase<RezumateDB>> | null = null;

function db(): Promise<IDBPDatabase<RezumateDB>> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("This browser can't store resumes locally."));
  dbPromise ??= openDB<RezumateDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      database.createObjectStore("resumes", { keyPath: "id" }).createIndex("updatedAt", "updatedAt");
      database.createObjectStore("snapshots", { keyPath: "id" }).createIndex("resumeId", "resumeId");
      const jobs = database.createObjectStore("jobs", { keyPath: "id" });
      jobs.createIndex("status", "status");
      jobs.createIndex("updatedAt", "updatedAt");
      database.createObjectStore("coverLetters", { keyPath: "id" }).createIndex("resumeId", "resumeId");
      database.createObjectStore("settings");
    }
  });
  return dbPromise;
}

/** Ask the browser not to evict our data under storage pressure. Best effort. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export const defaultOptions: ResumeOptions = { pageSize: "LETTER", density: "standard" };

// ── Resumes ──

export async function listResumes(): Promise<ResumeRecord[]> {
  const all = await (await db()).getAllFromIndex("resumes", "updatedAt");
  return all.reverse();
}

export async function getResume(id: string): Promise<ResumeRecord | undefined> {
  return (await db()).get("resumes", id);
}

export async function createResume(input: Partial<Omit<ResumeRecord, "id" | "createdAt" | "updatedAt">> = {}): Promise<ResumeRecord> {
  const now = Date.now();
  const record: ResumeRecord = {
    id: newId(),
    title: input.title?.trim() || "Untitled resume",
    doc: input.doc ?? emptyDoc(),
    templateId: input.templateId ?? "classic",
    options: input.options ?? defaultOptions,
    baseId: input.baseId ?? null,
    job: input.job ?? null,
    createdAt: now,
    updatedAt: now
  };
  await (await db()).put("resumes", record);
  void requestPersistentStorage();
  return record;
}

export async function saveResume(record: ResumeRecord): Promise<ResumeRecord> {
  const updated = { ...record, updatedAt: Date.now() };
  await (await db()).put("resumes", updated);
  return updated;
}

export async function deleteResume(id: string): Promise<void> {
  const database = await db();
  const tx = database.transaction(["resumes", "snapshots"], "readwrite");
  await tx.objectStore("resumes").delete(id);
  for (const key of await tx.objectStore("snapshots").index("resumeId").getAllKeys(id)) await tx.objectStore("snapshots").delete(key);
  await tx.done;
}

/** Copy a resume, optionally as a version tailored to a job. */
export async function duplicateResume(source: ResumeRecord, overrides: Partial<Pick<ResumeRecord, "title" | "job" | "baseId">> = {}): Promise<ResumeRecord> {
  return createResume({
    title: overrides.title ?? `${source.title} (copy)`,
    doc: structuredClone(source.doc),
    templateId: source.templateId,
    options: { ...source.options },
    baseId: overrides.baseId ?? source.baseId,
    job: overrides.job ?? source.job
  });
}

// ── Snapshots (version history) ──

export async function addSnapshot(resumeId: string, doc: ResumeDoc, label: string): Promise<void> {
  const database = await db();
  await database.put("snapshots", { id: newId(), resumeId, doc: structuredClone(doc), label, createdAt: Date.now() });
  const existing = (await database.getAllFromIndex("snapshots", "resumeId", resumeId)).sort((a, b) => b.createdAt - a.createdAt);
  for (const old of existing.slice(MAX_SNAPSHOTS)) await database.delete("snapshots", old.id);
}

export async function listSnapshots(resumeId: string): Promise<Snapshot[]> {
  return (await (await db()).getAllFromIndex("snapshots", "resumeId", resumeId)).sort((a, b) => b.createdAt - a.createdAt);
}

// ── Settings ──

export async function getSetting<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get("settings", key)) as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await (await db()).put("settings", value, key);
}

// ── Backup ──

export type Backup = {
  app: "rezumate";
  version: 1;
  exportedAt: string;
  resumes: ResumeRecord[];
  snapshots: Snapshot[];
  jobs: JobRecord[];
  coverLetters: CoverLetterRecord[];
};

export async function exportBackup(): Promise<Backup> {
  const database = await db();
  return {
    app: "rezumate",
    version: 1,
    exportedAt: new Date().toISOString(),
    resumes: await database.getAll("resumes"),
    snapshots: await database.getAll("snapshots"),
    jobs: await database.getAll("jobs"),
    coverLetters: await database.getAll("coverLetters")
  };
}

/** Merges a backup into this browser. Records with the same id are replaced by the newer copy. */
export async function importBackup(data: unknown): Promise<{ resumes: number }> {
  const backup = data as Partial<Backup>;
  if (!backup || backup.app !== "rezumate" || backup.version !== 1 || !Array.isArray(backup.resumes)) {
    throw new Error("This file isn't a Rezumate backup.");
  }
  const database = await db();
  const tx = database.transaction(["resumes", "snapshots", "jobs", "coverLetters"], "readwrite");
  let resumes = 0;
  for (const record of backup.resumes) {
    if (!record?.id || !record.doc) continue;
    const existing = await tx.objectStore("resumes").get(record.id);
    if (!existing || existing.updatedAt <= record.updatedAt) {
      await tx.objectStore("resumes").put(record);
      resumes += 1;
    }
  }
  for (const snapshot of backup.snapshots ?? []) if (snapshot?.id) await tx.objectStore("snapshots").put(snapshot);
  for (const job of backup.jobs ?? []) if (job?.id) await tx.objectStore("jobs").put(job);
  for (const letter of backup.coverLetters ?? []) if (letter?.id) await tx.objectStore("coverLetters").put(letter);
  await tx.done;
  return { resumes };
}
