import React from 'react';
import { useApp, ActiveTab } from '../context/AppContext';
import {
  LayoutDashboard,
  Megaphone,
  Users,
  BookOpen,
  CalendarCheck,
  Settings,
  KeyRound,
  Cloud,
  LogOut,
  GraduationCap,
  X,
  ChevronDown,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    config,
    userRole,
    currentStudentName,
    logout,
    openChangePassword,
    supabaseStatus,
    isMobileMenuOpen,
    closeMobileMenu,
  } = useApp();

  const handleNav = (tab: ActiveTab) => {
    setActiveTab(tab);
    closeMobileMenu();
  };

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'bulletin' as ActiveTab, label: 'Bảng tin & Sơ đồ lớp', icon: Megaphone },
    { id: 'students' as ActiveTab, label: 'Học sinh', icon: Users },
    { id: 'scores' as ActiveTab, label: 'Học tập', icon: BookOpen },
    { id: 'attendance' as ActiveTab, label: 'Điểm danh', icon: CalendarCheck },
  ];

  if (userRole === 'teacher') {
    navItems.push({ id: 'settings' as ActiveTab, label: 'Cài đặt', icon: Settings });
  }

  const appName = config?.appName || 'Trợ lý chủ nhiệm';
  const className = config?.className || 'Lớp 8A3';
  const teacherName = config?.teacherName || 'Nguyễn Thị Thùy Trang';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[#ffd5dc] bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-xl' : '-translate-x-100'
        }`}
      >
        {/* Top Header Section */}
        <div className="border-b border-[#ffe2e6] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config?.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt="Logo"
                  className="h-10 w-10 rounded-xl object-cover ring-2 ring-rose-200"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-500 text-slate-800 shadow-xs">
                  <GraduationCap className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-sm font-extrabold tracking-tight text-slate-900 uppercase">
                  {appName}
                </h1>
                <div className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                  <span>Lớp {className}</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </div>
              </div>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={closeMobileMenu}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
              aria-label="Đóng menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-2.5 space-y-1 text-xs">
            <div className="truncate text-slate-600">
              <span className="font-medium text-slate-400">GVCN: </span>
              <span className="font-semibold text-slate-800">{teacherName}</span>
            </div>
            {/* Supabase status badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf2f4] px-2.5 py-1 text-[11px] font-medium text-slate-700">
              <Cloud className="h-3.5 w-3.5 text-rose-800" />
              <span>
                Supabase:{' '}
                {supabaseStatus.isConnected
                  ? 'Đã kết nối'
                  : supabaseStatus.isConfigured
                  ? 'Đang kiểm tra'
                  : 'Lưu trữ cục bộ'}
              </span>
              <span
                className={`h-2 w-2 rounded-full ${
                  supabaseStatus.isConnected
                    ? 'bg-emerald-500'
                    : supabaseStatus.isConfigured
                    ? 'bg-amber-500'
                    : 'bg-emerald-400'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Main Nav Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-rose-50 text-rose-800 shadow-xs'
                    : 'text-slate-600 hover:bg-[#fff5f6] hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive ? 'text-rose-800' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom System Section */}
        <div className="border-t border-[#ffe2e6] bg-[#fffbfb] p-3 space-y-2">
          <div className="px-2 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            Hệ thống
          </div>

          <button
            onClick={() => {
              openChangePassword();
              closeMobileMenu();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-800"
          >
            <KeyRound className="h-4 w-4 text-slate-400" />
            <span>
              {userRole === 'teacher' ? 'Đổi mật khẩu GV' : 'Đổi mật khẩu HS'}
            </span>
          </button>

          <div className="flex items-center justify-between rounded-lg bg-white px-2.5 py-2 text-xs border border-[#ffe6ea]">
            <div className="flex items-center gap-2 truncate">
              <Cloud className="h-4 w-4 text-rose-800" />
              <span className="truncate font-medium text-slate-600">
                {supabaseStatus.isConnected ? 'Supabase Cloud' : 'Bộ nhớ máy chủ'}
              </span>
            </div>
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                supabaseStatus.isConnected ? 'bg-emerald-500' : 'bg-emerald-400'
              }`}
            />
          </div>

          {/* User Role & Logout */}
          <div className="flex items-center justify-between pt-1">
            <div className="min-w-0 pr-2">
              <div className="truncate text-xs font-bold text-slate-800">
                {userRole === 'teacher'
                  ? 'Giáo viên'
                  : currentStudentName || 'Học sinh'}
              </div>
              <div className="truncate text-[11px] text-slate-500">
                {userRole === 'teacher' ? 'Quyền quản lý' : 'Tài khoản học sinh'}
              </div>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100/60"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Thoát</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
