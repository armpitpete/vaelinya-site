import fs from 'node:fs';

const dir = '.github/workflows';
const allowedHosted = new Set(['ubuntu-latest']);
const errors = [];
let checked = 0;

for (const name of fs.readdirSync(dir).filter((n) => /\.ya?ml$/.test(n)).sort()) {
  const path = `${dir}/${name}`;
  const text = fs.readFileSync(path, 'utf8');
  checked += 1;
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const code = line.split('#', 1)[0];
    const match = code.match(/runs-on:\s*(.+)\s*$/);
    if (!match) continue;
    const target = match[1].trim();
    if (target.includes('matrix.')) {
      errors.push(`${path}:${index + 1}: runner matrix requires explicit cost review: ${target}`);
      continue;
    }
    if (target.startsWith('[') && target.includes('self-hosted')) continue;
    if (!allowedHosted.has(target)) {
      errors.push(`${path}:${index + 1}: unapproved public runner target: ${target}`);
    }
  }
}

if (errors.length) {
  console.error('VAELINYA SITE ZERO-BILLED CI POLICY: FAIL');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('VAELINYA SITE ZERO-BILLED CI POLICY: PASS');
console.log(`- workflows scanned: ${checked}`);
console.log('- approved public hosted target: ubuntu-latest');
console.log('- larger/custom hosted runners: none');
