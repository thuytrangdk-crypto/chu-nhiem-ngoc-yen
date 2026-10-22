import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { ClassConfig, Student, Subject, ConductSettings, SupabaseConfigStatus } from '../types';

export type ActiveTab =
  | 'dashboard'
  | 'bulletin'
  | 'students'
  | 'scores'
  | 'attendance'
  | 'settings'
  | 'student-detail';

interface AppContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedStudentId: string | null;
  openStudentProfile: (studentId: string) => void;
  closeStudentProfile: () => void;

  // Session & User
  isAuthenticated: boolean;
  userRole: 'teacher' | 'student' | null;
  currentStudentId: string | null;
  currentStudentName: string | null;
  currentStudentCode: string | null;
  mustChangePassword: boolean;
  login: (role: 'teacher' | 'student', password: string, username?: string) => Promise<void>;
  logout: () => void;

  // Data & Settings
  config: ClassConfig | null;
  students: Student[];
  subjects: Subject[];
  conductSettings: ConductSettings | null;
  supabaseStatus: SupabaseConfigStatus;
  isLoading: boolean;
  refreshData: () => Promise<void>;
  updateConfigState: (newConfig: ClassConfig) => void;

  // Modals & UI
  isChangePasswordOpen: boolean;
  openChangePassword: () => void;
  closeChangePassword: () => void;
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  isMobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(api.isAuthenticated());
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(api.role);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(api.studentId);
  const [currentStudentName, setCurrentStudentName] = useState<string | null>(api.studentName);
  const [currentStudentCode, setCurrentStudentCode] = useState<string | null>(api.studentCode);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(api.mustChangePassword);

  const [config, setConfig] = useState<ClassConfig | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [conductSettings, setConductSettings] = useState<ConductSettings | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseConfigStatus>({
    isConfigured: false,
    isConnected: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? null : prev));
    }, 4000);
  }, []);

  const openStudentProfile = useCallback((studentId: string) => {
    setSelectedStudentId(studentId);
    setActiveTab('student-detail');
  }, []);

  const closeStudentProfile = useCallback(() => {
    setSelectedStudentId(null);
    setActiveTab('students');
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Public / semi-public status & config
      const [cfg, statusData] = await Promise.all([
        api.getConfig().catch(() => null),
        api.getStatus().catch(() => null),
      ]);

      if (cfg) setConfig(cfg);
      if (statusData?.supabase) {
        setSupabaseStatus(statusData.supabase);
      }

      if (api.isAuthenticated()) {
        const [stuList, subList, cRules] = await Promise.all([
          api.getStudents().catch(() => []),
          api.getSubjects().catch(() => []),
          api.getConductRules().catch(() => null),
        ]);
        setStudents(stuList);
        setSubjects(subList);
        if (cRules) setConductSettings(cRules);
      }
    } catch (err: any) {
      console.error('Error refreshing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setUserRole(null);
      setCurrentStudentId(null);
      showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [refreshData, showToast]);

  const login = async (role: 'teacher' | 'student', password: string, username?: string) => {
    const session = await api.login(role, password, username);
    setIsAuthenticated(true);
    setUserRole(session.role);
    setCurrentStudentId(session.studentId || null);
    setCurrentStudentName(session.studentName || null);
    setCurrentStudentCode(session.studentCode || null);
    setMustChangePassword(Boolean(session.mustChangePassword));

    await refreshData();
    showToast(`Đăng nhập thành công với vai trò ${role === 'teacher' ? 'Giáo viên chủ nhiệm' : 'Học sinh'}`);

    if (role === 'student' && session.studentId) {
      // Direct student to their personal profile or dashboard
      openStudentProfile(session.studentId);
    } else {
      setActiveTab('dashboard');
    }
  };

  const logout = () => {
    api.clearSession();
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentStudentId(null);
    setCurrentStudentName(null);
    setCurrentStudentCode(null);
    setSelectedStudentId(null);
    setActiveTab('dashboard');
    showToast('Đã đăng xuất an toàn khỏi hệ thống', 'info');
  };

  const updateConfigState = (newConfig: ClassConfig) => {
    setConfig(newConfig);
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedStudentId,
        openStudentProfile,
        closeStudentProfile,
        isAuthenticated,
        userRole,
        currentStudentId,
        currentStudentName,
        currentStudentCode,
        mustChangePassword,
        login,
        logout,
        config,
        students,
        subjects,
        conductSettings,
        supabaseStatus,
        isLoading,
        refreshData,
        updateConfigState,
        isChangePasswordOpen,
        openChangePassword: () => setIsChangePasswordOpen(true),
        closeChangePassword: () => setIsChangePasswordOpen(false),
        toastMessage,
        showToast,
        isMobileMenuOpen,
        toggleMobileMenu: () => setIsMobileMenuOpen(!isMobileMenuOpen),
        closeMobileMenu: () => setIsMobileMenuOpen(false),
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
