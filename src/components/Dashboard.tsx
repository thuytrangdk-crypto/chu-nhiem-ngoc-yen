import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Student, AttendanceRecord, ConductIncident } from '../types';
import {
  Users,
  UserX,
  AlertTriangle,
  Award,
  ChevronRight,
  Clock,
  Sparkles,
  FileSpreadsheet,
  CalendarCheck,
  UserPlus,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { config, students, openStudentProfile, userRole, setActiveTab } = useApp();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<ConductIncident[]>([]);
  const [weeklyViolationCount, setWeeklyViolationCount] = useState(0);
  const [weeklyRewardCount, setWeeklyRewardCount] = useState(0);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function loadStats() {
      try {
        const [att, inc] = await Promise.all([
          api.getAttendance({ date: todayStr }).catch(() => []),
          api.getIncidents().catch(() => []),
        ]);
        setTodayAttendance(att);
        setRecentIncidents(inc.slice(0, 10));

        // Calculate 7-day stats
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const weekIncidents = inc.filter(i => i.date >= sevenDaysAgo);
        const violations = weekIncidents.filter(i => i.category === 'violation').length;
        const rewards = weekIncidents.filter(i => i.category === 'reward').length;
        setWeeklyViolationCount(violations);
        setWeeklyRewardCount(rewards);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    }
    loadStats();
  }, [todayStr]);

  // Active students
  const activeStudents = students.filter(s => s.status === 'active');
  const boysCount = activeStudents.filter(s => s.gender === 'Nam').length;
  const girlsCount = activeStudents.filter(s => s.gender === 'Nữ').length;

  // Attendance stats for today
  const absentCount = todayAttendance.filter(a => a.status === 'excused' || a.status === 'unexcused').length;
  const lateCount = todayAttendance.filter(a => a.status === 'late').length;

  // Criteria for "Students needing attention":
  const thresholdAbsence = config?.attentionThreshold?.absenceDays || 2;
  const thresholdViolations = config?.attentionThreshold?.violationsCount || 2;

  // Calculate attention list
  const attentionStudents = activeStudents
    .map(student => {
      const studentIncidents = recentIncidents.filter(i => i.studentId === student.id);
      const studentViolations = studentIncidents.filter(i => i.category === 'violation').length;
      const studentAbsences = todayAttendance.filter(
        a => a.studentId === student.id && (a.status === 'unexcused' || a.status === 'late')
      ).length;

      const needsAttention =
        studentViolations >= thresholdViolations || studentAbsences >= 1;

      return {
        student,
        violations: studentViolations,
        absences: studentAbsences,
        needsAttention,
      };
    })
    .filter(item => item.needsAttention);

  const getAvatarBg = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-rose-100 text-rose-700',
      'bg-purple-100 text-purple-700',
      'bg-amber-100 text-amber-700',
      'bg-emerald-100 text-emerald-700',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Banner (As in Image 2) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 p-6 text-slate-800 shadow-sm">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              {config?.appName || 'Trợ Lý Chủ Nhiệm'} · Lớp {config?.className || '8A3'}
            </h1>
            <p className="mt-1 text-sm font-medium text-rose-800">
              Giáo viên chủ nhiệm: <span className="font-bold text-slate-800">{config?.teacherName || 'Nguyễn Thị Thùy Trang'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Năm học {config?.schoolYear || '2026-2027'}
            </span>
          </div>
        </div>
      </div>

      {/* Zero students initial guidance card */}
      {activeStudents.length === 0 && (
        <div className="rounded-2xl border border-rose-200 bg-white p-6 shadow-xs">
          <div className="max-w-xl">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-800 mb-3">
              <UserPlus className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Chào mừng bạn đến với ứng dụng Trợ Lý Chủ Nhiệm!
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Lớp học hiện tại chưa có danh sách học sinh. Bạn có thể bắt đầu thiết lập nhanh chóng:
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab('students')}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-rose-600 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Nhập danh sách học sinh (Excel)</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>Cài đặt thông tin lớp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Summary Stats Cards (As in Image 2) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Sĩ số lớp */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              SĨ SỐ LỚP
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {activeStudents.length}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            <span className="font-semibold text-blue-600">{boysCount}</span> Nam ·{' '}
            <span className="font-semibold text-rose-800">{girlsCount}</span> Nữ
          </div>
        </div>

        {/* Card 2: Vắng (hôm nay) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              VẮNG (HÔM NAY)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-800">
              <UserX className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {absentCount}
          </div>
          <div className="mt-1 text-xs font-medium text-rose-800">
            {absentCount > 0 ? (
              <span>Cần kiểm tra lý do ({lateCount > 0 ? `${lateCount} muộn` : 'nghỉ'})</span>
            ) : (
              <span className="text-emerald-600">Tất cả có mặt</span>
            )}
          </div>
        </div>

        {/* Card 3: Vi phạm (tuần) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              VI PHẠM (TUẦN)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {weeklyViolationCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Lượt trừ điểm nề nếp
          </div>
        </div>

        {/* Card 4: Khen thưởng */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
              KHEN THƯỞNG
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
            {weeklyRewardCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Lượt cộng điểm gương mẫu
          </div>
        </div>
      </div>

      {/* Two columns: Học sinh cần chú ý & Hoạt động gần đây */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Học sinh cần chú ý */}
        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-800">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Học sinh cần chú ý
                </h3>
                <p className="text-xs text-slate-500">
                  Nghỉ học nhiều, có lỗi vi phạm hoặc cần liên hệ phụ huynh
                </p>
              </div>
            </div>
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">
              {attentionStudents.length} em
            </span>
          </div>

          <div className="mt-4 flex-1 space-y-2 overflow-y-auto max-h-[380px] pr-1">
            {attentionStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-slate-400">
                <Sparkles className="h-8 w-8 text-rose-800 mb-2" />
                <span>Tuyệt vời! Hiện tại không có học sinh nào bị cảnh báo.</span>
              </div>
            ) : (
              attentionStudents.map(({ student, violations, absences }) => (
                <button
                  key={student.id}
                  onClick={() => openStudentProfile(student.id)}
                  className="group flex w-full items-center justify-between rounded-xl border border-slate-100 p-3 text-left transition-all hover:border-rose-200 hover:bg-rose-50/40"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${getAvatarBg(
                        student.fullName
                      )}`}
                    >
                      {student.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 group-hover:text-rose-800 uppercase">
                        {student.fullName}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                        {violations > 0 && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">
                            Vi phạm: {violations}
                          </span>
                        )}
                        {absences > 0 && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
                            Vắng/muộn: {absences}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400">
                          Mã số: {student.code}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-rose-800 transition-colors" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Hoạt động gần đây */}
        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Hoạt động gần đây
                </h3>
                <p className="text-xs text-slate-500">
                  Nhật ký thi đua, khen thưởng và trao đổi
                </p>
              </div>
            </div>
            {recentIncidents.length > 0 && (
              <button
                onClick={() => setActiveTab('scores')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Xem chi tiết
              </button>
            )}
          </div>

          <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
            {recentIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-slate-400">
                <CalendarCheck className="h-8 w-8 text-slate-200 mb-2" />
                <span>Chưa có hoạt động ghi nhận nào gần đây.</span>
              </div>
            ) : (
              recentIncidents.map(inc => {
                const stu = students.find(s => s.id === inc.studentId);
                const isViolation = inc.category === 'violation';
                return (
                  <div
                    key={inc.id}
                    className="flex items-start justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50/60"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          isViolation
                            ? 'bg-rose-50 text-rose-800'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {isViolation ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <Award className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div>
                        <div
                          onClick={() => stu && openStudentProfile(stu.id)}
                          className="text-xs font-bold text-slate-900 hover:text-rose-800 cursor-pointer uppercase"
                        >
                          {stu?.fullName || 'Học sinh'}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-600 font-medium">
                          {inc.content}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {inc.ruleName} ·{' '}
                          <span
                            className={`font-semibold ${
                              isViolation ? 'text-rose-800' : 'text-emerald-600'
                            }`}
                          >
                            {isViolation ? `-${inc.points}đ` : `+${inc.points}đ`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[11px] font-medium text-slate-400 shrink-0">
                      {inc.date}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
