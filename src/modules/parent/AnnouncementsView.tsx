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
  Pin
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useParentData } from '../../lib/parentData';

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

  const handleDownloadAttachment = (url?: string, name?: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
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

  const handleDownloadAttachment = (filename: string) => {
    const dummyContent = `STA. MARIA ELEMENTARY SCHOOL OFFICIAL DOCUMENT ATTACHMENT\nFilename: ${filename}\nDate: ${new Date().toLocaleDateString()}\n\nThis is an official document advisory file issued by the school portal.`;
    const blob = new Blob([dummyContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7F9] font-sans">
      {/* ── TOP HEADER WITH TITLE, SEARCH & BELL ── */}
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
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 w-full">
        {/* ── SEGMENTED CONTROL TABS BAR ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 inline-flex items-center gap-1 shadow-2xs self-start">
            <button
              onClick={() => setActiveTab('school')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'school'
                  ? 'bg-[#D8232A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              School Advisories
            </button>
            <button
              onClick={() => setActiveTab('subject')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'subject'
                  ? 'bg-[#D8232A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Subject Teachers
            </button>
            <button
              onClick={() => setActiveTab('adviser')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'adviser'
                  ? 'bg-[#D8232A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Class Adviser
            </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAnnouncements.map(item => {
              const isEmergency = item.category === 'Emergency' || item.category === 'Class Suspension';
              const iconBg = isEmergency ? 'bg-rose-50 text-rose-600' : 'bg-red-50 text-[#D8232A]';
              const categoryTextColor = isEmergency ? 'text-rose-600' : 'text-[#D8232A]';

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl ${item.isPinned ? 'border-amber-200 shadow-[0_4px_20px_rgba(245,158,11,0.08)]' : 'border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]'} border p-6 hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] transition-all duration-200 space-y-4 flex flex-col justify-between overflow-hidden relative`}
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
                  </div>

                    {/* Attached Photo Banner (If present) */}
                    {item.attachmentUrl && (item.attachmentType === 'image' || /\.(jpg|jpeg|png|webp)$/i.test(item.attachmentUrl)) && (
                      <div className="rounded-xl overflow-hidden border border-slate-100 mt-1">
                        <img
                          src={item.attachmentUrl}
                          alt={item.attachmentName || 'Notice Poster'}
                          className="w-full h-36 object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                          onClick={() => handleOpenAnnouncement(item)}
                        />
                      </div>
                    )}

                    {/* Attached Document Pill (If present) */}
                    {item.attachmentUrl && item.attachmentType !== 'image' && !/\.(jpg|jpeg|png|webp)$/i.test(item.attachmentUrl) && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadAttachment(item.attachmentUrl, item.attachmentName);
                        }}
                        className="p-2.5 bg-red-50/60 rounded-xl border border-red-100 flex items-center justify-between gap-2 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-[#D8232A] shrink-0" />
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {item.attachmentName || 'Downloadable Waiver / Slip'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-[#D8232A] flex items-center gap-1 shrink-0">
                          <Download className="w-3 h-3" /> Download
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: File Attachment & Read Message Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    {item.attachmentName ? (
                      <div
                        onClick={() => handleDownloadAttachment(item.attachmentUrl, item.attachmentName)}
                        className="flex items-center gap-1.5 font-semibold text-slate-500 hover:text-[#D8232A] transition-colors cursor-pointer"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[160px]">{item.attachmentName}</span>
                      </div>
                    ) : <div />}

                    <button
                      onClick={() => handleOpenAnnouncement(item)}
                      className="text-[#D8232A] font-bold hover:underline flex items-center gap-1 cursor-pointer ml-auto"
                    >
                      Read Message <ArrowRight className="w-3.5 h-3.5" />
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
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-slate-100 space-y-6 max-h-[85vh] overflow-y-auto"
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

              {/* Attached Image in Modal */}
              {selectedAnnouncement.attachmentUrl && (selectedAnnouncement.attachmentType === 'image' || /\.(jpg|jpeg|png|webp)$/i.test(selectedAnnouncement.attachmentUrl)) && (
                <div className="rounded-2xl overflow-hidden border border-slate-200">
                  <a href={selectedAnnouncement.attachmentUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={selectedAnnouncement.attachmentUrl}
                      alt={selectedAnnouncement.attachmentName || 'Notice Image'}
                      className="w-full max-h-72 object-cover hover:scale-102 transition-transform duration-200"
                    />
                  </a>
                </div>
              )}

              {/* Body Text */}
              <div className="text-slate-700 text-sm leading-relaxed space-y-3 font-normal">
                <p className="whitespace-pre-line">{selectedAnnouncement.content}</p>
              </div>

              {/* Attachment Download Box */}
              {selectedAnnouncement.attachmentUrl && (
                <div className="p-4 bg-red-50/60 border border-red-100 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-white border border-red-200 rounded-xl flex items-center justify-center text-[#D8232A] shadow-2xs shrink-0">
                      {selectedAnnouncement.attachmentType === 'image' ? (
                        <Paperclip className="w-4.5 h-4.5" />
                      ) : (
                        <FileText className="w-4.5 h-4.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {selectedAnnouncement.attachmentName || 'Official Attachment'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {selectedAnnouncement.attachmentSize || (selectedAnnouncement.attachmentType === 'image' ? 'Image File' : 'PDF Document / Waiver')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(selectedAnnouncement.attachmentUrl, selectedAnnouncement.attachmentName)}
                    className="px-3.5 py-2 bg-[#D8232A] hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
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
    </div>
  );
}

export default AnnouncementsView;
