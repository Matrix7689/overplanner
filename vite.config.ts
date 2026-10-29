import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In dev, Vite serves the web app and forwards /api to the Express server.
const api = { "/api": `http://127.0.0.1:${process.env.API_PORT ?? 3030}` };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: api },
});
