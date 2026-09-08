const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'dist', 'main.js');
let source = fs.readFileSync(file, 'utf8');
const replacements = [
  ['marketing.requestApproval(await readJson(request))', 'await marketing.requestApprovalDurable(await readJson(request))'],
  ['marketing.approve(approvalMatch[1], body)', 'await marketing.decideApprovalDurable(approvalMatch[1], "approved", body.actor ?? "marketing-hq")'],
  ['marketing.reject(approvalMatch[1], body)', 'await marketing.decideApprovalDurable(approvalMatch[1], "rejected", body.actor ?? "marketing-hq")'],
];
for (const [from, to] of replacements) {
  if (source.includes(from)) source = source.replace(from, to);
  else if (!source.includes(to)) throw new Error(`HQ durable route marker not found: ${from}`);
}
fs.writeFileSync(file, source);
console.log('HQ durable approval route patch applied');
