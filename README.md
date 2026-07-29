# KE — Kintone Expert Kit

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
- Google Chrome bản stable hiện hành.
- Tài khoản Kintone phù hợp với phạm vi công việc.

Mở terminal tại thư mục muốn cài KE và chạy:

```powershell
npx github:jvmap1710/KintoneExpert-BSS#v1.0.19 install
```

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

Mở file:

```text
platform/ke-kintone-mcp/.env
```

Điền `KINTONE_BASE_URL` và chọn một phương thức xác thực:

- `KINTONE_USERNAME` + `KINTONE_PASSWORD`; hoặc
- `KINTONE_API_TOKEN`.

Kiểm tra cấu hình và kết nối:

```powershell
npm --prefix platform/ke-kintone-mcp run check
npm --prefix platform/ke-kintone-mcp run test:connection
```

Sau đó mở lại project trong Codex, trust project và bắt đầu chat bằng:

```text
hello
```

## Browser evidence

Playwright là “mắt và tay” mặc định của cả team KE. PM, BA, SA, Engineer và
Tester dùng nó để kiểm tra đúng giao diện người dùng đang thấy, chạy luồng
nghiệp vụ, tạo dữ liệu test có kiểm soát và chụp evidence. Lần đầu Playwright
mở Chrome, hãy đăng nhập Kintone thủ công; profile được giữ riêng theo project
và không nằm trong Git.

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

KE Router sẽ giới thiệu Kit và hỏi bạn muốn:

1. Dựng Demo / PoC.
2. Triển khai dự án khách hàng.
3. Kiểm tra hoặc cải tiến app Kintone hiện có.
4. Tư vấn phương án hoặc thảo luận đa chuyên gia.

User có thể trả lời bằng số hoặc mô tả thẳng nhu cầu. Ví dụ:

```text
Tôi muốn làm PoC cho KH ABCD, dựng nhanh phần phiếu OT.
```

Router sẽ xác nhận cách hiểu, tự tạo workspace, ghi mục tiêu vào `PROJECT.md`
và chuyển sang Demo Fast Track.

Demo và dự án thật ưu tiên thao tác Kintone qua MCP tool trực tiếp. Nếu toàn bộ
MCP chưa được nạp, KE sẽ dừng và hướng dẫn kiểm tra cấu hình; agent không được
dò `node_modules`, tự dựng JSON-RPC hoặc âm thầm gọi REST API thay thế.

MCP thiếu một tool không có nghĩa Kintone không hỗ trợ nghiệp vụ đó. KE sẽ nêu
rõ capability gap và hỏi user có muốn dùng UI, công cụ chính thức hay REST API
chính thức. Khi user duyệt REST cho app và thao tác cụ thể, KE được tiếp tục
theo phạm vi đó; không bắt quay lại review lựa chọn kênh.

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

Mỗi khi bắt đầu hoặc chuyển vai, chuyên gia sẽ tự giới thiệu tên và vai trò.
Khi đóng một góc nhìn, chuyên gia nêu phần đã chốt, phần chưa xác minh và hỏi
user muốn chuyển chuyên gia, mời Cò thảo luận hay dừng.

## Workspace dự án

Khi user chọn Demo/PoC hoặc triển khai khách hàng, KE tạo một workspace riêng:

```text
projects/<project-slug>/
├── PROJECT.md
├── input/
├── private/
└── output/
```

- `PROJECT.md`: hồ sơ ngắn để các agent nhận diện và tiếp tục đúng dự án.
- `input/`: tài liệu khách hàng đã được làm sạch, survey, MoM và dữ liệu đầu vào.
- `private/`: dữ liệu nhạy cảm, file gốc và tài liệu không được đưa vào output.
- `output/`: tài liệu HTML do KE tạo cho riêng dự án đó.

`PROJECT.md` không phải tài liệu bàn giao khách hàng. Nó lưu tên/mã dự án, loại
Demo hay triển khai thật, giai đoạn và nguyên tắc làm việc để agent không trộn
dữ liệu giữa các dự án. Khi user mô tả nhu cầu bằng ngôn ngữ tự nhiên, KE
Router xác nhận cách hiểu, tự tạo workspace và ghi mục tiêu đã hiểu vào file
này trước khi bắt đầu luồng chuyên gia.

## Nguyên tắc an toàn

- Mặc định chỉ đọc Kintone khi khảo sát.
- Mọi thay đổi hoặc deploy đều cần xác nhận theo quy tắc trong `AGENTS.md`.
- Không commit credentials, token, dữ liệu cá nhân hoặc tài liệu khách hàng.
- Không ghi đè output đã tồn tại nếu chưa được user xác nhận.

Mã nguồn và các bản phát hành:
[github.com/jvmap1710/KintoneExpert-BSS](https://github.com/jvmap1710/KintoneExpert-BSS).
