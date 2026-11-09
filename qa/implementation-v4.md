# Biên bản triển khai và QA — Overview v4

## Phạm vi

- Hợp đồng thiết kế: `dashboard_design_v4.md`.
- Trang kiểm thử: P1 — Tổng quan mạng lưới.
- Viewport nghiệm thu: `1440 × 1100`.
- Dữ liệu: mock minh họa, hãng WN, hệ số mẫu áp dụng riêng cho số đếm.

## Quyết định giao diện

Tham chiếu Airtable trong thư viện thiết kế được dùng cho nền trắng, đường viền mảnh, mật độ thông tin cao và nhịp khoảng cách 4 px. Màu san hô/xanh của dashboard được giữ để bảo toàn ngữ nghĩa phân tích, trạng thái chọn và khả năng nhận diện WN. Các bề mặt marketing trang trí và khoảng trắng kiểu biên tập không được đưa vào vì làm giảm mật độ theo dõi trên desktop.

## Kết quả theo cổng chất lượng

| Cổng | Kết quả | Bằng chứng |
|---|---|---|
| Inventory v4 | PASS | Có P1-C01..C08, C11, C14, C15; không render P1-C10 hoặc card P1-C13 độc lập. |
| Bố cục desktop | PASS | P1-C06/P1-C08 cùng hàng; map rộng 400,33 px; P1-C11/C14/C15 cùng hàng theo tỷ lệ gần 29/25/46; card cuối cùng kết thúc ở y=1044,97. |
| Tràn ngang | PASS | Không có horizontal overflow ở mặc định, filter mở, loading hoặc error. |
| Filter và mock service | PASS | Mặc định 140.625; Mùa đông 35.000; Mùa đông + Buổi tối 8.675; reset 140.625; phạm vi rỗng trả `—`. |
| Mock scaling | PASS | Contract test xác nhận multiplier chỉ đổi count, không đổi rate/average/gap/share/probability. |
| DelayMetricBundle | PASS | KPI, mark, segment, sân bay và ngữ cảnh overlay giữ rate, delayed/eligible và average arrival delay. |
| CM/FI | PASS | Điểm `2018-02` trong tab Theo năm mở đúng CM và FI với source `P1-C06-V04`. |
| Tiếng Việt | PASS | Copy hiển thị, trạng thái rỗng/loading/error và action đều dùng tiếng Việt; chỉ giữ mã nghiệp vụ/mã component. |
| Help và tooltip | PASS | Mọi component có tiêu đề giữ nút trợ giúp liền kề; badge thông tin có tooltip/focus. |
| Bảng tìm kiếm/sắp xếp | N/A | P1 v4 không có bảng dữ liệu. |
| Keyboard/accessibility | PASS | Tablist có roving focus; ArrowRight chuyển Theo tuần; End chuyển Theo năm; mark và action dùng được bằng bàn phím. |
| Loading/empty/error | PASS | 9 vùng loading; 5 error card + 4 KPI error; zero-result có 5 empty state; lưới không co rút. |
| Runtime | PASS | Không có exception hoặc log lỗi; trang phục hồi về 140.625 sau khi bỏ lỗi mạng giả lập. |

## Tệp bằng chứng

- `overview-v4-1440x1100.png`: trạng thái mặc định.
- `overview-v4-loading.png`: skeleton giữ nguyên hierarchy.
- `overview-v4-error.png`: lỗi từng card, không layout shift.
- `overview-v4-zero-result.png`: phạm vi không có dữ liệu, không dùng 0 giả.
- `overview-v4-year-tab.png`: tab Theo năm hấp thụ P1-C13.
- `overview-v4-year-comparison.png` và `overview-v4-year-investigation.png`: hai luồng phân tích giữ context.
- `overview-v4-filter-options.png` và `overview-v4-combined-filter.png`: trạng thái filter mở và filter tổ hợp.
- `scripts/qa-overview-design-v4.mjs`: kịch bản Browser QA có thể chạy lại qua CDP.

## Xác minh kỹ thuật

- `npm run build`: PASS; còn cảnh báo bundle JavaScript lớn hơn 500 kB, không chặn build.
- `npm run lint`: PASS.
- `npm run test`: PASS, 15/15 bài kiểm thử.

## Giới hạn còn lại

- Dự báo, tọa độ sân bay và dữ liệu vẫn là minh họa theo badge/callout hiện hữu; không dùng để ra quyết định vận hành.
- Tối ưu chia nhỏ bundle là công việc hiệu năng riêng, không ảnh hưởng nghiệm thu bố cục Overview v4.
