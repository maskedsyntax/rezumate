import type { Metadata } from "next";
import Link from "next/link";

import { ResumeCheck } from "../components/ResumeCheck";
import { SiteChrome } from "../components/SiteChrome";
import { APP_STORE_URL } from "../../lib/app-store";

export const metadata: Metadata = {
  title: "Free Resume Job Match Checker | Private ATS-Style Preview",
  description: "Compare a PDF, DOCX, or pasted resume with a job description. See an ATS-style match score, missing skills, and issues to review. Files stay in your browser.",
  alternates: { canonical: "/resume-checker" },
  openGraph: {
    title: "Free Resume Job Match Checker | Rezumate",
    description: "Check how your resume matches a specific job description without uploading it or creating an account.",
    url: "/resume-checker"
  }
};

export default function ResumeCheckerPage() {
  return (
    <SiteChrome>
      <main>
        <section className="shell seo-hero">
          <p className="eyebrow">Free resume checker</p>
          <h1>Check your resume against the job you want.</h1>
          <p className="lead">Upload a text-based PDF or DOCX, or paste your resume. Add the full job description to see a private, role-specific ATS-style score and the reasons behind it.</p>
          <div className="seo-hero-points"><span>No account</span><span>Runs in your browser</span><span>Real findings before the app link</span></div>
        </section>

        <ResumeCheck />

        <section className="band seo-content-band">
          <div className="shell seo-content-grid">
            <div>
              <p className="eyebrow">What the score means</p>
              <h2>A guide to reviewing this application.</h2>
              <p>The preview compares supported skills and tools in the job description with text found in your resume. It recognizes common aliases, avoids credit for negated skills, checks bullet outcomes, and looks for core resume sections. Projects can stand in for experience.</p>
              <p>The score uses the same category weights as the iPhone app: keyword coverage 45%, impact quality 25%, structure 20%, and formatting warnings 10%. Browser matching rules and file extraction can differ from the app. It is an ATS-style estimate, not an employer’s actual ATS result or a prediction of interviews.</p>
            </div>
            <div className="seo-content-card">
              <h3>Use the result carefully</h3>
              <ul>
                <li>Only add a missing skill if you genuinely have it.</li>
                <li>Review each bullet for accuracy before applying.</li>
                <li>Try a text-based file if a scanned PDF has no readable text.</li>
                <li>Use the iPhone app to edit, save a tailored version, and export.</li>
              </ul>
              <a className="button" href={APP_STORE_URL}>Get Rezumate for iPhone</a>
            </div>
          </div>
        </section>

        <section className="band seo-faq-band">
          <div className="shell seo-faq-grid">
            <div><p className="eyebrow">Common questions</p><h2>Know what you are checking.</h2></div>
            <div>
              <h3>Does this tell me whether I will pass an ATS?</h3>
              <p>No. Employers use different systems and processes. This preview highlights specific gaps in your resume against the posting you provide.</p>
              <h3>Do you keep my resume?</h3>
              <p>No. The checker extracts and compares text in your browser. It does not send the resume or job description to a Rezumate analysis server. <Link href="/private-resume-checker">Read how privacy works.</Link></p>
              <h3>Why does the iPhone score sometimes differ?</h3>
              <p>The browser and iPhone app share the four score categories and weights, but their matching rules and file parsers can differ. Review the specific findings in each result instead of expecting the numbers to match exactly.</p>
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
