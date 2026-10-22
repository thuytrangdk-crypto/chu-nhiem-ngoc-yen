import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { AttendanceRecord, AttendanceStatus, Student } from '../types';
import { formatDateVN } from '../services/excel';
import {
  Calendar,
  Check,
  Mail,
  X as CrossIcon,
  Clock,
  CheckCircle,
  Save,
  Users,
  Download,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const AttendanceView: React.FC = () => {
  const { students, userRole, showToast, refreshData, config } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load attendance for date
  useEffect(() => {
    async function loadAttendance() {
      try {
        const records = await api.getAttendance({ date: selectedDate });
        const map: Record<string, AttendanceStatus> = {};
        records.forEach(r => {
          map[r.studentId] = r.status;
        });
        setAttendanceMap(map);
        setHasUnsavedChanges(false);
      } catch (err: any) {
        console.error(err);
      }
    }
    loadAttendance();
  }, [selectedDate]);

  const activeStudents = students.filter(s => s.status === 'active');

  // Count statuses
  let presentCount = 0;
  let excusedCount = 0;
  let unexcusedCount = 0;
  let lateCount = 0;

  activeStudents.forEach(s => {
    const st = attendanceMap[s.id] || 'not_marked';
    if (st === 'present') presentCount++;
    else if (st === 'excused') excusedCount++;
    else if (st === 'unexcused') unexcusedCount++;
    else if (st === 'late') lateCount++;
  });

  // Handle set single student status
  const handleSetStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: status,
    }));
    setHasUnsavedChanges(true);
  };

  // Mark all present
  const handleMarkAllPresent = () => {
    const updated: Record<string, AttendanceStatus> = {};
    activeStudents.forEach(s => {
      updated[s.id] = 'present';
    });
    setAttendanceMap(updated);
    setHasUnsavedChanges(true);
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    try {
      setIsSaving(true);
      const recordsToSave = activeStudents.map(s => ({
        studentId: s.id,
        status: attendanceMap[s.id] || 'not_marked',
      }));

      await api.saveAttendance(selectedDate, recordsToSave);
      showToast(`Đã lưu điểm danh ngày ${formatDateVN(selectedDate)} thành công!`);
      setHasUnsavedChanges(false);
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Export monthly attendance report
  const handleExportMonthAttendance = async () => {
    if (!config) return;
    const curMonth = selectedDate.slice(0, 7); // YYYY-MM
    try {
      const records = await api.getAttendance({ month: curMonth });

      const wsData: any[][] = [
        [config.schoolName || 'TRƯỜNG HỌC'],
        [`BÁO CÁO ĐIỂM DANH THÁNG ${curMonth} · LỚP ${config.className}`],
        [`GIÁO VIÊN CHỦ NHIỆM: ${config.teacherName}`],
        [],
        ['STT', 'Mã hồ sơ', 'Họ và tên', 'Tổng có mặt', 'Vắng có phép', 'Vắng không phép', 'Đi học muộn'],
      ];

      activeStudents.forEach((s, idx) => {
        const studentRecords = records.filter(r => r.studentId === s.id);
        const pres = studentRecords.filter(r => r.status === 'present').length;
        const exc = studentRecords.filter(r => r.status === 'excused').length;
        const unexc = studentRecords.filter(r => r.status === 'unexcused').length;
        const lt = studentRecords.filter(r => r.status === 'late').length;

        wsData.push([idx + 1, s.code, s.fullName, pres, exc, unexc, lt]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Điểm danh ${curMonth}`);
      XLSX.writeFile(wb, `Diem_Danh_Thang_${curMonth}_${config.className}.xlsx`);
      showToast('Đã xuất báo cáo điểm danh tháng thành công');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const getAvatarLetter = (name: string) => {
    const parts = name.trim().split(' ');
    return parts[parts.length - 1].charAt(0).toUpperCase();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Bar matching Image 6 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-white p-5 shadow-xs">
        {/* Left: Date selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 shadow-2xs">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden"
            />
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Chọn ngày cần kiểm tra hoặc điểm danh
          </span>
        </div>

        {/* Center: Quick Stats Pills (Image 6) */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800">
            Có mặt: <span className="font-extrabold">{presentCount}</span>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-800">
            Có phép: <span className="font-extrabold">{excusedCount}</span>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-800">
            Kh.phép: <span className="font-extrabold">{unexcusedCount}</span>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800">
            Muộn: <span className="font-extrabold">{lateCount}</span>
          </div>
        </div>

        {/* Right: Actions */}
        {userRole === 'teacher' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportMonthAttendance}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Xuất tháng</span>
            </button>

            <button
              onClick={handleMarkAllPresent}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 transition-colors"
            >
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Tất cả có mặt</span>
            </button>

            <button
              onClick={handleSaveAttendance}
              disabled={isSaving}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors ${
                hasUnsavedChanges
                  ? 'bg-rose-600 ring-2 ring-rose-300 animate-pulse'
                  : 'bg-rose-500 hover:bg-rose-600'
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu điểm danh'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Unsaved changes banner reminder */}
      {hasUnsavedChanges && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3.5 text-xs font-semibold text-amber-800 border border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            Bạn có các lựa chọn điểm danh chưa lưu. Hãy nhấn "Lưu điểm danh" để lưu trữ vào máy chủ.
          </span>
        </div>
      )}

      {/* Zero students warning */}
      {activeStudents.length === 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-white p-12 text-center shadow-xs">
          <Users className="mx-auto h-12 w-12 text-rose-800" />
          <h3 className="mt-3 text-base font-bold text-slate-800">
            Lớp học chưa có học sinh để điểm danh
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Vui lòng thêm học sinh hoặc nhập danh sách Excel trong mục "Học sinh" trước.
          </p>
        </div>
      ) : (
        /* Attendance Cards Grid matching Image 6 */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeStudents.map(student => {
            const currentStatus = attendanceMap[student.id] || 'not_marked';
            const letter = getAvatarLetter(student.fullName);

            return (
              <div
                key={student.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-rose-200"
              >
                {/* Student header on card */}
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-black text-blue-700 text-sm">
                    {letter}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-xs font-bold text-slate-900 uppercase">
                      {student.fullName}
                    </h3>
                    <div className="text-[11px] font-mono text-slate-400">
                      ID: {student.code}
                    </div>
                  </div>
                </div>

                {/* 4 Segmented Status Buttons (Matching Image 6) */}
                <div className="mt-4 grid grid-cols-4 gap-1.5">
                  {/* Status 1: Có mặt */}
                  <button
                    type="button"
                    disabled={userRole !== 'teacher'}
                    onClick={() => handleSetStatus(student.id, 'present')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 text-xs font-bold transition-all ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Check className="h-4 w-4 mb-0.5" />
                    <span className="text-[11px]">Có mặt</span>
                  </button>

                  {/* Status 2: Có phép */}
                  <button
                    type="button"
                    disabled={userRole !== 'teacher'}
                    onClick={() => handleSetStatus(student.id, 'excused')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 text-xs font-bold transition-all ${
                      currentStatus === 'excused'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Mail className="h-4 w-4 mb-0.5" />
                    <span className="text-[11px]">Có phép</span>
                  </button>

                  {/* Status 3: Kh.phép */}
                  <button
                    type="button"
                    disabled={userRole !== 'teacher'}
                    onClick={() => handleSetStatus(student.id, 'unexcused')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 text-xs font-bold transition-all ${
                      currentStatus === 'unexcused'
                        ? 'bg-rose-600 text-slate-800 shadow-xs'
                        : 'border border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CrossIcon className="h-4 w-4 mb-0.5" />
                    <span className="text-[11px]">Kh.phép</span>
                  </button>

                  {/* Status 4: Muộn */}
                  <button
                    type="button"
                    disabled={userRole !== 'teacher'}
                    onClick={() => handleSetStatus(student.id, 'late')}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 text-xs font-bold transition-all ${
                      currentStatus === 'late'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="h-4 w-4 mb-0.5" />
                    <span className="text-[11px]">Muộn</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
