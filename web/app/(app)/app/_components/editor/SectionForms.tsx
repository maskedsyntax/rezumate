"use client";

import type { ReactNode } from "react";

import {
  customKey,
  newEducation,
  newExperience,
  newProject,
  newSkillGroup,
  sectionTitle,
  type Contact,
  type ResumeDoc,
  type SectionKey
} from "@/lib/core/resume-document";
import { isRecognizedDateRange } from "@/lib/core/resume-parser";
import { BulletList } from "./BulletList";
import type { Mutator } from "./useResumeEditor";

type Update = (mutate: Mutator, coalesce?: string) => void;

function Field({ label, value, onChange, placeholder, hint, type = "text", autoComplete }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; hint?: ReactNode; type?: string; autoComplete?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" type={type} value={value} placeholder={placeholder} autoComplete={autoComplete ?? "off"} onChange={(event) => onChange(event.target.value)} />
      {hint ? <small className="field-hint">{hint}</small> : null}
    </label>
  );
}

function dateHint(value: string) {
  if (!value.trim() || isRecognizedDateRange(value)) return null;
  return "ATS systems read dates best as “Mar 2022 - Present” or “2019 - 2022”.";
}

function EntryShell({ title, index, count, onMove, onRemove, children }: {
  title: string; index: number; count: number; onMove: (delta: number) => void; onRemove: () => void; children: ReactNode;
}) {
  return (
    <div className="entry">
      <div className="entry-head">
        <strong>{title}</strong>
        <button className="icon-button" type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move entry up" title="Move up">↑</button>
        <button className="icon-button" type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move entry down" title="Move down">↓</button>
        <button className="icon-button" type="button" onClick={onRemove} aria-label="Delete entry" title="Delete">×</button>
      </div>
      {children}
    </div>
  );
}

function moveItem<T>(items: T[], index: number, delta: number) {
  const target = index + delta;
  if (target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
}

export function SectionShell({ id, title, hidden, children, badge }: { id: string; title: string; hidden?: boolean; children: ReactNode; badge?: ReactNode }) {
  return (
    <section className={`card form-section${hidden ? " is-hidden" : ""}`} id={id} aria-label={title}>
      <div className="form-section-head">
        <h2>{title}</h2>
        {hidden ? <span className="chip">Hidden from PDF</span> : badge}
      </div>
      {children}
    </section>
  );
}

export function ContactForm({ contact, update }: { contact: Contact; update: Update }) {
  const set = (key: keyof Contact) => (value: string) => update((doc) => { doc.contact[key] = value; }, `contact.${key}`);
  return (
    <SectionShell id="section-contact" title="Contact">
      <div className="form-grid">
        <div className="field-row">
          <Field label="Full name" value={contact.name} onChange={set("name")} placeholder="Alex Rivera" autoComplete="name" />
          <Field label="Headline (optional)" value={contact.headline} onChange={set("headline")} placeholder="Senior Software Engineer" />
        </div>
        <div className="field-row">
          <Field label="Email" type="email" value={contact.email} onChange={set("email")} placeholder="alex@example.com" autoComplete="email" />
          <Field label="Phone" type="tel" value={contact.phone} onChange={set("phone")} placeholder="(555) 014-2290" autoComplete="tel" />
        </div>
        <div className="field-row">
          <Field label="Location" value={contact.location} onChange={set("location")} placeholder="Austin, TX" hint="City and state or country is enough." />
          <Field label="Website" value={contact.website} onChange={set("website")} placeholder="alexrivera.dev" />
        </div>
        <div className="field-row">
          <Field label="LinkedIn" value={contact.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/in/alex-rivera" />
          <Field label="GitHub" value={contact.github} onChange={set("github")} placeholder="github.com/alexrivera" />
        </div>
      </div>
    </SectionShell>
  );
}

export function SectionForm({ sectionKey, doc, update, focusId }: { sectionKey: SectionKey; doc: ResumeDoc; update: Update; focusId: string | null }) {
  const title = sectionTitle(doc, sectionKey);
  const hidden = doc.hidden.includes(sectionKey);
  const id = `section-${sectionKey.replace(":", "-")}`;

  switch (sectionKey) {
    case "summary":
      return (
        <SectionShell id={id} title={title} hidden={hidden}>
          <label className="field">
            <span>Two or three sentences about who you are and what you do best</span>
            <textarea className="textarea" rows={4} value={doc.summary} placeholder="Software engineer with four years of experience building…" onChange={(event) => update((d) => { d.summary = event.target.value; }, "summary")} />
          </label>
        </SectionShell>
      );

    case "experience":
      return (
        <SectionShell id={id} title={title} hidden={hidden}>
          {doc.experience.map((entry, index) => (
            <EntryShell
              key={entry.id}
              title={[entry.title, entry.company].filter(Boolean).join(" · ") || "New role"}
              index={index}
              count={doc.experience.length}
              onMove={(delta) => update((d) => moveItem(d.experience, index, delta))}
              onRemove={() => update((d) => { d.experience.splice(index, 1); })}
            >
              <div className="field-row">
                <Field label="Job title" value={entry.title} placeholder="Software Engineer" onChange={(v) => update((d) => { d.experience[index].title = v; }, `${entry.id}.title`)} />
                <Field label="Company" value={entry.company} placeholder="Example Studio" onChange={(v) => update((d) => { d.experience[index].company = v; }, `${entry.id}.company`)} />
              </div>
              <div className="field-row">
                <Field label="Dates" value={entry.dateRange} placeholder="Mar 2022 - Present" hint={dateHint(entry.dateRange)} onChange={(v) => update((d) => { d.experience[index].dateRange = v; }, `${entry.id}.date`)} />
                <Field label="Location" value={entry.location} placeholder="Austin, TX or Remote" onChange={(v) => update((d) => { d.experience[index].location = v; }, `${entry.id}.location`)} />
              </div>
              <BulletList
                label="Bullet"
                coach
                lines={entry.bullets}
                focusId={focusId}
                placeholder="Built … that … (result, number, or scale)"
                onChange={(lines, coalesce) => update((d) => { d.experience[index].bullets = lines; }, coalesce)}
              />
            </EntryShell>
          ))}
          <div className="add-row"><button className="button small secondary" type="button" onClick={() => update((d) => { d.experience.push(newExperience()); })}>+ Add role</button></div>
        </SectionShell>
      );

    case "projects":
      return (
        <SectionShell id={id} title={title} hidden={hidden}>
          {doc.projects.map((entry, index) => (
            <EntryShell
              key={entry.id}
              title={entry.name || "New project"}
              index={index}
              count={doc.projects.length}
              onMove={(delta) => update((d) => moveItem(d.projects, index, delta))}
              onRemove={() => update((d) => { d.projects.splice(index, 1); })}
            >
              <div className="field-row">
                <Field label="Project name" value={entry.name} placeholder="Task Tracker" onChange={(v) => update((d) => { d.projects[index].name = v; }, `${entry.id}.name`)} />
                <Field label="Link (optional)" value={entry.link} placeholder="github.com/you/project" onChange={(v) => update((d) => { d.projects[index].link = v; }, `${entry.id}.link`)} />
              </div>
              <Field label="Dates (optional)" value={entry.dateRange} placeholder="2023 - 2024" hint={dateHint(entry.dateRange)} onChange={(v) => update((d) => { d.projects[index].dateRange = v; }, `${entry.id}.date`)} />
              <BulletList
                label="Bullet"
                coach
                lines={entry.bullets}
                focusId={focusId}
                placeholder="What you built, with what, and who used it"
                onChange={(lines, coalesce) => update((d) => { d.projects[index].bullets = lines; }, coalesce)}
              />
            </EntryShell>
          ))}
          <div className="add-row"><button className="button small secondary" type="button" onClick={() => update((d) => { d.projects.push(newProject()); })}>+ Add project</button></div>
        </SectionShell>
      );

    case "skills":
      return (
        <SectionShell id={id} title={title} hidden={hidden}>
          {doc.skills.map((group, index) => (
            <EntryShell
              key={group.id}
              title={group.name || "Skills"}
              index={index}
              count={doc.skills.length}
              onMove={(delta) => update((d) => moveItem(d.skills, index, delta))}
              onRemove={() => update((d) => { d.skills.splice(index, 1); })}
            >
              <div className="field-row" style={{ gridTemplateColumns: "minmax(0, 0.6fr) minmax(0, 1.4fr)" }}>
                <Field label="Group (optional)" value={group.name} placeholder="Languages" onChange={(v) => update((d) => { d.skills[index].name = v; }, `${group.id}.name`)} />
                <Field label="Skills, comma separated" value={group.items} placeholder="Python, TypeScript, SQL" onChange={(v) => update((d) => { d.skills[index].items = v; }, `${group.id}.items`)} />
              </div>
            </EntryShell>
          ))}
          <div className="add-row"><button className="button small secondary" type="button" onClick={() => update((d) => { d.skills.push(newSkillGroup()); })}>+ Add skill group</button></div>
        </SectionShell>
      );

    case "education":
      return (
        <SectionShell id={id} title={title} hidden={hidden}>
          {doc.education.map((entry, index) => (
            <EntryShell
              key={entry.id}
              title={entry.institution || "New school"}
              index={index}
              count={doc.education.length}
              onMove={(delta) => update((d) => moveItem(d.education, index, delta))}
              onRemove={() => update((d) => { d.education.splice(index, 1); })}
            >
              <div className="field-row">
                <Field label="School" value={entry.institution} placeholder="University of Texas at Austin" onChange={(v) => update((d) => { d.education[index].institution = v; }, `${entry.id}.school`)} />
                <Field label="Degree" value={entry.degree} placeholder="B.S. Computer Science" onChange={(v) => update((d) => { d.education[index].degree = v; }, `${entry.id}.degree`)} />
              </div>
              <div className="field-row">
                <Field label="Dates" value={entry.dateRange} placeholder="2016 - 2020" hint={dateHint(entry.dateRange)} onChange={(v) => update((d) => { d.education[index].dateRange = v; }, `${entry.id}.date`)} />
                <Field label="Location" value={entry.location} placeholder="Austin, TX" onChange={(v) => update((d) => { d.education[index].location = v; }, `${entry.id}.location`)} />
              </div>
              <BulletList label="Detail" lines={entry.details} placeholder="Honors, coursework, GPA (optional)" onChange={(lines, coalesce) => update((d) => { d.education[index].details = lines; }, coalesce)} />
            </EntryShell>
          ))}
          <div className="add-row"><button className="button small secondary" type="button" onClick={() => update((d) => { d.education.push(newEducation()); })}>+ Add school</button></div>
        </SectionShell>
      );

    default: {
      const index = doc.custom.findIndex((section) => customKey(section) === sectionKey);
      const section = doc.custom[index];
      if (!section) return null;
      return (
        <SectionShell id={id} title={title} hidden={hidden}>
          <div className="form-grid">
            <Field label="Heading" value={section.title} placeholder="Certifications" onChange={(v) => update((d) => { d.custom[index].title = v; delete d.titles[sectionKey]; }, `${section.id}.title`)} />
            <BulletList label="Line" lines={section.lines} placeholder="AWS Certified Cloud Practitioner (2024)" onChange={(lines, coalesce) => update((d) => { d.custom[index].lines = lines; }, coalesce)} />
          </div>
        </SectionShell>
      );
    }
  }
}
