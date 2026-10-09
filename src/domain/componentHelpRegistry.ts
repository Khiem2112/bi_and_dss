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

const delayBundle = ['Tỷ lệ chuyến đến trễ', 'Số chuyến đến trễ', 'Độ trễ đến trung bình mỗi chuyến'] as const

function entry(
  componentId: string,
  title: string,
  purpose: string,
  grain: string,
  measures: readonly string[] = delayBundle,
  filterScope = 'Theo toàn bộ bộ lọc đang áp dụng; các lựa chọn cục bộ được nêu ngay trong thành phần.',
  limitation = 'Dữ liệu hiện tại là minh họa; không dùng để phát lệnh vận hành.',
): ComponentHelpContent {
  return { componentId, title, purpose, grain, measures, filterScope, limitation }
}

export const componentHelpRegistry: Record<string, ComponentHelpContent> = {
  'P1-C01': entry('P1-C01', 'Phạm vi phân tích', 'Thiết lập khoảng ngày, nhóm điều kiện sân bay và tuyến, mùa cùng các chiều phân tích cho các trang BI lịch sử.', 'Một lựa chọn bộ lọc áp dụng cho toàn bộ kết quả lịch sử.', [], 'Mỗi dòng sân bay hoặc tuyến trong cùng nhóm kết hợp bằng HOẶC; nhóm này kết hợp bằng VÀ với thời gian, mùa, thứ, khung giờ và cự ly. Cự ly dùng một trong hai cách: khoảng số tùy chỉnh hoặc nhóm chuẩn G01–G11.', 'Chế độ đường bay giữ nguyên chiều đi–đến. Một chuyến khớp nhiều dòng vẫn chỉ được tính một lần; G11 đại diện từ 2.500 dặm trở lên.'),
  'P1-C02': entry('P1-C02', 'Chuyến bay đủ điều kiện', 'Cho biết mẫu số của mọi chỉ số trễ trong ngữ cảnh hiện tại.', 'Toàn mạng lưới WN trong phạm vi lọc.'),
  'P1-C03': entry('P1-C03', 'Chuyến bay đến trễ', 'Cho biết số chuyến đủ điều kiện có ARR_DELAY từ 15 phút trở lên.', 'Toàn mạng lưới WN trong phạm vi lọc.'),
  'P1-C04': entry('P1-C04', 'Tỷ lệ đến trễ thực tế', 'Đo mức phổ biến của trễ đến trong tập chuyến bay đủ điều kiện.', 'Toàn mạng lưới WN trong phạm vi lọc.'),
  'P1-C05': entry('P1-C05', 'Độ trễ đến trung bình', 'Đo ARR_DELAY trung bình trên mọi chuyến bay đủ điều kiện, gồm cả chuyến đến sớm.', 'Toàn mạng lưới WN trong phạm vi lọc.'),
  'P1-C06': entry('P1-C06', 'Xu hướng trễ chuyến mạng lưới và dự báo mô hình', 'So sánh diễn biến lịch sử theo thời gian và tín hiệu dự báo minh họa mà không trộn hai loại bằng chứng.', 'Một điểm là một tháng, tuần hoặc ngày.', [...delayBundle, 'Tỷ lệ dự kiến minh họa'], undefined, 'Giá trị dự báo không phải tỷ lệ trễ thực tế và chưa được hiệu chỉnh.'),
  'P1-C07': entry('P1-C07', 'Xu hướng ước tính của mô hình', 'Tách tín hiệu dự báo minh họa khỏi bằng chứng lịch sử và chỉ mở lịch sử hỗ trợ khi điều tra.', 'Một điểm là một kỳ dự báo minh họa.', ['Tỷ lệ dự kiến minh họa', ...delayBundle], undefined, 'Giá trị dự báo chưa hiệu chỉnh và không phải tỷ lệ trễ đã quan sát.'),
  'P1-C08': entry('P1-C08', 'Bản đồ điểm nóng sân bay', 'Giữ nhận biết không gian ngay trên Tổng quan để xác định sân bay cần xem tiếp.', 'Một điểm là một sân bay; hai nửa biểu diễn vai trò sân bay đi và sân bay đến.', [...delayBundle, 'Chênh lệch so với mức tham chiếu', 'Cỡ mẫu'], 'Giữ toàn bộ bộ lọc toàn cục; thao tác phân tích dùng sân bay đã chọn ở mọi vai trò.', 'Đây là bản đồ tóm tắt với vị trí minh họa; phân rã tuyến và vai trò chi tiết thuộc trang Sân bay và tuyến bay.'),
  'P1-C10': entry('P1-C10', 'Ma trận tần suất × mức độ trễ', 'Nhận diện tháng vừa có tỷ lệ chuyến đến trễ cao vừa có độ trễ đến trung bình cao để chọn kỳ cần điều tra.', 'Một bong bóng là một tháng lịch sử; kích thước biểu thị số chuyến đủ điều kiện.', [...delayBundle, 'Mức tham chiếu mạng lưới'], undefined, 'Vị trí tương đối giúp khoanh vùng kỳ bất thường, không chứng minh nguyên nhân gây trễ.'),
  'P1-C11': entry('P1-C11', 'Phân phối mức độ trễ đến', 'Biểu đồ tròn cho biết cơ cấu chuyến đến sớm, dưới ngưỡng và các mức trễ từ nhẹ đến nghiêm trọng.', 'Một lát biểu đồ là một khoảng ARR_DELAY loại trừ nhau.', [...delayBundle, 'Tỷ trọng chuyến bay trong khoảng'], undefined, 'ARR_DELAY là kết quả hậu nghiệm; chỉ dùng để mô tả và điều tra, không dùng làm đầu vào dự báo.'),
  'P1-C13': entry('P1-C13', 'Tỷ lệ trễ theo tháng giữa các năm', 'So sánh cùng một tháng giữa nhiều năm để phát hiện tính lặp lại hoặc khác biệt theo năm.', 'Một điểm là một tháng trong một năm lịch sử.', delayBundle, 'Giữ toàn bộ bộ lọc toàn cục; phạm vi ngày quyết định các năm được so sánh.', 'Khác biệt giữa các năm là mô tả lịch sử, không tự chứng minh nguyên nhân.'),
  'P1-C14': entry('P1-C14', 'Tỷ lệ trễ theo khung giờ', 'Xác định khung giờ khởi hành theo kế hoạch có tỷ lệ trễ đáng chú ý.', 'Một thanh là một khung giờ dẫn xuất từ CRS_DEP_TIME.', delayBundle, 'Giữ bộ lọc toàn cục và bổ sung khung giờ khi mở đối sánh hoặc điều tra chuyến.', 'Khung giờ cho biết thời điểm cần điều tra thêm, không phải nguyên nhân gây trễ.'),
  'P1-C15': entry('P1-C15', 'Tỷ lệ trễ theo mùa và tháng', 'Quét nhanh mùa và tháng nổi bật trước khi phân tích sâu theo thứ, khung giờ, tuyến hoặc sân bay.', 'Một nhóm là một mùa phân tích; một cột là một tháng gộp trong phạm vi năm đang lọc.', [...delayBundle, 'Chênh lệch so với phạm vi hiện tại'], 'Giữ bộ lọc toàn cục; lựa chọn một mùa hoặc tháng được chuyển nguyên vẹn vào hành động phân tích.', 'Biểu đồ tổng quan chỉ phát hiện tín hiệu thời gian; phân rã chi tiết vẫn thuộc trang Phân tích thời gian.'),
  'P2-C02': entry('P2-C02', 'Bản đồ điểm nóng sân bay', 'Nhận diện mẫu không gian của trễ và đồng bộ lựa chọn với bảng bằng chứng.', 'Một marker là một sân bay, có bộ chỉ số riêng cho vai trò đi và đến.', [...delayBundle, 'Chênh lệch so với mức tham chiếu', 'Cỡ mẫu']),
  'P2-C03': entry('P2-C03', 'Bằng chứng sân bay và tuyến bay', 'So sánh chính xác, tìm kiếm và sắp xếp các sân bay hoặc đường bay.', 'Một hàng là một sân bay hoặc đường bay theo chiều.', [...delayBundle, 'Chênh lệch so với mức tham chiếu', 'Cờ cỡ mẫu']),
  'P2-C04': entry('P2-C04', 'Bảng tuyến ứng viên', 'So sánh chính xác, tìm kiếm và sắp xếp các đường bay theo chiều trước khi mở đối sánh hoặc điều tra chuyến.', 'Một hàng là một đường bay theo chiều.', [...delayBundle, 'Chênh lệch so với mức tham chiếu', 'Cờ cỡ mẫu']),
  'P2-C05': entry('P2-C05', 'Xu hướng trễ của đối tượng đã chọn', 'Kiểm tra liệu tín hiệu của sân bay hoặc đường bay có lặp lại theo thời gian.', 'Một điểm là tháng, tuần hoặc ngày của đối tượng đã chọn.', [...delayBundle, 'Đường tham chiếu', 'Tín hiệu dự báo minh họa']),
  'P2-C06': entry('P2-C06', 'Hành động theo ngữ cảnh', 'Mở đối sánh hoặc điều tra chuyến với cùng ảnh chụp sân bay hoặc đường bay đang chọn.', 'Một nhóm hành động cho một đối tượng đang chọn.', delayBundle),
  'P3-C01': entry('P3-C01', 'Ngữ cảnh thời gian', 'Cho biết đối tượng, mức tham chiếu BL-T và lát cắt thời gian đang điều khiển trang.', 'Một ngữ cảnh phân tích thời gian.', [], 'Kết hợp bộ lọc toàn cục với lựa chọn mùa, tháng, thứ và khung giờ cục bộ.'),
  'P3-C02': entry('P3-C02', 'Chu kỳ mùa vụ và xu hướng theo thời gian', 'Xác định mùa hoặc tháng cần mở rộng xuống thứ trong tuần và khung giờ.', 'Một cột hoặc điểm là một tháng hay một nhóm mùa.', [...delayBundle, 'Chênh lệch BL-T', 'Cỡ mẫu']),
  'P3-C03': entry('P3-C03', 'Thứ trong tuần × Khung giờ kế hoạch', 'Tìm lát cắt thứ và giờ khởi hành theo lịch có mức trễ đáng chú ý.', 'Một ô là Thứ trong tuần × Khung giờ từ CRS_DEP_TIME.', [...delayBundle, 'Chênh lệch BL-T', 'Cỡ mẫu']),
  'P3-C04': entry('P3-C04', 'Bằng chứng tuyến bay và sân bay theo thời gian', 'Cho biết đối tượng không gian nào tạo nên lát cắt thời gian đang chọn.', 'Một hàng là đường bay theo chiều hoặc sân bay.', [...delayBundle, 'Chênh lệch BL-T', 'Cỡ mẫu']),
  'P4-C01': entry('P4-C01', 'Bối cảnh dự báo', 'Công bố phiên bản mô hình, thời điểm chốt, cửa sổ dự báo và trạng thái hiệu chỉnh.', 'Một lần chấm điểm minh họa.', ['Phiên bản mô hình', 'Cửa sổ dự báo', 'Thời điểm chốt', 'Trạng thái hiệu chỉnh'], 'Bộ lọc dự báo cục bộ; bộ lọc lịch sử chỉ điều khiển bằng chứng hỗ trợ.', 'DEMO-RISK-v0 chưa phải mô hình được phê duyệt.'),
  'P4-C02': entry('P4-C02', 'Danh sách chuyến bay tương lai', 'Liệt kê tín hiệu rủi ro của từng chuyến và bằng chứng lịch sử cùng đường bay.', 'Một hàng là một chuyến bay tương lai minh họa.', ['Xác suất dự báo', ...delayBundle]),
  'P4-C03': entry('P4-C03', 'Rủi ro theo địa lý', 'Tóm tắt rủi ro dự kiến theo đối tượng không gian và gắn bằng chứng lịch sử.', 'Một mark là một đường bay hoặc sân bay.', ['Tỷ lệ dự kiến', ...delayBundle]),
  'P4-C04': entry('P4-C04', 'Rủi ro theo khung giờ kế hoạch', 'So sánh tín hiệu dự báo giữa các khung giờ từ CRS_DEP_TIME.', 'Một thanh là một khung giờ kế hoạch.', ['Tỷ lệ dự kiến', ...delayBundle]),
  'P4-C05': entry('P4-C05', 'Bảng ưu tiên phân đoạn', 'Kết hợp tín hiệu dự báo với bằng chứng lịch sử để phục vụ sắp xếp thủ công.', 'Một hàng là một đường bay, sân bay hoặc phân đoạn thời gian.', ['Tỷ lệ dự kiến', 'Tỷ trọng rủi ro cao', ...delayBundle, 'Chênh lệch lịch sử', 'Cờ cỡ mẫu']),
  'P4-C06': entry('P4-C06', 'Rủi ro × Bằng chứng', 'Đối chiếu tín hiệu dự báo với chênh lệch lịch sử mà không tự sinh quyết định.', 'Một bong bóng là một phân đoạn.', ['Tỷ lệ dự kiến', ...delayBundle, 'Chênh lệch lịch sử']),
  'P4-C07': entry('P4-C07', 'Đánh giá bởi con người', 'Ghi nhận lựa chọn xem xét của người dùng sau khi đọc toàn bộ bằng chứng.', 'Một quyết định ghi chú cho phân đoạn đang chọn.', ['Ưu tiên xem xét', 'Theo dõi', 'Chưa đủ bằng chứng'], undefined, 'Không phát lệnh hoặc tự động thay đổi lịch bay.'),
  'CM-C01': entry('CM-C01', 'Ngữ cảnh đối sánh', 'Giữ ảnh chụp ngữ cảnh nguồn và điều phối đúng một hạng mục so sánh tại một thời điểm.', 'Một cửa sổ cho một ngữ cảnh WN bất biến.', ['Nguồn mở', 'Ý định so sánh', 'Phạm vi lọc']),
  'CM-C02': entry('CM-C02', 'Tóm tắt mức tham chiếu nhóm hãng đối sánh', 'So bộ ba chỉ số WN với bằng chứng quan sát và tỷ lệ nhóm được chuẩn hóa trên cùng các ô tương đương.', 'Một kết quả đối sánh cho nhóm hãng đã đóng băng.', [...delayBundle, 'Tỷ lệ tham chiếu chuẩn hóa', 'Chênh lệch WN', 'Độ phủ']),
  'CM-C03': entry('CM-C03', 'Cách chọn nhóm đối sánh', 'Công bố hãng được chọn, độ phủ, số ô chung và phiên bản quy tắc.', 'Một nhóm tối đa hai hãng được đóng băng trong phiên phân tích.', ['Hãng được chọn', 'Độ phủ WN', 'Số ô chung', 'Phiên bản quy tắc']),
  'CM-C04': entry('CM-C04', 'Hành động tiếp theo', 'Chuyển sang điều tra chuyến WN hoặc nhóm hãng mà không tạo dialog lồng nhau.', 'Một nhóm hành động cho kết quả đối sánh.', []),
  'CM-V-RATE': entry('CM-V-RATE', 'So sánh tỷ lệ trễ', 'Đặt tỷ lệ WN cạnh mức tham chiếu nhóm đã chuẩn hóa.', 'Một cặp tỷ lệ trên cùng tập ô tương đương.'),
  'CM-V-TREND': entry('CM-V-TREND', 'So sánh xu hướng trễ', 'Kiểm tra diễn biến WN và nhóm đối sánh theo thời gian với nhóm hãng đã đóng băng.', 'Một điểm là một tháng trên cùng tập ô so sánh.'),
  'CM-V-AIRPORT': entry('CM-V-AIRPORT', 'So sánh bằng chứng sân bay', 'Đối sánh sân bay theo vai trò và các tuyến – thời gian chung.', 'Một ngữ cảnh sân bay và vai trò.'),
  'CM-V-TIME': entry('CM-V-TIME', 'So sánh mẫu thứ và khung giờ', 'Đối sánh đúng ô thứ trong tuần × khung giờ kế hoạch.', 'Một ô thời gian trong ngữ cảnh tuyến hoặc sân bay.'),
  'CM-V-FUTURE': entry('CM-V-FUTURE', 'So sánh lịch sử hỗ trợ dự báo', 'Đối sánh lịch sử tương đồng hỗ trợ một đối tượng tương lai mà không biến benchmark thành dự báo.', 'Một tập lịch sử hỗ trợ đối tượng dự báo.'),
  'FI-C01': entry('FI-C01', 'Điều tra chuyến bay', 'Giữ nguồn mở, ảnh chụp ngữ cảnh và phạm vi hãng khi truy vết từ tín hiệu tổng hợp về bản ghi.', 'Một cửa sổ điều tra cho một ảnh chụp ngữ cảnh nguồn.', ['Nguồn mở', 'Phạm vi hãng']),
  'FI-C02': entry('FI-C02', 'Thanh lọc điều tra', 'Thu hẹp bản ghi theo thời gian, nhóm sân bay và tuyến, cự ly, thứ, khung giờ, trạng thái cùng số hiệu chuyến.', 'Một nhóm điều kiện cục bộ trong cửa sổ điều tra.', [], 'Các dòng sân bay/tuyến cục bộ kết hợp bằng HOẶC; điều kiện cự ly chọn khoảng số hoặc nhóm chuẩn. Toàn bộ nhóm cục bộ kết hợp bằng VÀ với ảnh chụp ngữ cảnh nguồn để việc thêm điều kiện không vô tình mở rộng phạm vi.'),
  'FI-C03': entry('FI-C03', 'Điều kiện đang áp dụng và lịch sử mở rộng', 'Phân biệt bỏ một thẻ điều kiện với quay lại toàn bộ ảnh chụp ngữ cảnh trước.', 'Một lịch sử các bước lọc trong phiên điều tra.', ['Thẻ điều kiện nguồn', 'Thẻ điều kiện cục bộ', 'Số bước lịch sử']),
  'FI-C04': entry('FI-C04', 'Tóm tắt tập kết quả', 'Đối soát bộ ba chỉ số và quy mô bản ghi sau bộ lọc.', 'Toàn bộ tập chuyến đủ điều kiện trước tìm kiếm và phân trang.', [...delayBundle, 'Bản ghi mẫu', 'Ước tính quần thể minh họa']),
  'FI-C05': entry('FI-C05', 'Bảng chuyến bay', 'Tìm kiếm, sắp xếp và phân trang toàn bộ bản ghi hỗ trợ tín hiệu nguồn.', 'Một hàng là một chuyến bay đủ điều kiện.', [...delayBundle, 'Lịch bay', 'Trạng thái', 'Cự ly']),
  'FI-C06': entry('FI-C06', 'Chi tiết chuyến được chọn', 'Hiển thị thông tin chuyến và bối cảnh hậu nghiệm mà không dùng làm bằng chứng nhân quả.', 'Một chuyến bay được chọn.', delayBundle),
  SD: entry('SD', 'Bằng chứng phân đoạn', 'Tập hợp lịch sử, mức tham chiếu, cỡ mẫu và trạng thái dự báo cho đối tượng đang chọn.', 'Một drawer cho một phân đoạn.', [...delayBundle, 'Mức tham chiếu', 'Chênh lệch', 'Rủi ro dự kiến']),
  CD: entry('CD', 'Bối cảnh nguyên nhân được ghi nhận', 'Mô tả các nhóm nguyên nhân sau sự kiện để định hướng điều tra tiếp.', 'Một drawer cho một phân đoạn lịch sử.', [...delayBundle, 'Số chuyến có ghi nhận nguyên nhân', 'Tỷ trọng nhóm nguyên nhân'], undefined, 'Nhóm nguyên nhân không loại trừ nhau, không phải bằng chứng nhân quả và không dùng làm predictor.'),
  'PX-F': entry('PX-F', 'Giải thích dự báo chuyến bay', 'Giải thích các đóng góp đặc trưng của một xác suất dự báo minh họa.', 'Một drawer cho một chuyến bay tương lai.', ['Xác suất dự báo', 'Đóng góp đặc trưng']),
  'PX-S': entry('PX-S', 'Giải thích dự báo phân đoạn', 'Giải thích các đóng góp đặc trưng của một phân đoạn dự báo minh họa.', 'Một drawer cho một phân đoạn.', ['Tỷ lệ dự kiến', 'Đóng góp đặc trưng']),
  'MD-KPI': entry('MD-KPI', 'Phương pháp KPI', 'Giải thích eligibility, outcome trễ, công thức và xử lý giá trị thiếu.', 'Một tab phương pháp luận.', ['Công thức KPI', 'Quy tắc null']),
  'MD-BASELINE': entry('MD-BASELINE', 'Phương pháp mức tham chiếu', 'Giải thích BL-AR, BL-T và BL-C cùng các bộ lọc giữ hoặc bỏ.', 'Một tab phương pháp luận.', ['Định nghĩa tập đối sánh', 'Trạng thái N/A']),
  'MD-SAMPLE': entry('MD-SAMPLE', 'Phương pháp cỡ mẫu', 'Giải thích cỡ mẫu, cờ mẫu và trạng thái chưa hiệu chỉnh.', 'Một tab phương pháp luận.', ['Cỡ mẫu', 'Phiên bản ngưỡng']),
  'MD-MODEL': entry('MD-MODEL', 'Phương pháp mô hình', 'Giải thích đặc trưng pre-flight, cutoff và các trường bị cấm do leakage.', 'Một tab phương pháp luận.', ['Phiên bản mô hình', 'Cutoff', 'Phạm vi đặc trưng']),
  'MD-PRIORITY': entry('MD-PRIORITY', 'Phương pháp mức ưu tiên', 'Giải thích ranh giới hỗ trợ quyết định và trạng thái quy tắc ưu tiên.', 'Một tab phương pháp luận.', ['Phiên bản quy tắc', 'Xử lý đồng hạng', 'Trạng thái hiệu chỉnh']),
  'MD-DISTANCE': entry('MD-DISTANCE', 'Phương pháp nhóm khoảng cách', 'Giải thích DG-BTS-250-v1 từ G01 đến G11.', 'Một tab phương pháp luận.', ['Khoảng cách dặm', 'Nhóm khoảng cách']),
}
