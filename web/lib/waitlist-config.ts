// Waitlist signups are only accepted through the end of this date (Pacific Time,
// to stay aligned with how App Store Connect schedules price changes).
export const WAITLIST_CUTOFF = new Date("2026-08-16T00:00:00-07:00");
export const WAITLIST_CUTOFF_LABEL = "August 15";

export function isWaitlistOpen(now: Date = new Date()): boolean {
  return now.getTime() < WAITLIST_CUTOFF.getTime();
}
