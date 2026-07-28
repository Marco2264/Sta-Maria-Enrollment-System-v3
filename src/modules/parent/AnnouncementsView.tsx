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
  ChevronRight,
  Download,
  Bell,
  CheckCheck
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
    content: 'Please be informed that face-to-face classes for all elementary grade levels (Grade 1 to Grade 6) at Sta. Maria Elementary School are suspended today due to heavy rainfall and severe weather condition. Learners are advised to stay home and engage in self-paced modular learning activities. Online learning materials will be made accessible through the portal by 10 AM.',
    attachmentName: 'DepEd_Weather_Advisory_Jul2026.pdf',
    isNew: true,
    isRead: false
  },
  {
    id: 'ann-2',
    tab: 'school',
    category: 'General',
    title: 'First Quarter General Parents-Teachers Association (PTA) Meeting',
    author: 'Sta. Maria ES Admin Office',
    authorRole: 'School Administration',
    date: 'July 25, 2026',
    time: '02:00 PM',
    content: 'All parents and guardians are cordially invited to attend the 1st Quarter General PTA Assembly on Friday, August 5, 2026 at 1:30 PM in the School Covered Court. Agenda items include election of new PTA officers, presentation of school development plans, and updates regarding learner registration and safety protocols.',
    attachmentName: 'General_PTA_Invitation_Letter.pdf',
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
    content: 'Good day parents! Please remind your learners to bring their complete set of notebooks and basic school supplies starting tomorrow. Furthermore, kindly ensure that all required verification documents (PSA Birth Certificate & SF9 Report Card) are submitted through the portal or to my office on or before August 10.',
    attachmentName: 'Class_Schedule_and_Rules_G4.pdf',
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
    content: 'Greetings parents! The diagnostic worksheet for Multiplication and Division has been uploaded. Kindly assist your child in completing Worksheet #1 by next Monday. Hard copies may also be picked up at the school guardhouse for learners under the modular learning print setup.',
    attachmentName: 'Math4_Diagnostic_Worksheet_1.pdf',
    isNew: false,
    isRead: true,
    targetGrade: 'Grade 4'
  },
  {
    id: 'ann-5',
    tab: 'school',
    category: 'Events',
    title: 'National Nutrition Month Culminating Activity & Cooking Contest',
    author: 'Health & Nutrition Committee',
    authorRole: 'School Health Unit',
    date: 'July 18, 2026',
    time: '04:00 PM',
    content: 'Sta. Maria Elementary School will celebrate the annual Nutrition Month culmination on July 31, 2026. Activities include the Healthy Snack Making Competition, Poster-Making Contest, and Free Medical/Nutritional Check-up for learners in cooperation with the Barangay Health Center.',
    attachmentName: 'Nutrition_Month_Program_Flow.pdf',
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

          // Merge Firestore items with default sample items so the list is rich
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

  // Unread badge counts per tab
  const badgeCounts = useMemo(() => {
    return {
      school: updatedAnnouncements.filter(a => a.tab === 'school' && !a.isRead).length,
      subject: updatedAnnouncements.filter(a => a.tab === 'subject' && !a.isRead).length,
      adviser: updatedAnnouncements.filter(a => a.tab === 'adviser' && !a.isRead).length
    };
  }, [updatedAnnouncements]);

  // Filtered list based on tab, category, and search query
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

  // Mark single item as read when opening modal
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

  // Mark all in current view as read
  const handleMarkAllRead = () => {
    const currentTabIds = updatedAnnouncements.filter(a => a.tab === activeTab).map(a => a.id);
    const combined = Array.from(new Set([...readIds, ...currentTabIds]));
    setReadIds(combined);
    try {
      localStorage.setItem('sm_read_announcements', JSON.stringify(combined));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  };

  // Trigger Download Simulation
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

  // Category Badge Color Mapping
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Emergency':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Class Suspension':
        return 'bg-[#0C3B99] text-white border-blue-200';
      case 'Academic':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'Events':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      default:
        return 'bg-blue-100 text-[#0C3B99] border-blue-200';
    }
  };

  // Category Icon Mapping
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Emergency':
      case 'Class Suspension':
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
      case 'Academic':
        return <BookOpen className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'Events':
        return <Calendar className="w-5 h-5 text-purple-600 shrink-0" />;
      default:
        return <Megaphone className="w-5 h-5 text-[#0C3B99] shrink-0" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 min-h-screen font-sans w-full max-w-full overflow-x-hidden">
      
      {/* ── TOP PAGE HEADER (RESPONSIVE ON ALL DEVICES) ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-[#0C3B99] shadow-xs shrink-0">
              <Megaphone className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#0C3B99]" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">Announcements</h1>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">Official school advisories, teacher notices, and class updates.</p>
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search announcements..."
              className="pl-9 pr-8 py-2 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold focus:bg-white transition-all h-9 sm:h-10 w-full"
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
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 w-full max-w-full">
        
        {/* ── TAB NAVIGATION BAR WITH MARK ALL AS READ ACTION ── */}
        <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden p-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="grid grid-cols-3 gap-1 w-full sm:flex sm:items-center sm:gap-2 sm:w-auto">
            <button
              onClick={() => setActiveTab('school')}
              className={`flex items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1.5 sm:px-5 py-2 sm:py-3 rounded-xl text-[11px] sm:text-sm font-extrabold transition-all cursor-pointer select-none ${
                activeTab === 'school'
                  ? 'bg-[#0C3B99] text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate sm:hidden">School</span>
              <span className="hidden sm:inline whitespace-nowrap">School Advisories</span>
              {badgeCounts.school > 0 ? (
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                  activeTab === 'school' ? 'bg-white text-[#0C3B99]' : 'bg-blue-100 text-[#0C3B99]'
                }`}>
                  {badgeCounts.school}
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-400 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0">0</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('subject')}
              className={`flex items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1.5 sm:px-5 py-2 sm:py-3 rounded-xl text-[11px] sm:text-sm font-extrabold transition-all cursor-pointer select-none ${
                activeTab === 'subject'
                  ? 'bg-[#0C3B99] text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate sm:hidden">Subject</span>
              <span className="hidden sm:inline whitespace-nowrap">Subject Teacher</span>
              {badgeCounts.subject > 0 ? (
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                  activeTab === 'subject' ? 'bg-white text-[#0C3B99]' : 'bg-blue-100 text-[#0C3B99]'
                }`}>
                  {badgeCounts.subject}
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-400 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0">0</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('adviser')}
              className={`flex items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1.5 sm:px-5 py-2 sm:py-3 rounded-xl text-[11px] sm:text-sm font-extrabold transition-all cursor-pointer select-none ${
                activeTab === 'adviser'
                  ? 'bg-[#0C3B99] text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate sm:hidden">Adviser</span>
              <span className="hidden sm:inline whitespace-nowrap">Class Adviser</span>
              {badgeCounts.adviser > 0 ? (
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0 ${
                  activeTab === 'adviser' ? 'bg-white text-[#0C3B99]' : 'bg-rose-100 text-rose-700'
                }`}>
                  {badgeCounts.adviser}
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-400 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black shrink-0">0</span>
              )}
            </button>
          </div>

          {/* Mark All as Read Action */}
          {badgeCounts[activeTab] > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-500 hover:text-[#0C3B99] hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer border border-slate-200 sm:border-transparent hover:border-blue-100 self-end sm:self-auto"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#0C3B99]" /> Mark tab read
            </button>
          )}
        </Card>

        {/* ── CATEGORY FILTER PILLS ── */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar w-full">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-0.5">
            <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Filter:
          </span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shrink-0 cursor-pointer select-none ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── ANNOUNCEMENTS LIST ── */}
        <div className="space-y-3.5 sm:space-y-4 w-full">
          {filteredAnnouncements.length === 0 ? (
            <Card className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 text-center space-y-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Megaphone className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800">No Announcements Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                There are currently no active announcements matching your selected category or search keywords.
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
            </Card>
          ) : (
            filteredAnnouncements.map(item => {
              const borderLeftColor = item.category === 'Class Suspension' || item.category === 'Emergency'
                ? 'border-l-rose-600'
                : item.category === 'Academic'
                ? 'border-l-emerald-600'
                : 'border-l-[#0C3B99]';

              return (
                <div
                  key={item.id}
                  className={`announcement-card bg-white border-l-4 ${borderLeftColor} border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 group relative overflow-hidden w-full`}
                >
                  <div className="flex items-start gap-3.5 sm:gap-5">
                    {/* Icon */}
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-blue-50 text-[#0C3B99] rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                      {getCategoryIcon(item.category)}
                    </div>

                    {/* Announcement Main Content */}
                    <div className="space-y-2 flex-1 min-w-0">
                      
                      {/* Top Header Line */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            onClick={() => handleOpenAnnouncement(item)}
                            className="text-sm sm:text-lg font-bold text-slate-900 leading-snug hover:text-[#0C3B99] cursor-pointer transition-colors"
                          >
                            {item.title}
                          </h3>
                          {item.isNew && (
                            <span className="bg-[#0C3B99] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-tighter shrink-0 shadow-2xs animate-pulse">
                              NEW
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-300" />
                          {item.date} • {item.time}
                        </span>
                      </div>

                      {/* Author Line */}
                      <p className="text-[11px] font-bold text-slate-400">
                        Posted by: <strong className="text-slate-700 font-extrabold">{item.author}</strong> ({item.authorRole})
                        {item.targetGrade && (
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold ml-1.5 inline-block">
                            {item.targetGrade}
                          </span>
                        )}
                      </p>

                      {/* Content Snippet */}
                      <p className="text-slate-500 text-xs sm:text-sm leading-relaxed line-clamp-2">
                        {item.content}
                      </p>

                      {/* Footer Actions & Attachments */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        {item.attachmentName ? (
                          <div
                            onClick={() => handleDownloadAttachment(item.attachmentName!)}
                            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0C3B99] cursor-pointer hover:underline transition-colors"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-[#0C3B99] shrink-0" />
                            <span className="truncate max-w-[200px] sm:max-w-xs">{item.attachmentName}</span>
                          </div>
                        ) : <div />}

                        <button
                          onClick={() => handleOpenAnnouncement(item)}
                          className="text-[#0C3B99] text-xs font-bold hover:underline sm:ml-auto flex items-center gap-1 shrink-0 cursor-pointer self-start sm:self-auto"
                        >
                          Read Full Message
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ── FULL ANNOUNCEMENT DETAIL MODAL ── */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-3xl p-5 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 space-y-5 sm:space-y-6 max-h-[88vh] overflow-y-auto"
            >
              {/* Modal Top Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getCategoryBadgeClass(selectedAnnouncement.category)}`}>
                      {selectedAnnouncement.category}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {selectedAnnouncement.date} • {selectedAnnouncement.time}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-xl font-black text-slate-900 leading-snug">
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

              {/* Author & Target Details */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">Posted By</span>
                  <strong className="text-slate-900 font-extrabold text-xs">{selectedAnnouncement.author}</strong>
                  <span className="text-slate-500 block text-[11px] font-medium">{selectedAnnouncement.authorRole}</span>
                </div>
                {selectedAnnouncement.targetGrade && (
                  <Badge className="bg-blue-50 text-[#0C3B99] border-blue-200 font-extrabold text-xs self-start sm:self-auto">
                    Target: {selectedAnnouncement.targetGrade}
                  </Badge>
                )}
              </div>

              {/* Full Content Body */}
              <div className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line space-y-3 font-normal">
                <p>{selectedAnnouncement.content}</p>
              </div>

              {/* Attachment Download Box if available */}
              {selectedAnnouncement.attachmentName && (
                <div className="p-3.5 sm:p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white border border-blue-200 rounded-xl flex items-center justify-center text-[#0C3B99] shadow-2xs shrink-0">
                      <FileText className="w-4.5 h-4.5 text-[#0C3B99]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-extrabold text-slate-900 block truncate max-w-[200px] sm:max-w-xs">
                        {selectedAnnouncement.attachmentName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">PDF Document Attachment</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadAttachment(selectedAnnouncement.attachmentName!)}
                    className="px-3.5 py-2 bg-[#0C3B99] hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-2xs cursor-pointer w-full sm:w-auto"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              )}

              {/* Modal Footer Close Button */}
              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <Button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="bg-[#0C3B99] hover:bg-blue-800 text-white font-bold rounded-xl px-6 py-2 text-xs shadow-2xs cursor-pointer w-full sm:w-auto"
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
