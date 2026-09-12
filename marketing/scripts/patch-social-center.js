const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'dist', 'main.js');
let source = fs.readFileSync(file, 'utf8');
if (!source.includes('const social_persistence_1 = require("./social-persistence");')) {
  source = source.replace(/"use strict";\n/, '"use strict";\nconst social_persistence_1 = require("./social-persistence");\n');
}
const from = 'const social = new social_center_1.SocialCenter();';
const to = 'const social = new social_center_1.SocialCenter(persistence ? new social_persistence_1.NeonSocialPersistence() : undefined, (approvalRequestId) => security.canExecute("publish_content", approvalRequestId));';
if (source.includes(from)) source = source.replace(from, to);
else if (!source.includes(to)) throw new Error('Social Center initialization marker not found');
const hydrationWithCreators = 'Promise.all([security.hydrate(), domainStore.hydrate(), creators.hydrate()])';
const hydrationWithSocial = 'Promise.all([security.hydrate(), domainStore.hydrate(), creators.hydrate(), social.hydrate()])';
if (source.includes(hydrationWithCreators)) source = source.replace(hydrationWithCreators, hydrationWithSocial);
else if (!source.includes('social.hydrate()')) throw new Error('Social Center startup hydration marker not found');
fs.writeFileSync(file, source);
console.log('Social Center persistence wiring patched');
