# Native plugin — kiến thức tư vấn chung cho KE

Ngày tổng hợp: 2026-11-19. Dùng cùng [catalog](native-plugin-catalog.md) để tìm
ứng viên và [cấu hình theo manual](../../ke-engineer-leba/references/native-plugin-configuration.md)
để kiểm tra khả năng đáp ứng. Đây là tổng hợp tài liệu, **chưa xác nhận runtime**.
Không phải yêu cầu cài toàn bộ plugin, đổi nghiệp vụ, hoặc đi qua mọi role.

## Đọc theo vai trò

| Role | Khi nào đọc / dùng KB | Kết quả cần đưa ra |
| --- | --- | --- |
| Tí — PM | Plugin ảnh hưởng phạm vi, tiến độ, phụ thuộc hoặc nghiệm thu | Hạng mục cài/cấu hình/test, owner hỗ trợ, rủi ro nâng phiên bản và bằng chứng còn thiếu; không ước lượng chắc chắn chỉ từ việc plugin miễn phí. |
| Tèo — BA | Phân tích business rule hoặc đề xuất To-Be | Nhu cầu và acceptance criteria độc lập công nghệ; ghi standard/plugin/custom là phương án, không phải chính sách nghiệp vụ. |
| LauDe — SA | So sánh phương án | Chọn ứng viên theo trigger, kiểu field, device, Guest, dữ liệu, quyền và tương tác plugin; nêu phần không đáp ứng. |
| LeBa — Engineer | Cấu hình plugin được chọn | Đọc đúng mục manual/version; đối chiếu field code/type thật, target App và side effect; trình thay đổi trước khi thực hiện. |
| Mít — Tester | Viết test hoặc nghiệm thu | Chuyển các giới hạn và rule đã duyệt thành test có kết quả mong đợi; ghi đúng mức configuration/API/browser evidence. |

PM/BA chỉ cần phần tư vấn và mục plugin liên quan; không bắt đọc mọi manual.
Thiết kế và kiểm thử chuyên sâu đọc thêm mục cấu hình tương ứng. KB không tự
chuyển role, tạo project hoặc cho quyền truy cập tenant.

## Câu hỏi chọn giải pháp

Chỉ hỏi phần chưa rõ: mục tiêu nghiệp vụ; nguồn/đích dữ liệu; khi nào chạy
(mở form, save, status action, bulk button, REST/import); user/role; desktop hay
mobile/Guest; khối lượng; hành vi khi không khớp, lỗi hoặc chạy lại. Phân biệt
đồng bộ dữ liệu với snapshot lịch sử. Không ép BA cung cấp plugin ID/schema.

Xét standard configuration trước. Chọn plugin khi manual của phiên bản phù hợp
hỗ trợ rule và các giới hạn chấp nhận được. Chọn custom JS/integration khi cần
trigger, kiểm soát lỗi hoặc hành vi mà plugin chưa chứng minh đáp ứng; không
mặc định custom tốt hơn hoặc plugin luôn rẻ hơn.

## Mapping nhu cầu và điểm quyết định

Các lựa chọn dưới đây là gợi ý KE; chi tiết trang nguồn nằm trong mục cấu hình.

| Nhu cầu | Ứng viên | Điểm phải nói rõ khi tư vấn |
| --- | --- | --- |
| Lookup theo field của record hiện tại | Advanced Lookup | Partial Search/Smart Lookup không hỗ trợ mobile; Smart Lookup mở khả năng ghi App nguồn và không bảo đảm script nguồn chạy đúng trong modal. |
| Chạy lookup khi duplicate/App Action | Auto Lookup | Tùy chọn login name có thể ghi đè giá trị lookup; không suy ra chạy server-side cho REST/import. |
| Cập nhật snapshot lookup từ master | Re-Lookup | Không chọn field nghĩa là refresh tất cả lookup; cần chốt có được thay lịch sử hay không. |
| Copy bảng từ master | Table Lookup | Cần map Record Number nguồn sang Number đích; attachments cần khóa dòng. |
| Hiển thị dữ liệu bảng của record liên quan | Advanced Related Records | Cần Blank Space có Element ID; không mobile/Guest/print. Bulk copy có cảnh báo khi dùng category của view. |
| Tổng hợp record liên quan | Related Records Auto-Calculation | Trigger mở list/detail có thể ghi kết quả; rounding có nguy cơ vòng tính liên tục. Không coi mở màn hình luôn là read-only. |
| Điều kiện hiển thị/khóa/bắt buộc | Conditional Field Control | Không phải ACL; hidden/shown không áp dụng list. Field bị ACL che có thể không chịu required của plugin. |
| Bắt nhập trước chuyển trạng thái | Process Management Required Fields | Map cặp before/after status; không hỗ trợ Radio Button/Related Records. Không đồng nghĩa chặn mọi API. |
| Theo dõi/chuyển workflow hàng loạt | Process Management History / Bulk Status Update | Bảng history không phải audit bất biến. Check all của Bulk Status chọn mọi trang khớp filter, không chỉ trang đang xem. |
| Hoàn tất bước ở App A rồi cập nhật App B | Data Transfer | Manual có trigger create/update/status action; phải chốt khóa match và create-if-missing. Tùy chọn xóa lan truyền là thao tác phá hủy, không tự bật. |
| Sinh mã hoặc ghép khóa | Auto-Numbering / Text Connect | Tránh vòng phụ thuộc đầu ra hai plugin. Không hứa số liên tục tuyệt đối; Text Connect không dùng field trong table. |
| Tính ngày và công thức linh hoạt | Date Calculation / Calculate and Fill | Date Calculation không hỗ trợ table và thay đổi Calculated không kích hoạt ngay. Calculate and Fill chỉ cập nhật Lookup qua nút tính ở list. |
| Form dài | Layout standard / Multi-Tab | Multi-Tab cần các Space ID mốc và ranh giới tab; tab không phải quyền truy cập. |
| Lịch, tiến độ, trạng thái dạng thẻ | Calendar / Gantt Chart / Kanban / Stage Visualizer | Calendar xung đột Conditional Format; Gantt/Kanban/Stage không mobile. Stage dropdown không mặc nhiên là Process Management. |
| Tìm một phần chuỗi | Partial Field Search | Cần field chứa dữ liệu tìm kiếm và backfill record cũ; việc bật tìm kiếm có thể kèm bulk ghi dữ liệu. |
| Xem/tải attachment | PDF Preview / Media Player / Bulk Download Attachment | PDF Preview không hiện e-signature; bulk download giới hạn 1 GB. Media Player Guest cần đối chiếu version vì manual và trang giới thiệu mâu thuẫn. |

Riêng Kanban, manual trang 12 ghi record có Description rỗng không hiện trên
board; không kết luận record bị mất hoặc thiếu quyền chỉ từ board trống.
Stage Visualizer map Dropdown/Radio button và field hiện trong dialog; không
suy diễn rằng mọi field trong dialog tự trở thành bắt buộc hoặc có quyền duyệt.

**Nâng cấp không chỉ đổi tên:** migration guide Conditional Display → Conditional
Field Control (July 2026, trang 4–7) ghi khi điều kiện sai, bản mới không tự đảo
output. Muốn giữ hành vi cũ cần rule ngược rõ ràng; PM tính công regression,
BA xác nhận cả nhánh đúng/sai, LeBa đối chiếu per-rule target screen/ngôn ngữ,
Mít thử chuyển đúng → sai ngay trên cùng form. Không tự migrate tenant từ KB.

## Chốt tư vấn và bàn giao

Ghi gọn: **rule nghiệp vụ → phương án → plugin/version ứng viên → mapping/trigger
→ giới hạn và gap → tác động dữ liệu/quyền → acceptance criteria → evidence**.
Mỗi requirement vẫn có thể được BA sửa/duyệt độc lập với công cụ.

Tách `Candidate` (ứng viên), `Manual reviewed` (tài liệu hỗ trợ),
`Configured/read-back` (cấu hình đã đối chiếu), `Runtime verified` (đã test đúng
journey). PM không công bố demo-ready từ hai mức đầu; BA không ghi plugin đã
thỏa rule chỉ vì có tên trong catalog. Với nguồn mâu thuẫn, nêu cả hai và
version/ngày; chọn điều kiện bảo thủ hoặc test để phân xử, không tự bỏ mâu thuẫn.

Hành động tạo/sửa/xóa record, cài/update plugin hoặc deploy vẫn theo
[quyền triển khai](../../ke-engineer-leba/references/plugin-installation.md).
Token trong Settings là bí mật và quyết định quyền truy cập, không phải cách
tự vượt quyền người dùng. Không đưa token vào tài liệu hoặc screenshot.
