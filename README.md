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
npx github:jvmap1710/KintoneExpert-BSS#v1.0.5 install
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
