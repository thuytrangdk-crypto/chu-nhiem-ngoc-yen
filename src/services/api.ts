import {
  UserSession,
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
} from '../types';

const TOKEN_KEY = 'troly_session_token';
const ROLE_KEY = 'troly_user_role';
const STUDENT_ID_KEY = 'troly_student_id';
const STUDENT_NAME_KEY = 'troly_student_name';
const STUDENT_CODE_KEY = 'troly_student_code';
const MUST_CHANGE_PASS_KEY = 'troly_must_change_pass';

class ApiService {
  private token: string | null = null;
  public role: 'teacher' | 'student' | null = null;
  public studentId: string | null = null;
  public studentName: string | null = null;
  public studentCode: string | null = null;
  public mustChangePassword = false;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    this.role = (localStorage.getItem(ROLE_KEY) as any) || null;
    this.studentId = localStorage.getItem(STUDENT_ID_KEY);
    this.studentName = localStorage.getItem(STUDENT_NAME_KEY);
    this.studentCode = localStorage.getItem(STUDENT_CODE_KEY);
    this.mustChangePassword = localStorage.getItem(MUST_CHANGE_PASS_KEY) === 'true';
  }

  public setSession(session: UserSession) {
    this.token = session.token;
    this.role = session.role;
    this.studentId = session.studentId || null;
    this.studentName = session.studentName || null;
    this.studentCode = session.studentCode || null;
    this.mustChangePassword = Boolean(session.mustChangePassword);

    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(ROLE_KEY, session.role);
    if (session.studentId) localStorage.setItem(STUDENT_ID_KEY, session.studentId);
    else localStorage.removeItem(STUDENT_ID_KEY);

    if (session.studentName) localStorage.setItem(STUDENT_NAME_KEY, session.studentName);
    else localStorage.removeItem(STUDENT_NAME_KEY);

    if (session.studentCode) localStorage.setItem(STUDENT_CODE_KEY, session.studentCode);
    else localStorage.removeItem(STUDENT_CODE_KEY);

    localStorage.setItem(MUST_CHANGE_PASS_KEY, String(this.mustChangePassword));
  }

  public clearSession() {
    this.token = null;
    this.role = null;
    this.studentId = null;
    this.studentName = null;
    this.studentCode = null;
    this.mustChangePassword = false;

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(STUDENT_ID_KEY);
    localStorage.removeItem(STUDENT_NAME_KEY);
    localStorage.removeItem(STUDENT_CODE_KEY);
    localStorage.removeItem(MUST_CHANGE_PASS_KEY);
  }

  public isAuthenticated(): boolean {
    return Boolean(this.token);
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as any) || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      headers['x-session-token'] = this.token;
    }

    try {
      const res = await fetch(endpoint, {
        ...options,
        headers,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired or invalid
          this.clearSession();
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        throw new Error(data.error || `Yêu cầu thất bại (${res.status})`);
      }

      return data as T;
    } catch (err: any) {
      if (!navigator.onLine) {
        throw new Error('Mất kết nối mạng. Vui lòng kiểm tra lại đường truyền internet.');
      }
      throw err;
    }
  }

  // --- Auth ---
  async login(role: 'teacher' | 'student', password: string, username?: string): Promise<UserSession> {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role, password, username }),
    });
    this.setSession(data);
    return data;
  }

  async changePassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    return this.request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    });
  }

  async resetStudentPassword(studentId: string, customPassword?: string) {
    return this.request('/api/auth/reset-student-password', {
      method: 'POST',
      body: JSON.stringify({ studentId, customPassword }),
    });
  }

  // --- Status & Config ---
  async getStatus() {
    return this.request('/api/status');
  }

  async getConfig(): Promise<ClassConfig> {
    return this.request('/api/config');
  }

  async updateConfig(config: Partial<ClassConfig>) {
    return this.request('/api/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // --- Students ---
  async getStudents(): Promise<Student[]> {
    return this.request('/api/students');
  }

  async getStudent(id: string): Promise<Student> {
    return this.request(`/api/students/${id}`);
  }

  async addStudent(data: Partial<Student>) {
    return this.request('/api/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStudent(id: string, data: Partial<Student>) {
    return this.request(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStudent(id: string, permanent = false) {
    return this.request(`/api/students/${id}?permanent=${permanent}`, {
      method: 'DELETE',
    });
  }

  async batchImportStudents(mode: 'append_or_update' | 'replace_all', students: any[]) {
    return this.request('/api/students/batch-import', {
      method: 'POST',
      body: JSON.stringify({ mode, students }),
    });
  }

  async cleanClass(confirmationCode: string) {
    return this.request('/api/students/clean-class', {
      method: 'POST',
      body: JSON.stringify({ confirmationCode }),
    });
  }

  // --- Attendance ---
  async getAttendance(params?: { date?: string; month?: string; studentId?: string }): Promise<AttendanceRecord[]> {
    const q = new URLSearchParams(params as any).toString();
    return this.request(`/api/attendance${q ? `?${q}` : ''}`);
  }

  async saveAttendance(date: string, records: { studentId: string; status: string; note?: string }[]) {
    return this.request('/api/attendance', {
      method: 'POST',
      body: JSON.stringify({ date, records }),
    });
  }

  // --- Subjects & Scores ---
  async getSubjects(): Promise<Subject[]> {
    return this.request('/api/subjects');
  }

  async saveSubjects(subjects: Subject[]) {
    return this.request('/api/subjects', {
      method: 'POST',
      body: JSON.stringify({ subjects }),
    });
  }

  async getScores(params?: { month?: string; studentId?: string }): Promise<MonthlyScoreRecord[]> {
    const q = new URLSearchParams(params as any).toString();
    return this.request(`/api/scores${q ? `?${q}` : ''}`);
  }

  async saveScores(month: string, records: { studentId: string; scores: Record<string, any> }[]) {
    return this.request('/api/scores', {
      method: 'POST',
      body: JSON.stringify({ month, records }),
    });
  }

  async deleteMonthScores(month: string) {
    return this.request(`/api/scores?month=${month}`, {
      method: 'DELETE',
    });
  }

  async restoreMonthScores(backupId: string) {
    return this.request('/api/scores/restore', {
      method: 'POST',
      body: JSON.stringify({ backupId }),
    });
  }

  async getScoreBackups(): Promise<{ id: string; month: string; backupTime: string; count: number }[]> {
    return this.request('/api/scores/backups');
  }

  // --- Conduct ---
  async getConductRules(): Promise<ConductSettings> {
    return this.request('/api/conduct/rules');
  }

  async saveConductRules(settings: Partial<ConductSettings>) {
    return this.request('/api/conduct/rules', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  async getIncidents(params?: { studentId?: string; month?: string }): Promise<ConductIncident[]> {
    const q = new URLSearchParams(params as any).toString();
    return this.request(`/api/conduct/incidents${q ? `?${q}` : ''}`);
  }

  async createIncident(data: Partial<ConductIncident>) {
    return this.request('/api/conduct/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIncident(id: string, data: Partial<ConductIncident>) {
    return this.request(`/api/conduct/incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteIncident(id: string) {
    return this.request(`/api/conduct/incidents/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Bulletin ---
  async getBulletin(): Promise<BulletinPost[]> {
    return this.request('/api/bulletin');
  }

  async saveBulletinPost(post: Partial<BulletinPost>) {
    return this.request('/api/bulletin', {
      method: 'POST',
      body: JSON.stringify(post),
    });
  }

  async deleteBulletinPost(id: string) {
    return this.request(`/api/bulletin/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Seating ---
  async getSeating(): Promise<SeatingPlan> {
    return this.request('/api/seating');
  }

  async saveSeating(plan: Partial<SeatingPlan>) {
    return this.request('/api/seating', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  }

  // --- Honor Board ---
  async getHonor(month: string): Promise<HonorBoard> {
    return this.request(`/api/honor/${month}`);
  }

  async publishHonor(month: string, isPublished: boolean, customRewards?: any[]) {
    return this.request('/api/honor/publish', {
      method: 'POST',
      body: JSON.stringify({ month, isPublished, customRewards }),
    });
  }

  // --- Backup & Restore ---
  async getBackupData(): Promise<DatabaseBackup> {
    return this.request('/api/backup');
  }

  async restoreBackup(backupData: DatabaseBackup) {
    return this.request('/api/restore', {
      method: 'POST',
      body: JSON.stringify({ backupData }),
    });
  }

  async testSupabase() {
    return this.request('/api/supabase/test');
  }
}

export const api = new ApiService();
