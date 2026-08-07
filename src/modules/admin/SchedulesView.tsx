import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../../components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Label } from '../../components/ui/Label';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { CalendarClock, Plus, Trash2, Clock, AlertCircle, Search, Edit2, ChevronLeft, ChevronRight, Download, X, CheckCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAdminData } from '../../lib/adminData';
import { getCurrentSchoolYear } from '../../lib/utils';
import toast from 'react-hot-toast';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const addMinutesToTime = (time: string, minsToAdd: number) => {
  if (!time) return '';
  const currentMins = timeToMinutes(time);
  const totalMins = currentMins + minsToAdd;
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const isOverlapping = (start1: string, end1: string, start2: string, end2: string) => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
};

const formatGradeLevel = (gl: any) => {
  if (gl === 'undefined' || !gl) return 'Unassigned Grade';
  if (!gl.toString().startsWith('Grade')) return `Grade ${gl}`;
  return gl.toString();
};

const CALENDAR_START_MINS = 7 * 60; // 07:00
const CALENDAR_END_MINS = 19 * 60; // 19:00
const CALENDAR_HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 to 19
const PIXELS_PER_MINUTE = 80 / 60; // 80px per hour

export function SchedulesView() {
  const { users, subjects, sections, classrooms, schedules, addSchedule, updateSchedule, deleteSchedule, schoolYear, batchAddSchedules, clearSchedulesForYear } = useAdminData();
  const syName = schoolYear?.name ?? getCurrentSchoolYear();

  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [sectionSearch, setSectionSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  
  const [subjectDropdownSearch, setSubjectDropdownSearch] = useState('');
  const [sectionDropdownSearch, setSectionDropdownSearch] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isGenerating, setIsGenerating] = useState(false);

  const [activeTab, setActiveTab] = useState('teachers');
  const [selectedSectionScheduleId, setSelectedSectionScheduleId] = useState<string | null>(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [strictResetModal, setStrictResetModal] = useState<{ isOpen: boolean; type: 'all' | 'teacher'; title: string; action: () => Promise<void> } | null>(null);
  const [resetConfirmationText, setResetConfirmationText] = useState('');

  const handleDownloadAllPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Teachers Load - All Teachers`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Academic Year: ${syName}`, 14, 30);
    
    let currentY = 36;
    
    const activeTeachers = teachers.filter(t => schedules.some(s => s.teacherId === t.id && s.academicYear === syName));
    
    if (activeTeachers.length === 0) {
      doc.text("No schedules found.", 14, currentY);
    } else {
      activeTeachers.forEach((teacher, idx) => {
        if (idx > 0) {
          doc.addPage();
          currentY = 22;
        }
        
        doc.setFontSize(14);
        doc.text(`Teacher: ${teacher.firstName} ${teacher.lastName}`, 14, currentY);
        
        const tScheds = schedules.filter(s => s.teacherId === teacher.id && s.academicYear === syName)
          .sort((a, b) => {
            const dayDiff = DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek);
            if (dayDiff !== 0) return dayDiff;
            return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
          });
          
        const tableData = tScheds.map(sched => {
          const subject = subjects.find(s => s.id === sched.subjectId);
          const section = sections.find(s => s.id === sched.sectionId);
          return [
            sched.dayOfWeek,
            `${sched.startTime} - ${sched.endTime}`,
            subject?.name || 'Unknown',
            section ? `${section.gradeLevel} - ${section.name}` : 'Unknown'
          ];
        });

        autoTable(doc, {
          startY: currentY + 6,
          head: [['Day', 'Time', 'Subject', 'Section']],
          body: tableData,
        });
        currentY = (doc as any).lastAutoTable.finalY + 14;
      });
    }

    doc.save(`Faculty_Teaching_Load_${syName}.pdf`);
  };

  const handleAutoGenerateSchedules = () => {
    setConfirmGenerate(true);
  };

  const toastConfirm = (message: string, onConfirm: () => void, isDanger: boolean = true) => {
    toast.custom((t) => (
      <>
        {createPortal(
          <div className={`fixed inset-0 z-[9998] bg-slate-900/20 backdrop-blur-sm transition-opacity duration-200 ease-out ${t.visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
          , document.body
        )}
        <div 
          className={`relative z-[9999] flex flex-col gap-4 min-w-[300px] items-center text-center p-6 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 transition-all duration-200 ease-out ${t.visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
          style={{ marginTop: 'calc(50vh - 100px)' }}
        >
          <p className="text-sm font-semibold text-slate-800">{message}</p>
          <div className="flex justify-center w-full gap-3 mt-2">
            <Button size="sm" variant="outline" className="h-8 text-xs flex-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200" onClick={() => toast.dismiss(t.id)}>Cancel</Button>
            <Button 
              size="sm" 
              className={`h-8 text-xs flex-1 border-0 ${isDanger ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm' : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'}`}
              onClick={() => {
                toast.dismiss(t.id);
                onConfirm();
              }}
            >
              Confirm
            </Button>
          </div>
        </div>
      </>
    ), { 
      duration: 5000, 
      position: 'top-center'
    });
  };

  const handlePublishAllDrafts = () => {
    toastConfirm(
      "Publish ALL draft schedules? This makes them visible to teachers.",
      async () => {
        const drafts = schedules.filter(s => s.academicYear === syName && (!s.status || s.status === 'draft'));
        for (const d of drafts) {
          await updateSchedule(d.id, { status: 'published' });
        }
        toast.success("All drafts published successfully.");
      },
      false
    );
  };

  const handleResetAllSchedules = () => {
    setStrictResetModal({
      isOpen: true,
      type: 'all',
      title: 'Reset ALL Schedules',
      action: async () => {
        await clearSchedulesForYear(syName);
        toast.success("All schedules have been reset.");
      }
    });
  };

  const handleResetTeacherSchedules = () => {
    if (!selectedTeacherId) return;
    setStrictResetModal({
      isOpen: true,
      type: 'teacher',
      title: 'Reset Teacher Schedules',
      action: async () => {
        for (const s of teacherSchedules) {
          await deleteSchedule(s.id);
        }
        toast.success("Teacher schedules have been reset.");
      }
    });
  };

  const executeAutoGenerate = async () => {
    setConfirmGenerate(false);
    setIsGenerating(true);
    setError('');

    try {
      await clearSchedulesForYear(syName);

      const newSchedules: any[] = [];
      const schoolHours = { start: 8, end: 16 };
      const lunchBreak = 12;
      const classDuration = 1;

      const subjectsByGrade: Record<string, typeof subjects> = {};
      subjects.forEach(s => {
        const gl = s.gradeLevel?.replace(/Grade /i, '').trim() || '';
        if (!subjectsByGrade[gl]) subjectsByGrade[gl] = [];
        subjectsByGrade[gl].push(s);
      });

      const teachersByGrade: Record<string, typeof teachers> = {};
      const unassignedTeachers: typeof teachers = [];
      teachers.forEach(t => {
        const grade = t.assignedGrade?.replace(/Grade /i, '').trim();
        if (grade) {
          if (!teachersByGrade[grade]) teachersByGrade[grade] = [];
          teachersByGrade[grade].push(t);
        } else {
          unassignedTeachers.push(t);
        }
      });

      const teacherSchedulesTemp: Record<string, { day: string, start: number, end: number }[]> = {};
      const sectionSchedulesTemp: Record<string, { day: string, start: number, end: number }[]> = {};

      const hasConflict = (teacherId: string, sectionId: string, day: string, startHr: number, endHr: number) => {
        const tScheds = teacherSchedulesTemp[teacherId] || [];
        const sScheds = sectionSchedulesTemp[sectionId] || [];
        
        const overlaps = (scheds: { day: string, start: number, end: number }[]) => {
          return scheds.some(s => s.day === day && Math.max(s.start, startHr) < Math.min(s.end, endHr));
        };

        return overlaps(tScheds) || overlaps(sScheds);
      };

      const recordSchedule = (teacherId: string, sectionId: string, day: string, startHr: number, endHr: number) => {
        if (!teacherSchedulesTemp[teacherId]) teacherSchedulesTemp[teacherId] = [];
        if (!sectionSchedulesTemp[sectionId]) sectionSchedulesTemp[sectionId] = [];
        teacherSchedulesTemp[teacherId].push({ day, start: startHr, end: endHr });
        sectionSchedulesTemp[sectionId].push({ day, start: startHr, end: endHr });
      };

      for (const section of sections) {
        const gradeLevel = section.gradeLevel?.replace(/Grade /i, '').trim() || '';
        const requiredSubjects = subjectsByGrade[gradeLevel] || [];
        const availableTeachers = [...(teachersByGrade[gradeLevel] || []), ...unassignedTeachers];

        if (availableTeachers.length === 0 || requiredSubjects.length === 0) continue;

        let subjectIdx = 0;
        let dayIdx = 0;
        let hour = schoolHours.start;

        while (subjectIdx < requiredSubjects.length) {
          if (hour === lunchBreak) {
            hour++;
            continue;
          }
          if (hour >= schoolHours.end) {
            hour = schoolHours.start;
            dayIdx++;
            if (dayIdx >= DAYS_OF_WEEK.length) {
              break;
            }
            continue;
          }

          const day = DAYS_OF_WEEK[dayIdx];
          const subject = requiredSubjects[subjectIdx];
          
          let assignedTeacher = null;
          for (const teacher of availableTeachers) {
            if (!hasConflict(teacher.id, section.id, day, hour, hour + classDuration)) {
              assignedTeacher = teacher;
              break;
            }
          }

          if (assignedTeacher) {
            recordSchedule(assignedTeacher.id, section.id, day, hour, hour + classDuration);
            newSchedules.push({
              teacherId: assignedTeacher.id,
              subjectId: subject.id,
              sectionId: section.id,
              dayOfWeek: day,
              startTime: `${hour.toString().padStart(2, '0')}:00`,
              endTime: `${(hour + classDuration).toString().padStart(2, '0')}:00`,
              academicYear: syName
            });
            subjectIdx++;
          }
          
          hour++;
        }
      }

      if (newSchedules.length > 0) {
        await batchAddSchedules(newSchedules);
      } else {
         setError('Could not auto-generate schedules. Make sure sections and subjects share matching grade levels.');
      }
      
    } catch (err) {
      console.error('Error auto-generating schedules:', err);
      setError('Failed to auto-generate schedules. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Modal State
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form State
  const [error, setError] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<{
    subjectId: string;
    sectionId: string;
    daysOfWeek: string[];
    startTime: string;
    endTime: string;
  }>({
    subjectId: '',
    sectionId: '',
    daysOfWeek: ['Monday'],
    startTime: '08:00',
    endTime: '09:00'
  });

  const teachers = useMemo(() => {
    let filtered = users.filter(u => u.role?.toLowerCase() === 'teacher');
    
    if (teacherFilter === 'with-load') {
      filtered = filtered.filter(t => schedules.some(s => s.teacherId === t.id && s.academicYear === syName));
    } else if (teacherFilter === 'no-load') {
      filtered = filtered.filter(t => !schedules.some(s => s.teacherId === t.id && s.academicYear === syName));
    }

    if (teacherSearch) {
      const q = teacherSearch.toLowerCase();
      filtered = filtered.filter(t => 
        t.firstName?.toLowerCase().includes(q) || 
        t.lastName?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [users, teacherSearch, teacherFilter, schedules, syName]);

  const totalPages = Math.max(1, Math.ceil(teachers.length / itemsPerPage));
  const paginatedTeachers = teachers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [teacherSearch, teacherFilter]);

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  
  const teacherSchedules = useMemo(() => {
    if (!selectedTeacherId) return [];
    return schedules.filter(s => s.teacherId === selectedTeacherId && s.academicYear === syName)
                    .sort((a, b) => {
                      const dayDiff = DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek);
                      if (dayDiff !== 0) return dayDiff;
                      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
                    });
  }, [schedules, selectedTeacherId, syName]);

  const handleDownloadTeacherPDF = () => {
    if (!selectedTeacher) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Teaching Load - ${selectedTeacher.firstName} ${selectedTeacher.lastName}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Academic Year: ${syName}`, 14, 30);
    
    const tableData = teacherSchedules.map(sched => {
      const subject = subjects.find(s => s.id === sched.subjectId);
      const section = sections.find(s => s.id === sched.sectionId);
      return [
        sched.dayOfWeek,
        `${sched.startTime} - ${sched.endTime}`,
        subject?.name || 'Unknown',
        section ? `${section.gradeLevel} - ${section.name}` : 'Unknown'
      ];
    });

    if (tableData.length === 0) {
      doc.text("No classes assigned yet.", 14, 40);
    } else {
      autoTable(doc, {
        startY: 36,
        head: [['Day', 'Time', 'Subject', 'Section']],
        body: tableData,
      });
    }

    doc.save(`Schedule_${selectedTeacher.lastName}_${selectedTeacher.firstName}.pdf`);
  };

  const openManageModal = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    resetForm();
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setScheduleForm({
      subjectId: '',
      sectionId: '',
      daysOfWeek: ['Monday'],
      startTime: '08:00',
      endTime: '09:00'
    });
    setEditingScheduleId(null);
    setError('');
    setIsFormOpen(false);
  };

  const handleEditClick = (schedule: any) => {
    setScheduleForm({
      subjectId: schedule.subjectId,
      sectionId: schedule.sectionId,
      daysOfWeek: [schedule.dayOfWeek],
      startTime: schedule.startTime,
      endTime: schedule.endTime
    });
    setEditingScheduleId(schedule.id);
    setError('');
    setIsFormOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedTeacherId) return;

    if (!scheduleForm.subjectId || !scheduleForm.sectionId || !scheduleForm.startTime || !scheduleForm.endTime || scheduleForm.daysOfWeek.length === 0) {
      setError('Please fill in all fields and select at least one day.');
      return;
    }

    if (timeToMinutes(scheduleForm.startTime) >= timeToMinutes(scheduleForm.endTime)) {
      setError('Start time must be before end time.');
      return;
    }

    // Check Teacher conflicts
    const hasTeacherConflict = scheduleForm.daysOfWeek.some(day => {
      const daySchedules = teacherSchedules.filter(s => s.dayOfWeek === day && s.id !== editingScheduleId);
      return daySchedules.some(s => isOverlapping(scheduleForm.startTime, scheduleForm.endTime, s.startTime, s.endTime));
    });

    if (hasTeacherConflict) {
      setError('This schedule overlaps with an existing schedule for this teacher on one or more selected days.');
      return;
    }

    // Check Section conflicts
    const hasSectionConflict = scheduleForm.daysOfWeek.some(day => {
      const sectionDaySchedules = schedules.filter(s => 
        s.sectionId === scheduleForm.sectionId && 
        s.academicYear === syName && 
        s.dayOfWeek === day && 
        s.id !== editingScheduleId
      );
      return sectionDaySchedules.some(s => isOverlapping(scheduleForm.startTime, scheduleForm.endTime, s.startTime, s.endTime));
    });

    if (hasSectionConflict) {
      setError('The selected section already has a class scheduled during this time slot on one or more selected days.');
      return;
    }

    // Check Subject Duplicate per Day
    const hasSubjectDuplicatePerDay = scheduleForm.daysOfWeek.some(day => {
      return schedules.some(s => 
        s.sectionId === scheduleForm.sectionId &&
        s.subjectId === scheduleForm.subjectId &&
        s.academicYear === syName &&
        s.dayOfWeek === day &&
        s.id !== editingScheduleId
      );
    });

    if (hasSubjectDuplicatePerDay) {
      setError('This section already has this subject scheduled on one or more of the selected days. A section can only have a subject once per day.');
      return;
    }

    // Check Teacher consistency for Subject/Section
    const existingSubjectSchedules = schedules.filter(s => 
      s.sectionId === scheduleForm.sectionId &&
      s.subjectId === scheduleForm.subjectId &&
      s.academicYear === syName &&
      s.id !== editingScheduleId
    );
    
    const hasDifferentTeacher = existingSubjectSchedules.some(s => s.teacherId !== selectedTeacherId);
    
    if (hasDifferentTeacher) {
      setError('This subject is already assigned to a different teacher for this section. Only one teacher can teach a specific subject per section.');
      return;
    }

    try {
      if (editingScheduleId) {
        await updateSchedule(editingScheduleId, {
          subjectId: scheduleForm.subjectId,
          sectionId: scheduleForm.sectionId,
          dayOfWeek: scheduleForm.daysOfWeek[0],
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime
        });
      } else {
        const promises = scheduleForm.daysOfWeek.map(day => 
          addSchedule({
            teacherId: selectedTeacherId,
            subjectId: scheduleForm.subjectId,
            sectionId: scheduleForm.sectionId,
            dayOfWeek: day,
            startTime: scheduleForm.startTime,
            endTime: scheduleForm.endTime,
            academicYear: syName
          })
        );
        await Promise.all(promises);
      }
      resetForm();
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError('Failed to save schedule. Please try again.');
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const executeDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
      if (editingScheduleId === id) resetForm();
      toast.success('Schedule deleted successfully');
    } catch (err) {
      console.error('Error deleting schedule:', err);
      toast.error('Failed to delete schedule');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="h-20 px-6 border-b border-slate-200 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent flex items-center shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <CalendarClock className="w-5 h-5" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Teachers Load</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed hidden sm:block">
              Manage teacher schedules, subject assignments, and time slots for academic year {syName}.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              onClick={handleResetAllSchedules}
              variant="outline"
              className="bg-white text-rose-600 hover:bg-rose-50 border-rose-200 shadow-sm whitespace-nowrap hidden lg:flex"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset All
            </Button>
            {(() => {
              const hasGlobalDrafts = schedules.some(s => s.academicYear === syName && (!s.status || s.status === 'draft'));
              return (
                <Button
                  disabled={!hasGlobalDrafts}
                  onClick={() => {
                    if (hasGlobalDrafts) handlePublishAllDrafts();
                  }}
                  className={`shadow-sm whitespace-nowrap hidden lg:flex transition-all ${hasGlobalDrafts ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-200 text-slate-400 cursor-not-allowed border-none hover:bg-slate-200'}`}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Publish All
                </Button>
              );
            })()}
            <Button
              onClick={handleDownloadAllPDF}
              variant="outline"
              className="bg-white text-slate-700 hover:bg-slate-50 border-slate-200 shadow-sm whitespace-nowrap"
            >
              <Download className="w-4 h-4 mr-2 text-slate-500" />
              Download PDF
            </Button>
            <Button
              onClick={handleAutoGenerateSchedules}
              disabled={isGenerating}
              className="bg-primary text-primary-foreground shadow-sm whitespace-nowrap"
            >
              {isGenerating ? <span className="animate-pulse mr-2">⏳</span> : <CalendarClock className="w-4 h-4 mr-2" />}
              {isGenerating ? 'Generating...' : 'Auto-Generate'}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        <Tabs defaultValue="teachers" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <TabsList className="bg-slate-200/50 p-1 rounded-xl inline-flex h-11 items-center justify-center shrink-0">
              <TabsTrigger value="teachers" className="rounded-lg px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-semibold transition-all">Teachers</TabsTrigger>
              <TabsTrigger value="sections" className="rounded-lg px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-semibold transition-all">Section Schedules</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {activeTab === 'teachers' ? (
                <>
                  <div className="w-[180px] shrink-0">
                    <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                      <SelectTrigger className="w-full h-11 bg-white border-2 border-slate-200/80 rounded-xl hover:border-slate-300 text-sm font-medium transition-colors">
                        <SelectValue placeholder="Filter by Load" />
                      </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teachers</SelectItem>
                      <SelectItem value="with-load">With Teaching Load</SelectItem>
                      <SelectItem value="no-load">No Teaching Load</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                  <div className="relative w-full sm:w-72 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="Search teachers..."
                      className="pl-10 h-11 rounded-xl bg-white border-2 border-slate-200/80 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/5 shadow-sm transition-all text-sm font-medium text-black w-full"
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="w-[180px] shrink-0">
                    <Select value={sectionFilter} onValueChange={setSectionFilter}>
                      <SelectTrigger className="w-full h-11 bg-white border-2 border-slate-200/80 rounded-xl hover:border-slate-300 text-sm font-medium transition-colors">
                        <SelectValue placeholder="Filter by Grade" />
                      </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {Array.from(new Set(sections.map(s => {
                        const match = (s.gradeLevel || '').match(/\d+/);
                        return match ? `Grade ${match[0]}` : (s.gradeLevel || 'Unknown');
                      }))).sort((a, b) => {
                        const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
                        const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
                        if (numA === numB) return a.localeCompare(b);
                        return numA - numB;
                      }).map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>
                  <div className="relative w-full sm:w-72 group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input
                      placeholder="Search sections..."
                      className="pl-10 h-11 rounded-xl bg-white border-2 border-slate-200/80 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/5 shadow-sm transition-all text-sm font-medium text-black w-full"
                      value={sectionSearch}
                      onChange={(e) => setSectionSearch(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <TabsContent value="teachers" className="space-y-6 outline-none">
        <Card className="bg-white border-slate-200/60 shadow-sm rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Teacher Name</th>
                  <th className="px-6 py-4 hidden sm:table-cell text-center">Email</th>
                  <th className="px-6 py-4 hidden sm:table-cell text-center">Contact Number</th>
                  <th className="px-6 py-4 text-center">Assigned Loads</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">
                      No teachers found.
                    </td>
                  </tr>
                ) : (
                  paginatedTeachers.map(teacher => {
                    const loadCount = schedules.filter(s => s.teacherId === teacher.id && s.academicYear === syName).length;
                    
                    return (
                      <tr key={teacher.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20 shadow-inner">
                              {teacher.firstName?.[0] || ''}{teacher.lastName?.[0] || ''}
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-slate-900 group-hover:text-primary transition-colors flex items-center gap-2">
                                {teacher.firstName} {teacher.lastName}
                                {schedules.some(s => s.teacherId === teacher.id && s.academicYear === syName && (!s.status || s.status === 'draft')) && (
                                  <span className="bg-amber-100 text-amber-700 border border-amber-200 text-[9px] px-1.5 py-0 rounded-full font-bold uppercase tracking-wider">Drafts</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell text-center">
                          <p className="text-slate-600">{teacher.email}</p>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell text-center">
                          <p className="text-slate-600">{teacher.contactNumber}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className={loadCount > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500"}>
                            {loadCount} Class{loadCount !== 1 ? 'es' : ''}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center">
                            <Button 
                              onClick={() => openManageModal(teacher.id)}
                              className="rounded-xl px-4 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-semibold transition-all text-xs h-9"
                            >
                              <CalendarClock className="w-3.5 h-3.5 mr-2" />
                              Manage Schedule
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {teachers.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, teachers.length)} of {teachers.length} teachers
              </span>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-2 text-slate-600"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-semibold text-slate-600 min-w-[3rem] text-center">
                  {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-2 text-slate-600"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
          </TabsContent>

          <TabsContent value="sections" className="space-y-8 outline-none pb-8">
            {(() => {
              let filteredSections = sections;
              if (sectionFilter !== 'all') {
                filteredSections = filteredSections.filter(s => {
                  const match = (s.gradeLevel || '').match(/\d+/);
                  const g = match ? `Grade ${match[0]}` : (s.gradeLevel || 'Unknown');
                  return g === sectionFilter;
                });
              }
              if (sectionSearch) {
                const q = sectionSearch.toLowerCase();
                filteredSections = filteredSections.filter(s => 
                  (s.name || '').toLowerCase().includes(q) || 
                  (s.gradeLevel || '').toLowerCase().includes(q)
                );
              }

              const groupedSectionsForView = filteredSections.reduce((acc, section) => {
                const match = (section.gradeLevel || '').match(/\d+/);
                const gl = match ? `Grade ${match[0]}` : (section.gradeLevel || 'Unknown');
                if (!acc[gl]) acc[gl] = [];
                acc[gl].push(section);
                return acc;
              }, {} as Record<string, typeof sections>);
              
              const sortedGrades = Object.keys(groupedSectionsForView).sort((a, b) => {
                const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
                const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
                if (numA === numB) return a.localeCompare(b);
                return numA - numB;
              });

              if (sortedGrades.length === 0) {
                return (
                  <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl shadow-sm">
                    <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No sections available.</p>
                  </div>
                );
              }

              return sortedGrades.map(grade => (
                <section key={grade} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <h3 className="font-bold text-slate-800 text-lg px-2 text-primary">{grade}</h3>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {groupedSectionsForView[grade].map(section => {
                      const sectionSchedules = schedules.filter(s => s.sectionId === section.id && s.academicYear === syName);
                      return (
                        <div 
                          key={section.id}
                          onClick={() => {
                            setSelectedSectionScheduleId(section.id);
                            setIsSectionModalOpen(true);
                          }}
                          className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{section.name}</h4>
                            <Badge variant="outline" className={sectionSchedules.length > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500"}>
                              {sectionSchedules.length}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">
                            {sectionSchedules.length === 0 ? 'No schedules assigned.' : 'Click to view class schedule.'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ));
            })()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Section Schedule View Modal */}
      <Dialog open={isSectionModalOpen} onOpenChange={setIsSectionModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold border border-primary/20 shadow-inner">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Class Schedule
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-0.5">
                  {(() => {
                    const sec = sections.find(s => s.id === selectedSectionScheduleId);
                    return sec ? `${formatGradeLevel(sec.gradeLevel)} - ${sec.name}` : 'Unknown Section';
                  })()}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-0 bg-slate-50/50 custom-scrollbar flex flex-col relative min-h-[500px]">
            {(() => {
              const secSchedules = schedules.filter(s => s.sectionId === selectedSectionScheduleId && s.academicYear === syName);
              if (secSchedules.length === 0) {
                return (
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center py-10 px-10 bg-white border border-dashed border-slate-200 rounded-2xl w-full max-w-md">
                      <p className="text-sm font-medium text-slate-500">No classes scheduled for this section.</p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="flex-1 flex flex-col overflow-hidden relative bg-white">
                  {/* Day Headers (X-Axis) */}
                  <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shadow-sm shrink-0">
                    <div className="w-12 sm:w-14 shrink-0 border-r border-slate-200" />
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="flex-1 py-2 text-center border-r last:border-r-0 border-slate-200">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">{day.slice(0, 3)}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Scrollable Grid Body */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50/30">
                    {/* Time Labels (Y-Axis) */}
                    <div className="w-12 sm:w-14 shrink-0 border-r border-slate-200 bg-slate-50/80 sticky left-0 z-10 float-left h-[1040px]">
                      {CALENDAR_HOURS.map(hour => (
                        <div key={hour} className="h-[80px] relative flex items-start justify-end pr-1 sm:pr-2 pt-1 border-b border-slate-200 box-border">
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 leading-none">
                            {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Grid Lines Background */}
                    <div 
                      className="absolute left-12 sm:left-14 right-0 top-0 h-[1040px] bg-[length:100%_80px]" 
                      style={{ backgroundImage: 'linear-gradient(to bottom, transparent 79px, #e2e8f0 80px)' }}
                    >
                      <div className="absolute inset-0 flex h-full">
                        {DAYS_OF_WEEK.map(day => (
                          <div key={day} className="flex-1 relative border-r last:border-r-0 border-slate-200/50">
                            {secSchedules.filter(s => s.dayOfWeek === day).map(schedule => {
                              const subject = subjects.find(s => s.id === schedule.subjectId);
                              const teacher = users.find(u => u.id === schedule.teacherId);
                              
                              const startMins = timeToMinutes(schedule.startTime);
                              const endMins = timeToMinutes(schedule.endTime);
                              const top = Math.max(0, startMins - CALENDAR_START_MINS) * PIXELS_PER_MINUTE;
                              const height = Math.max(0, endMins - startMins) * PIXELS_PER_MINUTE;
                              
                              return (
                                <div
                                  key={schedule.id}
                                  className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md sm:rounded-lg border flex flex-col p-1 sm:p-1.5 overflow-hidden group transition-all cursor-default z-10 bg-white border-primary/20 shadow-sm hover:shadow-md hover:border-primary/50 hover:z-30`}
                                  style={{ top: `${top}px`, height: `${height}px` }}
                                >
                                  <div className="flex items-start justify-between">
                                    <span className={`text-[9px] font-bold text-primary bg-primary/5 rounded px-1 -ml-0.5 inline-block`}>
                                      {schedule.startTime}
                                    </span>
                                  </div>
                                  <span 
                                    title={subject?.name || 'Unknown Subject'}
                                    className={`text-[9px] sm:text-[10px] font-bold leading-tight mt-1 truncate text-slate-800`}
                                  >
                                    {subject?.name || 'Unknown Subject'}
                                  </span>
                                  <span 
                                    title={teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown Teacher'}
                                    className={`text-[8px] sm:text-[9px] font-semibold truncate mt-0.5 text-slate-500`}
                                  >
                                    {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown Teacher'}
                                  </span>
                                  <span className={`text-[8px] sm:text-[9px] font-bold mt-auto pt-0.5 sm:pt-1 border-t border-slate-100 text-slate-400 text-right`}>
                                    {schedule.endTime}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          
          <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-white shrink-0">
            <Button variant="outline" onClick={() => setIsSectionModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Schedule Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          setSelectedTeacherId(null);
          resetForm();
          setSubjectDropdownSearch('');
          setSectionDropdownSearch('');
        }
      }}>
        <DialogContent className="w-[95vw] sm:max-w-[1000px] h-[90vh] sm:h-[800px] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3 mt-1">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shadow-inner">
                {selectedTeacher?.firstName?.[0]}{selectedTeacher?.lastName?.[0]}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 leading-tight">
                  Manage Teaching Load
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-0.5">
                  {selectedTeacher?.firstName} {selectedTeacher?.lastName} • {syName}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden relative bg-slate-50/50">
            {/* Slide-Out Form Panel */}
            <div className={`absolute top-0 right-0 h-full w-[400px] bg-white shadow-2xl border-l border-slate-200 transition-transform duration-300 z-50 flex flex-col ${isFormOpen ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  {editingScheduleId ? <><Edit2 className="w-4 h-4 text-primary" /> Edit Schedule</> : <><Plus className="w-4 h-4 text-primary" /> Add Schedule</>}
                </h3>
                <Button variant="ghost" size="icon" onClick={resetForm} className="h-8 w-8 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                <form onSubmit={handleSaveSchedule} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{error}</p>
                    </div>
                  )}
                  
                  <div className={`p-4 rounded-xl border transition-all space-y-4 ${editingScheduleId ? 'bg-amber-50/50 border-amber-200' : 'bg-transparent border-transparent p-0'}`}>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Days of Week</Label>
                        {!editingScheduleId && <span className="text-[10px] text-slate-400 font-medium italic">(Select multiple)</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => {
                        const isSelected = scheduleForm.daysOfWeek.includes(day);
                        return (
                          <Button
                            key={day}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            disabled={!!editingScheduleId && !isSelected}
                            onClick={() => {
                              if (editingScheduleId) return;
                              setScheduleForm(prev => ({
                                ...prev,
                                daysOfWeek: isSelected
                                  ? prev.daysOfWeek.filter(d => d !== day)
                                  : [...prev.daysOfWeek, day]
                              }));
                            }}
                            className={`rounded-full px-4 h-7 text-xs font-bold transition-all ${isSelected ? 'shadow-sm' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}
                          >
                            {day.slice(0, 3)}
                          </Button>
                        );
                      })}
                    </div>
                      {editingScheduleId && <p className="text-[10px] text-amber-600 italic">Day cannot be changed while editing.</p>}
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Time</Label>
                          <Input type="time" required value={scheduleForm.startTime} onChange={e => setScheduleForm({...scheduleForm, startTime: e.target.value})} className="bg-white h-9 text-sm" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Time</Label>
                          <Input type="time" required value={scheduleForm.endTime} onChange={e => setScheduleForm({...scheduleForm, endTime: e.target.value})} className="bg-white h-9 text-sm" />
                        </div>
                      </div>
                      {/* Snap-to Duration Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-medium text-slate-400 mr-1">Duration:</span>
                        {[
                          { label: '+45m', mins: 45 },
                          { label: '+1h', mins: 60 },
                          { label: '+1.5h', mins: 90 },
                          { label: '+2h', mins: 120 }
                        ].map(dur => (
                          <Button
                            key={dur.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!scheduleForm.startTime}
                            className="h-6 px-2 text-[10px] font-bold rounded bg-slate-50 text-slate-600 hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all disabled:opacity-50"
                            onClick={() => setScheduleForm(prev => ({
                              ...prev,
                              endTime: addMinutesToTime(prev.startTime, dur.mins)
                            }))}
                          >
                            {dur.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subject</Label>
                      <Select value={scheduleForm.subjectId} onValueChange={v => setScheduleForm({...scheduleForm, subjectId: v})}>
                        <SelectTrigger className="bg-white h-9 text-sm w-full [&>span]:truncate [&>span]:text-left [&>span]:w-[calc(100%-20px)]">
                          <SelectValue placeholder="Select Subject">
                            {scheduleForm.subjectId ? subjects.find(s => s.id === scheduleForm.subjectId)?.name : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          <div className="p-2 sticky -top-1 bg-slate-50/95 backdrop-blur-sm z-10 border-b border-slate-100">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <Input 
                                placeholder="Search subject..." 
                                className="h-8 pl-8 text-xs bg-white border-slate-200" 
                                value={subjectDropdownSearch}
                                onChange={e => setSubjectDropdownSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          {subjects
                            .filter(s => s.name.toLowerCase().includes(subjectDropdownSearch.toLowerCase()) || (s.code && s.code.toLowerCase().includes(subjectDropdownSearch.toLowerCase())))
                            .map(s => <SelectItem key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      </div>

                      <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Section / Class</Label>
                      <Select value={scheduleForm.sectionId} onValueChange={v => setScheduleForm({...scheduleForm, sectionId: v})}>
                        <SelectTrigger className="bg-white h-9 text-sm w-full [&>span]:truncate [&>span]:text-left [&>span]:w-[calc(100%-20px)]">
                          <SelectValue placeholder="Select Section">
                            {scheduleForm.sectionId ? (
                              (() => {
                                const sec = sections.find(s => s.id === scheduleForm.sectionId);
                                return sec ? `${formatGradeLevel(sec.gradeLevel)} - ${sec.name}` : null;
                              })()
                            ) : null}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <div className="p-2 sticky -top-1 bg-slate-50/95 backdrop-blur-sm z-10 border-b border-slate-100 mb-1">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <Input 
                                placeholder="Search section..." 
                                className="h-8 pl-8 text-xs bg-white border-slate-200" 
                                value={sectionDropdownSearch}
                                onChange={e => setSectionDropdownSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          {(() => {
                            const q = sectionDropdownSearch.toLowerCase();
                            const groupedSectionsForView = sections
                              .filter(s => {
                                const c = classrooms.find(c => c.id === s.classroomId);
                                const matchName = (s.name || '').toLowerCase().includes(q);
                                const matchGrade = (s.gradeLevel || '').toLowerCase().includes(q);
                                const matchRoom = c && (c.roomName || '').toLowerCase().includes(q);
                                return matchName || matchGrade || matchRoom;
                              })
                              .reduce((acc, section) => {
                                const gl = formatGradeLevel(section.gradeLevel);
                                if (!acc[gl]) acc[gl] = [];
                                acc[gl].push(section);
                                return acc;
                              }, {} as Record<string, typeof sections>);
                            
                            const sortedGrades = Object.keys(groupedSectionsForView).sort((a, b) => {
                              const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
                              const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
                              if (numA === numB) return a.localeCompare(b);
                              return numA - numB;
                            });

                            if (sortedGrades.length === 0) {
                              return <div className="p-3 text-center text-xs text-slate-500">No sections found.</div>;
                            }

                            return sortedGrades.map(grade => (
                              <SelectGroup key={grade}>
                                <SelectLabel className="font-bold text-primary border-b border-slate-100 py-1">{grade}</SelectLabel>
                                {groupedSectionsForView[grade].map(s => {
                                  const c = classrooms.find(c => c.id === s.classroomId);
                                  return (
                                    <SelectItem key={s.id} value={s.id} className="pl-6">
                                      {s.name} {c ? `(${c.roomName})` : ''}
                                    </SelectItem>
                                  );
                                })}
                              </SelectGroup>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  </div>

                  <div className="flex justify-end pt-4 mt-6 border-t border-slate-100">
                    <Button type="submit" className="w-full h-10">
                      {editingScheduleId ? 'Update Schedule' : 'Save Schedule'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Calendar Block View Section (Full Width Background) */}
            <div className="absolute inset-0 p-6 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm">Weekly Schedule</h3>
                <Badge variant="outline" className="bg-white text-primary border-primary/20 shadow-sm">
                  {teacherSchedules.length} Classes
                </Badge>
              </div>
              <div className="flex items-center gap-2">

                {(() => {
                  const hasDrafts = teacherSchedules.some(s => !s.status || s.status === 'draft');
                  return (
                    <Button 
                      size="sm" 
                      disabled={!hasDrafts}
                      onClick={async () => {
                        if (!hasDrafts) return;
                        const drafts = teacherSchedules.filter(s => !s.status || s.status === 'draft');
                        for (const d of drafts) {
                          await updateSchedule(d.id, { status: 'published' });
                        }
                      }}
                      className={`h-8 text-xs font-bold shadow-sm transition-all ${hasDrafts ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed border-none hover:bg-slate-200'}`}
                    >
                      Publish Schedules
                    </Button>
                  );
                })()}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleResetTeacherSchedules}
                  className="h-8 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Reset Schedules
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDownloadTeacherPDF}
                  className="h-8 text-xs font-semibold text-primary hover:bg-primary/10"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Export PDF
                </Button>
                <Button 
                  size="sm" 
                  disabled={isFormOpen}
                  onClick={() => setIsFormOpen(true)} 
                  className={`h-8 text-xs font-semibold gap-1.5 shrink-0 transition-all ${isFormOpen ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-none hover:bg-slate-200' : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'}`}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Schedule
                </Button>
              </div>
            </div>
            
            {/* Calendar Grid */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* Day Headers (X-Axis) */}
              <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shadow-sm shrink-0">
                <div className="w-12 sm:w-14 shrink-0 border-r border-slate-200" />
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="flex-1 py-2 text-center border-r last:border-r-0 border-slate-200">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">{day.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
              
              {/* Scrollable Grid Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50/30">
                {/* Time Labels (Y-Axis) */}
                <div className="w-12 sm:w-14 shrink-0 border-r border-slate-200 bg-slate-50/80 sticky left-0 z-10 float-left h-[1040px]">
                  {CALENDAR_HOURS.map(hour => (
                    <div key={hour} className="h-[80px] relative flex items-start justify-end pr-1 sm:pr-2 pt-1 border-b border-slate-200 box-border">
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 leading-none">
                        {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Grid Lines Background */}
                <div 
                  className="absolute left-12 sm:left-14 right-0 top-0 h-[1040px] bg-[length:100%_80px]" 
                  style={{ backgroundImage: 'linear-gradient(to bottom, transparent 79px, #e2e8f0 80px)' }}
                >
                  <div className="absolute inset-0 flex h-full">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="flex-1 relative border-r last:border-r-0 border-slate-200/50">
                        {/* Ghost Block (Real-time Conflict Detection) */}
                        {(() => {
                          if (editingScheduleId) return null; // Don't show ghost block while editing
                          if (!scheduleForm.daysOfWeek.includes(day)) return null;
                          if (!scheduleForm.startTime || !scheduleForm.endTime) return null;
                          
                          const startMins = timeToMinutes(scheduleForm.startTime);
                          const endMins = timeToMinutes(scheduleForm.endTime);
                          if (startMins >= endMins || startMins < CALENDAR_START_MINS) return null;
                          
                          // Check for overlap against existing blocks in this day
                          const daySchedules = teacherSchedules.filter(s => s.dayOfWeek === day);
                          const hasOverlap = daySchedules.some(s => isOverlapping(scheduleForm.startTime, scheduleForm.endTime, s.startTime, s.endTime));
                          
                          const top = (startMins - CALENDAR_START_MINS) * PIXELS_PER_MINUTE;
                          const height = (endMins - startMins) * PIXELS_PER_MINUTE;
                          
                          return (
                            <div 
                              className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md sm:rounded-lg border-2 border-dashed flex flex-col p-1 sm:p-1.5 overflow-hidden z-20 pointer-events-none transition-all ${hasOverlap ? 'bg-rose-100/80 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-primary/10 border-primary/50'}`}
                              style={{ top: `${top}px`, height: `${height}px` }}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-bold ${hasOverlap ? 'text-rose-700' : 'text-primary'}`}>
                                  {scheduleForm.startTime}
                                </span>
                                {hasOverlap && <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-rose-600 shrink-0 bg-white/50 rounded-full" />}
                              </div>
                              <span 
                                title={scheduleForm.subjectId ? subjects.find(s => s.id === scheduleForm.subjectId)?.name : 'Draft'}
                                className={`text-[9px] sm:text-[10px] font-bold mt-0.5 truncate ${hasOverlap ? 'text-rose-800' : 'text-slate-700'}`}
                              >
                                {scheduleForm.subjectId ? subjects.find(s => s.id === scheduleForm.subjectId)?.name : 'Draft'}
                              </span>
                              {hasOverlap && (
                                <span className="text-[8px] sm:text-[9px] font-bold text-rose-600 mt-auto bg-white/80 px-1 py-0.5 rounded leading-tight border border-rose-200">
                                  Conflict!
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        
                        {/* Actual Assigned Blocks */}
                        {teacherSchedules.filter(s => s.dayOfWeek === day).map(schedule => {
                          const subject = subjects.find(s => s.id === schedule.subjectId);
                          const section = sections.find(s => s.id === schedule.sectionId);
                          const isEditing = editingScheduleId === schedule.id;
                          
                          const startMins = timeToMinutes(schedule.startTime);
                          const endMins = timeToMinutes(schedule.endTime);
                          const top = Math.max(0, startMins - CALENDAR_START_MINS) * PIXELS_PER_MINUTE;
                          const height = Math.max(0, endMins - startMins) * PIXELS_PER_MINUTE;
                          
                          return (
                            <div
                              key={schedule.id}
                              className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md sm:rounded-lg border flex flex-col p-1 sm:p-1.5 overflow-hidden group transition-all cursor-default z-10 ${isEditing ? 'bg-amber-100 border-amber-400 shadow-md ring-2 ring-amber-400/50 scale-[1.02]' : 'bg-white border-primary/20 shadow-sm hover:shadow-md hover:border-primary/50 hover:z-30'}`}
                              style={{ top: `${top}px`, height: `${height}px` }}
                            >
                              <div className="flex items-start justify-between">
                                <span className={`text-[9px] font-bold ${isEditing ? 'text-amber-800' : 'text-primary'} bg-white/50 rounded px-1 -ml-0.5 inline-block`}>
                                  {schedule.startTime}
                                </span>
                                <div className="flex flex-col gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-sm rounded-md shadow-sm border border-slate-200 p-0.5 absolute top-1 right-1 z-50">
                                  <button onClick={(e) => { e.stopPropagation(); handleEditClick(schedule); }} className={`p-1 rounded ${isEditing ? 'text-amber-600 hover:bg-amber-100' : 'text-slate-400 hover:text-primary hover:bg-primary/10'}`}>
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(schedule.id); }} className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <span 
                                title={subject?.name || 'Unknown'}
                                className={`text-[9px] sm:text-[10px] font-bold leading-tight mt-1 truncate ${isEditing ? 'text-amber-900' : 'text-slate-800'}`}
                              >
                                {subject?.name || 'Unknown'}
                              </span>
                              <span 
                                title={section ? `${formatGradeLevel(section.gradeLevel)} - ${section.name}` : ''}
                                className={`text-[8px] sm:text-[9px] font-semibold truncate mt-0.5 ${isEditing ? 'text-amber-700' : 'text-slate-500'}`}
                              >
                                {section ? `${formatGradeLevel(section.gradeLevel)} - ${section.name}` : ''}
                              </span>
                              <span className={`text-[8px] sm:text-[9px] font-bold mt-auto pt-0.5 sm:pt-1 border-t ${isEditing ? 'border-amber-200/50 text-amber-800/80' : 'border-slate-100 text-slate-400'} text-right`}>
                                {schedule.endTime}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
      {/* Auto-Generate Confirmation Modal */}
      <Dialog open={confirmGenerate} onOpenChange={setConfirmGenerate}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Auto-Generate Schedules</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-500 leading-relaxed">
              This will clear ALL existing schedules for Academic Year <span className="font-bold text-slate-700">{syName}</span> and auto-generate new ones. Are you sure you want to proceed?
            </p>
          </div>
          <DialogFooter className="flex space-x-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setConfirmGenerate(false)}>Cancel</Button>
            <Button onClick={executeAutoGenerate}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-600">
              Are you sure you want to remove this schedule entry? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="flex space-x-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => confirmDeleteId && executeDelete(confirmDeleteId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Strict Reset Confirmation Modal */}
      <Dialog open={strictResetModal?.isOpen || false} onOpenChange={(open) => {
        if (!open) {
          setStrictResetModal(null);
          setResetConfirmationText('');
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl border-rose-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {strictResetModal?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-slate-700 font-semibold bg-rose-50 p-3 rounded-lg border border-rose-100">
              WARNING: This action cannot be undone. All selected schedules will be permanently deleted!
            </p>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                To confirm, type <span className="font-bold text-rose-600 select-none">RESET</span> below:
              </Label>
              <Input 
                value={resetConfirmationText} 
                onChange={e => setResetConfirmationText(e.target.value)} 
                placeholder="Type RESET"
                className="border-rose-200 focus:border-rose-500 focus:ring-rose-500/20"
              />
            </div>
          </div>
          <DialogFooter className="flex space-x-2 justify-end mt-2">
            <Button variant="outline" onClick={() => { setStrictResetModal(null); setResetConfirmationText(''); }}>Cancel</Button>
            <Button 
              className="bg-rose-600 hover:bg-rose-700 text-white" 
              disabled={resetConfirmationText !== 'RESET'}
              onClick={async () => {
                if (strictResetModal?.action && resetConfirmationText === 'RESET') {
                  await strictResetModal.action();
                  setStrictResetModal(null);
                  setResetConfirmationText('');
                }
              }}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
