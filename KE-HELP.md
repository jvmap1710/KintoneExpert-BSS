# KE — Kintone Expert Help

KE hỗ trợ tư vấn nghiệp vụ, kiến trúc và triển khai Kintone. Bạn có thể mô tả
mục tiêu bằng ngôn ngữ tự nhiên, chọn một trong tám Entry Routes, hoặc gọi
thẳng chuyên gia phù hợp. Không có waterfall bắt buộc; KE chỉ mời thêm vai trò
khi công việc thực sự cần hoặc bạn yêu cầu.

## Bắt đầu lần đầu

1. Mở repository trong Codex và trust project khi được hỏi.
2. Gõ `hello` để xem các lựa chọn, hoặc mô tả trực tiếp mục tiêu, quy trình/App
   liên quan, đối tượng sử dụng và đầu ra bạn muốn.
3. Nếu đã biết vai trò cần hỗ trợ, gọi trực tiếp, ví dụ: `Tèo, review luồng
   duyệt OT` hoặc `LauDe, tư vấn data model`. Bạn không cần đi qua PM hay từng
   chuyên gia khác trước.
4. Với câu hỏi/advice ngắn có thể xử lý offline, KE trả lời ngay trong chat;
   không cần tạo workspace, cấu hình Kintone hay đăng nhập trình duyệt.
5. Với công việc cần lưu thành project (analysis, assessment, Demo/PoC, dự án
   thật hoặc deliverable), KE sẽ tóm tắt tên/mục tiêu được hiểu và xin xác nhận
   trước khi tạo workspace cùng các thư mục cần thiết. Nếu đã có workspace, KE
   dùng lại workspace đó và không yêu cầu bạn nhập lại thông tin đã biết.
6. Chỉ khi yêu cầu cần truy cập tenant Kintone, KE mới hỏi App/môi trường và
   chỉ đúng vị trí credentials lúc đó. Không gửi password, token, cookie hay
   browser storage trong chat. Browser sign-in do bạn thực hiện thủ công khi
   có bước cần xác minh trên UI.

Nếu Kit chưa được cài, chạy `npx kintone-expert-bss install`. Installer tạo
file cấu hình mẫu local (không ghi đè file có sẵn); cài đặt không tạo
workspace khách hàng. Không cần nhập credentials hay kiểm tra kết nối trước
khi dùng chức năng offline. Workspace khách hàng chỉ được tạo sau khi bạn
xác nhận một công việc persistent.

## Chuyên gia

| Chuyên gia | Gọi khi cần |
| --- | --- |
| Tí (Ti) — PM | Điều phối dự án nhiều vai trò, scope, roadmap, ưu tiên |
| Tèo (Teo) — BA | Khảo sát, BRD, eForm, quy trình và business rules |
| LauDe — SA | Kiến trúc app/data, lookup, phân quyền, integration |
| LeBa — Engineer | Build, custom JS, cấu hình và deploy Kintone |
| Mít (Mit) — Tester | Test case, Quick Verification, UAT, defect, release readiness |
| Cò (Co) — Expert Panel | Trade-off hoặc thảo luận cần góc nhìn nhiều vai trò |

PM không phải bước bắt buộc cho mọi yêu cầu. Một request role-specific có thể
đi thẳng đến đúng chuyên gia; Cò cũng chỉ tham gia khi bạn yêu cầu hoặc có
trade-off đa vai trò đáng kể. Khi bạn giao end-to-end, KE sẽ nêu chuỗi thực tế
của task đó và bỏ qua phase/chuyên gia không cần thiết.

## Tám Entry Routes

Khi chỉ chào hỏi (`hi`, `hello`, `xin chào`), KE giới thiệu ngắn rồi đưa menu:

1. **Discovery Intake** — tiếp nhận và phân loại tài liệu đầu vào.
2. **Customer Context** — xây dựng hồ sơ tổng quan khách hàng.
3. **Current-State Assessment / As-Is Analysis** — phân tích thực trạng.
4. **Future-State Design / To-Be Analysis** — thiết kế trạng thái mục tiêu.
5. **Demo / PoC Fast Track** — dựng nhanh để kiểm chứng.
6. **Project Delivery** — triển khai dự án thực tế.
7. **Existing Solution Assessment** — đánh giá giải pháp hiện hữu.
8. **Expert Consultation / Expert Panel** — tham vấn chuyên gia.

Bạn có thể trả lời bằng số hoặc mô tả tự nhiên. Nếu lời chào đã có nhu cầu rõ,
ví dụ `Hello KE, tôi cần dựng demo quy trình mua hàng`, KE bỏ qua menu và route
ngay. Lời chào/menu không tự tạo workspace, gọi PM, truy cập Kintone hay thay
đổi dữ liệu.

Entry Route là điểm bắt đầu chứ không phải bằng chứng phase trước đã hoàn tất.
KE kiểm tra baseline chỉ khi cần cho công việc persistent; tái sử dụng phần đã
Confirmed và chỉ hỏi gap có ảnh hưởng. Demo quy trình/form dùng Tèo Mini Intake
khi còn gap yêu cầu đáng kể; yêu cầu architecture-led có thể bắt đầu ở LauDe;
spec đã approved và build-ready có thể đi thẳng tới LeBa.

## An toàn và xác minh

Mặc định Kintone MCP chỉ cung cấp tool đọc. Việc thiếu write tool do cấu hình
read-only không phải lý do chuyển sang REST/UI/shell để vượt qua policy. Nếu
bạn duyệt một thao tác ghi cụ thể, KE sẽ hướng dẫn bật đúng tool cần thiết,
cho bạn review cấu hình, rồi khôi phục chế độ read-only sau tác vụ. Phê duyệt
vẫn phải nêu rõ app, thao tác và phạm vi; credentials hoặc quyền admin không
thay cho approval.

Mỗi task implementation/fix của LeBa cần Mít Quick Verification 1–3 checks.
Đây không phải smoke test. Full smoke test 5–10 cases và synthetic records
cùng HTML report chỉ bắt đầu sau khi feature hoàn tất và bạn xác nhận `OK`;
không tự xóa test records.

Playwright MCP dùng cho bằng chứng UI/user journey; Chrome DevTools MCP chỉ
dùng để chẩn đoán lỗi kỹ thuật đã tái hiện bằng Playwright. Mọi thao tác ghi,
deploy, xóa hoặc thay đổi dữ liệu đều theo `AGENTS.md` và phải giữ cùng scope
qua MCP, REST, browser/UI hay shell.

## Project context

Workspace chỉ dành cho việc persistent:

```text
projects/<project-slug>/
  .ke-project.json  # machine-owned state
  PROJECT.md        # dashboard, baselines, blockers, artifacts
  TEAM-NOTES.md     # working log and handoffs
  input/ private/ analysis/ output/ history/
```

State Manager quản lý route/phase/gate/owner; không sửa các dòng machine-owned
trực tiếp. Dùng `node scripts/ke-project.mjs list`, `current --project <slug>`,
`use --project <slug>`, và `validate --project <slug>` để xem/chọn workspace.
Chuyển state phải chỉ rõ project, ví dụ
`node scripts/ke-project.mjs transition <route> --project <slug>`. Không chọn
project theo folder vừa sửa gần nhất. Khi chuyển analysis sang Demo/PoC hoặc
Real Project, tiếp tục trong cùng workspace trừ khi bạn yêu cầu tách riêng.

Trong project persistent, expert mới đọc `PROJECT.md`, baseline được index và
notes Critical/High hoặc được giao; cập nhật dashboard/log khi có thay đổi
đáng ghi nhận. Quyết định chỉ có hiệu lực khi được ghi vào artifact chính.

## Ví dụ prompt

- `Hi` — KE giới thiệu và đưa tám Entry Routes.
- `Tôi muốn chuyển phiếu đề nghị mua hàng từ Excel lên Kintone.`
- `Tèo, hãy tạo checklist collect requirement cho quy trình OT.`
- `LauDe, tư vấn data model cho Employee và OT.`
- `Cò, so sánh 1 app và nhiều app cho quy trình mua hàng.`
- `LeBa, đọc cấu trúc app <APP_ID> và đề xuất cách custom.`
- `Mít, tạo test case cho spec này; chỉ cần offline, chưa có tenant.`
- `Tạo User Guide app OT cho nhân viên và Manager, có screenshot từ UI thật.`
- `Xuất BRD thành HTML và Word, đồng thời xuất field catalogue thành Excel.`
