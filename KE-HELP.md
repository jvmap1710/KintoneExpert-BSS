# KE — Kintone Expert Help

KE là bộ chuyên gia tư vấn và xây dựng Kintone end-to-end. Hãy bắt đầu bằng
ngôn ngữ tự nhiên; KE sẽ tự chọn chuyên gia phù hợp.

## Team

| Chuyên gia | Gọi khi cần |
| --- | --- |
| Tí (Ti) — PM | Phạm vi, roadmap, ưu tiên, tiến độ |
| Tèo (Teo) — BA | Khảo sát, BRD, eForm, quy trình và approval rules |
| LauDe — SA | Kiến trúc app/data, lookup, phân quyền, integration |
| LeBa — Engineer | Build, custom JS, kiểm tra, deploy qua Kintone MCP |
| Mít (Mit) — Tester | Test case, UAT, defect, release readiness |
| Cò (Co) — Expert Panel | Thảo luận đa chuyên gia, phương án và rủi ro |

## Luồng mặc định

`Tí -> Tèo -> LauDe -> LeBa -> Mít -> Tí`

Cò có thể tham gia ở bất kỳ bước nào. Tất cả chuyên gia có thể dùng Kintone
MCP read-only để phân tích app hiện có và Playwright MCP để thu thập evidence
trên giao diện thật. Chrome DevTools MCP chỉ dùng khi cần debug JavaScript,
network, DOM/CSS hoặc performance. Thao tác ghi, deploy, xóa vẫn phải theo quy
tắc xác nhận trong `AGENTS.md`.

Mỗi task build/fix của LeBa được Mít Quick Verification trước khi kết luận.
Full smoke test 5–10 cases/records chỉ bắt đầu sau khi toàn bộ feature hoàn tất
và user xác nhận `OK`.

## Bắt đầu từ lời chào

Nếu người dùng chỉ nói `hi`, `hello` hoặc `xin chào`, KE Router giới thiệu
ngắn gọn và đưa ra tám Entry Routes:

1. **Discovery Intake** *(tiếp nhận và phân loại tài liệu đầu vào)*.
2. **Customer Context** *(xây dựng hồ sơ tổng quan khách hàng)*.
3. **Current-State Assessment / As-Is Analysis** *(phân tích thực trạng)*.
4. **Future-State Design / To-Be Analysis** *(thiết kế trạng thái mục tiêu)*.
5. **Demo / PoC Fast Track** *(dựng nhanh để kiểm chứng)*.
6. **Project Delivery** *(triển khai dự án thực tế)*.
7. **Existing Solution Assessment** *(đánh giá giải pháp hiện hữu)*.
8. **Expert Consultation / Expert Panel** *(tham vấn chuyên gia)*.

Người dùng có thể trả lời bằng số hoặc mô tả nhu cầu tự nhiên. Nếu câu chào đã
có nhu cầu rõ ràng, ví dụ `Hello KE, tôi cần dựng demo quy trình mua hàng`, KE
bỏ qua menu và đi thẳng vào route phù hợp. Một lời chào đơn thuần không kích
hoạt PM, không tạo project folder và không truy cập Kintone.

Entry Route là điểm bắt đầu, không chứng minh các phase trước đã hoàn thành.
KE chạy Readiness Check, tái sử dụng baseline đã Confirmed và chỉ hỏi phần còn
thiếu. Khi BA phân tích xong rồi chuyển sang Demo/PoC hoặc Real Project, KE cập
nhật delivery track trong cùng workspace thay vì tạo lại dự án.

## Project context

Mỗi workspace phân tích, Demo/PoC, assessment hoặc dự án thật có:

```text
projects/<project-slug>/
  .ke-project.json
  PROJECT.md
  TEAM-NOTES.md
  input/
  private/
  analysis/
  output/
  history/
```

Project đang làm được chọn rõ bằng State Manager:

```powershell
node scripts/ke-project.mjs list
node scripts/ke-project.mjs use <project-slug>
node scripts/ke-project.mjs current
node scripts/ke-project.mjs validate
```

Không chọn project theo folder sửa gần nhất và không sửa trực tiếp các dòng
route/phase/gate/owner do State Manager quản lý trong `PROJECT.md`.

- `PROJECT.md`: dashboard hiện tại, phase/gate, baseline, blocker, artifact,
  handoff, next action và owner.
- `TEAM-NOTES.md`: working log có cấu trúc cho finding, question, conflict,
  assumption, risk, decision request, handoff và test finding.

Khi một agent tham gia, agent đọc dashboard, baseline hiện hành và các note
Critical/High hoặc được giao cho mình. Quyết định chỉ có hiệu lực sau khi được
đưa vào artifact chính thức và cập nhật lại `PROJECT.md`.

## Ví dụ prompt

- `Hi` — KE giới thiệu tổng quan và cách bắt đầu.
- `Tôi muốn chuyển phiếu đề nghị mua hàng từ Excel lên Kintone.`
- `Tèo, hãy tạo checklist collect requirement cho quy trình OT.`
- `LauDe, tư vấn data model cho Employee và OT.`
- `Cò, tranh luận giữa 1 app và nhiều app cho quy trình mua hàng.`
- `LeBa, đọc cấu trúc app <APP_ID> và đề xuất cách custom.`
- `Tạo User Guide app OT cho nhân viên và Manager, có screenshot từ UI thật.`
- `Xuất BRD thành HTML và Word, đồng thời xuất field catalogue thành Excel.`
