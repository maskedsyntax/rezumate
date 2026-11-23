import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppHeader } from "./_components/AppHeader";
import "./app.css";

export const metadata: Metadata = {
  title: "Resume builder",
  description: "Build, tailor, and export ATS-friendly resumes in your browser. Your resumes stay on this device.",
  robots: { index: false, follow: false }
};

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="app-root">
      <AppHeader />
      {children}
    </div>
  );
}
