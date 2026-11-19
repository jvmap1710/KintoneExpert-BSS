# Advanced Lookup — cấu hình theo manual

Mức bằng chứng: **Manual reviewed; chưa test runtime**. Đối chiếu 2026-11-18.
Nguồn: [trang chính thức và form tải](https://www.kintone.com/en-sea/features/plugins/advanced-lookup/),
`Advanced Lookup Plug-in Tutorial.pdf`, Updated July 2026, 20 trang.
Gallery sau form ghi plugin v2.1.1; không suy rằng version này sẽ luôn mới nhất.
SHA-256 bản PDF đã đọc: `A7650623897C073D88C3277585C1D7133F3DB77993F834D7FB1BB1596DC85DDD`.
Đã đọc toàn bộ text và đối chiếu hình Settings trang 13, 15. File nguồn giữ
nội bộ; tài liệu này là tổng hợp, không đóng gói lại manual của hãng.

## Khi dùng và điều kiện đầu vào

Dùng để lọc lựa chọn của một Lookup theo giá trị field trên record hiện tại.
Cần xác định App nguồn, App chứa Lookup, field khóa nguồn, Lookup đích và cặp
field dùng để lọc. Giá trị khóa nguồn phải duy nhất; dù checkbox cấm trùng không
bắt buộc theo manual, dữ liệu trùng khóa làm chọn kết quả thất bại (trang 18).
Không tự đổi khóa hay làm sạch dữ liệu nếu chưa được duyệt.

## Mapping màn hình Settings

Mở App Settings → Customization and Integration → Plug-ins → bánh răng của
plugin (trang 8–9). Chỉ thực hiện sau khi phạm vi cài/gắn plugin được duyệt.

| Mục trên UI | Điền gì / quyết định cần chốt |
| --- | --- |
| Lookup field | Lookup trong App hiện tại cần bổ sung bộ lọc. |
| Datasource app field | Field của App nguồn để so sánh, không phải field copy ở App hiện tại. |
| Condition | Operator có thật trong dropdown, phù hợp kiểu field hai bên. Không tự bịa cú pháp. |
| In-app field | Field trên record hiện tại cung cấp giá trị lọc. |
| Add new | Thêm điều kiện cho cấu hình này. Manual không làm rõ mọi tổ hợp AND/OR; xác minh UI trước khi cam kết rule phức tạp. |
| [+] | Thêm một cấu hình Advanced Lookup khác; không nhầm với thêm điều kiện. |
| Search Fields | Chọn các field được tìm kiếm. |
| Lookup Result Display Fields | Chọn field hiển thị của kết quả, không đồng nghĩa cấu hình copy field của Lookup standard. |
| Delimiter | Phân cách các giá trị hiển thị; xuất hiện khi chọn nhiều hơn một dòng display field. |
| Enable Partial Search | Bật tìm một phần giá trị khi có nhu cầu; không hỗ trợ mobile cho tính năng này. |
| Enable Smart Lookup | Cho phép tạo/sửa record nguồn từ modal; đây là thay đổi dữ liệu nguồn, không chỉ đọc lookup. |

Manual trang 16 liệt kê các nhóm field lọc gồm text/rich text/text area, số và
calculated, lựa chọn đơn/đa, ngày/giờ, link, user/department/group, creator/updater,
record number, assignee và status. Danh sách hỗ trợ không có nghĩa mọi cặp kiểu
field và operator đều tương thích; xác minh đúng mapping trên UI.

## Ví dụ cấu hình

Ví dụ trong hình trang 13: Lookup **Employee**; field nguồn **Region**;
operator **includes any of**; field hiện tại **Requested Region**. Chọn khu vực
rồi bấm Lookup để lấy nhân viên phù hợp. Đây là ví dụ tài liệu, không phải field
code hoặc yêu cầu mặc định của dự án. Annotation trang 13 còn nhắc “Find Tutor”
nhưng screenshot hiển thị Employee; dùng mapping thực tế, không sao chép tên đó.

## Giới hạn ảnh hưởng thiết kế

- Mobile được hỗ trợ, **trừ Partial Search và Smart Lookup** (trang 20).
- Guest Space được hỗ trợ theo manual; vẫn cần quyền App/record/field tương ứng.
- Logic plugin/JavaScript ở App nguồn có thể không chạy đúng trong modal Smart
  Lookup (trang 18). Không hứa modal thay thế form nguồn đầy đủ.
- Hình trang 15 cảnh báo Partial Search có thể chậm với dữ liệu lớn.
- Menu có import/export cấu hình JSON (trang 19). Đây không phải bằng chứng có
  REST endpoint cấu hình; không suy đoán schema JSON hoặc bỏ qua settings UI.

## Kiểm chứng trước bàn giao

Đây là checklist KE đề xuất, chưa phải kết quả test: đọc lại từng mapping đã
lưu; sau deploy được duyệt, thử khu vực khớp/không khớp/rỗng và thay khu vực;
kiểm tra field copy standard, quyền đọc nguồn và khóa trùng trên dữ liệu test
được phép. Nếu bật Smart Lookup, duyệt riêng record nguồn sẽ tạo/sửa và thử logic
App nguồn trong modal. Nếu mobile thuộc phạm vi, thử đường lookup được hỗ trợ,
không gọi hai tính năng bị loại trừ là mobile PASS.

Theo [quy trình triển khai plugin](../../ke-engineer-leba/references/plugin-installation.md):
cài tenant, gắn App, cấu hình, deploy và runtime là các trạng thái riêng biệt.
