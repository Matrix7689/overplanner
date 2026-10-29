import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

export const config = {
  // Not PORT: dev tooling often sets PORT for the web server.
  port: Number(process.env.API_PORT ?? 3030),
  // Loopback only. Phones reach the app through `tailscale serve`, which
  // proxies HTTPS on the tailnet to this address.
  host: process.env.HOST ?? "127.0.0.1",
  dataDir: path.resolve(process.env.DATA_DIR ?? path.join(root, "data")),
  // Used when DATA_DIR has no categories.json yet.
  seedCategoriesFile: path.join(root, "data", "categories.json"),
  distDir: path.join(root, "dist"),
};
