import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Served at www.kadoa.com/congress via the kadoa dashboard's reverse proxy
// (see kadoa-backend apps/dashboard/next.config.mjs). The site lives
// natively under /congress/: `base` prefixes all asset URLs and the build
// output sits in dist/congress/ so the proxy needs no path rewriting.
export default defineConfig({
  base: "/congress/",
  plugins: [react()],
  server: { port: 5183 },
  build: { outDir: "dist/congress" },
});
