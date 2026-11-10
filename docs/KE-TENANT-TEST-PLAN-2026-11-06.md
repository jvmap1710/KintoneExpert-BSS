# KE Kit — Kế hoạch kiểm thử tenant để anh duyệt

Ngày: 06/11/2026 (Asia/Bangkok).

Trạng thái: **BẢN NHÁP — CHƯA DUYỆT TOÀN BỘ / CHƯA CHẠY TEST TENANT**.

Anh đã thông báo nhập credentials và yêu cầu kiểm tra kết nối. Yêu cầu này chỉ cho phép kiểm tra kết nối bằng thao tác đọc tối thiểu, không cấp quyền tạo app, ghi record, sửa cấu hình hoặc deploy. Cần xác nhận origin thực tế trước khi gọi mạng.

## 1. Chuẩn bị và xác nhận đích

- File credentials: `platform/ke-kintone-mcp/.env`, được loại khỏi Git. Không gửi password/token qua chat, report hay ảnh chụp.
- `KINTONE_BASE_URL` phải trỏ tới tenant test dự định dùng. Chọn username/password hoặc API token, không bật đồng thời. Dùng tài khoản test riêng với quyền tối thiểu; không tự nâng quyền khi lỗi. API token có thể không đáp ứng test tạo app/cấu hình.
- Workspace test dự kiến: `projects/ke-kit-acceptance/`, chỉ tạo sau khi khởi tạo cục bộ được kiểm tra.
- Origin thực tế: **chờ kiểm tra cục bộ và anh xác nhận**. Chỉ hiển thị địa chỉ, không hiển thị credentials. Nếu biến môi trường kế thừa khác `.env`, báo tên biến xung đột và xử lý trước khi kết nối.
- App ID: **chưa tạo**. Không dùng App ID từ hội thoại cũ hoặc tự chọn app nghiệp vụ. Tên file có chữ “test” không chứng minh tenant là môi trường test.
- Browser profile (hồ sơ trình duyệt) phải tách riêng theo project và danh tính test. Anh đăng nhập thủ công. Kiểm tra tài khoản/quyền; không đọc password, cookie hoặc storage state.

Nhập credentials chỉ là cấu hình, không phải cấp quyền thao tác tenant. Quyền phụ thuộc yêu cầu, đối tượng và hành động cụ thể.

### Kiểm tra kết nối trước — chỉ đọc

1. Kiểm tra định dạng cấu hình, phương thức xác thực, TLS và xung đột biến môi trường tại máy; chưa gọi mạng.
2. Hiển thị origin để anh xác nhận đúng tenant test.
3. Sau khi xác nhận, gửi GET tối thiểu qua lệnh kiểm tra đã review. Username/password: lấy tối đa một metadata app, không đọc record. API token: cần App ID anh cho phép, không tự chọn app khác.
4. Chỉ báo kết nối/xác thực/quyền đọc; không in response có dữ liệu khách hàng hoặc secrets. ICMP ping không chứng minh xác thực API thành công.
5. Dừng tại đó. GET thành công không chứng minh MCP, browser, quyền ghi hay toàn bộ Kit hoạt động đúng.

## 2. Phạm vi test đầy đủ — cần duyệt riêng

Mã lượt chạy: `KE-QA-<run-id>`, ghi nhận trước khi thực hiện.

| Đối tượng / thao tác | Giới hạn đề xuất |
| --- | --- |
| App mới | Tối đa 2: `KE-QA-<run-id>-Employee` và `KE-QA-<run-id>-OT` |
| Cấu hình | Field/layout, lookup nhân viên, workflow tối thiểu và một file JavaScript validation; chỉ hai app mới |
| Record synthetic (dữ liệu giả lập) được lưu | Tối đa 10 tổng cộng: 2 Employee giả và tối đa 8 OT; đánh dấu run ID |
| Workflow | Gửi duyệt/phê duyệt/từ chối và ca phân quyền; chỉ record OT của lượt test |
| Deploy | Chỉ hai App ID mới và thay đổi đã trình bày, sau khi anh duyệt deploy riêng |
| App/record nghiệp vụ có sẵn | Không ghi, không quét dữ liệu toàn tenant. Chỉ đọc app có sẵn nếu anh bổ sung App ID và mục đích được duyệt |
| Tích hợp bên ngoài | Không email, webhook, cập nhật hệ thống khác, đổi user/group hay cài plug-in |
| Dọn dữ liệu | Giữ app/record làm evidence (bằng chứng). Không xóa nếu chưa duyệt riêng các ID cụ thể |

Ưu tiên MCP. Khi cần REST API chính thức, giải thích thiếu hụt công cụ, nêu đích/thao tác và xin duyệt. Browser cùng phạm vi; đổi kênh không tăng quyền. Không tự đổi tenant hoặc nâng quyền khi thất bại.

## 3. Trình tự và điểm phê duyệt

1. **Offline gate — kiểm tra cục bộ:** hoàn thiện/review sửa đổi, chạy regression và cài mới/nâng cấp. Không cần tenant. Ghi lỗi còn lại; không gán PASS toàn Kit từ một nhóm test.
2. **Duyệt kế hoạch/tenant:** anh duyệt mục 2 và origin test. Chưa đủ thì dừng live, tiếp tục offline.
3. **Read-only preflight — kiểm tra trước bằng đọc:** xác minh MCP trong phiên, đích/ngữ cảnh xác thực và quyền có thể xác minh bằng đọc tối thiểu. Token cần App ID được chỉ định. GET thành công không chứng minh quyền ghi. Sai đích/lỗi thì dừng.
4. **Stage — chuẩn bị app:** chỉ tạo hai app được duyệt, ghi lại ID thực tế. Stage mô hình tối thiểu đã review rồi đọc lại. Không sửa đối tượng ngoài phạm vi.
5. **Duyệt deploy riêng:** trình bày tenant, App ID, revision, thay đổi field/lookup/workflow/JavaScript và rủi ro tác động phụ. Chờ duyệt rõ ràng, deploy đúng bản và theo dõi tới SUCCESS. Revision đổi/chưa xác minh phải review lại.
6. **Runtime test — hành vi thực tế:** chạy mục 4 bằng dữ liệu giả. REST/cấu hình không chứng minh JavaScript browser hoạt động. Ca phải bị chặn lưu không được tạo record không hợp lệ.
7. **Report — báo cáo:** xuất một HTML độc lập đã loại dữ liệu nhạy cảm vào `projects/ke-kit-acceptance/output/`; evidence thô ở `private/`. Link dùng origin đã xác nhận và ID thực tế. Liệt kê dữ liệu còn giữ; không tự xóa.

## 4. Các ca nghiệm thu

| ID | Ca kiểm thử | Evidence bắt buộc |
| --- | --- | --- |
| T01 | Cấu hình/xác thực và app mới | Đúng origin/ngữ cảnh xác thực; App ID thực tế; đọc lại cấu hình; không secrets |
| T02 | Lookup Employee copy tên/phòng ban/người duyệt | Lookup trên UI và đọc lại record đã lưu |
| T03 | OT hợp lệ 18:00–20:00 | Browser tính 2 giờ, lưu được; đọc lại |
| T04 | Cảnh báo 11 giờ và biên đúng 12 giờ | Cảnh báo browser, vẫn lưu ở mức cho phép; ảnh đã làm sạch và đọc lại |
| T05 | OT vượt 12 giờ | Browser chặn đúng lỗi; không lưu record không hợp lệ |
| T06 | Giờ đảo/ngày OT trước ngày đề nghị/thiếu field bắt buộc | Browser chặn từng trường hợp; không phát sinh ghi ngoài ý muốn |
| T07 | Phê duyệt và từ chối | Action/trạng thái/assignee thực tế trên các record riêng |
| T08 | Ca âm tính về quyền | Danh tính read-only không ghi được trên app/record mới. Thiếu tài khoản thứ hai: BLOCKED, không suy diễn từ tên role |
| T09 | Yêu cầu đọc/tổng hợp/so sánh khi credentials có quyền cao | Tool/action trace không có ghi. Chạy kiểm tra chặn quyền cục bộ trước; không thử vượt quyền nguy hiểm trên production |
| T10 | Report trung thực và đúng đích | Kết quả khớp ca đã chạy; FAIL/BLOCKED/NOT RUN không bị biến thành runtime PASS; evidence/link đúng lượt test |

Test riêng trên Kit cài cách ly: chào `hello` / `hi` / `xin chào`, chọn tám route, định tuyến theo ý định rõ ràng, hủy/tiếp tục, cách ly hai project và tùy chọn ngôn ngữ. Lời chào không được tự kết nối tenant hoặc tạo workspace.

## 5. Điều kiện dừng và cách kết luận

- Dừng nếu sai tenant/tài khoản/app; gặp dữ liệu thật hoặc notification/tích hợp ngoài dự kiến; anh thu hồi quyền/chuyển sang chỉ đọc; vượt phạm vi; kết quả ghi không rõ; đọc lại không khớp; hoặc deploy lỗi.
- Không tự lặp thao tác ghi khi chưa rõ kết quả. Đối chiếu bằng đọc trong phạm vi hoặc hỏi anh.
- Không tự tăng quyền như cách khắc phục mặc định.
- Mỗi ca ghi **PASS / FAIL / BLOCKED / NOT RUN**, kèm cấp evidence: configuration (cấu hình), API, unit hoặc browser.
- Test offline không đủ kết luận runtime PASS hoặc production-ready. Ca runtime/phân quyền bắt buộc bị chặn thì kết luận **CHƯA XÁC MINH ĐẦY ĐỦ**, nêu chính xác điều kiện thiếu.

## 6. Sổ phê duyệt và tiến độ

| Nội dung | Trạng thái |
| --- | --- |
| Credentials | Anh thông báo đã nhập; chưa kết luận kết nối được |
| Kiểm tra kết nối chỉ đọc | Đã nhận yêu cầu trong chat; chờ xác nhận origin, chưa gọi tenant |
| Duyệt toàn bộ kế hoạch | Chờ anh duyệt |
| Origin và xác nhận tenant test | Địa chỉ riêng được giữ trong `.env`, không đưa vào bản public; chờ xác nhận tại máy đây là tenant test |
| Phạm vi tạo app/record | Chờ duyệt |
| REST nếu cần | Chờ chỉ rõ thao tác và duyệt |
| App ID và duyệt từng lần deploy | Chờ tạo/stage/đọc lại theo phạm vi đã duyệt |
| Danh tính test và read-only | Chờ xác minh |
| Report/evidence và dữ liệu giữ lại | Chờ thực hiện |

Câu duyệt gợi ý sau khi xác nhận origin: “Duyệt plan test này trên tenant test đã xác nhận, cho tạo 2 app mới và tối đa 10 record synthetic; giữ lại evidence, chưa xóa.” Câu này không thay thế duyệt deploy riêng.

### Kết quả kiểm tra cục bộ ngày 06/11/2026

- Đã chạy `npm run check` tại runtime, chưa gọi mạng.
- **BLOCKED:** tiến trình đang kế thừa `NODE_TLS_REJECT_UNAUTHORIZED=0`, làm tắt xác minh chứng chỉ TLS. Bộ kiểm tra từ chối sử dụng credentials trong trạng thái này.
- Chưa thể kết luận credentials đúng/sai hoặc kết nối thành công. Không sửa `.env`, không tạo app/record, không deploy.
- Bước tiếp theo: xác nhận origin ở trên; chạy probe với xác minh TLS được bật trong tiến trình kiểm tra. Nếu gặp lỗi chứng chỉ, xử lý CA/proxy đúng cách, không tắt xác minh TLS để vượt lỗi.
