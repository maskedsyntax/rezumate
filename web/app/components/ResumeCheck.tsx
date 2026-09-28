"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import { APP_STORE_URL } from "../../lib/app-store";
import { extractResumeFile } from "../../lib/extract-resume-file";
import { analyzeResumePreview, type PreviewAnalysis } from "../../lib/resume-preview";

const sampleResume = `SUMMARY
Software engineer with experience building internal tools and APIs.
EXPERIENCE
Software Engineer, Example Studio
• Worked on backend services using Python and PostgreSQL for a reporting dashboard.
• Built an internal React interface for the support team.
• Helped with deployments and weekly maintenance.
PROJECTS
• Created a small task tracker with TypeScript and Node.js.
SKILLS
Python, PostgreSQL, React, TypeScript, Node.js, Git
EDUCATION
Bachelor of Science in Computer Science`;

const sampleJob = `We are hiring a Software Engineer to build and maintain web applications. You will develop REST APIs with Python and PostgreSQL, create React and TypeScript interfaces, and collaborate with product teams. Experience with Docker, AWS, automated CI/CD pipelines, and accessibility is valued. You should be comfortable with Git, API design, and improving the reliability of production systems.`;

const scoreAreas: { key: keyof PreviewAnalysis; label: string; weight: string }[] = [
  { key: "keywordCoverage", label: "Keyword coverage", weight: "45%" },
  { key: "impactQuality", label: "Impact quality", weight: "25%" },
  { key: "structureQuality", label: "Structure", weight: "20%" },
  { key: "formattingQuality", label: "Formatting", weight: "10%" }
];

export function ResumeCheck() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [fileName, setFileName] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [isSample, setIsSample] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PreviewAnalysis | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsReading(true);
    setResult(null);
    setError("");
    setFileName("");
    setIsSample(false);
    try {
      setResumeText(await extractResumeFile(file));
      setFileName(file.name);
    } catch (cause) {
      setResumeText("");
      setError(cause instanceof Error ? cause.message : "This file could not be read.");
    } finally {
      setIsReading(false);
      event.target.value = "";
    }
  }

  function loadSample() {
    setResumeText(sampleResume);
    setJobDescription(sampleJob);
    setFileName("");
    setIsSample(true);
    setResult(null);
    setError("");
  }

  function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      setResult(analyzeResumePreview(resumeText, jobDescription));
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "We could not analyze this resume.");
    }
  }

  return (
    <section className="band check-band" id="free-check" aria-labelledby="check-heading">
      <div className="shell">
        <div className="check-intro">
          <div>
            <p className="eyebrow">Try the core workflow</p>
            <h2 id="check-heading">See the gaps before you apply.</h2>
            <p className="lead">Compare your resume with a real job description. Get an ATS-style match preview and concrete issues to review, free and without an account.</p>
          </div>
          <div className="check-privacy">
            <strong>Private in your browser</strong>
            <span>Your file and job description are processed here. They are not uploaded or saved by Rezumate.</span>
          </div>
        </div>

        <form className="check-form" onSubmit={handleAnalyze}>
          <div className="check-field">
            <div className="check-field-heading"><label htmlFor="resume-file">01 / Your resume</label><span>PDF or DOCX</span></div>
            <input id="resume-file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFile} />
            <p className="check-input-hint">{isReading ? "Reading your file locally…" : fileName ? `Ready: ${fileName}` : "Choose a text-based file, or paste your resume below."}</p>
            <label className="check-sub-label" htmlFor="resume-text">Resume text</label>
            <textarea id="resume-text" value={resumeText} onChange={(event) => { setResumeText(event.target.value); setFileName(""); setIsSample(false); setResult(null); }} placeholder="Paste your resume here, including section headings and bullets…" rows={8} maxLength={30000} />
          </div>
          <div className="check-field">
            <div className="check-field-heading"><label htmlFor="job-description">02 / The job description</label><span>120–5,000 characters</span></div>
            <textarea id="job-description" value={jobDescription} onChange={(event) => { setJobDescription(event.target.value); setIsSample(false); setResult(null); }} placeholder="Paste the full role description, including requirements and skills…" rows={12} maxLength={5000} />
            <p className="check-input-hint">The comparison is specific to this role. Only list skills you actually have in your resume.</p>
          </div>
          <div className="check-actions">
            <button className="button" type="submit" disabled={isReading}>Check my resume</button>
            <button className="button secondary" type="button" onClick={loadSample}>Try a sample instead</button>
            {isSample && <span className="check-sample-label">Using fictional sample text</span>}
          </div>
          {error && <p className="check-error" role="alert">{error}</p>}
        </form>

        {result && (
          <div className="check-result" role="region" aria-label="Resume match preview" aria-live="polite">
            <div className="check-result-top">
              <div className="check-score"><strong>{result.score}<small>/100</small></strong><span>ATS-style match preview</span></div>
              <div><p className="eyebrow">Your result{isSample ? " · sample" : ""}</p><h3>Here’s what the comparison found.</h3><p>This is a rule-based guide, not a prediction of any employer’s screening decision.</p></div>
            </div>
            <div className="check-score-grid">
              {scoreAreas.map(({ key, label, weight }) => (
                <div className="check-score-area" key={key}>
                  <div><strong>{label}</strong><span>{String(result[key])}/100 · {weight} of score</span></div>
                  <div className="check-meter"><span style={{ width: `${result[key]}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="check-findings">
              <div className="check-finding-card">
                <h4>Matched in your resume</h4>
                <p>{result.matchedKeywords.length} of {result.jdKeywords.length} supported role terms found.{result.partialMatches.length ? ` ${result.partialMatches.length} possible partial ${result.partialMatches.length === 1 ? "match" : "matches"} to review.` : ""}</p>
                <div className="check-chips">{result.matchedKeywords.slice(0, 8).map((keyword) => <span key={keyword}>{keyword}</span>)}{result.matchedKeywords.length === 0 && <span>None yet</span>}</div>
                {result.partialMatches.length > 0 && <div className="check-chips partial" aria-label="Possible partial matches">{result.partialMatches.slice(0, 8).map((keyword) => <span key={keyword}>{keyword} · partial</span>)}</div>}
              </div>
              <div className="check-finding-card">
                <h4>Terms to review</h4>
                <p>{result.missingKeywords.length ? "These appear in the job description but not your resume. Add one only if you genuinely have that skill." : "No supported role terms are missing."}</p>
                <div className="check-chips missing">{result.missingKeywords.slice(0, 8).map((keyword) => <span key={keyword}>{keyword}</span>)}</div>
              </div>
            </div>
            <div className="check-next-step">
              <div>
                <strong>What to fix next</strong>
                <p>{result.weakBullets[0] ? `Review this weak bullet: “${result.weakBullets[0]}”` : result.bulletsWithoutImpact[0] ? `Consider showing the outcome of: “${result.bulletsWithoutImpact[0]}”` : result.formattingWarnings[0] ?? "Review the role terms and keep every change truthful."}</p>
              </div>
              <a className="button" href={APP_STORE_URL}>Improve and export in Rezumate</a>
            </div>
            <p className="check-result-note">The iPhone app lets you review changes, save variants, and export a clean PDF. Its score may differ if the file’s text is extracted differently on iPhone.</p>
          </div>
        )}
      </div>
    </section>
  );
}
