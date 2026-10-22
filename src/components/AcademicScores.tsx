import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { MonthlyScoreRecord, Subject, Student, HonorBoard } from '../types';
import {
  downloadScoreTemplate,
  parseScoreExcel,
  exportMonthlyScoresExcel,
  ParsedScoreRow,
} from '../services/excel';
import {
  BookOpen,
  Search,
  Download,
  Upload,
  Settings,
  Trash2,
  RotateCcw,
  Trophy,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  X,
  Save,
  Plus,
} from 'lucide-react';

export const AcademicScores: React.FC = () => {
  const { students, subjects, config, userRole, showToast, refreshData } = useApp();

  const currentYearMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth);
  const [scoresMap, setScoresMap] = useState<Record<string, MonthlyScoreRecord>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [honorBoard, setHonorBoard] = useState<HonorBoard | null>(null);

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubjects, setEditingSubjects] = useState<Subject[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedScoreRow[]>([]);
  const [parseErrorsCount, setParseErrorsCount] = useState(0);

  // Restore scores modal
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [scoreBackups, setScoreBackups] = useState<any[]>([]);

  // Load scores & honor for month
  useEffect(() => {
    loadMonthScores(selectedMonth);
    loadHonor(selectedMonth);
  }, [selectedMonth]);

  const loadMonthScores = async (month: string) => {
    try {
      const records = await api.getScores({ month });
      const map: Record<string, MonthlyScoreRecord> = {};
      records.forEach(r => {
        map[r.studentId] = r;
      });
      setScoresMap(map);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadHonor = async (month: string) => {
    try {
      const h = await api.getHonor(month);
      setHonorBoard(h);
    } catch (err: any) {
      console.error(err);
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const nextYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextYm);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    const nextYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(nextYm);
  };

  const getMonthDisplay = (ym: string) => {
    const [y, m] = ym.split('-');
    const monthNames = [
      'Một', 'Hai', 'Ba', 'Bốn', 'Năm', 'Sáu',
      'Bảy', 'Tám', 'Chín', 'Mười', 'Mười Một', 'Mười Hai',
    ];
    const monthName = monthNames[parseInt(m, 10) - 1] || m;
    return `Tháng ${monthName} (${y})`;
  };

  // Inline score change handler
  const handleCellChange = (studentId: string, subjectId: string, value: string, type: 'score' | 'comment') => {
    const existing = scoresMap[studentId] || {
      id: '',
      yearMonth: selectedMonth,
      studentId,
      scores: {},
      updatedAt: '',
    };

    const updatedScores = { ...(existing.scores || {}) };

    if (type === 'score') {
      const cleanVal = value.trim().replace(',', '.');
      if (cleanVal === '' || cleanVal === '-') {
        updatedScores[subjectId] = { score: null };
      } else {
        const num = parseFloat(cleanVal);
        if (!isNaN(num) && num >= 0 && num <= 10) {
          updatedScores[subjectId] = { score: Math.round(num * 10) / 10 };
        } else {
          showToast('Điểm phải từ 0 đến 10', 'error');
          return;
        }
      }
    } else {
      updatedScores[subjectId] = { comment: value.trim() };
    }

    // Recompute GPA
    const scoredSubIds = new Set(subjects.filter(s => s.type === 'score').map(s => s.id));
    let totalScore = 0;
    let scoredCount = 0;
    for (const [subId, obj] of Object.entries(updatedScores) as [string, any][]) {
      if (scoredSubIds.has(subId) && obj && typeof obj.score === 'number' && !isNaN(obj.score)) {
        totalScore += obj.score;
        scoredCount += 1;
      }
    }
    const gpa = scoredCount > 0 ? totalScore / scoredCount : null;

    setScoresMap({
      ...scoresMap,
      [studentId]: {
        ...existing,
        scores: updatedScores,
        gpa,
      },
    });
  };

  // Save all changed scores
  const handleSaveAllScores = async () => {
    try {
      const recordsToSave = Object.values(scoresMap).map(r => ({
        studentId: r.studentId,
        scores: r.scores,
      }));

      await api.saveScores(selectedMonth, recordsToSave);
      showToast(`Đã lưu bảng điểm tháng ${selectedMonth} thành công`);
      loadMonthScores(selectedMonth);
      loadHonor(selectedMonth);
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Delete month scores with backup
  const handleDeleteMonthScores = async () => {
    const confirmed = window.confirm(
      `CẢNH BÁO: Bạn có chắc chắn muốn xóa toàn bộ bảng điểm của ${getMonthDisplay(
        selectedMonth
      )}? Hệ thống sẽ tự động tạo một bản sao lưu an toàn trước khi xóa.`
    );
    if (!confirmed) return;

    try {
      const res = await api.deleteMonthScores(selectedMonth);
      showToast(res.message);
      loadMonthScores(selectedMonth);
      loadHonor(selectedMonth);
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Restore month scores
  const handleRestoreBackup = async (backupId: string) => {
    try {
      const res = await api.restoreMonthScores(backupId);
      showToast(res.message);
      setIsRestoreModalOpen(false);
      loadMonthScores(selectedMonth);
      loadHonor(selectedMonth);
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Open Restore Modal
  const handleOpenRestoreModal = async () => {
    try {
      const backups = await api.getScoreBackups();
      setScoreBackups(backups);
      setIsRestoreModalOpen(true);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Publish / Republish Honor
  const handlePublishHonorBoard = async () => {
    try {
      await api.publishHonor(selectedMonth, true);
      showToast(`Đã công bố bảng vàng vinh danh tháng ${selectedMonth} thành công!`);
      loadHonor(selectedMonth);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle Excel Score Selection
  const handleExcelScoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseScoreExcel(file, subjects, students);
      setParsedRows(result.rows);
      setParseErrorsCount(result.errorsCount);
      if (result.errorsCount > 0) {
        showToast(`Phát hiện ${result.errorsCount} dòng có lỗi trong tệp Excel điểm.`, 'error');
      } else {
        showToast(`Đã đọc thành công điểm của ${result.rows.length} học sinh.`);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Confirm Excel Score Import
  const handleConfirmExcelScoreImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid && r.studentId);
    if (validRows.length === 0) {
      showToast('Không có dòng điểm hợp lệ nào để lưu.', 'error');
      return;
    }

    try {
      const payload = validRows.map(r => ({
        studentId: r.studentId!,
        scores: r.scores,
      }));

      await api.saveScores(selectedMonth, payload);
      showToast(`Đã nhập điểm thành công cho ${validRows.length} học sinh`);
      setIsImportModalOpen(false);
      setParsedRows([]);
      loadMonthScores(selectedMonth);
      loadHonor(selectedMonth);
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Subject Configuration Handlers
  const handleOpenSubjectConfig = () => {
    setEditingSubjects([...subjects]);
    setIsSubjectModalOpen(true);
  };

  const handleSaveSubjects = async () => {
    try {
      await api.saveSubjects(editingSubjects);
      showToast('Đã lưu cấu hình danh mục môn học thành công');
      setIsSubjectModalOpen(false);
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Filter students by search term
  const activeStudents = students.filter(s => s.status === 'active');
  const filteredStudents = activeStudents.filter(
    s =>
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.includes(searchTerm)
  );

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Top Banner matching Image 5 */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-800">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 uppercase">
                Bảng Điểm Học Tập
              </h1>
              <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                Lớp {config?.className || '8A3'}
              </span>
              <span className="hidden sm:inline text-xs text-slate-500 font-medium">
                Năm học {config?.schoolYear || '2026-2027'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              ⓘ ĐTB theo tháng theo dõi nội bộ
            </p>
          </div>
        </div>

        {/* Month Selector & Honor publish status (Image 5) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Stepper */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-900"
              title="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 font-mono">
              {getMonthDisplay(selectedMonth)}
            </span>
            <button
              onClick={handleNextMonth}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-900"
              title="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Honor Board Publish Button */}
          {userRole === 'teacher' && (
            <button
              onClick={handlePublishHonorBoard}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs transition-colors ${
                honorBoard?.requiresRepublish
                  ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse'
                  : honorBoard?.isPublished
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Trophy className="h-4 w-4" />
              <span>
                {honorBoard?.requiresRepublish
                  ? 'Cần công bố lại vinh danh'
                  : honorBoard?.isPublished
                  ? 'Đã công bố vinh danh'
                  : 'Công bố vinh danh'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Action Toolbar matching Image 5 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative min-w-[200px] sm:min-w-[260px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên học sinh, mã..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-rose-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-xs focus:border-rose-400 focus:outline-hidden"
          />
        </div>

        {/* Buttons: Download Template, Import Excel, Export Excel, Subject Config, Delete, Restore */}
        {userRole === 'teacher' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => config && downloadScoreTemplate(students, subjects, selectedMonth, config)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800 shadow-2xs hover:bg-blue-100 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-blue-600" />
              <span>Tải mẫu Excel</span>
            </button>

            <button
              onClick={() => {
                setParsedRows([]);
                setIsImportModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition-colors"
            >
              <Upload className="h-3.5 w-3.5 text-emerald-600" />
              <span>Nhập Excel điểm tháng</span>
            </button>

            <button
              onClick={() => config && exportMonthlyScoresExcel(students, subjects, scoresMap, selectedMonth, config)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={handleOpenSubjectConfig}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-slate-500" />
              <span>Cấu hình môn</span>
            </button>

            <button
              onClick={handleDeleteMonthScores}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 transition-colors"
              title="Xóa điểm tháng này (có sao lưu tự động)"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-800" />
              <span>Xóa điểm tháng</span>
            </button>

            <button
              onClick={handleOpenRestoreModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 shadow-2xs hover:bg-amber-100 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
              <span>Khôi phục điểm</span>
            </button>

            <button
              onClick={handleSaveAllScores}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Lưu bảng điểm</span>
            </button>
          </div>
        )}
      </div>

      {/* Score Table matching Image 5 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-50 font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-50 py-3 px-3 w-12 text-center border-r border-slate-200">
                  STT
                </th>
                <th className="sticky left-12 z-20 bg-slate-50 py-3 px-3 w-24 border-r border-slate-200">
                  MÃ HỒ SƠ
                </th>
                <th className="sticky left-36 z-20 bg-slate-50 py-3 px-4 min-w-[200px] border-r border-slate-200">
                  HỌ VÀ TÊN
                </th>
                {subjects.map(sub => (
                  <th
                    key={sub.id}
                    className="py-3 px-3 text-center min-w-[90px] border-r border-slate-100"
                  >
                    <div>{sub.name}</div>
                    <span className="text-[10px] font-normal text-slate-400">
                      {sub.type === 'score' ? '(0-10)' : '(Đ/CĐ)'}
                    </span>
                  </th>
                ))}
                <th className="py-3 px-4 text-center min-w-[90px] font-extrabold text-rose-800 bg-rose-50/50">
                  ĐTB THÁNG
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={subjects.length + 4} className="py-12 text-center text-xs text-slate-400 font-sans">
                    Không có học sinh nào.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const record = scoresMap[student.id];
                  const gpa = record?.gpa;
                  return (
                    <tr key={student.id} className="hover:bg-rose-50/30 transition-colors">
                      {/* Fixed STT */}
                      <td className="sticky left-0 bg-white py-2.5 px-3 text-center text-slate-400 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      {/* Fixed Code */}
                      <td className="sticky left-12 bg-white py-2.5 px-3 font-bold text-slate-900 border-r border-slate-200">
                        {student.code}
                      </td>
                      {/* Fixed Full Name */}
                      <td className="sticky left-36 bg-white py-2.5 px-4 font-bold text-slate-900 font-sans uppercase border-r border-slate-200 truncate max-w-[220px]">
                        {student.fullName}
                      </td>

                      {/* Subject Cells */}
                      {subjects.map(sub => {
                        const cellData = record?.scores?.[sub.id];
                        const val =
                          sub.type === 'score'
                            ? cellData?.score !== null && cellData?.score !== undefined
                              ? cellData.score
                              : ''
                            : cellData?.comment || '';

                        return (
                          <td key={sub.id} className="py-1 px-1.5 text-center border-r border-slate-100">
                            {userRole === 'teacher' ? (
                              <input
                                type="text"
                                placeholder="-"
                                value={val}
                                onChange={e =>
                                  handleCellChange(student.id, sub.id, e.target.value, sub.type)
                                }
                                className="w-16 rounded-lg border border-slate-200 py-1 text-center text-xs font-bold text-slate-800 focus:border-rose-400 focus:bg-rose-50/50 focus:outline-hidden"
                              />
                            ) : (
                              <span className="font-bold text-slate-800">
                                {val !== '' ? val : '-'}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* GPA Cell */}
                      <td className="py-2.5 px-4 text-center font-extrabold text-rose-800 bg-rose-50/20">
                        {gpa !== null && gpa !== undefined ? gpa.toFixed(2) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Cấu Hình Danh Mục Môn Học */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Cấu hình môn học
              </h3>
              <button
                onClick={() => setIsSubjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 max-h-80 overflow-y-auto pr-1">
              {editingSubjects.map((sub, i) => (
                <div key={sub.id} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2.5">
                  <input
                    type="text"
                    value={sub.name}
                    onChange={e => {
                      const updated = [...editingSubjects];
                      updated[i].name = e.target.value;
                      setEditingSubjects(updated);
                    }}
                    placeholder="Tên môn học"
                    className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-rose-500"
                  />
                  <select
                    value={sub.type}
                    onChange={e => {
                      const updated = [...editingSubjects];
                      updated[i].type = e.target.value as any;
                      setEditingSubjects(updated);
                    }}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <option value="score">Chấm điểm (0-10)</option>
                    <option value="comment">Đánh giá (Đ/CĐ)</option>
                  </select>
                  <button
                    onClick={() => {
                      setEditingSubjects(editingSubjects.filter((_, idx) => idx !== i));
                    }}
                    className="p-1 text-slate-400 hover:text-rose-800"
                    title="Xóa môn"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newSub: Subject = {
                    id: `sub_${Date.now()}`,
                    name: 'Môn mới',
                    code: `SUB_${editingSubjects.length + 1}`,
                    type: 'score',
                    order: editingSubjects.length + 1,
                  };
                  setEditingSubjects([...editingSubjects, newSub]);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-rose-300 py-2.5 text-xs font-bold text-rose-800 hover:bg-rose-50"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm môn học mới</span>
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSubjectModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveSubjects}
                className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600"
              >
                Lưu cấu hình môn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nhập Excel Điểm Tháng Với Xem Trước */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Nhập bảng điểm tháng {selectedMonth} từ Excel
                </h3>
                <p className="text-xs text-slate-500">
                  Tải mẫu Excel, điền điểm số và tải lên để cập nhật bảng điểm
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="text-xs font-bold text-blue-800">1. Tải tệp mẫu bảng điểm</div>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Mẫu đã có sẵn mã số và họ tên của toàn bộ học sinh lớp bạn.
                  </p>
                  <button
                    onClick={() => config && downloadScoreTemplate(students, subjects, selectedMonth, config)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-2xs hover:bg-blue-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Tải mẫu điểm (.xlsx)</span>
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-800">2. Chọn tệp điểm từ máy</div>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelScoreFile}
                    className="mt-2.5 w-full text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-emerald-700"
                  />
                </div>
              </div>

              {/* Preview Rows */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Xem trước dữ liệu ({parsedRows.length} học sinh):</span>
                    {parseErrorsCount > 0 ? (
                      <span className="text-rose-800">{parseErrorsCount} dòng có lỗi</span>
                    ) : (
                      <span className="text-emerald-600">Tất cả các dòng hợp lệ</span>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-600 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Mã</th>
                          <th className="py-2 px-3">Họ và tên</th>
                          <th className="py-2 px-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className={row.isValid ? 'bg-white' : 'bg-rose-50 text-rose-800'}>
                            <td className="py-2 px-3 font-mono font-bold">{row.studentCode}</td>
                            <td className="py-2 px-3 font-semibold">{row.studentName}</td>
                            <td className="py-2 px-3">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Hợp lệ
                                </span>
                              ) : (
                                <span className="text-rose-800 font-semibold">
                                  {row.errors.join(', ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={parsedRows.length === 0}
                onClick={handleConfirmExcelScoreImport}
                className="rounded-xl bg-rose-500 px-5 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600 disabled:opacity-50"
              >
                Xác nhận lưu điểm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Khôi Phục Điểm Từ Sao Lưu */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Khôi phục bảng điểm
              </h3>
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="text-xs text-slate-600">
                Chọn bản sao lưu điểm trước đó để khôi phục:
              </div>

              {scoreBackups.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có bản sao lưu điểm nào được tạo.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {scoreBackups.map(b => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          Tháng {b.month} ({b.count} học sinh)
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(b.backupTime).toLocaleString('vi-VN')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestoreBackup(b.id)}
                        className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-600"
                      >
                        Khôi phục
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
