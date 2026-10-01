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
}
