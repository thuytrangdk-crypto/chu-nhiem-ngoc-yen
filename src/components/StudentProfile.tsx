import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  Student,
  AttendanceRecord,
  MonthlyScoreRecord,
  ConductIncident,
  ConductRule,
} from '../types';
import {
  exportStudentViolationsExcel,
  formatDateVN,
} from '../services/excel';
import {
  ArrowLeft,
  Printer,
  Edit2,
  Calendar,
  BookOpen,
  Award,
  Star,
  FileSpreadsheet,
  Plus,
  Trash2,
  Lock,
  User,
  Phone,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  X,
  KeyRound,
} from 'lucide-react';

export const StudentProfile: React.FC = () => {
  const {
    selectedStudentId,
    closeStudentProfile,
    userRole,
    config,
    conductSettings,
    subjects,
    showToast,
    refreshData,
  } = useApp();

  const [student, setStudent] = useState<Student | null>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [scoresList, setScoresList] = useState<MonthlyScoreRecord[]>([]);
  const [incidentsList, setIncidentsList] = useState<ConductIncident[]>([]);
  const [activeProfileTab, setActiveProfileTab] = useState<
    'info' | 'attendance' | 'academic' | 'conduct' | 'contact'
  >('conduct'); // Default to conduct as highlighted in prompt

  // Edit info modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Student>>({});

  // Reset student password modal (Teacher only)
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false);
  const [customResetPass, setCustomResetPass] = useState('');

  // Conduct recording form state
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentRuleId, setIncidentRuleId] = useState('');
  const [incidentCategory, setIncidentCategory] = useState<'violation' | 'reward'>('violation');
  const [incidentPoints, setIncidentPoints] = useState<number>(2);
  const [incidentContent, setIncidentContent] = useState('');
  const [incidentNote, setIncidentNote] = useState('');

  // Conduct filter period
  const [conductPeriod, setConductPeriod] = useState<string>('all'); // 'all' or 'YYYY-MM'

  // Print contact slip mode
  const [isPrintingSlip, setIsPrintingSlip] = useState(false);

  // Load student data
  useEffect(() => {
    if (!selectedStudentId) return;

    async function loadData() {
      try {
        const [stu, att, sco, inc] = await Promise.all([
          api.getStudent(selectedStudentId!),
          api.getAttendance({ studentId: selectedStudentId! }),
          api.getScores({ studentId: selectedStudentId! }),
          api.getIncidents({ studentId: selectedStudentId! }),
        ]);

        setStudent(stu);
        setEditFormData(stu);
        setAttendanceList(att);
        setScoresList(sco);
        setIncidentsList(inc);
      } catch (err: any) {
        showToast(err.message, 'error');
        closeStudentProfile();
      }
    }

    loadData();
  }, [selectedStudentId, closeStudentProfile, showToast]);

  if (!student) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="text-xs font-semibold text-slate-500">Đang tải hồ sơ học sinh...</div>
      </div>
    );
  }

  // --- STATS CALCULATIONS ---
  // 1. Attendance stats
  const totalAbsence = attendanceList.filter(
    a => a.status === 'excused' || a.status === 'unexcused' || a.status === 'late'
  ).length;

  // 2. Academic GPA
  const validScores = scoresList.filter(s => s.gpa !== null && s.gpa !== undefined);
  const latestScoreRecord = validScores.length > 0 ? validScores[validScores.length - 1] : null;
  const currentGPA = latestScoreRecord?.gpa;

  // 3. Conduct score & rank
  const initialConductScore = conductSettings?.initialScore ?? 200;
  const filteredIncidents = incidentsList.filter(inc => {
    if (conductPeriod === 'all') return true;
    return inc.date.startsWith(conductPeriod);
  });

  let totalAddPoints = 0;
  let totalSubPoints = 0;
  filteredIncidents.forEach(inc => {
    if (inc.category === 'reward') totalAddPoints += inc.points;
    else totalSubPoints += Math.abs(inc.points);
  });

  const remainingConductScore = initialConductScore + totalAddPoints - totalSubPoints;

  // Rank determination
  const tGood = conductSettings?.thresholdGood ?? 190;
  const tFair = conductSettings?.thresholdFair ?? 160;
  const tPass = conductSettings?.thresholdPass ?? 130;

  let conductRank = 'Chưa đạt';
  let conductRankColor = 'text-rose-800';
  if (remainingConductScore >= tGood) {
    conductRank = 'Tốt';
    conductRankColor = 'text-emerald-600';
  } else if (remainingConductScore >= tFair) {
    conductRank = 'Khá';
    conductRankColor = 'text-blue-600';
  } else if (remainingConductScore >= tPass) {
    conductRank = 'Đạt';
    conductRankColor = 'text-amber-600';
  }

  // Handle select conduct rule from dropdown
  const handleSelectRule = (ruleId: string) => {
    setIncidentRuleId(ruleId);
    const rule = conductSettings?.rules.find(r => r.id === ruleId);
    if (rule) {
      setIncidentCategory(rule.category);
      setIncidentPoints(rule.points);
      if (!incidentContent) setIncidentContent(rule.name);
    }
  };

  // Save new conduct incident
  const handleSaveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentContent || incidentPoints === undefined) {
      showToast('Vui lòng nhập nội dung và điểm số sự việc', 'error');
      return;
    }

    try {
      const selectedRule = conductSettings?.rules.find(r => r.id === incidentRuleId);
      const res = await api.createIncident({
        studentId: student.id,
        date: incidentDate,
        ruleId: incidentRuleId || undefined,
        ruleName: selectedRule ? selectedRule.name : 'Khác',
        category: incidentCategory,
        points: incidentPoints,
        content: incidentContent,
        note: incidentNote,
      });

      showToast('Đã lưu ghi nhận sự việc thành công');
      setIncidentsList([res.incident, ...incidentsList]);
      setIncidentContent('');
      setIncidentNote('');
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Delete conduct incident
  const handleDeleteIncident = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa ghi nhận này?')) return;
    try {
      await api.deleteIncident(id);
      showToast('Đã xóa ghi nhận');
      setIncidentsList(incidentsList.filter(i => i.id !== id));
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Export 2-sheet violations excel (Item 9)
  const handleExportViolations = () => {
    if (!config) return;
    const periodLabel = conductPeriod === 'all' ? 'Toàn bộ năm học' : `Tháng ${conductPeriod}`;
    exportStudentViolationsExcel(student, filteredIncidents, periodLabel, config);
    showToast('Đã xuất báo cáo vi phạm (.xlsx) gồm 2 sheet thành công');
  };

  // Save edited student info
  const handleUpdateStudentInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateStudent(student.id, editFormData);
      setStudent(updated.student);
      showToast('Đã cập nhật hồ sơ học sinh thành công');
      setIsEditModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Reset student password
  const handleResetPassword = async () => {
    try {
      const res = await api.resetStudentPassword(student.id, customResetPass || undefined);
      showToast(res.message);
      setIsResetPassModalOpen(false);
      setCustomResetPass('');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Bar with Back button & actions (Matching Image 10) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-200/80 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={closeStudentProfile}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại</span>
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 sm:text-lg">
              Hồ sơ học sinh: <span className="text-rose-800 uppercase">{student.fullName}</span>
            </h1>
            <div className="text-[11px] text-slate-500 font-mono">
              Mã định danh: {student.code} · Ngày sinh: {formatDateVN(student.birthDate)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-4 w-4 text-rose-800" />
            <span>Phiếu liên lạc</span>
          </button>

          {userRole === 'teacher' && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600 transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              <span>Sửa thông tin</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Student Header Banner (Image 10) */}
      <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-xs text-center">
        <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
          {student.fullName}
        </h2>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-600">
          <span className={student.gender === 'Nữ' ? 'text-rose-800' : 'text-blue-600'}>
            {student.gender}
          </span>
          <span>·</span>
          <span>Ngày sinh: {formatDateVN(student.birthDate)}</span>
          <span>·</span>
          <span className="font-mono text-slate-700">ID: {student.code}</span>
        </div>

        {/* 4 KPI Summary Cards (Image 10) */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 text-left">
          {/* KPI 1: Điểm danh */}
          <div className="rounded-2xl border border-slate-200/80 bg-[#f8fafc] p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span>ĐIỂM DANH</span>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
              {totalAbsence}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">vắng / muộn</div>
          </div>

          {/* KPI 2: Học tập */}
          <div className="rounded-2xl border border-slate-200/80 bg-[#f8fafc] p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <BookOpen className="h-4 w-4 text-emerald-500" />
              <span>HỌC TẬP</span>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700 tabular-nums">
              {currentGPA !== null && currentGPA !== undefined ? currentGPA.toFixed(2) : 'Chưa có'}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {currentGPA !== null && currentGPA !== undefined ? 'ĐTB môn tháng gần nhất' : 'Chưa nhập điểm'}
            </div>
          </div>

          {/* KPI 3: Điểm thi đua còn lại */}
          <div className="rounded-2xl border border-slate-200/80 bg-[#f8fafc] p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <Award className="h-4 w-4 text-purple-500" />
              <span>ĐIỂM THI ĐUA</span>
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900 tabular-nums">
              {remainingConductScore}{' '}
              <span className="text-xs font-normal text-slate-400">/ {initialConductScore}đ</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              {totalSubPoints > 0 ? `Đã trừ: -${totalSubPoints}đ` : 'Chưa có điểm trừ'}
            </div>
          </div>

          {/* KPI 4: Xếp loại hạnh kiểm */}
          <div className="rounded-2xl border border-slate-200/80 bg-[#f8fafc] p-4 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
              <Star className="h-4 w-4 text-amber-500" />
              <span>HẠNH KIỂM</span>
            </div>
            <div className={`mt-2 text-2xl font-black tabular-nums ${conductRankColor}`}>
              {conductRank}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">Xếp loại rèn luyện</div>
          </div>
        </div>
      </div>

      {/* Sub-tabs Bar (Image 10) */}
      <div className="flex flex-wrap gap-2 border-b border-rose-200/80 pb-2">
        {[
          { id: 'info' as const, label: 'Thông tin cá nhân' },
          { id: 'attendance' as const, label: `Điểm danh (${attendanceList.length})` },
          { id: 'academic' as const, label: 'Học tập & Điểm số' },
          { id: 'conduct' as const, label: 'Thi đua & Kỷ luật' },
          { id: 'contact' as const, label: 'Sổ tay & Liên hệ' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveProfileTab(tab.id)}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              activeProfileTab === tab.id
                ? 'bg-rose-500 text-slate-800 shadow-xs'
                : 'bg-white text-slate-600 hover:bg-rose-50 hover:text-slate-900 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: THI ĐUA & KỶ LUẬT (Layout from Item 7: Left 35% form, Right 65% history & stats) */}
      {activeProfileTab === 'conduct' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column (Approx 35%): Ghi nhận sự việc */}
          {userRole === 'teacher' ? (
            <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Plus className="h-4 w-4 text-rose-800" />
                <h3 className="text-sm font-bold text-slate-900">Ghi nhận sự việc</h3>
              </div>

              <form onSubmit={handleSaveIncident} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Ngày xảy ra *</label>
                  <input
                    type="date"
                    required
                    value={incidentDate}
                    onChange={e => setIncidentDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Quy tắc thi đua *</label>
                  <select
                    value={incidentRuleId}
                    onChange={e => handleSelectRule(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  >
                    <option value="">-- Chọn lỗi hoặc khen thưởng --</option>
                    <optgroup label="Lỗi vi phạm">
                      {conductSettings?.rules
                        .filter(r => r.category === 'violation' && r.isActive)
                        .map(r => (
                          <option key={r.id} value={r.id}>
                            [{r.code}] {r.name} (-{r.points}đ)
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Khen thưởng gương mẫu">
                      {conductSettings?.rules
                        .filter(r => r.category === 'reward' && r.isActive)
                        .map(r => (
                          <option key={r.id} value={r.id}>
                            [{r.code}] {r.name} (+{r.points}đ)
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Loại</label>
                    <select
                      value={incidentCategory}
                      onChange={e => setIncidentCategory(e.target.value as any)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                    >
                      <option value="violation">Vi phạm (-)</option>
                      <option value="reward">Khen thưởng (+)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Điểm áp dụng *</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={incidentPoints}
                      onChange={e => setIncidentPoints(parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Nội dung chi tiết *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Mô tả cụ thể sự việc..."
                    value={incidentContent}
                    onChange={e => setIncidentContent(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Ghi chú (Tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="Đã nhắc nhở / Phụ huynh đã ký..."
                    value={incidentNote}
                    onChange={e => setIncidentNote(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-rose-500 py-2.5 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600 transition-colors"
                >
                  Lưu ghi nhận sự việc
                </button>
              </form>
            </div>
          ) : (
            <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Quy tắc nề nếp của lớp
              </h3>
              <p className="mt-2 text-xs text-slate-600">
                Học sinh cần tuân thủ nội quy trường lớp để duy trì điểm thi đua và rèn luyện tốt.
              </p>
              <div className="mt-4 space-y-2 text-xs">
                <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-800 font-medium">
                  🌟 Điểm từ {tGood} trở lên: <strong>Hạnh kiểm Tốt</strong>
                </div>
                <div className="rounded-lg bg-blue-50 p-2.5 text-blue-800 font-medium">
                  👍 Điểm từ {tFair} đến dưới {tGood}: <strong>Hạnh kiểm Khá</strong>
                </div>
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-800 font-medium">
                  ⚠️ Điểm từ {tPass} đến dưới {tFair}: <strong>Hạnh kiểm Đạt</strong>
                </div>
                <div className="rounded-lg bg-rose-50 p-2.5 text-rose-800 font-medium">
                  ❌ Điểm dưới {tPass}: <strong>Chưa đạt</strong>
                </div>
              </div>
            </div>
          )}

          {/* Right Column (Approx 65%): Period Filter & History (Image 10) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Top Toolbar: Period filter, current score and Export Excel */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Kỳ đánh giá:</span>
                <select
                  value={conductPeriod}
                  onChange={e => setConductPeriod(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-rose-500"
                >
                  <option value="all">Tất cả thời gian</option>
                  <option value="2026-09">Tháng 09/2026</option>
                  <option value="2026-10">Tháng 10/2026</option>
                  <option value="2026-11">Tháng 11/2026</option>
                  <option value="2026-12">Tháng 12/2026</option>
                  <option value="2027-01">Tháng 01/2027</option>
                  <option value="2027-02">Tháng 02/2027</option>
                  <option value="2027-03">Tháng 03/2027</option>
                  <option value="2027-04">Tháng 04/2027</option>
                  <option value="2027-05">Tháng 05/2027</option>
                </select>

                {userRole === 'teacher' && (
                  <button
                    onClick={handleExportViolations}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Xuất Excel vi phạm</span>
                  </button>
                )}
              </div>

              {/* Point badge */}
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium">
                  Điểm trừ: <span className="text-rose-800 font-bold">-{totalSubPoints}đ</span> · Thưởng:{' '}
                  <span className="text-emerald-600 font-bold">+{totalAddPoints}đ</span>
                </div>
              </div>
            </div>

            {/* Scrollable Incident History List */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Lịch sử sự việc thi đua & kỷ luật ({filteredIncidents.length})
                  </h4>
                </div>
              </div>

              <div className="mt-3 max-h-[460px] overflow-y-auto space-y-2.5 pr-1">
                {filteredIncidents.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Chưa có sự việc nào được ghi nhận trong khoảng thời gian này.
                  </div>
                ) : (
                  filteredIncidents.map(inc => {
                    const isViolation = inc.category === 'violation';
                    return (
                      <div
                        key={inc.id}
                        className="flex items-start justify-between rounded-xl border border-slate-100 p-3.5 hover:bg-slate-50/60 transition-colors"
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
                            <div className="text-xs font-bold text-slate-900">
                              {inc.ruleName}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-700">
                              {inc.content}
                            </div>
                            {inc.note && (
                              <div className="mt-1 text-[11px] text-slate-500 italic">
                                Ghi chú: {inc.note}
                              </div>
                            )}
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                              <span>Ngày: {formatDateVN(inc.date)}</span>
                              <span>·</span>
                              <span>Người ghi nhận: {inc.recordedBy}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-sm font-bold ${
                              isViolation ? 'text-rose-800' : 'text-emerald-600'
                            }`}
                          >
                            {isViolation ? `-${inc.points}đ` : `+${inc.points}đ`}
                          </span>

                          {userRole === 'teacher' && (
                            <button
                              onClick={() => handleDeleteIncident(inc.id)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-800"
                              title="Xóa sự việc"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: THÔNG TIN CÁ NHÂN */}
      {activeProfileTab === 'info' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wide">
            Hồ sơ lý lịch học sinh
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <span className="text-[11px] text-slate-400">Họ và tên</span>
              <div className="mt-0.5 text-xs font-bold text-slate-900 uppercase">{student.fullName}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <span className="text-[11px] text-slate-400">Mã hồ sơ / STT</span>
              <div className="mt-0.5 text-xs font-mono font-bold text-slate-900">{student.code}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <span className="text-[11px] text-slate-400">Giới tính</span>
              <div className="mt-0.5 text-xs font-bold text-slate-900">{student.gender}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <span className="text-[11px] text-slate-400">Ngày sinh</span>
              <div className="mt-0.5 text-xs font-bold text-slate-900">{formatDateVN(student.birthDate)}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <span className="text-[11px] text-slate-400">Tên đăng nhập học sinh</span>
              <div className="mt-0.5 text-xs font-mono font-bold text-slate-900">{student.username}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <span className="text-[11px] text-slate-400">SĐT Phụ huynh</span>
              <div className="mt-0.5 text-xs font-bold text-slate-900">{student.parentPhone || 'Chưa cập nhật'}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
              <span className="text-[11px] text-slate-400">Họ tên Cha / Mẹ</span>
              <div className="mt-0.5 text-xs font-bold text-slate-900">{student.parentName || 'Chưa cập nhật'}</div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 sm:col-span-2">
              <span className="text-[11px] text-slate-400">Địa chỉ thường trú</span>
              <div className="mt-0.5 text-xs font-bold text-slate-900">{student.address || 'Chưa cập nhật'}</div>
            </div>
          </div>

          {/* Teacher password reset button */}
          {userRole === 'teacher' && (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <button
                onClick={() => setIsResetPassModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
              >
                <KeyRound className="h-4 w-4" />
                <span>Đặt lại mật khẩu đăng nhập của học sinh</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB: ĐIỂM DANH */}
      {activeProfileTab === 'attendance' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wide">
            Nhật ký điểm danh
          </h3>

          <div className="mt-4 max-h-[460px] overflow-y-auto space-y-2">
            {attendanceList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Chưa có dữ liệu điểm danh nào cho học sinh này.
              </div>
            ) : (
              attendanceList.map(a => {
                let badge = 'bg-emerald-50 text-emerald-700';
                let label = 'Có mặt';
                if (a.status === 'excused') {
                  badge = 'bg-blue-50 text-blue-700';
                  label = 'Vắng có phép';
                } else if (a.status === 'unexcused') {
                  badge = 'bg-rose-50 text-rose-700';
                  label = 'Vắng không phép';
                } else if (a.status === 'late') {
                  badge = 'bg-amber-50 text-amber-700';
                  label = 'Đi học muộn';
                }

                return (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {formatDateVN(a.date)}
                      </span>
                      {a.note && <span className="text-xs text-slate-500 italic">({a.note})</span>}
                    </div>
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${badge}`}>
                      {label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB: HỌC TẬP & ĐIỂM SỐ (Lịch sử & Biểu đồ) */}
      {activeProfileTab === 'academic' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wide">
              Bảng điểm theo tháng
            </h3>

            {scoresList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Chưa có bảng điểm tháng nào được nhập cho học sinh này.
              </div>
            ) : (
              <div className="mt-4 space-y-6">
                {/* GPA Monthly Progress Bars */}
                <div>
                  <div className="text-xs font-bold text-slate-700 mb-2">
                    Tiến độ điểm trung bình (ĐTB) qua các tháng:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {scoresList
                      .filter(s => s.gpa !== null && s.gpa !== undefined)
                      .map(s => (
                        <div key={s.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                          <span className="text-[11px] text-slate-500 font-bold">{s.yearMonth}</span>
                          <div className="text-lg font-black text-rose-800 mt-1 tabular-nums">
                            {s.gpa?.toFixed(2)}
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full"
                              style={{ width: `${((s.gpa || 0) / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Score Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Tháng</th>
                        {subjects.map(sub => (
                          <th key={sub.id} className="py-2.5 px-3">{sub.name}</th>
                        ))}
                        <th className="py-2.5 px-3 font-bold text-rose-800">ĐTB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scoresList.map(rec => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-800">{rec.yearMonth}</td>
                          {subjects.map(sub => {
                            const sc = rec.scores?.[sub.id];
                            return (
                              <td key={sub.id} className="py-2.5 px-3 font-mono">
                                {sc?.score !== null && sc?.score !== undefined
                                  ? sc.score
                                  : sc?.comment || '-'}
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-3 font-bold text-rose-800 font-mono">
                            {rec.gpa !== null && rec.gpa !== undefined ? rec.gpa.toFixed(2) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: SỔ TAY & LIÊN HỆ */}
      {activeProfileTab === 'contact' && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Parent contact */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 uppercase tracking-wide">
              Thông tin liên hệ gia đình
            </h3>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">Phụ huynh:</span>
                <strong className="text-slate-900">{student.parentName || 'Chưa cập nhật'}</strong>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">Số điện thoại:</span>
                <strong className="text-slate-900">{student.parentPhone || 'Chưa cập nhật'}</strong>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">Địa chỉ:</span>
                <span className="text-slate-900 font-medium">{student.address || 'Chưa cập nhật'}</span>
              </div>
            </div>
          </div>

          {/* Teacher private note (RBAC protected: Only teacher can view/edit) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-rose-800" />
                <span>Ghi chú nội bộ (Chỉ GVCN xem)</span>
              </h3>
            </div>
            {userRole === 'teacher' ? (
              <div className="mt-4">
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap bg-rose-50/30 p-3 rounded-xl border border-rose-100">
                  {student.notes || 'Chưa có ghi chú nội bộ nào cho học sinh này.'}
                </p>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="mt-3 text-xs font-bold text-rose-800 hover:text-rose-700"
                >
                  + Cập nhật ghi chú nội bộ
                </button>
              </div>
            ) : (
              <div className="mt-4 text-xs text-slate-400 italic">
                Nội dung này được bảo mật và chỉ giáo viên chủ nhiệm mới có quyền xem.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Sửa Thông Tin Học Sinh */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Sửa thông tin học sinh: {student.fullName}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudentInfo} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Mã số (STT) *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.code || ''}
                    onChange={e => setEditFormData({ ...editFormData, code: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Giới tính *</label>
                  <select
                    value={editFormData.gender || 'Nam'}
                    onChange={e => setEditFormData({ ...editFormData, gender: e.target.value as any })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName || ''}
                  onChange={e => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Ngày sinh *</label>
                <input
                  type="date"
                  required
                  value={editFormData.birthDate || ''}
                  onChange={e => setEditFormData({ ...editFormData, birthDate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">SĐT Phụ huynh</label>
                  <input
                    type="tel"
                    value={editFormData.parentPhone || ''}
                    onChange={e => setEditFormData({ ...editFormData, parentPhone: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Tên Phụ huynh</label>
                  <input
                    type="text"
                    value={editFormData.parentName || ''}
                    onChange={e => setEditFormData({ ...editFormData, parentName: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Địa chỉ</label>
                <input
                  type="text"
                  value={editFormData.address || ''}
                  onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                />
              </div>

              {userRole === 'teacher' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Ghi chú nội bộ (Bảo mật cho GVCN)
                  </label>
                  <textarea
                    rows={3}
                    value={editFormData.notes || ''}
                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Đặt Lại Mật Khẩu Học Sinh */}
      {isResetPassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Đặt lại mật khẩu học sinh
              </h3>
              <button
                onClick={() => setIsResetPassModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-600">
                Học sinh: <strong>{student.fullName}</strong> (Mã: {student.code})<br />
                Tên đăng nhập: <span className="font-mono font-bold text-rose-800">{student.username}</span>
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Mật khẩu mới tùy chọn (Để trống sẽ mặc định là ngày sinh DDMMYYYY)
                </label>
                <input
                  type="text"
                  placeholder="Để trống để về ngày sinh..."
                  value={customResetPass}
                  onChange={e => setCustomResetPass(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetPassModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-600"
                >
                  Xác nhận đặt lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
