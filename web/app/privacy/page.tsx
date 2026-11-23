import type { Metadata } from "next";
import Link from "next/link";

import { SiteChrome } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Rezumate handles resume and job-description data in the browser checker and the iPhone app.",
  alternates: { canonical: "/privacy" }
};

export default function PrivacyPage() {
  return (
    <SiteChrome>
      <main className="shell legal">
        <Link href="/" className="legal-back">← Back</Link>
        <h1>Privacy Policy</h1>
        <p className="legal-meta">Last updated: November 23, 2026</p>
        <div className="legal-card">
          <p>
            Your resume holds sensitive details: your contact information and your full work history. Rezumate keeps that on your iPhone unless you choose to use an AI feature.
          </p>
          <p>
            <strong>On your iPhone:</strong> Reading your PDF or DOCX, keyword matching, ATS-style scoring, rule-based Improve Resume, and PDF export all run on your device. Your resumes, job descriptions, scores, and saved variants are stored only on your device, in the app's private storage.
          </p>
          <p>
            <strong>Optional AI features:</strong> AI bullet rewrites, AI Improve Resume, cover letters, and extra job requirements (available in Rezumate 2.0 and later) only run when you tap them. For that request, the app sends the resume text, job description, and any details you type to Rezumate's server, which passes them to OpenAI to write the answer. Before sending, the app replaces email addresses, phone numbers, and LinkedIn and GitHub links with placeholders and puts them back on your device. Rezumate's server does not store your resume, job description, or the AI's answer, and logs only how much text each request used. Requests ask OpenAI not to store them. OpenAI does not train on API data and may keep it for a limited time to monitor for abuse, under its API data policy.
          </p>
          <p>
            <strong>What the server keeps:</strong> To count AI actions and check subscriptions, Rezumate's server keeps a random anonymous ID created by the app, your remaining free AI actions, monthly usage counts, and App Store transaction IDs and expiry dates for your purchases. It uses Apple's DeviceCheck to limit abuse of free AI actions. It does not receive your name, email, or Apple ID.
          </p>
          <p>
            <strong>Purchases:</strong> Subscriptions and purchases are handled by Apple. Rezumate never sees your payment details.
          </p>
          <p>
            <strong>Website resume checker:</strong> The free checker reads your PDF or DOCX and compares it with a job description in your browser. The resume text, job description, and result stay in that browser tab and are cleared when you refresh or close it. They are not sent to a Rezumate server. The site may still receive ordinary web requests for the page, fonts, scripts, and assets.
          </p>
          <p>
            <strong>No accounts or tracking:</strong> No account is required, and Rezumate does not use advertising or tracking analytics.
          </p>
          <p>
            Questions or support: email aftaab@aftaab.dev.
          </p>
        </div>
      </main>
    </SiteChrome>
  );
}
