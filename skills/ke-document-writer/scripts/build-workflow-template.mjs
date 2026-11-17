import { access, mkdir, writeFile, mkdtemp, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--output' || !args[1].endsWith('.xlsx')) {
  throw new Error('Usage: node build-workflow-template.mjs --output <new.xlsx>');
}
const output = path.resolve(args[1]);
try { await access(output); throw new Error('Refusing to overwrite existing output'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(path.dirname(output), { recursive: true });
const commands = [];
const col = i => String.fromCharCode(65 + i);
function set(sheet, address, props) {
  commands.push({ command: 'set', path: `/${sheet}/${address}`, props });
}
function cell(sheet, c, r, text, header = false) {
  set(sheet, `${col(c)}${r}`, { value: text, numberformat: '@',
    'font.name': 'Calibri', 'font.size': header ? '12pt' : '11pt',
    'font.bold': String(header), 'font.color': header ? 'FFFFFF' : '203B4D',
    fill: header ? '176D7A' : 'FFFFFF',
    'alignment.wrapText': 'true', 'alignment.vertical': 'top' });
}
const guide = '01_HuongDan';
const definitions = [
  ['02_Workflow', 'WORKFLOW — LUỒNG NGHIỆP VỤ', ['App*', 'Mã bước*', 'Trạng thái hiện tại*', 'Thao tác*', 'Trạng thái tiếp theo*', 'Ai thực hiện*', 'Người nhận xử lý', 'Điều kiện thực hiện', 'Rule liên quan', 'Ghi chú'], [16, 15, 24, 25, 24, 29, 32, 39, 23, 35]],
  ['03_BusinessRules', 'BUSINESS RULES — QUY TẮC NGHIỆP VỤ', ['App*', 'Mã rule*', 'Tên quy tắc*', 'Áp dụng ở bước*', 'Khi nào áp dụng*', 'Điều kiện', 'Cách xử lý*', 'Thông báo / người nhận', 'Ngoại lệ (nếu có)'], [16, 15, 32, 24, 30, 39, 45, 36, 35]],
];
for (const name of [guide, ...definitions.map(d => d[0])]) {
  commands.push({ command: 'add', parent: '/', type: 'sheet', props: { name } });
}
for (let c = 0; c < 6; c++) set(guide, `col[${col(c)}]`, { width: '17' });
const paragraphs = [
  [1, 'WORKFLOW & BUSINESS RULES — HƯỚNG DẪN ĐIỀN'],
  [3, '1. Workflow: mỗi dòng một bước, ghi trạng thái hiện tại → thao tác → trạng thái tiếp theo.'],
  [5, 'Ví dụ minh họa: REQUEST | WF-01 | Nháp | Gửi duyệt | Chờ duyệt | Người tạo → Trưởng bộ phận.'],
  [7, '2. Business Rules: mỗi dòng một quy tắc, ghi khi nào → điều kiện → cách xử lý.'],
  [9, 'Ví dụ: BR-01 áp dụng WF-01. Khi gửi duyệt, nếu số tiền ≤ 0 thì hiện cảnh báo “Số tiền phải lớn hơn 0”.'],
  [11, 'Mã bước / Mã rule dùng để liên kết hai sheet, không phải App ID. Quy tắc dùng chung: ghi Toàn App.'],
  [13, 'Cột * cần điền. Chưa rõ ghi Chưa chốt. Không có yêu cầu thì để trống; dòng chưa dùng giữ trống.'],
  [15, 'Ai thực hiện = người bấm thao tác. Người nhận xử lý = người phụ trách sau bước đó.'],
  [17, 'Ghi trạng thái ban đầu trong Ghi chú. Trạng thái kết thúc là điểm đến; không tạo thao tác giả.'],
  [19, 'Viết ngắn theo nghiệp vụ. Thêm dòng bằng cách sao chép dòng trống; không cần mô tả API/cấu hình kỹ thuật.'],
  [21, 'Điền xong gửi Kit review. Có thể sửa Excel rồi gửi bản mới; upload không đồng nghĩa duyệt build/deploy.'],
  [23, 'KE-BA-WF-BR • Template 1.0 • Mẫu trống để BA điền • Structure nằm trong file riêng.'],
  [25, 'Các ví dụ chỉ minh họa. Không nhập thông tin đăng nhập hoặc dữ liệu cá nhân thật vào mẫu.'],
];
for (const [r, text] of paragraphs) {
  set(guide, `A${r}:F${r}`, { merge: 'true' }); cell(guide, 0, r, text, r === 1);
  set(guide, `row[${r}]`, { height: r === 1 ? '32' : '40' });
}
for (const [name, title, headers, widths] of definitions) {
  for (const [r, text] of [[1, title], [2, 'Mỗi dòng một mục • Cột * cần điền • Chưa rõ: ghi Chưa chốt']]) {
    set(name, `A${r}:${col(headers.length - 1)}${r}`, { merge: 'true' });
    cell(name, 0, r, text, r === 1); set(name, `row[${r}]`, { height: '32' });
  }
  widths.forEach((w, c) => set(name, `col[${col(c)}]`, { width: String(w) }));
  headers.forEach((h, c) => cell(name, c, 4, h, true));
  set(name, 'row[4]', { height: '42' });
  for (let r = 5; r <= 29; r++) {
    headers.forEach((_, c) => cell(name, c, r, ''));
    set(name, `row[${r}]`, { height: '42' });
  }
  commands.push({ command: 'set', path: `/${name}`, props: {
    freeze: 'C5', zoom: '80', autoFilter: `A4:${col(headers.length - 1)}29`, printTitleRows: '1:4',
  } });
}
commands.push({ command: 'remove', path: '/Sheet1' });
// This fresh build never opens customer files; no stale shared strings/images survive.
function office(args) {
  const result = spawnSync(process.execPath, [path.join(root, 'platform/ke-office-cli/scripts/run-officecli.mjs'), ...args],
    { cwd: root, input: JSON.stringify(commands), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stdout + result.stderr);
  return result.stdout;
}
const batch = path.join(await mkdtemp(path.join(tmpdir(), 'ke-workflow-')), 'batch.json');
await writeFile(batch, JSON.stringify(commands), { flag: 'wx' });
office(['create', output]);
office(['batch', output, '--input', batch, '--stop-on-error', '--json']);
office(['close', output]);
await unlink(batch);
console.log(output);
