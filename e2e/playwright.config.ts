import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL:
      process.env.PLAYWRIGHT_BASE_URL || "https://dr-stretch-spot.vercel.app",
    screenshot: "only-on-failure",
  },
});
