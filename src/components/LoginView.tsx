import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GraduationCap, Key, User, ArrowRight, ShieldCheck, Info } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, config, showToast } = useApp();
  const [role, setRole] = useState<'teacher' | 'student'>('teacher');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await login(role, password, username);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const appName = config?.appName || 'Trợ Lý Chủ Nhiệm';
  const schoolName = config?.schoolName || 'Trường THCS Đồng Khởi';
  const className = config?.className || '8A3';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fdf2f4] px-4 py-8">
      {/* Container Card */}
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl border border-[#ffe2e6]">
        {/* Top Header matching Image 1 */}
        <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 px-6 py-8 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md shadow-xs ring-4 ring-white/10">
            <GraduationCap className="h-9 w-9 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight uppercase">
            {role === 'teacher' ? 'GVCN' : 'HỌC SINH'}
          </h1>
          <p className="mt-1 text-xs font-semibold text-rose-100">
            {schoolName} · Lớp {className}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Role Segmented Tabs (Image 1) */}
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[#fff5f6] p-1.5 border border-[#ffd5dc]">
            <button
              type="button"
              onClick={() => {
                setRole('teacher');
                setPassword('');
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                role === 'teacher'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Giáo Viên Chủ Nhiệm</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole('student');
                setPassword('');
              }}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                role === 'student'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>Học Sinh</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Student Username input */}
            {role === 'student' && (
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Tên đăng nhập
                </label>
                <div className="relative mt-1.5">
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 0102102013"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full rounded-2xl border-2 border-rose-200 bg-white py-3 pl-4 pr-10 text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-hidden"
                  />
                  <User className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500 leading-normal">
                  Cấu trúc: <strong>[Mã số][Ngày sinh ddmmyyyy]</strong>. Ví dụ: mã số 01, sinh ngày 02/10/2013 → <code className="text-rose-600 font-bold">0102102013</code>.
                </p>
              </div>
            )}

            {/* Password input */}
            <div>
              <label className="block text-xs font-bold text-slate-700">
                {role === 'teacher' ? 'Mật khẩu quản trị' : 'Mật khẩu học sinh'}
              </label>
              <div className="relative mt-1.5">
                <input
                  type="password"
                  required
                  placeholder={
                    role === 'teacher'
                      ? 'Nhập mật khẩu GVCN'
                      : 'Mật khẩu ban đầu là ngày sinh ddmmyyyy'
                  }
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-2xl border-2 border-rose-200 bg-white py-3 pl-4 pr-10 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-hidden"
                />
                <Key className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {role === 'teacher'
                  ? 'Dùng mật khẩu riêng đã thiết lập cho ứng dụng (mặc định: gvcn123).'
                  : 'Mật khẩu ban đầu là ngày sinh định dạng ddmmyyyy (ví dụ 02102013).'}
              </p>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 py-3.5 text-xs font-bold text-white shadow-md hover:bg-rose-600 transition-colors disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Đang xác thực...' : 'Đăng Nhập Vào Hệ Thống'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-[#ffe6ea] bg-[#fffbfb] p-4 text-center text-[11px] text-slate-400">
          Hệ thống quản lý lớp học dành riêng cho Giáo viên Chủ nhiệm & Học sinh
        </div>
      </div>
    </div>
  );
};
