import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { BulletinPost, SeatingPlan, SeatingSlot, HonorBoard, Student } from '../types';
import {
  Megaphone,
  LayoutGrid,
  Trophy,
  Plus,
  Pin,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Printer,
  Save,
  CheckCircle2,
  Youtube,
  Image,
  Video,
  ExternalLink,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';

export const BulletinSeating: React.FC = () => {
  const { userRole, students, showToast, config } = useApp();
  const [subTab, setSubTab] = useState<'bulletin' | 'seating' | 'honor'>('bulletin');

  // --- Bulletin state ---
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<BulletinPost> | null>(null);

  // --- Seating state ---
  const [seating, setSeating] = useState<SeatingPlan | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SeatingSlot | null>(null);
  const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);

  // --- Honor state ---
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [honorBoard, setHonorBoard] = useState<HonorBoard | null>(null);
  const [customRewardTitle, setCustomRewardTitle] = useState('');
  const [customRewardNames, setCustomRewardNames] = useState('');
  const [customRewardDesc, setCustomRewardDesc] = useState('');

  // Load data
  useEffect(() => {
    loadBulletin();
    loadSeating();
    loadHonor(selectedMonth);
  }, [selectedMonth]);

  const loadBulletin = async () => {
    try {
      const data = await api.getBulletin();
      setPosts(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadSeating = async () => {
    try {
      const data = await api.getSeating();
      setSeating(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadHonor = async (month: string) => {
    try {
      const data = await api.getHonor(month);
      setHonorBoard(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  // --- Bulletin Actions ---
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost?.title || !editingPost?.content) {
      showToast('Vui lòng nhập tiêu đề và nội dung', 'error');
      return;
    }

    try {
      await api.saveBulletinPost(editingPost);
      showToast('Đã lưu bài viết thành công');
      setIsPostModalOpen(false);
      setEditingPost(null);
      loadBulletin();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài viết này?')) return;
    try {
      await api.deleteBulletinPost(id);
      showToast('Đã xóa bài viết');
      loadBulletin();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // YouTube embed helper
  const getYouTubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  // --- Seating Actions ---
  const handleAssignSeat = (studentId: string | null) => {
    if (!seating || !selectedSlot) return;

    // Check if student is already seated elsewhere
    if (studentId) {
      const alreadySeated = seating.slots.find(
        s =>
          s.studentId === studentId &&
          !(s.column === selectedSlot.column && s.desk === selectedSlot.desk && s.position === selectedSlot.position)
      );
      if (alreadySeated) {
        showToast('Học sinh này đã được xếp chỗ khác trên sơ đồ', 'error');
        return;
      }
    }

    const updatedSlots = seating.slots.map(s => {
      if (s.column === selectedSlot.column && s.desk === selectedSlot.desk && s.position === selectedSlot.position) {
        return { ...s, studentId };
      }
      return s;
    });

    setSeating({ ...seating, slots: updatedSlots });
    setIsSeatModalOpen(false);
    setSelectedSlot(null);
  };

  const handleSaveSeatingPlan = async () => {
    if (!seating) return;
    try {
      await api.saveSeating(seating);
      showToast('Đã lưu sơ đồ lớp thành công');
      loadSeating();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleTogglePublishSeating = async () => {
    if (!seating) return;
    try {
      const updated = { ...seating, isPublished: !seating.isPublished };
      await api.saveSeating(updated);
      setSeating(updated);
      showToast(updated.isPublished ? 'Đã công bố sơ đồ cho học sinh xem' : 'Đã chuyển sơ đồ về bản nháp');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // --- Honor Actions ---
  const handlePublishHonor = async (isPub: boolean) => {
    try {
      await api.publishHonor(selectedMonth, isPub, honorBoard?.customRewards);
      showToast(isPub ? `Đã công bố bảng vàng tháng ${selectedMonth}` : 'Đã hủy công bố bảng vàng');
      loadHonor(selectedMonth);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleAddCustomReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRewardTitle || !customRewardNames) return;

    const newReward = {
      title: customRewardTitle,
      studentNames: customRewardNames,
      description: customRewardDesc,
    };

    const currentRewards = honorBoard?.customRewards || [];
    const updatedRewards = [...currentRewards, newReward];

    try {
      await api.publishHonor(selectedMonth, Boolean(honorBoard?.isPublished), updatedRewards);
      showToast('Đã thêm khen thưởng phong trào');
      setCustomRewardTitle('');
      setCustomRewardNames('');
      setCustomRewardDesc('');
      loadHonor(selectedMonth);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Student map for fast lookup
  const studentMap = new Map<string, Student>();
  students.forEach(s => studentMap.set(s.id, s));

  // Available students not yet seated
  const seatedStudentIds = new Set(
    (seating?.slots || []).map(s => s.studentId).filter(Boolean) as string[]
  );
  const unseatedStudents = students.filter(s => !seatedStudentIds.has(s.id) && s.status === 'active');

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* 3 Sub-tabs bar matching Image 3 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200/80 pb-4">
        <div className="flex items-center gap-1.5 rounded-xl bg-white p-1 shadow-xs border border-rose-200">
          <button
            onClick={() => setSubTab('bulletin')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              subTab === 'bulletin'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className="h-4 w-4" />
            <span>Bảng tin Thông báo</span>
          </button>
          <button
            onClick={() => setSubTab('seating')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              subTab === 'seating'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Sơ đồ lớp</span>
          </button>
          <button
            onClick={() => setSubTab('honor')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              subTab === 'honor'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>Vinh danh & Thi đua</span>
          </button>
        </div>

        {/* Action button on right */}
        {subTab === 'bulletin' && userRole === 'teacher' && (
          <button
            onClick={() => {
              setEditingPost({
                category: 'announcement',
                isPublished: true,
                isPinned: false,
              });
              setIsPostModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-rose-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Đăng thông tin mới</span>
          </button>
        )}

        {subTab === 'seating' && userRole === 'teacher' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              <span>In sơ đồ</span>
            </button>
            <button
              onClick={handleTogglePublishSeating}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors ${
                seating?.isPublished
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {seating?.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span>{seating?.isPublished ? 'Đã công bố' : 'Công bố học sinh'}</span>
            </button>
            <button
              onClick={handleSaveSeatingPlan}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-600 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Lưu sơ đồ</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: BẢNG TIN */}
      {subTab === 'bulletin' && (
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-rose-200 bg-white p-12 text-center shadow-xs">
              <Megaphone className="mx-auto h-12 w-12 text-rose-300" />
              <h3 className="mt-3 text-base font-bold text-slate-800">
                Chưa có bài đăng nào trên bảng tin
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {userRole === 'teacher'
                  ? 'Bấm nút "Đăng thông tin mới" để chia sẻ thông báo, nhắc nhở hoặc thành tích của lớp.'
                  : 'Hiện tại chưa có thông báo mới từ giáo viên chủ nhiệm.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {posts.map(post => {
                const embedUrl = getYouTubeEmbedUrl(post.embedUrl);
                return (
                  <div
                    key={post.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {post.isPinned && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                            <Pin className="h-3 w-3" />
                            Ghim
                          </span>
                        )}
                        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                          {post.category === 'announcement'
                            ? 'Thông báo'
                            : post.category === 'competition'
                            ? 'Thi đua'
                            : 'Nhắc nhở'}
                        </span>
                        {!post.isPublished && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            Bản nháp
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString('vi-VN')
                            : 'Chưa công bố'}
                        </span>
                      </div>

                      {userRole === 'teacher' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingPost(post);
                              setIsPostModalOpen(true);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Sửa bài viết"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Xóa bài viết"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="mt-3 text-lg font-bold text-slate-900">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {/* Media attachments */}
                    {post.mediaUrl && (
                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 max-w-xl">
                        {post.mediaType === 'video' ? (
                          <video
                            src={post.mediaUrl}
                            controls
                            className="w-full max-h-[360px] object-cover bg-black"
                          />
                        ) : (
                          <img
                            src={post.mediaUrl}
                            alt="Hình ảnh đính kèm"
                            className="w-full max-h-[380px] object-cover"
                          />
                        )}
                      </div>
                    )}

                    {/* YouTube embed */}
                    {embedUrl && (
                      <div className="mt-4 aspect-video max-w-xl overflow-hidden rounded-xl border border-slate-200">
                        <iframe
                          src={embedUrl}
                          title={post.title}
                          className="h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {/* Google Drive Link */}
                    {post.embedUrl && !embedUrl && post.embedUrl.includes('drive.google.com') && (
                      <div className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
                        <ExternalLink className="h-4 w-4 shrink-0 text-blue-600" />
                        <div>
                          <a
                            href={post.embedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold underline hover:text-blue-900"
                          >
                            Mở tài liệu Google Drive đính kèm
                          </a>
                          <div className="text-[11px] text-blue-600">
                            * Lưu ý: Hãy đảm bảo tệp Drive đã được bật chia sẻ quyền xem cho mọi người có liên kết.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SƠ ĐỒ LỚP (4 dãy x 7 bàn x 2 chỗ = 56 chỗ) */}
      {subTab === 'seating' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          {/* Header indicator & orientation */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {seating?.title || 'Sơ đồ lớp chính thức'}
                </h3>
                <p className="text-xs text-slate-500">
                  4 dãy bàn · Mỗi dãy 7 bàn · Mỗi bàn 2 chỗ (Tổng cộng 56 chỗ)
                </p>
              </div>
              <div className="text-xs font-semibold text-slate-600">
                Đã xếp: <span className="text-rose-600 font-bold">{seatedStudentIds.size}</span> / {students.length} học sinh
              </div>
            </div>

            {/* Blackboard, Teacher Desk & Door Bar */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Teacher Desk */}
                <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 shadow-xs">
                  <span>BÀN GIÁO VIÊN</span>
                </div>

                {/* Black board in center */}
                <div className="flex-1 max-w-md rounded-lg bg-emerald-950 px-6 py-2.5 text-center text-xs font-extrabold tracking-widest text-emerald-100 shadow-inner">
                  BẢNG ĐEN (HƯỚNG NHÌN LÊN BẢNG)
                </div>

                {/* Door */}
                <div className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs">
                  CỬA RA VÀO 🚪
                </div>
              </div>
            </div>
          </div>

          {/* 4 Dãy Columns Grid */}
          <div className="overflow-x-auto pb-4">
            <div className="grid min-w-[760px] grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(col => (
                <div key={col} className="space-y-3">
                  <div className="rounded-lg bg-rose-50 py-1.5 text-center text-xs font-bold text-rose-800">
                    DÃY {col}
                  </div>

                  {/* 7 Desks in this column */}
                  {[1, 2, 3, 4, 5, 6, 7].map(desk => {
                    const slot1 = seating?.slots.find(
                      s => s.column === col && s.desk === desk && s.position === 1
                    );
                    const slot2 = seating?.slots.find(
                      s => s.column === col && s.desk === desk && s.position === 2
                    );

                    const student1 = slot1?.studentId ? studentMap.get(slot1.studentId) : null;
                    const student2 = slot2?.studentId ? studentMap.get(slot2.studentId) : null;

                    return (
                      <div
                        key={desk}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-2 shadow-xs"
                      >
                        <div className="mb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                          Bàn {desk}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {/* Seat 1 (Trái) */}
                          <div
                            onClick={() => {
                              if (userRole === 'teacher') {
                                setSelectedSlot({ column: col, desk, position: 1, studentId: slot1?.studentId || null });
                                setIsSeatModalOpen(true);
                              }
                            }}
                            className={`flex min-h-[52px] flex-col justify-center rounded-lg border p-1.5 text-center text-xs transition-all ${
                              userRole === 'teacher' ? 'cursor-pointer hover:border-rose-400' : ''
                            } ${
                              student1
                                ? 'border-rose-200 bg-white font-bold text-slate-900 shadow-xs'
                                : 'border-dashed border-slate-300 bg-slate-100/50 text-slate-400'
                            }`}
                          >
                            {student1 ? (
                              <>
                                <span className="text-[10px] text-rose-600 font-semibold">{student1.code}</span>
                                <span className="truncate text-[11px]">{student1.fullName}</span>
                              </>
                            ) : (
                              <span className="text-[11px]">Trống</span>
                            )}
                          </div>

                          {/* Seat 2 (Phải) */}
                          <div
                            onClick={() => {
                              if (userRole === 'teacher') {
                                setSelectedSlot({ column: col, desk, position: 2, studentId: slot2?.studentId || null });
                                setIsSeatModalOpen(true);
                              }
                            }}
                            className={`flex min-h-[52px] flex-col justify-center rounded-lg border p-1.5 text-center text-xs transition-all ${
                              userRole === 'teacher' ? 'cursor-pointer hover:border-rose-400' : ''
                            } ${
                              student2
                                ? 'border-rose-200 bg-white font-bold text-slate-900 shadow-xs'
                                : 'border-dashed border-slate-300 bg-slate-100/50 text-slate-400'
                            }`}
                          >
                            {student2 ? (
                              <>
                                <span className="text-[10px] text-rose-600 font-semibold">{student2.code}</span>
                                <span className="truncate text-[11px]">{student2.fullName}</span>
                              </>
                            ) : (
                              <span className="text-[11px]">Trống</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VINH DANH & THI ĐUA */}
      {subTab === 'honor' && (
        <div className="space-y-6">
          {/* Top Month Selector & Publish Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Bảng Vàng Vinh Danh Học Tập & Thi Đua
                </h3>
                <p className="text-xs text-slate-500">
                  Top 5 học tập lấy tự động từ điểm trung bình tháng (các môn có điểm số)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-rose-500"
              />

              {userRole === 'teacher' && (
                <button
                  onClick={() => handlePublishHonor(!honorBoard?.isPublished)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-xs transition-colors ${
                    honorBoard?.isPublished
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-rose-500 text-white hover:bg-rose-600'
                  }`}
                >
                  <Trophy className="h-4 w-4" />
                  <span>
                    {honorBoard?.isPublished ? 'Đã công bố (Nhấn để gỡ)' : 'Công bố bảng vàng'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Republish notification if scores changed */}
          {honorBoard?.requiresRepublish && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-4 text-xs font-medium text-amber-800 border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Điểm số tháng {selectedMonth} đã được cập nhật sau khi công bố. Vui lòng bấm "Công bố bảng vàng" lại để cập nhật danh sách Top 5 mới nhất cho học sinh.
              </span>
            </div>
          )}

          {/* Top 5 Academic Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                🏆 Top 5 Điểm Trung Bình Tháng {selectedMonth}
              </h4>
              <span className="text-xs text-slate-400">
                {honorBoard?.isPublished ? 'Đang công bố' : 'Bản nháp nội bộ'}
              </span>
            </div>

            <div className="mt-4">
              {!honorBoard?.topAcademic || honorBoard.topAcademic.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Chưa có dữ liệu điểm học tập của tháng {selectedMonth} để xếp hạng Top 5.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {honorBoard.topAcademic.map((stu, idx) => (
                    <div
                      key={stu.studentId}
                      className={`relative overflow-hidden rounded-xl border p-4 text-center shadow-xs transition-all ${
                        idx === 0
                          ? 'border-amber-300 bg-amber-50/60'
                          : idx === 1
                          ? 'border-slate-300 bg-slate-50/60'
                          : idx === 2
                          ? 'border-orange-300 bg-orange-50/60'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="text-2xl font-black">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </div>
                      <div className="mt-2 text-xs font-bold text-slate-900 uppercase truncate">
                        {stu.studentName}
                      </div>
                      <div className="text-[11px] text-slate-500">Mã: {stu.studentCode}</div>
                      <div className="mt-2 inline-flex items-center rounded-md bg-white px-2 py-0.5 text-xs font-extrabold text-rose-600 shadow-2xs">
                        ĐTB: {stu.gpa.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Custom Conduct / Extracurricular Rewards Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-4">
              🌟 Khen Thưởng Thi Đua & Hoạt Động Phong Trào
            </h4>

            {userRole === 'teacher' && (
              <form onSubmit={handleAddCustomReward} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder="Danh hiệu (VD: Hoa điểm 10, Tổ xuất sắc...)"
                  value={customRewardTitle}
                  onChange={e => setCustomRewardTitle(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Tên cá nhân / tập thể được khen"
                  value={customRewardNames}
                  onChange={e => setCustomRewardNames(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Mô tả thành tích"
                    value={customRewardDesc}
                    onChange={e => setCustomRewardDesc(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-600 shrink-0"
                  >
                    Thêm
                  </button>
                </div>
              </form>
            )}

            <div className="mt-4 space-y-2">
              {!honorBoard?.customRewards || honorBoard.customRewards.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Chưa có khen thưởng thi đua nào được ghi nhận cho tháng này.
                </div>
              ) : (
                honorBoard.customRewards.map((rew, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/40 p-3"
                  >
                    <div>
                      <span className="font-bold text-xs text-rose-700">{rew.title}: </span>
                      <span className="font-semibold text-xs text-slate-800">{rew.studentNames}</span>
                      {rew.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{rew.description}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Thêm/Sửa Bài Báo Bảng Tin */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingPost?.id ? 'Chỉnh sửa bài viết' : 'Đăng bài viết mới'}
              </h3>
              <button
                onClick={() => setIsPostModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePost} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700">Tiêu đề</label>
                <input
                  type="text"
                  required
                  value={editingPost?.title || ''}
                  onChange={e => setEditingPost({ ...editingPost, title: e.target.value })}
                  placeholder="Nhập tiêu đề thông báo..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Phân loại</label>
                  <select
                    value={editingPost?.category || 'announcement'}
                    onChange={e => setEditingPost({ ...editingPost, category: e.target.value as any })}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                  >
                    <option value="announcement">Thông báo chung</option>
                    <option value="competition">Thi đua phong trào</option>
                    <option value="reminder">Nhắc nhở nề nếp</option>
                  </select>
                </div>
                <div className="flex items-center gap-4 pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPost?.isPinned || false}
                      onChange={e => setEditingPost({ ...editingPost, isPinned: e.target.checked })}
                      className="rounded text-rose-500 focus:ring-rose-400"
                    />
                    <span>Ghim đầu trang</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPost?.isPublished !== false}
                      onChange={e => setEditingPost({ ...editingPost, isPublished: e.target.checked })}
                      className="rounded text-rose-500 focus:ring-rose-400"
                    />
                    <span>Công bố ngay</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Nội dung</label>
                <textarea
                  required
                  rows={4}
                  value={editingPost?.content || ''}
                  onChange={e => setEditingPost({ ...editingPost, content: e.target.value })}
                  placeholder="Nhập nội dung thông báo chi tiết..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Liên kết YouTube hoặc Google Drive (Tùy chọn)
                </label>
                <input
                  type="url"
                  value={editingPost?.embedUrl || ''}
                  onChange={e => setEditingPost({ ...editingPost, embedUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... hoặc link Drive"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Tải lên ảnh hoặc clip từ máy
                </label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 15 * 1024 * 1024) {
                        showToast('Dung lượng tệp không được vượt quá 15MB', 'error');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = ev => {
                        const isVideo = file.type.startsWith('video');
                        setEditingPost({
                          ...editingPost,
                          mediaUrl: ev.target?.result as string,
                          mediaType: isVideo ? 'video' : 'image',
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="mt-1 w-full text-xs text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-rose-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-rose-700 hover:file:bg-rose-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-600"
                >
                  Lưu bài đăng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Xếp Chỗ Học Sinh */}
      {isSeatModalOpen && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-rose-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Xếp chỗ: Dãy {selectedSlot.column} · Bàn {selectedSlot.desk} · Chỗ{' '}
                {selectedSlot.position === 1 ? '1 (Trái)' : '2 (Phải)'}
              </h3>
              <button
                onClick={() => setIsSeatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="text-xs text-slate-600">
                Chọn học sinh để xếp vào vị trí này:
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border border-slate-100 rounded-xl p-2">
                {selectedSlot.studentId && (
                  <button
                    onClick={() => handleAssignSeat(null)}
                    className="flex w-full items-center justify-between rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <span>Bỏ xếp chỗ (Để trống)</span>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                {students.map(s => {
                  const isCurrent = s.id === selectedSlot.studentId;
                  const isSeatedElsewhere = seatedStudentIds.has(s.id) && !isCurrent;
                  return (
                    <button
                      key={s.id}
                      disabled={isSeatedElsewhere}
                      onClick={() => handleAssignSeat(s.id)}
                      className={`flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition-colors ${
                        isCurrent
                          ? 'bg-rose-500 font-bold text-white'
                          : isSeatedElsewhere
                          ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400'
                          : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <span>
                        [{s.code}] {s.fullName}
                      </span>
                      {isCurrent && <CheckCircle2 className="h-4 w-4" />}
                      {isSeatedElsewhere && (
                        <span className="text-[10px] text-slate-400">Đã xếp</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
