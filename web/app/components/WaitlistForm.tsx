"use client";

import { useEffect, useState, type FormEvent } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "../../lib/firebase";
import { WAITLIST_CUTOFF_LABEL, isWaitlistOpen } from "../../lib/waitlist-config";

type Status = "idle" | "loading" | "success" | "duplicate" | "error";

type Props = {
  source: string;
  className?: string;
};

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;

export function WaitlistForm({ source, className }: Props) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  // Defaults to open so the statically-built HTML matches the client's first
  // render; the real cutoff check only matters once it re-runs in the browser.
  const [waitlistOpen, setWaitlistOpen] = useState(true);

  useEffect(() => {
    setWaitlistOpen(isWaitlistOpen());
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (company) {
      // Honeypot field caught a bot; report success without writing anything.
      setStatus("success");
      return;
    }

    const normalized = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalized)) {
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      await setDoc(doc(db, "waitlist", normalized), {
        email: normalized,
        createdAt: serverTimestamp(),
        source,
        referrer: typeof document !== "undefined" ? document.referrer : ""
      });
      setStatus("success");
    } catch {
      setStatus("duplicate");
    }
  }

  if (!waitlistOpen) {
    return (
      <div className={`waitlist-form waitlist-closed ${className ?? ""}`}>
        The waitlist closed on {WAITLIST_CUTOFF_LABEL}. Rezumate is on its way &mdash; check the App Store for availability.
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className={`waitlist-form waitlist-success ${className ?? ""}`}>
        You&rsquo;re on the list. We&rsquo;ll email you the moment Rezumate is live.
      </div>
    );
  }

  if (status === "duplicate") {
    return (
      <div className={`waitlist-form waitlist-success ${className ?? ""}`}>
        You&rsquo;re already on the list &mdash; we&rsquo;ll notify you at launch.
      </div>
    );
  }

  return (
    <form className={`waitlist-form ${className ?? ""}`} onSubmit={handleSubmit} noValidate>
      <div className="waitlist-fields">
        <input
          type="email"
          name="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-label="Email address"
          className="waitlist-input"
        />
        <input
          type="text"
          name="company"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          className="waitlist-honeypot"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        <button type="submit" className="button waitlist-submit" disabled={status === "loading"}>
          {status === "loading" ? "Joining..." : "Join Waitlist"}
        </button>
      </div>
      {status === "error" && <p className="waitlist-error">Enter a valid email address.</p>}
    </form>
  );
}
