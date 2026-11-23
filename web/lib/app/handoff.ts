// Moves a resume from the free checker (marketing page) into the web app. Session storage
// keeps it in this tab only, and it's removed as soon as the app reads it.

const KEY = "rezumate:checker-handoff";

export type CheckerHandoff = { resumeText: string; jobDescription: string; fileName: string };

export function saveHandoff(handoff: CheckerHandoff): boolean {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(handoff));
    return true;
  } catch {
    return false;
  }
}

export function takeHandoff(): CheckerHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<CheckerHandoff>;
    if (typeof value.resumeText !== "string" || !value.resumeText.trim()) return null;
    return { resumeText: value.resumeText, jobDescription: value.jobDescription ?? "", fileName: value.fileName ?? "" };
  } catch {
    return null;
  }
}
