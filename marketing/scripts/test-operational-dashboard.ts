import { readFileSync } from "node:fs";
import { join } from "node:path";

const patch = readFileSync(join(import.meta.dirname, "patch-operational-dashboard.js"), "utf8");

const required = [
  "/v1/operations/summary",
  "loadJobAttempts",
  "loadAlerts",
  "dataSource: \"live\"",
  "dataSource: \"unavailable\"",
  "id=\"operationsLive\"",
  "id=\"opQueued\"",
  "id=\"opFailed\"",
  "id=\"opStalled\"",
  "loadOperations",
];

for (const marker of required) {
  if (!patch.includes(marker)) throw new Error(`Operational dashboard patch missing marker: ${marker}`);
}

console.log("operational-dashboard: PASS");
