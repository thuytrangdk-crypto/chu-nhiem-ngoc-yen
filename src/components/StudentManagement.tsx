import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Student } from '../types';
import {
  downloadStudentTemplate,
  parseStudentExcel,
  exportStudentListExcel,
  exportClassConductExcel,
  ParsedStudentRow,
  formatDateVN,
} from '../services/excel';
import {
  Search,
  LayoutGrid,
  List,
  FileSpreadsheet,
  UserPlus,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  X,
  Award,
  Calendar,
} from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const { students, config, openStudentProfile, refreshData, showToast, userRole, conductSettings } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'Nam' | 'Nữ'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Add/Edit student modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);

  // Excel Import modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'append_or_update' | 'replace_all'>('append_or_update');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [parseErrorsCount, setParseErrorsCount] = useState(0);
  const [isParsing, setIsParsing] = useState(false);

  // Filter students
  const filteredStudents = students.filter(s => {
    if (s.status === 'archived') return false;
    const matchSearch =
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.includes(searchTerm);
    const matchGender = genderFilter === 'all' || s.gender === genderFilter;
    return matchSearch && matchGender;
  });

  // Handle Save Student (Add or Edit)
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent?.code || !editingStudent?.fullName || !editingStudent?.birthDate) {
      showToast('Vui lòng điền đầy đủ các mục bắt buộc', 'error');
      return;
    }

    try {
      if (editingStudent.id) {
        await api.updateStudent(editingStudent.id, editingStudent);
        showToast(`Đã cập nhật thông tin học sinh ${editingStudent.fullName}`);
      } else {
        await api.addStudent(editingStudent);
        showToast(`Đã thêm học sinh ${editingStudent.fullName} vào danh sách`);
      }
      setIsModalOpen(false);
      setEditingStudent(null);
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle Delete Student
  const handleDeleteStudent = async (student: Student) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa học sinh "${student.fullName}" (Mã: ${student.code})?`)) {
      return;
    }
    try {
      await api.deleteStudent(student.id, true);
      showToast(`Đã xóa học sinh ${student.fullName}`);
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle Excel File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsParsing(true);
      const result = await parseStudentExcel(file);
      setParsedRows(result.rows);
      setParseErrorsCount(result.errorsCount);
      if (result.errorsCount > 0) {
        showToast(`Phát hiện ${result.errorsCount} dòng có lỗi trong tệp Excel. Vui lòng kiểm tra lại.`, 'error');
      } else {
        showToast(`Đã đọc thành công ${result.rows.length} học sinh từ tệp.`);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // Submit Batch Import
  const handleConfirmBatchImport = async () => {
    if (parsedRows.length === 0) return;
    const validRows = parsedRows.filter(r => r.isValid);

    if (validRows.length === 0) {
      showToast('Không có dòng hợp lệ nào để nhập.', 'error');
      return;
    }

    if (importMode === 'replace_all') {
      const confirmReplace = window.confirm(
        'CẢNH BÁO: Chế độ "Thay thế toàn bộ" sẽ xóa danh sách học sinh hiện tại và thay bằng danh sách mới. Bạn có chắc chắn muốn tiếp tục?'
      );
      if (!confirmReplace) return;
    }

    try {
      const res = await api.batchImportStudents(importMode, validRows);
      showToast(res.message);
      setIsImportModalOpen(false);
      setParsedRows([]);
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Export class conduct report
  const handleExportConductReport = async () => {
    if (!config || !conductSettings) return;
    try {
      const incidents = await api.getIncidents();
      exportClassConductExcel(students, incidents, conductSettings, 'Toàn năm học', config);
      showToast('Đã xuất báo cáo thi đua cả lớp thành công');
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
      {/* Top Toolbar matching Image 4 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search & Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative min-w-[200px] sm:min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo họ tên, mã..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-rose-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-xs focus:border-rose-400 focus:outline-hidden"
            />
          </div>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value as any)}
            className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs focus:border-rose-400 focus:outline-hidden"
          >
            <option value="all">Tất cả giới tính</option>
            <option value="Nam">Nam</option>
            <option value="Nữ">Nữ</option>
          </select>

          {/* View Mode Toggle: Grid or Table */}
          <div className="flex items-center rounded-xl border border-rose-200 bg-white p-1 shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-rose-50 text-rose-800'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Dạng thẻ"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-lg p-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-rose-50 text-rose-800'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Dạng danh sách bảng"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right Action Buttons */}
        {userRole === 'teacher' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => config && exportStudentListExcel(students, config)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 transition-colors"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={handleExportConductReport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-800 shadow-xs hover:bg-purple-100 transition-colors"
            >
              <Award className="h-4 w-4 text-purple-600" />
              <span>Xuất Excel thi đua</span>
            </button>

            <button
              onClick={() => {
                setParsedRows([]);
                setIsImportModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-bold text-emerald-700 shadow-xs hover:bg-emerald-50 transition-colors"
            >
              <Upload className="h-4 w-4 text-emerald-600" />
              <span>Nhập Excel</span>
            </button>

            <button
              onClick={() => {
                setEditingStudent({
                  gender: 'Nam',
                  code: String(students.length + 1).padStart(2, '0'),
                  birthDate: '2013-01-01',
                });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Thêm HS</span>
            </button>
          </div>
        )}
      </div>

      {/* Zero students state */}
      {filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-white p-12 text-center shadow-xs">
          <FileSpreadsheet className="mx-auto h-12 w-12 text-rose-800" />
          <h3 className="mt-3 text-base font-bold text-slate-800">
            {students.length === 0
              ? 'Chưa có học sinh nào trong lớp'
              : 'Không tìm thấy học sinh phù hợp'}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {students.length === 0
              ? 'Bạn có thể tải tệp mẫu Excel và nhập danh sách học sinh hoặc nhấn nút "+ Thêm HS" để tạo từng em.'
              : 'Thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc giới tính.'}
          </p>
          {students.length === 0 && userRole === 'teacher' && (
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={downloadStudentTemplate}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                <span>Tải mẫu Excel</span>
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600"
              >
                <Upload className="h-4 w-4" />
                <span>Nhập tệp Excel ngay</span>
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW (Matching Image 4) */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredStudents.map(student => {
            const letter = getAvatarLetter(student.fullName);
            return (
              <div
                key={student.id}
                onClick={() => openStudentProfile(student.id)}
                className="group relative flex flex-col items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md cursor-pointer"
              >
                {/* Big Avatar */}
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-50 to-pink-100 text-xl font-extrabold text-rose-800 ring-4 ring-rose-50/50">
                  {letter}
                </div>

                {/* Name */}
                <div className="mt-3 w-full text-center">
                  <div className="truncate text-xs font-extrabold text-slate-900 uppercase group-hover:text-rose-800 transition-colors">
                    {student.fullName}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    <span
                      className={`font-semibold ${
                        student.gender === 'Nữ' ? 'text-rose-800' : 'text-blue-500'
                      }`}
                    >
                      {student.gender}
                    </span>{' '}
                    · {formatDateVN(student.birthDate)}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400 font-mono">
                    ID: {student.code}
                  </div>
                </div>

                {/* Action buttons on card hover */}
                {userRole === 'teacher' && (
                  <div
                    onClick={e => e.stopPropagation()}
                    className="mt-3 flex w-full items-center justify-center gap-1 border-t border-slate-100 pt-2 opacity-80 group-hover:opacity-100"
                  >
                    <button
                      onClick={() => {
                        setEditingStudent(student);
                        setIsModalOpen(true);
                      }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="Sửa thông tin"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(student)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-800"
                      title="Xóa học sinh"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">STT</th>
                  <th className="py-3 px-4">Mã số</th>
                  <th className="py-3 px-4">Họ và tên</th>
                  <th className="py-3 px-4">Giới tính</th>
                  <th className="py-3 px-4">Ngày sinh</th>
                  <th className="py-3 px-4">Tên đăng nhập</th>
                  <th className="py-3 px-4">SĐT Phụ huynh</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, idx) => (
                  <tr
                    key={student.id}
                    onClick={() => openStudentProfile(student.id)}
                    className="hover:bg-rose-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">{student.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 uppercase">{student.fullName}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          student.gender === 'Nữ' ? 'text-rose-800' : 'text-blue-600'
                        }`}
                      >
                        {student.gender}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDateVN(student.birthDate)}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{student.username}</td>
                    <td className="py-3 px-4 text-slate-600">{student.parentPhone || '-'}</td>
                    <td
                      onClick={e => e.stopPropagation()}
                      className="py-3 px-4 text-right"
                    >
                      {userRole === 'teacher' && (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingStudent(student);
                              setIsModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-800"
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Thêm/Sửa Học Sinh */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingStudent?.id ? 'Chỉnh sửa thông tin học sinh' : 'Thêm học sinh mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Mã số (STT) *</label>
                  <input
                    type="text"
                    required
                    placeholder="01, 02..."
                    value={editingStudent?.code || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, code: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Giới tính *</label>
                  <select
                    value={editingStudent?.gender || 'Nam'}
                    onChange={e => setEditingStudent({ ...editingStudent, gender: e.target.value as any })}
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
                  placeholder="Nguyễn Văn A"
                  value={editingStudent?.fullName || ''}
                  onChange={e => setEditingStudent({ ...editingStudent, fullName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Ngày sinh *</label>
                <input
                  type="date"
                  required
                  value={editingStudent?.birthDate || ''}
                  onChange={e => setEditingStudent({ ...editingStudent, birthDate: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">SĐT Phụ huynh</label>
                  <input
                    type="tel"
                    placeholder="0912..."
                    value={editingStudent?.parentPhone || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, parentPhone: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">Tên Phụ huynh</label>
                  <input
                    type="text"
                    placeholder="Cha/Mẹ..."
                    value={editingStudent?.parentName || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, parentName: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Địa chỉ</label>
                <input
                  type="text"
                  placeholder="Địa chỉ cư trú..."
                  value={editingStudent?.address || ''}
                  onChange={e => setEditingStudent({ ...editingStudent, address: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600"
                >
                  Lưu học sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nhập Excel Danh Sách Học Sinh với Xem Trước */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl border border-rose-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Nhập danh sách học sinh từ Excel
                </h3>
                <p className="text-xs text-slate-500">
                  Tải mẫu Excel, điền dữ liệu và tải lên để nhập vào hệ thống
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Step 1 & Step 2 */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                  <div className="text-xs font-bold text-rose-800">1. Tải tệp mẫu Excel</div>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Sử dụng đúng cấu trúc các cột để đảm bảo dữ liệu được nhận diện chính xác.
                  </p>
                  <button
                    onClick={downloadStudentTemplate}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Tải mẫu (.xlsx)</span>
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-bold text-slate-800">2. Chọn tệp Excel từ máy</div>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="mt-2.5 w-full text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-rose-500 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-slate-800 hover:file:bg-rose-600"
                  />
                  {isParsing && <div className="mt-2 text-xs text-rose-800 font-semibold">Đang xử lý dữ liệu...</div>}
                </div>
              </div>

              {/* Import Mode Options (Item 6) */}
              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <div className="text-xs font-bold text-slate-800 mb-2">Chế độ nhập:</div>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append_or_update"
                      checked={importMode === 'append_or_update'}
                      onChange={() => setImportMode('append_or_update')}
                      className="text-rose-800 focus:ring-rose-400"
                    />
                    <span>
                      <strong className="text-slate-900">Bổ sung / cập nhật:</strong> Giữ danh sách hiện tại, cập nhật học sinh đã có theo mã số
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace_all"
                      checked={importMode === 'replace_all'}
                      onChange={() => setImportMode('replace_all')}
                      className="text-rose-800 focus:ring-rose-400"
                    />
                    <span>
                      <strong className="text-rose-700">Thay thế toàn bộ:</strong> Xóa danh sách cũ và nhập danh sách mới
                    </span>
                  </label>
                </div>
              </div>

              {/* Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Xem trước dữ liệu ({parsedRows.length} dòng):
                    </span>
                    {parseErrorsCount > 0 ? (
                      <span className="text-xs font-bold text-rose-800">
                        {parseErrorsCount} dòng bị lỗi (sẽ bị bỏ qua)
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600">
                        Tất cả các dòng hợp lệ
                      </span>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-600 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Dòng</th>
                          <th className="py-2 px-3">Mã</th>
                          <th className="py-2 px-3">Họ và tên</th>
                          <th className="py-2 px-3">Giới tính</th>
                          <th className="py-2 px-3">Ngày sinh</th>
                          <th className="py-2 px-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedRows.map((row, idx) => (
                          <tr
                            key={idx}
                            className={row.isValid ? 'bg-white' : 'bg-rose-50/70 text-rose-800'}
                          >
                            <td className="py-2 px-3 font-mono">{row.rowNumber}</td>
                            <td className="py-2 px-3 font-mono font-bold">{row.code}</td>
                            <td className="py-2 px-3 font-semibold">{row.fullName}</td>
                            <td className="py-2 px-3">{row.gender}</td>
                            <td className="py-2 px-3">{row.birthDateDisplay}</td>
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

            {/* Modal Footer */}
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
                onClick={handleConfirmBatchImport}
                className="rounded-xl bg-rose-500 px-5 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600 disabled:opacity-50"
              >
                Xác nhận nhập vào lớp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
