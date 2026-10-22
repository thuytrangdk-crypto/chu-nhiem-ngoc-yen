import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  ClassConfig,
  Student,
  Subject,
  ConductSettings,
  AttendanceRecord,
  MonthlyScoreRecord,
  ConductIncident,
  BulletinPost,
  SeatingPlan,
  HonorBoard,
  DatabaseBackup,
  UserSession,
} from '../src/types';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

// ----------------------------------------------------
// DEFAULT INITIAL STATE (No fake students, clean app)
// ----------------------------------------------------
const defaultSubjects: Subject[] = [
  { id: 'sub_math', name: 'Toán', code: 'TOAN', type: 'score', order: 1 },
  { id: 'sub_lit', name: 'Ngữ văn', code: 'VAN', type: 'score', order: 2 },
  { id: 'sub_eng', name: 'Tiếng Anh', code: 'ANH', type: 'score', order: 3 },
  { id: 'sub_sci', name: 'KHTN', code: 'KHTN', type: 'score', order: 4 },
  { id: 'sub_his_geo', name: 'LS&ĐL', code: 'LSDL', type: 'score', order: 5 },
  { id: 'sub_civic', name: 'GDCD', code: 'GDCD', type: 'score', order: 6 },
  { id: 'sub_it', name: 'Tin học', code: 'TIN', type: 'score', order: 7 },
  { id: 'sub_tech', name: 'Công nghệ', code: 'CN', type: 'score', order: 8 },
  { id: 'sub_pe', name: 'Thể dục', code: 'TD', type: 'comment', order: 9 },
  { id: 'sub_art', name: 'Nghệ thuật', code: 'NT', type: 'comment', order: 10 },
  { id: 'sub_exp', name: 'HĐTN-HN', code: 'HDTN', type: 'comment', order: 11 },
];

const defaultConductSettings: ConductSettings = {
  initialScore: 200,
  thresholdGood: 190, // A
  thresholdFair: 160, // B
  thresholdPass: 130, // C
  rules: [
    { id: 'rule_v1', code: 'V01', name: 'Nói chuyện riêng trong giờ học', category: 'violation', points: 2, isActive: true },
    { id: 'rule_v2', code: 'V02', name: 'Không làm bài tập / không chép bài', category: 'violation', points: 3, isActive: true },
    { id: 'rule_v3', code: 'V03', name: 'Đi học muộn', category: 'violation', points: 2, isActive: true },
    { id: 'rule_v4', code: 'V04', name: 'Nghỉ học không phép', category: 'violation', points: 5, isActive: true },
    { id: 'rule_v5', code: 'V05', name: 'Không đúng trang phục / tác phong', category: 'violation', points: 2, isActive: true },
    { id: 'rule_v6', code: 'V06', name: 'Sử dụng điện thoại trái quy định', category: 'violation', points: 5, isActive: true },
    { id: 'rule_v7', code: 'V07', name: 'Mất trật tự, gây rối', category: 'violation', points: 5, isActive: true },
    { id: 'rule_r1', code: 'R01', name: 'Phát biểu xây dựng bài tích cực', category: 'reward', points: 2, isActive: true },
    { id: 'rule_r2', code: 'R02', name: 'Đạt điểm tốt (9, 10) kiểm tra', category: 'reward', points: 5, isActive: true },
    { id: 'rule_r3', code: 'R03', name: 'Việc tốt / giúp đỡ bạn bè', category: 'reward', points: 3, isActive: true },
    { id: 'rule_r4', code: 'R04', name: 'Đạt giải phong trào / thi đua', category: 'reward', points: 10, isActive: true },
  ],
};

// 4 dãy x 7 bàn x 2 chỗ = 56 chỗ
function generateDefaultSeatingSlots() {
  const slots = [];
  for (let col = 1; col <= 4; col++) {
    for (let desk = 1; desk <= 7; desk++) {
      slots.push({ column: col, desk, position: 1 as const, studentId: null });
      slots.push({ column: col, desk, position: 2 as const, studentId: null });
    }
  }
  return slots;
}

interface DatabaseStructure {
  config: ClassConfig;
  students: Student[];
  subjects: Subject[];
  conductSettings: ConductSettings;
  attendance: AttendanceRecord[];
  scores: MonthlyScoreRecord[];
  incidents: ConductIncident[];
  bulletin: BulletinPost[];
  seating: SeatingPlan;
  honorBoards: Record<string, HonorBoard>;
  _sessions?: Record<string, UserSession>;
  _attempts?: Record<string, { count: number; lockedUntil: number }>;
  _snapshots?: Record<string, unknown>;
  scoreBackups: Record<string, { backupTime: string; month: string; data: MonthlyScoreRecord[] }>;
}

// Only initialize a new class from the server-side teacher password.
const INITIAL_TEACHER_PASSWORD = process.env.INITIAL_TEACHER_PASSWORD || crypto.randomBytes(32).toString('hex');
const INITIAL_TEACHER_HASH = bcrypt.hashSync(INITIAL_TEACHER_PASSWORD, 10);

const defaultDb: DatabaseStructure = {
  config: {
    id: 'class_main',
    appName: 'Trợ lý chủ nhiệm',
    schoolName: 'Trường THCS Đồng Khởi',
    className: '8A3',
    teacherName: 'Nguyễn Thị Thùy Trang',
    schoolYear: '2026-2027',
    adminPasswordHash: INITIAL_TEACHER_HASH,
    updatedAt: new Date().toISOString(),
    attentionThreshold: {
      absenceDays: 2,
      violationsCount: 2,
    },
    autoConductFromAttendance: {
      enabled: false,
      unexcusedAbsenceRuleId: 'rule_v4',
      lateRuleId: 'rule_v3',
    },
  },
  students: [], // No fake students!
  subjects: defaultSubjects,
  conductSettings: defaultConductSettings,
  attendance: [],
  scores: [],
  incidents: [],
  bulletin: [
    {
      id: 'post_welcome',
      title: 'Chào mừng năm học mới 2026-2027',
      content: 'Chào mừng quý phụ huynh và các em học sinh đến với trang thông tin của lớp. Chúc tập thể lớp chúng ta một năm học chăm ngoan, đoàn kết và đạt nhiều thành tích xuất sắc!',
      category: 'announcement',
      isPinned: true,
      isPublished: true,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ],
  seating: {
    id: 'seating_main',
    title: 'Sơ đồ lớp chính thức',
    isPublished: false,
    slots: generateDefaultSeatingSlots(),
    updatedAt: new Date().toISOString(),
  },
  honorBoards: {},
  scoreBackups: {},
};

// All requests reload cloud state. Responses wait for a durable, version-checked write.
let db: DatabaseStructure = structuredClone(defaultDb);
let dirty = false;
let revision = 0;
const scope = process.env.APP_DATA_SCOPE || '';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseClient = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
function saveDatabase() { dirty = true; }
const sessions = {
  get: (token: string) => db._sessions?.[token],
  set: (token: string, session: UserSession) => { (db._sessions ||= {})[token] = session; dirty = true; },
  delete: (token: string) => { if (db._sessions?.[token]) { delete db._sessions[token]; dirty = true; } },
  entries: () => Object.entries(db._sessions || {}),
};
const failedLoginAttempts = {
  get: (key: string) => db._attempts?.[key],
  set: (key: string, value: {count: number; lockedUntil: number}) => { (db._attempts ||= {})[key] = value; dirty = true; },
  delete: (key: string) => { if (db._attempts?.[key]) { delete db._attempts[key]; dirty = true; } },
};
let queue: Promise<void> = Promise.resolve();
app.use('/api', async (req, res, next) => {
  const previous = queue;
  let release!: () => void;
  queue = new Promise<void>(resolve => { release = resolve; });
  await previous;
  let released = false;
  const unlock = () => { if (!released) { released = true; release(); } };
  res.once('finish', unlock);
  res.once('close', unlock);
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!supabaseClient) throw new Error('Cần đặt SUPABASE_URL và SUPABASE_SECRET_KEY trên máy chủ.');
    if (!/^[a-zA-Z0-9_-]{8,120}$/.test(scope)) throw new Error('Cần đặt APP_DATA_SCOPE riêng cho lớp (8–120 ký tự).');
    const read = await supabaseClient.from('ngoc_yen_app_state').select('payload,revision').eq('scope', scope).maybeSingle();
    if (read.error) throw new Error('Chưa đọc được cơ sở dữ liệu. Kiểm tra khóa Supabase và chạy schema.sql.');
    let row = read.data;
    if (!row) {
      if ((process.env.INITIAL_TEACHER_PASSWORD || '').length < 12) throw new Error('Lớp mới cần INITIAL_TEACHER_PASSWORD dài ít nhất 12 ký tự.');
      const insert = await supabaseClient.from('ngoc_yen_app_state').upsert({scope, payload: defaultDb}, {onConflict:'scope', ignoreDuplicates:true});
      if (insert.error) throw new Error('Không thể khởi tạo lớp trên Supabase.');
      const reread = await supabaseClient.from('ngoc_yen_app_state').select('payload,revision').eq('scope', scope).single();
      if (reread.error) throw new Error('Không thể đọc dữ liệu lớp vừa khởi tạo.');
      row = reread.data;
    }
    db = row.payload as DatabaseStructure;
    revision = row.revision;
    dirty = false;
    // Clean expired credentials while holding the local request queue.
    for (const [token, session] of sessions.entries()) if (session.expiresAt < Date.now()) sessions.delete(token);
    const originalJson = res.json.bind(res);
    let sending = false;
    res.json = ((body: unknown) => {
      if (sending) return res;
      sending = true;
      void (async () => {
        if (dirty) {
          const saved = await supabaseClient.rpc('ngoc_yen_save_state', {p_scope:scope, p_revision:revision, p_payload:db});
          if (saved.error) throw new Error('Chưa lưu được dữ liệu lên Supabase. Vui lòng thử lại.');
          if (saved.data === false) {
            res.status(409);
            originalJson({error:'Dữ liệu vừa được thay đổi ở phiên khác. Hãy tải lại trang và thử lại.'});
            return;
          }
        }
        originalJson(body);
      })().catch(() => { res.status(503); originalJson({error:'Chưa lưu được dữ liệu lên Supabase. Vui lòng thử lại.'}); });
      return res;
    }) as typeof res.json;
    next();
  } catch (error) {
    res.status(503).json({error: (error as Error).message});
  }
});

function checkRateLimit(key: string): boolean {
  const attempt = failedLoginAttempts.get(key);
  if (!attempt) return true;
  if (attempt.lockedUntil > Date.now()) {
    return false; // locked
  }
  if (attempt.lockedUntil <= Date.now() && attempt.count >= 5) {
    failedLoginAttempts.delete(key);
    return true;
  }
  return true;
}

function recordFailedAttempt(key: string) {
  const cur = failedLoginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  cur.count += 1;
  if (cur.count >= 5) {
    cur.lockedUntil = Date.now() + 5 * 60 * 1000; // 5 min lockout
  }
  failedLoginAttempts.set(key, cur);
}

function clearFailedAttempt(key: string) {
  failedLoginAttempts.delete(key);
}

// Authentication Middleware
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-session-token'] as string);

  if (!token) {
    res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn' });
    return;
  }

  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now() || (session.role === 'student' && !db.students.some(s => s.id === session.studentId && s.status === 'active'))) {
    sessions.delete(token);
    res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
    return;
  }

  (req as any).user = session;
  next();
}

function teacherOnly(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as UserSession;
  if (!user || user.role !== 'teacher') {
    res.status(403).json({ error: 'Truy cập bị từ chối: Yêu cầu quyền Giáo viên chủ nhiệm' });
    return;
  }
  next();
}

// ----------------------------------------------------
// REST API ENDPOINTS
// ----------------------------------------------------

// 1. System & Connection Status
app.get('/api/status', (req: Request, res: Response) => {
  const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
  res.json({
    appVersion: 'ngoc-yen-pastel-2',
    appName: db.config.appName,
    schoolName: db.config.schoolName,
    className: db.config.className,
    teacherName: db.config.teacherName,
    schoolYear: db.config.schoolYear,
    totalStudents: db.students.filter(s => s.status === 'active').length,
    supabase: {
      isConfigured: isSupabaseConfigured,
      isConnected: true,
      supabaseUrl: isSupabaseConfigured ? supabaseUrl.replace(/^(https?:\/\/[^/]+).*$/, '$1') : undefined,
    },
    serverTime: new Date().toISOString(),
  });
});

// 2. Auth: Login
app.post('/api/auth/login', (req: Request, res: Response): void => {
  const { role, password, username } = req.body;
  const ipKey = crypto.createHash('sha256').update(String(req.headers['x-forwarded-for'] || req.ip || 'unknown')).digest('hex');

  if (!checkRateLimit(ipKey)) {
    const attempt = failedLoginAttempts.get(ipKey);
    const remainingSec = Math.ceil(((attempt?.lockedUntil || Date.now()) - Date.now()) / 1000);
    res.status(429).json({
      error: `Bạn đã thử sai quá 5 lần. Vui lòng thử lại sau ${remainingSec} giây để bảo vệ an toàn.`,
    });
    return;
  }

  if (role === 'teacher') {
    // Check teacher password
    const adminHash = db.config.adminPasswordHash || INITIAL_TEACHER_HASH;
    const isMatch = bcrypt.compareSync(password || '', adminHash);

    if (!isMatch) {
      recordFailedAttempt(ipKey);
      res.status(401).json({ error: 'Mật khẩu quản trị không chính xác' });
      return;
    }

    clearFailedAttempt(ipKey);
    const token = crypto.randomBytes(32).toString('hex');
    const session: UserSession = {
      token,
      role: 'teacher',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    sessions.set(token, session);

    res.json({
      token,
      role: 'teacher',
      appName: db.config.appName,
      className: db.config.className,
      teacherName: db.config.teacherName,
    });
    return;
  }

  if (role === 'student') {
    const cleanUsername = String(username || '').trim();
    const cleanPass = String(password || '').trim();

    if (!cleanUsername || !cleanPass) {
      res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
      return;
    }

    // Match student by username e.g. "0102102013"
    const student = db.students.find(s => s.username === cleanUsername && s.status === 'active');
    if (!student) {
      recordFailedAttempt(ipKey);
      res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
      return;
    }

    const isMatch = bcrypt.compareSync(cleanPass, student.passwordHash);
    if (!isMatch) {
      recordFailedAttempt(ipKey);
      res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
      return;
    }

    clearFailedAttempt(ipKey);
    const token = crypto.randomBytes(32).toString('hex');
    const session: UserSession = {
      token,
      role: 'student',
      studentId: student.id,
      studentName: student.fullName,
      studentCode: student.code,
      mustChangePassword: student.mustChangePassword,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    sessions.set(token, session);

    res.json({
      token,
      role: 'student',
      studentId: student.id,
      studentName: student.fullName,
      studentCode: student.code,
      mustChangePassword: student.mustChangePassword,
    });
    return;
  }

  res.status(400).json({ error: 'Vai trò đăng nhập không hợp lệ' });
});

// 3. Auth: Change Password
app.post('/api/auth/change-password', authMiddleware, (req: Request, res: Response): void => {
  const user = (req as any).user as UserSession;
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'Xác nhận mật khẩu mới không khớp' });
    return;
  }

  if (user.role === 'teacher') {
    const adminHash = db.config.adminPasswordHash || INITIAL_TEACHER_HASH;
    if (!bcrypt.compareSync(currentPassword || '', adminHash)) {
      res.status(401).json({ error: 'Mật khẩu hiện tại không chính xác' });
      return;
    }

    db.config.adminPasswordHash = bcrypt.hashSync(newPassword, 10);
    db.config.updatedAt = new Date().toISOString();
    saveDatabase();

    // Invalidate existing sessions except this one
    for (const [t, s] of sessions.entries()) {
      if (s.role === 'teacher' && t !== user.token) {
        sessions.delete(t);
      }
    }

    res.json({ success: true, message: 'Đổi mật khẩu giáo viên thành công' });
    return;
  }

  if (user.role === 'student' && user.studentId) {
    const student = db.students.find(s => s.id === user.studentId);
    if (!student) {
      res.status(404).json({ error: 'Không tìm thấy hồ sơ học sinh' });
      return;
    }

    if (!bcrypt.compareSync(currentPassword || '', student.passwordHash)) {
      res.status(401).json({ error: 'Mật khẩu hiện tại không chính xác' });
      return;
    }

    student.passwordHash = bcrypt.hashSync(newPassword, 10);
    student.mustChangePassword = false;
    student.updatedAt = new Date().toISOString();
    user.mustChangePassword = false;
    for (const [t, session] of sessions.entries()) {
      if (session.studentId === student.id && t !== user.token) sessions.delete(t);
    }
    saveDatabase();

    res.json({ success: true, message: 'Đổi mật khẩu học sinh thành công' });
    return;
  }

  res.status(400).json({ error: 'Yêu cầu không hợp lệ' });
});

// 4. Auth: Reset Student Password (Teacher only)
app.post('/api/auth/reset-student-password', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { studentId, customPassword } = req.body;
  const student = db.students.find(s => s.id === studentId);
  if (!student) {
    res.status(404).json({ error: 'Không tìm thấy học sinh' });
    return;
  }

  // If custom password provided, use it; otherwise reset to initial birthday ddmmyyyy
  let newPlain = customPassword;
  if (!newPlain) {
    const bParts = student.birthDate.split('-');
    newPlain = bParts.length === 3 ? `${bParts[2]}${bParts[1]}${bParts[0]}` : '123456';
  }

  student.passwordHash = bcrypt.hashSync(newPlain, 10);
  student.mustChangePassword = true;
  for (const [token, session] of sessions.entries()) {
    if (session.studentId === student.id) sessions.delete(token);
  }
  student.updatedAt = new Date().toISOString();
  saveDatabase();

  res.json({
    success: true,
    message: `Đã đặt lại mật khẩu cho học sinh ${student.fullName}. Mật khẩu mới: ${newPlain}`,
    newPassword: newPlain,
  });
});

// 5. Class Settings
app.get('/api/config', (req: Request, res: Response) => {
  // Do NOT return password hash!
  const { adminPasswordHash, ...safeConfig } = db.config;
  res.json(safeConfig);
});

app.post('/api/config', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { appName, schoolName, className, teacherName, schoolYear, logoUrl, attentionThreshold, autoConductFromAttendance } = req.body;

  if (appName) db.config.appName = String(appName).trim();
  if (schoolName !== undefined) db.config.schoolName = String(schoolName).trim();
  if (className) db.config.className = String(className).trim();
  if (teacherName) db.config.teacherName = String(teacherName).trim();
  if (schoolYear) db.config.schoolYear = String(schoolYear).trim();
  if (logoUrl !== undefined) db.config.logoUrl = logoUrl;
  if (attentionThreshold) {
    db.config.attentionThreshold = {
      absenceDays: Number(attentionThreshold.absenceDays) || 2,
      violationsCount: Number(attentionThreshold.violationsCount) || 2,
    };
  }
  if (autoConductFromAttendance) {
    db.config.autoConductFromAttendance = {
      enabled: Boolean(autoConductFromAttendance.enabled),
      unexcusedAbsenceRuleId: autoConductFromAttendance.unexcusedAbsenceRuleId,
      lateRuleId: autoConductFromAttendance.lateRuleId,
    };
  }
  db.config.updatedAt = new Date().toISOString();
  saveDatabase();

  const { adminPasswordHash, ...safeConfig } = db.config;
  res.json({ success: true, config: safeConfig });
});

// Helper function to build student credentials
function createStudentCredentials(code: string, birthDate: string) {
  const cleanCode = code.padStart(2, '0');
  const bParts = birthDate.split('-');
  const ddmmyyyy = bParts.length === 3 ? `${bParts[2]}${bParts[1]}${bParts[0]}` : '01012013';
  const username = `${cleanCode}${ddmmyyyy}`;
  const initialPassword = ddmmyyyy;
  const passwordHash = bcrypt.hashSync(initialPassword, 10);
  return { username, initialPassword, passwordHash };
}

// 6. Student Management
app.get('/api/students', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as UserSession;

  if (user.role === 'student') {
    // If student, return only minimal list (id, code, fullName) for seating/honor viewing
    const minimalList = db.students
      .filter(s => s.status === 'active')
      .map(s => ({
        id: s.id,
        code: s.code,
        fullName: s.fullName,
        gender: s.gender,
      }));
    res.json(minimalList);
    return;
  }

  // Teacher gets all active students with full info (excluding password hashes)
  const safeList = db.students.map(s => {
    const { passwordHash, ...safe } = s;
    return safe;
  });
  res.json(safeList);
});

// Single student profile
app.get('/api/students/:id', authMiddleware, (req: Request, res: Response): void => {
  const user = (req as any).user as UserSession;
  const { id } = req.params;

  // STRICT RBAC: Students can ONLY view their own profile!
  if (user.role === 'student' && user.studentId !== id) {
    res.status(403).json({ error: 'Bạn không có quyền truy cập hồ sơ của học sinh khác' });
    return;
  }

  const student = db.students.find(s => s.id === id);
  if (!student) {
    res.status(404).json({ error: 'Không tìm thấy học sinh' });
    return;
  }

  const { passwordHash, ...safeStudent } = student;
  // If student is viewing, omit teacher private notes!
  if (user.role === 'student') {
    delete (safeStudent as any).notes;
  }

  res.json(safeStudent);
});

// Add student (Teacher only)
app.post('/api/students', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { code, fullName, gender, birthDate, parentPhone, parentName, address, notes, avatarUrl } = req.body;

  if (!code || !fullName || !gender || !birthDate) {
    res.status(400).json({ error: 'Vui lòng nhập đầy đủ mã số, họ tên, giới tính và ngày sinh' });
    return;
  }

  const cleanCode = String(code).trim().padStart(2, '0');
  // Check code uniqueness
  const existingWithCode = db.students.find(s => s.code === cleanCode && s.status === 'active');
  if (existingWithCode) {
    res.status(400).json({ error: `Mã số "${cleanCode}" đã có học sinh "${existingWithCode.fullName}" sử dụng` });
    return;
  }

  const { username, passwordHash } = createStudentCredentials(cleanCode, birthDate);

  const newStudent: Student = {
    id: `stu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    code: cleanCode,
    fullName: String(fullName).trim(),
    gender: gender === 'Nữ' ? 'Nữ' : 'Nam',
    birthDate: String(birthDate).trim(),
    parentPhone: parentPhone ? String(parentPhone).trim() : '',
    parentName: parentName ? String(parentName).trim() : '',
    address: address ? String(address).trim() : '',
    notes: notes ? String(notes).trim() : '',
    avatarUrl: avatarUrl || '',
    status: 'active',
    username,
    passwordHash,
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.students.push(newStudent);
  saveDatabase();

  const { passwordHash: _, ...safe } = newStudent;
  res.json({ success: true, student: safe });
});

// Edit student (Teacher only)
app.put('/api/students/:id', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { id } = req.params;
  const { code, fullName, gender, birthDate, parentPhone, parentName, address, notes, avatarUrl, status } = req.body;

  const student = db.students.find(s => s.id === id);
  if (!student) {
    res.status(404).json({ error: 'Không tìm thấy học sinh' });
    return;
  }

  if (code) {
    const cleanCode = String(code).trim().padStart(2, '0');
    // Check collision with other student
    const conflict = db.students.find(s => s.code === cleanCode && s.id !== id && s.status === 'active');
    if (conflict) {
      res.status(400).json({ error: `Mã số "${cleanCode}" đã trùng với học sinh "${conflict.fullName}"` });
      return;
    }
    student.code = cleanCode;
  }

  if (fullName) student.fullName = String(fullName).trim();
  if (gender) student.gender = gender === 'Nữ' ? 'Nữ' : 'Nam';
  if (birthDate) student.birthDate = String(birthDate).trim();
  if (parentPhone !== undefined) student.parentPhone = String(parentPhone).trim();
  if (parentName !== undefined) student.parentName = String(parentName).trim();
  if (address !== undefined) student.address = String(address).trim();
  if (notes !== undefined) student.notes = String(notes).trim();
  if (avatarUrl !== undefined) student.avatarUrl = avatarUrl;
  if (status) student.status = status;

  student.updatedAt = new Date().toISOString();
  saveDatabase();

  const { passwordHash, ...safe } = student;
  res.json({ success: true, student: safe });
});

// Delete or archive student (Teacher only)
app.delete('/api/students/:id', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { id } = req.params;
  const { permanent } = req.query;

  const index = db.students.findIndex(s => s.id === id);
  if (index === -1) {
    res.status(404).json({ error: 'Không tìm thấy học sinh' });
    return;
  }

  const student = db.students[index];

  if (permanent === 'true') {
    // Delete student and clean up seating
    db.students.splice(index, 1);
    db.seating.slots.forEach(slot => {
      if (slot.studentId === id) slot.studentId = null;
    });
  } else {
    // Soft archive
    student.status = 'archived';
    student.updatedAt = new Date().toISOString();
  }

  saveDatabase();
  res.json({ success: true, message: `Đã ${permanent === 'true' ? 'xóa hoàn toàn' : 'chuyển vào lưu trữ'} học sinh ${student.fullName}` });
});

// Batch import students (Append or Replace)
app.post('/api/students/batch-import', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { mode, students: incomingList } = req.body; // mode: 'append_or_update' | 'replace_all'

  if (!Array.isArray(incomingList) || incomingList.length === 0) {
    res.status(400).json({ error: 'Danh sách học sinh không hợp lệ hoặc rỗng' });
    return;
  }

  if (mode === 'replace_all') {
    // Backup current data before replace
    const backupKey = `replace_${Date.now()}`;
    db.scoreBackups[backupKey] = {
      backupTime: new Date().toISOString(),
      month: 'full_student_backup',
      data: [...db.scores],
    };
    db.students = [];
    // clear seating
    db.seating.slots.forEach(slot => (slot.studentId = null));
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const item of incomingList) {
    const code = String(item.code || '').trim().padStart(2, '0');
    const existing = db.students.find(s => s.code === code && s.status === 'active');

    if (existing) {
      // Update non-empty fields without overwriting with blanks
      if (item.fullName) existing.fullName = String(item.fullName).trim();
      if (item.gender) existing.gender = item.gender === 'Nữ' ? 'Nữ' : 'Nam';
      if (item.birthDate) existing.birthDate = item.birthDate;
      if (item.parentPhone) existing.parentPhone = String(item.parentPhone).trim();
      if (item.parentName) existing.parentName = String(item.parentName).trim();
      if (item.address) existing.address = String(item.address).trim();
      if (item.notes) existing.notes = String(item.notes).trim();
      existing.updatedAt = new Date().toISOString();
      updatedCount++;
    } else {
      const birthDate = item.birthDate || '2013-01-01';
      const { username, passwordHash } = createStudentCredentials(code, birthDate);
      const newStu: Student = {
        id: `stu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        code,
        fullName: String(item.fullName).trim(),
        gender: item.gender === 'Nữ' ? 'Nữ' : 'Nam',
        birthDate,
        parentPhone: item.parentPhone ? String(item.parentPhone).trim() : '',
        parentName: item.parentName ? String(item.parentName).trim() : '',
        address: item.address ? String(item.address).trim() : '',
        notes: item.notes ? String(item.notes).trim() : '',
        status: 'active',
        username,
        passwordHash,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.students.push(newStu);
      addedCount++;
    }
  }

  // Sort students by code
  db.students.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  saveDatabase();

  res.json({
    success: true,
    addedCount,
    updatedCount,
    totalCount: db.students.length,
    message: `Đã nhập thành công: ${addedCount} học sinh mới, cập nhật ${updatedCount} học sinh`,
  });
});

// Safe Class Reset (Teacher only)
app.post('/api/students/clean-class', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { confirmationCode } = req.body;

  if (confirmationCode !== 'XAC_NHAN_LAM_SACH_LOP') {
    res.status(400).json({ error: 'Mã xác nhận không đúng. Nhập chính xác "XAC_NHAN_LAM_SACH_LOP" để thực hiện.' });
    return;
  }

  // Auto-backup to file
  db._snapshots = { beforeReset: JSON.parse(JSON.stringify({...db, _snapshots: undefined})) };

  db.students = [];
  db.attendance = [];
  db.scores = [];
  db.incidents = [];
  db.honorBoards = {};
  db.seating.slots.forEach(s => (s.studentId = null));
  saveDatabase();

  res.json({
    success: true,
    message: 'Đã làm sạch dữ liệu học sinh thành công. Bản sao lưu tự động đã được lưu lại an toàn.',
  });
});

// 7. Attendance
app.get('/api/attendance', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as UserSession;
  const { date, month, studentId } = req.query;

  let records = db.attendance;

  if (date) {
    records = records.filter(r => r.date === date);
  } else if (month) {
    records = records.filter(r => r.date.startsWith(String(month)));
  }

  if (user.role === 'student') {
    // Only return own records
    records = records.filter(r => r.studentId === user.studentId);
  } else if (studentId) {
    records = records.filter(r => r.studentId === studentId);
  }

  res.json(records);
});

app.post('/api/attendance', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { date, records } = req.body;

  if (!date || !Array.isArray(records)) {
    res.status(400).json({ error: 'Dữ liệu điểm danh không hợp lệ' });
    return;
  }

  // Remove existing records for this date
  db.attendance = db.attendance.filter(r => r.date !== date);

  const newRecords: AttendanceRecord[] = [];
  const autoConduct = db.config.autoConductFromAttendance;

  for (const item of records) {
    const record: AttendanceRecord = {
      id: `att_${date}_${item.studentId}`,
      date,
      studentId: item.studentId,
      status: item.status,
      note: item.note || '',
      updatedAt: new Date().toISOString(),
    };
    newRecords.push(record);

    // Auto log conduct deduction if configured and enabled
    if (autoConduct?.enabled) {
      const student = db.students.find(s => s.id === item.studentId);
      if (student) {
        // Unexcused absence
        if (item.status === 'unexcused' && autoConduct.unexcusedAbsenceRuleId) {
          const rule = db.conductSettings.rules.find(r => r.id === autoConduct.unexcusedAbsenceRuleId);
          if (rule) {
            // Check if incident already exists for this date and student
            const existingInc = db.incidents.find(inc => inc.studentId === item.studentId && inc.date === date && inc.ruleId === rule.id);
            if (!existingInc) {
              db.incidents.push({
                id: `inc_auto_att_${date}_${item.studentId}`,
                studentId: item.studentId,
                date,
                ruleId: rule.id,
                ruleName: rule.name,
                category: 'violation',
                points: rule.points,
                content: `Tự động ghi nhận từ điểm danh: Nghỉ học không phép ngày ${date}`,
                note: 'Tự động tạo từ hệ thống',
                recordedBy: db.config.teacherName,
                createdAt: new Date().toISOString(),
              });
            }
          }
        } else if (item.status === 'late' && autoConduct.lateRuleId) {
          const rule = db.conductSettings.rules.find(r => r.id === autoConduct.lateRuleId);
          if (rule) {
            const existingInc = db.incidents.find(inc => inc.studentId === item.studentId && inc.date === date && inc.ruleId === rule.id);
            if (!existingInc) {
              db.incidents.push({
                id: `inc_auto_att_late_${date}_${item.studentId}`,
                studentId: item.studentId,
                date,
                ruleId: rule.id,
                ruleName: rule.name,
                category: 'violation',
                points: rule.points,
                content: `Tự động ghi nhận từ điểm danh: Đi học muộn ngày ${date}`,
                note: 'Tự động tạo từ hệ thống',
                recordedBy: db.config.teacherName,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    }
  }

  db.attendance.push(...newRecords);
  saveDatabase();

  res.json({ success: true, count: newRecords.length, message: `Đã lưu điểm danh ngày ${date} thành công` });
});

// 8. Academic Scores & Subjects
app.get('/api/subjects', (req: Request, res: Response) => {
  res.json(db.subjects);
});

app.post('/api/subjects', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { subjects } = req.body;
  if (!Array.isArray(subjects)) {
    res.status(400).json({ error: 'Danh sách môn học không hợp lệ' });
    return;
  }
  db.subjects = subjects;
  saveDatabase();
  res.json({ success: true, subjects: db.subjects });
});

// Monthly scores
app.get('/api/scores', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as UserSession;
  const { month, studentId } = req.query;

  let records = db.scores;

  if (month) {
    records = records.filter(r => r.yearMonth === String(month));
  }

  if (user.role === 'student') {
    // Only return own scores!
    records = records.filter(r => r.studentId === user.studentId);
  } else if (studentId) {
    records = records.filter(r => r.studentId === String(studentId));
  }

  res.json(records);
});

// Save scores for a month
app.post('/api/scores', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { month, records } = req.body;

  if (!month || !Array.isArray(records)) {
    res.status(400).json({ error: 'Dữ liệu bảng điểm không hợp lệ' });
    return;
  }

  const scoredSubjectIds = new Set(
    db.subjects.filter(s => s.type === 'score').map(s => s.id)
  );

  for (const item of records) {
    const existingIndex = db.scores.findIndex(r => r.yearMonth === month && r.studentId === item.studentId);

    // Calculate monthly GPA from scored subjects
    let totalScore = 0;
    let scoredCount = 0;
    const scores = item.scores || {};

    for (const [subId, scoreObj] of Object.entries(scores) as [string, any][]) {
      if (scoredSubjectIds.has(subId) && scoreObj && typeof scoreObj.score === 'number' && !isNaN(scoreObj.score)) {
        totalScore += scoreObj.score;
        scoredCount += 1;
      }
    }

    const gpa = scoredCount > 0 ? totalScore / scoredCount : null;

    const record: MonthlyScoreRecord = {
      id: existingIndex !== -1 ? db.scores[existingIndex].id : `score_${month}_${item.studentId}`,
      yearMonth: month,
      studentId: item.studentId,
      scores,
      gpa,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      db.scores[existingIndex] = record;
    } else {
      db.scores.push(record);
    }
  }

  // If honor board was already published for this month, flag it as requiring republish
  if (db.honorBoards[month]?.isPublished) {
    db.honorBoards[month].requiresRepublish = true;
  }

  saveDatabase();
  res.json({ success: true, message: `Đã lưu bảng điểm tháng ${month} thành công` });
});

// Delete month scores with automatic backup
app.delete('/api/scores', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { month } = req.query;
  if (!month) {
    res.status(400).json({ error: 'Thiếu thông tin tháng cần xóa' });
    return;
  }

  const monthStr = String(month);
  const targetScores = db.scores.filter(r => r.yearMonth === monthStr);

  if (targetScores.length === 0) {
    res.status(404).json({ error: `Không có dữ liệu điểm tháng ${monthStr} để xóa` });
    return;
  }

  // Save backup
  const backupId = `backup_${monthStr}_${Date.now()}`;
  db.scoreBackups[backupId] = {
    backupTime: new Date().toISOString(),
    month: monthStr,
    data: [...targetScores],
  };

  // Remove scores for this month
  db.scores = db.scores.filter(r => r.yearMonth !== monthStr);

  // Remove or unpublish honor board for this month
  if (db.honorBoards[monthStr]) {
    delete db.honorBoards[monthStr];
  }

  saveDatabase();
  res.json({
    success: true,
    backupId,
    affectedCount: targetScores.length,
    message: `Đã xóa bảng điểm tháng ${monthStr} (${targetScores.length} bản ghi). Bản sao lưu ${backupId} đã được lưu lại để khôi phục khi cần.`,
  });
});

// Restore scores from backup
app.post('/api/scores/restore', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { backupId } = req.body;
  const backup = db.scoreBackups[backupId];

  if (!backup) {
    res.status(404).json({ error: 'Không tìm thấy bản sao lưu điểm' });
    return;
  }

  // Remove existing scores for that month first
  db.scores = db.scores.filter(r => r.yearMonth !== backup.month);
  db.scores.push(...backup.data);
  saveDatabase();

  res.json({
    success: true,
    restoredCount: backup.data.length,
    message: `Khôi phục thành công ${backup.data.length} bản ghi điểm tháng ${backup.month}`,
  });
});

// List score backups
app.get('/api/scores/backups', authMiddleware, teacherOnly, (req: Request, res: Response) => {
  const list = Object.entries(db.scoreBackups).map(([id, b]) => ({
    id,
    month: b.month,
    backupTime: b.backupTime,
    count: b.data.length,
  }));
  res.json(list);
});

// 9. Conduct Rules & Incidents
app.get('/api/conduct/rules', (req: Request, res: Response) => {
  res.json(db.conductSettings);
});

app.post('/api/conduct/rules', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { initialScore, thresholdGood, thresholdFair, thresholdPass, rules } = req.body;

  if (initialScore !== undefined) db.conductSettings.initialScore = Number(initialScore);
  if (thresholdGood !== undefined) db.conductSettings.thresholdGood = Number(thresholdGood);
  if (thresholdFair !== undefined) db.conductSettings.thresholdFair = Number(thresholdFair);
  if (thresholdPass !== undefined) db.conductSettings.thresholdPass = Number(thresholdPass);
  if (Array.isArray(rules)) db.conductSettings.rules = rules;

  saveDatabase();
  res.json({ success: true, conductSettings: db.conductSettings });
});

// Incident records
app.get('/api/conduct/incidents', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as UserSession;
  const { studentId, month } = req.query;

  let records = db.incidents;

  if (user.role === 'student') {
    // ONLY student's own incidents
    records = records.filter(r => r.studentId === user.studentId);
  } else if (studentId) {
    records = records.filter(r => r.studentId === String(studentId));
  }

  if (month) {
    records = records.filter(r => r.date.startsWith(String(month)));
  }

  res.json(records);
});

app.post('/api/conduct/incidents', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { studentId, date, ruleId, ruleName, category, points, content, note } = req.body;

  if (!studentId || !date || !ruleName || !content || points === undefined) {
    res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin sự việc' });
    return;
  }

  const newIncident: ConductIncident = {
    id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    studentId,
    date,
    ruleId: ruleId || undefined,
    ruleName,
    category: category === 'reward' ? 'reward' : 'violation',
    points: Math.abs(Number(points)),
    content,
    note: note || '',
    recordedBy: db.config.teacherName,
    createdAt: new Date().toISOString(),
  };

  db.incidents.push(newIncident);
  saveDatabase();

  res.json({ success: true, incident: newIncident });
});

app.put('/api/conduct/incidents/:id', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { id } = req.params;
  const incident = db.incidents.find(inc => inc.id === id);
  if (!incident) {
    res.status(404).json({ error: 'Không tìm thấy sự việc' });
    return;
  }

  const { date, ruleId, ruleName, category, points, content, note } = req.body;
  if (date) incident.date = date;
  if (ruleId !== undefined) incident.ruleId = ruleId;
  if (ruleName) incident.ruleName = ruleName;
  if (category) incident.category = category;
  if (points !== undefined) incident.points = Math.abs(Number(points));
  if (content) incident.content = content;
  if (note !== undefined) incident.note = note;

  saveDatabase();
  res.json({ success: true, incident });
});

app.delete('/api/conduct/incidents/:id', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { id } = req.params;
  const idx = db.incidents.findIndex(inc => inc.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Không tìm thấy sự việc' });
    return;
  }

  db.incidents.splice(idx, 1);
  saveDatabase();
  res.json({ success: true, message: 'Đã xóa ghi nhận sự việc' });
});

// 10. Bulletin Board
app.get('/api/bulletin', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as UserSession;

  if (user.role === 'student') {
    // Only published posts for students!
    const published = db.bulletin.filter(p => p.isPublished);
    res.json(published);
    return;
  }

  // Teacher sees all
  res.json(db.bulletin);
});

app.post('/api/bulletin', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { id, title, content, category, mediaUrl, mediaType, embedUrl, isPinned, isPublished } = req.body;

  if (!title || !content) {
    res.status(400).json({ error: 'Tiêu đề và nội dung không được để trống' });
    return;
  }

  if (id) {
    // Update
    const post = db.bulletin.find(p => p.id === id);
    if (!post) {
      res.status(404).json({ error: 'Không tìm thấy bài viết' });
      return;
    }
    post.title = title;
    post.content = content;
    post.category = category || 'announcement';
    post.mediaUrl = mediaUrl || '';
    post.mediaType = mediaType || 'image';
    post.embedUrl = embedUrl || '';
    post.isPinned = Boolean(isPinned);
    if (isPublished && !post.isPublished) {
      post.publishedAt = new Date().toISOString();
    }
    post.isPublished = Boolean(isPublished);
    saveDatabase();
    res.json({ success: true, post });
    return;
  }

  // Create new
  const newPost: BulletinPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    content,
    category: category || 'announcement',
    mediaUrl: mediaUrl || '',
    mediaType: mediaType || 'image',
    embedUrl: embedUrl || '',
    isPinned: Boolean(isPinned),
    isPublished: Boolean(isPublished),
    publishedAt: isPublished ? new Date().toISOString() : '',
    createdAt: new Date().toISOString(),
  };

  db.bulletin.unshift(newPost);
  saveDatabase();
  res.json({ success: true, post: newPost });
});

app.delete('/api/bulletin/:id', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { id } = req.params;
  const idx = db.bulletin.findIndex(p => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Không tìm thấy bài viết' });
    return;
  }
  db.bulletin.splice(idx, 1);
  saveDatabase();
  res.json({ success: true, message: 'Đã xóa bài viết' });
});

// 11. Seating Plan (56 slots)
app.get('/api/seating', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as UserSession;

  if (user.role === 'student' && !db.seating.isPublished) {
    res.json({
      ...db.seating,
      slots: [],
      message: 'Sơ đồ lớp chưa được công bố',
    });
    return;
  }

  res.json(db.seating);
});

app.post('/api/seating', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { title, isPublished, slots } = req.body;

  if (title) db.seating.title = title;
  if (isPublished !== undefined) db.seating.isPublished = Boolean(isPublished);
  if (Array.isArray(slots)) {
    // Validate that no student is assigned to multiple slots
    const seen = new Set<string>();
    for (const slot of slots) {
      if (slot.studentId) {
        if (seen.has(slot.studentId)) {
          const student = db.students.find(s => s.id === slot.studentId);
          res.status(400).json({
            error: `Học sinh "${student?.fullName || slot.studentId}" không thể ngồi ở nhiều chỗ cùng lúc.`,
          });
          return;
        }
        seen.add(slot.studentId);
      }
    }
    db.seating.slots = slots;
  }

  db.seating.updatedAt = new Date().toISOString();
  saveDatabase();

  res.json({ success: true, seating: db.seating });
});

// 12. Honor Board & Top 5 Academic
app.get('/api/honor/:month', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user as UserSession;
  const { month } = req.params;

  const board = db.honorBoards[month];
  if (!board) {
    res.json({ yearMonth: month, isPublished: false, topAcademic: [], customRewards: [] });
    return;
  }

  if (user.role === 'student' && !board.isPublished) {
    res.json({ yearMonth: month, isPublished: false, topAcademic: [], customRewards: [] });
    return;
  }

  res.json(board);
});

app.post('/api/honor/publish', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { month, isPublished, customRewards } = req.body;

  if (!month) {
    res.status(400).json({ error: 'Thiếu tháng công bố' });
    return;
  }

  // Calculate Top 5 from actual scores of that month!
  const monthScores = db.scores.filter(r => r.yearMonth === month && r.gpa !== null && r.gpa !== undefined);
  // Sort descending by unrounded GPA
  monthScores.sort((a, b) => (b.gpa || 0) - (a.gpa || 0));

  const topStudents = monthScores.slice(0, 5).map((r, idx) => {
    const student = db.students.find(s => s.id === r.studentId);
    return {
      studentId: r.studentId,
      studentName: student?.fullName || 'Học sinh',
      studentCode: student?.code || '',
      gpa: Math.round((r.gpa || 0) * 100) / 100,
      rank: idx + 1,
    };
  });

  const board: HonorBoard = {
    yearMonth: month,
    isPublished: Boolean(isPublished),
    publishedAt: new Date().toISOString(),
    topAcademic: topStudents,
    customRewards: customRewards || [],
    requiresRepublish: false,
  };

  db.honorBoards[month] = board;
  saveDatabase();

  res.json({ success: true, board });
});

// 13. Backup & Restore (Full JSON)
app.get('/api/backup', authMiddleware, teacherOnly, (req: Request, res: Response) => {
  const backup: DatabaseBackup = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    config: db.config,
    students: db.students,
    subjects: db.subjects,
    conductSettings: db.conductSettings,
    attendance: db.attendance,
    scores: db.scores,
    incidents: db.incidents,
    bulletin: db.bulletin,
    seating: db.seating,
    honorBoards: db.honorBoards,
  };

  res.setHeader('Content-Disposition', `attachment; filename="Sao_Luu_Lop_${db.config.className}_${Date.now()}.json"`);
  res.json(backup);
});

app.post('/api/restore', authMiddleware, teacherOnly, (req: Request, res: Response): void => {
  const { backupData } = req.body;

  if (!backupData || !backupData.config) {
    res.status(400).json({ error: 'Dữ liệu sao lưu không hợp lệ' });
    return;
  }

  // Save emergency snapshot before overwrite
  const emergencySnapshot = JSON.parse(JSON.stringify({...db, _snapshots: undefined}));

  db = {
    ...defaultDb,
    ...backupData,
    _sessions: {},
    _attempts: {},
    _snapshots: { beforeRestore: emergencySnapshot },
    config: {
      ...defaultDb.config,
      ...backupData.config,
      // Retain existing password hash if backup has none
      adminPasswordHash: backupData.config?.adminPasswordHash || db.config.adminPasswordHash,
    },
    seating: {
      ...defaultDb.seating,
      ...(backupData.seating || {}),
      slots: backupData.seating?.slots || generateDefaultSeatingSlots(),
    },
  };

  saveDatabase();
  res.json({
    success: true,
    message: `Khôi phục thành công lớp ${db.config.className} (${db.students.length} học sinh).`,
  });
});

// 14. Supabase Sync / Ping
app.get('/api/supabase/test', async (req: Request, res: Response): Promise<void> => {
  if (!supabaseClient) {
    res.json({
      configured: false,
      connected: false,
      message: 'Chưa cấu hình Supabase. Vui lòng thiết lập biến môi trường SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.',
    });
    return;
  }

  try {
    // Verify access to the actual private app storage.
    const { data, error } = await supabaseClient.from('ngoc_yen_app_state').select('scope').eq('scope', scope).limit(1);
    if (error && error.code !== 'PGRST116') {
      res.json({
        configured: true,
        connected: false,
        error: error.message,
        message: 'Không thể kết nối bảng ngoc_yen_app_state trên Supabase. Bạn đã chạy tập lệnh schema.sql chưa?',
      });
      return;
    }

    res.json({
      configured: true,
      connected: true,
      message: 'Kết nối Supabase thành công và sẵn sàng đồng bộ!',
    });
  } catch (err: any) {
    res.json({
      configured: true,
      connected: false,
      error: err.message,
      message: 'Lỗi kiểm tra kết nối Supabase',
    });
  }
});

app.all(/^\/api(\/.*)?$/, (req, res) => res.status(404).json({error: 'API không tồn tại'}));
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  res.status(error.status === 413 ? 413 : 500).json({error: error.status === 413 ? 'Nội dung quá lớn.' : 'Máy chủ không xử lý được yêu cầu.'});
});
export default app;
