"use client";

import { useEffect, useRef, useState } from "react";

import { PRO_GATING_ENABLED } from "@/lib/app/plans";
import { templateById, templates } from "@/lib/pdf/templates";

export function TemplateMenu({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="template-menu" ref={root}>
      <button className="button small secondary" type="button" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        Template: {templateById(value).name} ▾
      </button>
      {open ? (
        <div className="template-list" role="radiogroup" aria-label="Template">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              role="radio"
              aria-checked={template.id === value}
              className="template-option"
              onClick={() => { onChange(template.id); setOpen(false); }}
            >
              <strong>{template.name}{PRO_GATING_ENABLED && template.pro ? <span className="pro-tag">Pro</span> : null}</strong>
              <span>{template.description}</span>
            </button>
          ))}
          <span className="field-hint">Every template is single-column with real text, so ATS software reads it cleanly.</span>
        </div>
      ) : null}
    </div>
  );
}
