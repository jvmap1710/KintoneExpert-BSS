# KE — Kintone Expert Help

KE là bộ chuyên gia tư vấn và xây dựng Kintone end-to-end. Hãy bắt đầu bằng
ngôn ngữ tự nhiên; KE sẽ tự chọn chuyên gia phù hợp.

## Team

| Chuyên gia | Gọi khi cần |
| --- | --- |
| Tí (Ti) — PM | Phạm vi, roadmap, ưu tiên, tiến độ |
| Tèo (Teo) — BA | Khảo sát, BRD, eForm, quy trình và approval rules |
| Sơn (Son) — SA | Kiến trúc app/data, lookup, phân quyền, integration |
| Bình (Binh) — Engineer | Build, custom JS, kiểm tra, deploy qua Kintone MCP |
| Mít (Mit) — Tester | Test case, UAT, defect, release readiness |
| Cò (Co) — Expert Panel | Thảo luận đa chuyên gia, phương án và rủi ro |

## Luồng mặc định

`Tí -> Tèo -> Sơn -> Bình -> Mít -> Tí`

Cò có thể tham gia ở bất kỳ bước nào. Tất cả chuyên gia có thể dùng Kintone
MCP read-only để phân tích app hiện có và Playwright MCP để thu thập evidence
trên giao diện thật. Chrome DevTools MCP chỉ dùng khi cần debug JavaScript,
network, DOM/CSS hoặc performance. Thao tác ghi, deploy, xóa vẫn phải theo quy
tắc xác nhận trong `AGENTS.md`.

## Bắt đầu từ lời chào

Nếu người dùng chỉ nói `hi`, `hello` hoặc `xin chào`, KE Router giới thiệu
ngắn gọn và đưa ra bốn lựa chọn:

1. Dựng Presales demo / PoC.
2. Triển khai dự án cho khách hàng.
3. Kiểm tra hoặc cải tiến app Kintone hiện có.
4. Tư vấn phương án hoặc thảo luận đa chuyên gia.

Người dùng có thể trả lời bằng số hoặc mô tả nhu cầu tự nhiên. Nếu câu chào đã
có nhu cầu rõ ràng, ví dụ `Hello KE, tôi cần dựng demo quy trình mua hàng`, KE
bỏ qua menu và đi thẳng vào Demo Fast Track. Một lời chào đơn thuần không kích
hoạt PM, không tạo project folder và không truy cập Kintone.

## Ví dụ prompt

- `Hi` — KE giới thiệu tổng quan và cách bắt đầu.
- `Tôi muốn chuyển phiếu đề nghị mua hàng từ Excel lên Kintone.`
- `Tèo, hãy tạo checklist collect requirement cho quy trình OT.`
- `Sơn, tư vấn data model cho Employee và OT.`
- `Cò, tranh luận giữa 1 app và nhiều app cho quy trình mua hàng.`
- `Bình, đọc cấu trúc app <APP_ID> và đề xuất cách custom.`
- `Tạo User Guide app OT cho nhân viên và Manager, có screenshot từ UI thật.`
- `Xuất BRD thành HTML và Word, đồng thời xuất field catalogue thành Excel.`
