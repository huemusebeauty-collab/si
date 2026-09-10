import { readFileSync } from "node:fs";
import { join } from "node:path";

const patch = readFileSync(join(__dirname, "patch-dashboard-navigation.js"), "utf8");
const assert = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
assert(patch.includes("content:'/content-studio'"), "Content route mapping is missing");
assert(patch.includes("social:'/social'"), "Social route mapping is missing");
assert(patch.includes("const originalJump=jump"), "Navigation wrapper is missing");
console.log(JSON.stringify({ ok: true, test: "dashboard-navigation" }));
