# Lưu ý bản màu hồng pastel
Bản này đổi màu hồng đậm thành hồng pastel #FFC5C5 theo mẫu, dùng chữ tối để dễ đọc. Lỗi đăng nhập hiển thị ngay trong biểu mẫu.

Nếu trang đăng nhập vẫn có dòng “mặc định: gvcn123”, trang đó chưa dùng bản sửa. Phải tải mã nguồn mới lên đúng kho GitHub và triển khai commit mới; chỉ Redeploy mã cũ không cập nhật ứng dụng.
Sau triển khai, /api/status cần trả JSON có appVersion: ngoc-yen-pastel-2. Nếu chưa có, hãy kiểm tra domain, commit và nhánh Production trên Vercel.
Mật khẩu giáo viên lần đầu lấy từ INITIAL_TEACHER_PASSWORD (ít nhất 12 ký tự). Nếu đã đổi trong app, dùng mật khẩu mới nhất; sửa biến này không đổi mật khẩu đã lưu. Không đổi APP_DATA_SCOPE để sửa lỗi đăng nhập.

# Cài app Ngọc Yến lên Vercel

## 1. Chuẩn bị SQL
1. Đăng nhập https://supabase.com/dashboard, mở đúng dự án dành cho app Ngọc Yến (hoặc tạo dự án mới nếu chưa có).
2. Chọn SQL Editor ở thanh bên trái, chọn New query.
3. Mở file schema.sql trong thư mục vừa giải nén bằng Notepad. Nhấn Ctrl+A rồi Ctrl+C.
4. Dán toàn bộ vào ô soạn SQL, chọn Run. Chờ thông báo thành công.
SQL này tạo bảng ngoc_yen_app_state và hàm lưu dữ liệu. Có thể chạy lại; không xóa bảng/dữ liệu lớp khác. Nếu đã chạy schema cũ, vẫn cần chạy schema của bản sửa này.

## 2. Cập nhật mã nguồn GitHub
1. Mở đúng repository gvcn-ngoc-yen của cô. Chọn nhánh Vercel dùng cho Production (thường main).
2. Giải nén ZIP này. Mở thư mục có package.json, server.ts, schema.sql.
3. Trên GitHub, chọn Add file → Upload files.
4. Kéo các file và thư mục BÊN TRONG thư mục vừa giải nén lên. Không kéo cả thư mục bao ngoài. Không tải node_modules, dist hoặc file .env có khóa bí mật.
5. Chú ý phải có backend/app.ts, api/index.ts và vercel.json ở đúng vị trí. Ghi đè server.ts, package.json, package-lock.json, schema.sql, src/services/api.ts, src/components/LoginView.tsx và các tài liệu bằng bản mới.
6. Nhấn Commit changes. Nếu GitHub không cho ghi đè, bấm vào file cũ → Edit → thay nội dung bằng file cùng tên của bản mới, rồi commit. Với file mới trong thư mục con có thể chọn Add file → Create new file và nhập tên backend/app.ts hoặc api/index.ts.
Bản mới dùng npm. Nếu kho có bun.lock cũ, xóa riêng file bun.lock bằng menu của file → Delete file → Commit, để Vercel dùng package-lock.json mới.

## 3. Thêm biến môi trường trên Vercel
Mở dự án gvcn-ngoc-yen → Settings → Environment Variables.
Thêm các biến sau cho Production (và Preview nếu muốn dùng bản xem thử):

| Key | Value lấy ở đâu |
| --- | --- |
| SUPABASE_URL | URL dự án Supabase, dạng https://ma-du-an.supabase.co; lấy tại Connect hoặc Settings → Data API |
| SUPABASE_SECRET_KEY | Supabase → Settings → API Keys → Secret keys; sao chép khóa bí mật dành cho server. Có thể dùng khóa service_role cũ nhưng đặt dưới tên SUPABASE_SERVICE_ROLE_KEY thay thế |
| APP_DATA_SCOPE | Tự đặt: ngoc-yen-2026-2027. Giữ nguyên khi muốn dùng lại cùng dữ liệu lớp |
| INITIAL_TEACHER_PASSWORD | Tự đặt mật khẩu RIÊNG ít nhất 12 ký tự, ghi lại ở nơi an toàn. Mật khẩu dùng để đăng nhập giáo viên lần đầu |

Không dùng khóa anon/publishable cho backend. Không thêm tiền tố VITE_ cho khóa bí mật. Không đưa value bí mật vào GitHub hoặc gửi trong ảnh chụp.
Nếu AI Studio cũng chạy app này, cập nhật mã nguồn và đặt đúng cùng SUPABASE_URL, khóa server và APP_DATA_SCOPE ở Secrets để dùng cùng dữ liệu. Đổi INITIAL_TEACHER_PASSWORD sau khi lớp đã khởi tạo KHÔNG đổi mật khẩu đang lưu; phải dùng chức năng Đổi mật khẩu trong app.

## 4. Triển khai
Settings → Build and Deployment: Framework Preset Vite; Build Command npm run build; Output Directory dist; Install Command npm ci. Root Directory là thư mục chứa package.json (thường để trống).
Vào Deployments. Nếu commit mới chưa triển khai thì chờ build mới, hoặc chọn bản từ commit mới nhất → … → Redeploy sau khi lưu biến môi trường. Redeploy commit cũ không đưa bản sửa mới lên.
Khi Ready, mở domain Production → chọn Giáo viên chủ nhiệm → nhập mật khẩu đã đặt ở INITIAL_TEACHER_PASSWORD. Bản này không dùng gvcn123 mặc định.

## 5. Kiểm tra sau triển khai
1. Mở https://TEN_DOMAIN_CUA_CO/api/status: cần thấy JSON; nếu hiện lỗi, đọc nội dung lỗi để bổ sung biến hoặc chạy SQL.
2. Đăng nhập, vào Cài đặt đổi tên trường/lớp/GVCN/năm học theo lớp thật. Bản gốc có nhãn 8A3/Thùy Trang; đây là cấu hình mặc định, cô có thể sửa.
3. Sửa một thông tin nhỏ, lưu rồi tải lại trang. Kiểm tra thông tin còn giữ.
4. Thử Đổi mật khẩu GV rồi đăng nhập lại bằng mật khẩu mới.
5. Nhập học sinh thật sau khi bước lưu/tải lại thành công. Sao lưu JSON trước khi nhập thay thế hoặc khôi phục.

## Khi còn lỗi
- 503 “Cần đặt…”: thiếu biến môi trường hoặc mật khẩu khởi tạo chưa đủ 12 ký tự. Lưu biến rồi Redeploy.
- 503 không đọc được cơ sở dữ liệu: kiểm tra đúng URL/secret server, chạy schema.sql và dự án Supabase không bị tạm dừng.
- API trả HTML/404: kiểm tra api/index.ts, backend/app.ts, vercel.json đã có trong commit đang triển khai và Root Directory đúng.
- 409: có phiên khác vừa lưu dữ liệu. Tải lại trang trước khi sửa tiếp.
- Mật khẩu không đúng sau khi từng đổi: dùng mật khẩu đổi gần nhất. Không đổi APP_DATA_SCOPE để “sửa mật khẩu” vì sẽ mở một không gian lớp khác.

## Phạm vi kiểm tra bản sửa
Đã kiểm tra TypeScript, build giao diện và API bằng Supabase giả lập: đăng nhập đúng/sai, phiên sau khi nạp lại backend, đổi mật khẩu, lưu/tải cấu hình, quyền học sinh, ghi thất bại, xung đột và JSON 404. Chưa chạy SQL hoặc kiểm tra đăng nhập trên Supabase/Vercel thật của cô vì chưa có quyền truy cập.
