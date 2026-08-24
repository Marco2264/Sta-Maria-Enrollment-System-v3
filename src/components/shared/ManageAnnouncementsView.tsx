import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Badge } from '../ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  User, 
  Trash2,
  Bell,
  BookOpen,
  Users,
  GraduationCap,
  Globe,
  X,
  Pin,
  Edit3,
  Archive,
  Sparkles,
  ArrowLeft,
  Send,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  ChevronRight,
  Lock,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  UploadCloud,
  CheckCheck,
  MoreHorizontal,
  ShieldCheck,
  Bookmark,
  ExternalLink,
  Eye
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { uploadToImageKit, validateImageFile } from '../../lib/services/imageUploadService';
import { AttachmentViewerModal, AttachmentViewerData } from './AttachmentViewerModal';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { cn } from '../ui/utils';

export interface AnnouncementAttachment {
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'doc';
  size?: string;
}

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
  targetType: 'all' | 'grade_level' | 'all_teachers' | 'section' | 'student';
  targetGradeLevel?: string;
  targetSectionId?: string;
  targetStudentId?: string;
  targetStudentName?: string;
  subjectCode?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'pdf' | 'doc';
  attachmentSize?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  likesCount?: number;
  createdAt?: any;
  updatedAt?: any;
}

const ELEMENTARY_GRADES = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6'
];

const COMMON_SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'Filipino',
  'Araling Panlipunan (AP)',
  'Edukasyon sa Pagpapakatao (EsP)',
  'MAPEH',
  'EPP / TLE',
  'Mother Tongue'
];

export function ManageAnnouncementsView({
  sections = [],
  students = [],
  teachers = []
}: {
  sections?: any[];
  students?: any[];
  teachers?: any[];
}) {
  const { userData, user } = useAuth();
  const uData = userData as any;
  const isTeacher = uData?.role?.toLowerCase() === 'teacher';
  
  const authorName = (uData?.firstName || uData?.lastName) 
    ? `${uData.firstName || ''} ${uData.lastName || ''}`.trim() 
    : isTeacher ? 'Class Adviser' : 'Sta. Maria Elementary';
  const authorRole = isTeacher ? 'Faculty & Adviser' : 'School Administration';

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'emergency' | 'school' | 'academic' | 'events'>('all');
  const [viewStatus, setViewStatus] = useState<'active' | 'archived'>('active');
  const [activeStoryFilter, setActiveStoryFilter] = useState<string>('all');

  // Likes tracking (localStorage)
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sm_liked_announcements');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Composer Modal State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formCategory, setFormCategory] = useState<'Emergency' | 'Class Suspension' | 'General' | 'Academic' | 'Events'>('General');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [teacherBroadcastRole, setTeacherBroadcastRole] = useState<'adviser' | 'subject' | 'student'>('adviser');
  const [targetType, setTargetType] = useState<'all' | 'grade_level' | 'all_teachers' | 'section' | 'student'>(isTeacher ? 'section' : 'all');
  const [targetGradeLevel, setTargetGradeLevel] = useState<string>('Grade 1');
  const [targetSectionId, setTargetSectionId] = useState<string>('');
  const [targetSubjectCode, setTargetSubjectCode] = useState<string>('');
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [targetStudentName, setTargetStudentName] = useState<string>('');
  const [formIsPinned, setFormIsPinned] = useState(false);

  // Attachments
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [existingAttachmentName, setExistingAttachmentName] = useState<string | null>(null);
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string | null>(null);
  const [existingAttachmentType, setExistingAttachmentType] = useState<'image' | 'pdf' | 'doc' | null>(null);
  const [existingAttachmentSize, setExistingAttachmentSize] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Viewer Modal
  const [viewerAttachment, setViewerAttachment] = useState<AttachmentViewerData | null>(null);
  const [selectedReadAnnouncement, setSelectedReadAnnouncement] = useState<AnnouncementItem | null>(null);

  // Options menu for a post
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Subscribe to announcements
  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: AnnouncementItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          tab: data.tab || 'school',
          category: data.category || 'General',
          title: data.title || '',
          author: data.author || 'School Faculty',
          authorRole: data.authorRole || 'Official Bulletin',
          date: data.date || '',
          time: data.time || '',
          content: data.content || '',
          targetType: data.targetType || 'all',
          targetGradeLevel: data.targetGradeLevel,
          targetSectionId: data.targetSectionId,
          targetStudentId: data.targetStudentId,
          targetStudentName: data.targetStudentName,
          subjectCode: data.subjectCode,
          attachmentName: data.attachmentName || undefined,
          attachmentUrl: data.attachmentUrl || undefined,
          attachmentType: data.attachmentType || undefined,
          attachmentSize: data.attachmentSize || undefined,
          isPinned: !!data.isPinned,
          isArchived: !!data.isArchived,
          likesCount: data.likesCount || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      });
      setAnnouncements(items);
    }, (error) => {
      console.error('Error fetching announcements:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleLike = (id: string, currentCount: number = 0) => {
    const isLiked = !!likedPosts[id];
    const newLiked = { ...likedPosts, [id]: !isLiked };
    setLikedPosts(newLiked);
    localStorage.setItem('sm_liked_announcements', JSON.stringify(newLiked));

    const newCount = isLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
    updateDoc(doc(db, 'announcements', id), { likesCount: newCount }).catch(() => {});
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid file format or size exceeds 10MB');
        return;
      }
      setFileToUpload(file);
      setExistingAttachmentName(null);
      setExistingAttachmentUrl(null);
      setExistingAttachmentType(null);
      setExistingAttachmentSize(null);
      toast.success(`Attached: ${file.name}`);
    }
  };

  const handleRemoveAttachment = () => {
    setFileToUpload(null);
    setExistingAttachmentName(null);
    setExistingAttachmentUrl(null);
    setExistingAttachmentType(null);
    setExistingAttachmentSize(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Attachment removed');
  };

  const openComposer = (itemToEdit?: AnnouncementItem) => {
    if (itemToEdit) {
      setEditingId(itemToEdit.id);
      setFormCategory(itemToEdit.category);
      setFormTitle(itemToEdit.title);
      setFormContent(itemToEdit.content);
      if (itemToEdit.tab === 'subject') {
        setTeacherBroadcastRole('subject');
      } else if (itemToEdit.targetType === 'student') {
        setTeacherBroadcastRole('student');
      } else {
        setTeacherBroadcastRole('adviser');
      }
      setTargetType(itemToEdit.targetType || (isTeacher ? 'section' : 'all'));
      setTargetGradeLevel(itemToEdit.targetGradeLevel || 'Grade 1');
      setTargetSectionId(itemToEdit.targetSectionId || '');
      setTargetSubjectCode(itemToEdit.subjectCode || '');
      setTargetStudentId(itemToEdit.targetStudentId || '');
      setTargetStudentName(itemToEdit.targetStudentName || '');
      setFormIsPinned(!isTeacher && !!itemToEdit.isPinned);
      
      setFileToUpload(null);
      setExistingAttachmentName(itemToEdit.attachmentName || null);
      setExistingAttachmentUrl(itemToEdit.attachmentUrl || null);
      setExistingAttachmentType(itemToEdit.attachmentType || null);
      setExistingAttachmentSize(itemToEdit.attachmentSize || null);
    } else {
      setEditingId(null);
      setFormCategory('General');
      setFormTitle('');
      setFormContent('');
      setTeacherBroadcastRole('adviser');
      setTargetType(isTeacher ? 'section' : 'all');
      setTargetGradeLevel('Grade 1');
      const adviserSec = (sections || []).find(s => s.isAdvisor);
      const defaultSec = adviserSec ? (adviserSec.id || adviserSec.sectionId) : ((sections && sections.length > 0) ? (sections[0].id || sections[0].sectionId) : '');
      setTargetSectionId(defaultSec);
      setTargetSubjectCode('');
      setTargetStudentId('');
      setTargetStudentName('');
      setFormIsPinned(false);
      
      setFileToUpload(null);
      setExistingAttachmentName(null);
      setExistingAttachmentUrl(null);
      setExistingAttachmentType(null);
      setExistingAttachmentSize(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsComposerOpen(true);
  };

  const handleTogglePin = async (item: AnnouncementItem) => {
    try {
      await updateDoc(doc(db, 'announcements', item.id), {
        isPinned: !item.isPinned,
        updatedAt: serverTimestamp()
      });
      toast.success(item.isPinned ? 'Post unpinned' : 'Post pinned to top');
      setMenuOpenId(null);
    } catch (error) {
      toast.error('Failed to update pin status');
    }
  };

  const handleToggleArchive = async (item: AnnouncementItem) => {
    try {
      const willArchive = !item.isArchived;
      await updateDoc(doc(db, 'announcements', item.id), {
        isArchived: willArchive,
        updatedAt: serverTimestamp()
      });
      toast.success(willArchive ? 'Post moved to archives' : 'Post restored to feed');
      setMenuOpenId(null);
    } catch (error) {
      toast.error('Failed to update archive status');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this post?')) {
      try {
        await deleteDoc(doc(db, 'announcements', id));
        toast.success('Post deleted');
        setMenuOpenId(null);
      } catch (error) {
        toast.error('Failed to delete post');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Please enter a headline / title');
      return;
    }
    if (!formContent.trim()) {
      toast.error('Please write some announcement content');
      return;
    }

    setIsSubmitting(true);
    const saveToast = toast.loading(editingId ? 'Updating post...' : 'Publishing post...');

    try {
      let finalAttachmentName = existingAttachmentName;
      let finalAttachmentUrl = existingAttachmentUrl;
      let finalAttachmentType = existingAttachmentType;
      let finalAttachmentSize = existingAttachmentSize;

      if (fileToUpload) {
        setIsUploadingFile(true);
        const uploadedUrl = await uploadToImageKit(fileToUpload, {
          folder: '/announcements',
          onProgress: (prog: number) => setUploadProgress(prog)
        });
        if (uploadedUrl) {
          finalAttachmentName = fileToUpload.name;
          finalAttachmentUrl = uploadedUrl;
          finalAttachmentType = /\.(jpg|jpeg|png|webp)$/i.test(fileToUpload.name) ? 'image' : 'pdf';
          finalAttachmentSize = `${(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB`;
        }
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      const finalTab = isTeacher 
        ? (teacherBroadcastRole === 'subject' ? 'subject' : 'adviser')
        : 'school';

      const payload: any = {
        tab: finalTab,
        category: formCategory,
        title: formTitle.trim(),
        author: authorName,
        authorRole: authorRole,
        date: dateStr,
        time: timeStr,
        content: formContent.trim(),
        targetType: targetType,
        targetGradeLevel: targetType === 'grade_level' ? targetGradeLevel : null,
        targetSectionId: targetType === 'section' ? targetSectionId : null,
        targetStudentId: targetType === 'student' ? targetStudentId : null,
        targetStudentName: targetType === 'student' ? targetStudentName : null,
        subjectCode: teacherBroadcastRole === 'subject' ? targetSubjectCode : null,
        attachmentName: finalAttachmentName || null,
        attachmentUrl: finalAttachmentUrl || null,
        attachmentType: finalAttachmentType || null,
        attachmentSize: finalAttachmentSize || null,
        isPinned: formIsPinned,
        isArchived: false,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'announcements', editingId), payload);
        toast.success('Post successfully updated!', { id: saveToast });
      } else {
        payload.createdAt = serverTimestamp();
        payload.likesCount = 0;
        await addDoc(collection(db, 'announcements'), payload);
        toast.success('Post published to feed!', { id: saveToast });
      }

      setIsComposerOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to publish post', { id: saveToast });
    } finally {
      setIsSubmitting(false);
      setIsUploadingFile(false);
    }
  };

  // Filtered Feed List
  const filteredFeed = useMemo(() => {
    return announcements
      .filter(a => {
        if (viewStatus === 'active') return !a.isArchived;
        return !!a.isArchived;
      })
      .filter(a => {
        if (isTeacher) {
          if (a.author === authorName) return true;
          if (a.tab === 'school') {
            if (!a.targetType || a.targetType === 'all') return true;
            if (a.targetType === 'all_teachers') return true;
            return false;
          }
          if (a.targetType === 'section' && a.targetSectionId) {
            if ((sections || []).some(s => (s.sectionId === a.targetSectionId || s.id === a.targetSectionId))) return true;
          }
          return false;
        }
        return true;
      })
      .filter(a => {
        if (activeStoryFilter === 'emergency') return a.category === 'Emergency' || a.category === 'Class Suspension';
        if (activeStoryFilter === 'academic') return a.category === 'Academic';
        if (activeStoryFilter === 'events') return a.category === 'Events';
        if (activeStoryFilter === 'school') return a.tab === 'school' || a.category === 'General';
        return true;
      })
      .filter(a => {
        if (categoryFilter === 'emergency') return a.category === 'Emergency' || a.category === 'Class Suspension';
        if (categoryFilter === 'school') return a.category === 'General' || a.tab === 'school';
        if (categoryFilter === 'academic') return a.category === 'Academic';
        if (categoryFilter === 'events') return a.category === 'Events';
        return true;
      })
      .filter(a => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) || 
          a.content.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (viewStatus === 'active') {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
        }
        return 0;
      });
  }, [announcements, viewStatus, isTeacher, authorName, sections, activeStoryFilter, categoryFilter, searchQuery]);

  return (
    <div className="min-h-full bg-[#f0f2f5] py-4 sm:py-6 px-2 sm:px-4 flex justify-center">
      
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ------------------------------------------------------------- */}
        {/* LEFT SOCIAL SIDEBAR (Desktop 3.5 cols) */}
        {/* ------------------------------------------------------------- */}
        <div className="hidden lg:block lg:col-span-3 space-y-4 sticky top-6 h-fit">
          
          {/* User Profile Mini Card */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#D8232A] to-[#ff4d4d] text-white flex items-center justify-center font-black text-base shadow-md shadow-red-500/20">
                {authorName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-black text-slate-900 truncate">{authorName}</p>
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                </div>
                <p className="text-xs text-slate-500 font-medium truncate">{authorRole}</p>
              </div>
            </div>

            <Button
              onClick={() => openComposer()}
              className="w-full h-10 rounded-2xl bg-[#D8232A] hover:bg-[#b91c22] text-white text-xs font-bold shadow-md shadow-red-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Announcement</span>
            </Button>
          </div>

          {/* Quick Channels / Filter Navigation */}
          <div className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-2xs space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 pt-2 pb-1">
              Feed Channels
            </p>

            {[
              { id: 'all', label: 'All Updates', icon: Globe, color: 'text-blue-600' },
              { id: 'emergency', label: 'Emergency Alerts', icon: Flame, color: 'text-rose-600' },
              { id: 'school', label: 'School Bulletins', icon: Megaphone, color: 'text-amber-600' },
              { id: 'academic', label: 'Academic Notices', icon: BookOpen, color: 'text-emerald-600' },
              { id: 'events', label: 'Campus Events', icon: Calendar, color: 'text-purple-600' }
            ].map((ch) => (
              <button
                key={ch.id}
                onClick={() => {
                  setActiveStoryFilter(ch.id);
                  setCategoryFilter('all');
                }}
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

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewStatus(viewStatus === 'active' ? 'archived' : 'active')}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer",
                  viewStatus === 'archived' ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <Archive className="w-4 h-4 text-slate-400" />
                <span>{viewStatus === 'archived' ? 'Viewing Archived' : 'Archived Posts'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* ------------------------------------------------------------- */}
        {/* CENTER NEWS FEED (Mobile 12 cols, Desktop 6 cols) */}
        {/* ------------------------------------------------------------- */}
        <div className="col-span-1 lg:col-span-6 space-y-4 max-w-xl mx-auto w-full">

          {/* 1. INSTAGRAM-STYLE STORIES / CHANNEL HIGHLIGHTS RAIL */}
          <div className="bg-white rounded-3xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
              
              {/* Story 1: All */}
              <button
                onClick={() => setActiveStoryFilter('all')}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              >
                <div className={cn(
                  "w-14 h-14 rounded-full p-0.5 transition-transform group-hover:scale-105",
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
                <span className={cn("text-[11px] font-bold truncate max-w-[64px]", activeStoryFilter === 'all' ? "text-[#D8232A] font-black" : "text-slate-600")}>
                  All Feed
                </span>
              </button>

              {/* Story 2: Emergency */}
              <button
                onClick={() => setActiveStoryFilter('emergency')}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              >
                <div className={cn(
                  "w-14 h-14 rounded-full p-0.5 transition-transform group-hover:scale-105",
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
                <span className={cn("text-[11px] font-bold truncate max-w-[64px]", activeStoryFilter === 'emergency' ? "text-rose-600 font-black" : "text-slate-600")}>
                  Urgent
                </span>
              </button>

              {/* Story 3: School */}
              <button
                onClick={() => setActiveStoryFilter('school')}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              >
                <div className={cn(
                  "w-14 h-14 rounded-full p-0.5 transition-transform group-hover:scale-105",
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
                <span className={cn("text-[11px] font-bold truncate max-w-[64px]", activeStoryFilter === 'school' ? "text-amber-600 font-black" : "text-slate-600")}>
                  Bulletins
                </span>
              </button>

              {/* Story 4: Academic */}
              <button
                onClick={() => setActiveStoryFilter('academic')}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              >
                <div className={cn(
                  "w-14 h-14 rounded-full p-0.5 transition-transform group-hover:scale-105",
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
                <span className={cn("text-[11px] font-bold truncate max-w-[64px]", activeStoryFilter === 'academic' ? "text-emerald-600 font-black" : "text-slate-600")}>
                  Academic
                </span>
              </button>

              {/* Story 5: Events */}
              <button
                onClick={() => setActiveStoryFilter('events')}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
              >
                <div className={cn(
                  "w-14 h-14 rounded-full p-0.5 transition-transform group-hover:scale-105",
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
                <span className={cn("text-[11px] font-bold truncate max-w-[64px]", activeStoryFilter === 'events' ? "text-purple-600 font-black" : "text-slate-600")}>
                  Events
                </span>
              </button>

            </div>
          </div>

          {/* 2. FACEBOOK-STYLE "WHAT'S ON YOUR MIND?" COMPOSER CARD */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#D8232A] to-[#ff4d4d] text-white flex items-center justify-center font-black text-sm shrink-0">
                {authorName.charAt(0)}
              </div>
              <button
                onClick={() => openComposer()}
                className="flex-1 h-10 px-4 rounded-full bg-slate-100 hover:bg-slate-200/80 text-left text-xs font-semibold text-slate-500 transition-colors cursor-pointer"
              >
                Share an announcement with parents & learners...
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-around text-xs font-bold text-slate-600">
              <button
                onClick={() => openComposer()}
                className="flex items-center gap-2 hover:bg-slate-50 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-emerald-500" />
                <span>Photo / Attachment</span>
              </button>

              <button
                onClick={() => {
                  setFormCategory('Emergency');
                  openComposer();
                }}
                className="flex items-center gap-2 hover:bg-slate-50 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
              >
                <Flame className="w-4 h-4 text-rose-500" />
                <span>Urgent Alert</span>
              </button>

              <button
                onClick={() => openComposer()}
                className="flex items-center gap-2 hover:bg-slate-50 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
              >
                <Users className="w-4 h-4 text-blue-500" />
                <span>Tag Audience</span>
              </button>
            </div>
          </div>

          {/* 3. SOCIAL POSTS FEED STREAM */}
          <div className="space-y-4">
            {filteredFeed.map((post) => {
              const isLiked = !!likedPosts[post.id];
              const isPostAuthor = post.author === authorName || !isTeacher;
              const isEmergency = post.category === 'Emergency' || post.category === 'Class Suspension';

              return (
                <div
                  key={post.id}
                  className={cn(
                    "bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all",
                    isEmergency && "border-rose-200 shadow-md shadow-rose-500/5",
                    post.isPinned && "ring-2 ring-amber-300"
                  )}
                >
                  {/* Pinned Pill Header */}
                  {post.isPinned && (
                    <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center justify-between text-[11px] font-black text-amber-800">
                      <span className="flex items-center gap-1.5">
                        <Pin className="w-3 h-3 fill-amber-500 text-amber-500" /> PINNED BULLETIN
                      </span>
                      <span className="text-[10px] text-amber-600 font-semibold">Priority View</span>
                    </div>
                  )}

                  {/* Post Top Header (Author info + Three Dots) */}
                  <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-2xs",
                        isEmergency ? "bg-gradient-to-tr from-red-600 to-rose-500" : "bg-gradient-to-tr from-slate-800 to-slate-900"
                      )}>
                        {post.author.charAt(0)}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-sm text-slate-900">{post.author}</span>
                          <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                          <Badge className={cn("text-[9px] px-1.5 py-0 font-extrabold uppercase", isEmergency ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600")}>
                            {post.category}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mt-0.5">
                          <span>{post.date} at {post.time}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500">
                            {post.targetType === 'all' ? (
                              <>
                                <Globe className="w-3 h-3" /> All School
                              </>
                            ) : post.targetType === 'section' ? (
                              <>
                                <Users className="w-3 h-3 text-blue-600" /> Assigned Section
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 text-amber-600" /> Direct
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Three Dots Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === post.id ? null : post.id)}
                        className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>

                      {menuOpenId === post.id && (
                        <div className="absolute right-0 top-8 z-30 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 space-y-0.5 animate-in fade-in-50 duration-150">
                          {isPostAuthor && (
                            <>
                              <button
                                onClick={() => {
                                  openComposer(post);
                                  setMenuOpenId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Edit Post</span>
                              </button>

                              <button
                                onClick={() => handleTogglePin(post)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Pin className="w-3.5 h-3.5 text-amber-600" />
                                <span>{post.isPinned ? 'Unpin Post' : 'Pin Post'}</span>
                              </button>

                              <button
                                onClick={() => handleToggleArchive(post)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Archive className="w-3.5 h-3.5 text-slate-600" />
                                <span>{post.isArchived ? 'Restore Post' : 'Archive'}</span>
                              </button>

                              <button
                                onClick={() => handleDelete(post.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Post</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Post Content Body */}
                  <div className="px-4 sm:px-5 pb-3 space-y-2">
                    <h3 className={cn("text-base font-black leading-snug", isEmergency ? "text-rose-900" : "text-slate-900")}>
                      {post.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
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
                              <Eye className="w-3.5 h-3.5" /> Click to expand
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

                  {/* Card Footer (Official Notice Tag) */}
                  <div className="px-4 sm:px-5 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <CheckCheck className="w-4 h-4 text-emerald-500" />
                      <span>Official School Announcement</span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium">
                      Sta. Maria Portal
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredFeed.length === 0 && (
              <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <h3 className="text-base font-black text-slate-800">No Posts in this Channel</h3>
                <p className="text-xs text-slate-400 mt-1">Be the first to share an announcement with your school community.</p>
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

          {/* Emergency Hotline Box */}
          <div className="bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-3xl p-5 shadow-md shadow-red-500/20 space-y-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <p className="text-xs font-black uppercase tracking-wider">Sta. Maria Helpdesk</p>
            </div>
            <p className="text-xs text-red-100 font-medium leading-relaxed">
              Official school announcements are reviewed by authorized faculty and administration.
            </p>
            <div className="pt-2 border-t border-red-500/40 text-[11px] font-bold text-red-100 flex items-center justify-between">
              <span>DepEd Region III</span>
              <span>San Carlos City</span>
            </div>
          </div>

        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* SOCIAL COMPOSER MODAL (Facebook / Instagram Style) */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#D8232A]" />
              <span>{editingId ? 'Edit Announcement Post' : 'Create New Announcement'}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Author Chip Header */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-[#D8232A] text-white flex items-center justify-center font-bold text-sm">
                {authorName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-slate-900 truncate">{authorName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <select
                    value={formCategory}
                    onChange={(e: any) => setFormCategory(e.target.value)}
                    className="text-[11px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 outline-none"
                  >
                    <option value="General">📢 General Bulletin</option>
                    <option value="Emergency">🚨 Emergency Alert</option>
                    <option value="Class Suspension">🌧️ Class Suspension</option>
                    <option value="Academic">📚 Academic Notice</option>
                    <option value="Events">🎉 Campus Event</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Title & Content */}
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Headline / Title *</Label>
                <Input
                  placeholder="e.g. Schedule for First Quarter Assessment 2026"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="h-10 text-xs rounded-xl border-slate-200 mt-1"
                />
              </div>

              <div>
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Announcement Details *</Label>
                <textarea
                  rows={4}
                  placeholder="Type the full announcement message for parents, faculty, and learners..."
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  className="w-full text-xs p-3 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none mt-1"
                />
              </div>
            </div>

            {/* Audience Targeting */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Target Audience</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('all')}
                  className={cn(
                    "p-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer",
                    targetType === 'all' ? "bg-white text-slate-900 border-slate-300 shadow-2xs" : "text-slate-500 border-transparent hover:bg-slate-100"
                  )}
                >
                  🌐 Entire School
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('section')}
                  className={cn(
                    "p-2 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer",
                    targetType === 'section' ? "bg-white text-slate-900 border-slate-300 shadow-2xs" : "text-slate-500 border-transparent hover:bg-slate-100"
                  )}
                >
                  👥 My Section
                </button>
              </div>

              {targetType === 'section' && (
                <div className="pt-2">
                  <select
                    value={targetSectionId}
                    onChange={e => setTargetSectionId(e.target.value)}
                    className="w-full h-9 text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 text-slate-700 outline-none"
                  >
                    <option value="">Select Section</option>
                    {(sections || []).map(sec => (
                      <option key={sec.id || sec.sectionId} value={sec.id || sec.sectionId}>
                        {sec.gradeLevel} - {sec.name || sec.sectionName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Attachment File Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Add Attachment / Image</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-[#D8232A] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Choose File</span>
                </button>
              </div>

              {(fileToUpload || existingAttachmentUrl) && (
                <div className="p-3 bg-red-50/50 border border-red-100 rounded-2xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon className="w-4 h-4 text-[#D8232A] shrink-0" />
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {fileToUpload?.name || existingAttachmentName || 'Attached File'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveAttachment}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Pin to Top Checkbox */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isPinnedPost"
                checked={formIsPinned}
                onChange={e => setFormIsPinned(e.target.checked)}
                className="w-4 h-4 text-[#D8232A] border-slate-300 rounded focus:ring-red-500"
              />
              <Label htmlFor="isPinnedPost" className="cursor-pointer select-none font-bold text-slate-800 text-xs flex items-center gap-1">
                <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Pin this post to the top of the feed</span>
              </Label>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsComposerOpen(false)}
                className="rounded-2xl text-xs h-10 font-bold border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#D8232A] hover:bg-[#b91c22] text-white font-bold rounded-2xl text-xs h-10 px-5 shadow-md shadow-red-500/20"
              >
                {isSubmitting ? 'Publishing...' : 'Publish Post'}
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

      {/* ATTACHMENT VIEWER MODAL */}
      <AttachmentViewerModal
        isOpen={!!viewerAttachment}
        attachment={viewerAttachment}
        onClose={() => setViewerAttachment(null)}
      />

    </div>
  );
}
export default ManageAnnouncementsView;
