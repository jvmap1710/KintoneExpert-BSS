import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inflateRawSync, gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const asset = 'skills/ke-document-writer/assets/KE-BA-Workflow-BusinessRules-Template-vi.xlsx';
// Read central-directory ZIP entries, including archives using data descriptors.
const bytes = await readFile(path.join(root, asset));
let end = bytes.length - 22;
while (end >= Math.max(0, bytes.length - 65557) && bytes.readUInt32LE(end) !== 0x06054b50) end--;
assert(end >= 0, 'ZIP directory missing');
let offset = bytes.readUInt32LE(end + 16);
const entries = new Map();
for (let i = 0; i < bytes.readUInt16LE(end + 10); i++) {
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50);
  const size = bytes.readUInt32LE(offset + 20), method = bytes.readUInt16LE(offset + 10);
  const nameLength = bytes.readUInt16LE(offset + 28), extra = bytes.readUInt16LE(offset + 30), comment = bytes.readUInt16LE(offset + 32);
  const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString();
  const local = bytes.readUInt32LE(offset + 42);
  const start = local + 30 + bytes.readUInt16LE(local + 26) + bytes.readUInt16LE(local + 28);
  const raw = bytes.subarray(start, start + size);
  assert([0, 8].includes(method), 'Unsupported ZIP compression');
  entries.set(name, method === 8 ? inflateRawSync(raw) : raw);
  offset += 46 + nameLength + extra + comment;
}
const xml = buffer => buffer.toString().replace(/(<\/?)[A-Za-z_][\w.-]*:/gu, '$1');
const workbook = xml(entries.get('xl/workbook.xml'));
assert.deepEqual([...workbook.matchAll(/<sheet\s[^>]*name="([^"]+)"/gu)].map(m => m[1]), ['01_HuongDan', '02_Workflow', '03_ViDu_GiaLap']);
assert(!/state="(?:hidden|veryHidden)"/u.test(workbook));
let workflowSheets = 0;
let blankSheets = 0;
let sampleSheets = 0;
const orderedHeaders = [
  'Assignees', 'Status before taking action', 'Conditions to take this action', 'Action Name',
  'Status After Action Taken', 'Business Rules làm rõ bổ sung',
  'standard function/plugin native', 'customize bổ sung bằng javascript',
];
for (const [name, content] of entries) {
  assert(!/media\/|externalLinks\/|comments|vbaProject/iu.test(name), `Unexpected embedded content: ${name}`);
  if (!name.endsWith('.xml')) continue;
  const text = xml(content);
  assert(!/Ticket|Responsible Person|Device Serial|1518|1515|cybozu\.com|kintone\.com|Repairing|WF-14/u.test(text), `Customer source in ${name}`);
  assert(!/<f(?:\s|>)/u.test(text), 'Unexpected executable formula');
  if (!name.startsWith('xl/worksheets/')) continue;
  if (text.includes('Status before taking action')) {
    workflowSheets++;
    assert(text.includes('Assignees') && text.includes('Business Rules làm rõ bổ sung'));
    assert(text.includes('standard function/plugin native') && text.includes('customize bổ sung bằng javascript'));
    let lastHeaderIndex = -1;
    for (const header of orderedHeaders) {
      const index = text.indexOf(header);
      assert(index > lastHeaderIndex, `Workflow header order changed in ${name}: ${header}`);
      lastHeaderIndex = index;
    }
    if (text.includes('Draft — chờ BA review')) {
      blankSheets++;
      for (const match of text.matchAll(/<c\b[^>]*\br="([A-Z]+)(\d+)"[^>]*>([\s\S]*?)<\/c>/gu)) {
        if (+match[2] < 5 || +match[2] > 29) continue;
        assert(!/<v>[^<]+<\/v>|<t(?:\s[^>]*)?>[^<]+<\/t>/u.test(match[3]), `Nonblank BA input ${match[1]}${match[2]}`);
      }
    } else if (text.includes('Chỉ là dữ liệu minh họa')) {
      sampleSheets++;
      for (const example of ['Người yêu cầu', 'Người duyệt', 'Gửi yêu cầu', 'Bắt đầu xem xét', 'Phê duyệt', 'Trả lại để bổ sung']) {
        assert(text.includes(example), `Missing synthetic workflow example content: ${example}`);
      }
      for (let row = 5; row <= 8; row++) {
        for (const col of ['G', 'H']) {
          const match = text.match(new RegExp(`<c\\b[^>]*\\br="${col}${row}"[^>]*>([\\s\\S]*?)<\\/c>`, 'u'));
          assert(match && !/<v>[^<]+<\/v>|<t(?:\s[^>]*)?>[^<]+<\/t>/u.test(match[1]), `Example implementation cell ${col}${row} must stay blank`);
        }
      }
    } else {
      assert.fail(`Unrecognized workflow sheet in ${name}`);
    }
  }
}
assert.equal(workflowSheets, 2, 'Exactly one blank workflow input and one synthetic example are expected');
assert.equal(blankSheets, 1, 'The 25-row BA input sheet must remain blank');
assert.equal(sampleSheets, 1, 'One clearly labeled synthetic sample sheet is expected');
const tables = [...entries].filter(([name]) => /^xl\/tables\/[^/]+\.xml$/u.test(name));
assert.equal(tables.length, 2, 'One native table per blank/sample workflow sheet');
const tableRefs = tables.map(([, content]) => xml(content).match(/ref="([^"]+)"/u)?.[1]).sort();
assert.deepEqual(tableRefs, ['A4:H29', 'A4:H8'], 'Blank input remains 25 rows and sample has 4 transitions');
// Installer must carry exact binary bytes, not just mention the asset path.
const cli = await readFile(path.join(root, 'dist/ke-installer.mjs'), 'utf8');
const embedded = cli.match(/const embeddedPayload = "([A-Za-z0-9+/=]+)"/u);
assert(embedded, 'Build installer before testing packaged asset');
const payload = JSON.parse(gunzipSync(Buffer.from(embedded[1], 'base64')).toString());
assert.equal(payload.find(record => record.path === asset)?.content, bytes.toString('base64'), 'Installer must preserve exact XLSX bytes');
assert(!payload.some(record => /TicketSample|ticket-workflow-review|\.build\.json|\/input\/.+\.(?:pdf|html|xlsx)/iu.test(record.path)), 'Customer material must not be packaged');
console.log('PASS: clean guide + blank 8-column workflow input + four-row synthetic sample; no customer source, images, macros, formulas or external links; installer asset present.');
