import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Megaphone,
  BookOpen,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  X,
  Download,
  Bell,
  CheckCheck,
  MoreHorizontal,
  User,
  Pin,
  Eye,
  Image as ImageIcon,
  ShieldCheck,
  Flame,
  Globe,
  Users,
  Lock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useParentData } from '../../lib/parentData';
import { AttachmentViewerModal, AttachmentViewerData } from '../../components/shared/AttachmentViewerModal';
import { cn } from '../../components/ui/utils';
import toast from 'react-hot-toast';

export interface AnnouncementItem {
  id: string;
  tab: 'school' | 'subject' | 'adviser';
  category: 'Emergency' | 'Class Suspension' | 'General' | 'Academic' | 'Events';
  title: string;
  author: string;
  authorRole: string;
  date: string;
  time: string;
  content: string;
  targetType?: 'all' | 'section' | 'student' | 'all_teachers' | 'specific_teacher' | 'grade_level';
  targetGradeLevel?: string;
  targetSectionId?: string;
  targetStudentId?: string;
  targetStudentIds?: string[];
  targetTeacherIds?: string[];
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'pdf' | 'doc';
  attachmentSize?: string;
  isNew?: boolean;
  isRead?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  targetGrade?: string;
  likesCount?: number;
  createdAt?: any;
}

export function AnnouncementsView() {
  const { userData } = useAuth();
  const { children } = useParentData();
  const safeChildren = useMemo(() => (Array.isArray(children) ? children.filter(Boolean) : []), [children]);
  const myStudentIds = useMemo(() => safeChildren.map(c => c?.id).filter(Boolean) as string[], [safeChildren]);
  const mySectionIds = useMemo(() => safeChildren.map(c => c?.sectionId).filter(Boolean) as string[], [safeChildren]);

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [activeStoryFilter, setActiveStoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewerAttachment, setViewerAttachment] = useState<AttachmentViewerData | null>(null);

  // Likes tracking (localStorage)
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sm_liked_announcements_parent');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Acknowledged posts tracking (localStorage)
  const [acknowledgedPosts, setAcknowledgedPosts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sm_parent_acknowledged');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleLike = (id: string, currentCount: number = 0) => {
    const isLiked = !likedPosts[id];
    const newLiked = { ...likedPosts, [id]: isLiked };
    setLikedPosts(newLiked);
    localStorage.setItem('sm_liked_announcements_parent', JSON.stringify(newLiked));

    const newCount = isLiked ? currentCount + 1 : Math.max(0, currentCount - 1);
    updateDoc(doc(db, 'announcements', id), { likesCount: newCount }).catch(() => {});
  };

  const handleAcknowledge = (id: string) => {
    const newAck = { ...acknowledgedPosts, [id]: true };
    setAcknowledgedPosts(newAck);
    localStorage.setItem('sm_parent_acknowledged', JSON.stringify(newAck));
    toast.success('Notice marked as acknowledged!');
  };

  // Real-time Firestore sync
  useEffect(() => {
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const firestoreItems: AnnouncementItem[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                tab: data.tab || 'school',
                category: data.category || 'General',
                title: data.title || 'Official Advisory',
                author: data.author || 'Sta. Maria Elementary',
                authorRole: data.authorRole || 'School Administration',
                date: data.date || '',
                time: data.time || '',
                content: data.content || '',
                targetType: data.targetType || 'all',
                targetGradeLevel: data.targetGradeLevel,
                targetSectionId: data.targetSectionId,
                targetStudentId: data.targetStudentId,
                targetStudentIds: data.targetStudentIds,
                attachmentName: data.attachmentName || undefined,
                attachmentUrl: data.attachmentUrl || undefined,
                attachmentType: data.attachmentType || undefined,
                attachmentSize: data.attachmentSize || undefined,
                targetGrade: data.targetGrade || undefined,
                isPinned: !!data.isPinned,
                isArchived: !!data.isArchived,
                likesCount: data.likesCount || 0,
                createdAt: data.createdAt
              };
            });
            setAnnouncements(firestoreItems);
          }
        },
        (err) => {
          console.warn('[AnnouncementsView] Snapshot error:', err);
        }
      );
      return () => {
        try { unsubscribe(); } catch {}
      };
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Filtered Announcements for Parent's Learners
  const filteredFeed = useMemo(() => {
    const safeList = Array.isArray(announcements) ? announcements : [];
    return safeList
      .filter(a => a && !a.isArchived)
      .filter(a => {
        // Targeted filtering for parent
        if (!a.targetType || a.targetType === 'all') return true;
        if (a.targetType === 'section' && a.targetSectionId) {
          return mySectionIds.includes(a.targetSectionId);
        }
        if (a.targetType === 'student' && a.targetStudentId) {
          return myStudentIds.includes(a.targetStudentId);
        }
        if (a.targetType === 'grade_level' && a.targetGradeLevel) {
          return safeChildren.some(c => c && (c.gradeLevel === a.targetGradeLevel || `Grade ${c.gradeLevel}` === a.targetGradeLevel));
        }
        return true;
      })
      .filter(a => {
        if (activeStoryFilter === 'emergency') return a.category === 'Emergency' || a.category === 'Class Suspension';
        if (activeStoryFilter === 'school') return a.category === 'General' || a.tab === 'school';
        if (activeStoryFilter === 'academic') return a.category === 'Academic';
        if (activeStoryFilter === 'events') return a.category === 'Events';
        return true;
      })
      .filter(a => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          (a.title || '').toLowerCase().includes(q) ||
          (a.content || '').toLowerCase().includes(q) ||
          (a.author || '').toLowerCase().includes(q) ||
          (a.category || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
  }, [announcements, mySectionIds, myStudentIds, safeChildren, activeStoryFilter, searchQuery]);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#f0f2f5] py-4 sm:py-6 px-2 sm:px-4 flex justify-center">
      
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ------------------------------------------------------------- */}
        {/* LEFT SOCIAL SIDEBAR (Desktop 3.5 cols) */}
        {/* ------------------------------------------------------------- */}
        <div className="hidden lg:block lg:col-span-3 space-y-4 sticky top-6 h-fit">
          
          {/* Parent Profile Card */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-md shadow-blue-500/20">
                {(String(userData?.firstName || 'P')).charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-black text-slate-900 truncate">
                    {userData?.firstName ? `${String(userData.firstName)} ${String(userData.lastName || '')}` : 'Parent Portal'}
                  </p>
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                </div>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {children.length} Enrolled Learner{children.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {children.length > 0 && (
              <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <p className="text-[10px] font-black uppercase text-slate-400">My Children</p>
                {children.map(c => (
                  <div key={c.id} className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="truncate">{c.firstName} {c.lastName}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{c.gradeLevel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feed Filter Channels */}
          <div className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-2xs space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 pt-2 pb-1">
              Feed Channels
            </p>

            {[
              { id: 'all', label: 'All Notices', icon: Globe, color: 'text-blue-600' },
              { id: 'emergency', label: 'Emergency Alerts', icon: Flame, color: 'text-rose-600' },
              { id: 'school', label: 'School Bulletins', icon: Megaphone, color: 'text-amber-600' },
              { id: 'academic', label: 'Academic Updates', icon: BookOpen, color: 'text-emerald-600' },
              { id: 'events', label: 'School Events', icon: Calendar, color: 'text-purple-600' }
            ].map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveStoryFilter(ch.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer",
                  activeStoryFilter === ch.id
                    ? "bg-red-50 text-[#D8232A] shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <ch.icon className={cn("w-4 h-4", ch.color)} />
                  <span>{ch.label}</span>
                </div>
                {activeStoryFilter === ch.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D8232A]" />
                )}
              </button>
            ))}
          </div>

        </div>

        {/* ------------------------------------------------------------- */}
        {/* CENTER NEWS FEED (Mobile 12 cols, Desktop 6 cols) */}
        {/* ------------------------------------------------------------- */}
        <div className="col-span-1 lg:col-span-6 space-y-3.5 sm:space-y-4 max-w-xl mx-auto w-full">

          {/* Mobile Search & Quick Bar (Visible on mobile & tablet) */}
          <div className="lg:hidden bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search announcements, topics, authors..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl bg-slate-50 border-0 focus:bg-white transition-all w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 1. INSTAGRAM-STYLE STORIES / CHANNEL HIGHLIGHTS RAIL */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              
              {/* Story 1: All */}
              <button
                onClick={() => setActiveStoryFilter('all')}
                className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer group border-0 bg-transparent"
              >
                <div className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 transition-transform group-hover:scale-105",
                  activeStoryFilter === 'all'
                    ? "bg-gradient-to-tr from-amber-500 via-red-500 to-purple-600 ring-2 ring-red-200"
                    : "bg-slate-200"
                )}>
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-0.5">
                    <div className="w-full h-full rounded-full bg-red-50 text-[#D8232A] flex items-center justify-center font-black text-xs">
                      🏫
                    </div>
                  </div>
                </div>
                <span className={cn("text-[10px] sm:text-[11px] font-bold truncate max-w-[56px] sm:max-w-[64px]", activeStoryFilter === 'all' ? "text-[#D8232A] font-black" : "text-slate-600")}>
                  All Feed
                </span>
              </button>

              {/* Story 2: Emergency */}
              <button
                onClick={() => setActiveStoryFilter('emergency')}
                className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer group border-0 bg-transparent"
              >
                <div className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 transition-transform group-hover:scale-105",
                  activeStoryFilter === 'emergency'
                    ? "bg-gradient-to-tr from-red-600 to-rose-400 ring-2 ring-rose-300"
                    : "bg-slate-200"
                )}>
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-0.5">
                    <div className="w-full h-full rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xs">
                      🚨
                    </div>
                  </div>
                </div>
                <span className={cn("text-[10px] sm:text-[11px] font-bold truncate max-w-[56px] sm:max-w-[64px]", activeStoryFilter === 'emergency' ? "text-rose-600 font-black" : "text-slate-600")}>
                  Urgent
                </span>
              </button>

              {/* Story 3: School */}
              <button
                onClick={() => setActiveStoryFilter('school')}
                className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer group border-0 bg-transparent"
              >
                <div className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 transition-transform group-hover:scale-105",
                  activeStoryFilter === 'school'
                    ? "bg-gradient-to-tr from-amber-400 to-orange-500 ring-2 ring-amber-300"
                    : "bg-slate-200"
                )}>
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-0.5">
                    <div className="w-full h-full rounded-full bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xs">
                      📢
                    </div>
                  </div>
                </div>
                <span className={cn("text-[10px] sm:text-[11px] font-bold truncate max-w-[56px] sm:max-w-[64px]", activeStoryFilter === 'school' ? "text-amber-600 font-black" : "text-slate-600")}>
                  Bulletins
                </span>
              </button>

              {/* Story 4: Academic */}
              <button
                onClick={() => setActiveStoryFilter('academic')}
                className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer group border-0 bg-transparent"
              >
                <div className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 transition-transform group-hover:scale-105",
                  activeStoryFilter === 'academic'
                    ? "bg-gradient-to-tr from-emerald-400 to-teal-500 ring-2 ring-emerald-300"
                    : "bg-slate-200"
                )}>
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-0.5">
                    <div className="w-full h-full rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
                      📚
                    </div>
                  </div>
                </div>
                <span className={cn("text-[10px] sm:text-[11px] font-bold truncate max-w-[56px] sm:max-w-[64px]", activeStoryFilter === 'academic' ? "text-emerald-600 font-black" : "text-slate-600")}>
                  Academic
                </span>
              </button>

              {/* Story 5: Events */}
              <button
                onClick={() => setActiveStoryFilter('events')}
                className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer group border-0 bg-transparent"
              >
                <div className={cn(
                  "w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 transition-transform group-hover:scale-105",
                  activeStoryFilter === 'events'
                    ? "bg-gradient-to-tr from-purple-400 to-indigo-500 ring-2 ring-purple-300"
                    : "bg-slate-200"
                )}>
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center p-0.5">
                    <div className="w-full h-full rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-black text-xs">
                      🎉
                    </div>
                  </div>
                </div>
                <span className={cn("text-[10px] sm:text-[11px] font-bold truncate max-w-[56px] sm:max-w-[64px]", activeStoryFilter === 'events' ? "text-purple-600 font-black" : "text-slate-600")}>
                  Events
                </span>
              </button>

            </div>
          </div>

          {/* 2. SOCIAL POSTS FEED STREAM */}
          <div className="space-y-3.5 sm:space-y-4">
            {filteredFeed.map((post) => {
              const isLiked = !!likedPosts[post.id];
              const isAcknowledged = !!acknowledgedPosts[post.id];
              const isEmergency = post.category === 'Emergency' || post.category === 'Class Suspension';

              return (
                <div
                  key={post.id}
                  className={cn(
                    "bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all",
                    isEmergency && "border-rose-200 shadow-md shadow-rose-500/5",
                    post.isPinned && "ring-2 ring-amber-300"
                  )}
                >
                  {/* Pinned Header */}
                  {post.isPinned && (
                    <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center justify-between text-[11px] font-black text-amber-800">
                      <span className="flex items-center gap-1.5">
                        <Pin className="w-3 h-3 fill-amber-500 text-amber-500" /> PINNED BULLETIN
                      </span>
                      <span className="text-[10px] text-amber-600 font-semibold">Important</span>
                    </div>
                  )}

                  {/* Post Top Header */}
                  <div className="p-3.5 sm:p-5 pb-2.5 sm:pb-3 flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className={cn(
                        "w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-2xs shrink-0",
                        isEmergency ? "bg-gradient-to-tr from-red-600 to-rose-500" : "bg-gradient-to-tr from-slate-800 to-slate-900"
                      )}>
                        {post.author.charAt(0)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs sm:text-sm text-slate-900 truncate">{post.author}</span>
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <Badge className={cn("text-[9px] px-1.5 py-0 font-extrabold uppercase shrink-0", isEmergency ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600")}>
                            {post.category}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 flex-wrap">
                          <span>{post.date} {post.time ? `• ${post.time}` : ''}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500">
                            {post.targetType === 'all' ? (
                              <>
                                <Globe className="w-3 h-3" /> All School
                              </>
                            ) : (
                              <>
                                <Users className="w-3 h-3 text-blue-600" /> Class Section
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post Content Body */}
                  <div className="px-3.5 sm:px-5 pb-3 space-y-1.5 sm:space-y-2">
                    <h3 className={cn("text-sm sm:text-base font-black leading-snug break-words", isEmergency ? "text-rose-900" : "text-slate-900")}>
                      {post.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                      {post.content}
                    </p>
                  </div>

                  {/* Post Media Attachment Box (Instagram Style) */}
                  {post.attachmentUrl && (
                    <div className="px-4 sm:px-5 pb-3">
                      {post.attachmentType === 'image' || /\.(jpg|jpeg|png|webp)$/i.test(post.attachmentUrl) ? (
                        <div
                          onClick={() => setViewerAttachment({
                            url: post.attachmentUrl!,
                            name: post.attachmentName || 'Attachment',
                            type: 'image',
                            size: post.attachmentSize
                          })}
                          className="rounded-2xl overflow-hidden border border-slate-200 cursor-pointer group relative max-h-[380px] bg-slate-900 flex items-center justify-center"
                        >
                          <img
                            src={post.attachmentUrl}
                            alt={post.attachmentName || 'Attachment'}
                            className="w-full h-auto object-cover group-hover:scale-[1.01] transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="bg-white/90 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                              <Eye className="w-3.5 h-3.5" /> Tap to view image
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => setViewerAttachment({
                            url: post.attachmentUrl!,
                            name: post.attachmentName || 'Document Attachment',
                            type: 'pdf',
                            size: post.attachmentSize
                          })}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{post.attachmentName || 'Attached Document'}</p>
                              <p className="text-[10px] text-slate-400 font-semibold">{post.attachmentSize || 'PDF Document'}</p>
                            </div>
                          </div>
                          <Download className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Footer (Acknowledge Notice) */}
                  <div className="px-4 sm:px-5 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
                    <button
                      onClick={() => handleAcknowledge(post.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer",
                        isAcknowledged ? "text-emerald-700 bg-emerald-50 font-black" : "hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <CheckCheck className={cn("w-4 h-4", isAcknowledged ? "text-emerald-600" : "text-slate-400")} />
                      <span>{isAcknowledged ? 'Acknowledged ✓' : 'Acknowledge Notice'}</span>
                    </button>

                    <span className="text-[11px] text-slate-400 font-medium">
                      Official Notice
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredFeed.length === 0 && (
              <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="text-base font-black text-slate-800">No Announcements Right Now</h3>
                <p className="text-xs text-slate-400 mt-1">Official bulletins and teacher updates will appear here.</p>
              </div>
            )}
          </div>

        </div>

        {/* ------------------------------------------------------------- */}
        {/* RIGHT SOCIAL SIDEBAR (Desktop 3.5 cols) */}
        {/* ------------------------------------------------------------- */}
        <div className="hidden lg:block lg:col-span-3 space-y-4 sticky top-6 h-fit">
          
          {/* Search Box */}
          <div className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-2xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search bulletin..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-2xl bg-slate-50 border-0"
              />
            </div>
          </div>

          {/* School Helpdesk Box */}
          <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-3xl p-5 shadow-md shadow-red-500/20 space-y-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <p className="text-xs font-black uppercase tracking-wider">Official Announcements</p>
            </div>
            <p className="text-xs text-red-100 font-medium leading-relaxed">
              Stay connected with Sta. Maria Elementary School events, academic calendars, and school-wide advisories.
            </p>
            <div className="pt-2 border-t border-red-500/40 text-[11px] font-bold text-red-100 flex items-center justify-between">
              <span>DepEd Region IX</span>
              <span>Zamboanga City</span>
            </div>
          </div>

        </div>

      </div>

      {/* ATTACHMENT VIEWER MODAL */}
      <AttachmentViewerModal
        isOpen={!!viewerAttachment}
        attachment={viewerAttachment}
        onClose={() => setViewerAttachment(null)}
      />

    </div>
  );
}
export default AnnouncementsView;
