# {{DISPLAY_NAME}}

> Hồ sơ làm việc nội bộ của KE. Các agent đọc file này trước khi xử lý để
> nhận diện đúng project và không trộn input/output giữa các dự án.

## Thông tin project

| Thuộc tính | Giá trị |
| --- | --- |
| Mã project | `{{PROJECT_SLUG}}` |
| Loại | {{PROJECT_TYPE}} |
| Tên hiển thị | {{DISPLAY_NAME}} |
| Ngày tạo | {{CREATED_DATE}} |
| Mục tiêu | Chưa xác định |
| Giai đoạn | Khởi tạo |
| Người phụ trách | KE Router |
| Môi trường | Test |

## Cấu trúc dữ liệu

- `input/`: tài liệu khách hàng đã làm sạch, survey, MoM và dữ liệu đầu vào.
- `private/`: file gốc, dữ liệu cá nhân và tài liệu nhạy cảm.
- `output/`: tài liệu HTML do KE tạo cho project này.

## Quy tắc

- Không đưa credentials, token, password hoặc dữ liệu cá nhân vào `output/`.
- Không ghi đè tài liệu đã tồn tại nếu chưa được user xác nhận.
- Cập nhật mục tiêu, giai đoạn và người phụ trách khi project thay đổi.
- Toàn bộ workspace này được Git-ignore mặc định.
