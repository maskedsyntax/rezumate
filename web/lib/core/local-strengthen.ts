// Port of the iPhone app's LocalAIService.strengthenBullet: upgrades a weak opening verb
// without adding facts. Free, offline, and always available.

const upgrades: [string, string][] = [
  ["worked on", "Contributed to"],
  ["helped with", "Contributed to"],
  ["involved in", "Contributed to"],
  ["assisted with", "Contributed to"],
  ["handled", "Managed"],
  ["participated in", "Contributed to"],
  ["did", "Executed"],
  ["made", "Created"]
];

export function strengthenBullet(bullet: string): string {
  let b = bullet.trim();
  while (b && "•·-*".includes(b[0])) b = b.slice(1).trim();
  const lower = b.toLowerCase();
  for (const [weak, strong] of upgrades) {
    if (lower.startsWith(weak)) {
      b = strong + b.slice(weak.length);
      break;
    }
  }
  return b;
}

/** Whether the free strengthen would change this bullet. */
export function canStrengthen(bullet: string): boolean {
  return strengthenBullet(bullet) !== bullet.trim();
}
