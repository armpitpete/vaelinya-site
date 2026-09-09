import fs from 'node:fs';

const languagePath = 'src/pages/language/index.astro';
const prototypePath = 'src/pages/studio/cultural-records/index.astro';

const language = fs.readFileSync(languagePath, 'utf8');
const prototype = fs.readFileSync(prototypePath, 'utf8');

const errors = [];

for (const [label, text] of [['language page', language], ['cultural-record prototype', prototype]]) {
  if (/public greeting/i.test(text)) {
    errors.push(`${label}: unsupported general/public greeting claim remains`);
  }
}

if (/Lina[’']s greeting:/i.test(language)) {
  errors.push('language page: Lina greeting label remains');
}

if (!language.includes('ena rith vakal') || !language.includes('I speak truth')) {
  errors.push('language page: controlled example sentence is missing');
}

if (!language.includes('deliberately small public introduction')) {
  errors.push('language page: bounded-public-introduction statement is missing');
}

if (!prototype.includes('not as the general Vaelinya greeting')) {
  errors.push('cultural-record prototype: explicit greeting boundary is missing');
}

const lexicon = fs.readFileSync('src/pages/language/lexicon/index.astro', 'utf8');
if (!lexicon.includes('These eleven are approved doorway words')) {
  errors.push('lexicon page: eleven-word public selection boundary is missing');
}
if (!lexicon.includes('public approval does not imply that every word has identical deeper dictionary or canon status')) {
  errors.push('lexicon page: deeper authority distinction is missing');
}

if (errors.length) {
  console.error('VAELINYA PUBLIC LANGUAGE BOUNDARY: FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('VAELINYA PUBLIC LANGUAGE BOUNDARY: PASS');
console.log('- ena rith vakal retained as I speak truth');
console.log('- unsupported general/public greeting claim absent');
console.log('- public language surface explicitly bounded');
