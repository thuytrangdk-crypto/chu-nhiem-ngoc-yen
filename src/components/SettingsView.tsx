import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { ConductRule, Subject } from '../types';
import {
  Settings,
  Scale,
  BookOpen,
  Database,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  Cloud,
  RefreshCw,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { config, conductSettings, subjects, updateConfigState, showToast, refreshData } = useApp();

  const [activeSettingsTab, setActiveSettingsTab] = useState<
    'general' | 'conduct' | 'subjects' | 'system'
  >('general');

  // General settings state
  const [generalForm, setGeneralForm] = useState({
    appName: config?.appName || 'Trợ lý chủ nhiệm',
    schoolName: config?.schoolName || '',
    className: config?.className || '',
    teacherName: config?.teacherName || '',
    schoolYear: config?.schoolYear || '2026-2027',
    logoUrl: config?.logoUrl || '',
    absenceThreshold: config?.attentionThreshold?.absenceDays || 2,
    violationsThreshold: config?.attentionThreshold?.violationsCount || 2,
  });

  // Conduct rules state
  const [initialScoreStr, setInitialScoreStr] = useState<string>(
    String(conductSettings?.initialScore ?? 200)
  );
  const [thresholdGoodStr, setThresholdGoodStr] = useState<string>(
    String(conductSettings?.thresholdGood ?? 190)
  );
  const [thresholdFairStr, setThresholdFairStr] = useState<string>(
    String(conductSettings?.thresholdFair ?? 160)
  );
  const [thresholdPassStr, setThresholdPassStr] = useState<string>(
    String(conductSettings?.thresholdPass ?? 130)
  );
  const [rulesList, setRulesList] = useState<ConductRule[]>(
    conductSettings?.rules ? [...conductSettings.rules] : []
  );
  const [autoConductEnabled, setAutoConductEnabled] = useState<boolean>(
    Boolean(config?.autoConductFromAttendance?.enabled)
  );

  // New rule input state
  const [newRuleCode, setNewRuleCode] = useState('');
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<'violation' | 'reward'>('violation');
  const [newRulePoints, setNewRulePoints] = useState<number>(2);

  // Subjects state
  const [subjectsList, setSubjectsList] = useState<Subject[]>([...subjects]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubType, setNewSubType] = useState<'score' | 'comment'>('score');

  // Supabase test state
  const [supabaseTestResult, setSupabaseTestResult] = useState<any>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);

  // Class clean confirmation
  const [cleanCodeInput, setCleanCodeInput] = useState('');

  // 1. Save General Settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateConfig({
        appName: generalForm.appName,
        schoolName: generalForm.schoolName,
        className: generalForm.className,
        teacherName: generalForm.teacherName,
        schoolYear: generalForm.schoolYear,
        logoUrl: generalForm.logoUrl,
        attentionThreshold: {
          absenceDays: Number(generalForm.absenceThreshold) || 2,
          violationsCount: Number(generalForm.violationsThreshold) || 2,
        },
        autoConductFromAttendance: {
          enabled: autoConductEnabled,
          unexcusedAbsenceRuleId: 'rule_v4',
          lateRuleId: 'rule_v3',
        },
      });

      updateConfigState(res.config);
      showToast('Đã lưu cấu hình chung thành công');
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // 2. Save Conduct Settings
  const handleSaveConduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const initialScore = parseFloat(initialScoreStr);
    const tGood = parseFloat(thresholdGoodStr);
    const tFair = parseFloat(thresholdFairStr);
    const tPass = parseFloat(thresholdPassStr);

    if (isNaN(initialScore) || isNaN(tGood) || isNaN(tFair) || isNaN(tPass)) {
      showToast('Vui lòng nhập đầy đủ các giá trị điểm số hợp lệ', 'error');
      return;
    }

    if (!(tGood > tFair && tFair > tPass)) {
      showToast('Ngưỡng xếp loại phải thỏa mãn điều kiện: Tốt (A) > Khá (B) > Đạt (C)', 'error');
      return;
    }

    try {
      await api.saveConductRules({
        initialScore,
        thresholdGood: tGood,
        thresholdFair: tFair,
        thresholdPass: tPass,
        rules: rulesList,
      });

      await api.updateConfig({
        autoConductFromAttendance: {
          enabled: autoConductEnabled,
          unexcusedAbsenceRuleId: 'rule_v4',
          lateRuleId: 'rule_v3',
        },
      });

      showToast('Đã lưu quy tắc thi đua & nề nếp thành công');
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Add rule to list
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName) return;

    const newRule: ConductRule = {
      id: `rule_${Date.now()}`,
      code: newRuleCode || `Q${rulesList.length + 1}`,
      name: newRuleName,
      category: newRuleCategory,
      points: Math.abs(Number(newRulePoints)) || 1,
      isActive: true,
    };

    setRulesList([...rulesList, newRule]);
    setNewRuleCode('');
    setNewRuleName('');
    showToast(`Đã thêm quy tắc "${newRuleName}" vào danh sách`);
  };

  // 3. Save Subjects
  const handleSaveSubjects = async () => {
    try {
      await api.saveSubjects(subjectsList);
      showToast('Đã lưu danh mục môn học thành công');
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName) return;

    const newSub: Subject = {
      id: `sub_${Date.now()}`,
      name: newSubName,
      code: `M${subjectsList.length + 1}`,
      type: newSubType,
      order: subjectsList.length + 1,
    };

    setSubjectsList([...subjectsList, newSub]);
    setNewSubName('');
    showToast(`Đã thêm môn "${newSubName}" vào danh sách`);
  };

  // 4. Test Supabase
  const handleTestSupabase = async () => {
    try {
      setIsTestingSupabase(true);
      const res = await api.testSupabase();
      setSupabaseTestResult(res);
      showToast(res.message, res.connected ? 'success' : 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsTestingSupabase(false);
    }
  };

  // Download Backup JSON
  const handleDownloadBackup = async () => {
    try {
      const data = await api.getBackupData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sao_Luu_Lop_${config?.className || 'Class'}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã tải tệp sao lưu dữ liệu (.json) thành công');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Restore Backup JSON
  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const confirmed = window.confirm(
        `Bạn có chắc chắn muốn khôi phục dữ liệu từ bản sao lưu này?\n` +
        `- Lớp: ${parsed.config?.className || 'Không rõ'}\n` +
        `- Số học sinh: ${parsed.students?.length || 0}\n` +
        `- Thời gian sao lưu: ${parsed.exportedAt || 'Không rõ'}`
      );
      if (!confirmed) return;

      const res = await api.restoreBackup(parsed);
      showToast(res.message);
      refreshData();
    } catch (err: any) {
      showToast('Tệp sao lưu không hợp lệ: ' + err.message, 'error');
    }
  };

  // Safe Clean Class
  const handleCleanClass = async () => {
    if (cleanCodeInput !== 'XAC_NHAN_LAM_SACH_LOP') {
      showToast('Mã xác nhận chưa chính xác. Vui lòng nhập XAC_NHAN_LAM_SACH_LOP', 'error');
      return;
    }

    try {
      const res = await api.cleanClass(cleanCodeInput);
      showToast(res.message);
      setCleanCodeInput('');
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* 4 Settings Sub-Tabs matching Image 7 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-rose-200/80 pb-3">
        {[
          { id: 'general' as const, label: 'Cài đặt chung', icon: Settings },
          { id: 'conduct' as const, label: 'Quy tắc thi đua', icon: Scale },
          { id: 'subjects' as const, label: 'Môn học', icon: BookOpen },
          { id: 'system' as const, label: 'Dữ liệu hệ thống & Supabase', icon: Database },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSettingsTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeSettingsTab === tab.id
                  ? 'bg-rose-500 text-slate-800 shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-rose-50 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. CÀI ĐẶT CHUNG (Image 7) */}
      {activeSettingsTab === 'general' && (
        <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            Thông tin chung của Lớp & Sổ
          </h3>

          <form onSubmit={handleSaveGeneral} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700">Tên ứng dụng</label>
                <input
                  type="text"
                  required
                  value={generalForm.appName}
                  onChange={e => setGeneralForm({ ...generalForm, appName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Tên lớp</label>
                <input
                  type="text"
                  required
                  placeholder="8A3, 9A14..."
                  value={generalForm.className}
                  onChange={e => setGeneralForm({ ...generalForm, className: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-700">Tên trường học</label>
                <input
                  type="text"
                  placeholder="Trường THCS Đồng Khởi..."
                  value={generalForm.schoolName}
                  onChange={e => setGeneralForm({ ...generalForm, schoolName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Năm học</label>
                <input
                  type="text"
                  required
                  placeholder="2026-2027"
                  value={generalForm.schoolYear}
                  onChange={e => setGeneralForm({ ...generalForm, schoolYear: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Giáo viên chủ nhiệm</label>
              <input
                type="text"
                required
                placeholder="Nguyễn Thị Thùy Trang"
                value={generalForm.teacherName}
                onChange={e => setGeneralForm({ ...generalForm, teacherName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
              />
            </div>

            {/* Threshold for student attention */}
            <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
              <span className="text-xs font-bold text-slate-800">
                Tiêu chí "Học sinh cần chú ý" trên Tổng quan:
              </span>
              <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-600">Số buổi vắng/muộn từ:</label>
                  <input
                    type="number"
                    min="1"
                    value={generalForm.absenceThreshold}
                    onChange={e => setGeneralForm({ ...generalForm, absenceThreshold: parseInt(e.target.value) || 1 })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-600">Số lần vi phạm từ:</label>
                  <input
                    type="number"
                    min="1"
                    value={generalForm.violationsThreshold}
                    onChange={e => setGeneralForm({ ...generalForm, violationsThreshold: parseInt(e.target.value) || 1 })}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-6 py-2.5 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Lưu thông tin</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. QUY TẮC THI ĐUA (Item 8) */}
      {activeSettingsTab === 'conduct' && (
        <div className="space-y-6 max-w-4xl">
          <form onSubmit={handleSaveConduct} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
              Cấu hình thang điểm & Ngưỡng xếp loại rèn luyện
            </h3>

            {/* Starting score & 3 thresholds A, B, C */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Điểm khởi đầu</label>
                <input
                  type="text"
                  value={initialScoreStr}
                  onChange={e => setInitialScoreStr(e.target.value)}
                  placeholder="200 hoặc 100"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono font-bold focus:outline-rose-500"
                />
                <span className="text-[10px] text-slate-400">Điểm gốc ban đầu</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-700">Ngưỡng Tốt (A)</label>
                <input
                  type="text"
                  value={thresholdGoodStr}
                  onChange={e => setThresholdGoodStr(e.target.value)}
                  placeholder="190"
                  className="mt-1 w-full rounded-xl border border-emerald-300 bg-emerald-50/30 px-3 py-2 text-xs font-mono font-bold text-emerald-800 focus:outline-emerald-500"
                />
                <span className="text-[10px] text-slate-400">Từ A trở lên là Tốt</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-700">Ngưỡng Khá (B)</label>
                <input
                  type="text"
                  value={thresholdFairStr}
                  onChange={e => setThresholdFairStr(e.target.value)}
                  placeholder="160"
                  className="mt-1 w-full rounded-xl border border-blue-300 bg-blue-50/30 px-3 py-2 text-xs font-mono font-bold text-blue-800 focus:outline-blue-500"
                />
                <span className="text-[10px] text-slate-400">Từ B đến dưới A là Khá</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-700">Ngưỡng Đạt (C)</label>
                <input
                  type="text"
                  value={thresholdPassStr}
                  onChange={e => setThresholdPassStr(e.target.value)}
                  placeholder="130"
                  className="mt-1 w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3 py-2 text-xs font-mono font-bold text-amber-800 focus:outline-amber-500"
                />
                <span className="text-[10px] text-slate-400">Từ C đến dưới B là Đạt</span>
              </div>
            </div>

            {/* Auto-conduct from attendance toggle */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoConductEnabled}
                  onChange={e => setAutoConductEnabled(e.target.checked)}
                  className="h-4 w-4 rounded text-rose-800 focus:ring-rose-400"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Tự động ghi nhận trừ điểm thi đua khi điểm danh vắng không phép hoặc muộn
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hệ thống sẽ tự động đối soát tránh ghi nhận trùng lặp sự việc trong cùng một ngày.
                  </p>
                </div>
              </label>
            </div>

            {/* Rules Table */}
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Danh mục tiêu chí vi phạm & khen thưởng ({rulesList.length})
                </h4>
              </div>

              <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1">
                {rulesList.map((rule, idx) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-2.5 bg-white text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 font-bold w-10">
                        {rule.code}
                      </span>
                      <input
                        type="text"
                        value={rule.name}
                        onChange={e => {
                          const updated = [...rulesList];
                          updated[idx].name = e.target.value;
                          setRulesList(updated);
                        }}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-rose-500"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={rule.category}
                        onChange={e => {
                          const updated = [...rulesList];
                          updated[idx].category = e.target.value as any;
                          setRulesList(updated);
                        }}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium"
                      >
                        <option value="violation">Vi phạm (-)</option>
                        <option value="reward">Khen thưởng (+)</option>
                      </select>

                      <div className="flex items-center gap-1 font-mono font-bold">
                        <span>{rule.category === 'violation' ? '-' : '+'}</span>
                        <input
                          type="number"
                          step="0.5"
                          value={rule.points}
                          onChange={e => {
                            const updated = [...rulesList];
                            updated[idx].points = Math.abs(parseFloat(e.target.value) || 0);
                            setRulesList(updated);
                          }}
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-xs"
                        />
                        <span>đ</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setRulesList(rulesList.filter((_, i) => i !== idx));
                        }}
                        className="p-1 text-slate-400 hover:text-rose-800"
                        title="Xóa quy tắc"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-6 py-2.5 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Lưu quy tắc thi đua</span>
            </button>
          </form>

          {/* Add New Rule Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-2">
              + Thêm quy tắc thi đua mới
            </h4>
            <form onSubmit={handleAddRule} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <input
                type="text"
                placeholder="Mã (V08, R05...)"
                value={newRuleCode}
                onChange={e => setNewRuleCode(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono"
              />
              <input
                type="text"
                required
                placeholder="Tên lỗi hoặc thành tích..."
                value={newRuleName}
                onChange={e => setNewRuleName(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs sm:col-span-2"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="Điểm"
                  value={newRulePoints}
                  onChange={e => setNewRulePoints(parseFloat(e.target.value) || 0)}
                  className="w-20 rounded-xl border border-slate-200 px-2 py-2 text-xs text-center font-mono"
                />
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-rose-500 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-rose-600"
                >
                  Thêm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. MÔN HỌC */}
      {activeSettingsTab === 'subjects' && (
        <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900">
              Danh mục các môn học ({subjectsList.length})
            </h3>
            <button
              onClick={handleSaveSubjects}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600"
            >
              <Save className="h-4 w-4" />
              <span>Lưu danh mục môn</span>
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {subjectsList.map((sub, i) => (
              <div key={sub.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                <span className="font-mono text-slate-400 font-bold w-6 text-center text-xs">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={sub.name}
                  onChange={e => {
                    const up = [...subjectsList];
                    up[i].name = e.target.value;
                    setSubjectsList(up);
                  }}
                  className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800"
                />
                <select
                  value={sub.type}
                  onChange={e => {
                    const up = [...subjectsList];
                    up[i].type = e.target.value as any;
                    setSubjectsList(up);
                  }}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                >
                  <option value="score">Chấm điểm số (0 - 10)</option>
                  <option value="comment">Nhận xét / Đánh giá (Đ/CĐ)</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSubjectsList(subjectsList.filter((_, idx) => idx !== i))}
                  className="p-1 text-slate-400 hover:text-rose-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddSubject} className="pt-3 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              required
              placeholder="Tên môn học mới..."
              value={newSubName}
              onChange={e => setNewSubName(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs"
            />
            <select
              value={newSubType}
              onChange={e => setNewSubType(e.target.value as any)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
            >
              <option value="score">Chấm điểm (0 - 10)</option>
              <option value="comment">Nhận xét (Đ/CĐ)</option>
            </select>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              Thêm môn
            </button>
          </form>
        </div>
      )}

      {/* 4. DỮ LIỆU HỆ THỐNG & SUPABASE (Item 12 & 13) */}
      {activeSettingsTab === 'system' && (
        <div className="max-w-3xl space-y-6">
          {/* Supabase Integration Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-rose-800" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Đồng bộ & Lưu trữ Supabase Cloud
                </h3>
              </div>
              <button
                onClick={handleTestSupabase}
                disabled={isTestingSupabase}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                <span>Kiểm tra kết nối</span>
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Ứng dụng hỗ trợ lưu trữ phân tách bảo mật trên Supabase để điện thoại và laptop luôn đồng bộ dữ liệu theo thời gian thực.
              </p>

              {supabaseTestResult && (
                <div
                  className={`rounded-xl p-3.5 border ${
                    supabaseTestResult.connected
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <div className="font-bold">{supabaseTestResult.message}</div>
                  {supabaseTestResult.error && (
                    <div className="mt-1 font-mono text-[11px] text-rose-700">
                      Chi tiết: {supabaseTestResult.error}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="font-bold text-slate-800">Hướng dẫn thiết lập Supabase:</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Tạo một dự án mới miễn phí tại <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-rose-800 underline font-semibold">supabase.com</a>.</li>
                  <li>Mở mục <strong>SQL Editor</strong> và dán nội dung từ tệp <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono">schema.sql</code> rồi nhấn <strong>Run</strong>.</li>
                  <li>Sao chép <strong>Project URL</strong> và <strong>Service Role Key</strong> vào biến môi trường:
                    <div className="mt-1.5 bg-slate-900 text-emerald-400 p-2.5 rounded-lg font-mono text-[11px]">
                      SUPABASE_URL=https://your-project.supabase.co<br />
                      SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Backup & Restore JSON */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
              Sao lưu & Khôi phục dữ liệu toàn bộ
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="font-bold text-xs text-slate-800">Tải tệp sao lưu (.json)</div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Lưu trữ an toàn toàn bộ học sinh, điểm số, điểm danh và thi đua về máy tính của bạn.
                </p>
                <button
                  onClick={handleDownloadBackup}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Tải bản sao lưu JSON</span>
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="font-bold text-xs text-slate-800">Khôi phục từ tệp (.json)</div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Khôi phục dữ liệu đã sao lưu trước đó. Hệ thống sẽ tạo một snapshot khẩn cấp trước khi ghi đè.
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackupFile}
                  className="mt-3 w-full text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-rose-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-rose-700 hover:file:bg-rose-100"
                />
              </div>
            </div>
          </div>

          {/* Dangerous Zone: Safe Reset Class */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 shadow-xs">
            <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm border-b border-rose-200 pb-2">
              <ShieldAlert className="h-5 w-5 text-rose-800" />
              <span>Vùng nguy hiểm: Làm sạch dữ liệu lớp</span>
            </div>

            <p className="mt-3 text-xs text-rose-700 leading-relaxed">
              Thao tác này sẽ xóa toàn bộ danh sách học sinh, điểm số, điểm danh và các sự việc kỷ luật hiện tại của lớp để bàn giao hoặc chuyển sang năm học mới. Một bản sao lưu tự động sẽ được tạo trước khi thực hiện.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row gap-2 max-w-md">
              <input
                type="text"
                placeholder="Nhập XAC_NHAN_LAM_SACH_LOP"
                value={cleanCodeInput}
                onChange={e => setCleanCodeInput(e.target.value)}
                className="flex-1 rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-mono font-bold text-rose-900 focus:outline-rose-600"
              />
              <button
                type="button"
                onClick={handleCleanClass}
                disabled={cleanCodeInput !== 'XAC_NHAN_LAM_SACH_LOP'}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600 disabled:opacity-50"
              >
                Làm sạch lớp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
