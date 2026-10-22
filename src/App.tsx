import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { BulletinSeating } from './components/BulletinSeating';
import { StudentManagement } from './components/StudentManagement';
import { AcademicScores } from './components/AcademicScores';
import { AttendanceView } from './components/AttendanceView';
import { SettingsView } from './components/SettingsView';
import { StudentProfile } from './components/StudentProfile';
import { LoginView } from './components/LoginView';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    isAuthenticated,
    activeTab,
    toastMessage,
    mustChangePassword,
    openChangePassword,
  } = useApp();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#fdf2f4]">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />

        {/* Must change password notification banner if required */}
        {mustChangePassword && (
          <div className="flex items-center justify-between bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-xs">
            <span>
              Tài khoản của bạn đang dùng mật khẩu tạm thời. Vui lòng đổi mật khẩu mới để đảm bảo an toàn.
            </span>
            <button
              onClick={openChangePassword}
              className="rounded-lg bg-white/20 px-3 py-1 hover:bg-white/30 transition-colors"
            >
              Đổi ngay
            </button>
          </div>
        )}

        {/* Main Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'bulletin' && <BulletinSeating />}
          {activeTab === 'students' && <StudentManagement />}
          {activeTab === 'scores' && <AcademicScores />}
          {activeTab === 'attendance' && <AttendanceView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'student-detail' && <StudentProfile />}
        </main>
      </div>

      {/* Global Change Password Modal */}
      <ChangePasswordModal />

      {/* Global Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs font-bold text-white shadow-xl transition-all duration-300 ${
            toastMessage.type === 'error'
              ? 'bg-rose-600'
              : toastMessage.type === 'info'
              ? 'bg-slate-800'
              : 'bg-emerald-600'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : toastMessage.type === 'info' ? (
            <Info className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
