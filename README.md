# App chủ nhiệm Ngọc Yến — bản sửa đăng nhập và Supabase

Đọc HUONG_DAN_CAI_DAT.md trước khi triển khai. Chạy schema.sql của đúng bản này.

- Giao diện React/Vite được giữ nguyên.
- backend/app.ts: Express API, lưu toàn bộ trạng thái lớp trong bảng ngoc_yen_app_state; mã lớp APP_DATA_SCOPE tách các lớp.
- api/index.ts: đầu vào API cho Vercel. server.ts chỉ chạy giao diện và API khi phát triển/local.
- Phiên đăng nhập ngẫu nhiên được lưu trong bảng riêng tư; không mất khi Function khởi động lại. Đổi mật khẩu ghi lên Supabase.
- Ghi dữ liệu có kiểm tra revision; nếu hai phiên sửa cùng lúc, API trả 409 để tải lại thay vì ghi đè im lặng.
- Không dùng Supabase Auth: tài khoản giáo viên/học sinh do backend của app xác thực.
- Không sử dụng file JSON trên ổ đĩa của Vercel để lưu dữ liệu.

Lệnh: npm ci; npm run dev; npm run build; npm run lint; npm test.
Kiểm tra API tự động dùng Supabase giả lập, không truy cập cơ sở dữ liệu thật.
