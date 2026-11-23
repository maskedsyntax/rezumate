"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { hasImpactSignal, isWeakBullet } from "@/lib/core/ats-score";
import { canStrengthen, strengthenBullet } from "@/lib/core/local-strengthen";
import { line as newLine, type Line } from "@/lib/core/resume-document";

const LONG_BULLET = 240;

function lintFor(text: string): { label: string; tone: "warn" | "bad"; tip: string }[] {
  const value = text.trim();
  if (!value) return [];
  const lint: { label: string; tone: "warn" | "bad"; tip: string }[] = [];
  if (isWeakBullet(value)) {
    lint.push({ label: value.split(/\s+/).length < 7 ? "Too short" : "Weak opening", tone: "warn", tip: "Start with a strong verb and say what changed because of your work." });
  }
  if (!hasImpactSignal(value)) lint.push({ label: "Add a result", tone: "warn", tip: "A number, scale, or outcome (faster, fewer errors, more users) shows impact." });
  if (value.length > LONG_BULLET) lint.push({ label: "Long", tone: "bad", tip: "Bullets over about two lines are often skimmed. Split or tighten it." });
  return lint;
}

type Props = {
  lines: Line[];
  onChange: (lines: Line[], coalesce?: string) => void;
  placeholder?: string;
  /** Show bullet-quality hints and the Strengthen action (experience and projects). */
  coach?: boolean;
  label: string;
  /** A bullet id to scroll to and flash, set from the Match panel. */
  focusId?: string | null;
};

export function BulletList({ lines, onChange, placeholder, coach = false, label, focusId }: Props) {
  const refs = useRef(new Map<string, HTMLTextAreaElement>());
  const [pendingFocus, setPendingFocus] = useState<{ id: string; at: "start" | "end" } | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFocus) return;
    const el = refs.current.get(pendingFocus.id);
    if (!el) return;
    el.focus();
    const pos = pendingFocus.at === "end" ? el.value.length : 0;
    el.setSelectionRange(pos, pos);
    setPendingFocus(null);
  }, [pendingFocus, lines]);

  useEffect(() => {
    if (!focusId) return;
    const el = refs.current.get(focusId);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
    setFlashId(focusId);
    const timer = setTimeout(() => setFlashId(null), 1200);
    return () => clearTimeout(timer);
  }, [focusId]);

  const set = (index: number, text: string) => {
    const next = lines.map((l, i) => (i === index ? { ...l, text } : l));
    onChange(next, lines[index].id);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const el = event.currentTarget;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      // Split at the caret: text after it moves to the new bullet.
      const before = el.value.slice(0, el.selectionStart).trimEnd();
      const after = el.value.slice(el.selectionEnd).trimStart();
      const created = newLine(after);
      const next = [...lines];
      next.splice(index, 1, { ...lines[index], text: before }, created);
      onChange(next);
      setPendingFocus({ id: created.id, at: "start" });
    } else if (event.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0 && index > 0) {
      // Merge into the previous bullet.
      event.preventDefault();
      const previous = lines[index - 1];
      const merged = previous.text + (previous.text && el.value ? " " : "") + el.value;
      const next = [...lines];
      next.splice(index - 1, 2, { ...previous, text: merged });
      onChange(next);
      setPendingFocus({ id: previous.id, at: "end" });
    } else if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      move(index, event.key === "ArrowUp" ? -1 : 1);
    }
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= lines.length) return;
    const next = [...lines];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setPendingFocus({ id: lines[index].id, at: "end" });
  };

  const remove = (index: number) => {
    const next = lines.filter((_, i) => i !== index);
    onChange(next);
    const neighbor = next[Math.max(0, index - 1)];
    if (neighbor) setPendingFocus({ id: neighbor.id, at: "end" });
  };

  const strengthen = (index: number) => {
    set(index, strengthenBullet(lines[index].text));
    setFlashId(lines[index].id);
    setTimeout(() => setFlashId(null), 1200);
  };

  const add = () => {
    const created = newLine();
    onChange([...lines, created]);
    setPendingFocus({ id: created.id, at: "start" });
  };

  return (
    <div className="bullets" role="group" aria-label={label}>
      {lines.map((l, index) => {
        const lint = coach ? lintFor(l.text) : [];
        return (
          <div className="bullet" key={l.id}>
            <span className="bullet-dot" aria-hidden="true">•</span>
            <textarea
              ref={(el) => { if (el) refs.current.set(l.id, el); else refs.current.delete(l.id); }}
              className={`textarea bullet-text${flashId === l.id ? " flash" : ""}`}
              rows={1}
              value={l.text}
              placeholder={placeholder}
              aria-label={`${label} ${index + 1}`}
              onChange={(event) => set(index, event.target.value.replace(/\n/g, " "))}
              onKeyDown={(event) => onKeyDown(event, index)}
            />
            <div className="bullet-tools">
              <button className="icon-button" type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up" title="Move up (Alt+↑)">↑</button>
              <button className="icon-button" type="button" onClick={() => move(index, 1)} disabled={index === lines.length - 1} aria-label="Move down" title="Move down (Alt+↓)">↓</button>
              <button className="icon-button" type="button" onClick={() => remove(index)} aria-label="Delete bullet" title="Delete">×</button>
            </div>
            {lint.length > 0 || (coach && canStrengthen(l.text)) ? (
              <div className="bullet-lint">
                {lint.map((item) => <span key={item.label} className={`chip ${item.tone}`} title={item.tip}>{item.label}</span>)}
                {coach && canStrengthen(l.text) ? (
                  <button className="text-button" type="button" onClick={() => strengthen(index)} title="Swap the weak opening for a stronger verb. Free and offline.">Strengthen opening</button>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
      <div>
        <button className="text-button" type="button" onClick={add}>+ Add {coach ? "bullet" : "line"}</button>
      </div>
    </div>
  );
}
