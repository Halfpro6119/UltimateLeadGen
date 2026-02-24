"use strict";
/**
 * Installs missing optional native dependencies for the current platform.
 * Run when you see errors like:
 *   - Cannot find module '@tailwindcss/oxide-win32-x64-msvc'
 *   - Cannot find module '../lightningcss.win32-x64-msvc.node'
 *
 * npm has a known bug with optional dependencies (https://github.com/npm/cli/issues/4828).
 * If the project is in OneDrive, pause sync before running npm install.
 */
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const OXIDE_VERSION = "4.1.17";
const LIGHTNINGCSS_VERSION = "1.30.2";

function getPlatformSuffix() {
  if (process.platform === "win32") {
    return process.arch === "x64" ? "win32-x64-msvc" : process.arch === "arm64" ? "win32-arm64-msvc" : "win32-ia32-msvc";
  }
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  }
  if (process.platform === "linux") {
    let suffix = `linux-${process.arch}`;
    try {
      const { MUSL, familySync } = require("detect-libc");
      if (familySync() === MUSL) suffix += "-musl";
      else if (process.arch === "arm") suffix += "-gnueabihf";
      else suffix += "-gnu";
    } catch {
      suffix += "-gnu";
    }
    return suffix;
  }
  return null;
}

const suffix = getPlatformSuffix();
if (!suffix) {
  console.error("Unsupported platform for optional deps.");
  process.exit(1);
}

const oxidePkg = `@tailwindcss/oxide-${suffix}`;
const lightningcssPkg = `lightningcss-${suffix}`;

const oxideRoot = path.join(process.cwd(), "node_modules", "@tailwindcss", "oxide");
const lightningcssRoot = path.join(process.cwd(), "node_modules", "lightningcss");

function isOxideInstalled() {
  const hoisted = path.join(process.cwd(), "node_modules", "@tailwindcss", `oxide-${suffix}`);
  const nested = path.join(oxideRoot, "node_modules", "@tailwindcss", `oxide-${suffix}`);
  return fs.existsSync(hoisted) || fs.existsSync(nested);
}

function isLightningcssInstalled() {
  const hoisted = path.join(process.cwd(), "node_modules", lightningcssPkg);
  const nested = path.join(lightningcssRoot, "node_modules", lightningcssPkg);
  return fs.existsSync(hoisted) || fs.existsSync(nested);
}

const needOxide = fs.existsSync(oxideRoot) && !isOxideInstalled();
const needLightning = fs.existsSync(lightningcssRoot) && !isLightningcssInstalled();
const toInstall = [];
// Install both in one go so npm doesn't remove one when adding the other
if (needOxide) toInstall.push(`${oxidePkg}@${OXIDE_VERSION}`);
if (needLightning) toInstall.push(`${lightningcssPkg}@${LIGHTNINGCSS_VERSION}`);
if (!needOxide && needLightning && fs.existsSync(oxideRoot)) toInstall.push(`${oxidePkg}@${OXIDE_VERSION}`);
if (needOxide && !needLightning && fs.existsSync(lightningcssRoot)) toInstall.push(`${lightningcssPkg}@${LIGHTNINGCSS_VERSION}`);

if (toInstall.length === 0) {
  console.log("All optional native modules are present.");
  process.exit(0);
}

console.log("Installing missing optional dependencies:", toInstall.join(", "));
try {
  execSync(`npm install ${toInstall.join(" ")} --no-save`, {
    stdio: "inherit",
    cwd: process.cwd(),
  });
} catch (err) {
  console.error("Install failed. Try: remove node_modules and package-lock.json, then run npm install (with OneDrive paused for this folder).");
  process.exit(1);
}

const oxideOk = !fs.existsSync(oxideRoot) || isOxideInstalled();
const lightningOk = !fs.existsSync(lightningcssRoot) || isLightningcssInstalled();
if (oxideOk && lightningOk) {
  console.log("OK: Optional native modules are now installed. Run your build again.");
} else {
  console.warn("WARN: Some modules may still be missing. Try deleting node_modules and package-lock.json, then npm install.");
  process.exit(1);
}
