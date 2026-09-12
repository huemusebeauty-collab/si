import { readFileSync } from "node:fs";
import { join } from "node:path";

const main = readFileSync(join(__dirname, "..", "dist", "main.js"), "utf8");
const creator = readFileSync(join(__dirname, "..", "dist", "creator-center.js"), "utf8");
const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
assert(main.includes('pathname === "/creators"'), "Protected Creator Center route is missing");
assert(main.includes('pathname === "/v1/creators/dashboard"'), "Creator Center API route is missing");
assert(main.includes("creatorCenterHtml"), "Creator Center UI is not wired");
assert(creator.includes("creatorCenterDashboard"), "Creator Center dashboard contract is missing");
assert(creator.includes("rankCreators(50)"), "Creator ranking is not wired");
assert(creator.includes("Sample kits"), "Creator sample-kit surface is missing");
console.log(JSON.stringify({ ok: true, test: "creator-center-route" }));
