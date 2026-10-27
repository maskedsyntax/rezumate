import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          OPENAI_API_KEY: "test-openai-key",
          SESSION_SECRET: "test-session-secret-0123456789abcdef",
          DEVICECHECK_MODE: "off",
        },
      },
    }),
  ],
});
