import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  User, 
  Trash2,
  Radio,
  Bell,
  BookOpen,
  Users,
  GraduationCap,
  UserCheck,
  Globe,
  LayoutGrid,
  ShieldAlert,
  X,
  Pin,
  Edit3,
  Archive,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Send,
  Eye,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  Layers,
  ChevronRight,
  Lock,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  UploadCloud,
  FileCheck
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

export interface AnnouncementAttachment {
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'doc';
  size?: string;
}

interface AnnouncementItem {
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

export function ManageAnnouncementsView({ sections = [], students = [], teachers = [] }: { sections?: any[], students?: any[], teachers?: any[] }) {
  const { userData, user } = useAuth();
  const uData = userData as any;
  const isTeacher = uData?.role?.toLowerCase() === 'teacher';
  
  const authorName = (uData?.firstName || uData?.lastName) 
    ? `${uData.firstName || ''} ${uData.lastName || ''}`.trim() 
    : isTeacher ? 'Adviser Teacher' : 'School Admin';
  const authorRole = isTeacher ? 'Class Adviser' : 'School Admin';

  // Navigation state: 'feed' (Feed View) vs 'composer' (Full-Screen Studio)
  const [currentView, setCurrentView] = useState<'feed' | 'composer'>('feed');
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'emergency' | 'school' | 'academic' | 'events'>('all');
  const [viewStatus, setViewStatus] = useState<'active' | 'archived'>('active');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState<AttachmentViewerData | null>(null);
  const [selectedReadAnnouncement, setSelectedReadAnnouncement] = useState<AnnouncementItem | null>(null);

  // Composer / Form State
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

  // Attachment States (ImageKit upload)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [existingAttachmentName, setExistingAttachmentName] = useState<string | null>(null);
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string | null>(null);
  const [existingAttachmentType, setExistingAttachmentType] = useState<'image' | 'pdf' | 'doc' | null>(null);
  const [existingAttachmentSize, setExistingAttachmentSize] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          author: data.author || '',
          authorRole: data.authorRole || '',
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

  // Filtered and Sorted announcements
  const filteredAnnouncements = useMemo(() => {
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
  }, [announcements, viewStatus, isTeacher, authorName, sections, categoryFilter, searchQuery]);

  // Executive KPI Stats
  const metrics = useMemo(() => {
    const active = announcements.filter(a => !a.isArchived);
    const total = active.length;
    const pinned = active.filter(a => a.isPinned).length;
    const emergency = active.filter(a => a.category === 'Emergency' || a.category === 'Class Suspension').length;
    const advisories = active.filter(a => a.category === 'General' || a.tab === 'school').length;
    const archived = announcements.filter(a => a.isArchived).length;
    return { total, pinned, emergency, advisories, archived };
  }, [announcements]);

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
      
      // Attachment recovery
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
      
      // Reset attachment
      setFileToUpload(null);
      setExistingAttachmentName(null);
      setExistingAttachmentUrl(null);
      setExistingAttachmentType(null);
      setExistingAttachmentSize(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setCurrentView('composer');
  };

  const handleTogglePin = async (item: AnnouncementItem) => {
    try {
      await updateDoc(doc(db, 'announcements', item.id), {
        isPinned: !item.isPinned,
        updatedAt: serverTimestamp()
      });
      toast.success(item.isPinned ? 'Announcement unpinned' : 'Announcement pinned to top');
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
      toast.success(willArchive ? 'Announcement moved to archives' : 'Announcement restored to active feed');
    } catch (error) {
      toast.error('Failed to update archive status');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this announcement?')) {
      try {
        await deleteDoc(doc(db, 'announcements', id));
        toast.success('Announcement permanently deleted');
      } catch (error) {
        toast.error('Failed to delete announcement');
      }
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm('WARNING: Are you sure you want to delete ALL announcements across all portals? This cannot be undone.')) {
      try {
        setIsSubmitting(true);
        const q = query(collection(db, 'announcements'));
        const snap = await getDocs(q);
        const batch = writeBatch(db);
        snap.forEach(document => batch.delete(document.ref));
        await batch.commit();
        toast.success('All announcements cleared successfully');
      } catch (error) {
        toast.error('Failed to clear announcements');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('Please enter an announcement title');
      return;
    }
    if (!formContent.trim()) {
      toast.error('Please enter announcement details');
      return;
    }
    if (isTeacher) {
      if (teacherBroadcastRole === 'adviser' && !targetSectionId) {
        toast.error('Please select your advisory section');
        return;
      }
      if (teacherBroadcastRole === 'subject' && !targetSectionId) {
        toast.error('Please select a target class section');
        return;
      }
      if (teacherBroadcastRole === 'student' && !targetStudentId) {
        toast.error('Please select a specific student');
        return;
      }
    } else {
      if (targetType === 'section' && !targetSectionId) {
        toast.error('Please select a section');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const finalTab = isTeacher 
        ? (teacherBroadcastRole === 'adviser' ? 'adviser' : teacherBroadcastRole === 'subject' ? 'subject' : 'adviser')
        : 'school';
      
      const finalAuthorRole = isTeacher
        ? (teacherBroadcastRole === 'adviser' 
            ? 'Class Adviser' 
            : teacherBroadcastRole === 'subject' 
              ? (targetSubjectCode ? `Subject Teacher (${targetSubjectCode})` : 'Subject Teacher')
              : 'Class Adviser')
        : 'School Admin';

      const finalTargetType = isTeacher 
        ? (teacherBroadcastRole === 'student' ? 'student' : 'section')
        : targetType;

      // Handle ImageKit file upload if new file is selected
      let finalAttachmentName = existingAttachmentName;
      let finalAttachmentUrl = existingAttachmentUrl;
      let finalAttachmentType = existingAttachmentType;
      let finalAttachmentSize = existingAttachmentSize;

      if (fileToUpload) {
        setIsUploadingFile(true);
        const folder = '/announcements';
        const cleanName = `Announcement_${Date.now()}_${fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        
        const uploadedUrl = await uploadToImageKit(fileToUpload, {
          folder,
          fileName: cleanName,
          onProgress: (p) => setUploadProgress(p)
        });

        const isPdf = fileToUpload.type === 'application/pdf' || fileToUpload.name.toLowerCase().endsWith('.pdf');
        const isImg = fileToUpload.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(fileToUpload.name);
        
        finalAttachmentName = fileToUpload.name;
        finalAttachmentUrl = uploadedUrl;
        finalAttachmentType = isPdf ? 'pdf' : isImg ? 'image' : 'doc';
        finalAttachmentSize = fileToUpload.size > 1024 * 1024 
          ? `${(fileToUpload.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(fileToUpload.size / 1024)} KB`;
      }

      if (editingId) {
        await updateDoc(doc(db, 'announcements', editingId), {
          tab: finalTab,
          category: formCategory,
          title: formTitle,
          content: formContent,
          authorRole: finalAuthorRole,
          targetType: finalTargetType,
          targetGradeLevel: !isTeacher && targetType === 'grade_level' ? targetGradeLevel : null,
          targetSectionId: finalTargetType === 'section' ? targetSectionId : null,
          targetStudentId: finalTargetType === 'student' ? targetStudentId : null,
          targetStudentName: finalTargetType === 'student' ? targetStudentName : null,
          subjectCode: teacherBroadcastRole === 'subject' ? targetSubjectCode : null,
          attachmentName: finalAttachmentName || null,
          attachmentUrl: finalAttachmentUrl || null,
          attachmentType: finalAttachmentType || null,
          attachmentSize: finalAttachmentSize || null,
          isPinned: !isTeacher ? formIsPinned : false,
          updatedAt: serverTimestamp()
        });
        toast.success('Announcement updated successfully');
      } else {
        await addDoc(collection(db, 'announcements'), {
          tab: finalTab,
          category: formCategory,
          title: formTitle,
          content: formContent,
          author: authorName,
          authorRole: finalAuthorRole,
          date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          targetType: finalTargetType,
          targetGradeLevel: !isTeacher && targetType === 'grade_level' ? targetGradeLevel : null,
          targetSectionId: finalTargetType === 'section' ? targetSectionId : null,
          targetStudentId: finalTargetType === 'student' ? targetStudentId : null,
          targetStudentName: finalTargetType === 'student' ? targetStudentName : null,
          subjectCode: teacherBroadcastRole === 'subject' ? targetSubjectCode : null,
          attachmentName: finalAttachmentName || null,
          attachmentUrl: finalAttachmentUrl || null,
          attachmentType: finalAttachmentType || null,
          attachmentSize: finalAttachmentSize || null,
          isPinned: !isTeacher ? formIsPinned : false,
          isArchived: false,
          createdAt: serverTimestamp()
        });
        toast.success('Announcement published successfully');
      }
      setCurrentView('feed');
      setEditingId(null);
      setFileToUpload(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to publish announcement');
    } finally {
      setIsSubmitting(false);
      setIsUploadingFile(false);
      setUploadProgress(0);
    }
  };

  const getTargetBadge = (target: string, gradeLevel?: string, sectionId?: string, studentName?: string, tab?: string, subjectCode?: string) => {
    if (target === 'student') {
      return { label: studentName ? `Direct Notice: ${studentName}` : 'Individual Student Advisory', icon: User, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (target === 'grade_level') {
      return { label: `All ${gradeLevel || 'Grade Level'}`, icon: GraduationCap, color: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (target === 'all_teachers') {
      return { label: 'Faculty & Staff Only', icon: UserCheck, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (target === 'section') {
      const sec = (sections || []).find(s => s?.sectionId === sectionId || s?.id === sectionId);
      const secName = sec ? `Grade ${sec.gradeLevel || ''} - ${sec.name || ''}` : 'Class Section';
      if (tab === 'adviser') {
        return { label: `Class Adviser: ${secName} (Homeroom)`, icon: Users, color: 'bg-rose-50 text-rose-700 border-rose-200' };
      }
      if (tab === 'subject') {
        return { label: `Subject Class: ${secName} ${subjectCode ? `• ${subjectCode}` : ''}`, icon: BookOpen, color: 'bg-blue-50 text-blue-700 border-blue-200' };
      }
      return { label: `Section ${secName}`, icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    return { label: 'Public Broadcast (All Students & Parents)', icon: Globe, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const getCategoryStyles = (category: string) => {
    switch (category) {
      case 'Emergency':
      case 'Class Suspension':
        return {
          pill: 'bg-rose-50 text-rose-700 border-rose-200',
          accent: 'from-rose-500 to-red-600',
          dot: 'bg-rose-500',
          icon: AlertTriangle
        };
      case 'Academic':
        return {
          pill: 'bg-slate-100 text-slate-800 border-slate-200',
          accent: 'from-slate-800 to-slate-950',
          dot: 'bg-slate-800',
          icon: BookOpen
        };
      case 'Events':
        return {
          pill: 'bg-amber-50 text-amber-800 border-amber-200',
          accent: 'from-amber-500 to-amber-600',
          dot: 'bg-amber-500',
          icon: Calendar
        };
      default:
        return {
          pill: 'bg-red-50 text-[#D8232A] border-red-200/80',
          accent: 'from-[#D8232A] to-red-700',
          dot: 'bg-[#D8232A]',
          icon: Bell
        };
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F6F8] relative overflow-hidden">
      <AnimatePresence mode="wait">
        {currentView === 'composer' ? (
          <motion.div 
            key="composer"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]"
          >
          
          {/* Studio Navigation Bar */}
          <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between shadow-2xs z-20">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentView('feed')}
                className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer border border-slate-200/80 flex items-center gap-2 text-xs font-bold active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Feed</span>
              </button>

              <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D8232A] leading-none mb-1">
                  {editingId ? 'Edit Mode' : 'Broadcast Studio'}
                </span>
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight leading-none">
                  {editingId ? 'Update Official Announcement' : 'Compose Official Elementary Broadcast'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => setCurrentView('feed')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="composerForm"
                disabled={isSubmitting}
                className="h-10 px-5.5 bg-gradient-to-r from-[#D8232A] to-red-600 hover:from-red-600 hover:to-[#D8232A] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-[0_4px_16px_rgba(216,35,42,0.28)] active:scale-95 transition-all cursor-pointer border-none"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Publishing...' : editingId ? 'Save Changes' : 'Broadcast Now'}</span>
              </Button>
            </div>
          </header>

          {/* Full Screen Split-Studio Workspace (Left: Editor | Right: Live 3D Preview) */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8">
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* ── LEFT COLUMN: STUDIO CONTROLS (7 Cols) ── */}
              <div className="lg:col-span-7 space-y-6">
                <form id="composerForm" onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Category Pill Selector */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        1. Announcement Category
                      </Label>
                      <span className="text-[11px] font-semibold text-slate-400">Select urgency level</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: 'General' as const, label: 'General Advisory', icon: Bell, border: 'hover:border-red-300' },
                        { id: 'Academic' as const, label: 'Academic & Grades', icon: BookOpen, border: 'hover:border-slate-300' },
                        { id: 'Events' as const, label: 'Campus Events', icon: Calendar, border: 'hover:border-amber-300' },
                        { id: 'Emergency' as const, label: 'Urgent Emergency', icon: AlertTriangle, border: 'hover:border-rose-300' },
                        { id: 'Class Suspension' as const, label: 'Class Suspension', icon: ShieldAlert, border: 'hover:border-rose-300' },
                      ].map((cat) => {
                        const isSelected = formCategory === cat.id;
                        const IconComponent = cat.icon;
                        return (
                          <button
                            type="button"
                            key={cat.id}
                            onClick={() => setFormCategory(cat.id)}
                            className={`p-3 rounded-2xl border text-xs font-extrabold flex items-center gap-2.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-gradient-to-r from-[#D8232A] to-red-600 text-white border-[#D8232A] shadow-[0_4px_12px_rgba(216,35,42,0.25)] scale-[1.02]'
                                : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-white ' + cat.border
                            }`}
                          >
                            <IconComponent className="w-4 h-4 shrink-0" />
                            <span className="truncate">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Audience & Scope Selector (Role-Guarded: Teacher vs Admin) */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        2. Target Audience & Scope
                      </Label>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {isTeacher ? 'Classroom & Student Scope' : 'Elementary School Scope'}
                      </span>
                    </div>

                    {isTeacher ? (
                      /* ── TEACHER 3-WAY ROLE SELECTOR (Adviser vs Subject vs Direct Student) ── */
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {/* 1. Class Adviser (Homeroom) */}
                          <button
                            type="button"
                            onClick={() => {
                              setTeacherBroadcastRole('adviser');
                              const adviserSec = (sections || []).find(s => s.isAdvisor);
                              if (adviserSec) setTargetSectionId(adviserSec.id || adviserSec.sectionId);
                            }}
                            className={`p-3.5 rounded-2xl border text-left text-xs font-bold flex flex-col gap-1 transition-all cursor-pointer ${
                              teacherBroadcastRole === 'adviser'
                                ? 'bg-red-50/80 border-[#D8232A] text-[#D8232A] shadow-2xs scale-[1.01]'
                                : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-[#D8232A]" />
                              <span className="font-extrabold text-slate-900">Class Adviser</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium leading-tight">Homeroom section advisory (PTA, clearance, notices)</span>
                          </button>

                          {/* 2. Subject Teacher Class */}
                          <button
                            type="button"
                            onClick={() => {
                              setTeacherBroadcastRole('subject');
                              if (sections && sections.length > 0 && !targetSectionId) {
                                setTargetSectionId(sections[0].id || sections[0].sectionId);
                              }
                            }}
                            className={`p-3.5 rounded-2xl border text-left text-xs font-bold flex flex-col gap-1 transition-all cursor-pointer ${
                              teacherBroadcastRole === 'subject'
                                ? 'bg-red-50/80 border-[#D8232A] text-[#D8232A] shadow-2xs scale-[1.01]'
                                : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4 text-[#D8232A]" />
                              <span className="font-extrabold text-slate-900">Subject Teacher</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium leading-tight">Subject-specific notices (projects, homework, exams)</span>
                          </button>

                          {/* 3. Direct Student */}
                          <button
                            type="button"
                            onClick={() => setTeacherBroadcastRole('student')}
                            className={`p-3.5 rounded-2xl border text-left text-xs font-bold flex flex-col gap-1 transition-all cursor-pointer ${
                              teacherBroadcastRole === 'student'
                                ? 'bg-red-50/80 border-[#D8232A] text-[#D8232A] shadow-2xs scale-[1.01]'
                                : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-[#D8232A]" />
                              <span className="font-extrabold text-slate-900">Direct Student</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium leading-tight">1-on-1 advisory to specific student / parent</span>
                          </button>
                        </div>

                        {/* MODE 1: Class Adviser Section Picker */}
                        {teacherBroadcastRole === 'adviser' && (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold text-slate-700 uppercase">
                                Select Your Advisory Section:
                              </Label>
                            </div>
                            {sections && sections.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {sections.map((sec: any) => {
                                  const secId = sec.id || sec.sectionId;
                                  const isSelected = targetSectionId === secId;
                                  return (
                                    <button
                                      type="button"
                                      key={secId}
                                      onClick={() => setTargetSectionId(secId)}
                                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                                        isSelected
                                          ? 'bg-red-50 border-[#D8232A] text-[#D8232A]'
                                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span>Grade {sec.gradeLevel} - {sec.name}</span>
                                        {sec.isAdvisor && (
                                          <span className="text-[9px] font-black uppercase bg-[#D8232A] text-white px-1.5 py-0.2 rounded">
                                            Advisory
                                          </span>
                                        )}
                                      </div>
                                      {isSelected && <CheckCircle2 className="w-4 h-4 text-[#D8232A]" />}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 font-medium">All assigned classes will automatically receive this advisory broadcast.</p>
                            )}
                          </div>
                        )}

                        {/* MODE 2: Subject Teacher Picker (Section + Subject) */}
                        {teacherBroadcastRole === 'subject' && (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold text-slate-700 uppercase">
                                Configure Subject Class Target:
                              </Label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Section Dropdown */}
                              <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-slate-600">Target Class Section *</Label>
                                {sections && sections.length > 0 ? (
                                  <select
                                    value={targetSectionId}
                                    onChange={(e) => {
                                      const newSecId = e.target.value;
                                      setTargetSectionId(newSecId);
                                      const currSec = (sections || []).find(s => (s.id === newSecId || s.sectionId === newSecId));
                                      const assignedSubjs = currSec?.taughtSubjectCodes || currSec?.subjectCodes || [];
                                      if (assignedSubjs.length > 0) {
                                        setTargetSubjectCode(assignedSubjs[0]);
                                      }
                                    }}
                                    className="w-full h-11 px-3 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:border-[#D8232A] outline-none"
                                  >
                                    <option value="">-- Choose a Section --</option>
                                    {sections.map((sec: any) => {
                                      const secId = sec.id || sec.sectionId;
                                      const subjCount = (sec.taughtSubjectCodes && sec.taughtSubjectCodes.length > 0) 
                                        ? `(${sec.taughtSubjectCodes.length} assigned subject${sec.taughtSubjectCodes.length > 1 ? 's' : ''})` 
                                        : '';
                                      return (
                                        <option key={secId} value={secId}>
                                          Grade {sec.gradeLevel} - {sec.name} {subjCount}
                                        </option>
                                      );
                                    })}
                                  </select>
                                ) : (
                                  <Input
                                    placeholder="Enter section name..."
                                    value={targetSectionId}
                                    onChange={(e) => setTargetSectionId(e.target.value)}
                                    className="bg-white"
                                  />
                                )}
                              </div>

                              {/* Subject Dropdown */}
                              <div className="space-y-1.5">
                                <Label className="text-[11px] font-bold text-slate-600">Select Subject Course *</Label>
                                <select
                                  value={targetSubjectCode}
                                  onChange={(e) => setTargetSubjectCode(e.target.value)}
                                  className="w-full h-11 px-3 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:border-[#D8232A] outline-none"
                                >
                                  <option value="">-- Choose a Subject --</option>
                                  {(() => {
                                    const currSec = (sections || []).find(s => (s.id === targetSectionId || s.sectionId === targetSectionId));
                                    const assigned = (currSec?.taughtSubjectCodes && currSec.taughtSubjectCodes.length > 0)
                                      ? currSec.taughtSubjectCodes
                                      : (currSec?.subjectCodes && currSec.subjectCodes.length > 0)
                                        ? currSec.subjectCodes
                                        : [];
                                    
                                    return (
                                      <>
                                        {assigned.length > 0 ? (
                                          <optgroup label="Assigned Subjects (Your Teaching Load)">
                                            {assigned.map((subj: string) => (
                                              <option key={`assigned-${subj}`} value={subj}>
                                                ✓ {subj} (Assigned Load)
                                              </option>
                                            ))}
                                          </optgroup>
                                        ) : null}
                                        <optgroup label={assigned.length > 0 ? "Other Subjects" : "Available Subjects"}>
                                          {COMMON_SUBJECTS.filter(s => !assigned.includes(s)).map((subj: string) => (
                                            <option key={`common-${subj}`} value={subj}>
                                              {subj}
                                            </option>
                                          ))}
                                        </optgroup>
                                      </>
                                    );
                                  })()}
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* MODE 3: Student Selection */}
                        {teacherBroadcastRole === 'student' && (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                            <Label className="text-xs font-bold text-slate-700 uppercase">
                              Select Student Recipient:
                            </Label>
                            {students && students.length > 0 ? (
                              <select
                                value={targetStudentId}
                                onChange={(e) => {
                                  const sId = e.target.value;
                                  setTargetStudentId(sId);
                                  const found = students.find((s: any) => s.id === sId);
                                  setTargetStudentName(found ? `${found.firstName} ${found.lastName}` : '');
                                }}
                                className="w-full h-11 px-3 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:border-[#D8232A] outline-none"
                              >
                                <option value="">-- Choose a Student --</option>
                                {students.map((st: any) => (
                                  <option key={st.id} value={st.id}>
                                    {st.firstName} {st.lastName} ({st.gradeLevel || st.grade || 'Student'} - LRN: {st.lrn || 'N/A'})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                placeholder="Enter student name or LRN..."
                                value={targetStudentName}
                                onChange={(e) => {
                                  setTargetStudentName(e.target.value);
                                  setTargetStudentId(e.target.value);
                                }}
                                className="bg-white"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* ── ADMIN AUDIENCE SELECTOR (Full Scope) ── */
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                          {/* Public (All) */}
                          <button
                            type="button"
                            onClick={() => setTargetType('all')}
                            className={`p-3.5 rounded-2xl border text-left text-xs font-bold flex flex-col gap-1 transition-all cursor-pointer ${
                              targetType === 'all'
                                ? 'bg-red-50/80 border-[#D8232A] text-[#D8232A] shadow-2xs'
                                : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Globe className="w-4 h-4 text-[#D8232A]" />
                              <span className="font-extrabold text-slate-900">All (Public)</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">Entire school community</span>
                          </button>

                          {/* Grade 1 to 6 */}
                          <button
                            type="button"
                            onClick={() => setTargetType('grade_level')}
                            className={`p-3.5 rounded-2xl border text-left text-xs font-bold flex flex-col gap-1 transition-all cursor-pointer ${
                              targetType === 'grade_level'
                                ? 'bg-red-50/80 border-[#D8232A] text-[#D8232A] shadow-2xs'
                                : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-[#D8232A]" />
                              <span className="font-extrabold text-slate-900">Specific Grade</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">Choose Grade 1 to 6</span>
                          </button>

                          {/* Faculty Memorandum */}
                          <button
                            type="button"
                            onClick={() => setTargetType('all_teachers')}
                            className={`p-3.5 rounded-2xl border text-left text-xs font-bold flex flex-col gap-1 transition-all cursor-pointer ${
                              targetType === 'all_teachers'
                                ? 'bg-red-50/80 border-[#D8232A] text-[#D8232A] shadow-2xs'
                                : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-[#D8232A]" />
                              <span className="font-extrabold text-slate-900">Faculty Only</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">Teachers & Staff memo</span>
                          </button>

                          {/* Specific Section */}
                          <button
                            type="button"
                            onClick={() => setTargetType('section')}
                            className={`p-3.5 rounded-2xl border text-left text-xs font-bold flex flex-col gap-1 transition-all cursor-pointer ${
                              targetType === 'section'
                                ? 'bg-red-50/80 border-[#D8232A] text-[#D8232A] shadow-2xs'
                                : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-[#D8232A]" />
                              <span className="font-extrabold text-slate-900">Class Section</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">Target single section</span>
                          </button>
                        </div>

                        {/* Interactive Grade 1 to 6 Selector Chips */}
                        {targetType === 'grade_level' && (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                            <Label className="text-xs font-bold text-slate-700 uppercase">
                              Select Elementary Grade Level:
                            </Label>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                              {ELEMENTARY_GRADES.map((g) => {
                                const isGradeActive = targetGradeLevel === g;
                                return (
                                  <button
                                    type="button"
                                    key={g}
                                    onClick={() => setTargetGradeLevel(g)}
                                    className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all cursor-pointer text-center ${
                                      isGradeActive
                                        ? 'bg-[#D8232A] text-white shadow-sm scale-105'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {g}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Admin Section Picker */}
                        {targetType === 'section' && (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                            <Label className="text-xs font-bold text-slate-700 uppercase">
                              Select Target Section:
                            </Label>
                            {sections && sections.length > 0 ? (
                              <select
                                value={targetSectionId}
                                onChange={(e) => setTargetSectionId(e.target.value)}
                                className="w-full h-11 px-3 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:border-[#D8232A] outline-none"
                              >
                                <option value="">-- Choose a Section --</option>
                                {sections.map((sec: any) => {
                                  const secId = sec.id || sec.sectionId;
                                  return (
                                    <option key={secId} value={secId}>
                                      Grade {sec.gradeLevel} - {sec.name}
                                    </option>
                                  );
                                })}
                              </select>
                            ) : (
                              <Input
                                placeholder="Enter Section name (e.g. Grade 1 - Diamond)"
                                value={targetSectionId}
                                onChange={(e) => setTargetSectionId(e.target.value)}
                                className="bg-white"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Announcement Content & Details */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        3. Announcement Message
                      </Label>
                      <span className="text-[11px] font-semibold text-slate-400">Headline & Details</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600">Headline Title *</Label>
                      <Input
                        placeholder="E.g., Class Suspension Advisory due to Heavy Rainfall (PAGASA Signal No. 1)"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="h-12 text-sm font-bold bg-slate-50/50 border-slate-200 rounded-2xl focus:bg-white"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-600">Official Directive Details *</Label>
                      <textarea
                        placeholder="Write the complete instructions, schedules, health protocols, or guidelines here..."
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        className="w-full min-h-[160px] p-4 text-sm font-medium border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:border-[#D8232A] focus:ring-1 focus:ring-[#D8232A] outline-none resize-none leading-relaxed"
                        required
                      />
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-1">
                        <span>Markdown and clean line breaks supported</span>
                        <span>{formContent.length} characters</span>
                      </div>
                    </div>

                    {/* 4. File / Document / Waiver Attachment (ImageKit Upload) */}
                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-[#D8232A]" />
                          <span>Attach Document / Photo / Waiver (Optional)</span>
                        </Label>
                        <span className="text-[10px] text-slate-400 font-medium">PDF, PNG, JPG up to 10MB</span>
                      </div>

                      {/* Hidden File Input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,image/jpeg,image/png,image/webp,.doc,.docx"
                        onChange={handleFileSelect}
                        className="hidden"
                      />

                      {/* Selected / Existing File Preview Chip */}
                      {(fileToUpload || existingAttachmentUrl) ? (
                        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#D8232A] border border-red-100 flex items-center justify-center shrink-0">
                              {(fileToUpload?.type.startsWith('image/') || existingAttachmentType === 'image') ? (
                                <ImageIcon className="w-5 h-5" />
                              ) : (
                                <FileText className="w-5 h-5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {fileToUpload?.name || existingAttachmentName || 'Attached Document'}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                <span className="uppercase font-bold text-[#D8232A] bg-red-50 px-1.5 py-0.2 rounded border border-red-100">
                                  {fileToUpload 
                                    ? (fileToUpload.type === 'application/pdf' ? 'PDF' : fileToUpload.type.startsWith('image/') ? 'IMAGE' : 'DOC') 
                                    : (existingAttachmentType?.toUpperCase() || 'FILE')}
                                </span>
                                <span>
                                  {fileToUpload 
                                    ? (fileToUpload.size > 1024 * 1024 
                                        ? `${(fileToUpload.size / (1024 * 1024)).toFixed(1)} MB` 
                                        : `${Math.round(fileToUpload.size / 1024)} KB`)
                                    : existingAttachmentSize || 'Cloud File'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {existingAttachmentUrl && (
                              <a
                                href={existingAttachmentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-500 hover:text-[#D8232A] hover:bg-white rounded-xl transition-all"
                                title="Preview attached document in new tab"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={handleRemoveAttachment}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                              title="Remove attachment"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-3 px-4 rounded-2xl border border-dashed border-slate-300 hover:border-[#D8232A] bg-slate-50/50 hover:bg-red-50/20 text-slate-600 hover:text-[#D8232A] transition-all flex items-center justify-center gap-2 text-xs font-bold cursor-pointer group"
                        >
                          <UploadCloud className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span>Attach PDF Waiver, Permission Slip, or Photo Banner</span>
                        </button>
                      )}

                      {/* Upload Progress Indicator */}
                      {isUploadingFile && (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500">
                            <span>Uploading attachment to ImageKit...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#D8232A] transition-all duration-300 rounded-full"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Pin to Top Option (Admin Only) */}
                    {!isTeacher && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-amber-50 rounded-xl text-amber-700 border border-amber-200/60">
                            <Pin className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-slate-900">Pin Announcement to Top</p>
                            <p className="text-[10px] text-slate-400 font-medium">Keep stickied at the very top of all student feeds</p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={formIsPinned}
                          onChange={(e) => setFormIsPinned(e.target.checked)}
                          className="w-5 h-5 rounded border-slate-300 text-[#D8232A] focus:ring-[#D8232A] cursor-pointer"
                        />
                      </div>
                    )}

                  </div>

                </form>
              </div>

              {/* ── RIGHT COLUMN: LIVE INTERACTIVE PREVIEW (5 Cols) ── */}
              <div className="lg:col-span-5 space-y-4 sticky top-6">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    <Eye className="w-4 h-4 text-[#D8232A]" />
                    <span>Real-Time Portal Preview</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-red-50 text-[#D8232A] px-2 py-0.5 rounded-full border border-red-100">
                    Live Simulator
                  </span>
                </div>

                {/* Simulated Luxury Card */}
                <div className="p-1 rounded-3xl bg-gradient-to-br from-slate-200/60 via-slate-100 to-slate-200/60 shadow-lg">
                  <div className="bg-white rounded-[22px] border border-slate-200/90 overflow-hidden shadow-sm">
                    
                    {/* Simulated Pinned Ribbon (Admin Only) */}
                    {!isTeacher && formIsPinned && (
                      <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/5 to-transparent px-4 py-1.5 border-b border-amber-200/60 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-800 text-[10px] font-black tracking-wider uppercase">
                          <Pin className="w-3 h-3 text-amber-600 fill-amber-500" />
                          <span>Pinned Important Notice</span>
                        </div>
                      </div>
                    )}

                    <div className="p-6 space-y-4">
                      {/* Category & Audience Pills */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getCategoryStyles(formCategory).pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getCategoryStyles(formCategory).dot}`} />
                            {formCategory}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200/60">
                            {isTeacher 
                              ? (teacherBroadcastRole === 'adviser' ? 'Class Adviser' : teacherBroadcastRole === 'subject' ? 'Subject Class' : 'Direct Student Notice')
                              : 'School Portal'}
                          </span>
                        </div>
                      </div>

                      {/* Title & Body */}
                      <div className="space-y-2">
                        <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                          {formTitle || 'Your Announcement Headline Will Appear Here...'}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-line">
                          {formContent || 'The detailed directive, instructions, and schedule details will be rendered here with crisp typography and spacing.'}
                        </p>
                      </div>

                      {/* Simulated Attached Document / Poster */}
                      {(fileToUpload || existingAttachmentUrl) && (
                        <div className="p-3 bg-red-50/60 rounded-xl border border-red-100 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-[#D8232A] shrink-0" />
                            <span className="font-bold text-slate-800 truncate">
                              {fileToUpload?.name || existingAttachmentName || 'Attached Document'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-[#D8232A] shrink-0">
                            View / Download
                          </span>
                        </div>
                      )}

                      {/* Footer Badge & Author */}
                      <div className="pt-3 border-t border-slate-100 space-y-2.5">
                        <div className="flex items-center">
                          {(() => {
                            const simTab = isTeacher 
                              ? (teacherBroadcastRole === 'adviser' ? 'adviser' : teacherBroadcastRole === 'subject' ? 'subject' : 'adviser')
                              : 'school';
                            const simTargetType = isTeacher 
                              ? (teacherBroadcastRole === 'student' ? 'student' : 'section')
                              : targetType;
                            const badge = getTargetBadge(simTargetType, targetGradeLevel, targetSectionId, targetStudentName, simTab, targetSubjectCode);
                            const BadgeIcon = badge.icon;
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide border ${badge.color}`}>
                                <BadgeIcon className="w-3 h-3" />
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[#D8232A] font-bold text-[9px]">
                              {authorName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-700 text-[11px]">{authorName}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1 py-0.5 rounded">
                              {authorRole}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                            <Clock className="w-3 h-3" />
                            <span>Today • Just now</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Helper Card */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 text-xs text-slate-500 space-y-1.5 shadow-2xs">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#D8232A]" /> Administrative Broadcast System
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Announcements broadcast to <strong>{targetType === 'grade_level' ? targetGradeLevel : targetType === 'all_teachers' ? 'Faculty Staff' : 'All Students & Parents'}</strong> appear instantly on dashboard feeds with real-time Firebase sync.
                  </p>
                </div>

              </div>

            </div>
          </div>
          </motion.div>
        ) : (
          <motion.div 
            key="feed"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 flex flex-col h-full overflow-hidden bg-[#F8FAFC]"
          >
          
          {/* Header Panel (Full Width - Exactly aligned with h-[72px] Sidebar Header) */}
          <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between shadow-2xs relative z-10">
            <div className="flex flex-row items-center justify-between gap-6 w-full">
              
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-red-50 rounded-2xl text-[#D8232A] border border-red-100 shadow-2xs">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D8232A] leading-none">Sta. Maria Elementary</span>
                    {!isTeacher && metrics.pinned > 0 && viewStatus === 'active' && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded-md">
                        {metrics.pinned} Pinned
                      </span>
                    )}
                  </div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none mt-1">Announcements & Bulletins</h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                
                {/* Active vs. Archive Filter Switch with Smooth Animated Pill */}
                <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/60 relative">
                  <button
                    onClick={() => setViewStatus('active')}
                    className={`relative px-3 py-1.5 text-xs font-extrabold rounded-lg transition-colors cursor-pointer z-10 ${
                      viewStatus === 'active' 
                        ? 'text-slate-900' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {viewStatus === 'active' && (
                      <motion.div
                        layoutId="activeViewStatusPill"
                        className="absolute inset-0 bg-white rounded-lg shadow-xs"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">Active ({metrics.total})</span>
                  </button>

                  <button
                    onClick={() => setViewStatus('archived')}
                    className={`relative px-3 py-1.5 text-xs font-extrabold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 z-10 ${
                      viewStatus === 'archived' 
                        ? 'text-slate-900' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {viewStatus === 'archived' && (
                      <motion.div
                        layoutId="activeViewStatusPill"
                        className="absolute inset-0 bg-white rounded-lg shadow-xs"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <Archive className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">Archived ({metrics.archived})</span>
                  </button>
                </div>

                {!isTeacher && announcements.length > 0 && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAll} 
                    disabled={isSubmitting} 
                    className="h-9 px-3.5 text-xs font-bold text-rose-600 bg-rose-50/50 hover:bg-rose-100/70 border-rose-200/70 rounded-xl cursor-pointer transition-all active:scale-95 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear All
                  </Button>
                )}

                <Button 
                  size="sm"
                  onClick={() => openComposer()} 
                  className="h-9 px-4.5 bg-gradient-to-r from-[#D8232A] to-red-600 hover:from-red-600 hover:to-[#D8232A] text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-[0_4px_14px_rgba(216,35,42,0.25)] active:scale-95 transition-all cursor-pointer border-none"
                >
                  <Plus className="w-4 h-4" /> Create Announcement
                </Button>

              </div>
            </div>
          </header>

          {/* Main Feed Container (Full Width Edge-to-Edge with clean padding) */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6 w-full relative z-10">
            
            {/* KPI Metric Cards */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              
              {/* Total Active Broadcasts */}
              <Card className="bg-white border border-slate-200/70 p-5 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] relative overflow-hidden transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-50 text-[#D8232A] border border-red-100/60 shadow-2xs">
                    <Radio className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D8232A] bg-red-50/70 px-2.5 py-0.5 rounded-full border border-red-100/60">Live Channels</span>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{metrics.total}</h3>
                  <p className="text-xs font-semibold text-slate-500 pt-1.5 uppercase tracking-wider">Active Bulletins</p>
                </div>
              </Card>

              {/* Emergencies & Suspensions */}
              <Card className="bg-white border border-slate-200/70 p-5 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] relative overflow-hidden transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-100/60 shadow-2xs">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">Urgent Alert</span>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{metrics.emergency}</h3>
                  <p className="text-xs font-semibold text-slate-500 pt-1.5 uppercase tracking-wider">Suspensions & Alerts</p>
                </div>
              </Card>

              {/* School Advisories */}
              <Card className="bg-white border border-slate-200/70 p-5 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] relative overflow-hidden transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-700 border border-slate-200/60 shadow-2xs">
                    <Bell className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">General</span>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{metrics.advisories}</h3>
                  <p className="text-xs font-semibold text-slate-500 pt-1.5 uppercase tracking-wider">School Advisories</p>
                </div>
              </Card>

              {/* Pinned Bulletins */}
              <Card className="bg-white border border-slate-200/70 p-5 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] relative overflow-hidden transition-all duration-300 group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
                <div className="flex items-center justify-between mb-3.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-700 border border-amber-100/60 shadow-2xs">
                    <Pin className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">Top Priority</span>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{metrics.pinned}</h3>
                  <p className="text-xs font-semibold text-slate-500 pt-1.5 uppercase tracking-wider">Pinned Notices</p>
                </div>
              </Card>
            </div>

            {/* Filter Navigation Bar & Search */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                
                {/* Category Filter Tabs with Smooth Sliding Framer Motion Indicator */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {[
                    { id: 'all' as const, label: 'All Broadcasts', icon: LayoutGrid },
                    { id: 'emergency' as const, label: 'Emergency & Suspensions', icon: AlertTriangle },
                    { id: 'school' as const, label: 'School Advisory', icon: Bell },
                    { id: 'academic' as const, label: 'Academic', icon: BookOpen },
                    { id: 'events' as const, label: 'Campus Events', icon: Calendar },
                  ].map((tab) => {
                    const isActive = categoryFilter === tab.id;
                    const IconComponent = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setCategoryFilter(tab.id)}
                        className={`relative px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
                          isActive 
                            ? 'text-white' 
                            : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeCategoryPill"
                            className="absolute inset-0 bg-[#D8232A] rounded-xl shadow-[0_4px_14px_rgba(216,35,42,0.28)]"
                            transition={{ type: "spring", stiffness: 450, damping: 35 }}
                          />
                        )}
                        <IconComponent className="w-3.5 h-3.5 relative z-10" />
                        <span className="relative z-10">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Input */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search title, details, author..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10.5 pl-9 pr-8 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:border-[#D8232A] focus:ring-2 focus:ring-red-100 outline-none transition-all shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* Responsive Multi-Column Card Grid with Silky PopLayout & Stagger */}
            {filteredAnnouncements.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25 }}
              >
                <Card className="p-16 text-center bg-white rounded-3xl border border-slate-200/70 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto text-[#D8232A]">
                    <Megaphone className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    {viewStatus === 'archived' ? 'No Archived Announcements' : 'No Announcements Found'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {searchQuery || categoryFilter !== 'all' 
                      ? 'No announcements match your search or selected category filter.' 
                      : viewStatus === 'archived' 
                      ? 'There are no archived announcements on record.' 
                      : 'There are no active bulletins published yet. Click "Create Announcement" to launch the studio.'}
                  </p>
                  {(searchQuery || categoryFilter !== 'all') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}
                      className="text-xs font-bold rounded-xl mt-2 cursor-pointer"
                    >
                      Reset Filters
                    </Button>
                  )}
                </Card>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
                {filteredAnnouncements.map((item) => {
                  const styles = getCategoryStyles(item.category);
                  const targetBadge = getTargetBadge(item.targetType, item.targetGradeLevel, item.targetSectionId, item.targetStudentName, item.tab, item.subjectCode);
                  const TargetIcon = targetBadge.icon;
                  const CategoryIcon = styles.icon;

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col justify-between group relative h-full min-h-[240px]"
                    >
                      {/* Pinned Banner */}
                      {item.isPinned && !item.isArchived && (
                        <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/5 to-transparent px-4 py-1.5 border-b border-amber-200/60 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-amber-800 text-[10px] font-extrabold tracking-wider uppercase">
                            <Pin className="w-3 h-3 text-amber-600 fill-amber-500" />
                            <span>Pinned Important Notice</span>
                          </div>
                        </div>
                      )}

                      <div className="p-5 sm:p-6 space-y-3.5 flex-1 flex flex-col justify-between">
                        
                        {/* Top Header: Category + Action Icons */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${styles.pill}`}>
                                <CategoryIcon className="w-3 h-3" />
                                {item.category}
                              </span>

                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/60">
                                {item.tab === 'school' ? 'School Portal' : item.tab === 'subject' ? 'Subject Feed' : 'Class Adviser'}
                              </span>
                            </div>

                            {/* Admin / Teacher Action Menu */}
                            <div className="flex items-center gap-1">
                              {isTeacher && item.author !== authorName && (
                                <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200/60">
                                  <Lock className="w-3 h-3 text-slate-400" /> Admin Notice
                                </span>
                              )}

                              {!isTeacher && !item.isArchived && (
                                <button
                                  onClick={() => handleTogglePin(item)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    item.isPinned 
                                      ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' 
                                      : 'text-slate-400 hover:text-amber-600 hover:bg-slate-50'
                                  }`}
                                  title={item.isPinned ? 'Unpin announcement' : 'Pin to top of feed'}
                                >
                                  <Pin className={`w-3.5 h-3.5 ${item.isPinned ? 'fill-amber-500' : ''}`} />
                                </button>
                              )}

                              {(!isTeacher || item.author === authorName) && (
                                <button
                                  onClick={() => openComposer(item)}
                                  className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="Edit announcement in studio"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {!isTeacher && (
                                <button
                                  onClick={() => handleToggleArchive(item)}
                                  className="text-slate-400 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title={item.isArchived ? 'Restore to active feed' : 'Archive announcement'}
                                >
                                  {item.isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                </button>
                              )}

                              {(!isTeacher || item.author === authorName) && (
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="Permanently delete announcement"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Title & Body */}
                          <div className="space-y-1.5">
                            <h3
                              onClick={() => {
                                // Received announcements (teacher reads admin notice) = open read modal
                                if (isTeacher && item.author !== authorName) {
                                  setSelectedReadAnnouncement(item);
                                }
                              }}
                              className={`text-base font-extrabold text-slate-900 tracking-tight leading-snug ${
                                isTeacher && item.author !== authorName
                                  ? 'cursor-pointer hover:text-[#D8232A] transition-colors'
                                  : ''
                              }`}
                            >
                              {item.title}
                            </h3>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium line-clamp-4 whitespace-pre-line">
                              {item.content}
                            </p>
                          </div>

                          {/* ── GOOGLE CLASSROOM-STYLE ATTACHMENT CARD PREVIEW ── */}
                          {item.attachmentUrl && (
                            <div className="pt-1">
                              <div className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 transition-all duration-200 group/att">
                                
                                {/* Left: Thumbnail & Metadata */}
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

                                {/* Right: Quick Action Buttons (In-App View & Direct Download) */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenViewer(item);
                                    }}
                                    className="px-2.5 py-1.5 bg-white hover:bg-slate-200/80 border border-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Preview in-app (No new tab)"
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

                        <div className="pt-3 border-t border-slate-100 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide border ${targetBadge.color}`}>
                              <TargetIcon className="w-3 h-3" />
                              {targetBadge.label}
                            </span>

                            {/* Read Full button — only for received admin notices (teacher cannot edit these) */}
                            {isTeacher && item.author !== authorName && (
                              <button
                                type="button"
                                onClick={() => setSelectedReadAnnouncement(item)}
                                className="flex items-center gap-1 px-3 py-1.5 text-[#D8232A] border border-red-200 hover:bg-red-50 active:scale-95 font-bold text-[11px] rounded-xl transition-all cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Read Full
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-[#D8232A] font-bold text-[9px]">
                                {item.author.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-700 text-[11px]">{item.author}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-1 py-0.5 rounded">
                                {item.authorRole || 'Faculty'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                              <Clock className="w-3 h-3" />
                              <span>{item.date}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── IN-APP ATTACHMENT VIEWER LIGHTBOX MODAL (GOOGLE CLASSROOM STYLE) ── */}
      <AttachmentViewerModal
        isOpen={!!viewerAttachment}
        onClose={() => setViewerAttachment(null)}
        attachment={viewerAttachment}
      />

      {/* ── READ FULL ANNOUNCEMENT MODAL (for received/admin notices, teacher view) ── */}
      <AnimatePresence>
        {selectedReadAnnouncement && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setSelectedReadAnnouncement(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 max-h-[90vh] sm:max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header Bar */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-5 sm:px-8 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 z-10">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${getCategoryStyles(selectedReadAnnouncement.category).pill}`}>
                      {selectedReadAnnouncement.category}
                    </span>
                    {selectedReadAnnouncement.isPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                        <Pin className="w-3 h-3 fill-amber-500 text-amber-600" /> Pinned Notice
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-400">
                      {selectedReadAnnouncement.date} • {selectedReadAnnouncement.time}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                    {selectedReadAnnouncement.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedReadAnnouncement(null)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors shrink-0 cursor-pointer mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="px-5 sm:px-8 py-5 space-y-5">
                {/* Author Info */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Posted By</span>
                  <p className="font-extrabold text-slate-900 text-sm">{selectedReadAnnouncement.author}</p>
                  <p className="text-xs text-slate-500 font-medium">{selectedReadAnnouncement.authorRole}</p>
                </div>

                {/* Full Content */}
                <div className="text-slate-700 text-sm leading-relaxed">
                  <p className="whitespace-pre-line">{selectedReadAnnouncement.content}</p>
                </div>

                {/* Attachment (if any) */}
                {selectedReadAnnouncement.attachmentUrl && (
                  <div className="p-3 sm:p-4 bg-red-50/60 border border-red-100 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3">
                    <div
                      onClick={() => handleOpenViewer(selectedReadAnnouncement)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-white border border-red-200 rounded-xl flex items-center justify-center text-[#D8232A] shadow-2xs shrink-0">
                        {selectedReadAnnouncement.attachmentType === 'image' || /\.(jpg|jpeg|png|webp)$/i.test(selectedReadAnnouncement.attachmentUrl) ? (
                          <ImageIcon className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate hover:text-[#D8232A] transition-colors">
                          {selectedReadAnnouncement.attachmentName || 'Official Attachment'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {selectedReadAnnouncement.attachmentSize || (selectedReadAnnouncement.attachmentType === 'image' ? 'Image File' : 'PDF Document')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenViewer(selectedReadAnnouncement)}
                        className="flex-1 sm:flex-none px-3 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(selectedReadAnnouncement.attachmentUrl, selectedReadAnnouncement.attachmentName)}
                        className="flex-1 sm:flex-none px-3.5 py-2.5 bg-[#D8232A] hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 sm:px-8 pb-5 pt-1 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setSelectedReadAnnouncement(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl px-6 py-2.5 text-xs shadow-2xs cursor-pointer transition-colors"
                >
                  Close Advisory
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
