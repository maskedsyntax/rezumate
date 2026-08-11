import type { Logger } from "./types.js";

function write(
  severity: "INFO" | "WARNING" | "ERROR",
  fields: Record<string, unknown>,
  message: string,
): void {
  const output = JSON.stringify({
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  });
  (severity === "ERROR" ? process.stderr : process.stdout).write(`${output}\n`);
}

export const logger: Logger = {
  info: (fields, message) => write("INFO", fields, message),
  warn: (fields, message) => write("WARNING", fields, message),
  error: (fields, message) => write("ERROR", fields, message),
};
