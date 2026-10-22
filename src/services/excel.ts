import * as XLSX from 'xlsx';
import { Student, Subject, MonthlyScoreRecord, ConductIncident, ConductSettings, ClassConfig } from '../types';

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

// 7. Export Single Student Violations Report (Item 9: 2 sheets)
export function exportStudentViolationsExcel(
  student: Student,
  incidents: ConductIncident[],
  periodLabel: string,
  config: ClassConfig
) {
  // Only violations
  const violations = incidents.filter(inc => inc.category === 'violation');

  // Sheet 1: Chi tiết vi phạm
  const sheet1Data: any[][] = [
    [config.schoolName || 'TRƯỜNG HỌC'],
    [`LỚP: ${config.className} · GVCN: ${config.teacherName} · NĂM HỌC: ${config.schoolYear}`],
    [`BÁO CÁO VI PHẠM KỶ LUẬT · KỲ BÁO CÁO: ${periodLabel}`],
    [`HỌC SINH: ${student.fullName.toUpperCase()} · MÃ HỒ SƠ: ${student.code} · NGÀY SINH: ${formatDateVN(student.birthDate)}`],
    [],
    ['STT', 'Ngày xảy ra', 'Tên lỗi / Quy tắc', 'Nội dung chi tiết', 'Điểm trừ', 'Ghi chú', 'Người ghi nhận'],
  ];

  violations.forEach((v, idx) => {
    sheet1Data.push([
      idx + 1,
      formatDateVN(v.date),
      v.ruleName,
      v.content,
      `-${Math.abs(v.points)}`,
      v.note || '',
      v.recordedBy || config.teacherName,
    ]);
  });

  if (violations.length === 0) {
    sheet1Data.push(['-', 'Không có vi phạm trong kỳ báo cáo', '', '', '0', '', '']);
  }

  // Sheet 2: Tổng hợp theo lỗi
  // Group by ruleName
  const summaryMap = new Map<string, { count: number; totalPoints: number }>();
  let totalAllPoints = 0;
  let totalAllCount = 0;

  violations.forEach(v => {
    const cur = summaryMap.get(v.ruleName) || { count: 0, totalPoints: 0 };
    cur.count += 1;
    cur.totalPoints += Math.abs(v.points);
    summaryMap.set(v.ruleName, cur);
    totalAllCount += 1;
    totalAllPoints += Math.abs(v.points);
  });

  const sheet2Data: any[][] = [
    [config.schoolName || 'TRƯỜNG HỌC'],
    [`LỚP: ${config.className} · GVCN: ${config.teacherName}`],
    [`TỔNG HỢP VI PHẠM THEO LỖI: ${student.fullName.toUpperCase()} · ${periodLabel}`],
    [],
    ['STT', 'Tên lỗi vi phạm', 'Số lượt vi phạm', 'Tổng điểm trừ'],
  ];

  let sumIdx = 1;
  summaryMap.forEach((val, key) => {
    sheet2Data.push([sumIdx++, key, val.count, `-${val.totalPoints}`]);
  });

  sheet2Data.push(['', 'TỔNG CỘNG', totalAllCount, `-${totalAllPoints}`]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 28 },
    { wch: 38 },
    { wch: 12 },
    { wch: 25 },
    { wch: 20 },
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 18 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, 'Chi tiết vi phạm');
  XLSX.utils.book_append_sheet(wb, ws2, 'Tổng hợp theo lỗi');

  const cleanPeriod = periodLabel.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(wb, `Vi_Pham_${student.code}_${cleanPeriod}.xlsx`);
}

// 8. Export Whole Class Conduct Report
export function exportClassConductExcel(
  students: Student[],
  incidents: ConductIncident[],
  settings: ConductSettings,
  periodLabel: string,
  config: ClassConfig
) {
  const wsData: any[][] = [
    [config.schoolName || 'TRƯỜNG HỌC'],
    [`BÁO CÁO THI ĐUA NỀ NẾP LỚP: ${config.className} · KỲ: ${periodLabel}`],
    [`GIÁO VIÊN CHỦ NHIỆM: ${config.teacherName} · NĂM HỌC: ${config.schoolYear}`],
    [],
    ['STT', 'Mã hồ sơ', 'Họ và tên', 'Điểm khởi đầu', 'Tổng điểm cộng', 'Tổng điểm trừ', 'Điểm thi đua', 'Xếp loại', 'Số lần vi phạm', 'Số lần khen thưởng'],
  ];

  students.forEach((s, idx) => {
    const studentIncidents = incidents.filter(inc => inc.studentId === s.id);
    let totalAdd = 0;
    let totalSub = 0;
    let violationCount = 0;
    let rewardCount = 0;

    studentIncidents.forEach(inc => {
      if (inc.category === 'reward') {
        totalAdd += inc.points;
        rewardCount++;
      } else {
        totalSub += Math.abs(inc.points);
        violationCount++;
      }
    });

    const finalScore = settings.initialScore + totalAdd - totalSub;
    let rank = 'Chưa đạt';
    if (finalScore >= settings.thresholdGood) rank = 'Tốt';
    else if (finalScore >= settings.thresholdFair) rank = 'Khá';
    else if (finalScore >= settings.thresholdPass) rank = 'Đạt';

    wsData.push([
      idx + 1,
      s.code,
      s.fullName,
      settings.initialScore,
      `+${totalAdd}`,
      `-${totalSub}`,
      finalScore,
      rank,
      violationCount,
      rewardCount,
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 26 },
    { wch: 14 },
    { wch: 15 },
    { wch: 15 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Thi đua ${periodLabel}`);
  XLSX.writeFile(wb, `Bao_Cao_Thi_Dua_${config.className}_${periodLabel}.xlsx`);
}
