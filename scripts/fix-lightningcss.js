"use strict";
/**
 * Ensures the lightningcss native binary for this platform is installed.
 * Run when you see: Error: Cannot find module '../lightningcss.win32-x64-msvc.node'
 *
 * Tailwind v4 / PostCSS use lightningcss, which has optional platform-specific
 * packages. If they were skipped (e.g. OneDrive during install), this script
 * installs the correct one.
 */
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const LIGHTNINGCSS_VERSION = "1.30.2";

function getPlatformPackage() {
  const parts = [process.platform, process.arch];
  if (process.platform === "linux") {
    try {
      const { MUSL, familySync } = require("detect-libc");
      const family = familySync();
      if (family === MUSL) parts.push("musl");
      else if (process.arch === "arm") parts.push("gnueabihf");
      else parts.push("gnu");
    } catch {
      parts.push("gnu");
    }
  } else if (process.platform === "win32") {
    parts.push("msvc");
  }
  return `lightningcss-${parts.join("-")}`;
}

const pkg = getPlatformPackage();
const lightningcssRoot = path.join(process.cwd(), "node_modules", "lightningcss");

function isInstalled() {
  // Check for the optional package (hoisted or under lightningcss/node_modules)
  const underLightningcss = path.join(lightningcssRoot, "node_modules", pkg);
  const hoisted = path.join(process.cwd(), "node_modules", pkg);
  if (fs.existsSync(underLightningcss) || fs.existsSync(hoisted)) return true;
  // Fallback: .node file in lightningcss parent (legacy layout)
  const suffix = process.platform === "win32" ? "-msvc" : process.platform === "linux" ? "-gnu" : "";
  const nodeFile = path.join(lightningcssRoot, `lightningcss.${process.platform}-${process.arch}${suffix}.node`);
  return fs.existsSync(nodeFile);
}

if (!fs.existsSync(lightningcssRoot)) {
  console.error("lightningcss not found. Run: npm install");
  process.exit(1);
}

if (isInstalled()) {
  console.log("lightningcss native module already present.");
  process.exit(0);
}

console.log(`Installing ${pkg}@${LIGHTNINGCSS_VERSION}...`);
try {
  execSync(`npm install ${pkg}@${LIGHTNINGCSS_VERSION} --no-save`, {
    stdio: "inherit",
    cwd: process.cwd(),
  });
} catch (err) {
  console.error("Install failed. Try: npm install (with OneDrive paused for this folder).");
  process.exit(1);
}

if (isInstalled()) {
  console.log("OK: lightningcss native module is now installed. Run your build again.");
} else {
  console.warn("WARN: Module may still be missing. Try deleting node_modules and package-lock.json, then npm install.");
  process.exit(1);
}
