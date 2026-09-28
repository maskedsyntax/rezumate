import type { Metadata } from "next";
import Link from "next/link";

import { SiteChrome } from "../components/SiteChrome";
import { APP_STORE_URL } from "../../lib/app-store";

export const metadata: Metadata = {
  title: "Private Resume Checker Without an Account",
  description: "Learn how Rezumate checks resume and job-description text locally, what the browser preview does, and how the iPhone app keeps tailoring and PDF export on your device.",
  alternates: { canonical: "/private-resume-checker" },
  openGraph: {
    title: "Private Resume Checker Without an Account | Rezumate",
    description: "Review a job-specific resume match without uploading your career history to an analysis server.",
    url: "/private-resume-checker"
  }
};

export default function PrivateResumeCheckerPage() {
  return (
    <SiteChrome>
      <main>
        <section className="shell seo-hero">
          <p className="eyebrow">Privacy by design</p>
          <h1>Check your resume without handing it over.</h1>
          <p className="lead">A resume contains your contact details, employers, education, and work history. Rezumate gives you a way to compare it with a job description without sending that text to a resume-analysis server.</p>
          <div className="actions"><Link className="button" href="/resume-checker">Try the browser preview</Link><a className="button secondary" href={APP_STORE_URL}>Get the iPhone app</a></div>
        </section>

        <section className="band seo-content-band">
          <div className="shell privacy-steps">
            <article className="seo-content-card"><span>01 / Browser preview</span><h2>Your file stays in this tab.</h2><p>The free checker reads a PDF or DOCX in your browser, compares extracted text with the job description, and shows a score breakdown and findings. Rezumate does not receive or store those documents. Closing or refreshing the tab clears the result.</p></article>
            <article className="seo-content-card"><span>02 / iPhone app</span><h2>Tailoring stays on your iPhone.</h2><p>The app imports, scores, improves supported wording, saves variants, and exports PDF files on-device. It requires no account for the core workflow and does not upload resume text to a scoring server.</p></article>
            <article className="seo-content-card"><span>03 / Your review</span><h2>Keep every change truthful.</h2><p>Missing job terms are recommendations. Rezumate only places a missing skill after you confirm you actually have it. Local wording improvements do not invent employers, metrics, or experience.</p></article>
          </div>
        </section>

        <section className="band seo-faq-band">
          <div className="shell seo-faq-grid">
            <div><p className="eyebrow">Practical limits</p><h2>What private checking can and cannot do.</h2></div>
            <div>
              <h3>Will a scanned PDF work?</h3><p>A scanned image often has no selectable text. Use a text-based PDF or DOCX for a meaningful check.</p>
              <h3>Is this an official ATS score?</h3><p>No. It is Rezumate’s transparent ATS-style comparison. It cannot reproduce every employer’s screening system or guarantee a recruiting outcome.</p>
              <h3>What should I do after the check?</h3><p>Review the missing terms and weak bullets, then use the iPhone app to tailor a version and export a PDF. <Link href="/resume-checker">Run a free check.</Link></p>
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
