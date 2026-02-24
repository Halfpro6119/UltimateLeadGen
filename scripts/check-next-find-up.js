"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const base = path.join(process.cwd(), "node_modules", "next", "dist", "compiled");
const asDir = path.join(base, "find-up");
const asJs = path.join(base, "find-up.js");
const exists =
  fs.existsSync(asDir) ||
  fs.existsSync(asJs) ||
  fs.existsSync(path.join(asDir, "index.js"));

if (!exists) {
  const nextDir = path.join(process.cwd(), "node_modules", "next");
  if (fs.existsSync(nextDir)) {
    try {
      fs.rmSync(nextDir, {
        recursive: true,
        maxRetries: 3,
        retryDelay: 200,
      });
    } catch (_) {}
    execSync("npm install next@15.5.6", { stdio: "inherit", cwd: process.cwd() });
  }
}
