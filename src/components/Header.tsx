import React from 'react';
import { useApp } from '../context/AppContext';
import { Menu, Calendar, Sparkles, User, RefreshCw } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeTab,
    config,
    userRole,
    currentStudentName,
    currentStudentId,
    openStudentProfile,
    toggleMobileMenu,
    refreshData,
    isLoading,
  } = useApp();

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Tổng quan lớp học';
      case 'bulletin':
        return 'Bảng tin & Sơ đồ lớp';
      case 'students':
        return 'Quản lý học sinh';
      case 'scores':
        return 'Bảng điểm học tập';
      case 'attendance':
        return 'Sổ điểm danh';
      case 'settings':
        return 'Cài đặt hệ thống';
      case 'student-detail':
        return 'Hồ sơ học sinh';
      default:
        return 'Trợ lý chủ nhiệm';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#ffdbe0] bg-white/95 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-800 lg:hidden"
          aria-label="Mở menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h2 className="text-base font-bold text-slate-800 sm:text-lg">
            {getTabTitle()}
          </h2>
          <div className="hidden text-xs text-slate-500 sm:block">
            {config?.schoolName || 'Trường THCS'} · Lớp {config?.className || '8A3'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Refresh data button */}
        <button
          onClick={refreshData}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-rose-100 transition-colors"
          title="Tải lại dữ liệu mới nhất"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-rose-800 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">Làm mới</span>
        </button>

        {/* School Year Badge */}
        <div className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 border border-rose-200">
          <Calendar className="h-3.5 w-3.5 text-rose-800" />
          <span>{config?.schoolYear || '2026-2027'}</span>
        </div>

        {/* If student, quick profile button */}
        {userRole === 'student' && currentStudentId && (
          <button
            onClick={() => openStudentProfile(currentStudentId)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs hover:bg-rose-600 transition-colors"
          >
            <User className="h-3.5 w-3.5" />
            <span className="max-w-[120px] truncate">{currentStudentName}</span>
          </button>
        )}
      </div>
    </header>
  );
};
