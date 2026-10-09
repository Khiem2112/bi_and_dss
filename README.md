# Demo bảng điều khiển BI & DSS về chậm chuyến

Ứng dụng Vite + React + TypeScript triển khai theo `../dashboard_design_v3.md`.

## Chạy tại máy

```powershell
npm install
npm run dev
```

Kiểm tra trước khi bàn giao:

```powershell
npm run build
npm run lint
npm test
```

`npm test` chạy các phép thử hợp đồng cho tập chuyến đủ điều kiện/chuyến trễ, hệ số mẫu, bộ lọc toàn cục, trạng thái rỗng, tìm kiếm/sắp xếp bảng, trợ giúp thành phần, nhóm hãng đối sánh động và điều tra chuyến bay.

Browser QA dùng Chrome có cổng DevTools đang mở và biến môi trường `DASHBOARD_CDP_PORT`:

```powershell
node scripts/browser-qa.mjs
```

## Kiến trúc

```text
Trang/thành phần → hook miền nghiệp vụ → DashboardRepository → MockDashboardRepository
                                                      └→ ApiDashboardRepository (khung thay thế)
```

- Thành phần giao diện không nhập JSON mô phỏng hoặc gọi điểm cuối trực tiếp.
- Điều hướng dùng React Router (`HashRouter`) với các tuyến `/overview`, `/spatial`, `/temporal` và `/prediction`.
- Dữ liệu mô phỏng nằm trong `public/mock-data/`; hệ số mẫu cố định là 25 và chỉ áp dụng cho số đếm.
- `WnAnalysisContext` giữ nguyên bộ lọc, hạt dữ liệu, ý định so sánh và bộ chỉ số khi mở phân tích đối sánh hoặc điều tra chuyến.
- Nhóm hãng đối sánh được chọn động, tối đa hai hãng, có độ phủ, phiên bản quy tắc và trạng thái không đủ dữ liệu.
- Điều tra chuyến hỗ trợ bộ lọc nguồn/cục bộ, lịch sử đi sâu, tìm kiếm toàn cột, sắp xếp mọi cột và phân trang mà không nhân bản ghi.
- Thay cấu hình repository trong `src/repositories/index.ts` khi API đã được quản trị sẵn sàng.
- Tham chiếu thiết kế trực quan: Airtable trong thư viện `design-md`; màu sắc được điều chỉnh theo ngữ nghĩa WN và chuẩn truy cập của dự án.

## Rào chắn quyết định

Mọi giá trị hiển thị đều mang tính minh họa. Ngưỡng mẫu, ngưỡng độ phủ đối sánh, phiên bản quy tắc ô/trọng số, dữ liệu địa lý sân bay, mô hình đã hiệu chỉnh, công thức ưu tiên và ngân sách độ trễ API cho bảng điều tra vẫn chưa được phê duyệt. Giao diện công khai các giới hạn này và không dùng kết quả để ra quyết định vận hành thật.

Bằng chứng triển khai v3, kết quả kiểm thử và ảnh chụp trình duyệt được ghi trong [`qa/implementation-v3.md`](qa/implementation-v3.md).
