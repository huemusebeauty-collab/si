import { readFileSync } from "node:fs";
import { join } from "node:path";

const main = readFileSync(join(__dirname, "..", "src", "main.ts"), "utf8");
const social = readFileSync(join(__dirname, "..", "src", "social-center.ts"), "utf8");
const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
assert(main.includes('pathname === "/social"'), "Protected Social Center route is missing");
assert(main.includes('pathname === "/v1/social/dashboard"'), "Social Center API route is missing");
assert(main.includes("socialCenterHtml()"), "Social Center UI is not wired");
assert(social.includes('status: "pending_approval"'), "Social scheduling is not approval-gated");
assert(social.includes("recorded approved approval request"), "Social execution approval guard is missing");
assert(social.includes("No social accounts connected yet."), "Social account state UI is missing");
console.log(JSON.stringify({ ok: true, test: "social-center-route" }));
