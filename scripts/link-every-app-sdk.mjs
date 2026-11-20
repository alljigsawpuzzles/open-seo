#!/usr/bin/env node
/**
 * Repair pnpm's @every-app/sdk symlink when install hits EPERM on chmod under
 * root:openseo node_modules (droplet /opt layout).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const store = path.join(root, "node_modules", ".pnpm");
const linkDir = path.join(root, "node_modules", "@every-app");
const link = path.join(linkDir, "sdk");

const candidates = fs
  .readdirSync(store)
  .filter((d) => d.startsWith("@every-app+sdk@0.3.0_"))
  .sort()
  .reverse();
const hit = candidates.find((d) =>
  fs.existsSync(path.join(store, d, "node_modules", "@every-app", "sdk", "package.json")),
);
if (!hit) {
  console.error("No @every-app/sdk in .pnpm store; run pnpm install first.");
  process.exit(1);
}
const target = path.join(store, hit, "node_modules", "@every-app", "sdk");
fs.mkdirSync(linkDir, { recursive: true });
const rel = path.relative(linkDir, target);
try {
  fs.rmSync(link, { recursive: true, force: true });
} catch {
  // ignore
}
fs.symlinkSync(rel, link);
console.log("Linked", link, "->", rel);