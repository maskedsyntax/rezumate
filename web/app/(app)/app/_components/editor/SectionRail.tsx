"use client";

import { useState, type KeyboardEvent } from "react";

import { customKey, line, newId, normalizedOrder, sectionTitle, type ResumeDoc, type SectionKey } from "@/lib/core/resume-document";
import { headingKey } from "@/lib/core/resume-parser";
import type { Mutator } from "./useResumeEditor";

export function sectionDomId(key: SectionKey | "contact") {
  return `section-${key.replace(":", "-")}`;
}

export function scrollToSection(key: SectionKey | "contact") {
  const el = document.getElementById(sectionDomId(key));
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Whether a renamed built-in heading is still one an ATS recognizes ("Work History" for Experience). */
function headingWarning(doc: ResumeDoc, key: SectionKey): string | null {
  if (key.startsWith("custom:") || !doc.titles[key]?.trim()) return null;
  return headingKey(doc.titles[key]!) === key ? null : "ATS systems may not recognize this heading. Standard names like “Experience” are safest.";
}

export function SectionRail({ doc, update }: { doc: ResumeDoc; update: (mutate: Mutator, coalesce?: string) => void }) {
  const order = normalizedOrder(doc);
  const [dragging, setDragging] = useState<SectionKey | null>(null);
  const [over, setOver] = useState<SectionKey | null>(null);
  const [renaming, setRenaming] = useState<SectionKey | null>(null);
  const [draft, setDraft] = useState("");

  const move = (key: SectionKey, toIndex: number) => update((d) => {
    const next = normalizedOrder(d).filter((k) => k !== key);
    next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, key);
    d.sectionOrder = next;
  });

  const toggleHidden = (key: SectionKey) => update((d) => {
    d.hidden = d.hidden.includes(key) ? d.hidden.filter((k) => k !== key) : [...d.hidden, key];
  });

  const startRename = (key: SectionKey) => {
    setRenaming(key);
    setDraft(sectionTitle(doc, key));
  };

  const finishRename = (key: SectionKey) => {
    const value = draft.trim();
    update((d) => {
      if (key.startsWith("custom:")) {
        const section = d.custom.find((c) => customKey(c) === key);
        if (section && value) section.title = value;
      } else if (value && value.toLowerCase() !== sectionTitle({ ...d, titles: {} }, key).toLowerCase()) {
        d.titles[key] = value;
      } else {
        delete d.titles[key];
      }
    });
    setRenaming(null);
  };

  const removeCustom = (key: SectionKey) => update((d) => {
    d.custom = d.custom.filter((c) => customKey(c) !== key);
    d.sectionOrder = d.sectionOrder.filter((k) => k !== key);
    d.hidden = d.hidden.filter((k) => k !== key);
    delete d.titles[key];
  });

  const addSection = () => {
    const id = newId();
    update((d) => {
      d.custom.push({ id, title: "New section", lines: [line()] });
      d.sectionOrder = [...normalizedOrder(d), `custom:${id}`];
    });
    setTimeout(() => scrollToSection(`custom:${id}`), 50);
  };

  const onNameKeyDown = (event: KeyboardEvent, key: SectionKey, index: number) => {
    if (!event.altKey) return;
    if (event.key === "ArrowUp" && index > 0) { event.preventDefault(); move(key, index - 1); }
    if (event.key === "ArrowDown" && index < order.length - 1) { event.preventDefault(); move(key, index + 1); }
  };

  return (
    <nav className="editor-rail" aria-label="Resume sections">
      <span className="label muted" style={{ padding: "0 6px 6px" }}>Sections</span>
      <div className="rail-item">
        <span className="icon-button rail-handle" aria-hidden="true" style={{ visibility: "hidden" }}>⋮⋮</span>
        <button className="rail-name" type="button" onClick={() => scrollToSection("contact")}>Contact</button>
      </div>
      {order.map((key, index) => {
        const hidden = doc.hidden.includes(key);
        const warning = headingWarning(doc, key);
        return (
          <div
            key={key}
            className={`rail-item${hidden ? " is-hidden" : ""}${dragging === key ? " is-dragging" : ""}${over === key && dragging !== key ? " is-drop-target" : ""}`}
            draggable={renaming !== key}
            onDragStart={(event) => { setDragging(key); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", key); }}
            onDragOver={(event) => { event.preventDefault(); setOver(key); }}
            onDragLeave={() => setOver((current) => (current === key ? null : current))}
            onDrop={(event) => { event.preventDefault(); if (dragging) move(dragging, index); setDragging(null); setOver(null); }}
            onDragEnd={() => { setDragging(null); setOver(null); }}
          >
            <span className="icon-button rail-handle" aria-hidden="true" title="Drag to reorder">⋮⋮</span>
            {renaming === key ? (
              <input
                className="input"
                style={{ padding: "4px 6px", fontSize: 12 }}
                value={draft}
                autoFocus
                aria-label="Section heading"
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => finishRename(key)}
                onKeyDown={(event) => { if (event.key === "Enter") finishRename(key); if (event.key === "Escape") setRenaming(null); }}
              />
            ) : (
              <button
                className="rail-name"
                type="button"
                title={warning ?? "Alt+↑ / Alt+↓ to reorder"}
                onClick={() => scrollToSection(key)}
                onDoubleClick={() => startRename(key)}
                onKeyDown={(event) => onNameKeyDown(event, key, index)}
              >
                {warning ? "⚠ " : ""}{sectionTitle(doc, key)}
              </button>
            )}
            <button className="icon-button" type="button" onClick={() => startRename(key)} aria-label={`Rename ${sectionTitle(doc, key)}`} title="Rename">✎</button>
            <button className="icon-button" type="button" onClick={() => toggleHidden(key)} aria-pressed={hidden} aria-label={`${hidden ? "Show" : "Hide"} ${sectionTitle(doc, key)}`} title={hidden ? "Show in PDF" : "Hide from PDF"}>{hidden ? "○" : "◉"}</button>
            {key.startsWith("custom:") ? (
              <button className="icon-button" type="button" onClick={() => removeCustom(key)} aria-label={`Delete ${sectionTitle(doc, key)}`} title="Delete section (undo with ⌘Z)">×</button>
            ) : null}
          </div>
        );
      })}
      <button className="button small secondary rail-add" type="button" onClick={addSection}>+ Add section</button>
      <p className="rail-hint">Drag to reorder. Double-click a name to rename it. Hidden sections stay saved but leave the PDF.</p>
    </nav>
  );
}
