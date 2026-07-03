import { join, dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");

export function mountStatic(app) {
  if (!existsSync(DIST)) {
    console.warn("⚠️  dist/ not found — run `npm run build` for production static serving");
    return;
  }

  app.use(express.static(DIST, { index: false }));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(DIST, "index.html"));
  });

  console.log("📦 Serving frontend from dist/");
}
