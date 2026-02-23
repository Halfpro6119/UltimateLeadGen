/**
 * Reinstalls the Next.js package to restore missing compiled modules (e.g. find-up).
 * Run when you see: Error: Cannot find module 'next/dist/compiled/find-up'
 *
 * If the project is in OneDrive: pause sync for this folder first, then run:
 *   npm run fix-next-find-up
 * Then run: npm run dev
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const nextDir = path.join(process.cwd(), "node_modules", "next");
if (fs.existsSync(nextDir)) {
  console.log("Removing node_modules/next...");
  fs.rmSync(nextDir, { recursive: true, maxRetries: 3 });
}
console.log("Installing next@15.5.6...");
execSync("npm install next@15.5.6", { stdio: "inherit", cwd: process.cwd() });
const findUpPath = path.join(process.cwd(), "node_modules", "next", "dist", "compiled", "find-up");
if (fs.existsSync(findUpPath)) {
  console.log("OK: next/dist/compiled/find-up is now present. Run: npm run dev");
} else {
  console.warn("WARN: find-up still missing. Try moving the project out of OneDrive or pausing sync, then delete node_modules and package-lock.json and run npm install.");
}
