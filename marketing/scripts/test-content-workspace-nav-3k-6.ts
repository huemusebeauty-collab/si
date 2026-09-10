import { readFileSync } from "node:fs";
import { join } from "node:path";

const script = readFileSync(join(process.cwd(), "scripts", "patch-content-workspace-nav.js"), "utf8");
if (!script.includes("Open Content Studio")) throw new Error("Content Studio navigation label missing");
if (!script.includes("location.href='/content-studio'")) throw new Error("Content Studio navigation target missing");
console.log(JSON.stringify({ ok: true, test: "content-workspace-nav-3k-6" }));
