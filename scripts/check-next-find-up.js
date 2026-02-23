"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const base = path.join(process.cwd(), "node_modules", "next", "dist", "compiled");
const asDir = path.join(base, "find-up");
const asJs = path.join(base, "find-up.js");
let exists =
  fs.existsSync(asDir) ||
  fs.existsSync(asJs) ||
  fs.existsSync(path.join(asDir, "index.js"));

function log(data) {
  const payload = {
    sessionId: "2ce324",
    runId: process.env.DEBUG_RUN_ID || "pre-fix",
    hypothesisId: "H1",
    location: "scripts/check-next-find-up.js",
    message: "next/dist/compiled/find-up exists check",
    data: { ...data, asDir, asJs },
    timestamp: Date.now(),
  };
  // #region agent log
  require("http")
    .request(
      {
        hostname: "127.0.0.1",
        port: 7644,
        path: "/ingest/106ddacd-d13a-4e30-9623-f96e43c26fed",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "2ce324",
        },
      },
      () => {}
    )
    .on("error", () => {})
    .end(JSON.stringify(payload));
  // #endregion
}

log({ exists });

if (!exists) {
  const nextDir = path.join(process.cwd(), "node_modules", "next");
  if (fs.existsSync(nextDir)) {
    try {
      fs.rmSync(nextDir, { recursive: true, maxRetries: 3 });
    } catch (_) {}
    execSync("npm install next@15.5.6", { stdio: "inherit", cwd: process.cwd() });
    exists =
      fs.existsSync(asDir) ||
      fs.existsSync(asJs) ||
      fs.existsSync(path.join(asDir, "index.js"));
    log({ exists, reinstalled: true });
  }
}
