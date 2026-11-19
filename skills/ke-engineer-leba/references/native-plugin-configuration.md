# Tham chiếu cấu hình Kintone Native Plugins

Tóm tắt cấu hình dựa trên các tutorial chính thức trong bộ tài liệu tải ngày 18-11-2026. Phiên bản dưới đây là phiên bản hiển thị trong catalog khi thu thập, không khẳng định là bản mới nhất hiện tại. Trang/phiên bản/trang PDF được ghi tại mỗi mục. Đây là hướng dẫn suy luận cho thiết kế; mọi “kiểm thử gợi ý” đều chưa chạy trên tenant. Xác nhận phiên bản, quyền, field code và thử trong app sandbox trước khi phát hành.

## Advanced Lookup

Để cấu hình lookup nâng cao, chọn app nguồn, điều kiện tìm kiếm, các trường ánh xạ và hành vi sao chép/cập nhật. Chi tiết mapping và giới hạn đã tách riêng tại [hướng dẫn Advanced Lookup](../../ke-sa-laude/references/native-plugin-advanced-lookup.md); không suy diễn mapping từ tên hiển thị của field. Nguồn: Advanced Lookup Plug-in Tutorial, v2.1.1, pp. 13–18 ([trang chính thức](https://www.kintone.com/en-sea/features/plugins/advanced-lookup/)). Kiểm thử gợi ý (chưa chạy): một khóa khớp, một khóa không khớp và một trường được map; kiểm tra dữ liệu sau lưu.

## Advanced Related Records

Đặt Blank Space có Element ID tại vị trí render; cấu hình app/field liên kết, điều kiện, cột hiển thị, sắp xếp và giới hạn dòng. Có thể ánh xạ bản ghi liên quan vào table của app hiện tại và bật sao chép hàng loạt. Một số trường chỉ hiển thị đúng sau khi lưu; trường đích sao chép phải duy nhất. Không dùng trên mobile hoặc Guest; bulk copy có lưu ý với view category. Nguồn: Advanced Related Records Plug-in Tutorial, v1.2.0, pp. 15–23, 26, 28. Kiểm thử gợi ý: kiểm tra kết quả lọc, table copy và thao tác trong view đã lọc.

## Auto Lookup

Plugin chạy lookup tự động trong các luồng được tài liệu nêu như tạo bản ghi bằng Action hoặc nhân bản; không mặc định áp dụng cho mọi cách tạo record. Có tùy chọn đưa login name của người dùng vào lookup, nhưng có thể ghi đè giá trị hiện có và không thành công nếu người dùng không tồn tại ở nguồn. Nguồn: Auto Lookup Plug-in Tutorial, v1.8.0, pp. 10, 12–13, 15. Kiểm thử gợi ý: tạo bằng Action và duplicate; xác nhận giá trị cũ, login không có ở nguồn và quyền truy cập. Chưa kiểm thử runtime.

## Re-Lookup

Nút Re-Lookup làm mới lookup fields từ app nguồn; chọn một hay nhiều lookup cụ thể, còn để trống danh sách có nghĩa làm mới tất cả theo manual. Xem xét phạm vi tác động trước khi cho người dùng chạy, nhất là khi dữ liệu nguồn đã thay đổi. Manual ghi tương thích mobile nhưng không tương thích Guest. Nguồn: Re-lookup Plug-in Tutorial, v1.10.0, pp. 10–16. Kiểm thử gợi ý: thay dữ liệu nguồn, chạy một lần với trường chọn lọc rồi chạy trên app thử với danh sách trống; đối chiếu chỉ các trường dự kiến có đổi. Chưa kiểm thử runtime.

## Table Lookup

Dùng khi cần lấy các hàng từ table của app nguồn vào table ở app hiện tại. Chọn lookup key và ánh xạ cột nguồn–đích; Record Number nguồn cần map vào Number ở đích. Các thiết lập có thể cho phép sửa giá trị đã map hoặc tự chạy table lookup sau khi mapping; mặc định theo manual là tắt. Attachment mapping cần trường khóa hàng phù hợp. Nguồn: Table Lookup Plug-in Tutorial, v3.2.0, pp. 10–18, 20. Kiểm thử gợi ý: lookup một record nhiều hàng, kiểm tra thứ tự/giá trị và thử lại với auto-run tắt/bật; xác nhận sau lưu.

## Related Records Auto-Calculation

Chọn field đầu ra kiểu Number, related-record source field, phép tổng hợp và trigger (mở list/detail, lưu hoặc nút tính theo cấu hình). List/detail trigger có thể cập nhật nhiều record. Manual lưu ý làm tròn: dùng “round to nearest even” để tránh vòng tính lại do so sánh giá trị đã làm tròn. Nguồn: Related Records Auto-Calculation Plug-in Tutorial, v3.4.0, pp. 12–19, 21. Kiểm thử gợi ý: dữ liệu related có số thập phân và một nhóm rỗng; kiểm tra từng trigger, kết quả và rounding. Chưa kiểm thử runtime.

## Auto-Numbering

Chọn field Text đích, mẫu số/ngày/chuỗi, connector, số bắt đầu và chu kỳ reset. Dùng chuỗi tĩnh hoặc giá trị Text/Dropdown/Radio làm thành phần format. Nếu quyền xem field ảnh hưởng việc tạo số, manual có tùy chọn API token. Không tạo tham chiếu vòng với plugin khác; “Never” không khởi tạo lại số đã dùng. Nguồn: 260904_Auto-numbering Plug-in Tutorial, v1.13.0, pp. 10, 12–18, 20. Kiểm thử gợi ý: sinh số qua ranh giới reset và kiểm tra format, quyền field, tính duy nhất; chưa kiểm thử runtime.

## Calculate and Fill

Cấu hình trigger, điều kiện (ALL/ANY), công thức và field đích; có thể gắn nút list hoặc Process Management Action. Chú ý kiểu dữ liệu hai vế so sánh phải tương thích; AND/OR trên năm biểu thức có thể không tin cậy, công thức lồng phức tạp có thể ảnh hưởng hiệu năng. Lookup đích chỉ cập nhật khi bấm nút tính ở list. Nguồn: Calculate and Fill Plug-in Tutorial, v1.2.0, pp. 11–18, 32–36. Kiểm thử gợi ý: ca đúng/sai điều kiện và giá trị rỗng, xác minh chỉ đúng trigger cập nhật field dự kiến; chưa chạy.

## Conditional Table Summation

Cấu hình table, cột điều kiện chính và tùy chọn cột điều kiện thứ hai; cột điều kiện là Radio/Checkbox/Multi-choice/Dropdown. Chọn cột Number cần cộng và field Number ngoài table làm output. Nguồn: Conditional Table Summation Plug-in Tutorial, v2.2.1, pp. 10–15. Kiểm thử gợi ý: tạo hàng khớp điều kiện chính, hàng khớp cả hai điều kiện và hàng không khớp; so output với tổng tính tay. Chưa kiểm thử runtime.

## Date Calculation

Chọn base Date/Date and Time, field đích khác và chuỗi phép Set/Add/Subtract theo năm, tháng, ngày, giờ hoặc phút; số có thể cố định hoặc lấy từ Number/Calculated field. Field đích trở thành không sửa trực tiếp. Không hỗ trợ field trong table; tối đa 10 dòng tính và 10 công thức/dòng; thay đổi Calculated field không kích hoạt tính lại. Nguồn: Date Calculation Plug-in, v1.2.0, pp. 12–17. Kiểm thử gợi ý: kiểm tra cuối tháng/năm nhuận, đầu vào rỗng và việc lưu; xác nhận field đích không sửa tay.

## Duplicate Record Number

Plugin sao chép Record Number tự sinh vào field Text hoặc Number để dễ tìm trên mobile/dùng trong phép tính. Text chứa App Code (nếu có) cùng số record; Number chỉ chứa số record. Nút Update all records điền cho record hiện có; Guest không hỗ trợ bulk update. Nguồn: 260904_Duplicate Record Number Plug-in Tutorial, v2.3.0, pp. 10, 12–16. Kiểm thử gợi ý: so output Text/Number trên record mới và cũ, xác nhận App Code và quyền cập nhật; chưa kiểm thử runtime.

## Recalculation

Plugin chạy lại các Calculated fields và làm mới Lookup fields trong app; manual nêu không có setting cấu hình và yêu cầu xác nhận trước khi cập nhật. Đây là thao tác diện rộng, nên giới hạn quyền vận hành và đánh giá ảnh hưởng lookup trước khi chạy production. Không tương thích mobile. Nguồn: Recalculation Plug-in Tutorial, v2.6.1, pp. 10–15. Kiểm thử gợi ý: trên app thử, đổi nguồn lookup/công thức, chạy recalculation và đối chiếu số bản ghi/giá trị trước–sau; chưa kiểm thử runtime.

## Table Field Concatenation

Chọn cột table để nối các giá trị qua các hàng, delimiter và field Text/Text Area ngoài table làm output; có thể thêm cột để nối. Output dài nên cân nhắc Text Area. Manual có nút Update all records cho dữ liệu hiện có và nêu kết quả được cập nhật khi lưu record. Nguồn: Table Field Concatenation Plug-in Tutorial, v1.8.0, pp. 10–15. Kiểm thử gợi ý: nhiều hàng, ô rỗng và delimiter; xác nhận thứ tự/chuỗi output sau lưu rồi chạy bulk update trên sandbox. Chưa kiểm thử runtime.

## Conditional Field Control

Thiết lập rule điều kiện để đổi trạng thái/hiển thị field; dùng nhiều rule có thứ tự kiểm soát rõ ràng. Required không thể áp dụng nếu Field ACL ngăn người dùng xem field. Các output Shown/Hidden/Hidden (revert value) không áp dụng trên list; không coi ẩn bằng plugin là phân quyền. Điều kiện Lookup chỉ được đánh giá sau save. Khi migrate từ Conditional Display, false condition nay là “không làm gì”, không phải đảo ngược trạng thái; cần thêm rule ngược nếu muốn giữ hành vi cũ. Nguồn: Conditional Field Control Plug-in Tutorial, v1.0.0, pp. 18, 21; Conditional Display to Conditional Field Control Migration Guide (không ghi version), pp. 4, 8, 11, 14–15, 17, 20. Kiểm thử gợi ý: quyền xem, list, lookup trước/sau lưu và cả nhánh true/false.

## Data Transfer

Ánh xạ field giữa app nguồn và đích, chọn record đích/điều kiện và hướng chuyển theo manual; rà soát trước trường ghi đè và khóa đối sánh. Hai tùy chọn xóa cascade có thể xóa record nguồn hoặc hàng table nguồn: để tắt trừ khi phạm vi xóa đã được chủ dữ liệu phê duyệt rõ ràng. Nguồn: Data Transfer Plug-in Tutorial, v1.5.0, pp. 10–27. Kiểm thử gợi ý: app thử với một record match, non-match và table nhiều hàng; chạy không bật xóa, so sánh từng field trước/sau. Chưa kiểm thử runtime.

## Process Management History

Tạo table log riêng với Date and Time, Text cho status trước/sau và action, User Selection cho assignee; Number elapsed minutes là tùy chọn. Plugin ghi thông tin khi process chuyển trạng thái; table bị ẩn khi chỉnh sửa record và không chỉnh sửa trực tiếp. Nếu edit permissions khiến một số user không thể sửa record, manual yêu cầu API token. Nguồn: Process Management History Plug-in Tutorial, v2.2.0, pp. 10–16. Kiểm thử gợi ý: thực hiện action dưới quyền khác nhau, xác nhận log và elapsed time; chưa kiểm thử runtime.

## Process Management Required Fields

Dùng để yêu cầu điền field khi thực hiện action; xác định action và field cần kiểm tra, nhưng không đưa field do plugin kiểm tra vào chính điều kiện action của Process Management. Không xóa hay sửa các điều kiện nghiệp vụ sẵn có một cách ngầm định. Nguồn: Process Management Required Fields Plug-in Tutorial, v1.7.0, pp. 10–16 (đặc biệt p. 13). Kiểm thử gợi ý: action với field bắt buộc trống, đã điền và user không có quyền sửa; xác minh thông báo và action hợp lệ. Chưa kiểm thử runtime.

## Bulk Status Update

Cấu hình trường Status/action và nút cập nhật hàng loạt theo manual; xác nhận tập record mục tiêu trước khi thực thi. “Check all” chọn tất cả record thỏa view/filter, kể cả record ở trang tiếp theo, không chỉ các hàng đang nhìn thấy. Nguồn: Bulk Status Update Plug-in Tutorial, v1.8.0, pp. 10–15 (p. 11). Kiểm thử gợi ý: filter có kết quả qua nhiều trang, chọn Check all, kiểm tra số record và trạng thái trước khi bấm cập nhật; chỉ thử trên dữ liệu sandbox.

## Calendar

Chọn custom view, title (Text/Lookup), start/end Date hoặc Date and Time; có thể chọn checkbox all-day và Dropdown làm background color. Khi dùng Date and Time, chọn end Date and Time; với Date, có thể cấu hình end date, giờ bắt đầu/kết thúc và time zone theo các field hỗ trợ. Calendar plugin không tương thích với Conditional Format theo manual của Conditional Format. Nguồn: Calendar Plug-in Tutorial, v2.4.0, pp. 12–17. Kiểm thử gợi ý: sự kiện đơn ngày, có giờ, all-day và khoảng nhiều ngày; xác nhận view/field màu.

## Conditional Format

Tạo rule bằng field điều kiện, operator/value, field hiển thị và kiểu màu/cỡ/chữ; có thể định dạng field khác với field xét điều kiện. List support áp dụng cho List Views, không Calendar/Custom HTML views; print không nhận định dạng. Manual nêu không tương thích với Calendar plugin. Nguồn: Conditional Format Plug-in Tutorial, v2.4.0, pp. 13–18. Kiểm thử gợi ý: cùng record ở detail, list, calendar và print, gồm nhánh đúng/sai điều kiện; xác nhận chỉ view được hỗ trợ thay đổi.

## Gantt Chart

Tạo custom view (chỉ subdomain admin có quyền tạo), chọn khoảng mặc định Day/Week/Month, title, start/end date, progress số và tùy chọn label/color. Nếu có subtasks, chọn field ẩn Main Task ID để nối task con với cha; có thể bật filter trên chart. Nguồn: Gantt Chart Plug-in Tutorial, v1.0.1, pp. 10–17. Kiểm thử gợi ý: task cha-con, tiến độ 0/100, khoảng nhiều tháng và record thiếu ngày; đối chiếu chart với field gốc. Chưa kiểm thử runtime.

## Kanban

Chọn field làm cột trạng thái, tiêu đề/chi tiết thẻ và cách điều khiển thẻ; giữ giá trị status nhất quán với workflow. Manual nêu record có Description rỗng bị loại khỏi Kanban, nên cần quyết định có bắt buộc trường này hoặc chấp nhận thẻ vắng mặt. Nguồn: Kanban Plug-in Tutorial, v1.7.0, pp. 10–12. Kiểm thử gợi ý: cùng trạng thái với Description có/không có giá trị, và record ở mỗi cột; so số record trên board với list view. Chưa kiểm thử runtime.

## Multi-Tab

Đặt Blank Space mở đầu/kết thúc cho mỗi nhóm tab và các Blank Space có Element ID làm điểm bắt đầu tab; chọn cặp start/end trong setting, tên tab, default và nhớ tab trước. Blank Space không Element ID bị bỏ qua; vùng start phải đủ rộng nếu không tab xếp dọc. Nguồn: Multi-tab Plug-in Tutorial, v3.6.0, pp. 10–18. Kiểm thử gợi ý: hai bộ tab, field trước/sau vùng và ID thiếu; xác nhận field chỉ hiện trong tab được bật và default/remember hoạt động. Chưa kiểm thử runtime.

## Stage Visualizer

Cấu hình field trạng thái/quy trình và mapping field hiển thị trong hộp thoại theo manual. Field mapping xác định field nào được đưa vào dialog, không tự biến các field thành bắt buộc. Manual có thể cho phép dropdown hoặc radio làm trạng thái/đầu vào; đừng giới hạn assumptions ở dropdown. Nguồn: Stage Visualizer Plug-in Tutorial, v1.0.0, pp. 10–13. Kiểm thử gợi ý: thử từng giá trị status và mở dialog với field rỗng/đã điền; xác nhận hiển thị, mapping và việc bắt buộc riêng biệt. Chưa kiểm thử runtime.

## Bulk Download Attachment

Chọn các Attachment fields được đưa vào tải xuống, có thể bật hộp thoại chọn file và chọn field làm tên thư mục record. Tên file đính kèm gốc được giữ theo manual; tổng kích thước tải hàng loạt không vượt 1 GB. Không tương thích mobile hoặc Guest. Nguồn: Bulk Download Attachment Plug-in Tutorial, v5.5.0, pp. 10–18. Kiểm thử gợi ý: tải từ view có nhiều record, bỏ chọn một file trong dialog và kiểm tra cấu trúc thư mục/tổng dung lượng; giới hạn người chạy theo nhu cầu dữ liệu.

## Media Player

Chọn attachment field media và cách trình bày player theo manual; xác minh định dạng file, quyền đọc attachment và hành vi record không có file. PDF v2.7.0 ghi Guest compatible, cần ưu tiên kiểm tra đúng phiên bản vì catalog cũ có thể ghi khác. Nguồn: Media Player Plug-in Tutorial, v2.7.0, pp. 10–16 ([trang chính thức](https://www.kintone.com/en-sea/features/plugins/media-player/)). Kiểm thử gợi ý: file media hợp lệ, định dạng không hỗ trợ, record không có file và Guest user; chưa kiểm thử runtime.

## PDF Preview

Preview áp dụng cho PDF attachment. Nếu cần non-Latin text hoặc JPEG 2000, cấu hình direct CDN asset URL cho PDF.js cmaps/WASM; URL phải phục vụ file asset chứ không phải trang HTML liệt kê thư mục. E-signature không hiển thị trong preview; tải PDF gốc để xem chữ ký. Không tương thích mobile. Nguồn: PDF Preview Plug-in Tutorial, v1.12.0, pp. 10–16. Kiểm thử gợi ý: PDF Latin, non-Latin, JPEG 2000 và PDF có e-signature trên desktop; kiểm tra direct asset URL. Chưa kiểm thử runtime.

## Partial Field Search

Chọn field tìm kiếm và một Text Area/Text riêng để lưu dữ liệu search; field lưu không được nằm trong tập field tìm kiếm. Khi thêm/bỏ field nguồn, chạy Update partial search data để tái tạo dữ liệu hiện có; có thể hiện nút cập nhật bulk trên list. Ẩn field lưu không làm ngừng chức năng. Nguồn: Partial Field Search Plug-in Tutorial, v1.12.0, pp. 10–23. Kiểm thử gợi ý: tìm chuỗi con, thêm/bỏ field nguồn và cập nhật dữ liệu cũ; xác nhận AND/OR với điều kiện list hiện tại.

## Simple Text Search

Chọn các field tìm được (gồm Text, Rich Text, Text Area, Number, Choice, Attachment, Link, Lookup và các field này trong table), rồi chọn view nào hiện hộp tìm. Tránh đưa dữ liệu nhạy cảm vào phạm vi hiển thị nếu trải nghiệm tìm khác với quyền dữ liệu của người dùng; plugin không thay quyền record/field. Nguồn: Simple Text Search Plug-in Tutorial, v1.5.0, pp. 10–16. Kiểm thử gợi ý: từ khóa trên field ngoài/trong table, attachment, view không bật và user quyền khác nhau; xác nhận kết quả.

## Text Connect

Cấu hình trường Text nguồn/đích và quy tắc kết nối theo manual; tránh tham chiếu vòng giữa các plugin/field vì có thể gây cập nhật lặp hoặc record không tải/lưu được. Auto-Numbering manual cũng cảnh báo vòng lặp khi kết hợp Text Connect. Nguồn: 260904_Text Connect Plug-in Tutorial, v1.10.0, pp. 10–18; Auto-numbering Tutorial, v1.13.0, p. 18. Kiểm thử gợi ý: chuỗi có giá trị/rỗng, thay đổi hai chiều và tổ hợp với Auto-Numbering; xác nhận lưu và không tạo vòng cập nhật. Chưa kiểm thử runtime.

## Lưu ý kiểm chứng chung

Các giới hạn guest/mobile và kiểu field ở trên là theo phiên bản manual được trích, không áp dụng thay thế kiểm tra tương thích phiên bản mới. Các ca thử là đề xuất, chưa chạy trên tenant. Không tự động cài plugin, sửa cấu hình tenant hay chạy bulk/delete action khi chưa có phạm vi và phê duyệt cụ thể.
