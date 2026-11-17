import * as XLSX from 'xlsx';
import { Student, Subject, MonthlyScoreRecord, ConductIncident, ConductSettings, ClassConfig, SemesterId } from '../types';
import {
  calculateSemesterConductSummary,
  formatSemesterLabel,
  getIncidentSemester,
} from '../utils/conduct';

// Helper to format date as DD/MM/YYYY
export function formatDateVN(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return dateStr;
}

// Parse various date representations from Excel into YYYY-MM-DD
export function parseExcelDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel date serial number
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  // check DD/MM/YYYY or D/M/YYYY
  const slashParts = str.split('/');
  if (slashParts.length === 3) {
    const d = slashParts[0].padStart(2, '0');
    const m = slashParts[1].padStart(2, '0');
    let y = slashParts[2];
    if (y.length === 2) y = '20' + y;
    return `${y}-${m}-${d}`;
  }
  // check YYYY-MM-DD
  const dashParts = str.split('-');
  if (dashParts.length === 3 && dashParts[0].length === 4) {
    return `${dashParts[0]}-${dashParts[1].padStart(2, '0')}-${dashParts[2].padStart(2, '0')}`;
  }
  return null;
}

// 1. Download Student Import Template
export function downloadStudentTemplate() {
  const wsData = [
    ['Mã số', 'Họ và tên', 'Giới tính', 'Ngày sinh (DD/MM/YYYY)', 'SĐT Phụ huynh', 'Tên Cha/Mẹ', 'Địa chỉ', 'Ghi chú'],
    ['01', 'Nguyễn Văn An', 'Nam', '15/09/2013', '0901234567', 'Nguyễn Văn Hùng', '123 Nguyễn Huệ, Q.1', ''],
    ['02', 'Trần Thị Bích', 'Nữ', '20/11/2013', '0912345678', 'Lê Thị Mai', '45 Lê Lợi, Q.1', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Column widths
  ws['!cols'] = [
    { wch: 10 },
    { wch: 26 },
    { wch: 12 },
    { wch: 25 },
    { wch: 18 },
    { wch: 22 },
    { wch: 30 },
    { wch: 25 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách học sinh');
  XLSX.writeFile(wb, 'Mau_Nhap_Danh_Sach_Hoc_Sinh.xlsx');
}

// 2. Parse uploaded student Excel
export interface ParsedStudentRow {
  rowNumber: number;
  code: string;
  fullName: string;
  gender: 'Nam' | 'Nữ';
  birthDate: string; // YYYY-MM-DD
  birthDateDisplay: string;
  parentPhone?: string;
  parentName?: string;
  address?: string;
  notes?: string;
  isValid: boolean;
  errors: string[];
}

export async function parseStudentExcel(file: File): Promise<{ rows: ParsedStudentRow[]; errorsCount: number }> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

  if (jsonData.length < 2) {
    throw new Error('Tệp Excel không có dữ liệu học sinh.');
  }

  const rows: ParsedStudentRow[] = [];
  let errorsCount = 0;

  // Header is row 0, data starts at row 1
  for (let i = 1; i < jsonData.length; i++) {
    const r = jsonData[i];
    if (!r || r.length === 0 || r.every((cell: any) => cell === '')) {
      continue; // Skip empty rows
    }

    const rowErrors: string[] = [];
    const code = String(r[0] || '').trim();
    const fullName = String(r[1] || '').trim();
    let genderStr = String(r[2] || '').trim().toLowerCase();
    const rawBirthDate = r[3];
    const parentPhone = String(r[4] || '').trim();
    const parentName = String(r[5] || '').trim();
    const address = String(r[6] || '').trim();
    const notes = String(r[7] || '').trim();

    if (!code) {
      rowErrors.push('Thiếu mã số/STT');
    }
    if (!fullName) {
      rowErrors.push('Thiếu họ và tên');
    }

    let gender: 'Nam' | 'Nữ' = 'Nam';
    if (genderStr === 'nữ' || genderStr === 'nu' || genderStr === 'female' || genderStr === 'f') {
      gender = 'Nữ';
    } else if (genderStr === 'nam' || genderStr === 'male' || genderStr === 'm') {
      gender = 'Nam';
    } else if (genderStr) {
      rowErrors.push('Giới tính không hợp lệ (nhập "Nam" hoặc "Nữ")');
    }

    const parsedDate = parseExcelDate(rawBirthDate);
    if (!parsedDate) {
      rowErrors.push('Ngày sinh không hợp lệ (định dạng DD/MM/YYYY)');
    }

    const isValid = rowErrors.length === 0;
    if (!isValid) errorsCount++;

    rows.push({
      rowNumber: i + 1,
      code: code.padStart(2, '0'),
      fullName,
      gender,
      birthDate: parsedDate || '',
      birthDateDisplay: formatDateVN(parsedDate || ''),
      parentPhone,
      parentName,
      address,
      notes,
      isValid,
      errors: rowErrors,
    });
  }

  return { rows, errorsCount };
}

// 3. Export student list to Excel
export function exportStudentListExcel(students: Student[], config: ClassConfig) {
  const wsData: any[][] = [
    [config.schoolName || 'TRƯỜNG HỌC'],
    [`LỚP: ${config.className} · NĂM HỌC: ${config.schoolYear}`],
    [`GIÁO VIÊN CHỦ NHIỆM: ${config.teacherName}`],
    ['DANH SÁCH HỌC SINH'],
    [],
    ['STT', 'Mã hồ sơ', 'Họ và tên', 'Giới tính', 'Ngày sinh', 'Tên đăng nhập', 'Mật khẩu ban đầu', 'SĐT Phụ huynh', 'Tên Cha/Mẹ', 'Địa chỉ'],
  ];

  students.forEach((s, idx) => {
    // Generate initial password DDMMYYYY
    const bDateParts = s.birthDate.split('-');
    const initialPass = bDateParts.length === 3 ? `${bDateParts[2]}${bDateParts[1]}${bDateParts[0]}` : '';
    wsData.push([
      idx + 1,
      s.code,
      s.fullName,
      s.gender,
      formatDateVN(s.birthDate),
      s.username,
      initialPass,
      s.parentPhone || '',
      s.parentName || '',
      s.address || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 26 },
    { wch: 10 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
    { wch: 30 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `DS Lớp ${config.className}`);
  XLSX.writeFile(wb, `Danh_Sach_Hoc_Sinh_${config.className}_${config.schoolYear}.xlsx`);
}

// 4. Download Score Import Template
export function downloadScoreTemplate(students: Student[], subjects: Subject[], monthStr: string, config: ClassConfig) {
  const headers = ['STT', 'Mã hồ sơ', 'Họ và tên', ...subjects.map(s => `${s.name} (${s.type === 'score' ? '0-10' : 'Đ/CĐ'})`)];
  const wsData: any[][] = [
    [config.schoolName || 'TRƯỜNG HỌC'],
    [`BẢNG ĐIỂM THÁNG: ${monthStr} · LỚP: ${config.className}`],
    ['Lưu ý: Nhập điểm từ 0.0 đến 10.0 (dấu phẩy hoặc dấu chấm). Ô trống là chưa có điểm. Môn nhận xét nhập Đ hoặc CĐ.'],
    [],
    headers,
  ];

  students.forEach((s, idx) => {
    const row = [idx + 1, s.code, s.fullName];
    // Empty cells for each subject
    subjects.forEach(() => row.push(''));
    wsData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Điểm ${monthStr}`);
  XLSX.writeFile(wb, `Mau_Nhap_Diem_${config.className}_${monthStr}.xlsx`);
}

// 5. Parse uploaded score Excel
export interface ParsedScoreRow {
  rowNumber: number;
  studentCode: string;
  studentName: string;
  studentId?: string;
  scores: Record<string, { score?: number | null; comment?: string }>;
  isValid: boolean;
  errors: string[];
}

export async function parseScoreExcel(
  file: File,
  subjects: Subject[],
  students: Student[]
): Promise<{ rows: ParsedScoreRow[]; errorsCount: number }> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });

  // Locate the header row containing "Họ và tên" or "Mã hồ sơ"
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
    const rowStr = (jsonData[i] || []).map(c => String(c).toLowerCase()).join(' ');
    if (rowStr.includes('họ và tên') || rowStr.includes('mã hồ sơ')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Không tìm thấy dòng tiêu đề (cột "Mã hồ sơ", "Họ và tên") trong tệp Excel.');
  }

  const headerRow = jsonData[headerRowIndex];
  // Map subject column indices
  const subjectColMap: { subjectId: string; colIdx: number; type: 'score' | 'comment' }[] = [];

  subjects.forEach(sub => {
    const colIdx = headerRow.findIndex((colVal: any) =>
      String(colVal).toLowerCase().includes(sub.name.toLowerCase())
    );
    if (colIdx !== -1) {
      subjectColMap.push({ subjectId: sub.id, colIdx, type: sub.type });
    }
  });

  // Find studentCode & name column indices
  const codeColIdx = headerRow.findIndex((c: any) => String(c).toLowerCase().includes('mã'));
  const nameColIdx = headerRow.findIndex((c: any) => String(c).toLowerCase().includes('họ và tên'));

  const studentByCodeMap = new Map<string, Student>();
  students.forEach(s => studentByCodeMap.set(s.code.padStart(2, '0'), s));

  const rows: ParsedScoreRow[] = [];
  let errorsCount = 0;

  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const r = jsonData[i];
    if (!r || r.length === 0 || r.every((cell: any) => cell === '')) continue;

    const rowErrors: string[] = [];
    const rawCode = codeColIdx !== -1 ? String(r[codeColIdx] || '').trim() : '';
    const studentCode = rawCode.padStart(2, '0');
    const studentName = nameColIdx !== -1 ? String(r[nameColIdx] || '').trim() : '';

    const matchedStudent = studentByCodeMap.get(studentCode);
    if (!matchedStudent) {
      rowErrors.push(`Mã học sinh "${studentCode}" không tồn tại trong danh sách lớp`);
    }

    const rowScores: Record<string, { score?: number | null; comment?: string }> = {};

    subjectColMap.forEach(({ subjectId, colIdx, type }) => {
      const rawVal = r[colIdx];
      if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '' || String(rawVal).trim() === '-') {
        // Empty / not marked
        rowScores[subjectId] = { score: null, comment: '' };
        return;
      }

      if (type === 'score') {
        // Replace comma with dot
        const numStr = String(rawVal).trim().replace(',', '.');
        const num = parseFloat(numStr);
        if (isNaN(num)) {
          rowErrors.push(`Điểm môn không hợp lệ: "${rawVal}"`);
        } else if (num < 0 || num > 10) {
          rowErrors.push(`Điểm phải từ 0 đến 10: "${rawVal}"`);
        } else {
          rowScores[subjectId] = { score: Math.round(num * 10) / 10 };
        }
      } else {
        const commentStr = String(rawVal).trim();
        rowScores[subjectId] = { comment: commentStr };
      }
    });

    const isValid = rowErrors.length === 0;
    if (!isValid) errorsCount++;

    rows.push({
      rowNumber: i + 1,
      studentCode,
      studentName: matchedStudent?.fullName || studentName,
      studentId: matchedStudent?.id,
      scores: rowScores,
      isValid,
      errors: rowErrors,
    });
  }

  return { rows, errorsCount };
}

// 6. Export Monthly Scores to Excel
export function exportMonthlyScoresExcel(
  students: Student[],
  subjects: Subject[],
  scoreRecords: Record<string, MonthlyScoreRecord>,
  monthStr: string,
  config: ClassConfig
) {
  const subjectHeaders = subjects.map(s => s.name);
  const headers = ['STT', 'Mã hồ sơ', 'Họ và tên', ...subjectHeaders, 'ĐTB Tháng'];

  const wsData: any[][] = [
    [config.schoolName || 'TRƯỜNG HỌC'],
    [`BẢNG ĐIỂM HỌC TẬP THÁNG: ${monthStr} · LỚP: ${config.className} · NĂM HỌC: ${config.schoolYear}`],
    [`GIÁO VIÊN CHỦ NHIỆM: ${config.teacherName}`],
    [],
    headers,
  ];

  students.forEach((s, idx) => {
    const record = scoreRecords[s.id];
    const row: any[] = [idx + 1, s.code, s.fullName];

    subjects.forEach(sub => {
      const scoreObj = record?.scores?.[sub.id];
      if (!scoreObj) {
        row.push('-');
      } else if (sub.type === 'score') {
        row.push(scoreObj.score !== null && scoreObj.score !== undefined ? scoreObj.score : '-');
      } else {
        row.push(scoreObj.comment || '-');
      }
    });

    // GPA
    row.push(record?.gpa !== null && record?.gpa !== undefined ? record.gpa.toFixed(2) : '-');
    wsData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Bảng điểm ${monthStr}`);
  XLSX.writeFile(wb, `Bang_Diem_Thang_${monthStr}_${config.className}.xlsx`);
}

// 7. Export Single Student Conduct & Violations Report
export function exportStudentViolationsExcel(
  student: Student,
  incidents: ConductIncident[],
  periodLabel: string,
  config: ClassConfig,
  options?: {
    schoolYear?: string;
    semester?: SemesterId | 'ALL';
    settings?: ConductSettings | null;
  }
) {
  const targetYear = options?.schoolYear || config.schoolYear;
  const targetSem = options?.semester || 'ALL';

  const scopedIncidents = incidents.filter(inc => {
    const tag = getIncidentSemester(inc, config);
    if (options?.schoolYear && tag.schoolYear !== targetYear) return false;
    if (options?.semester && options.semester !== 'ALL' && tag.semester !== options.semester) return false;
    return true;
  });

  // Only violations for Sheet 1 (kept compatible with existing report title) + full semester info
  const violations = scopedIncidents.filter(inc => inc.category === 'violation');

  // Sheet 1: Chi tiết vi phạm
  const sheet1Data: any[][] = [
    [config.schoolName || 'TRƯỜNG HỌC'],
    [`LỚP: ${config.className} · GVCN: ${config.teacherName} · NĂM HỌC: ${targetYear}`],
    [`BÁO CÁO VI PHẠM KỶ LUẬT · KỲ BÁO CÁO: ${periodLabel}`],
    [`HỌC SINH: ${student.fullName.toUpperCase()} · MÃ HỒ SƠ: ${student.code} · NGÀY SINH: ${formatDateVN(student.birthDate)}`],
    [],
    ['STT', 'Năm học', 'Học kỳ', 'Ngày xảy ra', 'Tên lỗi / Quy tắc', 'Nội dung chi tiết', 'Điểm trừ', 'Ghi chú', 'Người ghi nhận'],
  ];

  violations.forEach((v, idx) => {
    const tag = getIncidentSemester(v, config);
    sheet1Data.push([
      idx + 1,
      tag.schoolYear,
      formatSemesterLabel(tag.semester),
      formatDateVN(v.date),
      v.ruleName,
      v.content,
      `-${Math.abs(v.points)}`,
      v.note || '',
      v.recordedBy || config.teacherName,
    ]);
  });

  if (violations.length === 0) {
    sheet1Data.push(['-', targetYear, formatSemesterLabel(targetSem), 'Không có vi phạm trong kỳ báo cáo', '', '', '0', '', '']);
  }

  // Sheet 2: Tổng hợp theo lỗi & điểm thi đua từng học kỳ
  const summaryMap = new Map<string, { semesterLabel: string; count: number; totalPoints: number }>();
  let totalAllPoints = 0;
  let totalAllCount = 0;

  violations.forEach(v => {
    const tag = getIncidentSemester(v, config);
    const semLabel = formatSemesterLabel(tag.semester);
    const mapKey = `${tag.semester}__${v.ruleName}`;
    const cur = summaryMap.get(mapKey) || { semesterLabel: semLabel, count: 0, totalPoints: 0 };
    cur.count += 1;
    cur.totalPoints += Math.abs(v.points);
    summaryMap.set(mapKey, cur);
    totalAllCount += 1;
    totalAllPoints += Math.abs(v.points);
  });

  const sheet2Data: any[][] = [
    [config.schoolName || 'TRƯỜNG HỌC'],
    [`LỚP: ${config.className} · GVCN: ${config.teacherName} · NĂM HỌC: ${targetYear}`],
    [`TỔNG HỢP THI ĐUA & VI PHẠM: ${student.fullName.toUpperCase()} · ${periodLabel}`],
    [],
  ];

  if (options?.settings) {
    sheet2Data.push(['Học kỳ', 'Điểm khởi đầu', 'Tổng điểm thưởng', 'Tổng điểm trừ', 'Điểm thi đua còn lại', 'Xếp loại rèn luyện']);
    const semestersToShow: SemesterId[] = targetSem === 'ALL' ? ['HK1', 'HK2'] : [targetSem];
    semestersToShow.forEach(sem => {
      const s = calculateSemesterConductSummary(student.id, targetYear, sem, incidents, options.settings, config);
      sheet2Data.push([
        formatSemesterLabel(sem),
        s.initialScore,
        `+${s.totalReward}`,
        `-${s.totalViolation}`,
        s.finalScore,
        s.rank,
      ]);
    });
    sheet2Data.push([]);
  }

  sheet2Data.push(['STT', 'Học kỳ', 'Tên lỗi vi phạm', 'Số lượt vi phạm', 'Tổng điểm trừ']);

  let sumIdx = 1;
  summaryMap.forEach((val, key) => {
    const ruleName = key.split('__').slice(1).join('__');
    sheet2Data.push([sumIdx++, val.semesterLabel, ruleName, val.count, `-${val.totalPoints}`]);
  });

  sheet2Data.push(['', '', 'TỔNG CỘNG VI PHẠM', totalAllCount, `-${totalAllPoints}`]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 28 },
    { wch: 38 },
    { wch: 12 },
    { wch: 25 },
    { wch: 20 },
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 14 },
    { wch: 16 },
    { wch: 30 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Chi tiết vi phạm');
  XLSX.utils.book_append_sheet(wb, ws2, 'Tổng hợp theo kỳ');

  const cleanPeriod = periodLabel.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(wb, `Vi_Pham_${student.code}_${cleanPeriod}.xlsx`);
}

// 8. Export Whole Class Conduct Report (HK1, HK2, or ALL - separate columns per semester)
export function exportClassConductExcel(
  students: Student[],
  incidents: ConductIncident[],
  settings: ConductSettings,
  schoolYear: string,
  semesterScope: SemesterId | 'ALL',
  config: ClassConfig
) {
  const activeStudents = students.filter(s => s.status === 'active');
  const periodLabel = formatSemesterLabel(semesterScope);

  const studentById = new Map<string, Student>();
  activeStudents.forEach(s => studentById.set(s.id, s));

  const wsData: any[][] = [
    [config.schoolName || 'TRƯỜNG HỌC'],
    [`BÁO CÁO THI ĐUA NỀ NẾP LỚP: ${config.className} · KỲ: ${periodLabel} · NĂM HỌC: ${schoolYear}`],
    [`GIÁO VIÊN CHỦ NHIỆM: ${config.teacherName}`],
    [],
  ];

  if (semesterScope === 'ALL') {
    wsData.push([
      'STT',
      'Mã hồ sơ',
      'Họ và tên',
      'Điểm đầu kỳ HK1',
      'Tổng thưởng HK1',
      'Tổng trừ HK1',
      'Điểm thi đua HK1',
      'Hạnh kiểm HK1',
      'Điểm đầu kỳ HK2',
      'Tổng thưởng HK2',
      'Tổng trừ HK2',
      'Điểm thi đua HK2',
      'Hạnh kiểm HK2',
    ]);

    activeStudents.forEach((s, idx) => {
      const hk1 = calculateSemesterConductSummary(s.id, schoolYear, 'HK1', incidents, settings, config);
      const hk2 = calculateSemesterConductSummary(s.id, schoolYear, 'HK2', incidents, settings, config);

      wsData.push([
        idx + 1,
        s.code,
        s.fullName,
        hk1.initialScore,
        `+${hk1.totalReward}`,
        `-${hk1.totalViolation}`,
        hk1.finalScore,
        hk1.rank,
        hk2.initialScore,
        `+${hk2.totalReward}`,
        `-${hk2.totalViolation}`,
        hk2.finalScore,
        hk2.rank,
      ]);
    });
  } else {
    const semTag = semesterScope === 'HK2' ? 'HK2' : 'HK1';
    wsData.push([
      'STT',
      'Mã hồ sơ',
      'Họ và tên',
      `Điểm khởi đầu (${semTag})`,
      'Tổng điểm thưởng',
      'Tổng điểm trừ',
      `Điểm thi đua (${semTag})`,
      `Hạnh kiểm (${semTag})`,
      'Số lần vi phạm',
      'Số lần khen thưởng',
    ]);

    activeStudents.forEach((s, idx) => {
      const summary = calculateSemesterConductSummary(s.id, schoolYear, semTag, incidents, settings, config);

      wsData.push([
        idx + 1,
        s.code,
        s.fullName,
        summary.initialScore,
        `+${summary.totalReward}`,
        `-${summary.totalViolation}`,
        summary.finalScore,
        summary.rank,
        summary.violationCount,
        summary.rewardCount,
      ]);
    });
  }

  // Sheet 2: Chi tiết sự việc trong phạm vi báo cáo
  const scopedIncidents = incidents
    .filter(inc => {
      if (!studentById.has(inc.studentId)) return false;
      const tag = getIncidentSemester(inc, config);
      if (tag.schoolYear !== schoolYear) return false;
      if (semesterScope !== 'ALL' && tag.semester !== semesterScope) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const detailData: any[][] = [
    [config.schoolName || 'TRƯỜNG HỌC'],
    [`LỊCH SỬ THI ĐUA & KỶ LUẬT · LỚP ${config.className} · ${periodLabel} · NĂM HỌC ${schoolYear}`],
    [],
    ['STT', 'Mã hồ sơ', 'Họ và tên', 'Năm học', 'Học kỳ', 'Ngày xảy ra', 'Phân loại', 'Quy tắc', 'Nội dung sự việc', 'Điểm', 'Ghi chú', 'Người ghi nhận'],
  ];

  scopedIncidents.forEach((inc, idx) => {
    const stu = studentById.get(inc.studentId);
    const tag = getIncidentSemester(inc, config);
    detailData.push([
      idx + 1,
      stu?.code || '',
      stu?.fullName || '',
      tag.schoolYear,
      formatSemesterLabel(tag.semester),
      formatDateVN(inc.date),
      inc.category === 'reward' ? 'Khen thưởng' : 'Vi phạm',
      inc.ruleName,
      inc.content,
      inc.category === 'reward' ? `+${Math.abs(inc.points)}` : `-${Math.abs(inc.points)}`,
      inc.note || '',
      inc.recordedBy || config.teacherName,
    ]);
  });

  if (scopedIncidents.length === 0) {
    detailData.push(['-', '', 'Không có sự việc nào trong kỳ báo cáo', schoolYear, periodLabel, '', '', '', '', '', '', '']);
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = semesterScope === 'ALL'
    ? [
        { wch: 6 },
        { wch: 12 },
        { wch: 26 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 16 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 16 },
        { wch: 14 },
      ]
    : [
        { wch: 6 },
        { wch: 12 },
        { wch: 26 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 15 },
        { wch: 16 },
        { wch: 18 },
      ];

  const wsDetail = XLSX.utils.aoa_to_sheet(detailData);
  wsDetail['!cols'] = [
    { wch: 6 },
    { wch: 10 },
    { wch: 24 },
    { wch: 12 },
    { wch: 12 },
    { wch: 13 },
    { wch: 14 },
    { wch: 26 },
    { wch: 34 },
    { wch: 10 },
    { wch: 22 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  const cleanSheetName = `Thi đua ${periodLabel}`.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, cleanSheetName);
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi tiết sự việc');

  const safePeriod = periodLabel.replace(/[/\\?%*:|"<> ]+/g, '_');
  XLSX.writeFile(wb, `Bao_Cao_Thi_Dua_${config.className}_${schoolYear}_${safePeriod}.xlsx`);
}
