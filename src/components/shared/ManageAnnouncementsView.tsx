import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Megaphone, Plus, Search, Calendar, Clock, AlertTriangle, User, Trash2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import toast from 'react-hot-toast';

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
  targetType?: 'all' | 'section' | 'student' | 'all_teachers' | 'specific_teacher';
  targetSectionId?: string;
  targetStudentId?: string;
  targetStudentIds?: string[];
  targetTeacherIds?: string[];
  createdAt?: any;
}

export function ManageAnnouncementsView({ sections = [], students = [], teachers = [] }: { sections?: any[], students?: any[], teachers?: any[] }) {
  const { userData, user } = useAuth();
  const uData = userData as any;
  const isTeacher = uData?.role?.toLowerCase() === 'teacher';
  
  const authorName = (uData?.firstName || uData?.lastName) 
    ? `${uData.firstName || ''} ${uData.lastName || ''}`.trim() 
    : 'School Admin';
  const authorRole = isTeacher ? 'Faculty' : 'School Admin';

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formTab, setFormTab] = useState<'school' | 'subject' | 'adviser'>(isTeacher ? 'subject' : 'school');
  const [formCategory, setFormCategory] = useState<'Emergency' | 'Class Suspension' | 'General' | 'Academic' | 'Events'>('General');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  
  // Targeting State
  const [targetType, setTargetType] = useState<'all' | 'section' | 'student' | 'all_teachers' | 'specific_teacher'>(isTeacher ? 'section' : 'all');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [targetTeacherIds, setTargetTeacherIds] = useState<string[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const handleTargetTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as any;
    setTargetType(newType);
    setTargetStudentIds([]);
    setTargetTeacherIds([]);
    if (newType === 'section' && sections && sections.length > 0) {
      setTargetSectionId(sections[0].sectionId);
    } else {
      setTargetSectionId('');
    }
  };

  const getStudentSectionName = (sectionId: string) => {
    const section = sections?.find(s => s.sectionId === sectionId || s.id === sectionId);
    return section ? `${section.gradeLevel} - ${section.name}` : 'No Section';
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
          targetSectionId: data.targetSectionId,
          targetStudentId: data.targetStudentId,
          targetStudentIds: data.targetStudentIds,
          targetTeacherIds: data.targetTeacherIds,
          createdAt: data.createdAt
        });
      });
      setAnnouncements(items);
    }, (error) => {
      console.error('Error fetching announcements:', error);
    });

    return () => unsubscribe();
  }, []);

  const myAnnouncements = announcements.filter(a => {
    if (isTeacher) {
      if (a.author === authorName) return true;
      if (a.tab === 'school') {
        if (!a.targetType || a.targetType === 'all') return true;
        if (a.targetType === 'all_teachers') return true;
        if (a.targetType === 'specific_teacher' && a.targetTeacherIds?.includes(user?.uid || uData?.id)) return true;
        return false;
      }
      if (a.targetType === 'section' && a.targetSectionId) {
        if (sections.some(s => s.sectionId === a.targetSectionId)) return true;
      }
      return false;
    }
    return true; // Admins see all
  }).filter(a => a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.content.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (targetType === 'section' && !targetSectionId) {
      toast.error('Please select a section to target.');
      return;
    }
    
    if (targetType === 'student' && targetStudentIds.length === 0) {
      toast.error('Please select at least one student to target.');
      return;
    }
    
    if (targetType === 'specific_teacher' && targetTeacherIds.length === 0) {
      toast.error('Please select at least one teacher to target.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      await addDoc(collection(db, 'announcements'), {
        tab: formTab,
        category: formCategory,
        title: formTitle,
        content: formContent,
        author: authorName,
        authorRole: authorRole,
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        targetType,
        targetSectionId,
        targetStudentIds,
        targetTeacherIds,
        createdAt: serverTimestamp()
      });
      
      toast.success('Announcement published successfully');
      setIsDialogOpen(false);
      setFormTitle('');
      setFormContent('');
      setFormCategory('General');
      setTargetType(isTeacher ? 'section' : 'all');
      setTargetStudentIds([]);
      setTargetTeacherIds([]);
      setTeacherSearch('');
      setStudentSearch('');
    } catch (error) {
      console.error('Error adding announcement:', error);
      toast.error('Failed to publish announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await deleteDoc(doc(db, 'announcements', id));
        toast.success('Announcement deleted');
      } catch (error) {
        console.error('Error deleting announcement:', error);
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
        snap.forEach(document => {
          batch.delete(document.ref);
        });
        await batch.commit();
        toast.success('All announcements cleared successfully');
      } catch (error) {
        console.error('Error clearing announcements:', error);
        toast.error('Failed to clear announcements');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const getTargetLabel = (item: AnnouncementItem) => {
    if (item.targetType === 'section') {
       if (item.targetSectionId && sections) {
         const section = sections.find(s => s.sectionId === item.targetSectionId || s.id === item.targetSectionId);
         if (section) return `Section: ${section.gradeLevel} - ${section.name}`;
       }
       return `Section Only`;
    } else if (item.targetType === 'student') {
       return `Student(s) Only`;
    } else if (item.targetType === 'all_teachers') {
       return `All Teachers`;
    } else if (item.targetType === 'specific_teacher') {
       return `Specific Teacher(s)`;
    }
    return 'Broadcast All';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#2563eb]" />
            Manage Announcements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage targeted announcements for parents and students.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isTeacher && (
            <Button onClick={handleDeleteAll} disabled={isSubmitting} className="gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer shadow-sm border border-rose-100">
              <Trash2 className="w-4 h-4" /> Clear All
            </Button>
          )}
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2 bg-[#2563eb] hover:bg-blue-700 text-white cursor-pointer shadow-md">
            <Plus className="w-4 h-4" /> New Announcement
          </Button>
        </div>
      </div>

      <Card className="p-4 rounded-2xl border border-slate-200/60 shadow-sm">
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input 
            placeholder="Search announcements..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200"
          />
        </div>

        <div className="space-y-4">
          {myAnnouncements.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">No Announcements Found</h3>
              <p className="text-slate-500 text-sm mt-1">You haven't published any announcements yet.</p>
            </div>
          ) : (
            myAnnouncements.map((item) => {
              const isEmergency = item.category === 'Emergency' || item.category === 'Class Suspension';
              return (
                <div key={item.id} className="p-4 rounded-xl border border-slate-100 bg-white hover:border-[#2563eb]/30 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-sm group">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isEmergency ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-[#2563eb]'}`}>
                        {item.category}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {item.tab === 'school' ? 'School Advisory' : item.tab === 'subject' ? 'Subject Teacher' : 'Class Adviser'}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item.targetType !== 'all' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'}`}>
                        {getTargetLabel(item)}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 leading-snug">{item.title}</h4>
                    <p className="text-sm text-slate-600 line-clamp-2">{item.content}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium pt-1">
                      <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {item.date}</div>
                      <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {item.time}</div>
                      <div className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {item.author}</div>
                    </div>
                  </div>
                  {(!isTeacher || item.author === authorName) && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-2xl border-0 shadow-2xl max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#2563eb]" /> Create Announcement
            </DialogTitle>
          </div>
          
          <div className="overflow-y-auto flex-1">
            <form id="announcementForm" onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase">Audience / Tab</Label>
                  <select 
                    className="w-full text-sm border-slate-200 rounded-md bg-white focus:border-[#2563eb] focus:ring-[#2563eb] h-10 px-3 border outline-none cursor-pointer"
                    value={formTab}
                    onChange={(e: any) => setFormTab(e.target.value)}
                  >
                    {!isTeacher && <option value="school">School Advisory</option>}
                    {isTeacher && <option value="subject">Subject Teacher</option>}
                    {isTeacher && <option value="adviser">Class Adviser</option>}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase">Category</Label>
                  <select 
                    className="w-full text-sm border-slate-200 rounded-md bg-white focus:border-[#2563eb] focus:ring-[#2563eb] h-10 px-3 border outline-none cursor-pointer"
                    value={formCategory}
                    onChange={(e: any) => setFormCategory(e.target.value)}
                  >
                    <option value="General">General</option>
                    <option value="Academic">Academic</option>
                    <option value="Events">Events</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Class Suspension">Class Suspension</option>
                  </select>
                </div>
              </div>

              {/* Targeting Options */}
              {isTeacher && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 uppercase">Target Audience</Label>
                    <select 
                      className="w-full text-sm border-slate-200 rounded-md bg-white focus:border-[#2563eb] focus:ring-[#2563eb] h-10 px-3 border outline-none cursor-pointer"
                      value={targetType}
                      onChange={handleTargetTypeChange}
                    >
                      {!isTeacher && <option value="all">Broadcast to All (Public)</option>}
                      <option value="section">Specific Section</option>
                      <option value="student">Specific Student</option>
                    </select>
                  </div>

                  {targetType === 'section' && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2">
                      <Label className="text-xs font-semibold text-slate-600 uppercase">Select Section</Label>
                      <select 
                        className="w-full text-sm border-slate-200 rounded-md bg-white focus:border-[#2563eb] focus:ring-[#2563eb] h-10 px-3 border outline-none cursor-pointer"
                        value={targetSectionId}
                        onChange={(e: any) => setTargetSectionId(e.target.value)}
                      >
                        <option value="" disabled>Select a section</option>
                        {sections.length === 0 && <option disabled>No sections assigned</option>}
                        {sections.map(s => (
                          <option key={s.sectionId} value={s.sectionId}>
                            {s.gradeLevel} - {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {targetType === 'student' && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2">
                      <Label className="text-xs font-semibold text-slate-600 uppercase">Select Students</Label>
                      <div className="border border-slate-200 rounded-md bg-white overflow-hidden shadow-sm">
                        <div className="p-2 border-b border-slate-100 bg-slate-50/80">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <Input 
                              placeholder="Search students..." 
                              value={studentSearch}
                              onChange={e => setStudentSearch(e.target.value)}
                              className="pl-8 h-8 text-xs bg-white border-slate-200"
                            />
                          </div>
                        </div>
                        <div className="max-h-[160px] overflow-y-auto p-1">
                          {students.length === 0 && <div className="text-sm text-slate-500 p-3 text-center">No students enrolled</div>}
                          {students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 && students.length > 0 && (
                            <div className="text-sm text-slate-500 p-3 text-center">No students found</div>
                          )}
                          {students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase())).slice(0, 50).map(s => (
                            <label key={s.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-50 p-2 rounded-md transition-colors">
                              <input
                                type="checkbox"
                                checked={targetStudentIds.includes(s.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTargetStudentIds([...targetStudentIds, s.id]);
                                  } else {
                                    setTargetStudentIds(targetStudentIds.filter(id => id !== s.id));
                                  }
                                }}
                                className="rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb] w-4 h-4"
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-700">{s.lastName}, {s.firstName}</span>
                                <span className="text-[10px] text-slate-400 font-semibold uppercase">{getStudentSectionName(s.sectionId)}</span>
                              </div>
                            </label>
                          ))}
                          {students.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase())).length > 50 && (
                            <div className="text-[10px] text-slate-400 p-2 text-center font-medium uppercase tracking-wider">
                              Showing top 50 results. Use search to find more.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Targeting Options for Admin */}
              {!isTeacher && (
                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600 uppercase">Target Audience</Label>
                    <select 
                      className="w-full text-sm border-slate-200 rounded-md bg-white focus:border-[#2563eb] focus:ring-[#2563eb] h-10 px-3 border outline-none cursor-pointer"
                      value={targetType}
                      onChange={handleTargetTypeChange}
                    >
                      <option value="all">Broadcast to All (Public)</option>
                      <option value="all_teachers">All Teachers</option>
                      <option value="specific_teacher">Specific Teacher(s)</option>
                    </select>
                  </div>

                  {targetType === 'specific_teacher' && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-2">
                      <Label className="text-xs font-semibold text-slate-600 uppercase">Select Teachers</Label>
                      <div className="border border-slate-200 rounded-md bg-white overflow-hidden shadow-sm">
                        <div className="p-2 border-b border-slate-100 bg-slate-50/80">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <Input 
                              placeholder="Search teachers..." 
                              value={teacherSearch}
                              onChange={e => setTeacherSearch(e.target.value)}
                              className="pl-8 h-8 text-xs bg-white border-slate-200"
                            />
                          </div>
                        </div>
                        <div className="max-h-[160px] overflow-y-auto p-1">
                          {teachers?.length === 0 && <div className="text-sm text-slate-500 p-3 text-center">No teachers found</div>}
                          {teachers?.filter(t => `${t.firstName} ${t.lastName}`.toLowerCase().includes(teacherSearch.toLowerCase())).length === 0 && teachers?.length > 0 && (
                            <div className="text-sm text-slate-500 p-3 text-center">No teachers match search</div>
                          )}
                          {teachers?.filter(t => `${t.firstName} ${t.lastName}`.toLowerCase().includes(teacherSearch.toLowerCase())).slice(0, 50).map(t => (
                            <label key={t.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-50 p-2 rounded-md transition-colors">
                              <input
                                type="checkbox"
                                checked={targetTeacherIds.includes(t.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTargetTeacherIds([...targetTeacherIds, t.id]);
                                  } else {
                                    setTargetTeacherIds(targetTeacherIds.filter(id => id !== t.id));
                                  }
                                }}
                                className="rounded border-slate-300 text-[#2563eb] focus:ring-[#2563eb] w-4 h-4"
                              />
                              <span className="font-medium text-slate-700">{t.firstName} {t.lastName}</span>
                            </label>
                          ))}
                          {teachers?.filter(t => `${t.firstName} ${t.lastName}`.toLowerCase().includes(teacherSearch.toLowerCase())).length > 50 && (
                            <div className="text-[10px] text-slate-400 p-2 text-center font-medium uppercase tracking-wider">
                              Showing top 50 results. Use search to find more.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase">Title</Label>
                <Input 
                  placeholder="E.g., Special Assignment for John" 
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="font-medium h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase">Message</Label>
                <textarea 
                  placeholder="Write your announcement details here..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full min-h-[120px] p-3 text-sm border border-slate-200 rounded-xl bg-white focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none resize-none"
                />
              </div>
            </form>
          </div>

          <div className="flex justify-end gap-3 p-4 border-t border-slate-100 bg-white shrink-0">
            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" form="announcementForm" disabled={isSubmitting} className="bg-[#2563eb] hover:bg-blue-700 text-white cursor-pointer px-6">
              {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
