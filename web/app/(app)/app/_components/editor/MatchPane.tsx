"use client";

import { useDeferredValue, useMemo, useRef, useState, type ReactNode } from "react";

import { useTweenedNumber } from "@/app/components/motion";
import { jobTitle } from "@/lib/app/create";
import { sampleJob } from "@/lib/app/sample";
import { displayName, scoreDocument, type PreviewAnalysis } from "@/lib/core/ats-score";
import { canStrengthen, strengthenBullet } from "@/lib/core/local-strengthen";
import type { ResumeDoc } from "@/lib/core/resume-document";
import { allBullets } from "@/lib/core/resume-text";
import type { TargetJob } from "@/lib/storage/db";
import type { Mutator } from "./useResumeEditor";

const MIN_JD = 120;
const MAX_JD = 5000;
const RADIUS = 52;
const LENGTH = 2 * Math.PI * RADIUS;

const areas: { key: keyof PreviewAnalysis; label: string; weight: string }[] = [
  { key: "keywordCoverage", label: "Keywords", weight: "45%" },
  { key: "impactQuality", label: "Impact", weight: "25%" },
  { key: "structureQuality", label: "Structure", weight: "20%" },
  { key: "formattingQuality", label: "Formatting", weight: "10%" }
];

// Other spellings worth highlighting in the posting (the scorer counts these as the same skill).
const aliases: Record<string, string[]> = {
  postgresql: ["postgres"], "rest api": ["rest apis", "restful apis", "restful api", "rest"], "node.js": ["node", "nodejs"],
  "next.js": ["nextjs"], kubernetes: ["k8s"], aws: ["amazon web services"], gcp: ["google cloud platform", "google cloud"],
  "ci/cd": ["ci-cd"], ga4: ["google analytics 4"], api: ["apis"], "unit testing": ["unit tests", "unit test"]
};

function escape(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

function highlight(text: string, matched: string[], missing: string[]): ReactNode[] {
  const terms = [...matched.map((k) => [k, "matched"] as const), ...missing.map((k) => [k, "missing"] as const)];
  const ranges: { start: number; end: number; tone: string }[] = [];
  for (const [keyword, tone] of terms) {
    const variants = [keyword, ...(aliases[keyword] ?? [])].map((v) => escape(v).replace(/ /g, "\\s+"));
    const flags = keyword === "go" ? "g" : "gi";
    const pattern = keyword === "go" ? "(?<![A-Za-z])Go(?![A-Za-z])" : `(?<![a-z0-9])(?:${variants.join("|")})(?![a-z0-9])`;
    for (const match of text.matchAll(new RegExp(pattern, flags))) ranges.push({ start: match.index, end: match.index + match[0].length, tone });
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: ReactNode[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue;
    out.push(text.slice(cursor, range.start));
    out.push(<mark key={range.start} className={range.tone === "missing" ? "missing" : undefined}>{text.slice(range.start, range.end)}</mark>);
    cursor = range.end;
  }
  out.push(text.slice(cursor));
  return out;
}

function Score({ score, baseline }: { score: number | null; baseline: number | null }) {
  const shown = useTweenedNumber(score ?? 0, 900, 0);
  const delta = score !== null && baseline !== null ? score - baseline : 0;
  return (
    <div style={{ display: "grid", justifyItems: "center" }}>
      <div className="score">
        {score !== null ? (
          <svg viewBox="0 0 128 128" aria-hidden="true">
            <circle className="score-track" cx="64" cy="64" r={RADIUS} />
            <circle className="score-edge" cx="64" cy="64" r={RADIUS + 8} />
            <circle className="score-edge" cx="64" cy="64" r={RADIUS - 8} />
            <circle className="score-fill" cx="64" cy="64" r={RADIUS} strokeDasharray={LENGTH} strokeDashoffset={LENGTH * (1 - shown / 100)} />
          </svg>
        ) : null}
        <strong>{score === null ? "—" : Math.round(shown)}{score !== null ? <small>/100</small> : null}</strong>
        <span>{score === null ? "Limited" : "Job match"}</span>
      </div>
      {delta !== 0 ? <span className={`score-delta${delta < 0 ? " down" : ""}`}>{delta > 0 ? "+" : ""}{delta} this session</span> : null}
    </div>
  );
}

function JobForm({ initial, onSave, onCancel }: { initial: TargetJob | null; onSave: (job: TargetJob) => void; onCancel?: () => void }) {
  const [job, setJob] = useState<TargetJob>(initial ?? { company: "", role: "", description: "" });
  const length = job.description.trim().length;
  return (
    <div className="card match-card">
      <h3>Tailor to a job</h3>
      <p className="muted">Paste the full posting. Rezumate checks it against your resume in your browser. Nothing is uploaded.</p>
      <div className="form-grid">
        <div className="field-row">
          <label className="field"><span>Role</span><input className="input" value={job.role} placeholder="Software Engineer" onChange={(e) => setJob({ ...job, role: e.target.value })} /></label>
          <label className="field"><span>Company</span><input className="input" value={job.company} placeholder="Acme Analytics" onChange={(e) => setJob({ ...job, company: e.target.value })} /></label>
        </div>
        <label className="field">
          <span>Job description</span>
          <textarea className="textarea" rows={10} maxLength={MAX_JD} value={job.description} placeholder="Responsibilities, requirements, skills, and tools…" onChange={(e) => setJob({ ...job, description: e.target.value })} />
          <small className="field-hint">{length < MIN_JD ? `${MIN_JD - length} more characters for a meaningful comparison` : `${length.toLocaleString()} / ${MAX_JD.toLocaleString()}`}</small>
        </label>
        <div className="popover-actions">
          <button className="button small" type="button" disabled={length < MIN_JD} onClick={() => onSave({ ...job, description: job.description.trim() })}>Check the match</button>
          {!initial ? <button className="text-button" type="button" onClick={() => setJob(sampleJob)}>Use a sample job</button> : null}
          {onCancel ? <button className="text-button" type="button" onClick={onCancel}>Cancel</button> : null}
        </div>
      </div>
    </div>
  );
}

type Props = {
  doc: ResumeDoc;
  job: TargetJob | null;
  onJob: (job: TargetJob | null) => void;
  update: (mutate: Mutator, coalesce?: string) => void;
  onFocusBullet: (lineId: string) => void;
  toast: (message: string) => void;
};

export function MatchPane({ doc, job, onJob, update, onFocusBullet, toast }: Props) {
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const deferredDoc = useDeferredValue(doc);
  const result = useMemo(() => (job ? scoreDocument(deferredDoc, job.description) : null), [deferredDoc, job]);
  const baseline = useRef<{ jd: string; score: number | null } | null>(null);

  if (!job || editing) {
    return (
      <div className="match">
        <JobForm initial={job} onCancel={job ? () => setEditing(false) : undefined} onSave={(next) => { onJob(next); setEditing(false); baseline.current = null; }} />
      </div>
    );
  }

  if (!result?.ok) {
    return (
      <div className="match">
        <p className="notice" role="status">{result?.error}</p>
        <button className="button small secondary" type="button" onClick={() => setEditing(true)}>Edit the job description</button>
      </div>
    );
  }

  const analysis = result.analysis;
  if (!baseline.current || baseline.current.jd !== job.description) baseline.current = { jd: job.description, score: analysis.score };

  const bullets = allBullets(doc);
  const weak = analysis.weakBullets
    .map((text) => bullets.find((b) => b.text.trim() === text.trim()))
    .filter((b): b is NonNullable<typeof b> => !!b);
  const fixable = bullets.filter((b) => canStrengthen(b.text));

  const addSkill = (keyword: string) => {
    const name = displayName(keyword);
    update((d) => {
      const group = d.skills.find((g) => /skill|technical|tools|technolog/i.test(g.name)) ?? d.skills[0];
      if (group) group.items = group.items.trim() ? `${group.items.trim().replace(/,\s*$/, "")}, ${name}` : name;
      else d.skills.push({ id: crypto.randomUUID(), name: "Skills", items: name });
      if (d.hidden.includes("skills")) d.hidden = d.hidden.filter((k) => k !== "skills");
    });
    setAdding(null);
    toast(`Added ${name} to Skills`);
  };

  const strengthenAll = () => {
    update((d) => {
      for (const entry of [...d.experience, ...d.projects]) {
        for (const b of entry.bullets) if (canStrengthen(b.text)) b.text = strengthenBullet(b.text);
      }
    });
    toast(`Strengthened ${fixable.length} ${fixable.length === 1 ? "opening" : "openings"}`);
  };

  return (
    <div className="match">
      <div className="card match-card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h3 style={{ margin: 0, flex: 1 }}>{jobTitle(job)}</h3>
          <button className="text-button" type="button" onClick={() => setEditing(true)}>Edit job</button>
          <button className="text-button danger" type="button" onClick={() => onJob(null)}>Remove</button>
        </div>
        <div className="match-top">
          <Score score={analysis.score} baseline={baseline.current.score} />
          <div className="meters">
            {areas.map(({ key, label, weight }) => (
              <div className="meter-row" key={key}>
                <div><strong>{label}</strong><span className="muted">{String(analysis[key])}/100 · {weight}</span></div>
                <div className="meter"><span style={{ width: `${analysis[key]}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        {analysis.coverageWarning ? <p className="notice" style={{ marginTop: 14 }}>{analysis.coverageWarning}</p> : null}
      </div>

      <div className="card match-card">
        <h3>Missing from your resume ({analysis.missingKeywords.length})</h3>
        {analysis.missingKeywords.length ? (
          <>
            <p className="muted">Tap a skill you actually have to add it. Leave the rest: adding skills you don&apos;t have backfires in interviews.</p>
            <div className="chips">
              {analysis.missingKeywords.map((keyword, index) => (
                <button key={keyword} type="button" className="chip missing chip-pop" style={{ animationDelay: `${index * 30}ms` }} aria-expanded={adding === keyword} onClick={() => setAdding(adding === keyword ? null : keyword)}>
                  + {displayName(keyword)}
                </button>
              ))}
            </div>
            {adding ? (
              <div className="popover" role="dialog" aria-label={`Add ${displayName(adding)}`}>
                <p><strong>Only add {displayName(adding)} if you actually have it.</strong> It goes into your Skills section. Mention it in a bullet too if you used it at a job.</p>
                <div className="popover-actions">
                  <button className="button small" type="button" onClick={() => addSkill(adding)}>Add to Skills</button>
                  <button className="text-button" type="button" onClick={() => setAdding(null)}>Cancel</button>
                </div>
              </div>
            ) : null}
          </>
        ) : <p>Every recognized skill in this posting is on your resume.</p>}
        {analysis.partialMatches.length ? (
          <>
            <h3 style={{ marginTop: 16 }}>Partly there ({analysis.partialMatches.length})</h3>
            <div className="chips">{analysis.partialMatches.map((k) => <span key={k} className="chip partial">{displayName(k)}</span>)}</div>
          </>
        ) : null}
        {analysis.matchedKeywords.length ? (
          <>
            <h3 style={{ marginTop: 16 }}>Matched ({analysis.matchedKeywords.length})</h3>
            <div className="chips">{analysis.matchedKeywords.map((k) => <span key={k} className="chip matched">{displayName(k)}</span>)}</div>
          </>
        ) : null}
      </div>

      <div className="card match-card">
        <h3>Bullets to strengthen ({weak.length})</h3>
        {weak.length ? (
          <>
            {fixable.length > 1 ? <p><button className="button small secondary" type="button" onClick={strengthenAll}>Fix {fixable.length} weak openings</button></p> : null}
            <ul className="weak-list">
              {weak.map((b) => (
                <li key={b.lineId}>
                  <span>{b.text}</span>
                  <div>
                    {canStrengthen(b.text) ? (
                      <button className="text-button" type="button" onClick={() => { update((d) => { for (const entry of [...d.experience, ...d.projects]) for (const l of entry.bullets) if (l.id === b.lineId) l.text = strengthenBullet(l.text); }); onFocusBullet(b.lineId); }}>Strengthen opening</button>
                    ) : null}
                    <button className="text-button" type="button" onClick={() => onFocusBullet(b.lineId)}>Edit bullet</button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : <p>No weak openings or very short bullets found.</p>}
        {analysis.bulletsWithoutImpact.length ? (
          <p className="muted" style={{ marginTop: 12 }}>
            {analysis.bulletsWithoutImpact.length} {analysis.bulletsWithoutImpact.length === 1 ? "bullet doesn't" : "bullets don't"} show a result yet. Add a number, scale,
            or outcome where you honestly can. Bullets marked “Add a result” in the editor.
          </p>
        ) : null}
      </div>

      <div className="card match-card">
        <h3>The posting</h3>
        <p className="muted"><mark style={{ background: "var(--green)" }}>Green</mark> is on your resume, <mark style={{ background: "var(--yellow)" }}>yellow</mark> is missing.</p>
        <pre className="jd-text">{highlight(job.description, analysis.matchedKeywords, analysis.missingKeywords)}</pre>
      </div>
    </div>
  );
}
