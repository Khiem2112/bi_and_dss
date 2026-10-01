export interface ComponentHelpContent {
  componentId: string
  title: string
  purpose: string
  analyticalQuestion?: string
  grain?: string
  measures?: readonly string[]
  filterScope?: string
  interpretation?: string
  limitation?: string
}

export const componentHelpRegistry: Record<string, ComponentHelpContent> = {
  'P2-C02': {
    componentId: 'P2-C02',
    title: 'Bản đồ điểm nóng sân bay',
    purpose: 'Định vị trực quan các sân bay có chênh lệch tỷ lệ trễ cao hoặc thấp so với chuẩn toàn mạng lưới WN.',
    analyticalQuestion: 'Những sân bay nào đang là điểm nóng gây chậm trễ cho mạng lưới theo vai trò đi và đến?',
    grain: 'Sân bay (Airport), hiển thị đồng thời vai trò Sân bay đi và Sân bay đến.',
    measures: ['Tỷ lệ trễ (%)', 'Chênh lệch chuẩn (điểm %)', 'Số chuyến trễ', 'Trễ trung bình (phút)', 'Cỡ mẫu n'],
    filterScope: 'Áp dụng bộ lọc toàn cục: Hãng bay, Năm, Tháng, Khung giờ bay, Loại trễ.',
    interpretation: 'Quy ước chấm đôi: Mỗi điểm sân bay được biểu diễn bằng một chấm tròn chia làm hai nửa: Nửa trái đại diện cho Sân bay đi (Origin), nửa phải đại diện cho Sân bay đến (Destination). Màu sắc phản ánh mức chênh lệch tỷ lệ trễ so với chuẩn mạng lưới (Đỏ: ≥ 5%, Vàng: 3–4,9%, Xanh: < 3%). Bán kính chấm tỉ lệ thuận với cỡ mẫu chuyến bay.',
    limitation: 'Vị trí bản đồ nhằm định vị trực quan không gian mạng lưới; việc xếp hạng ưu tiên và đánh giá chính xác dựa trên bảng số liệu bằng chứng bên cạnh.',
  },
  'P2-C03': {
    componentId: 'P2-C03',
    title: 'Bằng chứng sân bay & tuyến bay',
    purpose: 'Cung cấp dữ liệu chi tiết, sắp xếp và tìm kiếm chính xác mức độ trễ cho từng sân bay và tuyến bay theo cả hai vai trò đi và đến.',
    analyticalQuestion: 'Cụ thể từng sân bay hoặc tuyến bay có tỷ lệ trễ và số chuyến trễ là bao nhiêu ở cả hai chiều?',
    grain: 'Sân bay / Tuyến bay kết nối',
    measures: ['Tỷ lệ trễ (%)', 'Chênh lệch tham chiếu (điểm %)', 'Trễ trung bình (phút)', 'Số chuyến trễ / Tổng chuyến'],
    filterScope: 'Đồng bộ theo bộ lọc toàn cục và từ khóa tìm kiếm nhanh.',
    interpretation: 'Nhấp vào dòng để chọn sân bay hoặc tuyến bay và cập nhật biểu đồ xu hướng bên dưới. Nhấp nút mũi tên để mở rộng hoặc thu gọn các tuyến bay trực thuộc.',
    limitation: 'Các tuyến có cỡ mẫu thấp được gắn cờ cảnh báo và cần được kiểm tra kỹ trước khi đưa vào phân tích chuyên sâu.',
  },
  'P1-C08': {
    componentId: 'P1-C08',
    title: 'Bản đồ điểm nóng sân bay & Thống kê tuyến bay',
    purpose: 'Định vị trực quan các sân bay điểm nóng và đo lường khoảng cách, thời gian bay cũng như các chỉ số trễ hai chiều giữa các sân bay.',
    analyticalQuestion: 'Vị trí địa lý và các chỉ số trễ hai chiều (đi/đến) của từng sân bay trên mạng lưới như thế nào?',
    grain: 'Sân bay / Tuyến bay kết nối',
    measures: ['Tỷ lệ trễ (%)', 'Chênh lệch chuẩn (điểm %)', 'Số chuyến trễ', 'Trễ trung bình (phút)', 'Khoảng cách & Thời gian bay'],
    interpretation: 'Quy ước chấm đôi: Mỗi điểm sân bay được biểu diễn bằng một chấm tròn chia làm hai nửa: Nửa trái đại diện cho Sân bay đi (Origin), nửa phải đại diện cho Sân bay đến (Destination). Màu sắc phản ánh mức chênh lệch tỷ lệ trễ so với chuẩn mạng lưới (Đỏ: ≥ 5%, Vàng: 3–4,9%, Xanh: < 3%). Chọn 2 sân bay để vẽ tuyến đo khoảng cách và thời gian bay ước tính.',
    limitation: 'Dữ liệu minh họa diễn tập giao diện theo DG-BTS-250-v1.',
  },
  'P2-C05': {
    componentId: 'P2-C05',
    title: 'Xu hướng trễ',
    purpose: 'Theo dõi diễn biến trễ theo thời gian (tháng, tuần, ngày) và so sánh hiệu suất với các đối thủ cạnh tranh (DL, AA).',
    analyticalQuestion: 'Mức độ trễ của sân bay hoặc tuyến bay được chọn đang tăng hay giảm theo thời gian?',
    grain: 'Thời gian (Tháng / Tuần / Ngày) ứng với thực thể đã chọn.',
    measures: ['Tỷ lệ trễ theo chuỗi thời gian (%)', 'Đường dự báo', 'Chỉ số các hãng so sánh'],
    interpretation: 'Đường liền biểu diễn tỷ lệ trễ thực tế, đường nét đứt biểu diễn khoảng dự báo hoặc mức tham chiếu mạng lưới.',
    limitation: 'Dự báo mang tính tham khảo minh họa, quyết định điều hành cần phối hợp với đánh giá chuyên môn.',
  },
  'P3-C02': {
    componentId: 'P3-C02',
    title: 'Chu kỳ mùa vụ & Xu hướng thời gian',
    purpose: 'Phân tích quy luật biến thiên trễ chuyến theo 12 tháng gộp theo 4 mùa hoặc theo chuỗi thời gian liên tục từ 2015 đến 2018.',
    analyticalQuestion: 'Mùa vụ nào hoặc tháng nào trong năm có tỷ lệ trễ tập trung cao nhất trên toàn mạng lưới?',
    grain: 'Mùa phân tích (Season) / Tháng trong năm (Month).',
    measures: ['Tỷ lệ trễ (%)', 'Chênh lệch so với chuẩn mạng lưới (điểm %)', 'Số chuyến trễ', 'Trễ trung bình (phút)', 'Cỡ mẫu n'],
    filterScope: 'Áp dụng bộ lọc toàn cục: Hãng bay, Năm, Tuyến bay, Sân bay.',
    interpretation: 'Mỗi mùa gồm 3 tháng với dải màu đặc trưng. Nhấp vào cột tháng hoặc nhóm mùa để kích hoạt lọc drill-down xuống ma trận ngày/giờ và bảng tuyến bay bên dưới. Có thể chuyển đổi sang chế độ xem chuỗi thời gian liên tục.',
    limitation: 'Dữ liệu chu kỳ mùa vụ được gộp qua các năm 2015-2018 để nhận diện quy luật lặp lại.',
  },
  'P3-C03': {
    componentId: 'P3-C03',
    title: 'Thứ trong tuần × Khung giờ kế hoạch',
    purpose: 'Nhận diện điểm nóng thời gian vi mô theo ma trận thứ trong tuần và khung giờ khởi hành kế hoạch CRS_DEP_TIME.',
    analyticalQuestion: 'Trong mùa hoặc tháng được chọn, ngày nào trong tuần và khung giờ nào là đỉnh điểm nghẽn mạng lưới?',
    grain: 'Thứ trong tuần (Day of Week) × Khung giờ khởi hành (Scheduled Time Block).',
    measures: ['Tỷ lệ trễ thực tế (%)', 'Chênh lệch BL-T (điểm %)', 'Cỡ mẫu chuyến bay n', 'Cờ kiểm định mẫu'],
    filterScope: 'Tự động đồng bộ theo Mùa/Tháng đã chọn ở biểu đồ phía trên và bộ lọc toàn cục.',
    interpretation: 'Độ đậm của màu ô phản ánh mức chênh lệch trễ so với chuẩn thời gian (BL-T). Nhấp vào một ô để lọc bảng tuyến bay và sân bay chịu ảnh hưởng trực tiếp bên dưới.',
    limitation: 'Khung giờ tính theo lịch khởi hành dự kiến (CRS_DEP_TIME) để loại trừ rò rỉ dữ liệu sau sự kiện.',
  },
  'P3-C04': {
    componentId: 'P3-C04',
    title: 'Bằng chứng tuyến bay & sân bay theo khung thời gian',
    purpose: 'Cung cấp danh sách các tuyến bay và sân bay chịu ảnh hưởng nhiều nhất trong khung thời gian vi mô đã chọn.',
    analyticalQuestion: 'Những tuyến bay và sân bay cụ thể nào đóng góp lớn nhất vào tình trạng trễ trong khung giờ này?',
    grain: 'Tuyến bay theo chiều (Directional Route) / Sân bay (Airport).',
    measures: ['Tỷ lệ trễ (%)', 'Chênh lệch BL-T (điểm %)', 'Trễ trung bình (phút)', 'Số chuyến trễ / Tổng chuyến', 'Cỡ mẫu n'],
    filterScope: 'Lọc nghiêm ngặt theo lát cắt thời gian đã chọn: Mùa, Tháng, Thứ trong tuần và Khung giờ.',
    interpretation: 'Hỗ trợ chuyển đổi giữa xem theo tuyến bay và theo sân bay. Nhấp mở rộng dòng tuyến để xem chi tiết 2 đầu sân bay đi và đến. Nhấp chuột phải hoặc nút ba chấm để mở menu thao tác so sánh hãng bay (CM-T) hoặc xem nguyên nhân trễ.',
    limitation: 'Các phân đoạn có cỡ mẫu thấp cần kiểm chứng cờ mẫu trước khi đưa ra quyết định điều chỉnh lịch bay.',
  },
}
