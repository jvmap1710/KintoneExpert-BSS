import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expected = [
  'skills/ke-document-writer/assets/KE-BA-Permissions-Template-vi.xlsx',
  'skills/ke-document-writer/assets/KE-BA-Structure-Template-v3.xlsx',
  'skills/ke-document-writer/assets/KE-BA-Workflow-BusinessRules-Template-vi.xlsx',
].sort();
async function excelFiles(relative) {
  const found = [];
  for (const item of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const next = `${relative}/${item.name}`;
    if (item.isDirectory()) found.push(...await excelFiles(next));
    else if (/\.(xlsx|xls|xlsm|xltx)$/i.test(item.name)) found.push(next);
  }
  return found.sort();
}
assert.deepEqual(await excelFiles('skills'), expected, 'Only three canonical Excel assets; no old/sample variants');
const installer = await readFile(path.join(root, 'dist/ke-installer.mjs'), 'utf8');
const match = installer.match(/const embeddedPayload = "([A-Za-z0-9+/=]+)"/);
assert(match, 'Build before checking package');
const payload = JSON.parse(gunzipSync(Buffer.from(match[1], 'base64')));
assert.deepEqual(payload.filter(x => /\.(xlsx|xls|xlsm|xltx)$/i.test(x.path)).map(x => x.path).sort(), expected);
for (const name of expected) {
  assert.equal(payload.find(x => x.path === name).content, (await readFile(path.join(root, name))).toString('base64'));
}
console.log('PASS: exactly three canonical BA Excel assets, packaged byte-for-byte');
