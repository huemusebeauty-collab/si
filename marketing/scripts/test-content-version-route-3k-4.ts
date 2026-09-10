import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function run() {
  const patch = await readFile(new URL("./patch-main.js", import.meta.url), "utf8");
  const api = await readFile(new URL("../src/content-version-api.ts", import.meta.url), "utf8");
  const repo = await readFile(new URL("../src/content-version-repository.ts", import.meta.url), "utf8");
  assert.match(patch, /contentVersionApi\.create/);
  assert.match(patch, /contentVersionApi\.list/);
  assert.match(patch, /contentVersionApi\.get/);
  assert.match(patch, /contentVersionRepository\.hydrate/);
  assert.match(api, /createFromContent/);
  assert.match(repo, /marketing_hq_content_versions/);
  console.log("3K-4 content version route contract test passed");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
