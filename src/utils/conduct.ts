import {
  ClassConfig,
  ConductIncident,
  ConductSemesterStudentSummary,
  ConductSettings,
  SchoolYearSemesters,
  SemesterId,
} from '../types';

export function getLocalTodayDateStr(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatSemesterLabel(semester: SemesterId | 'ALL'): string {
  if (semester === 'HK1') return 'Học kỳ I';
  if (semester === 'HK2') return 'Học kỳ II';
  return 'Cả năm';
}

export function getConductSemesterKey(schoolYear: string, semester: SemesterId): string {
  return `${schoolYear}__${semester}`;
}

export function parseNextSchoolYear(schoolYear: string): string | null {
  const match = String(schoolYear || '').trim().match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;
  const start = parseInt(match[1], 10) + 1;
  const end = parseInt(match[2], 10) + 1;
  return `${start}-${end}`;
}

export function createDefaultSchoolYearSemesters(schoolYear: string): SchoolYearSemesters {
  const match = String(schoolYear || '').trim().match(/^(\d{4})-(\d{4})$/);
  const y1 = match ? parseInt(match[1], 10) : new Date().getFullYear();
  const y2 = match ? parseInt(match[2], 10) : y1 + 1;

  return {
    schoolYear: `${y1}-${y2}`,
    hk1: {
      startDate: `${y1}-09-05`,
      endDate: `${y2}-01-17`,
    },
    hk2: {
      startDate: `${y2}-01-18`,
      endDate: `${y2}-05-31`,
    },
  };
}

export function getEffectiveSemesterConfigs(
  config?: Partial<ClassConfig> | null
): Record<string, SchoolYearSemesters> {
  const result: Record<string, SchoolYearSemesters> = {};
  const raw = config?.semesterConfigs || {};

  for (const [key, val] of Object.entries(raw)) {
    if (val && val.hk1?.startDate && val.hk1?.endDate && val.hk2?.startDate && val.hk2?.endDate) {
      result[key] = {
        schoolYear: val.schoolYear || key,
        hk1: { startDate: val.hk1.startDate, endDate: val.hk1.endDate },
        hk2: { startDate: val.hk2.startDate, endDate: val.hk2.endDate },
      };
    }
  }

  const currentYear = (config?.schoolYear || '2026-2027').trim();
  if (!result[currentYear]) {
    result[currentYear] = createDefaultSchoolYearSemesters(currentYear);
  }

  const nextYear = parseNextSchoolYear(currentYear);
  if (nextYear && !result[nextYear]) {
    result[nextYear] = createDefaultSchoolYearSemesters(nextYear);
  }

  return result;
}

export function validateSemesterConfigs(
  configs: Record<string, SchoolYearSemesters>
): string | null {
  for (const [yearKey, sy] of Object.entries(configs)) {
    if (!sy?.hk1?.startDate || !sy?.hk1?.endDate || !sy?.hk2?.startDate || !sy?.hk2?.endDate) {
      return `Năm học ${yearKey}: Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc cho cả 2 học kỳ.`;
    }
    if (sy.hk1.startDate > sy.hk1.endDate) {
      return `Năm học ${yearKey}: Ngày bắt đầu Học kỳ I phải trước hoặc bằng ngày kết thúc Học kỳ I.`;
    }
    if (sy.hk2.startDate > sy.hk2.endDate) {
      return `Năm học ${yearKey}: Ngày bắt đầu Học kỳ II phải trước hoặc bằng ngày kết thúc Học kỳ II.`;
    }
    if (sy.hk1.endDate >= sy.hk2.startDate) {
      return `Năm học ${yearKey}: Ngày bắt đầu Học kỳ II phải sau ngày kết thúc Học kỳ I.`;
    }
  }
  return null;
}

export function getAvailableSchoolYears(
  config?: Partial<ClassConfig> | null,
  incidents: ConductIncident[] = []
): string[] {
  const configs = getEffectiveSemesterConfigs(config);
  const set = new Set<string>(Object.keys(configs));
  if (config?.schoolYear) {
    set.add(config.schoolYear);
  }
  for (const inc of incidents) {
    if (inc.schoolYear) {
      set.add(inc.schoolYear);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export interface DateSemesterResolution {
  schoolYear: string;
  semester: SemesterId;
  isWithinConfiguredRange: boolean;
  matchedBy: 'configured' | 'fallback';
}

export function resolveDateToSemester(
  dateStr: string,
  config?: Partial<ClassConfig> | null,
  preferredSchoolYear?: string
): DateSemesterResolution {
  const configs = getEffectiveSemesterConfigs(config);
  const activeYear = (preferredSchoolYear || config?.schoolYear || '2026-2027').trim();

  // Order school years so preferred / active school year is checked first
  const orderedYears = [
    ...(configs[activeYear] ? [configs[activeYear]] : []),
    ...Object.values(configs)
      .filter(sy => sy.schoolYear !== activeYear)
      .sort((a, b) => a.schoolYear.localeCompare(b.schoolYear)),
  ];

  // 1. Exact configured date range match
  for (const sy of orderedYears) {
    if (dateStr >= sy.hk1.startDate && dateStr <= sy.hk1.endDate) {
      return {
        schoolYear: sy.schoolYear,
        semester: 'HK1',
        isWithinConfiguredRange: true,
        matchedBy: 'configured',
      };
    }
    if (dateStr >= sy.hk2.startDate && dateStr <= sy.hk2.endDate) {
      return {
        schoolYear: sy.schoolYear,
        semester: 'HK2',
        isWithinConfiguredRange: true,
        matchedBy: 'configured',
      };
    }
  }

  // 2. Fallback when date falls outside all configured semester date ranges
  // Check if date lies between HK1 start and HK2 end of any configured year (mid-year break)
  for (const sy of orderedYears) {
    if (dateStr > sy.hk1.endDate && dateStr < sy.hk2.startDate) {
      return {
        schoolYear: sy.schoolYear,
        semester: 'HK1',
        isWithinConfiguredRange: false,
        matchedBy: 'fallback',
      };
    }
  }

  // Infer academic year by calendar year/month
  const parts = String(dateStr || '').split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (!isNaN(year) && !isNaN(month)) {
      const inferredYear = month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      const sy = configs[inferredYear];
      if (sy) {
        const sem: SemesterId = dateStr >= sy.hk2.startDate ? 'HK2' : 'HK1';
        return {
          schoolYear: inferredYear,
          semester: sem,
          isWithinConfiguredRange: false,
          matchedBy: 'fallback',
        };
      }
      return {
        schoolYear: inferredYear,
        semester: month >= 8 || month === 1 ? 'HK1' : 'HK2',
        isWithinConfiguredRange: false,
        matchedBy: 'fallback',
      };
    }
  }

  return {
    schoolYear: activeYear,
    semester: 'HK1',
    isWithinConfiguredRange: false,
    matchedBy: 'fallback',
  };
}

export interface ActiveSemesterInfo {
  schoolYear: string;
  semester: SemesterId;
  label: string;
  isWithinConfiguredRange: boolean;
}

export function getActiveSemester(
  config?: Partial<ClassConfig> | null,
  referenceDateStr?: string
): ActiveSemesterInfo {
  const refDate = referenceDateStr || getLocalTodayDateStr();
  const configs = getEffectiveSemesterConfigs(config);
  const configuredActiveYear = (config?.schoolYear || '2026-2027').trim();

  // Check configured active schoolYear first
  const primary = configs[configuredActiveYear];
  if (primary) {
    if (refDate >= primary.hk1.startDate && refDate <= primary.hk1.endDate) {
      return {
        schoolYear: primary.schoolYear,
        semester: 'HK1',
        label: 'Học kỳ I',
        isWithinConfiguredRange: true,
      };
    }
    if (refDate >= primary.hk2.startDate && refDate <= primary.hk2.endDate) {
      return {
        schoolYear: primary.schoolYear,
        semester: 'HK2',
        label: 'Học kỳ II',
        isWithinConfiguredRange: true,
      };
    }
  }

  // Check if reference date matches any other configured school year's HK1/HK2
  for (const sy of Object.values(configs).sort((a, b) => a.schoolYear.localeCompare(b.schoolYear))) {
    if (refDate >= sy.hk1.startDate && refDate <= sy.hk1.endDate) {
      return {
        schoolYear: sy.schoolYear,
        semester: 'HK1',
        label: 'Học kỳ I',
        isWithinConfiguredRange: true,
      };
    }
    if (refDate >= sy.hk2.startDate && refDate <= sy.hk2.endDate) {
      return {
        schoolYear: sy.schoolYear,
        semester: 'HK2',
        label: 'Học kỳ II',
        isWithinConfiguredRange: true,
      };
    }
  }

  // Outside active ranges (e.g., before HK1 start, mid-year break, or after HK2 end):
  // Stay on configured schoolYear and switch to HK2 once hk2.startDate is reached.
  if (primary) {
    const sem: SemesterId = refDate >= primary.hk2.startDate ? 'HK2' : 'HK1';
    return {
      schoolYear: primary.schoolYear,
      semester: sem,
      label: formatSemesterLabel(sem),
      isWithinConfiguredRange: false,
    };
  }

  return {
    schoolYear: configuredActiveYear,
    semester: 'HK1',
    label: 'Học kỳ I',
    isWithinConfiguredRange: false,
  };
}

export function getIncidentSemester(
  incident: ConductIncident,
  config?: Partial<ClassConfig> | null
): { schoolYear: string; semester: SemesterId } {
  if (incident.schoolYear && (incident.semester === 'HK1' || incident.semester === 'HK2')) {
    return {
      schoolYear: incident.schoolYear,
      semester: incident.semester,
    };
  }
  const resolved = resolveDateToSemester(incident.date, config);
  return {
    schoolYear: resolved.schoolYear,
    semester: resolved.semester,
  };
}

export function calculateConductRank(
  score: number,
  settings?: ConductSettings | null
): { rank: 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt'; colorClass: string } {
  const tGood = settings?.thresholdGood ?? 190;
  const tFair = settings?.thresholdFair ?? 160;
  const tPass = settings?.thresholdPass ?? 130;

  if (score >= tGood) {
    return { rank: 'Tốt', colorClass: 'text-emerald-600' };
  }
  if (score >= tFair) {
    return { rank: 'Khá', colorClass: 'text-blue-600' };
  }
  if (score >= tPass) {
    return { rank: 'Đạt', colorClass: 'text-amber-600' };
  }
  return { rank: 'Chưa đạt', colorClass: 'text-rose-800' };
}

export function calculateSemesterConductSummary(
  studentId: string,
  schoolYear: string,
  semester: SemesterId,
  incidents: ConductIncident[],
  settings?: ConductSettings | null,
  config?: Partial<ClassConfig> | null
): ConductSemesterStudentSummary {
  const initialScore = settings?.initialScore ?? 200;
  let totalReward = 0;
  let totalViolation = 0;
  let violationCount = 0;
  let rewardCount = 0;

  for (const inc of incidents) {
    if (inc.studentId !== studentId) continue;
    const tag = getIncidentSemester(inc, config);
    if (tag.schoolYear !== schoolYear || tag.semester !== semester) continue;

    const pts = Math.abs(Number(inc.points) || 0);
    if (inc.category === 'reward') {
      totalReward += pts;
      rewardCount += 1;
    } else {
      totalViolation += pts;
      violationCount += 1;
    }
  }

  // Formula: Điểm thi đua học kỳ = 200 + Tổng điểm thưởng - Tổng điểm trừ
  const finalScore = initialScore + totalReward - totalViolation;
  const { rank } = calculateConductRank(finalScore, settings);

  return {
    initialScore,
    totalReward,
    totalViolation,
    finalScore,
    rank,
    violationCount,
    rewardCount,
  };
}
