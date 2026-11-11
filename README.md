# KE — Kintone Expert Kit

> **Beta `1.0.23-beta.3` — chỉ dùng có giám sát; chưa sẵn sàng cho production.**
> Chỉ dùng trong môi trường dev/test được phép, với dữ liệu synthetic và người vận
> hành theo dõi. Không dùng cho production app hoặc dữ liệu production. Các ví dụ
> cài đặt bên dưới pin đúng beta tag này.

KE là bộ Kit giúp Codex làm việc như một nhóm chuyên gia triển khai Kintone:

- **Tí — PM:** phạm vi, kế hoạch và điều phối.
- **Tèo — BA:** khảo sát, quy trình và yêu cầu nghiệp vụ.
- **LauDe — SA:** kiến trúc giải pháp, dữ liệu và tích hợp.
- **LeBa — Engineer:** cấu hình, phát triển và triển khai Kintone.
- **Mít — Tester:** test case, UAT và kiểm tra phát hành.
- **Cò — Expert Panel:** thảo luận phương án và rủi ro đa chuyên gia.

KE hỗ trợ Demo/PoC, triển khai dự án khách hàng, kiểm tra app hiện có và tư
vấn giải pháp. Kit dùng Kintone MCP cho cấu hình/dữ liệu, Playwright MCP cho
trải nghiệm thật trên trình duyệt và Chrome DevTools MCP cho debug sâu.

## Cài đặt

Yêu cầu:

- Node.js 22 trở lên.
- Codex CLI hoặc Codex app.
- Google Chrome bản stable hiện hành chỉ khi cần kiểm tra bằng browser.
- Tài khoản Kintone phù hợp chỉ khi task thực sự cần tenant access.

Mở terminal tại thư mục muốn cài KE và chạy:

```powershell
npx github:jvmap1710/KintoneExpert-BSS#v1.0.23-beta.3 install
```

Nâng một Kit đã cài mà vẫn giữ cấu hình và project:

```powershell
npx github:jvmap1710/KintoneExpert-BSS#v1.0.23-beta.3 upgrade --dry-run
npx github:jvmap1710/KintoneExpert-BSS#v1.0.23-beta.3 upgrade
```

Upgrade kiểm tra file KE đã bị sửa, backup dưới `.codex/ke-backups/`, migrate
workspace cũ và validate lại. Chỉ dùng `--force` sau khi đã review conflict.

### Nếu đã cài và cấu hình KE từ phiên bản cũ

Không chạy lại `install` để nâng phiên bản. Tại đúng thư mục project đã cài KE,
chạy dry-run trước:

```powershell
npx github:jvmap1710/KintoneExpert-BSS#v1.0.23-beta.3 upgrade --dry-run
```

Đọc các mục `conflicts`, `fromVersion`, `toVersion` và `backupRoot`. Nếu không
có conflict ngoài dự kiến, chạy:

```powershell
npx github:jvmap1710/KintoneExpert-BSS#v1.0.23-beta.3 upgrade
```

Upgrade xử lý cấu hình hiện có như sau:

- Giữ nguyên `platform/ke-kintone-mcp/.env`, Kintone domain và credentials đã
  cấu hình. Installer chỉ tạo `.env` từ mẫu nếu file này chưa tồn tại.
- Giữ nguyên `.codex/ke-preferences.toml`, gồm ngôn ngữ chat và ngôn ngữ tài
  liệu. Muốn đổi, truyền lại `--chat-language` hoặc `--document-languages`.
- Merge block do KE quản lý trong `AGENTS.md`, `.gitignore` và
  `.codex/config.toml`; nội dung riêng nằm ngoài block KE được giữ lại.
- Không xóa project, input, output, evidence hoặc custom file nằm ngoài danh
  sách file do KE quản lý.
- Backup file KE hiện tại và manifest trước khi thay đổi, sau đó tự migrate
  project cũ sang Project State Manager.
- Nếu một file KE-managed đã được sửa thủ công, upgrade dừng và liệt kê
  conflict. Review bản hiện tại với bản backup trước khi dùng `--force`;
  `--force` cho phép KE thay file đó bằng bản mới.

Nếu trước đây đã tùy biến trực tiếp một skill hoặc script mặc định của KE, nên
chuyển phần tùy biến cần giữ sang file riêng hoặc `AGENTS.md` ngoài managed
block rồi mới dùng `--force`.

Sau khi upgrade:

```powershell
npm --prefix platform/ke-kintone-mcp run check
node scripts/ke-project.mjs list
node scripts/ke-project.mjs validate --all
```

`check` chỉ kiểm tra cấu hình cục bộ. Nếu cần kiểm tra kết nối tenant, làm theo
phần “Kết nối Kintone” với environment, test plan, App scope và chấp thuận riêng.

Sau đó đóng và mở lại project trong Codex, trust project và bắt đầu một chat
mới để Codex nạp lại skill và MCP. Nếu `check` vẫn đọc giá trị `.env` cũ, đóng
toàn bộ cửa sổ Codex/VS Code đang giữ environment rồi mở lại.

Installer sẽ:

1. Cài các skill và hướng dẫn vận hành của KE.
2. Cài Kintone MCP, browser MCP và OfficeCLI runtime.
3. Tạo file cấu hình `.env` mẫu nhưng không ghi sẵn credentials.
4. Giữ nguyên nội dung có sẵn trong `AGENTS.md`, `.gitignore` và
   `.codex/config.toml`.

Installer cũng hỏi ngôn ngữ chat và ngôn ngữ tài liệu output. Mặc định của cả
hai là English; user có thể nhập tên ngôn ngữ bất kỳ. Nếu cần hai bản tài liệu,
nhập các ngôn ngữ cách nhau bằng dấu phẩy, ví dụ `English, Vietnamese`. KE sẽ
tạo hai file riêng có cùng nội dung/version và suffix ngôn ngữ.

## Bắt đầu nhanh

Sau khi cài và mở project trong Codex, có thể bắt đầu bằng `hello` hoặc mô tả
thẳng mục tiêu. Lời chào và tư vấn offline không cần credentials, đăng nhập
browser, tenant access hay workspace. Nếu user nêu yêu cầu rõ, KE xử lý trực
tiếp thay vì bắt chọn menu. Có thể gọi thẳng Tèo (BA), LauDe (SA), LeBa
(Engineer), Mít (Tester), Cò (Expert Panel) hoặc Tí (PM) khi phù hợp; không cần
chạy qua PM hay toàn bộ vai trò nếu task không cần.

Với phân tích/tư vấn ad-hoc, trao đổi ngay trong chat. Với công việc cần lưu
artefact hoặc theo dõi dự án, KE tóm tắt danh tính dự án và mục tiêu để user xác
nhận trước khi tạo workspace và các thư mục cần thiết. Xác nhận workspace chỉ
cho phép chuẩn bị không gian làm việc; không đồng nghĩa với quyền truy cập
tenant, đọc App/record hay ghi dữ liệu. Những thao tác đó cần phạm vi và chấp
thuận riêng.

## Chọn định dạng tài liệu

Khi yêu cầu lưu tài liệu, user có thể chọn:

- `HTML`: mặc định, standalone và dễ mở trên browser.
- `DOCX`: BRD, MoM, solution, test report, User Guide, SOP, handover.
- `XLSX`: field catalogue, backlog, mapping, test case, defect/risk register.
- `PPTX`: proposal, executive summary, demo/training hoặc decision workshop.
- Nhiều định dạng cùng lúc, ví dụ `HTML + DOCX`.

Ví dụ:

```text
Xuất User Guide app OT thành HTML và Word.
Xuất field catalogue và test cases thành Excel.
Tạo deck PowerPoint 10 slide để demo giải pháp.
```

Office output được tạo bằng runtime
[iOfficeAI/OfficeCLI](https://github.com/iOfficeAI/OfficeCLI) đã khóa phiên bản.
KE sẽ validate cấu trúc, render lại thành HTML/ảnh để kiểm tra bố cục và đọc
lại nội dung trước khi bàn giao. PDF chưa bật mặc định vì OfficeCLI cần exporter
plugin riêng.

## Kết nối Kintone

Chỉ cấu hình khi task cần truy cập tenant. Credentials nằm trong file local bị
ignore khỏi Git:

```text
platform/ke-kintone-mcp/.env
```

Khi cần, điền `KINTONE_BASE_URL` và chọn một phương thức xác thực:

- `KINTONE_USERNAME` + `KINTONE_PASSWORD`; hoặc
- `KINTONE_API_TOKEN`.

Kiểm tra cấu hình cục bộ không gọi tenant và không hiển thị giá trị secret:

```powershell
node platform/ke-kintone-mcp/scripts/check-config.mjs
```

Chỉ chạy probe kết nối sau khi đã thống nhất tenant/environment, App scope và
test plan, rồi được user chấp thuận rõ ràng. Probe này dùng GET/read-only:

```powershell
node platform/ke-kintone-mcp/scripts/test-connection.mjs --environment test --approved-test-plan <approval-reference> --app <APP_ID>
```

Không cần điền credentials hoặc chạy probe để chào hỏi, tư vấn offline hay bắt
đầu phân tích không cần Kintone.

## Browser evidence

Playwright là kênh browser khi task cần kiểm tra giao diện hoặc luồng nghiệp vụ.
Trước khi mở browser, xác nhận workspace/project và gán binding cụ thể cho
process Codex/browser MCP, sau đó khởi động lại MCP:

```powershell
$env:KE_PROJECT_SLUG = "<project-slug>"
$env:KE_BROWSER_IDENTITY = "tester"
```

Hai biến này cô lập profile/evidence theo project và role; nhãn identity không
xác minh user Kintone đang đăng nhập, cũng không cấp hay giới hạn quyền tenant.
Lần đầu mở Chrome, user tự đăng nhập thủ công bằng account phù hợp với phạm vi
đã duyệt. Chào hỏi và chat-only onboarding không cần binding hay login.

Chrome DevTools là công cụ debug chuyên sâu, không dùng cho thao tác click
thông thường. KE chỉ gọi nó sau khi Playwright tái hiện lỗi để kiểm tra:

- lỗi JavaScript và stack trace trong Console;
- request upload/customization/REST bị 401, 404, 500 hoặc payload sai;
- DOM class, event và computed CSS không đúng;
- tải trang hoặc tương tác chậm.

Ví dụ field giờ OT không đổi màu đỏ: Playwright xác nhận lỗi nhìn thấy và chụp
ảnh; Chrome DevTools kiểm tra file JavaScript có tải thành công, Console có lỗi
không, class/CSS nào thực sự được áp dụng; sau khi sửa, Playwright chạy lại
đúng test case để làm evidence nghiệm thu.

Không đưa password vào prompt hay file cấu hình browser. KE không được đọc
cookie, token, storage state hoặc tab không liên quan. Screenshot/trace gốc
được giữ trong `projects/<project-slug>/private/browser-evidence/`; báo cáo chỉ
tham chiếu evidence đã làm sạch.

Playwright cũng có thể tạo tài liệu hướng dẫn sử dụng từ giao diện thật. Ví dụ:

```text
Tạo User Guide app OT cho nhân viên và Manager, có screenshot từng luồng chính.
```

KE sẽ đi qua luồng đã deploy bằng đúng vai trò, ghi lại tên nút/field đang hiển
thị, chụp ảnh đã làm sạch, chạy lại các bước quan trọng và xuất một file HTML
standalone có version trong `projects/<project-slug>/output/`. Tài liệu phân
biệt rõ bước đã kiểm chứng, chỉ quan sát và còn ở trạng thái thiết kế.

KE Router sẽ giới thiệu Kit và cho phép bắt đầu ở đúng giai đoạn:

1. Discovery Intake.
2. Customer Context.
3. Current-State Assessment / As-Is.
4. Future-State Design / To-Be.
5. Demo / PoC Fast Track.
6. Project Delivery.
7. Existing Solution Assessment.
8. Expert Consultation / Expert Panel.

Tám route là điểm bắt đầu tùy chọn, không phải waterfall bắt buộc. User có thể
chọn một route, yêu cầu trực tiếp một chuyên gia, hoặc mô tả thẳng mục tiêu;
KE chỉ phối hợp thêm vai trò khi công việc thực sự cần. Ví dụ:

```text
Tôi muốn làm PoC cho KH ABCD, dựng nhanh phần phiếu OT.
```

Với câu hỏi offline/ad-hoc, Router trả lời trong chat. Với công việc dự án cần
lưu lại, Router xác nhận identity và mục tiêu trước khi tạo workspace; xác nhận
đó không cho phép truy cập tenant hay ghi dữ liệu. Demo/PoC chỉ cần Mini Intake
của Tèo khi yêu cầu còn thiếu/không rõ; request kiến trúc có thể bắt đầu ở
LauDe, còn spec đã được xác nhận có thể chuyển thẳng cho LeBa.

Demo và dự án thật ưu tiên thao tác Kintone qua MCP tool trực tiếp. Nếu MCP
chưa được nạp, KE sẽ dừng và hướng dẫn kiểm tra cấu hình; agent không được dò
`node_modules`, tự dựng JSON-RPC hoặc âm thầm gọi REST API thay thế.

MCP không hiện write tool có thể do read-only `enabled_tools` allowlist trong
`.codex/config.toml`, không phải giới hạn upstream. Allowlist mặc định không
ghi và không phải rào quyền theo App/account. Không chuyển sang REST, UI hay
shell để né policy. Với thao tác write đã được user duyệt rõ theo App và phạm
vi cụ thể, chỉ thêm upstream tool cần cho thao tác đó, review diff cấu hình,
khởi động lại Codex, làm theo các gate hiện hành rồi khôi phục allowlist
read-only và khởi động lại. Chỉ gọi là upstream capability gap nếu server đã
được nạp, policy đã được tính đến và tool thực sự không được cung cấp.

Khi bất kỳ kênh nào (MCP, REST, browser/UI hay shell) được chấp thuận cho một
thao tác, workspace approval không thay thế phê duyệt tenant/App, record scope
hay synthetic-data writes. Chỉ chạy đúng thao tác, App và dữ liệu đã duyệt;
không mở rộng sang ghi tùy ý.

Với JavaScript customization, Kintone hỗ trợ upload file lấy `fileKey` và gắn
vào cấu hình pre-live qua API `preview`. Đây không phải URL/app chạy thử: KE
xác minh cấu hình trước deploy, xin duyệt deploy, rồi mới test runtime trên app
đã deploy bằng dữ liệu giả lập.

MCP và REST API có thể dùng chung trong một flow: ví dụ MCP tạo app, field và
layout; REST upload/gắn JavaScript nếu MCP hiện tại chưa có thao tác đó. KE ưu
tiên gom các thay đổi tương thích vào pre-live để review và deploy một lần.
Nếu app nền đã live trước, customization được xem là thay đổi mới và cần một
lần xác nhận/deploy tiếp theo.

Sau khi deploy đạt `SUCCESS`, KE tự tạo và trả link app chính xác từ
`KINTONE_BASE_URL`; không dùng domain giả hoặc placeholder.

Process Management cũng có thể tạo/cập nhật bằng REST API chính thức nếu MCP
chưa có tool tương ứng. KE sẽ đọc workflow pre-live hiện tại, giữ các
status/action ngoài phạm vi, cập nhật bằng revision mới nhất, đọc lại để xác
minh rồi xin duyệt deploy. API này hỗ trợ API token và cần quyền App Management.
Kit có lệnh staging dùng cấu hình JSON đầy đủ theo từng dự án và không tự
deploy.

Khi query record không có kết quả, KE kiểm tra schema và đọc mẫu không filter
trước khi kết luận. Kết quả `0 record` do filter không khớp không bị quy thành
lỗi quyền; chỉ lỗi xác thực/phân quyền rõ ràng mới được báo là thiếu quyền.

JavaScript customization dùng helper REST và lệnh staging chung của Kit. Lệnh
tự đọc cấu hình preview trước/sau, xác minh revision và metadata file, bảo toàn
customization cũ và không tự deploy khi read-back chưa đạt.

Khi chạy smoke test trên Demo/PoC hoặc app test, Mít thực thi 5–10 test case,
tạo 5–10 record synthetic có run ID, kiểm tra workflow và luôn xuất một báo
cáo HTML. Kiểm tra cấu hình, API và runtime trình duyệt được báo riêng; không
có runtime evidence thì không được kết luận `PASS` hoặc `demo-ready`.

Trong quá trình build, mỗi task implementation/fix của LeBa đều có hand-off
nhanh sang Mít trước khi KE kết luận task:

```text
LeBa hoàn tất task → Mít Quick Verification → PASS / FAIL / BLOCKED
```

Quick Verification chỉ kiểm 1–3 điểm liên quan trực tiếp đến thay đổi, không
được gọi là smoke test và không tự tạo 5–10 records. Nếu FAIL, task quay lại
LeBa sửa rồi Mít kiểm lại. Chỉ sau khi toàn bộ feature đã hoàn tất và user xác
nhận `OK`, Mít mới chạy smoke test đầy đủ và xuất HTML report.

Mỗi giai đoạn có working template và gate riêng: intake/evidence, customer
context và As-Is, requirements/To-Be, solution blueprint, build/deploy, Quick
Verification, smoke/UAT/release và handover/improvement. Agent chỉ nạp template
của giai đoạn hiện tại và hand-off tiếp theo; không tạo hàng loạt file trống.

Mỗi khi bắt đầu hoặc chuyển vai, chuyên gia sẽ tự giới thiệu tên và vai trò.
Khi đóng một góc nhìn, chuyên gia nêu phần đã chốt, phần chưa xác minh và hỏi
user muốn chuyển chuyên gia, mời Cò thảo luận hay dừng.

## Workspace dự án

Khi user bắt đầu Analysis, Demo/PoC, Existing Solution Assessment hoặc triển
khai khách hàng, KE tạo một workspace riêng:

```text
projects/<project-slug>/
├── .ke-project.json
├── PROJECT.md
├── TEAM-NOTES.md
├── input/
├── private/
├── analysis/
├── output/
└── history/
```

Kit lưu project đang active trong `.codex/ke-active-project.json`. Agent dùng
State Manager thay vì tự đoán folder hoặc cùng sửa trực tiếp state trong
Markdown:

```powershell
node scripts/ke-project.mjs list
node scripts/ke-project.mjs current --project <project-slug>
node scripts/ke-project.mjs show --project <project-slug>
node scripts/ke-project.mjs validate --project <project-slug>
node scripts/ke-project.mjs use --project <project-slug>
```

Các lệnh thay đổi state như `bootstrap`, `transition` và `note` cũng yêu cầu
`--project <project-slug>` tường minh; không dựa vào active pointer để chọn ngầm
project đích.

Eval contract là kiểm thử route/corpus, không chứng minh hành vi end-to-end.
`eval:agent:live` là mô phỏng phân loại route dành riêng cho maintainer trong
source repo; lệnh này không được đóng gói trong installer. Quy tắc “không dùng
tool” chỉ nằm trong prompt, không phải sandbox cô lập tenant; MCP/browser access
không bị cách ly. Không chạy mô phỏng này trong workspace có quyền cao hoặc kết
nối production. Helper được cài đặt `node scripts/run-live-e2e.mjs` chỉ tạo plan
dry-run; `--confirm-live` hiện bị fail-closed vì runner chưa cưỡng chế được ranh
giới App, user và từng hành động đã duyệt. Không xem kết quả mô phỏng hoặc
validation plan là PASS của full behavior E2E:

```powershell
npm run eval:agent:live -- --confirm-live
node scripts/run-live-e2e.mjs --plan e2e/my-test-plan.json --dry-run
```

- `PROJECT.md`: dashboard ngắn, phase/gate, baseline và next owner của dự án.
- `TEAM-NOTES.md`: log có cấu trúc cho finding, question, conflict và hand-off.
- `input/`: tài liệu khách hàng đã được làm sạch, survey, MoM và dữ liệu đầu vào.
- `private/`: dữ liệu nhạy cảm, file gốc và tài liệu không được đưa vào output.
- `analysis/`: evidence register và working analysis nội bộ.
- `output/`: tài liệu bàn giao standalone của riêng dự án đó.
- `history/`: baseline nội bộ cũ và phase notes đã đóng.

`.ke-project.json` là state máy có thẩm quyền; `PROJECT.md` là dashboard chiếu
trạng thái cho người đọc, không phải nguồn state hay tài liệu bàn giao khách
hàng. Khi user mô tả công việc persistent, KE xác nhận identity và mục tiêu
trước, rồi mới tạo workspace và các thư mục cần thiết. Workspace không thay thế
authorization truy cập tenant, scope App/record hay phê duyệt ghi dữ liệu.

## Nguyên tắc an toàn

- Mặc định chỉ đọc Kintone khi khảo sát.
- Mọi thay đổi hoặc deploy đều cần xác nhận theo quy tắc trong `AGENTS.md`.
- Read-only `enabled_tools` trong `.codex/config.toml` là policy allowlist của
  công cụ, không phải authorization theo App/account. Tool thiếu do allowlist
  không được lách qua REST, browser/UI hoặc shell.
- Không commit credentials, token, dữ liệu cá nhân hoặc tài liệu khách hàng.
- Không ghi đè output đã tồn tại nếu chưa được user xác nhận.

Mã nguồn và các bản phát hành:
[github.com/jvmap1710/KintoneExpert-BSS](https://github.com/jvmap1710/KintoneExpert-BSS).
