export type UserRole = 'teacher' | 'student';

export interface UserSession {
  token: string;
  role: UserRole;
  studentId?: string;
  studentName?: string;
  studentCode?: string;
  expiresAt: number;
  mustChangePassword?: boolean;
}

export interface ClassConfig {
  id: string; // Stable class ID, e.g. "class_main"
  appName: string; // e.g. "Trợ lý chủ nhiệm"
  schoolName: string; // e.g. "Trường THCS Đồng Khởi"
  className: string; // e.g. "8A3"
  teacherName: string; // e.g. "Nguyễn Thị Thùy Trang"
  schoolYear: string; // e.g. "2026-2027"
  logoUrl?: string;
  adminPasswordHash?: string;
  updatedAt: string;
  // Threshold for "Students needing attention"
  attentionThreshold: {
    absenceDays: number; // e.g. 2 days
    violationsCount: number; // e.g. 2 violations
  };
  // Automatic conduct deduction from attendance
  autoConductFromAttendance: {
    enabled: boolean;
    unexcusedAbsenceRuleId?: string;
    lateRuleId?: string;
  };
}

export interface Student {
  id: string; // Stable UUID
  code: string; // e.g. "01" (student roll number/mã số)
  fullName: string; // e.g. "Huỳnh Ngọc Trâm Anh"
  gender: 'Nam' | 'Nữ';
  birthDate: string; // "YYYY-MM-DD"
  parentPhone?: string;
  parentName?: string;
  address?: string;
  avatarUrl?: string;
  status: 'active' | 'archived';
  // Credentials
  username: string; // e.g. "0102102013"
  passwordHash: string;
  mustChangePassword?: boolean;
  notes?: string; // Private teacher notes (strictly restricted)
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'excused' | 'unexcused' | 'late' | 'not_marked';

export interface AttendanceRecord {
  id: string;
  date: string; // "YYYY-MM-DD"
  studentId: string;
  status: AttendanceStatus;
  note?: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string; // e.g. "Toán", "Ngữ văn", "Tiếng Anh"
  code: string; // e.g. "MATH", "LIT", "ENG"
  type: 'score' | 'comment'; // 'score': numeric 0.0 - 10.0; 'comment': Pass/Fail evaluation
  order: number;
}

export interface SubjectScore {
  score?: number | null; // 0.0 - 10.0, null if not marked
  comment?: string; // e.g. "Đ" (Đạt) / "CĐ" (Chưa đạt) or notes
}

export interface MonthlyScoreRecord {
  id: string;
  yearMonth: string; // e.g. "2026-10"
  studentId: string;
  scores: Record<string, SubjectScore>; // subjectId -> SubjectScore
  gpa?: number | null; // calculated monthly GPA from scored subjects
  updatedAt: string;
}

export interface ConductRule {
  id: string;
  code: string;
  name: string; // e.g. "Nói chuyện riêng", "Không làm bài tập", "Phát biểu tích cực"
  category: 'violation' | 'reward';
  points: number; // positive number (subtracted if violation, added if reward)
  isActive: boolean;
}

export interface ConductSettings {
  initialScore: number; // e.g. 200 or 100
  thresholdGood: number; // A: e.g. 190 (>= A is Tốt)
  thresholdFair: number; // B: e.g. 160 (B <= score < A is Khá)
  thresholdPass: number; // C: e.g. 130 (C <= score < B is Đạt, < C is Chưa đạt)
  rules: ConductRule[];
}

export interface ConductIncident {
  id: string;
  studentId: string;
  date: string; // "YYYY-MM-DD"
  ruleId?: string;
  ruleName: string;
  category: 'violation' | 'reward';
  points: number; // Points applied at time of recording
  content: string; // Detailed description
  note?: string;
  recordedBy: string; // Teacher name
  createdAt: string;
}

export interface BulletinPost {
  id: string;
  title: string;
  content: string;
  category: 'announcement' | 'competition' | 'reminder';
  mediaUrl?: string; // Image or video data URL or hosted URL
  mediaType?: 'image' | 'video';
  embedUrl?: string; // YouTube or Google Drive share link
  isPinned: boolean;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
}

export interface SeatingSlot {
  column: number; // 1 to 4 (4 dãy)
  desk: number;   // 1 to 7 (7 bàn)
  position: 1 | 2; // 1 (trái) or 2 (phải)
  studentId?: string | null;
}

export interface SeatingPlan {
  id: string;
  title: string;
  isPublished: boolean;
  slots: SeatingSlot[]; // 4 x 7 x 2 = 56 slots
  updatedAt: string;
}

export interface HonorBoard {
  yearMonth: string; // e.g. "2026-10"
  isPublished: boolean;
  publishedAt?: string;
  topAcademic: {
    studentId: string;
    studentName: string;
    studentCode: string;
    gpa: number;
    rank: number;
  }[];
  customRewards: {
    title: string;
    studentNames: string;
    description: string;
  }[];
  requiresRepublish?: boolean;
}

export interface SupabaseConfigStatus {
  isConfigured: boolean;
  isConnected: boolean;
  supabaseUrl?: string;
  lastSyncTime?: string;
  pendingChangesCount?: number;
  error?: string;
}

export interface DatabaseBackup {
  version: string;
  exportedAt: string;
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
}
