# KE — Kintone Expert Kit

KE là bộ Kit giúp Codex làm việc như một nhóm chuyên gia triển khai Kintone:

- **Tí — PM:** phạm vi, kế hoạch và điều phối.
- **Tèo — BA:** khảo sát, quy trình và yêu cầu nghiệp vụ.
- **Sơn — SA:** kiến trúc giải pháp, dữ liệu và tích hợp.
- **Bình — Engineer:** cấu hình, phát triển và triển khai Kintone.
- **Mít — Tester:** test case, UAT và kiểm tra phát hành.
- **Cò — Expert Panel:** thảo luận phương án và rủi ro đa chuyên gia.

KE hỗ trợ Demo/PoC, triển khai dự án khách hàng, kiểm tra app hiện có và tư
vấn giải pháp. Kit sử dụng Kintone MCP chính thức để kết nối Codex với Kintone.

## Cài đặt

Yêu cầu:

- Node.js 22 trở lên.
- Codex CLI hoặc Codex app.
- Tài khoản Kintone phù hợp với phạm vi công việc.

Mở terminal tại thư mục muốn cài KE và chạy:

```powershell
npx github:jvmap1710/KintoneExpert-BSS#v1.0.10 install
```

Installer sẽ:

1. Cài các skill và hướng dẫn vận hành của KE.
2. Cài Kintone MCP runtime.
3. Tạo file cấu hình `.env` mẫu nhưng không ghi sẵn credentials.
4. Giữ nguyên nội dung có sẵn trong `AGENTS.md`, `.gitignore` và
   `.codex/config.toml`.

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

Khi query record không có kết quả, KE kiểm tra schema và đọc mẫu không filter
trước khi kết luận. Kết quả `0 record` do filter không khớp không bị quy thành
lỗi quyền; chỉ lỗi xác thực/phân quyền rõ ràng mới được báo là thiếu quyền.

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
