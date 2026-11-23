"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createFromText } from "@/lib/app/create";
import { takeHandoff } from "@/lib/app/handoff";
import { templates } from "@/lib/pdf/templates";
import { StartOptions } from "../_components/StartOptions";

export function NewResume() {
  const router = useRouter();
  const [handingOff, setHandingOff] = useState(false);
  const started = useRef(false);
  const [templateId, setTemplateId] = useState<string | undefined>();

  // /app/new?template=modern (from the template pages) starts with that template.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("template");
    if (requested && templates.some((t) => t.id === requested)) setTemplateId(requested);
  }, []);

  // A resume sent over from the free checker opens straight in the editor.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const handoff = takeHandoff();
    if (!handoff) return;
    setHandingOff(true);
    void createFromText(handoff.resumeText, {
      fileName: handoff.fileName,
      job: handoff.jobDescription.trim() ? { company: "", role: "", description: handoff.jobDescription } : null
    }).then((record) => router.replace(`/app/resumes/${record.id}${handoff.jobDescription.trim() ? "?tab=match" : ""}`));
  }, [router]);

  if (handingOff) return <main className="app-main"><div className="app-loading">Opening your checked resume in the editor…</div></main>;

  return (
    <main className="app-main">
      <div className="dash-head">
        <div>
          <Link className="text-button" href="/app">← All resumes</Link>
          <h1 className="page-title">New resume</h1>
        </div>
      </div>
      {templateId ? <p className="notice ok" style={{ marginBottom: 18 }}>Starting with the {templates.find((t) => t.id === templateId)?.name} template. You can switch anytime.</p> : null}
      <StartOptions templateId={templateId} />
    </main>
  );
}
