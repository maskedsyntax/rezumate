"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { jobTitle } from "@/lib/app/create";
import { scoreDocument } from "@/lib/core/ats-score";
import { APP_STORE_URL } from "@/lib/app-store";
import { templateById } from "@/lib/pdf/templates";
import { deleteResume, duplicateResume, exportBackup, importBackup, listResumes, type ResumeRecord } from "@/lib/storage/db";
import { StartOptions } from "./StartOptions";
import { useToast } from "./useToast";

function relativeTime(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ResumeCard({ record, onDuplicate, onTailor, onDelete }: { record: ResumeRecord; onDuplicate: () => void; onTailor: () => void; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const score = record.job?.description ? scoreDocument(record.doc, record.job.description) : null;
  const shown = score?.ok ? score.analysis.score : null;
  const contact = record.doc.contact;
  return (
    <article className="card resume-card">
      <Link className="resume-card-paper" href={`/app/resumes/${record.id}`} aria-label={`Open ${record.title}`}>
        <strong>{contact.name || "Your name"}</strong>
        <span>{contact.headline || record.doc.experience[0]?.title || [contact.email, contact.location].filter(Boolean).join(" · ") || "No details yet"}</span>
        {shown !== null && shown !== undefined ? <span className="resume-card-score" title="Job match score">{shown}</span> : null}
      </Link>
      <div className="resume-card-body">
        <div className="resume-card-title">{record.title}</div>
        <div className="chips">
          <span className="chip">{templateById(record.templateId).name}</span>
          {record.job ? <span className="chip partial" title="Tailored for this job">{jobTitle(record.job)}</span> : null}
        </div>
        <div className="resume-card-meta">Edited {relativeTime(record.updatedAt)}</div>
        {confirming ? (
          <div className="confirm-strip" role="alert">
            Delete this resume from this browser?
            <button className="button small" type="button" onClick={onDelete}>Delete</button>
            <button className="text-button" type="button" onClick={() => setConfirming(false)}>Keep</button>
          </div>
        ) : (
          <div className="resume-card-actions">
            <Link className="button small" href={`/app/resumes/${record.id}`}>Open</Link>
            <button className="text-button" type="button" onClick={onTailor}>Tailor for a job</button>
            <button className="text-button" type="button" onClick={onDuplicate}>Duplicate</button>
            <button className="text-button danger" type="button" onClick={() => setConfirming(true)}>Delete</button>
          </div>
        )}
      </div>
    </article>
  );
}

export function Dashboard() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeRecord[] | null>(null);
  const [error, setError] = useState("");
  const [toast, showToast] = useToast();
  const backupInput = useRef<HTMLInputElement>(null);

  const refresh = () => listResumes().then(setResumes).catch((cause) => setError(cause instanceof Error ? cause.message : "Couldn't open local storage."));
  useEffect(() => { void refresh(); }, []);

  const tailor = async (record: ResumeRecord) => {
    const copy = await duplicateResume(record, { title: `${record.title} (tailored)`, baseId: record.baseId ?? record.id, job: null });
    router.push(`/app/resumes/${copy.id}?tab=match`);
  };

  const downloadBackup = async () => {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rezumate-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`Backed up ${backup.resumes.length} ${backup.resumes.length === 1 ? "resume" : "resumes"}`);
  };

  const restoreBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { resumes: count } = await importBackup(JSON.parse(await file.text()));
      showToast(`Restored ${count} ${count === 1 ? "resume" : "resumes"}`);
      await refresh();
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : "That file couldn't be restored.");
    } finally {
      if (backupInput.current) backupInput.current.value = "";
    }
  };

  if (error) return <main className="app-main"><p className="notice error" role="alert">{error} Try a different browser, or turn off private browsing.</p></main>;
  if (!resumes) return <main className="app-main"><div className="app-loading">Opening your resumes…</div></main>;

  return (
    <main className="app-main">
      {resumes.length === 0 ? (
        <>
          <div className="dash-head">
            <div>
              <span className="eyebrow">Free · No account · Stays on this device</span>
              <h1>Build a resume that gets read.</h1>
              <p className="muted" style={{ maxWidth: 620, marginTop: 12 }}>
                Import the resume you have, or start fresh. Edit it in a structured editor, tailor it to a job description with a live
                match score, and export an ATS-safe PDF. No sign-up, no watermark.
              </p>
            </div>
          </div>
          <StartOptions />
        </>
      ) : (
        <>
          <div className="dash-head">
            <div>
              <span className="eyebrow">{resumes.length} {resumes.length === 1 ? "resume" : "resumes"} on this device</span>
              <h1>Your resumes</h1>
            </div>
            <div className="dash-actions">
              <Link className="button yellow" href="/app/new">New resume</Link>
            </div>
          </div>
          <div className="resume-grid">
            {resumes.map((record) => (
              <ResumeCard
                key={record.id}
                record={record}
                onTailor={() => void tailor(record)}
                onDuplicate={async () => { await duplicateResume(record); showToast("Duplicated"); await refresh(); }}
                onDelete={async () => { await deleteResume(record.id); showToast("Deleted"); await refresh(); }}
              />
            ))}
          </div>
        </>
      )}

      <div className="dash-footer">
        <p>
          <strong>Your resumes are saved in this browser only.</strong> Nothing is uploaded. Clearing site data or switching browsers
          removes them, so download a backup now and then.
        </p>
        <div className="dash-actions">
          <button className="button small secondary" type="button" onClick={downloadBackup} disabled={resumes.length === 0}>Download backup</button>
          <button className="button small secondary" type="button" onClick={() => backupInput.current?.click()}>Restore backup</button>
          <input ref={backupInput} type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void restoreBackup(event.target.files?.[0])} />
        </div>
      </div>

      <div className="app-store-strip">
        <p><strong>Applying from your phone?</strong> Rezumate for iPhone scores and tailors resumes on the go.</p>
        <a className="button small" href={APP_STORE_URL}>Get the iPhone app</a>
      </div>
      {toast}
    </main>
  );
}
