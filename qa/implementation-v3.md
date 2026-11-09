# Báo cáo triển khai dashboard v3

Ngày kiểm tra: 2026-10-09  
Thiết kế nguồn: `../../dashboard_design_v3.md`  
Trạng thái: đạt cổng triển khai demo, giữ nguyên các giới hạn trước production của thiết kế.

## Bổ sung thay đổi `CH3-14` — 2026-10-09

- Bỏ trạng thái buộc người dùng chọn thêm tuyến/sân bay khi mở so sánh từ aggregate tháng, mùa, khung giờ hoặc toàn mạng.
- Service giữ nguyên snapshot nguồn, ghép dữ liệu peer theo `route × month` và chỉ thêm day/time/distance khi source context có nhiều giá trị của chiều đó.
- Contract test mới kiểm tra fixture tháng 02/2018 có peer với coverage ít nhất 20% mà không cần filter route/airport; kiểm tra nguồn cũng cấm nhánh `incomplete_context`.
- Chưa chạy lại `npm test`, `npm run lint`, `npm run build` hoặc Browser QA sau thay đổi vì môi trường hiện không có Node/npm và phiên điều khiển giao diện không khởi tạo được. Cần chạy lại browser QA để tạo `comparison-source-context.png` trước khi coi đây là bằng chứng runtime.

## Bổ sung thay đổi `CH3-15` — 2026-10-09

- Gỡ mặc định `DAL → ATL` khỏi state dùng chung của ứng dụng và khỏi trang Phân tích thời gian.
- P3 giờ mở ở `Mạng lưới WN` khi chưa có tuyến được chọn; nếu điều hướng từ một tuyến đã chọn thì vẫn giữ nguyên tuyến đó.
- Toàn bộ context của biểu đồ mùa/tháng/xu hướng, heatmap và bảng bằng chứng dùng chung `activeEntity`, nên hành động so sánh/điều tra không còn lén mang filter `DAL → ATL`.
- Đã thêm contract test cấm route mặc định trong P3 và mở rộng Browser QA để ghi nhận tiêu đề context mạng lưới.
- Runtime gate hiện là `PARTIAL`: chưa thể chạy `npm test`, build, lint hoặc chụp lại giao diện vì Node/npm không có trong môi trường hiện tại.

## Bổ sung thay đổi `CH3-16` — 2026-10-09

- Gỡ `P1-C08` (bản đồ điểm nóng) và `P1-C09` (đối tượng cần kiểm tra) khỏi Overview; bằng chứng sân bay/tuyến chỉ còn ở `P2-C02..C04` và P1 giữ ba nút điều hướng sang Spatial, Temporal, DSS.
- Thêm `P1-C10` ma trận tần suất × mức độ trễ theo tháng, `P1-C11` phân phối năm khoảng `ARR_DELAY`, và `P1-C12` so sánh phạm vi lọc với mạng WN cùng khoảng ngày.
- Mỗi bong bóng, phân đoạn và marker đều có bộ ba chỉ số trễ, focus bằng bàn phím, lựa chọn hiện hành, menu chuột phải và nút hiển thị chứa `So sánh đối thủ` cùng `Điều tra chuyến liên quan`.
- Snapshot phân tích bổ sung `seasons`, `minimumArrivalDelay` và `maximumArrivalDelay`; service áp dụng các điều kiện trước khi tổng hợp cho cả đối sánh và điều tra chuyến. Chip khoảng độ trễ hiển thị tiếng Việt như `Từ 30 phút` và `Dưới 60 phút`.
- Mức tham chiếu của `P1-C12` giữ ngày bắt đầu/kết thúc nhưng bỏ sân bay/tuyến, mùa, thứ, khung giờ và cự ly; quy tắc được hiển thị trực tiếp trong card.
- `npm run build`, `npm run lint` và `npm test` đều đạt; 15/15 contract tests thành công. Build chỉ còn cảnh báo chunk lớn hơn 500 kB vốn có, không chặn demo.
- Browser QA tại 1440×1100 ghi nhận 12 bong bóng, 5 phân đoạn mức trễ, 4 marker baseline, 10 nút trợ giúp, không overflow ngang, không lỗi runtime và không phát hiện chuỗi tiếng Anh ngoài whitelist.
- QA mở thành công đúng một modal so sánh và đúng một modal điều tra từ đại diện của cả ba component. Ma trận giữ đúng tháng 01/2018; phân đoạn `30–59 phút` giữ đúng hai cận; marker baseline giữ đúng mạng WN cùng khoảng ngày.
- Plugin điều khiển UI native bị reset hai lần lúc khởi tạo; kiểm tra rendered được hoàn tất bằng Chrome DevTools QA cục bộ sẵn có của repository. Đây không còn là blocker vì ảnh chụp và kết quả DOM/runtime đã được tạo lại.

Ảnh kiểm tra bổ sung:

- [Overview v4 mặc định](overview-v4-default.png)
- [Đối sánh từ ma trận tháng](overview-v4-p1-c10-comparison.png)
- [Điều tra từ ma trận tháng](overview-v4-p1-c10-investigation.png)
- [Đối sánh từ phân phối mức độ](overview-v4-p1-c11-comparison.png)
- [Điều tra từ phân phối mức độ](overview-v4-p1-c11-investigation.png)
- [Đối sánh từ marker baseline](overview-v4-p1-c12-comparison.png)
- [Điều tra từ marker baseline](overview-v4-p1-c12-investigation.png)

## Bổ sung thay đổi `CH3-17` — 2026-10-09

- Đổi `P1-C11` từ thanh phân đoạn sang biểu đồ tròn năm lát; từng lát vẫn focus được và giữ đủ tỷ lệ trễ, số chuyến trễ, số chuyến đủ điều kiện cùng độ trễ đến trung bình.
- Loại `P1-C12` và ba thẻ điều hướng cuối trang. Điều hướng trang vẫn có trong shell; so sánh mức tham chiếu dùng modal nhóm hãng đối sánh theo đúng context của từng mark.
- Thêm `P1-C13` so sánh tỷ lệ trễ theo tháng giữa các năm, `P1-C14` theo khung giờ kế hoạch và `P1-C15` mùa–tháng dùng lại `SeasonalBarChart` của P3.
- Mở rộng fixture minh họa cấp chuyến sang 2015–2018 và đặt phạm vi mặc định tương ứng; số đếm tiếp tục dùng đúng một hệ số 25, còn tỷ lệ/trung bình không bị nhân.
- Để tránh dày và trùng vai trò, `P1-C06`/`P1-C10` chỉ hiển thị 12 kỳ gần nhất; tab tuần/ngày dùng 12 tuần và 30 ngày gần nhất. `P1-C13` chịu trách nhiệm so sánh đầy đủ 48 điểm tháng–năm.
- `npm run build`, `npm run lint` và `npm test` đều đạt; 15/15 contract tests thành công. Build chỉ còn cảnh báo chunk lớn hơn 500 kB vốn có.
- Browser QA tại 1440×1100 ghi nhận 48 điểm tháng–năm, 5 lát mức độ, 4 khung giờ, 4 mùa và 12 tháng; không overflow ngang, không lỗi runtime, không chuỗi tiếng Anh ngoài whitelist. `P1-C12` và cụm điều hướng cuối trang không còn trong DOM.
- QA mở thành công đúng một modal so sánh và đúng một modal điều tra từ tháng 01/2018, khung giờ buổi tối và tháng 1/mùa đông; các chip ngày, khung giờ, mùa và tháng đều giữ đúng context nguồn.

## Bổ sung thay đổi `CH3-18` — 2026-10-10

- Khôi phục bản đồ điểm nóng sân bay (`P1-C08`) độc lập trên trang Tổng quan, với đầy đủ tính năng đo tuyến giữa 2 sân bay, tính khoảng cách, ước tính thời gian bay, hiển thị thống kê trễ tuyến theo bộ lọc hiện tại và menu ngữ cảnh đầy đủ.
- Đồng bộ danh sách tuyến với `routesByAirport` từ hook `useAirportHotspots`, bảo toàn cấu trúc dữ liệu và đảm bảo các React Hook được gọi đúng thứ tự không điều kiện.
- Cập nhật contract test để xác nhận `AirportMap` cùng `P1-C08` hiện diện trên OverviewPage, không cần khôi phục danh sách ứng viên riêng lẻ (`P1-C09`).
- `npm run build`, `npm run lint` và `npm test` đều đạt 15/15 phép thử hợp đồng.

Ảnh kiểm tra bổ sung:

- [Overview v5 mặc định](overview-v5-default.png)
- [Đối sánh tháng giữa các năm](overview-v5-p1-c13-comparison.png)
- [Điều tra tháng giữa các năm](overview-v5-p1-c13-investigation.png)
- [Đối sánh khung giờ](overview-v5-p1-c14-comparison.png)
- [Điều tra khung giờ](overview-v5-p1-c14-investigation.png)
- [Đối sánh mùa–tháng](overview-v5-p1-c15-comparison.png)
- [Điều tra mùa–tháng](overview-v5-p1-c15-investigation.png)

## Phạm vi đã triển khai

- Bổ sung hợp đồng `WnAnalysisContext` bất biến, bộ chỉ số trễ dùng chung và ngữ cảnh bộ lọc đầy đủ.
- Thay so sánh hãng cố định bằng lựa chọn nhóm đối sánh động, tối đa hai hãng; công khai độ phủ, phiên bản quy tắc, nguyên nhân giảm từ hai xuống một hãng và trạng thái không đủ dữ liệu.
- Tách cửa sổ so sánh theo đúng ý định mở; không trình bày đồng thời các hạng mục không liên quan.
- Xây dựng điều tra chuyến dùng chung với bộ lọc nguồn/cục bộ, lịch sử đi sâu, bộ chỉ số đối soát, bảng 10 cột, tìm kiếm toàn bộ cột, sắp xếp mọi cột, phân trang và chi tiết một chuyến.
- Dùng một ngăn xếp lớp phủ duy nhất cho luồng so sánh ↔ điều tra; nút Quay lại phục hồi ngữ cảnh trước đó.
- Bổ sung hai hành động phân tích cho các thành phần có bằng chứng WN trên P1–P4, gồm nút hiển thị và menu ngữ cảnh dùng cùng dữ liệu đầu vào.
- Chuẩn hóa menu chuột phải dùng chung trên cấp thẻ và từng đơn vị phân tích: KPI, điểm sân bay, mốc xu hướng, mùa, tháng, ô thứ–khung giờ, dòng bảng, khung giờ dự báo và điểm rủi ro. Hai mục đầu luôn là `Điều tra chuyến liên quan` và `So sánh đối thủ`.
- Thu gọn `FI-C03`: tách hai hàng nguồn/đã thêm, dùng chấm màu và bộ đếm một lần cho mỗi nhóm; chip cao 24 px, bỏ nhãn xuất xứ lặp lại trên từng chip, giữ thao tác xóa đúng điều kiện và lịch sử quay lại.
- Bổ sung các thành phần còn thiếu của v3: `P1-C07`, `P2-C04`, `P2-C06`, `P4-C03` và `P4-C06`.
- Mở rộng bộ lọc toàn cục với tuyến, thứ trong tuần và khung giờ kế hoạch; tất cả đi qua repository trước khi tổng hợp.
- Thay bộ lọc sân bay và dropdown tuyến riêng bằng trình tạo `Sân bay & tuyến`: mỗi dòng dùng một combobox chọn `Đường bay theo chiều`, `Sân bay đi`, `Sân bay đến`, hoặc `Sân bay · mọi vai trò`; nhiều dòng kết hợp HOẶC và chuyến khớp nhiều dòng chỉ được tính một lần.
- Trong FI, ảnh chụp ngữ cảnh nguồn được giữ thành một nhóm riêng; nhóm sân bay/tuyến thêm trong modal dùng HOẶC nội bộ nhưng kết hợp VÀ với nguồn, nên thêm điều kiện luôn thu hẹp phạm vi.
- Thay dropdown nhóm cự ly bằng popup điều kiện dùng chung ở bộ lọc toàn cục và FI: chế độ `Khoảng tùy chỉnh` đồng bộ thanh trượt hai đầu với ô nhập số; chế độ `Nhóm chuẩn G01–G11` giữ multi-select theo `DG-BTS-250-v1`. Hai chế độ loại trừ nhau để tránh biểu thức giao/hiệp mơ hồ.
- Chuẩn hóa giao diện hiển thị sang tiếng Việt, trợ giúp cạnh tiêu đề, chú giải cho nhãn thông tin, trạng thái focus/hover/disabled và điều hướng hộp chọn bằng bàn phím.

## Đối soát hợp đồng

- Bộ chỉ số dùng chung gồm tỷ lệ chuyến đến trễ, số chuyến đến trễ và độ trễ đến trung bình; số chuyến đủ điều kiện được giữ làm mẫu số.
- Hệ số mẫu là 25 và chỉ nhân các số đếm. Tỷ lệ, trung bình, chênh lệch, độ phủ và xác suất không bị nhân.
- Bảng ngữ nghĩa đều có tìm kiếm tiếng Việt không phân biệt dấu và sắp xếp trên mọi cột dữ liệu.
- Bộ lọc không có kết quả trả trạng thái rỗng, không tự mở rộng phạm vi âm thầm.
- Bản ghi trong điều tra chuyến không bị nhân; tổng quần thể minh họa được trình bày riêng với số bản ghi mẫu thực có.

## Bằng chứng kiểm thử

- `npm run build`: đạt.
- `npm run lint`: đạt.
- `npm test`: 12/12 phép thử hợp đồng đạt, gồm phép thử bốn loại điều kiện sân bay, HOẶC giữa dòng, không đếm trùng, hai chế độ cự ly và phép thử phủ menu chuột phải cho các đơn vị phân tích P1–P4.
- Browser QA trên bản preview: không có lỗi runtime; mỗi thời điểm chỉ có một `aria-modal`; bộ lọc đơn/tổ hợp/đặt lại/rỗng hoạt động; đối sánh động chọn hãng từ dữ liệu; điều tra có 10 tiêu đề sắp xếp; tìm kiếm rỗng giữ nguyên truy vấn; quay lại phục hồi trạng thái so sánh.
- Browser QA menu chuột phải đạt trên sân bay PHX, mốc tháng 1/2018, mùa đông, tháng 1, ô `Thứ Hai · Sáng sớm`, dòng chuyến bay, khung giờ dự báo và điểm rủi ro; mọi trường hợp đều giữ đúng hai hành động bắt buộc và đúng nhãn thực thể.
- Đo trực tiếp `FI-C03`: 2 nhóm điều kiện, chip tối đa 24 px, không có nhãn `Từ biểu đồ`/`Thêm trong điều tra` lặp bên trong chip.
- Hộp chọn tùy biến công khai `listbox`, `option`, `aria-controls`, `aria-activedescendant` và hỗ trợ Arrow Up/Down, Home/End, Enter, Escape.
- Browser QA combobox loại điều kiện đạt: mở đúng lựa chọn hiện tại, Home + Enter đổi từ `Sân bay · mọi vai trò` sang `Đường bay theo chiều`, sau đó đóng danh sách và trả focus về trigger.
- Browser QA cự ly đạt: nhập trực tiếp 500–1.000 dặm cập nhật đồng bộ biểu thức; chọn G02 và G04 qua danh sách nhóm chuẩn cập nhật trigger; popup dùng lại đúng trong modal điều tra chuyến.

Ảnh kiểm tra chính:

- [Hộp chọn bộ lọc](overview-combobox-open.png)
- [Combobox loại điều kiện trong nhóm HOẶC](airport-clause-mode-combobox-open.png)
- [Nhóm điều kiện cục bộ trong điều tra sân bay](flight-investigation-airport-clauses.png)
- [Khoảng cự ly bằng thanh trượt và ô nhập số](distance-filter-range-open.png)
- [Nhóm cự ly chuẩn G01–G11](distance-filter-groups-open.png)
- [Điều kiện cự ly trong modal điều tra](flight-investigation-distance-filter.png)
- Đối sánh phải bám theo ngữ cảnh nguồn; ảnh QA cần được tạo lại bằng `comparison-source-context.png` khi môi trường chạy demo sẵn sàng.
- [Nhóm hãng đối sánh động](comparison-dynamic-peer.png)
- [Điều tra chuyến](flight-investigation-default.png)
- [Điều tra không có kết quả tìm kiếm](flight-investigation-empty-search.png)
- [Trang không gian](spatial-selected-context.png)
- [Trang thời gian](temporal-default.png)
- [Trang dự báo](prediction-default.png)
- [Rủi ro địa lý và bằng chứng](prediction-geography-evidence.png)
- [Trợ giúp theo ngữ cảnh](prediction-help-open.png)

## Quyết định thiết kế trực quan

Tham chiếu Airtable từ thư viện `design-md` được dùng cho mật độ dữ liệu, phân cấp tiêu đề, cách nhóm bộ lọc và bố cục bảng. Màu sắc thương hiệu và kiểu trang trí riêng của tham chiếu không được sao chép; demo giữ bảng màu WN hiện có, tương phản focus rõ và các trạng thái cảnh báo theo ngữ nghĩa. Các quyết định này cũng được ghi cạnh lớp CSS v3.

## Giới hạn trước production

Các mục sau vẫn là giới hạn có chủ đích của thiết kế v3, không được che bằng giá trị mặc định:

- `LIM-01`: chưa phê duyệt ngưỡng mẫu tối thiểu cho tỷ lệ và trung bình.
- `LIM-02`: ngưỡng độ phủ nhóm đối sánh hiện chỉ là cấu hình minh họa.
- `LIM-03`: cần chốt phiên bản chính thức của quy tắc ô và trọng số.
- `LIM-04`: tọa độ sân bay chưa phải dữ liệu địa lý đã xác minh.
- `LIM-05`: `DEMO-RISK-v0` chưa hiệu chỉnh, kiểm định hoặc có ngưỡng quyết định.
- `LIM-06`: công thức điểm ưu tiên chưa được chủ sở hữu nghiệp vụ phê duyệt.
- `LIM-07`: kích thước trang và ngân sách độ trễ API cho điều tra chuyến chưa được chốt.

Vì các giới hạn trên, bản này đủ dùng làm demo tương tác và đối soát hợp đồng, nhưng chưa phải hệ thống ra quyết định production.
