import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Megaphone,
  BookOpen,
  UserCheck,
  Search,
  Filter,
  Calendar,
  Paperclip,
  Clock,
  AlertTriangle,
  FileText,
  X,
  ArrowRight,
  Download,
  Bell,
  CheckCheck,
  MoreHorizontal,
  User,
  Pin,
  Eye,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useParentData } from '../../lib/parentData';
import { AttachmentViewerModal, AttachmentViewerData } from '../../components/shared/AttachmentViewerModal';

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
  createdAt?: any;
}

export function AnnouncementsView() {
  const { userData } = useAuth();
  const { children } = useParentData();
  const myStudentIds = useMemo(() => children.map(c => c.id), [children]);
  const mySectionIds = useMemo(() => children.map(c => c.sectionId), [children]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [activeTab, setActiveTab] = useState<'school' | 'subject' | 'adviser'>('school');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [viewerAttachment, setViewerAttachment] = useState<AttachmentViewerData | null>(null);

  const handleOpenViewer = (item: { attachmentUrl?: string; attachmentName?: string; attachmentType?: 'image' | 'pdf' | 'doc'; attachmentSize?: string }) => {
    if (!item.attachmentUrl) return;
    setViewerAttachment({
      url: item.attachmentUrl,
      name: item.attachmentName || 'Attached Document',
      type: item.attachmentType || (/\.(jpg|jpeg|png|webp)$/i.test(item.attachmentUrl) ? 'image' : 'pdf'),
      size: item.attachmentSize
    });
  };

  const handleDownloadAttachment = async (url?: string, name?: string) => {
    if (!url) return;
    try {
      // Fetch + blob: works reliably for CORS-enabled file hosts (ImageKit, Firebase Storage)
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = name || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch {
      // Fallback: open in new tab (browser will prompt save if content-disposition is set)
      const link = document.createElement('a');
      link.href = url;
      link.download = name || 'download';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Read items persisted in localStorage
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sm_read_announcements');
      return saved ? JSON.parse(saved) : ['ann-4', 'ann-5'];
    } catch (e) {
      return ['ann-4', 'ann-5'];
    }
  });

  // Real-time Firestore sync with fallback
  useEffect(() => {
    try {
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const firestoreItems: AnnouncementItem[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              tab: data.tab || 'school',
              category: data.category || 'General',
              title: data.title || 'Untitled Advisory',
              author: data.author || 'School Admin',
              authorRole: data.authorRole || 'Faculty',
              date: data.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              time: data.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
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
              isNew: !readIds.includes(docSnap.id),
              isRead: readIds.includes(docSnap.id)
            };
          });
          setAnnouncements(firestoreItems);
        } else {
          setAnnouncements([]);
        }
      }, (error) => {
        console.warn('Firestore announcements subscription note:', error);
      });

      return () => {
        setTimeout(() => unsubscribe(), 100);
      };
    } catch (err) {
      console.warn('Firestore announcements sync fallback:', err);
    }
  }, [readIds]);

  const categories = ['All', 'Emergency', 'Class Suspension', 'General', 'Academic', 'Events'];

  const updatedAnnouncements = useMemo(() => {
    return announcements
      .filter(a => {
        // Exclude archived announcements
        if (a.isArchived) return false;
        // Exclude faculty-only memos from parents
        if (a.targetType === 'all_teachers' || a.targetType === 'specific_teacher') return false;
        // Public broadcast
        if (!a.targetType || a.targetType === 'all') return true;
        // Grade level targeting
        if (a.targetType === 'grade_level') {
          if (!a.targetGradeLevel) return true;
          return (children || []).some(s => (s as any).gradeLevel === a.targetGradeLevel || (s as any).grade === a.targetGradeLevel);
        }
        // Specific student targeting
        if (a.targetType === 'student') {
          if (a.targetStudentIds && a.targetStudentIds.length > 0) {
            return a.targetStudentIds.some(id => myStudentIds.includes(id));
          } else if (a.targetStudentId) {
            return myStudentIds.includes(a.targetStudentId);
          }
          return false;
        }
        // Section targeting
        if (a.targetType === 'section' && a.targetSectionId) return mySectionIds.includes(a.targetSectionId);
        return false;
      })
      .map(a => ({
        ...a,
        isRead: readIds.includes(a.id),
        isNew: !readIds.includes(a.id)
      }))
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
  }, [announcements, readIds, myStudentIds, mySectionIds, children]);

  const badgeCounts = useMemo(() => {
    return {
      school: updatedAnnouncements.filter(a => a.tab === 'school' && !a.isRead).length,
      subject: updatedAnnouncements.filter(a => a.tab === 'subject' && !a.isRead).length,
      adviser: updatedAnnouncements.filter(a => a.tab === 'adviser' && !a.isRead).length
    };
  }, [updatedAnnouncements]);

  const filteredAnnouncements = useMemo(() => {
    return updatedAnnouncements.filter(a => {
      if (a.tab !== activeTab) return false;
      if (selectedCategory !== 'All' && a.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(q);
        const matchContent = a.content.toLowerCase().includes(q);
        const matchAuthor = a.author.toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchAuthor) return false;
      }
      return true;
    });
  }, [updatedAnnouncements, activeTab, selectedCategory, searchQuery]);

  const handleOpenAnnouncement = (item: AnnouncementItem) => {
    setSelectedAnnouncement(item);
    if (!readIds.includes(item.id)) {
      const nextRead = [...readIds, item.id];
      setReadIds(nextRead);
      try {
        localStorage.setItem('sm_read_announcements', JSON.stringify(nextRead));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7F9] font-sans">
      {/* ── TOP HEADER WITH TITLE, SEARCH & BELL (Aligned with lg:h-28 sidebar brand) ── */}
      <header className="bg-white px-6 py-6 lg:py-0 lg:h-28 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#D8232A] shrink-0 border border-red-100">
            <Megaphone className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Announcements</h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block max-w-lg leading-snug">
              Stay informed about class suspensions, school activities, and important advisories.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-40 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search announcements..."
              className="pl-9 pr-8 py-1.5 bg-slate-50 border-slate-200/80 rounded-full text-xs font-semibold focus:bg-white transition-all w-full h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative cursor-pointer shrink-0">
            <Bell className="w-4 h-4" />
            {badgeCounts.school + badgeCounts.subject + badgeCounts.adviser > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#D8232A] absolute top-2 right-2 ring-2 ring-white" />
            )}
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 w-full">
        {/* ── SEGMENTED CONTROL TABS BAR ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="bg-slate-100/80 p-1 sm:p-1.5 rounded-2xl border border-slate-200/60 flex items-center gap-0.5 sm:gap-1 shadow-2xs self-start w-full sm:w-auto overflow-x-auto no-scrollbar">
            {(['school', 'subject', 'adviser'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex-1 sm:flex-none ${
                  activeTab === tab
                    ? 'bg-[#D8232A] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                {tab === 'school' ? 'School' : tab === 'subject' ? 'Subjects' : 'Adviser'}
              </button>
            ))}
          </div>
        </div>

        {/* ── FILTER BY CATEGORY PILLS BAR ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest shrink-0 mr-1">
            FILTER BY
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer select-none ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── ANNOUNCEMENT CARDS GRID (2 COLUMNS) ── */}
        {filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-12 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
              <Megaphone className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Announcements Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              There are no announcements matching your selected filter or search terms.
            </p>
            {(selectedCategory !== 'All' || searchQuery) && (
              <Button
                onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                variant="outline"
                className="rounded-xl text-xs font-bold border-slate-200 cursor-pointer mt-2"
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-5">
            {filteredAnnouncements.map(item => {
              const isEmergency = item.category === 'Emergency' || item.category === 'Class Suspension';
              const iconBg = isEmergency ? 'bg-rose-50 text-rose-600' : 'bg-red-50 text-[#D8232A]';
              const categoryTextColor = isEmergency ? 'text-rose-600' : 'text-[#D8232A]';

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl ${item.isPinned ? 'border-amber-200 shadow-[0_4px_20px_rgba(245,158,11,0.08)]' : 'border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]'} border p-4 sm:p-5 hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] transition-all duration-200 space-y-3 flex flex-col justify-between overflow-hidden relative`}
                >
                  {/* Pinned Notice Ribbon */}
                  {item.isPinned && (
                    <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/5 to-transparent px-4 py-1.5 border-b border-amber-200/60 flex items-center justify-between -mx-6 -mt-6 mb-2">
                      <div className="flex items-center gap-1.5 text-amber-800 text-[10px] font-black tracking-wider uppercase">
                        <Pin className="w-3 h-3 text-amber-600 fill-amber-500" />
                        <span>Pinned Notice</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Top Row: Icon, Category & Time, Options */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
                          {isEmergency ? (
                            <AlertTriangle className="w-4.5 h-4.5" />
                          ) : (
                            <User className="w-4.5 h-4.5" />
                          )}
                        </div>
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-wider block ${categoryTextColor}`}>
                            {item.category}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {item.date} • {item.time}
                          </span>
                        </div>
                      </div>

                      <button className="text-slate-300 hover:text-slate-500 p-1 cursor-pointer">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Title & Author */}
                    <div>
                      <h3
                        onClick={() => handleOpenAnnouncement(item)}
                        className="text-base font-bold text-slate-900 leading-snug hover:text-[#D8232A] transition-colors cursor-pointer"
                      >
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-1">
                        Posted by: <span className="font-bold text-slate-700">{item.author}</span>{' '}
                        <span className="text-slate-400">({item.authorRole})</span>
                      </p>
                    </div>

                    {/* Body Content */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 font-normal">
                      {item.content}
                    </p>

                    {/* ── GOOGLE CLASSROOM-STYLE ATTACHMENT CARD PREVIEW ── */}
                    {item.attachmentUrl && (
                      <div className="pt-1">
                        <div className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 transition-all duration-200 group/att">
                          
                          {/* Left: Thumbnail & File Metadata */}
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenViewer(item);
                            }}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            {item.attachmentType === 'image' || /\.(jpg|jpeg|png|webp)$/i.test(item.attachmentUrl) ? (
                              /* Compact Image Thumbnail */
                              <div className="w-14 h-12 rounded-xl overflow-hidden border border-slate-200/90 shrink-0 bg-slate-200 relative group-hover/att:scale-105 transition-transform">
                                <img
                                  src={item.attachmentUrl}
                                  alt={item.attachmentName || 'Attachment thumbnail'}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/15 flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </div>
                            ) : (
                              /* Red DepEd PDF Icon */
                              <div className="w-12 h-12 rounded-xl bg-red-50 text-[#D8232A] border border-red-100 flex items-center justify-center shrink-0 shadow-2xs group-hover/att:scale-105 transition-transform">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate group-hover/att:text-[#D8232A] transition-colors">
                                {item.attachmentName || 'Downloadable Waiver / Memo'}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium mt-0.5">
                                <span className="uppercase font-extrabold text-[#D8232A] bg-red-50 px-1.5 py-0.2 rounded border border-red-100 text-[9px]">
                                  {item.attachmentType === 'image' || /\.(jpg|jpeg|png|webp)$/i.test(item.attachmentUrl) ? 'IMAGE' : 'PDF WAIVER'}
                                </span>
                                {item.attachmentSize && <span>• {item.attachmentSize}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Right: Quick Action Buttons — stacked side by side on mobile */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenViewer(item);
                              }}
                              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-white hover:bg-slate-200/80 border border-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Preview in-app"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">View</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadAttachment(item.attachmentUrl, item.attachmentName);
                              }}
                              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-[#D8232A] hover:bg-red-700 active:scale-95 text-white font-bold text-[11px] rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Download to device"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Download</span>
                            </button>
                          </div>

                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Read Message Button */}
                  <div className="flex items-center justify-end pt-3 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => handleOpenAnnouncement(item)}
                      className="text-[#D8232A] font-bold hover:underline flex items-center gap-1 cursor-pointer ml-auto"
                    >
                      Read Advisory <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── FULL ANNOUNCEMENT DETAIL MODAL ── */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] sm:max-h-[85vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-50 text-[#D8232A] border border-red-100">
                      {selectedAnnouncement.category}
                    </span>
                    {selectedAnnouncement.isPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                        <Pin className="w-3 h-3 fill-amber-500 text-amber-600" /> Pinned Notice
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-400">
                      {selectedAnnouncement.date} • {selectedAnnouncement.time}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
                    {selectedAnnouncement.title}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Author & Target Info */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">POSTED BY</span>
                <p className="font-extrabold text-slate-900 text-sm">{selectedAnnouncement.author}</p>
                <p className="text-slate-500 font-medium">{selectedAnnouncement.authorRole}</p>
              </div>

              {/* Body Text */}
              <div className="text-slate-700 text-sm leading-relaxed space-y-3 font-normal">
                <p className="whitespace-pre-line">{selectedAnnouncement.content}</p>
              </div>

              {/* Attachment Download & In-App View Box */}
              {selectedAnnouncement.attachmentUrl && (
                <div className="p-3 sm:p-4 bg-red-50/60 border border-red-100 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* File Metadata Row */}
                  <div
                    onClick={() => handleOpenViewer(selectedAnnouncement)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-white border border-red-200 rounded-xl flex items-center justify-center text-[#D8232A] shadow-2xs shrink-0">
                      {selectedAnnouncement.attachmentType === 'image' || /\.(jpg|jpeg|png|webp)$/i.test(selectedAnnouncement.attachmentUrl) ? (
                        <ImageIcon className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate hover:text-[#D8232A] transition-colors">
                        {selectedAnnouncement.attachmentName || 'Official Attachment'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {selectedAnnouncement.attachmentSize || (selectedAnnouncement.attachmentType === 'image' ? 'Image File' : 'PDF Document / Waiver')}
                      </span>
                    </div>
                  </div>
                  {/* Action Buttons — full width on mobile */}
                  <div className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenViewer(selectedAnnouncement)}
                      className="flex-1 sm:flex-none px-3 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" /> View
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadAttachment(selectedAnnouncement.attachmentUrl, selectedAnnouncement.attachmentName)}
                      className="flex-1 sm:flex-none px-3.5 py-2.5 bg-[#D8232A] hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-6 py-2 text-xs shadow-2xs cursor-pointer"
                >
                  Close Advisory
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── IN-APP ATTACHMENT VIEWER LIGHTBOX MODAL (GOOGLE CLASSROOM STYLE) ── */}
      <AttachmentViewerModal
        isOpen={!!viewerAttachment}
        onClose={() => setViewerAttachment(null)}
        attachment={viewerAttachment}
      />
    </div>
  );
}

export default AnnouncementsView;
