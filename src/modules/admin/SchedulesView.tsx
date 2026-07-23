import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../../components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Label } from '../../components/ui/Label';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { CalendarClock, Plus, Trash2, Clock, AlertCircle, Search, Edit2, ChevronLeft, ChevronRight, Download } from 'lucide-react';
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

export function SchedulesView() {
  const { users, subjects, sections, schedules, addSchedule, updateSchedule, deleteSchedule, schoolYear, batchAddSchedules, clearSchedulesForYear } = useAdminData();
  const syName = schoolYear?.name ?? getCurrentSchoolYear();

  const [searchQuery, setSearchQuery] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isGenerating, setIsGenerating] = useState(false);

  const [activeTab, setActiveTab] = useState('teachers');
  const [selectedSectionScheduleId, setSelectedSectionScheduleId] = useState<string | null>(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDownloadAllPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Faculty Teaching Load - All Teachers`, 14, 22);
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
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.firstName?.toLowerCase().includes(q) || 
        t.lastName?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [users, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(teachers.length / itemsPerPage));
  const paginatedTeachers = teachers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
      <header className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <CalendarClock className="w-5 h-5" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Faculty Teaching Load</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed hidden sm:block">
              Manage teacher schedules, subject assignments, and time slots for academic year {syName}.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
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
            <div className="relative w-full sm:w-96 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search teacher..."
                className="pl-10 h-11 rounded-xl bg-white border-2 border-slate-200/80 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/5 shadow-sm transition-all text-sm font-medium text-black w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
        <Tabs defaultValue="teachers" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="bg-slate-200/50 p-1 rounded-xl inline-flex h-11 items-center justify-center">
            <TabsTrigger value="teachers" className="rounded-lg px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-semibold transition-all">Teachers</TabsTrigger>
            <TabsTrigger value="sections" className="rounded-lg px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-semibold transition-all">Section Schedules</TabsTrigger>
          </TabsList>

          <TabsContent value="teachers" className="space-y-6 outline-none">
        <Card className="bg-white border-slate-200/60 shadow-sm rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/60 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4">Teacher Name</th>
                  <th className="px-6 py-4 hidden sm:table-cell text-center">Contact & Email</th>
                  <th className="px-6 py-4 text-center">Assigned Loads</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
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
                              <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                                {teacher.firstName} {teacher.lastName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell text-center">
                          <p className="text-slate-600">{teacher.email}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{teacher.contactNumber}</p>
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
              const groupedSectionsForView = sections.reduce((acc, section) => {
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

          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar">
            <div className="space-y-6">
              {(() => {
                const secSchedules = schedules.filter(s => s.sectionId === selectedSectionScheduleId && s.academicYear === syName);
                if (secSchedules.length === 0) {
                  return (
                    <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-2xl">
                      <p className="text-sm font-medium text-slate-500">No classes scheduled for this section.</p>
                    </div>
                  );
                }

                const grouped = secSchedules.reduce((acc, schedule) => {
                  if (!acc[schedule.dayOfWeek]) acc[schedule.dayOfWeek] = [];
                  acc[schedule.dayOfWeek].push(schedule);
                  return acc;
                }, {} as Record<string, typeof secSchedules>);
                
                const sortedDays = Object.keys(grouped).sort((a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b));
                
                return sortedDays.map(day => (
                  <div key={day} className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                      {day}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime)).map(schedule => {
                        const subject = subjects.find(s => s.id === schedule.subjectId);
                        const teacher = users.find(u => u.id === schedule.teacherId);
                        return (
                          <div key={schedule.id} className="p-3.5 rounded-xl border bg-white border-slate-200 shadow-sm flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-primary font-bold text-xs bg-primary/5 px-2 py-1 rounded-md border border-primary/10 w-fit">
                              <Clock className="w-3.5 h-3.5" />
                              {schedule.startTime} - {schedule.endTime}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-snug mb-1 text-sm line-clamp-1">{subject?.name || 'Unknown Subject'}</p>
                              <p className="text-xs font-semibold text-slate-500 truncate">
                                Teacher: {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
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
        }
      }}>
        <DialogContent className="w-[95vw] sm:max-w-[1000px] h-[90vh] sm:h-[800px] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shadow-inner">
                {selectedTeacher?.firstName?.[0]}{selectedTeacher?.lastName?.[0]}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Manage Teaching Load
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-0.5">
                  {selectedTeacher?.firstName} {selectedTeacher?.lastName} • {syName}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden p-6 bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.2fr,1fr] gap-6 h-full">
              {/* Form Section */}
              <div className="overflow-y-auto overflow-x-hidden pr-1 h-full custom-scrollbar">
                <section className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                {editingScheduleId ? <><Edit2 className="w-4 h-4 text-primary" /> Edit Schedule Entry</> : <><Plus className="w-4 h-4 text-primary" /> Add Schedule Entry</>}
              </h3>
              
              <form onSubmit={handleSaveSchedule} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}
                
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-5 ${editingScheduleId ? 'bg-amber-50/50 border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.05)]' : 'bg-transparent border-transparent p-0 sm:p-0'}`}>
                  
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
                          className={`rounded-full px-5 h-8 text-xs font-bold transition-all ${isSelected ? 'shadow-sm' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}
                        >
                          {day}
                        </Button>
                      );
                    })}
                  </div>
                    {editingScheduleId && <p className="text-xs text-amber-600 italic">Day cannot be changed while editing. To move, please create a new schedule.</p>}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Time</Label>
                      <Input type="time" required value={scheduleForm.startTime} onChange={e => setScheduleForm({...scheduleForm, startTime: e.target.value})} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Time</Label>
                      <Input type="time" required value={scheduleForm.endTime} onChange={e => setScheduleForm({...scheduleForm, endTime: e.target.value})} className="bg-white" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject</Label>
                    <Select value={scheduleForm.subjectId} onValueChange={v => setScheduleForm({...scheduleForm, subjectId: v})}>
                      <SelectTrigger className="bg-white w-full [&>span]:truncate [&>span]:text-left [&>span]:w-[calc(100%-20px)]">
                        <SelectValue placeholder="Select Subject">
                          {scheduleForm.subjectId ? subjects.find(s => s.id === scheduleForm.subjectId)?.name : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px]">
                        {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    </div>

                    <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Section / Class</Label>
                    <Select value={scheduleForm.sectionId} onValueChange={v => setScheduleForm({...scheduleForm, sectionId: v})}>
                      <SelectTrigger className="bg-white w-full [&>span]:truncate [&>span]:text-left [&>span]:w-[calc(100%-20px)]">
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
                        {(() => {
                          const groupedSectionsForView = sections.reduce((acc, section) => {
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

                          return sortedGrades.map(grade => (
                            <SelectGroup key={grade}>
                              <SelectLabel className="bg-slate-50/95 backdrop-blur-sm sticky -top-1 z-10 font-bold text-primary border-b border-slate-100 py-1.5">{grade}</SelectLabel>
                              {groupedSectionsForView[grade].map(s => (
                                <SelectItem key={s.id} value={s.id} className="pl-6">{s.name}</SelectItem>
                              ))}
                            </SelectGroup>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  {editingScheduleId && (
                    <Button type="button" variant="outline" onClick={resetForm} className="h-9 text-xs">
                      Cancel Edit
                    </Button>
                  )}
                  <Button type="submit" className="h-9 text-xs px-6">
                    {editingScheduleId ? 'Update Entry' : 'Save Entry'}
                  </Button>
                </div>
              </form>
            </section>
          </div>

          {/* Existing Schedule List Section */}
          <div className="overflow-y-auto overflow-x-hidden pr-1 h-full custom-scrollbar">
            <section className="h-full flex flex-col">
              <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10 pb-4">
                <h3 className="font-bold text-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    Current Assignments
                    <Badge variant="outline" className="bg-white text-primary border-primary/20 shadow-sm">
                      {teacherSchedules.length} Total
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDownloadTeacherPDF}
                    className="h-8 text-xs font-semibold text-primary hover:bg-primary/10"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Export PDF
                  </Button>
                </h3>
              </div>
              
              <div className="space-y-6 pb-6">
                {teacherSchedules.length === 0 ? (
                  <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-2xl">
                    <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">No classes assigned yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Add a schedule entry using the form.</p>
                  </div>
                ) : (
                  (() => {
                    // Group and sort schedules
                    const groupedSchedules = teacherSchedules.reduce((acc, schedule) => {
                      if (!acc[schedule.dayOfWeek]) acc[schedule.dayOfWeek] = [];
                      acc[schedule.dayOfWeek].push(schedule);
                      return acc;
                    }, {} as Record<string, typeof teacherSchedules>);
                    
                    const sortedDays = Object.keys(groupedSchedules).sort((a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b));
                    
                    return sortedDays.map(day => (
                      <div key={day} className="space-y-3">
                        <div className="sticky top-12 z-10 bg-slate-50/95 backdrop-blur-sm py-1.5 border-y border-slate-200/60 shadow-sm mt-4 first:mt-0 mb-3 rounded-lg flex items-center justify-between">
                          <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                            {day}
                          </h4>
                          <span className="text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">{groupedSchedules[day].length} classes</span>
                        </div>
                        <div className="space-y-2">
                          {groupedSchedules[day].sort((a, b) => a.startTime.localeCompare(b.startTime)).map(schedule => {
                            const subject = subjects.find(s => s.id === schedule.subjectId);
                            const section = sections.find(s => s.id === schedule.sectionId);
                            const isEditing = editingScheduleId === schedule.id;

                            return (
                              <div 
                                key={schedule.id} 
                                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between group ${
                                  isEditing 
                                    ? 'bg-amber-50/80 border-amber-300 ring-4 ring-amber-100 shadow-sm relative z-0' 
                                    : 'bg-white border-slate-200 hover:border-primary/30 shadow-sm hover:shadow-md'
                                }`}
                              >
                                <div className="flex flex-col gap-2 w-full">
                                  <div className="flex items-center justify-between w-full">
                                    <div className={`flex items-center gap-1.5 font-bold text-xs px-2 py-1 rounded-md border ${isEditing ? 'text-amber-700 bg-amber-100/50 border-amber-200' : 'text-primary bg-primary/5 border-primary/10'} w-fit`}>
                                      <Clock className="w-3.5 h-3.5" />
                                      {schedule.startTime} - {schedule.endTime}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleEditClick(schedule)}
                                        className={`h-7 w-7 rounded-lg ${isEditing ? "text-amber-600 bg-amber-100 hover:bg-amber-200 hover:text-amber-700" : "text-slate-400 hover:text-primary hover:bg-primary/10"}`}
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleDelete(schedule.id)}
                                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <p className="font-bold text-slate-900 leading-snug mb-1 text-sm">{subject?.name || 'Unknown Subject'}</p>
                                    <p className="text-xs font-semibold text-slate-500">
                                      {section ? `${formatGradeLevel(section.gradeLevel)} - ${section.name}` : 'Unknown Section'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </section>
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
    </div>
  );
}
