import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite configuration.
 *
 * `base` matters for GitHub Pages: a project site is served from
 * https://<user>.github.io/<repo>/, so assets must be requested from that
 * sub-path. Set BASE_PATH in the build environment (the included GitHub
 * Actions workflow does this automatically). On Vercel or a custom domain the
 * site lives at the root, so the default "/" is correct.
 */
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
