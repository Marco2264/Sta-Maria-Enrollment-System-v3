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
  User
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

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
  attachmentName?: string;
  attachmentUrl?: string;
  isNew?: boolean;
  isRead?: boolean;
  targetGrade?: string;
  createdAt?: any;
}

const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-1',
    tab: 'school',
    category: 'Class Suspension',
    title: 'Suspension of Classes: Tropical Cyclone Weather Advisory',
    author: 'Dr. Roberto Santos',
    authorRole: 'School Principal',
    date: 'July 28, 2026',
    time: '06:30 AM',
    content: 'Face-to-face classes for Grade 1–6 are suspended today due to heavy rainfall. Learners are advised to stay home and engage in self-paced modular activities.',
    attachmentName: 'Weather_Advisory_Jul.pdf',
    isNew: true,
    isRead: false
  },
  {
    id: 'ann-2',
    tab: 'school',
    category: 'General',
    title: 'First Quarter General Parents-Teachers Association (PTA) Meeting',
    author: 'Admin Office',
    authorRole: 'School Admin',
    date: 'July 25, 2026',
    time: '02:00 PM',
    content: 'All guardians are invited to the 1st Quarter PTA Assembly on Aug 5, 2026. Agenda includes election of new PTA officers and school development plans.',
    attachmentName: 'PTA_Invitation.pdf',
    isNew: true,
    isRead: false
  },
  {
    id: 'ann-3',
    tab: 'adviser',
    category: 'Academic',
    title: 'Grade 4 - St. Francis Class Orientation & Adviser Notice',
    author: 'Mrs. Elena Mendoza',
    authorRole: 'Class Adviser (Grade 4 - St. Francis)',
    date: 'July 24, 2026',
    time: '09:15 AM',
    content: 'Good day parents! Please remind your learners to bring their complete set of notebooks and basic school supplies starting tomorrow. Kindly ensure all verification documents are submitted.',
    attachmentName: 'Class_Schedule_G4.pdf',
    isNew: true,
    isRead: false,
    targetGrade: 'Grade 4'
  },
  {
    id: 'ann-4',
    tab: 'subject',
    category: 'Academic',
    title: 'Mathematics 4: First Diagnostic Activity Submission',
    author: 'Mr. Ramon Gonzales',
    authorRole: 'Subject Teacher - Mathematics',
    date: 'July 22, 2026',
    time: '11:00 AM',
    content: 'Greetings parents! The diagnostic worksheet for Multiplication and Division has been uploaded. Kindly assist your child in completing Worksheet #1 by next Monday.',
    attachmentName: 'Math4_Worksheet_1.pdf',
    isNew: false,
    isRead: true,
    targetGrade: 'Grade 4'
  },
  {
    id: 'ann-5',
    tab: 'school',
    category: 'Events',
    title: 'National Nutrition Month Culminating Activity & Cooking Contest',
    author: 'Health & Nutrition Unit',
    authorRole: 'School Health Unit',
    date: 'July 18, 2026',
    time: '04:00 PM',
    content: 'Sta. Maria Elementary School will celebrate the annual Nutrition Month culmination on July 31, 2026. Activities include Healthy Snack Making and Poster-Making Contest.',
    attachmentName: 'Nutrition_Program.pdf',
    isNew: false,
    isRead: true
  }
];

export function AnnouncementsView() {
  const { userData } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(INITIAL_ANNOUNCEMENTS);
  const [activeTab, setActiveTab] = useState<'school' | 'subject' | 'adviser'>('school');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);

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
              attachmentName: data.attachmentName || undefined,
              targetGrade: data.targetGrade || undefined,
              isNew: !readIds.includes(docSnap.id),
              isRead: readIds.includes(docSnap.id)
            };
          });

          setAnnouncements([...firestoreItems, ...INITIAL_ANNOUNCEMENTS]);
        }
      }, (error) => {
        console.warn('Firestore announcements subscription note:', error);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore announcements sync fallback:', err);
    }
  }, [readIds]);

  const categories = ['All', 'Emergency', 'Class Suspension', 'General', 'Academic', 'Events'];

  const updatedAnnouncements = useMemo(() => {
    return announcements.map(a => ({
      ...a,
      isRead: readIds.includes(a.id),
      isNew: !readIds.includes(a.id)
    }));
  }, [announcements, readIds]);

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
    <div className="flex flex-col min-h-screen bg-[#fcfcfd] font-sans">
      {/* ── TOP HEADER WITH SEARCH BAR & NOTIFICATION BELL ── */}
      <header className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search announcements..."
            className="pl-10 pr-4 py-2 bg-slate-50 border-slate-200/80 rounded-full text-xs font-medium focus:bg-white transition-all w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative cursor-pointer">
          <Bell className="w-4 h-4" />
          {badgeCounts.school + badgeCounts.subject + badgeCounts.adviser > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#2563eb] absolute top-2 right-2 ring-2 ring-white" />
          )}
        </button>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 w-full">
        
        {/* ── HERO TITLE & SEGMENTED CONTROL TABS BAR ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-blue-50 text-[#2563eb] border border-blue-100 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
              LATEST CAMPUS ACTIVITY
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Announcements
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium italic max-w-md">
              Stay informed about class suspensions, school activities, and important advisories.
            </p>
          </div>

          {/* Segmented Control Bar matching user screenshot */}
          <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 inline-flex items-center gap-1 shadow-2xs self-start md:self-auto">
            <button
              onClick={() => setActiveTab('school')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'school'
                  ? 'bg-[#2563eb] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              School Advisories
            </button>
            <button
              onClick={() => setActiveTab('subject')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'subject'
                  ? 'bg-[#2563eb] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              Subject Teachers
            </button>
            <button
              onClick={() => setActiveTab('adviser')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'adviser'
                  ? 'bg-[#2563eb] text-white shadow-xs'
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
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center space-y-3">
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
              const borderLeft = isEmergency ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-[#2563eb]';
              const iconBg = isEmergency ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-[#2563eb]';
              const categoryTextColor = isEmergency ? 'text-rose-600' : 'text-[#2563eb]';

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all duration-200 ${borderLeft} space-y-4 flex flex-col justify-between`}
                >
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
                        className="text-base font-bold text-slate-900 leading-snug hover:text-[#2563eb] transition-colors cursor-pointer"
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

                  {/* Card Footer: File Attachment & Read Message Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    {item.attachmentName ? (
                      <div
                        onClick={() => handleDownloadAttachment(item.attachmentName!)}
                        className="flex items-center gap-1.5 font-semibold text-slate-500 hover:text-[#2563eb] transition-colors cursor-pointer"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[160px]">{item.attachmentName}</span>
                      </div>
                    ) : <div />}

                    <button
                      onClick={() => handleOpenAnnouncement(item)}
                      className="text-[#2563eb] font-bold hover:underline flex items-center gap-1 cursor-pointer ml-auto"
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
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-[#2563eb] border border-blue-100">
                      {selectedAnnouncement.category}
                    </span>
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
                <p>{selectedAnnouncement.content}</p>
              </div>

              {/* Attachment Download Box */}
              {selectedAnnouncement.attachmentName && (
                <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white border border-blue-200 rounded-xl flex items-center justify-center text-[#2563eb] shadow-2xs shrink-0">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {selectedAnnouncement.attachmentName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">PDF Attachment</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(selectedAnnouncement.attachmentName!)}
                    className="px-3.5 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
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
