# Native Kintone plug-ins — knowledge base tư vấn

Đối chiếu nguồn: **2026-11-18**. Phạm vi: **30 plugin** được liệt kê trên
[Native Kintone Plug-ins SEA](https://www.kintone.com/en-sea/features/plugins/),
không phải toàn bộ marketplace hoặc plugin đối tác trên thế giới.
Trang catalog giới thiệu đây là plugin miễn phí do đội Kintone xây dựng.
Kiểm tra lại điều khoản tải/sử dụng và phiên bản khi lựa chọn; miễn phí không
đồng nghĩa được đóng gói lại ZIP vào repo hoặc không cần bảo trì.

## Cách sử dụng và mức bằng chứng

Điểm vào theo nhiệm vụ: [tư vấn chung PM/BA/SA](native-plugin-advisory.md);
[cấu hình theo từng manual cho LeBa và test planning cho Mít](../../ke-engineer-leba/references/native-plugin-configuration.md).
Đã thu thập manual cho 30 plugin và một migration guide. Thu thập file không
đồng nghĩa đã test; xem mức review và version tại từng mục cấu hình.

**Khác biệt nguồn cần giữ lại:** trang Media Player trong snapshot catalog ghi
Guest: No, nhưng manual tải kèm Gallery v2.7.0, trang 16 ghi Guest: Yes. Dùng
manual phù hợp version khi thiết kế và kiểm thử Guest trước khi cam kết;
không coi hàng snapshot bên dưới là kết luận duy nhất cho mọi phiên bản.

Hướng dẫn sâu đầu tiên: [Advanced Lookup](native-plugin-advanced-lookup.md)
(July 2026, 20 trang); các mục khác tra cứu trong cấu hình theo manual ở trên.
Manual Advanced Lookup
xác nhận mobile **không hỗ trợ Partial Search/Smart Lookup**, dù trang giới thiệu
ghi Mobile: Yes.

- **Documented**: đã đọc trang chi tiết chính thức cho cả 30 mục; tính năng và
  tương thích dưới đây là tuyên bố của nguồn. **Chưa cài, chưa test runtime**.
- Không tuyên bố đã đọc manual đầy đủ, xem hết video, xác minh ZIP, phiên bản
  mới nhất hoặc cấu hình được mọi rule. Trang sản phẩm là điểm vào tài liệu và
  download; chưa xác minh direct ZIP URL, checksum hoặc schema cấu hình.
- Mobile / Guest là khả năng **plugin** theo trang nguồn, không đảm bảo MCP,
  API, account hoặc từng browser của dự án hỗ trợ cùng phạm vi.
- Cột “Cần kiểm tra” là checklist kỹ thuật của KE, **không phải lỗi đã xác
  nhận của plugin**. Ví dụ ứng dụng là gợi ý, không phải yêu cầu khách hàng.
- Recheck trang nguồn, gói phát hành, hướng dẫn và plugin có sẵn trên tenant
  trước khi chốt thiết kế. Nếu nguồn đổi hoặc mâu thuẫn, ghi ngày/version và
  phần chưa rõ; không dùng snapshot này như bằng chứng runtime.
- Dùng ba nhóm riêng: **Standard configuration** (tính năng có sẵn),
  **Native plug-in** (extension phải cài), **Custom JavaScript/integration**.
  So sánh khả năng đáp ứng và chi phí bảo trì; không chọn plugin chỉ vì miễn phí.
- Không coi ẩn field, khóa UI hoặc giấu nút là ACL. Không suy rằng plugin
  browser sẽ chạy với record tạo/cập nhật qua REST, import hay automation.
  Kiểm tra đúng trigger, đường nhập dữ liệu và quyền theo vai trò.

## Lookup và dữ liệu liên quan — 6 plugin

| Plugin / nguồn chi tiết | Khả năng được mô tả | Mobile | Guest | Cần kiểm tra trước khi chốt |
| --- | --- | --- | --- | --- |
| [Advanced Lookup](https://www.kintone.com/en-sea/features/plugins/advanced-lookup/) | Dùng giá trị field làm bộ lọc lookup động. | Có | Có | Kiểu field, khóa lookup, điều kiện kết hợp, trường hợp không có kết quả và quyền đọc nguồn. |
| [Advanced Related Records](https://www.kintone.com/en-sea/features/plugins/advanced-related-records/) | Hiển thị dữ liệu bảng từ App nguồn trong related records; copy dữ liệu sang bảng của App hiện tại; định dạng có điều kiện. | Không | Không | Mapping bảng, phạm vi copy, quyền nguồn/đích và lượng dữ liệu. Không chọn khi mobile/Guest là bắt buộc. |
| [Auto Lookup](https://www.kintone.com/en-sea/features/plugins/auto-lookup/) | Chạy lookup khi tạo record từ App Action hoặc duplicate; có thể dùng login name của user cho lookup. | Có | Có | Phân biệt đúng sự kiện tạo record; không suy ra tự chạy cho mọi API/import. |
| [Re-Lookup](https://www.kintone.com/en-sea/features/plugins/re-lookup/) | Refresh hàng loạt các giá trị được lookup copy sau khi dữ liệu nguồn hoặc mapping đổi. | Có | Không | Phạm vi record bị cập nhật, giữ lịch sử hay đồng bộ master, lỗi từng record và rollback. |
| [Table Lookup](https://www.kintone.com/en-sea/features/plugins/table-lookup/) | Map giá trị các dòng bảng trong App nguồn vào bảng của App hiện tại qua lookup. | Có | Có | Khóa nguồn, mapping cột, replace/append và hành vi khi không tìm thấy. |
| [Related Records Auto-Calculation](https://www.kintone.com/en-sea/features/plugins/related-records-auto-calculation/) | Tính toán trên Related Records; có trigger khi save, mở list/detail hoặc bấm nút tại list/detail. | Có | Có | Trigger đã chọn, thời điểm dữ liệu cập nhật, quyền đọc record liên quan và độ mới của kết quả. |

## Tính toán, số định danh và xử lý bảng — 7 plugin

| Plugin / nguồn chi tiết | Khả năng được mô tả | Mobile | Guest | Cần kiểm tra trước khi chốt |
| --- | --- | --- | --- | --- |
| [Auto-Numbering](https://www.kintone.com/en-oceania/features/plugins/auto-numbering/) | Sinh số/định danh khi tạo record, reset theo ngày/tháng/năm; có thể cấm trùng. | Có | Có | Tạo đồng thời, khoảng trống số, reset/timezone, import/API và phạm vi duy nhất. Không hứa đánh số liên tục tuyệt đối. |
| [Calculate and Fill](https://www.kintone.com/en-sea/features/plugins/calculate-and-fill/) | Tính text/number/date linh hoạt, dùng ngày giờ hiện tại, min/max giữa field hoặc trong bảng; hỗ trợ bulk calculation update. | Có | Có | Hàm thực có, thứ tự tính, kiểu đích, rounding/timezone và tác động bulk update. |
| [Conditional Table Summation](https://www.kintone.com/en-oceania/features/plugins/conditional-table-summation/) | Cộng giá trị bảng theo điều kiện ở cùng dòng bảng. | Có | Có | Điều kiện nhiều cột, dòng trống, số âm và trigger tính lại. |
| [Date Calculation](https://www.kintone.com/en-sea/features/plugins/date-calculation/) | Tính Date/Date and Time rồi ghi vào field ngày giờ để dùng với reminder. | Có | Có | Đơn vị, timezone, ngày nghỉ/lịch làm việc và trigger; không mặc định có business-day calendar. |
| [Duplicate Record Number](https://www.kintone.com/en-sea/features/plugins/duplicate-record-number/) | Copy Record Number vào Text/Number để sử dụng tiếp trong tính toán. | Có | Một phần: không bulk update record cũ | Thời điểm có Record Number, backfill record cũ và khác biệt với Auto-Numbering. |
| [Recalculation](https://www.kintone.com/en-sea/features/plugins/recalculation/) | Refresh Calculated/Text auto-calculation khi đổi công thức; đồng thời refresh lookup. | Không | Có | Phạm vi cập nhật, ảnh hưởng lookup ngoài công thức và khả năng phục hồi. |
| [Table Field Concatenation](https://www.kintone.com/en-sea/features/plugins/table-field-concatenation/) | Ghép nhiều giá trị trong bảng thành một Text field ngoài bảng. | Có | Có | Cột nguồn, thứ tự dòng, dấu phân cách, giá trị rỗng và độ dài field đích. |

## Điều kiện, quy trình và dữ liệu liên App — 5 plugin

| Plugin / nguồn chi tiết | Khả năng được mô tả | Mobile | Guest | Cần kiểm tra trước khi chốt |
| --- | --- | --- | --- | --- |
| [Conditional Field Control](https://www.kintone.com/en-sea/features/plugins/conditional-field-control/) | Theo điều kiện field: cho sửa/khóa, hiện/ẩn hoặc bắt buộc nhập field. | Có | Có | Event, field type, nhiều rule xung đột, hành vi API/import; không dùng thay phân quyền field. |
| [Data Transfer](https://www.kintone.com/en-sea/features/plugins/data-transfer/) | Tạo/cập nhật record ở App đích khi điều kiện nguồn thỏa; hỗ trợ record→record và dòng bảng→nhiều record. | Có | Không | Trigger cụ thể, khóa upsert, chống tạo trùng/vòng lặp, quyền đích, lỗi một phần và retry. Không mặc định là đồng bộ hai chiều. |
| [Process Management History](https://www.kintone.com/en-sea/features/plugins/process-management-history/) | Ghi lịch sử status vào bảng trong record để xem và xuất CSV. | Có | Có | Có ghi nhận các đường đổi status API/bulk không; quyền sửa bảng lịch sử. Không mặc định là audit log bất biến. |
| [Process Management Required Fields](https://www.kintone.com/en-oceania/features/plugins/process-management-required-fields/) | Yêu cầu field đáp ứng điều kiện trước khi tiến hành Process Management; hiển thị lỗi nếu chưa đạt. | Có | Có | Mapping status/action, kiểu field, thông báo và đường chuyển qua API; không suy ra chặn mọi kênh ghi. |
| [Bulk Status Update](https://www.kintone.com/en-sea/features/plugins/bulk-status-update/) | Nút ở list để chuyển hàng loạt các record được chọn có cùng status; có tùy chọn hiển thị history trong bảng. | Không | Có | Quyền/assignee từng record, action hợp lệ, field bắt buộc và lỗi một phần. Bulk test cần phạm vi record được duyệt. |

## Giao diện và trực quan hóa — 6 plugin

| Plugin / nguồn chi tiết | Khả năng được mô tả | Mobile | Guest | Cần kiểm tra trước khi chốt |
| --- | --- | --- | --- | --- |
| [Calendar](https://www.kintone.com/en-sea/features/plugins/calendar-plug-in/) | Lịch tuần/tháng, kéo vùng thời gian để tạo record, liên kết tới record detail. | Có | Có | Field thời gian, timezone và thao tác tạo record. Nguồn ghi **không tương thích Conditional Format**. |
| [Conditional Format](https://www.kintone.com/en-sea/features/plugins/conditional-format/) | Màu chữ/nền và cỡ chữ theo giá trị; list hỗ trợ định dạng trừ cỡ chữ. | Có | Có | View/field được áp dụng và xung đột CSS. Nguồn ghi **không tương thích Calendar**. |
| [Gantt Chart](https://www.kintone.com/en-sea/features/plugins/gantt-chart/) | Trực quan task/project theo thời gian dưới dạng Gantt. | Không | Có | Field ngày/progress và khả năng dependency thực tế. Phần giải thích Gantt chung không chứng minh có auto-scheduling. |
| [Kanban](https://www.kintone.com/en-sea/features/plugins/kanban/) | Card theo category/status, kéo thả sắp xếp, tag màu và mở record detail. | Không | Có | Kéo thả thay đổi field nào, có phải Process Management action không, quyền và rule transition. |
| [Multi-Tab](https://www.kintone.com/en-sea/features/plugins/multi-tab/) | Chia form/detail thành tab; dùng ở create/edit/detail, chọn tab đầu hoặc tab vừa xem làm mặc định. | Có | Có | Field bắt buộc nằm tab khác, mobile layout, tương tác với Field Group và rule hiện/ẩn. |
| [Stage Visualizer](https://www.kintone.com/en-us/features/plugins/stage-visualizer/) | Hiển thị Stage; click bước đổi dropdown; chỉ định field cần điền khi đổi stage. | Không | Có | Stage dropdown không mặc nhiên là Process Management status hoặc quyền duyệt. |

## Tệp đính kèm — 3 plugin

| Plugin / nguồn chi tiết | Khả năng được mô tả | Mobile | Guest | Cần kiểm tra trước khi chốt |
| --- | --- | --- | --- | --- |
| [Bulk Download Attachment](https://www.kintone.com/en-sea/features/plugins/bulk-download-attachment/) | Tải attachment hàng loạt ở list (App) hoặc detail (record). | Không | Không | Quyền truy cập, phạm vi record, dung lượng, tên file trùng và nơi lưu dữ liệu. |
| [Media Player](https://www.kintone.com/en-sea/features/plugins/media-player/) | Phát audio/video trong Attachment, kể cả attachment trong bảng. | Có | Không | Codec, browser, dung lượng; tiêu đề nguồn có Ver. 2.5.1, không coi đó là latest binary đã xác minh. |
| [PDF Preview](https://www.kintone.com/en-sea/features/plugins/pdf-preview/) | Xem PDF attachment trực tiếp trong giao diện record. | Không | Có | PDF lớn/mã hóa, browser và quyền attachment; thử đúng file synthetic. |

## Tìm kiếm và ghép text — 3 plugin

| Plugin / nguồn chi tiết | Khả năng được mô tả | Mobile | Guest | Cần kiểm tra trước khi chốt |
| --- | --- | --- | --- | --- |
| [Partial Field Search](https://www.kintone.com/en-sea/features/plugins/partial-field-search/) | Ô tìm kiếm tại list cho phép tìm một phần từ trên các field chỉ định. | Có | Có | Field type, ngôn ngữ/dấu tiếng Việt, hiệu năng và volume. |
| [Simple Text Search](https://www.kintone.com/en-sea/features/plugins/simple-text-search/) | Ô tìm kiếm keyword ở list; **không hỗ trợ partial search**. | Có | Có | Chọn field, keyword semantics và mục tiêu tìm kiếm chính xác. |
| [Text Connect](https://www.kintone.com/en-sea/features/plugins/text-connect/) | Ghép tối đa 5 field vào Text, hỗ trợ Text Area/Rich Text và delimiter; có thể dùng kết quả với cấm trùng. | Có | Có | Nội dung rich text, độ dài, phân cách và collision của khóa ghép. |

## Mapping nhu cầu sang ứng viên

Đây là gợi ý KE; cần đối chiếu rule cụ thể trước khi chọn:

| Nhu cầu | Ứng viên cần khảo sát | Không kết luận sớm |
| --- | --- | --- |
| Bắt nhập lý do trước khi chuyển bước | Process Management Required Fields | Chưa chứng minh chặn cả REST/bulk hoặc hỗ trợ mọi kiểu thông báo. |
| Hiện/ẩn hoặc khóa field theo dữ liệu | Conditional Field Control | Không thay App/Record/Field ACL. |
| Tô đỏ giá trị vượt ngưỡng | Conditional Format | Không đồng nghĩa chặn lưu; kiểm tra xung đột Calendar. |
| Hoàn tất một App rồi cập nhật App liên quan | Data Transfer | Kiểm tra trigger, khóa liên kết, điều kiện “mới nhất”, chống lặp và xử lý lỗi. |
| Tổng hợp dữ liệu con | Related Records Auto-Calculation / Conditional Table Summation | Chọn đúng nguồn related records hay bảng trong cùng record. |
| Form dài | Layout standard / Multi-Tab | Tab không phải bảo mật và không được làm mất khả năng thấy field bắt buộc. |

Trong blueprint ghi: yêu cầu → standard đã xem xét → plugin ứng viên → bằng
chứng/giới hạn → field/trigger/device → khoảng thiếu → cách test. Chỉ chọn
custom JS/integration khi đáp ứng tốt hơn hoặc plugin không phù hợp; ghi lý do.

## Nguồn, cập nhật và triển khai

Mỗi link trong bảng là trang chi tiết đã đọc. Auto-Numbering, Conditional Table
Summation và Process Management Required Fields chuyển hướng sang Oceania.
Trang Stage Visualizer SEA không tải được; dùng trang US chính thức, ghi nhận
khác biệt vùng và kiểm tra lại gói áp dụng cho tenant trước khi cài.
Một số trang có video nhưng nội dung video/manual/gói tải chưa được kiểm chứng
trong lần tổng hợp này. Tên plugin không phải plugin ID; không tự suy ID từ URL.

Khi cập nhật catalog: đối chiếu toàn bộ danh mục SEA, thêm/bỏ mục theo bằng
chứng, đọc lại trang chi tiết, ghi ngày và nguồn thay thế. Giữ rõ nguồn nói gì
và KE khuyến nghị kiểm tra gì. Không tải/cài tất cả plugin chỉ để tư vấn.
Không đưa ZIP hoặc cấu hình khách hàng vào shared KB.

LeBa dùng [plugin-installation.md](../../ke-engineer-leba/references/plugin-installation.md)
cho phạm vi tenant/App, capability preflight, cài đặt, cấu hình và xác minh.
