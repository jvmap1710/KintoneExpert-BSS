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
    'font.name': 'Calibri', 'font.size': '11pt',
    'font.bold': String(header), 'font.color': header ? 'FFFFFF' : '203B4D',
    fill: header ? 'A6511B' : 'FFFFFF',
    'alignment.wrapText': 'true', 'alignment.vertical': 'top' });
}
const guide = '01_HuongDan';
const headers = ['Assignees', 'Status before taking action', 'Conditions to take this action', 'Action Name', 'Status After Action Taken', 'Business Rules làm rõ bổ sung', 'Xử lý kèm theo (config bằng standard function/plugin native của Kintone)', 'Xử lý kèm theo (customize bổ sung bằng javascript)'];
const widths = [30, 26, 43, 29, 26, 53, 48, 65];
const definitions = [
  ['02_Workflow', 'WORKFLOW — App: … | Luồng: … | Trạng thái ban đầu: … | Draft — chờ BA review', 'Mỗi dòng một chuyển bước • Rules cùng dòng • Tên nghiệp vụ, không cần mã • Chưa rõ: ghi Chưa chốt', [], 'Workflow', 29],
  ['03_ViDu_GiaLap', 'VÍ DỤ GIẢ LẬP — REQUEST | Chỉ minh họa, không phải baseline nghiệp vụ', 'App: Request mẫu | Luồng: Xử lý Request | Trạng thái ban đầu: Nháp | Chỉ là dữ liệu minh họa', [
    ['Người yêu cầu', 'Nháp', 'Người yêu cầu đã điền đủ thông tin cần thiết.', 'Gửi yêu cầu', 'Chờ duyệt', 'Gửi yêu cầu bắt đầu quy trình xem xét trong ví dụ này.'],
    ['Người duyệt', 'Chờ duyệt', 'Người duyệt bắt đầu kiểm tra yêu cầu.', 'Bắt đầu xem xét', 'Đang xem xét', 'Trạng thái riêng giúp nhận biết yêu cầu đang được xử lý.'],
    ['Người duyệt', 'Đang xem xét', 'Yêu cầu đáp ứng tiêu chí xem xét.', 'Phê duyệt', 'Đã duyệt', 'Đã duyệt là trạng thái kết thúc trong ví dụ.'],
    ['Người duyệt', 'Đang xem xét', 'Cần người yêu cầu bổ sung hoặc làm rõ thông tin.', 'Trả lại để bổ sung', 'Nháp', 'Người yêu cầu có thể sửa rồi gửi lại.'],
  ], 'WorkflowExample', 8],
];
for (const name of [guide, ...definitions.map(d => d[0])]) {
  commands.push({ command: 'add', parent: '/', type: 'sheet', props: { name } });
}
for (let c = 0; c < 6; c++) set(guide, `col[${col(c)}]`, { width: '17' });
const paragraphs = [
  [1, 'WORKFLOW & BUSINESS RULES — HƯỚNG DẪN ĐIỀN'],
  [3, '1. Mỗi sheet là một workflow. Đổi tên 02_Workflow theo tên luồng; sao chép sheet khi có luồng khác trong cùng file. Điền App và trạng thái ban đầu ở đầu sheet.'],
  [5, '2. Mỗi dòng: Ai được thao tác | Trạng thái trước | Điều kiện | Tên thao tác | Trạng thái sau. Dùng tên nghiệp vụ, không cần đặt mã.'],
  [7, 'Ví dụ 5 cột đầu: Người tạo | Nháp | Đã điền nội dung yêu cầu | Gửi duyệt | Chờ duyệt.'],
  [9, '3. Business Rules: giải thích quy tắc ngay cùng dòng, ví dụ “Thiếu nội dung: báo Vui lòng nhập nội dung và không cho gửi”.'],
  [11, '4. Hai cột Xử lý kèm theo: ghi thông báo, người nhận, cập nhật dữ liệu hoặc xử lý bổ sung tại bước đó. Chưa biết cách cấu hình thì để trống và mô tả mong muốn trong Business Rules.'],
  [13, 'Assignees là người được thực hiện thao tác ở trạng thái hiện tại. Người nhận sau chuyển bước: ghi rõ trong xử lý kèm theo.'],
  [15, 'Chưa rõ ghi Chưa chốt tại đúng ô. Điều kiện trống là chưa ghi điều kiện, không tự hiểu thành mọi người đều có quyền.'],
  [17, 'Tên trạng thái dùng nhất quán. Không thêm nút cho điểm kết thúc. Quy tắc chung ghi rõ phạm vi Toàn workflow, không tạo chuyển trạng thái giả.'],
  [19, 'BA điền từ đầu hoặc sửa bản Draft do Agent điền. BA gửi bản final trên cùng mẫu để triển khai; các ô chuẩn hóa được đánh dấu để BA review.'],
  [21, 'Phân loại standard/plugin/JavaScript cần được kiểm tra khi triển khai. Gửi file hoặc chốt nội dung không tự cấp quyền build/deploy.'],
  [23, 'KE-BA-WF-BR • Template 2.1 — mẫu BA review thống nhất • Structure và Phân quyền nằm trong các file riêng.'],
  [25, 'Các ví dụ chỉ minh họa. Không nhập thông tin đăng nhập hoặc dữ liệu cá nhân thật vào mẫu.'],
];
for (const [r, text] of paragraphs) {
  set(guide, `A${r}:F${r}`, { merge: 'true' }); cell(guide, 0, r, text, r === 1);
  set(guide, `row[${r}]`, { height: r === 1 ? '32' : '40' });
}
for (const [name, title, subtitle, rows, tableName, lastRow] of definitions) {
  for (const [r, text] of [[1, title], [2, subtitle]]) {
    set(name, `A${r}:${col(headers.length - 1)}${r}`, { merge: 'true' });
    cell(name, 0, r, text, r === 1); set(name, `row[${r}]`, { height: '32' });
  }
  widths.forEach((w, c) => set(name, `col[${col(c)}]`, { width: String(w) }));
  headers.forEach((h, c) => cell(name, c, 4, h, true));
  set(name, 'row[4]', { height: '68' });
  for (let r = 5; r <= lastRow; r++) {
    headers.forEach((_, c) => cell(name, c, r, rows[r - 5]?.[c] ?? ''));
    set(name, `row[${r}]`, { height: name === '02_Workflow' ? '42' : '58' });
  }
  commands.push({ command: 'set', path: `/${name}`, props: {
    freeze: 'C5', zoom: '80', printTitleRows: '1:4',
  } });
  commands.push({ command: 'add', parent: `/${name}`, type: 'table', props: {
    name: tableName, ref: `A4:H${lastRow}`, style: 'light1', showRowStripes: 'true',
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
