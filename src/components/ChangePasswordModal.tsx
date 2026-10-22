import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { KeyRound, X, CheckCircle2 } from 'lucide-react';

export const ChangePasswordModal: React.FC = () => {
  const { isChangePasswordOpen, closeChangePassword, userRole, showToast } = useApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isChangePasswordOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Mật khẩu mới và xác nhận mật khẩu không khớp', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.changePassword(currentPassword, newPassword, confirmPassword);
      showToast('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      closeChangePassword();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-rose-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-rose-800" />
            <h3 className="text-base font-bold text-slate-900">
              {userRole === 'teacher' ? 'Đổi mật khẩu Giáo viên' : 'Đổi mật khẩu Học sinh'}
            </h3>
          </div>
          <button onClick={closeChangePassword} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700">Mật khẩu hiện tại</label>
            <input
              type="password"
              required
              placeholder="Nhập mật khẩu đang dùng"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Mật khẩu mới (tối thiểu 6 ký tự)</label>
            <input
              type="password"
              required
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              required
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={closeChangePassword}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-rose-500 px-5 py-2 text-xs font-bold text-slate-800 shadow-xs hover:bg-rose-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
