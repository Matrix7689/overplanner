import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

// Secrets such as JEV_API_KEY live in .env (git-ignored). Real environment
// variables take precedence over the file.
const envFile = path.join(root, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

export const config = {
  // Not PORT: dev tooling often sets PORT for the web server.
  port: Number(process.env.API_PORT ?? 3030),
  // Loopback only. Phones reach the app through `tailscale serve`, which
  // proxies HTTPS on the tailnet to this address.
  host: process.env.HOST ?? "127.0.0.1",
  dataDir: path.resolve(process.env.DATA_DIR ?? path.join(root, "data")),
  // Copied to DATA_DIR on first run. After that, DATA_DIR holds your own set.
  seedCategoriesFile: path.join(root, "defaults", "categories.json"),
  distDir: path.join(root, "dist"),

  jev: {
    apiKey: process.env.JEV_API_KEY || undefined,
    baseUrl: (process.env.JEV_BASE_URL ?? "https://api.typesafe.ai/v1").replace(/\/+$/, ""),
    model: process.env.JEV_MODEL ?? "jev-latest",
    timeoutMs: Number(process.env.JEV_TIMEOUT_MS ?? 8000),
  },
};
