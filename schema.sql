-- =========================================================================
-- TRỢ LÝ CHỦ NHIỆM - SUPABASE DATABASE SCHEMA & POLICIES
-- Chạy tập lệnh này trong mục SQL Editor trên trang quản trị Supabase
-- Không tự động xóa các bảng hoặc dữ liệu đã có (sử dụng CREATE TABLE IF NOT EXISTS)
-- =========================================================================

-- 1. BẢNG CẤU HÌNH THÔNG TIN CHUNG CỦA LỚP VÀ SỔ
CREATE TABLE IF NOT EXISTS class_config (
    id TEXT PRIMARY KEY DEFAULT 'class_main',
    app_name TEXT NOT NULL DEFAULT 'Trợ lý chủ nhiệm',
    school_name TEXT NOT NULL DEFAULT 'Trường THCS Đồng Khởi',
    class_name TEXT NOT NULL DEFAULT '8A3',
    teacher_name TEXT NOT NULL DEFAULT 'Nguyễn Thị Thùy Trang',
    school_year TEXT NOT NULL DEFAULT '2026-2027',
    logo_url TEXT,
    attention_threshold JSONB DEFAULT '{"absenceDays": 2, "violationsCount": 2}'::jsonb,
    auto_conduct_attendance JSONB DEFAULT '{"enabled": false, "unexcusedAbsenceRuleId": "rule_v4", "lateRuleId": "rule_v3"}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. BẢNG DANH SÁCH HỌC SINH
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('Nam', 'Nữ')) NOT NULL,
    birth_date DATE NOT NULL,
    parent_phone TEXT,
    parent_name TEXT,
    address TEXT,
    notes TEXT, -- Ghi chú nội bộ của GVCN
    avatar_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    username TEXT UNIQUE NOT NULL, -- Định dạng: [mã số]-[ddmmyyyy]
    password_hash TEXT NOT NULL,
    must_change_password BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_students_code ON students(code);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_username ON students(username);

-- 3. BẢNG DANH MỤC MÔN HỌC
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT CHECK (type IN ('score', 'comment')) NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. BẢNG QUY TẮC THI ĐUA & NỀ NẾP
CREATE TABLE IF NOT EXISTS conduct_settings (
    id TEXT PRIMARY KEY DEFAULT 'conduct_main',
    initial_score NUMERIC DEFAULT 200,
    threshold_good NUMERIC DEFAULT 190, -- A: từ A trở lên là Tốt
    threshold_fair NUMERIC DEFAULT 160, -- B: từ B đến dưới A là Khá
    threshold_pass NUMERIC DEFAULT 130, -- C: từ C đến dưới B là Đạt, dưới C là Chưa đạt
    rules JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. BẢNG ĐIỂM DANH HÀNG NGÀY
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('present', 'excused', 'unexcused', 'late', 'not_marked')) NOT NULL,
    note TEXT,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(date, student_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_records(student_id);

-- 6. BẢNG ĐIỂM HỌC TẬP THEO THÁNG
CREATE TABLE IF NOT EXISTS monthly_scores (
    id TEXT PRIMARY KEY,
    year_month TEXT NOT NULL, -- e.g. "2026-10"
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    scores JSONB NOT NULL DEFAULT '{}'::jsonb, -- subject_id -> {score, comment}
    gpa NUMERIC(4, 2),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(year_month, student_id)
);

CREATE INDEX IF NOT EXISTS idx_scores_month ON monthly_scores(year_month);
CREATE INDEX IF NOT EXISTS idx_scores_student_id ON monthly_scores(student_id);

-- 7. BẢNG SỰ VIỆC THI ĐUA & KỶ LUẬT
CREATE TABLE IF NOT EXISTS conduct_incidents (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    rule_id TEXT,
    rule_name TEXT NOT NULL,
    category TEXT CHECK (category IN ('violation', 'reward')) NOT NULL,
    points NUMERIC NOT NULL,
    content TEXT NOT NULL,
    note TEXT,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_incidents_student_id ON conduct_incidents(student_id);
CREATE INDEX IF NOT EXISTS idx_incidents_date ON conduct_incidents(date);

-- 8. BẢNG TIN THÔNG BÁO
CREATE TABLE IF NOT EXISTS bulletin_posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT CHECK (category IN ('announcement', 'competition', 'reminder')) NOT NULL,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    embed_url TEXT,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. BẢNG SƠ ĐỒ LỚP
CREATE TABLE IF NOT EXISTS seating_plans (
    id TEXT PRIMARY KEY DEFAULT 'seating_main',
    title TEXT NOT NULL DEFAULT 'Sơ đồ lớp chính thức',
    is_published BOOLEAN DEFAULT FALSE,
    slots JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. BẢNG VINH DANH HỌC TẬP THEO THÁNG
CREATE TABLE IF NOT EXISTS honor_boards (
    year_month TEXT PRIMARY KEY,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    top_academic JSONB DEFAULT '[]'::jsonb,
    custom_rewards JSONB DEFAULT '[]'::jsonb,
    requires_republish BOOLEAN DEFAULT FALSE
);

-- =========================================================================
-- BẢO MẬT VÀ ROW LEVEL SECURITY (RLS)
-- Lưu ý: Ứng dụng quản trị thực hiện phân quyền tập trung tại máy chủ backend
-- Nếu sử dụng trực tiếp Supabase Client phía người dùng, kích hoạt RLS sau:
-- =========================================================================

ALTER TABLE class_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE conduct_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE conduct_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE honor_boards ENABLE ROW LEVEL SECURITY;

-- Chính sách đọc cho Học sinh và Khách xem:
-- Chỉ đọc cấu hình chung
CREATE POLICY "Cho phép đọc cấu hình lớp học" ON class_config FOR SELECT USING (true);
CREATE POLICY "Cho phép đọc danh mục môn học" ON subjects FOR SELECT USING (true);
CREATE POLICY "Cho phép đọc quy tắc thi đua" ON conduct_settings FOR SELECT USING (true);
-- Chỉ đọc bài viết bảng tin đã được công bố
CREATE POLICY "Chỉ đọc bài viết đã công bố" ON bulletin_posts FOR SELECT USING (is_published = true);
-- Chỉ đọc sơ đồ lớp đã công bố
CREATE POLICY "Chỉ đọc sơ đồ lớp đã công bố" ON seating_plans FOR SELECT USING (is_published = true);
-- Chỉ đọc bảng vinh danh đã công bố
CREATE POLICY "Chỉ đọc bảng vinh danh đã công bố" ON honor_boards FOR SELECT USING (is_published = true);

-- Dữ liệu riêng tư: backend sử dụng Service Role Key để truy cập và kiểm tra quyền RBAC nghiêm ngặt.
