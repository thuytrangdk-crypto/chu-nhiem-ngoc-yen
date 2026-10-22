# Trợ Lý Chủ Nhiệm - Quản Lý Lớp Học & Nề Nếp Toàn Diện

Ứng dụng web chuyên nghiệp hỗ trợ Giáo viên Chủ nhiệm (GVCN) và Học sinh trong công tác quản lý nề nếp, điểm danh, bảng điểm học tập, thi đua kỷ luật và truyền thông lớp học.

Giao diện được thiết kế theo tông màu hồng phấn nhẹ nhàng (`#fdf2f4`), thẻ trắng tinh tế, nút bấm hoa hồng (`#f43f5e`), bố cục khoa học, tối ưu trải nghiệm trên cả Laptop, Máy tính bảng và Điện thoại (bao gồm Safari iPhone).

---

## 1. TÍNH NĂNG CHÍNH

### 📌 1. Bảng điều khiển Tổng quan (Dashboard)
- Banner nhận diện lớp học và GVCN theo cấu hình động.
- 4 thẻ thống kê: Sĩ số lớp (Nam/Nữ), Vắng hôm nay, Lượt vi phạm trong tuần, Khen thưởng.
- Danh sách **Học sinh cần chú ý** (cấu hình được ngưỡng số buổi vắng và số lần vi phạm). Nhấn vào học sinh để chuyển thẳng sang hồ sơ chi tiết.
- Dòng nhật ký **Hoạt động gần đây** cập nhật theo thời gian thực.

### 📢 2. Bảng tin Thông báo & Sơ đồ lớp (56 chỗ) & Bảng vàng Vinh danh
- **Bảng tin**: Đăng thông báo, ghim bài viết, đính kèm ảnh/clip hoặc nhúng video YouTube và liên kết Google Drive.
- **Sơ đồ lớp**: Chuẩn 4 dãy x 7 bàn x 2 chỗ/bàn = 56 chỗ ngồi. Thể hiện rõ bảng đen, bàn giáo viên, cửa ra vào và chiều nhìn. Cho phép kéo/chọn học sinh, chống xếp trùng và hỗ trợ in ấn. Học sinh chỉ xem được khi giáo viên công bố.
- **Vinh danh**: Tự động xếp hạng Top 5 học tập dựa trên điểm trung bình tháng (ĐTB) của các môn có điểm số. Cảnh báo cần công bố lại nếu có điểm bị chỉnh sửa sau khi công bố. Khen thưởng thi đua phong trào riêng biệt.

### 👥 3. Quản lý Học sinh & Nhập/Xuất Excel
- 2 chế độ hiển thị: **Dạng thẻ (Card)** và **Dạng bảng (Table)**.
- Thẻ học sinh hiển thị ảnh/chữ cái, họ tên, mã hồ sơ, ngày sinh, trạng thái điểm danh và cờ cảnh báo.
- Tải tệp mẫu Excel, nhập danh sách với chế độ **Bổ sung/cập nhật** hoặc **Thay thế toàn bộ**, kiểm tra lỗi chi tiết từng dòng.
- Xuất danh sách học sinh ra file `.xlsx` và xuất báo cáo thi đua cả lớp.

### 📂 4. Hồ sơ Học sinh Mở Rộng
- Không gian làm việc toàn màn hình rộng rãi.
- 4 ô KPI: Điểm danh, Điểm trung bình học tập, Điểm thi đua còn lại, Xếp loại hạnh kiểm.
- **5 Tab chi tiết**:
  1. *Thông tin cá nhân*: Lý lịch, tên đăng nhập, đặt lại mật khẩu học sinh.
  2. *Điểm danh*: Chi tiết lịch sử các ngày vắng có phép, không phép, muộn.
  3. *Học tập & Điểm số*: Bảng điểm từng tháng và biểu đồ tiến độ điểm trung bình.
  4. *Thi đua & Kỷ luật*: Bố cục chuẩn (Trái 35% form ghi nhận cố định; Phải 65% bộ lọc kỳ, điểm thi đua và lịch sử có cuộn riêng). Nút **Xuất Excel vi phạm** tạo file `.xlsx` gồm 2 sheet: *Chi tiết vi phạm* và *Tổng hợp theo lỗi*.
  5. *Sổ tay & Liên hệ*: Thông tin phụ huynh và **Ghi chú nội bộ** được phân quyền bảo mật (chỉ GVCN xem được).
- Hỗ trợ in **Phiếu liên lạc** gửi về gia đình.

### 📊 5. Bảng Điểm Học Tập Theo Tháng
- Bảng điểm cố định cột STT, Mã và Họ tên; cuộn mượt mà các cột môn học.
- Hỗ trợ nhập trực tiếp từng ô (0 đến 10, hỗ trợ cả dấu phẩy `,` và chấm `.`). Ô trống là chưa có điểm, điểm 0 là điểm hợp lệ.
- Tính toán ĐTB tháng tự động theo thời gian thực (bỏ qua các môn nhận xét).
- Nhập/Xuất Excel điểm tháng, xóa điểm tháng an toàn với cơ chế sao lưu tự động và khôi phục khi cần.
- Cấu hình môn học linh hoạt (Chấm điểm số hoặc Đánh giá Đ/CĐ).

### 📅 6. Sổ Điểm Danh Hàng Ngày
- Chọn ngày điểm danh với 4 trạng thái: *Có mặt (Xanh lá)*, *Có phép (Xanh dương)*, *Kh.phép (Đỏ)*, *Muộn (Vàng cam)*.
- Nút "Tất cả có mặt" hỗ trợ điểm danh nhanh.
- Tùy chọn tự động trừ điểm thi đua khi vắng không phép hoặc đi học muộn (chống ghi nhận trùng lặp).
- Thống kê tháng và xuất báo cáo điểm danh ra file Excel.

### ⚙️ 7. Cài Đặt Chung & Quy Tắc Thi Đua
- Cho phép sửa Tên ứng dụng, Tên trường, Tên lớp, Năm học, Họ tên GVCN. Tất cả vị trí trên app đọc đồng nhất từ cài đặt này.
- Quy tắc thi đua: Điểm khởi đầu tự do (VD: 200đ hoặc 100đ), cài đặt 3 ngưỡng $A > B > C$ cho 4 mức: **Tốt**, **Khá**, **Đạt**, **Chưa đạt**.
- Thêm/sửa/xóa các tiêu chí vi phạm và khen thưởng với điểm số quy định.
- Chức năng an toàn: Sao lưu JSON toàn bộ dữ liệu, Khôi phục từ JSON, Làm sạch dữ liệu lớp (yêu cầu gõ mã xác nhận).

---

## 2. PHÂN QUYỀN & TÀI KHOẢN

### Giáo viên chủ nhiệm:
- Đăng nhập bằng mật khẩu quản trị (Mật khẩu ban đầu: `gvcn123`).
- Có toàn quyền quản lý học sinh, điểm danh, điểm số, bài đăng và cài đặt.
- Có chức năng **Đổi mật khẩu GV** (yêu cầu mật khẩu cũ, mật khẩu mới tối thiểu 6 ký tự).

### Học sinh:
- Tự động tạo tài khoản khi GVCN thêm hoặc nhập danh sách học sinh.
- **Tên đăng nhập**: `[mã số][ddmmyyyy]` (Ví dụ: Mã số `01`, sinh ngày `02/10/2013` → Tên đăng nhập là `0102102013`).
- **Mật khẩu ban đầu**: Ngày sinh định dạng `ddmmyyyy` (Ví dụ: `02102013`).
- Học sinh chỉ xem được bài viết, sơ đồ lớp, bảng vàng đã công bố và hồ sơ cá nhân của chính mình.
- Hệ thống kiểm tra RBAC chặt chẽ ở máy chủ: Học sinh không thể xem hồ sơ hoặc vi phạm của học sinh khác ngay cả khi sửa URL hoặc gọi trực tiếp API.

---

## 3. THIẾT LẬP SUPABASE CLOUD (TÙY CHỌN)

Ứng dụng mặc định lưu trữ dữ liệu bền vững trên máy chủ tại thư mục `./data/database.json`. Để kích hoạt đồng bộ đám mây Supabase:

1. Đăng ký tài khoản miễn phí tại [supabase.com](https://supabase.com).
2. Tạo dự án mới.
3. Mở tab **SQL Editor**, sao chép nội dung tệp `schema.sql` trong mã nguồn và nhấn **Run** để khởi tạo các bảng và chính sách bảo mật (RLS).
4. Mở **Project Settings** > **API**, lấy URL và Service Role Key, sau đó thêm vào tệp `.env`:
   ```env
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
   ```
5. Khi có cấu hình, ứng dụng sẽ tự động nhận diện và hiển thị trạng thái "Supabase: Đã kết nối".

---

## 4. BIẾN MÔI TRƯỜNG

Tệp `.env.example`:
```env
# Cổng ứng dụng
PORT=3000

# Mật khẩu khởi tạo giáo viên ban đầu (nếu chưa đổi)
INITIAL_TEACHER_PASSWORD="gvcn123"

# Cấu hình Supabase (Tùy chọn)
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
```

---

## 5. HƯỚNG DẪN BUILD & TRIỂN KHAI

### Chạy môi trường phát triển (Dev):
```bash
npm install
npm run dev
```
Truy cập tại: `http://localhost:3000`.

### Build sản phẩm (Production):
```bash
npm run build
npm start
```

### Triển khai lên Vercel / Cloud Run:
- Đặt câu lệnh build: `npm run build`
- Đặt câu lệnh start: `node dist/server.js` hoặc cấu hình Node.js runtime.
- Khai báo các biến môi trường cần thiết trong bảng điều khiển triển khai.
