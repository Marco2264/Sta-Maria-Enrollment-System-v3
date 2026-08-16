import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../../components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Label } from '../../components/ui/Label';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { 
  CalendarClock, Plus, Trash2, Clock, AlertCircle, Search, Edit2, ChevronLeft, ChevronRight, 
  Download, X, CheckCircle2, UserCheck, BookOpen, Layers, Sparkles, Filter, 
  Check, Calendar, ShieldCheck, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAdminData, Schedule } from '../../lib/adminData';
import { getCurrentSchoolYear } from '../../lib/utils';
import toast from 'react-hot-toast';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Converts minutes to HH:MM format
const minutesToTime = (mins: number): string => {
  const clamped = Math.max(0, Math.min(24 * 60, mins));
  const h = Math.floor(clamped / 60);
  const m = Math.floor(clamped % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Robust time to minutes conversion (handles 24h, 12h AM/PM, single digits, and trailing spaces)
const timeToMinutes = (timeStr: string | undefined | null): number => {
  if (!timeStr) return 0;
  const clean = timeStr.toString().trim();
  if (!clean) return 0;

  // 12-hour format e.g. "8:00 AM", "08:00 PM"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const meridiem = match12[4]?.toUpperCase();
    if (meridiem === 'PM' && h < 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  }

  const parts = clean.split(':').map(Number);
  const h = isNaN(parts[0]) ? 0 : parts[0];
  const m = parts[1] !== undefined && !isNaN(parts[1]) ? parts[1] : 0;
  return h * 60 + m;
};

const formatTime12 = (timeStr: string | undefined | null): string => {
  if (!timeStr) return '';
  const mins = timeToMinutes(timeStr);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
};

const addMinutesToTime = (time: string, minsToAdd: number): string => {
  if (!time) return '';
  const currentMins = timeToMinutes(time);
  const totalMins = currentMins + minsToAdd;
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const isOverlapping = (start1: string, end1: string, start2: string, end2: string): boolean => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  if (s1 >= e1 || s2 >= e2) return false;
  return s1 < e2 && s2 < e1;
};

const formatGradeLevel = (gl: any) => {
  if (gl === 'undefined' || !gl) return 'Unassigned Grade';
  if (!gl.toString().startsWith('Grade')) return `Grade ${gl}`;
  return gl.toString();
};

// Returns clean standardized 'Grade X - Section Name' without repetitive classroom or duplicate grade prefixes
const getCleanSectionDisplay = (section: any): string => {
  if (!section) return 'Unknown Section';
  const gl = formatGradeLevel(section.gradeLevel);
  const rawName = (section.name || '').trim();
  
  // Strip any existing "Grade X -", "Grade X", "G1-", "G2-", "G6-", etc. prefix from section name
  const cleanName = rawName
    .replace(/^(Grade\s*\d+|G\d+)\s*[-–—:_.]*\s*/i, '')
    .replace(/^Grade\s*\d+\s*/i, '')
    .trim() || rawName;

  return gl && !gl.includes('Unassigned') ? `${gl} - ${cleanName}` : cleanName;
};

const getSubjectPalette = (subjectName: string = '') => {
  const name = subjectName.toLowerCase();
  if (name.includes('math')) {
    return {
      cardBg: 'bg-blue-50/95 hover:bg-blue-100/90',
      border: 'border-blue-200/90',
      borderL: 'border-l-blue-600',
      text: 'text-blue-950',
      badge: 'bg-blue-600 text-white',
      accent: 'text-blue-700',
      subText: 'text-blue-800/80',
      dot: 'bg-blue-500'
    };
  }
  if (name.includes('science')) {
    return {
      cardBg: 'bg-emerald-50/95 hover:bg-emerald-100/90',
      border: 'border-emerald-200/90',
      borderL: 'border-l-emerald-600',
      text: 'text-emerald-950',
      badge: 'bg-emerald-600 text-white',
      accent: 'text-emerald-700',
      subText: 'text-emerald-800/80',
      dot: 'bg-emerald-500'
    };
  }
  if (name.includes('english')) {
    return {
      cardBg: 'bg-purple-50/95 hover:bg-purple-100/90',
      border: 'border-purple-200/90',
      borderL: 'border-l-purple-600',
      text: 'text-purple-950',
      badge: 'bg-purple-600 text-white',
      accent: 'text-purple-700',
      subText: 'text-purple-800/80',
      dot: 'bg-purple-500'
    };
  }
  if (name.includes('filipino')) {
    return {
      cardBg: 'bg-amber-50/95 hover:bg-amber-100/90',
      border: 'border-amber-200/90',
      borderL: 'border-l-amber-600',
      text: 'text-amber-950',
      badge: 'bg-amber-600 text-white',
      accent: 'text-amber-700',
      subText: 'text-amber-800/80',
      dot: 'bg-amber-500'
    };
  }
  if (name.includes('araling') || name.includes('ap') || name.includes('social')) {
    return {
      cardBg: 'bg-orange-50/95 hover:bg-orange-100/90',
      border: 'border-orange-200/90',
      borderL: 'border-l-orange-600',
      text: 'text-orange-950',
      badge: 'bg-orange-600 text-white',
      accent: 'text-orange-700',
      subText: 'text-orange-800/80',
      dot: 'bg-orange-500'
    };
  }
  if (name.includes('mapeh') || name.includes('music') || name.includes('arts') || name.includes('pe') || name.includes('health')) {
    return {
      cardBg: 'bg-rose-50/95 hover:bg-rose-100/90',
      border: 'border-rose-200/90',
      borderL: 'border-l-rose-600',
      text: 'text-rose-950',
      badge: 'bg-rose-600 text-white',
      accent: 'text-rose-700',
      subText: 'text-rose-800/80',
      dot: 'bg-rose-500'
    };
  }
  if (name.includes('esp') || name.includes('values') || name.includes('edukasyon')) {
    return {
      cardBg: 'bg-teal-50/95 hover:bg-teal-100/90',
      border: 'border-teal-200/90',
      borderL: 'border-l-teal-600',
      text: 'text-teal-950',
      badge: 'bg-teal-600 text-white',
      accent: 'text-teal-700',
      subText: 'text-teal-800/80',
      dot: 'bg-teal-500'
    };
  }
  if (name.includes('epp') || name.includes('tle') || name.includes('livelihood')) {
    return {
      cardBg: 'bg-cyan-50/95 hover:bg-cyan-100/90',
      border: 'border-cyan-200/90',
      borderL: 'border-l-cyan-600',
      text: 'text-cyan-950',
      badge: 'bg-cyan-600 text-white',
      accent: 'text-cyan-700',
      subText: 'text-cyan-800/80',
      dot: 'bg-cyan-500'
    };
  }
  return {
    cardBg: 'bg-slate-50/95 hover:bg-slate-100/90',
    border: 'border-slate-200/90',
    borderL: 'border-l-slate-600',
    text: 'text-slate-900',
    badge: 'bg-slate-700 text-white',
    accent: 'text-slate-700',
    subText: 'text-slate-600',
    dot: 'bg-slate-500'
  };
};

const CALENDAR_START_MINS = 7 * 60; // 07:00 (7 AM)
const CALENDAR_END_MINS = 16 * 60;  // 16:00 (4 PM)
const CALENDAR_HOURS = Array.from({ length: 9 }, (_, i) => i + 7); // 7 to 15 (7:00 AM to 4:00 PM)
const PIXELS_PER_MINUTE = 90 / 60; // 90px per hour

const getCanonicalSubjectName = (name: string): string => {
  if (!name) return '';
  const clean = name.trim().replace(/\s+\d+$/, '');
  const lower = clean.toLowerCase();

  // Araling Panlipunan
  if (lower === 'ap' || lower === 'a.p.' || lower.startsWith('araling panlipunan') || lower === 'social studies' || lower.includes('araling panlipunan')) {
    return 'Araling Panlipunan';
  }

  // MAPEH (Music, Arts, P.E, Health)
  if (
    lower === 'mapeh' ||
    lower.includes('mapeh') ||
    lower.includes('music') ||
    lower === 'art' ||
    lower.startsWith('art ') ||
    lower.includes('arts') ||
    lower.includes('physical education') ||
    lower === 'pe' ||
    lower === 'p.e.' ||
    lower === 'p.e' ||
    lower.startsWith('pe ') ||
    lower.startsWith('p.e. ') ||
    lower.includes('health')
  ) {
    return 'MAPEH';
  }

  // Mathematics
  if (lower === 'math' || lower.startsWith('mathematics')) {
    return 'Mathematics';
  }

  // English
  if (lower.startsWith('english')) {
    return 'English';
  }

  // Science
  if (lower.startsWith('science')) {
    return 'Science';
  }

  // Filipino
  if (lower.startsWith('filipino')) {
    return 'Filipino';
  }

  // ESP / Values Education
  if (lower === 'esp' || lower === 'e.s.p.' || lower.startsWith('edukasyon sa pagpapakatao') || lower.startsWith('values') || lower.includes('pagpapakatao')) {
    return 'Edukasyon sa Pagpapakatao (ESP)';
  }

  // EPP / TLE
  if (lower === 'epp' || lower === 'tle' || lower.includes('epp') || lower.includes('tle') || lower.includes('pantahanan')) {
    return 'EPP / TLE';
  }

  // Mother Tongue
  if (lower.includes('mother tongue') || lower === 'mtb' || lower === 'mtb-mle') {
    return 'Mother Tongue';
  }

  return clean;
};

// Deduplicated unique subject names across all grade levels
export function SchedulesView() {
  const { 
    users, subjects, sections, classrooms, schedules, 
    addSchedule, updateSchedule, deleteSchedule, schoolYear, 
    batchAddSchedules, clearSchedulesForYear, assignments 
  } = useAdminData();
  
  const syName = schoolYear?.name ?? getCurrentSchoolYear();

  // Search and Filter States
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherFilter, setTeacherFilter] = useState<'all' | 'with-load' | 'no-load'>('all');
  const [sectionSearch, setSectionSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  
  const [subjectDropdownSearch, setSubjectDropdownSearch] = useState('');
  const [sectionDropdownSearch, setSectionDropdownSearch] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const [isGenerating, setIsGenerating] = useState(false);

  const [activeTab, setActiveTab] = useState('teachers');
  const [selectedSectionScheduleId, setSelectedSectionScheduleId] = useState<string | null>(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [strictResetModal, setStrictResetModal] = useState<{ isOpen: boolean; type: 'all' | 'teacher'; title: string; action: () => Promise<void> } | null>(null);
  const [resetConfirmationText, setResetConfirmationText] = useState('');

  // Modal & Drawer State
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form State
  const [error, setError] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('');
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

  // Deduplicated unique subject names across all grade levels
  const uniqueSubjectList = useMemo(() => {
    const map = new Map<string, { name: string; code?: string; sampleId: string }>();
    subjects.forEach(s => {
      const canonical = getCanonicalSubjectName(s.name || '');
      if (!canonical) return;
      const lower = canonical.toLowerCase();
      if (!map.has(lower)) {
        let codeLabel = s.code;
        if (canonical === 'MAPEH') {
          codeLabel = 'Music, Arts, P.E, Health';
        } else if (canonical === 'Araling Panlipunan') {
          codeLabel = 'AP';
        }
        map.set(lower, {
          name: canonical,
          code: codeLabel,
          sampleId: s.id
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects]);

  // Drag-and-Drop & Expand State
  type DragState = 
    | { 
        mode: 'move'; 
        scheduleId: string; 
        schedule: any;
        originDay: string; 
        originStartMins: number; 
        originEndMins: number; 
        currentDay: string; 
        currentStartMins: number; 
        currentEndMins: number; 
        grabOffsetMins: number;
      }
    | { 
        mode: 'resize-v'; 
        scheduleId: string; 
        schedule: any;
        day: string; 
        startMins: number; 
        originEndMins: number; 
        currentEndMins: number; 
      }
    | { 
        mode: 'expand-h'; 
        scheduleId: string; 
        schedule: any;
        startDayIdx: number; 
        currentDayIdx: number; 
        startTime: string; 
        endTime: string; 
      };

  const [dragState, setDragState] = useState<DragState | null>(null);
  const calendarBodyRef = useRef<HTMLDivElement>(null);

  const startMoveDrag = (e: React.PointerEvent, schedule: any) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const startMins = timeToMinutes(schedule.startTime);
    const endMins = timeToMinutes(schedule.endTime);
    
    const gridEl = calendarBodyRef.current;
    if (!gridEl) return;
    const rect = gridEl.getBoundingClientRect();
    const scrollOffsetY = gridEl.scrollTop;
    const relY = e.clientY - rect.top + scrollOffsetY;
    const clickedMins = CALENDAR_START_MINS + (relY / PIXELS_PER_MINUTE);
    const grabOffsetMins = Math.max(0, Math.min(endMins - startMins, clickedMins - startMins));

    setDragState({
      mode: 'move',
      scheduleId: schedule.id,
      schedule,
      originDay: schedule.dayOfWeek,
      originStartMins: startMins,
      originEndMins: endMins,
      currentDay: schedule.dayOfWeek,
      currentStartMins: startMins,
      currentEndMins: endMins,
      grabOffsetMins
    });
  };

  const startVerticalResize = (e: React.PointerEvent, schedule: any) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const startMins = timeToMinutes(schedule.startTime);
    const endMins = timeToMinutes(schedule.endTime);

    setDragState({
      mode: 'resize-v',
      scheduleId: schedule.id,
      schedule,
      day: schedule.dayOfWeek,
      startMins,
      originEndMins: endMins,
      currentEndMins: endMins
    });
  };

  const startHorizontalExpand = (e: React.PointerEvent, schedule: any) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    const dayIdx = DAYS_OF_WEEK.indexOf(schedule.dayOfWeek);
    if (dayIdx === -1) return;

    setDragState({
      mode: 'expand-h',
      scheduleId: schedule.id,
      schedule,
      startDayIdx: dayIdx,
      currentDayIdx: dayIdx,
      startTime: schedule.startTime,
      endTime: schedule.endTime
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!calendarBodyRef.current) return;
      const gridEl = calendarBodyRef.current;
      const rect = gridEl.getBoundingClientRect();
      const timeAxisWidth = 64; // w-16
      const contentWidth = rect.width - timeAxisWidth;
      const dayColWidth = contentWidth / 5;

      const relX = e.clientX - rect.left - timeAxisWidth;
      const dayIdx = Math.max(0, Math.min(4, Math.floor(relX / dayColWidth)));
      const targetDay = DAYS_OF_WEEK[dayIdx];

      const scrollOffsetY = gridEl.scrollTop;
      const relY = e.clientY - rect.top + scrollOffsetY;
      const rawMins = CALENDAR_START_MINS + (relY / PIXELS_PER_MINUTE);
      const snappedMins = Math.round(rawMins / 30) * 30; // 30-minute snapping

      if (dragState.mode === 'move') {
        const duration = dragState.originEndMins - dragState.originStartMins;
        const newStart = Math.max(CALENDAR_START_MINS, Math.min(CALENDAR_END_MINS - duration, snappedMins - dragState.grabOffsetMins));
        const newEnd = newStart + duration;

        setDragState(prev => prev && prev.mode === 'move' ? {
          ...prev,
          currentDay: targetDay,
          currentStartMins: newStart,
          currentEndMins: newEnd
        } : prev);
      } else if (dragState.mode === 'resize-v') {
        const newEnd = Math.max(dragState.startMins + 30, Math.min(CALENDAR_END_MINS, snappedMins));
        setDragState(prev => prev && prev.mode === 'resize-v' ? {
          ...prev,
          currentEndMins: newEnd
        } : prev);
      } else if (dragState.mode === 'expand-h') {
        setDragState(prev => prev && prev.mode === 'expand-h' ? {
          ...prev,
          currentDayIdx: dayIdx
        } : prev);
      }
    };

    const handlePointerUp = async () => {
      const current = dragState;
      setDragState(null);
      if (!current) return;

      if (current.mode === 'move') {
        const newStartStr = minutesToTime(current.currentStartMins);
        const newEndStr = minutesToTime(current.currentEndMins);

        if (current.originDay === current.currentDay && current.originStartMins === current.currentStartMins) {
          return;
        }

        const hasConflict = schedules.some(s => 
          s.id !== current.scheduleId &&
          s.teacherId === current.schedule.teacherId &&
          s.dayOfWeek === current.currentDay &&
          s.academicYear === syName &&
          isOverlapping(newStartStr, newEndStr, s.startTime, s.endTime)
        );

        if (hasConflict) {
          toast.error(`Cannot move class: Overlaps with another scheduled class on ${current.currentDay}.`);
          return;
        }

        try {
          await updateSchedule(current.scheduleId, {
            dayOfWeek: current.currentDay,
            startTime: newStartStr,
            endTime: newEndStr
          });
          toast.success(`Rescheduled to ${current.currentDay} (${formatTime12(newStartStr)} - ${formatTime12(newEndStr)})`);
        } catch (err) {
          console.error('Failed to move schedule:', err);
          toast.error('Failed to update schedule position.');
        }
      } else if (current.mode === 'resize-v') {
        const newEndStr = minutesToTime(current.currentEndMins);
        if (newEndStr === current.schedule.endTime) return;

        const hasConflict = schedules.some(s => 
          s.id !== current.scheduleId &&
          s.teacherId === current.schedule.teacherId &&
          s.dayOfWeek === current.day &&
          s.academicYear === syName &&
          isOverlapping(current.schedule.startTime, newEndStr, s.startTime, s.endTime)
        );

        if (hasConflict) {
          toast.error(`Cannot extend class: Overlaps with another scheduled class.`);
          return;
        }

        try {
          await updateSchedule(current.scheduleId, {
            endTime: newEndStr
          });
          toast.success(`Class duration updated to ${formatTime12(current.schedule.startTime)} - ${formatTime12(newEndStr)}`);
        } catch (err) {
          console.error('Failed to resize schedule:', err);
          toast.error('Failed to resize class.');
        }
      } else if (current.mode === 'expand-h') {
        const minIdx = Math.min(current.startDayIdx, current.currentDayIdx);
        const maxIdx = Math.max(current.startDayIdx, current.currentDayIdx);
        const targetDays = DAYS_OF_WEEK.slice(minIdx, maxIdx + 1).filter(d => d !== current.schedule.dayOfWeek);

        if (targetDays.length === 0) return;

        let addedCount = 0;
        for (const day of targetDays) {
          const conflict = schedules.some(s => 
            s.teacherId === current.schedule.teacherId &&
            s.dayOfWeek === day &&
            s.academicYear === syName &&
            isOverlapping(current.schedule.startTime, current.schedule.endTime, s.startTime, s.endTime)
          );

          if (!conflict) {
            await addSchedule({
              teacherId: current.schedule.teacherId,
              subjectId: current.schedule.subjectId,
              sectionId: current.schedule.sectionId,
              dayOfWeek: day,
              startTime: current.schedule.startTime,
              endTime: current.schedule.endTime,
              academicYear: syName,
              status: 'draft'
            });
            addedCount++;
          }
        }

        if (addedCount > 0) {
          toast.success(`Schedule filled across ${addedCount} day(s)! (${targetDays.join(', ')})`);
        } else {
          toast.error('Could not fill schedule: Target days already have conflicting classes.');
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, schedules, syName, updateSchedule, addSchedule]);

  type TeacherSortField = 'name' | 'email' | 'advisory' | 'load';
  type SortOrder = 'asc' | 'desc';

  const [sortField, setSortField] = useState<TeacherSortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: TeacherSortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

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

    const getGradeRank = (gradeStr: string | undefined | null): number => {
      if (!gradeStr || gradeStr === 'None' || gradeStr === 'undefined') return 9999;
      const clean = gradeStr.toString().toLowerCase().trim();
      if (clean.includes('nursery')) return -2;
      if (clean.includes('kinder')) return -1;
      const match = clean.match(/\d+/);
      if (match) return parseInt(match[0], 10);
      return 999;
    };

    return filtered.sort((a, b) => {
      let result = 0;
      if (sortField === 'name') {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        result = nameA.localeCompare(nameB);
      } else if (sortField === 'email') {
        const emailA = (a.email || '').toLowerCase();
        const emailB = (b.email || '').toLowerCase();
        result = emailA.localeCompare(emailB);
      } else if (sortField === 'advisory') {
        const advA = assignments.find(asg => asg.teacherId === a.id);
        const secA = advA ? sections.find(s => s.id === advA.sectionId) : null;
        const rankA = secA?.gradeLevel ? getGradeRank(secA.gradeLevel) : 9999;
        const labelA = secA ? `${formatGradeLevel(secA.gradeLevel)} - ${secA.name}` : 'zzzz_none';

        const advB = assignments.find(asg => asg.teacherId === b.id);
        const secB = advB ? sections.find(s => s.id === advB.sectionId) : null;
        const rankB = secB?.gradeLevel ? getGradeRank(secB.gradeLevel) : 9999;
        const labelB = secB ? `${formatGradeLevel(secB.gradeLevel)} - ${secB.name}` : 'zzzz_none';

        if (rankA !== rankB) {
          result = rankA - rankB;
        } else {
          result = labelA.localeCompare(labelB);
        }
      } else if (sortField === 'load') {
        const loadA = schedules.filter(s => s.teacherId === a.id && s.academicYear === syName).length;
        const loadB = schedules.filter(s => s.teacherId === b.id && s.academicYear === syName).length;
        result = loadA - loadB;
      }
      return sortOrder === 'asc' ? result : -result;
    });
  }, [users, teacherSearch, teacherFilter, schedules, syName, sortField, sortOrder, assignments, sections]);

  const totalPages = Math.max(1, Math.ceil(teachers.length / itemsPerPage));
  const paginatedTeachers = teachers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [teacherSearch, teacherFilter, sortField, sortOrder]);

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

  // Total weekly teaching hours for selected teacher
  const teacherTotalHours = useMemo(() => {
    const totalMins = teacherSchedules.reduce((acc, s) => {
      const dur = Math.max(0, timeToMinutes(s.endTime) - timeToMinutes(s.startTime));
      return acc + dur;
    }, 0);
    return (totalMins / 60).toFixed(1);
  }, [teacherSchedules]);

  // Real-time conflict inspection helper with detailed teacher & subject info
  const conflictAnalysis = useMemo(() => {
    if (!isFormOpen || !selectedTeacherId || !scheduleForm.startTime || !scheduleForm.endTime || scheduleForm.daysOfWeek.length === 0) {
      return { hasConflict: false, message: '' };
    }

    const sMins = timeToMinutes(scheduleForm.startTime);
    const eMins = timeToMinutes(scheduleForm.endTime);
    if (sMins >= eMins) {
      return { 
        hasConflict: true, 
        type: 'time_order', 
        message: 'Start time must be before end time.' 
      };
    }

    for (const day of scheduleForm.daysOfWeek) {
      // 1. Teacher Overlap (Is this teacher teaching another section at this time?)
      const teacherOverlap = schedules.find(s => 
        s.teacherId === selectedTeacherId &&
        s.academicYear === syName &&
        s.dayOfWeek === day &&
        s.id !== editingScheduleId &&
        isOverlapping(scheduleForm.startTime, scheduleForm.endTime, s.startTime, s.endTime)
      );

      if (teacherOverlap) {
        const sec = sections.find(sc => sc.id === teacherOverlap.sectionId);
        const subj = subjects.find(sb => sb.id === teacherOverlap.subjectId);
        const secName = sec ? `${formatGradeLevel(sec.gradeLevel)} - ${sec.name}` : 'another section';
        const subjName = subj ? subj.name : 'another class';
        const tName = `${selectedTeacher?.firstName || 'Teacher'} ${selectedTeacher?.lastName || ''}`.trim();
        const timeSlot = `${formatTime12(teacherOverlap.startTime)} - ${formatTime12(teacherOverlap.endTime)}`;

        return {
          hasConflict: true,
          type: 'teacher_overlap',
          conflictingDay: day,
          conflictingTeacherName: tName,
          conflictingSubjectName: subjName,
          conflictingSubjectCode: subj?.code || '',
          conflictingSectionName: secName,
          conflictingTimeSlot: timeSlot,
          message: `${tName} is already scheduled to teach ${subjName} (${secName}) on ${day} from ${timeSlot}.`
        };
      }

      // 2. Section Overlap (Is this section occupied by another class/teacher at this time?)
      if (scheduleForm.sectionId) {
        const sectionOverlap = schedules.find(s => 
          s.sectionId === scheduleForm.sectionId &&
          s.academicYear === syName &&
          s.dayOfWeek === day &&
          s.id !== editingScheduleId &&
          isOverlapping(scheduleForm.startTime, scheduleForm.endTime, s.startTime, s.endTime)
        );

        if (sectionOverlap) {
          const otherTeacher = users.find(u => u.id === sectionOverlap.teacherId);
          const subj = subjects.find(sb => sb.id === sectionOverlap.subjectId);
          const tName = otherTeacher ? `${otherTeacher.firstName} ${otherTeacher.lastName}` : 'another teacher';
          const subjName = subj ? subj.name : 'another class';
          const sec = sections.find(sc => sc.id === scheduleForm.sectionId);
          const secName = sec ? `${formatGradeLevel(sec.gradeLevel)} - ${sec.name}` : 'this section';
          const timeSlot = `${formatTime12(sectionOverlap.startTime)} - ${formatTime12(sectionOverlap.endTime)}`;

          return {
            hasConflict: true,
            type: 'section_overlap',
            conflictingDay: day,
            conflictingTeacherName: tName,
            conflictingSubjectName: subjName,
            conflictingSubjectCode: subj?.code || '',
            conflictingSectionName: secName,
            conflictingTimeSlot: timeSlot,
            message: `Section ${secName} is already occupied on ${day} with ${subjName} taught by ${tName} from ${timeSlot}.`
          };
        }

        // 3. Subject Duplication per Day (Section already has this subject on this day)
        if (selectedSubjectName || scheduleForm.subjectId) {
          const targetSubjName = selectedSubjectName || subjects.find(sb => sb.id === scheduleForm.subjectId)?.name || '';
          const targetCanonical = getCanonicalSubjectName(targetSubjName);
          const subjectDupe = schedules.find(s => {
            if (s.sectionId !== scheduleForm.sectionId || s.academicYear !== syName || s.dayOfWeek !== day || s.id === editingScheduleId) {
              return false;
            }
            const scheduledSubj = subjects.find(sb => sb.id === s.subjectId);
            return scheduledSubj && getCanonicalSubjectName(scheduledSubj.name) === targetCanonical;
          });

          if (subjectDupe) {
            const assignedTeacher = users.find(u => u.id === subjectDupe.teacherId);
            const tName = assignedTeacher ? `${assignedTeacher.firstName} ${assignedTeacher.lastName}` : 'another teacher';
            const sec = sections.find(sc => sc.id === scheduleForm.sectionId);
            const secName = sec ? `${formatGradeLevel(sec.gradeLevel)} - ${sec.name}` : 'this section';
            const timeSlot = `${formatTime12(subjectDupe.startTime)} - ${formatTime12(subjectDupe.endTime)}`;

            return {
              hasConflict: true,
              type: 'subject_duplicate',
              conflictingDay: day,
              conflictingTeacherName: tName,
              conflictingSubjectName: targetCanonical,
              conflictingSubjectCode: '',
              conflictingSectionName: secName,
              conflictingTimeSlot: timeSlot,
              message: `Section ${secName} already has ${targetCanonical} with ${tName} on ${day} (${timeSlot}).`
            };
          }
        }
      }
    }

    // 4. Single Teacher per Subject per Section consistency check
    if (scheduleForm.sectionId && (selectedSubjectName || scheduleForm.subjectId)) {
      const targetSubjName = selectedSubjectName || subjects.find(sb => sb.id === scheduleForm.subjectId)?.name || '';
      const targetCanonical = getCanonicalSubjectName(targetSubjName);
      const otherTeacherAssigned = schedules.find(s => {
        if (s.sectionId !== scheduleForm.sectionId || s.academicYear !== syName || s.teacherId === selectedTeacherId || s.id === editingScheduleId) {
          return false;
        }
        const scheduledSubj = subjects.find(sb => sb.id === s.subjectId);
        return scheduledSubj && getCanonicalSubjectName(scheduledSubj.name) === targetCanonical;
      });

      if (otherTeacherAssigned) {
        const diffTeacher = users.find(u => u.id === otherTeacherAssigned.teacherId);
        const tName = diffTeacher ? `${diffTeacher.firstName} ${diffTeacher.lastName}` : 'another teacher';
        const sec = sections.find(sc => sc.id === scheduleForm.sectionId);
        const secName = sec ? `${formatGradeLevel(sec.gradeLevel)} - ${sec.name}` : 'this section';

        return {
          hasConflict: true,
          type: 'teacher_mismatch',
          conflictingTeacherName: tName,
          conflictingSubjectName: targetCanonical,
          conflictingSubjectCode: '',
          conflictingSectionName: secName,
          message: `${targetCanonical} for Section ${secName} is already assigned to ${tName}. All class schedules for a subject in a section must be handled by the same teacher.`
        };
      }
    }

    return { hasConflict: false, message: '' };
  }, [isFormOpen, selectedTeacherId, selectedTeacher, scheduleForm, selectedSubjectName, editingScheduleId, schedules, syName, sections, subjects, users]);

  const handleDownloadAllPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Teachers Load - All Faculty`, 14, 22);
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
            `${formatTime12(sched.startTime)} - ${formatTime12(sched.endTime)}`,
            subject?.name || 'Unknown',
            section ? `${formatGradeLevel(section.gradeLevel)} - ${section.name}` : 'Unknown'
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

  const executeDelete = async (id: string) => {
    await handleDelete(id);
    setConfirmDeleteId(null);
  };

  const toastConfirm = (message: string, onConfirm: () => void, isDanger: boolean = true) => {
    toast.custom((t) => (
      <>
        {createPortal(
          <div className={`fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200 ease-out ${t.visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
          , document.body
        )}
        <div 
          className={`relative z-[9999] flex flex-col gap-4 min-w-[320px] max-w-sm items-center text-center p-6 rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10 transition-all duration-200 ease-out ${t.visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
          style={{ marginTop: 'calc(50vh - 100px)' }}
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Confirmation Required</h4>
            <p className="text-xs font-medium text-slate-500 mt-1">{message}</p>
          </div>
          <div className="flex justify-center w-full gap-2.5 mt-2">
            <Button size="sm" variant="outline" className="h-9 rounded-xl text-xs flex-1 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-semibold" onClick={() => toast.dismiss(t.id)}>Cancel</Button>
            <Button 
              size="sm" 
              className={`h-9 rounded-xl text-xs flex-1 font-bold border-0 shadow-sm ${isDanger ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-[#D8232A] hover:bg-red-700 text-white'}`}
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
      duration: 6000, 
      position: 'top-center'
    });
  };

  const handlePublishAllDrafts = () => {
    toastConfirm(
      "Publish ALL draft schedules? This makes them instantly visible to all assigned teachers.",
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
      title: `Reset ${selectedTeacher?.firstName || 'Teacher'}'s Schedules`,
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
      const schoolHours = { start: 7, end: 16 };
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
        toast.success(`Successfully auto-generated ${newSchedules.length} class schedules.`);
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

  const handleDownloadTeacherPDF = () => {
    if (!selectedTeacher) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Faculty Teaching Load - ${selectedTeacher.firstName} ${selectedTeacher.lastName}`, 14, 22);
    doc.setFontSize(10);
    doc.text(`Academic Year: ${syName} | Total Weekly Load: ${teacherTotalHours} Hours`, 14, 30);
    
    const tableData = teacherSchedules.map(sched => {
      const subject = subjects.find(s => s.id === sched.subjectId);
      const section = sections.find(s => s.id === sched.sectionId);
      const classroom = classrooms.find(c => c.id === section?.classroomId);
      return [
        sched.dayOfWeek,
        `${formatTime12(sched.startTime)} - ${formatTime12(sched.endTime)}`,
        subject?.name ? `${subject.name} (${subject.code || ''})` : 'Unknown',
        section ? `${formatGradeLevel(section.gradeLevel)} - ${section.name}` : 'Unknown',
        classroom?.roomName || '—'
      ];
    });

    if (tableData.length === 0) {
      doc.text("No classes assigned yet.", 14, 40);
    } else {
      autoTable(doc, {
        startY: 36,
        head: [['Day', 'Time Slot', 'Subject', 'Section', 'Room']],
        body: tableData,
      });
    }

    doc.save(`Teaching_Load_${selectedTeacher.lastName}_${selectedTeacher.firstName}.pdf`);
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
    setSelectedSubjectName('');
    setEditingScheduleId(null);
    setError('');
    setIsFormOpen(false);
  };

  const handleEditClick = (schedule: any) => {
    const existingSubj = subjects.find(s => s.id === schedule.subjectId);
    setSelectedSubjectName(getCanonicalSubjectName(existingSubj?.name || ''));
    setScheduleForm({
      subjectId: schedule.subjectId,
      sectionId: schedule.sectionId,
      daysOfWeek: [schedule.dayOfWeek],
      startTime: minutesToTime(timeToMinutes(schedule.startTime)),
      endTime: minutesToTime(timeToMinutes(schedule.endTime))
    });
    setEditingScheduleId(schedule.id);
    setError('');
    setIsFormOpen(true);
  };

  // Quick slot click directly from empty calendar cell with exact 30-min precision
  const handleQuickSlotClick = (day: string, hour: number, minutes: number = 0) => {
    const startMins = hour * 60 + minutes;
    const endMins = startMins + 60;
    setScheduleForm(prev => ({
      ...prev,
      daysOfWeek: [day],
      startTime: minutesToTime(startMins),
      endTime: minutesToTime(endMins)
    }));
    setEditingScheduleId(null);
    setError('');
    setIsFormOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedTeacherId) return;

    if (!selectedSubjectName || !scheduleForm.sectionId || !scheduleForm.startTime || !scheduleForm.endTime || scheduleForm.daysOfWeek.length === 0) {
      setError('Please fill in all required fields and select at least one day.');
      return;
    }

    if (timeToMinutes(scheduleForm.startTime) >= timeToMinutes(scheduleForm.endTime)) {
      setError('Start time must be before end time.');
      return;
    }

    if (conflictAnalysis.hasConflict) {
      setError(conflictAnalysis.message || 'There is a scheduling conflict.');
      return;
    }

    // Resolve subject based on section's grade level and selected subject name
    const targetSection = sections.find(s => s.id === scheduleForm.sectionId);
    const secGrade = targetSection?.gradeLevel ? targetSection.gradeLevel.replace(/Grade /i, '').trim() : '';
    const targetCanonical = getCanonicalSubjectName(selectedSubjectName);

    const resolvedSubj = subjects.find(s => 
      getCanonicalSubjectName(s.name) === targetCanonical &&
      (s.gradeLevel ? s.gradeLevel.replace(/Grade /i, '').trim() === secGrade : false)
    ) || subjects.find(s => 
      getCanonicalSubjectName(s.name) === targetCanonical
    ) || subjects.find(s => s.id === scheduleForm.subjectId);

    const finalSubjectId = resolvedSubj ? resolvedSubj.id : scheduleForm.subjectId;

    if (!finalSubjectId) {
      setError('Please select a valid subject.');
      return;
    }

    try {
      if (editingScheduleId) {
        await updateSchedule(editingScheduleId, {
          subjectId: finalSubjectId,
          sectionId: scheduleForm.sectionId,
          dayOfWeek: scheduleForm.daysOfWeek[0],
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime
        });
        toast.success('Schedule updated successfully');
      } else {
        const promises = scheduleForm.daysOfWeek.map(day => 
          addSchedule({
            teacherId: selectedTeacherId,
            subjectId: finalSubjectId,
            sectionId: scheduleForm.sectionId,
            dayOfWeek: day,
            startTime: scheduleForm.startTime,
            endTime: scheduleForm.endTime,
            academicYear: syName,
            status: 'draft'
          })
        );
        await Promise.all(promises);
        toast.success(`Schedule added for ${scheduleForm.daysOfWeek.length} day(s)`);
      }
      resetForm();
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError('Failed to save schedule. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
      if (editingScheduleId === id) resetForm();
      toast.success('Schedule removed successfully');
    } catch (err) {
      console.error('Error deleting schedule:', err);
      toast.error('Failed to delete schedule');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header Navigation */}
      <header className="px-6 sm:px-8 py-4.5 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shrink-0 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#D8232A] shadow-xs shrink-0">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  Faculty Teaching Load
                </h1>
                <Badge variant="outline" className="rounded-full bg-red-50 text-[#D8232A] border-red-200 font-bold text-xs px-2.5 py-0.5">
                  S.Y. {syName}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Manage faculty teaching assignments, class timetables, and conflict-free weekly schedules.
              </p>
            </div>
          </div>
        
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handleAutoGenerateSchedules}
              disabled={isGenerating}
              variant="outline"
              className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs shadow-xs transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{isGenerating ? 'Generating...' : 'Auto-Generate'}</span>
            </Button>

            {(() => {
              const hasGlobalDrafts = schedules.some(s => s.academicYear === syName && (!s.status || s.status === 'draft'));
              return (
                <Button
                  disabled={!hasGlobalDrafts}
                  onClick={() => {
                    if (hasGlobalDrafts) handlePublishAllDrafts();
                  }}
                  className={`h-10 px-4 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-2 ${
                    hasGlobalDrafts 
                      ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Publish All Drafts</span>
                </Button>
              );
            })()}

            <Button
              onClick={handleDownloadAllPDF}
              variant="outline"
              className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs shadow-xs transition-all flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export PDF</span>
            </Button>

            <Button
              onClick={handleResetAllSchedules}
              variant="ghost"
              className="h-10 px-3 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
        
        {/* KPI Stats Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Teachers</p>
              <p className="text-2xl font-black text-slate-900">{users.filter(u => u.role?.toLowerCase() === 'teacher').length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">With Teaching Load</p>
              <p className="text-2xl font-black text-emerald-600">
                {users.filter(u => u.role?.toLowerCase() === 'teacher' && schedules.some(s => s.teacherId === u.id && s.academicYear === syName)).length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Classes</p>
              <p className="text-2xl font-black text-[#D8232A]">
                {schedules.filter(s => s.academicYear === syName).length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Sections</p>
              <p className="text-2xl font-black text-slate-900">{sections.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* View Mode Tabs (Teachers vs Section Master Schedules) */}
        <Tabs defaultValue="teachers" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <div className="flex items-center justify-between gap-4">
            <TabsList className="bg-slate-200/60 p-1.5 rounded-2xl inline-flex h-11 items-center shrink-0 border border-slate-300/40">
              <TabsTrigger value="teachers" className="rounded-xl px-5 h-8 data-[state=active]:bg-white data-[state=active]:text-[#D8232A] data-[state=active]:shadow-xs font-bold text-xs transition-all">
                Faculty Loading ({users.filter(u => u.role?.toLowerCase() === 'teacher').length})
              </TabsTrigger>
              <TabsTrigger value="sections" className="rounded-xl px-5 h-8 data-[state=active]:bg-white data-[state=active]:text-[#D8232A] data-[state=active]:shadow-xs font-bold text-xs transition-all">
                Section Timetables ({sections.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TEACHERS VIEW */}
          <TabsContent value="teachers" className="space-y-6 outline-none">
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              {/* Controls Bar (Identical to UsersView) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50/50 border-b border-slate-200/70">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by teacher name or email..."
                      className="pl-9 h-10 rounded-xl bg-white border-slate-200/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all"
                      value={teacherSearch}
                      onChange={(e) => setTeacherSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={teacherFilter} onValueChange={(v: any) => setTeacherFilter(v)}>
                      <SelectTrigger className="w-full sm:w-[170px] h-10 rounded-xl border-slate-200/80 bg-white text-xs font-semibold text-slate-700">
                        <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
                        <SelectValue placeholder="Teaching Load" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teachers</SelectItem>
                        <SelectItem value="with-load">With Teaching Load</SelectItem>
                        <SelectItem value="no-load">No Teaching Load</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50">
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                    {teachers.length} teacher(s)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] select-none">
                    <tr>
                      <th 
                        onClick={() => handleSort('name')} 
                        className="px-6 py-4 cursor-pointer hover:bg-slate-100/70 transition-colors group/th"
                        title="Click to sort by faculty name"
                      >
                        <div className="flex items-center gap-1.5 text-slate-700 group-hover/th:text-[#D8232A] transition-colors">
                          <span>Faculty Member</span>
                          {sortField === 'name' ? (
                            sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#D8232A]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#D8232A]" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/th:text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('email')} 
                        className="px-6 py-4 hidden sm:table-cell cursor-pointer hover:bg-slate-100/70 transition-colors group/th"
                        title="Click to sort by email"
                      >
                        <div className="flex items-center gap-1.5 text-slate-700 group-hover/th:text-[#D8232A] transition-colors">
                          <span>Email / Contact</span>
                          {sortField === 'email' ? (
                            sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#D8232A]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#D8232A]" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/th:text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('advisory')} 
                        className="px-6 py-4 hidden md:table-cell cursor-pointer hover:bg-slate-100/70 transition-colors group/th"
                        title="Click to sort by advisory class"
                      >
                        <div className="flex items-center gap-1.5 text-slate-700 group-hover/th:text-[#D8232A] transition-colors">
                          <span>Advisory Class</span>
                          {sortField === 'advisory' ? (
                            sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#D8232A]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#D8232A]" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/th:text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('load')} 
                        className="px-6 py-4 text-center cursor-pointer hover:bg-slate-100/70 transition-colors group/th"
                        title="Click to sort by teaching load"
                      >
                        <div className="flex items-center justify-center gap-1.5 text-slate-700 group-hover/th:text-[#D8232A] transition-colors">
                          <span>Assigned Load</span>
                          {sortField === 'load' ? (
                            sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#D8232A]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#D8232A]" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover/th:text-slate-400 opacity-0 group-hover/th:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-4 text-right text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {paginatedTeachers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                          No teachers match your search or filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedTeachers.map(teacher => {
                        const tSchedules = schedules.filter(s => s.teacherId === teacher.id && s.academicYear === syName);
                        const loadCount = tSchedules.length;
                        const hasDrafts = tSchedules.some(s => !s.status || s.status === 'draft');
                        
                        // Calculate total hours
                        const totalMins = tSchedules.reduce((acc, s) => {
                          return acc + Math.max(0, timeToMinutes(s.endTime) - timeToMinutes(s.startTime));
                        }, 0);
                        const totalHrs = (totalMins / 60).toFixed(1);

                        // Find advisory section
                        const advisoryAssignment = assignments.find(a => a.teacherId === teacher.id);
                        const advisorySection = advisoryAssignment ? sections.find(s => s.id === advisoryAssignment.sectionId) : null;

                        return (
                          <tr key={teacher.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#D8232A] border border-red-100 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                                  {teacher.firstName?.[0] || ''}{teacher.lastName?.[0] || ''}
                                </div>
                                <div className="text-left min-w-0">
                                  <p className="font-bold text-slate-900 group-hover:text-[#D8232A] transition-colors flex items-center gap-2 truncate">
                                    {teacher.firstName} {teacher.lastName}
                                    {hasDrafts && (
                                      <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Draft</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-400 font-medium">
                                    {teacher.assignedGrade ? formatGradeLevel(teacher.assignedGrade) : 'General Faculty'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 hidden sm:table-cell">
                              <p className="text-xs font-semibold text-slate-700">{teacher.email}</p>
                              <p className="text-[11px] text-slate-400">{teacher.contactNumber || 'No contact provided'}</p>
                            </td>
                            <td className="px-6 py-4 hidden md:table-cell">
                              {advisorySection ? (
                                <Badge variant="outline" className="rounded-lg bg-slate-50 text-slate-700 border-slate-200 font-bold text-xs px-2.5 py-1">
                                  {getCleanSectionDisplay(advisorySection)}
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-400 italic">None</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <Badge 
                                  variant="outline" 
                                  className={`rounded-full px-3 py-1 font-bold text-xs border ${
                                    loadCount > 0 
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                      : "bg-slate-50 text-slate-400 border-slate-200"
                                  }`}
                                >
                                  {loadCount} Class{loadCount !== 1 ? 'es' : ''} • {totalHrs} hrs/wk
                                </Badge>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button 
                                onClick={() => openManageModal(teacher.id)}
                                className="rounded-xl px-4 bg-[#D8232A] text-white hover:bg-red-700 font-bold text-xs h-9 shadow-xs transition-all active:scale-98"
                              >
                                <CalendarClock className="w-3.5 h-3.5 mr-1.5" />
                                Manage Load
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {teachers.length > 0 && (
                <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50">
                  <span className="text-xs text-slate-500 font-semibold">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, teachers.length)} of {teachers.length} teachers
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-lg text-slate-600"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-bold text-slate-700 min-w-[3rem] text-center">
                      {currentPage} / {totalPages}
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-lg text-slate-600"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* SECTION MASTER SCHEDULES VIEW */}
          <TabsContent value="sections" className="space-y-6 outline-none pb-8">
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              {/* Controls Bar (Identical to UsersView) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50/50 border-b border-slate-200/70">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by section name or room..."
                      className="pl-9 h-10 rounded-xl bg-white border-slate-200/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all"
                      value={sectionSearch}
                      onChange={(e) => setSectionSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={sectionFilter} onValueChange={setSectionFilter}>
                      <SelectTrigger className="w-full sm:w-[170px] h-10 rounded-xl border-slate-200/80 bg-white text-xs font-semibold text-slate-700">
                        <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
                        <SelectValue placeholder="Grade Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Grade Levels (1-6)</SelectItem>
                        {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50">
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                    {sections.filter(s => {
                      const num = parseInt((s.gradeLevel || '').toString().replace(/[^0-9]/g, ''), 10);
                      return num >= 1 && num <= 6;
                    }).length} section(s) (Grades 1-6)
                  </span>
                </div>
              </div>
            </div>
            {(() => {
              // Strictly filter to Grade 1 to Grade 6 only
              const grade1to6Sections = sections.filter(s => {
                const num = parseInt((s.gradeLevel || '').toString().replace(/[^0-9]/g, ''), 10);
                return num >= 1 && num <= 6;
              });

              let filteredSections = grade1to6Sections;
              if (sectionFilter !== 'all') {
                filteredSections = filteredSections.filter(s => formatGradeLevel(s.gradeLevel) === sectionFilter);
              }
              if (sectionSearch) {
                const q = sectionSearch.toLowerCase();
                filteredSections = filteredSections.filter(s => 
                  (s.name || '').toLowerCase().includes(q) || 
                  (s.gradeLevel || '').toLowerCase().includes(q)
                );
              }

              const groupedSectionsForView = filteredSections.reduce((acc, section) => {
                const gl = formatGradeLevel(section.gradeLevel);
                if (!acc[gl]) acc[gl] = [];
                acc[gl].push(section);
                return acc;
              }, {} as Record<string, typeof sections>);
              
              const sortedGrades = Object.keys(groupedSectionsForView).sort((a, b) => {
                const numA = parseInt(a.replace(/[^0-9]/g, '')) || 0;
                const numB = parseInt(b.replace(/[^0-9]/g, '')) || 0;
                return numA - numB;
              });

              if (sortedGrades.length === 0) {
                return (
                  <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl shadow-xs">
                    <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No Grade 1-6 sections available.</p>
                  </div>
                );
              }

              return sortedGrades.map(grade => (
                <section key={grade} className="space-y-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-4.5 rounded-full bg-[#D8232A]" />
                    <h3 className="font-extrabold text-slate-900 text-base">{grade}</h3>
                    <div className="h-px bg-slate-200 flex-1 ml-2" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {groupedSectionsForView[grade].map(section => {
                      const sectionSchedules = schedules.filter(s => s.sectionId === section.id && s.academicYear === syName);
                      const classroom = classrooms.find(c => c.id === section.classroomId);
                      
                      return (
                        <div 
                          key={section.id}
                          onClick={() => {
                            setSelectedSectionScheduleId(section.id);
                            setIsSectionModalOpen(true);
                          }}
                          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-[#D8232A]/40 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-slate-900 group-hover:text-[#D8232A] transition-colors text-base">
                                {getCleanSectionDisplay(section)}
                              </h4>
                              <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 font-bold text-xs border ${sectionSchedules.length > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                                {sectionSchedules.length} Class{sectionSchedules.length !== 1 ? 'es' : ''}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                              Room: {classroom?.roomName || 'Unassigned room'}
                            </p>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#D8232A]">
                            <span>View Timetable</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
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

      {/* SECTION TIMETABLE MODAL */}
      <Dialog open={isSectionModalOpen} onOpenChange={setIsSectionModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-3xl border-0 shadow-2xl">
          <DialogHeader className="px-6 py-4.5 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#D8232A] border border-red-100 flex items-center justify-center font-bold">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-900">
                  Section Master Timetable
                </DialogTitle>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {(() => {
                    const sec = sections.find(s => s.id === selectedSectionScheduleId);
                    return sec ? `${formatGradeLevel(sec.gradeLevel)} - ${sec.name}` : 'Unknown Section';
                  })()} • Academic Year {syName}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-0 bg-white flex flex-col relative min-h-[500px]">
            {(() => {
              const secSchedules = schedules.filter(s => s.sectionId === selectedSectionScheduleId && s.academicYear === syName);
              if (secSchedules.length === 0) {
                return (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center py-12 px-8 bg-slate-50 border border-dashed border-slate-200 rounded-3xl w-full max-w-md">
                      <p className="text-sm font-semibold text-slate-500">No classes scheduled for this section yet.</p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="flex-1 flex flex-col overflow-hidden relative">
                  {/* Day Headers (X-Axis) */}
                  <div className="flex border-b border-slate-200 bg-slate-100/80 sticky top-0 z-20 shadow-xs shrink-0">
                    <div className="w-16 shrink-0 border-r border-slate-200 text-center py-2 text-[10px] font-bold text-slate-400 uppercase">Time</div>
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="flex-1 py-2.5 text-center border-r last:border-r-0 border-slate-200">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{day}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Scrollable Grid Body */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50/40">
                    {/* Time Labels (Y-Axis) */}
                    <div className="w-16 shrink-0 border-r border-slate-200 bg-white sticky left-0 z-10 float-left h-[880px]">
                      {CALENDAR_HOURS.map(hour => (
                        <div key={hour} className="h-[80px] relative flex items-start justify-end pr-2 pt-1 border-b border-slate-100 box-border">
                          <span className="text-[10px] font-bold text-slate-400 leading-none">
                            {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Grid Lines Background */}
                    <div 
                      className="absolute left-16 right-0 top-0 h-[880px] bg-[length:100%_80px]" 
                      style={{ backgroundImage: 'linear-gradient(to bottom, transparent 79px, #e2e8f0 80px)' }}
                    >
                      <div className="absolute inset-0 flex h-full">
                        {DAYS_OF_WEEK.map(day => (
                          <div key={day} className="flex-1 relative border-r last:border-r-0 border-slate-200/60">
                            {secSchedules.filter(s => s.dayOfWeek === day).map(schedule => {
                              const subject = subjects.find(s => s.id === schedule.subjectId);
                              const teacher = users.find(u => u.id === schedule.teacherId);
                              const palette = getSubjectPalette(subject?.name);
                              
                              const startMins = timeToMinutes(schedule.startTime);
                              const endMins = timeToMinutes(schedule.endTime);
                              const top = Math.max(0, startMins - CALENDAR_START_MINS) * PIXELS_PER_MINUTE;
                              const height = Math.max(0, endMins - startMins) * PIXELS_PER_MINUTE;
                              
                              return (
                                <div
                                  key={schedule.id}
                                  className={`absolute left-1 right-1 rounded-xl border p-2 flex flex-col overflow-hidden shadow-2xs z-10 ${palette.cardBg} ${palette.border} ${palette.borderL} border-l-4`}
                                  style={{ top: `${top}px`, height: `${height}px` }}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-800">
                                      {formatTime12(schedule.startTime)} - {formatTime12(schedule.endTime)}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold leading-tight mt-1 truncate text-slate-900">
                                    {subject?.name || 'Unknown Subject'}
                                  </p>
                                  <p className="text-[11px] font-semibold truncate text-slate-600 mt-0.5">
                                    {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned Teacher'}
                                  </p>
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
          
          <DialogFooter className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
            <Button variant="outline" className="rounded-xl px-5 font-bold text-xs" onClick={() => setIsSectionModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MANAGE TEACHER'S LOAD STUDIO MODAL */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          setSelectedTeacherId(null);
          resetForm();
          setSubjectDropdownSearch('');
          setSectionDropdownSearch('');
        }
      }}>
        <DialogContent className="w-[96vw] max-w-[1240px] h-[92vh] max-h-[860px] overflow-hidden flex flex-col p-0 border-0 rounded-3xl shadow-2xl bg-white">
          
          {/* Top Modal Navigation Header */}
          <DialogHeader className="px-6 py-4.5 border-b border-slate-200 bg-slate-50/90 shrink-0 flex flex-row items-center justify-between pr-14">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#D8232A] text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                {selectedTeacher?.firstName?.[0]}{selectedTeacher?.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 leading-tight truncate">
                  {selectedTeacher?.firstName} {selectedTeacher?.lastName}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 font-medium">
                  <span className="truncate">{selectedTeacher?.email}</span>
                  <span>•</span>
                  <span className="font-bold text-slate-700 whitespace-nowrap">S.Y. {syName}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="h-8 px-3 rounded-xl bg-white text-slate-700 border-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 text-[#D8232A]" />
                <span>{teacherSchedules.length} Classes • {teacherTotalHours} hrs/wk</span>
              </Badge>
            </div>
          </DialogHeader>

          {/* Body Container (Calendar Timetable + Slide-out Drawer) */}
          <div className="flex-1 overflow-hidden relative bg-slate-50/50 flex">
            
            {/* Main Interactive Calendar Area */}
            <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
              
              {/* Calendar Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3 border-b border-slate-200 bg-white shrink-0">
                <div className="flex items-center gap-2 shrink-0">
                  <Calendar className="w-4 h-4 text-[#D8232A]" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Weekly Schedule Timetable</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 justify-end">
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
                          toast.success("Draft schedules published.");
                        }}
                        className={`h-8 text-xs font-bold rounded-xl px-3.5 shadow-xs transition-all whitespace-nowrap ${
                          hasDrafts 
                            ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Publish Drafts
                      </Button>
                    );
                  })()}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadTeacherPDF}
                    className="h-8 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl px-3 border-slate-200 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Load Slip PDF
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResetTeacherSchedules}
                    className="h-8 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl px-3 border-rose-200 whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Reset
                  </Button>

                  <Button 
                    size="sm" 
                    onClick={() => {
                      resetForm();
                      setIsFormOpen(true);
                    }} 
                    className="h-8 text-xs font-bold gap-1.5 shrink-0 bg-[#D8232A] hover:bg-red-700 text-white rounded-xl px-4 shadow-xs whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Schedule
                  </Button>
                </div>
              </div>

              {/* Day Headers (X-Axis) */}
              <div className="flex border-b border-slate-200 bg-slate-100 sticky top-0 z-20 shadow-xs shrink-0">
                <div className="w-16 shrink-0 border-r border-slate-200 text-center py-2 text-[10px] font-bold text-slate-400 uppercase">Time</div>
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="flex-1 py-2.5 text-center border-r last:border-r-0 border-slate-200">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{day}</span>
                  </div>
                ))}
              </div>

              {/* Scrollable Calendar Body */}
              <div 
                ref={calendarBodyRef}
                className={`flex-1 overflow-y-auto custom-scrollbar relative bg-slate-50/50 ${dragState ? 'select-none' : ''}`}
              >
                {/* Time Labels (Y-Axis) */}
                <div className="w-16 shrink-0 border-r border-slate-200 bg-white sticky left-0 z-10 float-left h-[810px]">
                  {CALENDAR_HOURS.map(hour => (
                    <div key={hour} className="h-[90px] relative flex items-start justify-end pr-2 pt-1.5 border-b border-slate-100 box-border">
                      <span className="text-[10px] font-bold text-slate-400 leading-none">
                        {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Grid Lines Background */}
                <div 
                  className="absolute left-16 right-0 top-0 h-[810px] bg-[length:100%_90px]" 
                  style={{ backgroundImage: 'linear-gradient(to bottom, transparent 44px, #f1f5f9 45px, transparent 46px, transparent 89px, #e2e8f0 90px)' }}
                >
                  <div className="absolute inset-0 flex h-full">
                    {DAYS_OF_WEEK.map((day, dayIndex) => (
                      <div key={day} className="flex-1 relative border-r last:border-r-0 border-slate-200/60">
                        
                        {/* Interactive Clickable 30-minute Zones (:00 and :30) */}
                        {CALENDAR_HOURS.map(hour => (
                          <React.Fragment key={hour}>
                            {/* :00 slot (top 45px) */}
                            <div
                              onClick={() => handleQuickSlotClick(day, hour, 0)}
                              className="absolute left-0 right-0 h-[45px] hover:bg-red-500/5 transition-colors cursor-pointer group/cell00"
                              style={{ top: `${(hour - 7) * 90}px` }}
                              title={`Click to schedule class on ${day} at ${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`}
                            >
                              <span className="opacity-0 group-hover/cell00:opacity-100 text-[9.5px] font-bold text-red-500 bg-white px-2 py-0.5 rounded-full border border-red-200 absolute top-1.5 left-2 shadow-xs transition-opacity pointer-events-none whitespace-nowrap z-10">
                                + Add at {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
                              </span>
                            </div>

                            {/* :30 slot (bottom 45px) */}
                            <div
                              onClick={() => handleQuickSlotClick(day, hour, 30)}
                              className="absolute left-0 right-0 h-[45px] hover:bg-red-500/5 transition-colors cursor-pointer group/cell30"
                              style={{ top: `${(hour - 7) * 90 + 45}px` }}
                              title={`Click to schedule class on ${day} at ${hour > 12 ? hour - 12 : hour}:30 ${hour >= 12 ? 'PM' : 'AM'}`}
                            >
                              <span className="opacity-0 group-hover/cell30:opacity-100 text-[9.5px] font-bold text-red-500 bg-white px-2 py-0.5 rounded-full border border-red-200 absolute top-1.5 left-2 shadow-xs transition-opacity pointer-events-none whitespace-nowrap z-10">
                                + Add at {hour > 12 ? hour - 12 : hour}:30 {hour >= 12 ? 'PM' : 'AM'}
                              </span>
                            </div>
                          </React.Fragment>
                        ))}

                        {/* Drag-to-Move Ghost Overlay with Dynamic Red Conflict Highlighting */}
                        {dragState?.mode === 'move' && dragState.currentDay === day && (() => {
                          const movingStartStr = minutesToTime(dragState.currentStartMins);
                          const movingEndStr = minutesToTime(dragState.currentEndMins);
                          const targetSubj = subjects.find(sb => sb.id === dragState.schedule.subjectId);
                          const targetCanonical = getCanonicalSubjectName(targetSubj?.name || '');

                          // Check 1: Teacher Overlap or Section Overlap
                          const conflictingSchedule = schedules.find(s => {
                            if (s.id === dragState.scheduleId || s.dayOfWeek !== day || s.academicYear !== syName) {
                              return false;
                            }
                            const overlap = isOverlapping(movingStartStr, movingEndStr, s.startTime, s.endTime);
                            if (!overlap) return false;

                            // Same teacher busy
                            if (s.teacherId === dragState.schedule.teacherId) return true;
                            // Same section busy with any teacher
                            if (dragState.schedule.sectionId && s.sectionId === dragState.schedule.sectionId) return true;

                            return false;
                          });

                          // Check 2: Same section already has this subject on this day
                          const dupeSchedule = !conflictingSchedule && dragState.schedule.sectionId ? schedules.find(s => {
                            if (s.id === dragState.scheduleId || s.sectionId !== dragState.schedule.sectionId || s.dayOfWeek !== day || s.academicYear !== syName) {
                              return false;
                            }
                            const sSubj = subjects.find(sb => sb.id === s.subjectId);
                            return sSubj && getCanonicalSubjectName(sSubj.name) === targetCanonical;
                          }) : null;

                          const conflictObj = conflictingSchedule || dupeSchedule;
                          const hasDragConflict = !!conflictObj;
                          const conflictingSubject = conflictObj ? subjects.find(sub => sub.id === conflictObj.subjectId) : null;
                          const conflictingSec = conflictObj ? sections.find(sec => sec.id === conflictObj.sectionId) : null;
                          const conflictingTeacher = conflictObj ? users.find(u => u.id === conflictObj.teacherId) : null;
                          const conflictTeacherName = conflictingTeacher ? `${conflictingTeacher.firstName} ${conflictingTeacher.lastName}` : 'Teacher';

                          return (
                            <div 
                              className={`absolute left-1 right-1 rounded-xl border-2 flex flex-col justify-between p-2 pointer-events-none z-50 transition-all duration-100 ${
                                hasDragConflict 
                                  ? 'bg-[#D8232A] text-white border-red-900 ring-4 ring-red-300 shadow-2xl animate-pulse' 
                                  : 'bg-emerald-600 text-white border-emerald-800 ring-2 ring-emerald-300 shadow-xl'
                              }`}
                              style={{ 
                                top: `${(dragState.currentStartMins - CALENDAR_START_MINS) * PIXELS_PER_MINUTE}px`, 
                                height: `${(dragState.currentEndMins - dragState.currentStartMins) * PIXELS_PER_MINUTE}px` 
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded shadow-2xs ${
                                  hasDragConflict ? 'bg-red-950/70 text-white' : 'bg-emerald-950/60 text-white'
                                }`}>
                                  {hasDragConflict ? '⚠️' : '📍'} {formatTime12(movingStartStr)} - {formatTime12(movingEndStr)}
                                </span>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                  hasDragConflict ? 'bg-white text-[#D8232A] font-extrabold shadow-2xs' : 'bg-white text-emerald-800'
                                }`}>
                                  {hasDragConflict ? 'Conflict!' : 'Available'}
                                </span>
                              </div>

                              <div className="my-auto">
                                <p className="text-xs font-black truncate leading-tight text-white">
                                  {getCanonicalSubjectName(targetSubj?.name || 'Class')}
                                </p>
                                {hasDragConflict && (
                                  <p className="text-[10px] font-bold text-red-100 truncate mt-0.5 leading-none">
                                    Occupied by: {conflictingSubject?.name || 'Subject'} ({conflictTeacherName})
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Horizontal Expand Ghost Copies (Fill to Monday-Friday) */}
                        {dragState?.mode === 'expand-h' && (() => {
                          const minIdx = Math.min(dragState.startDayIdx, dragState.currentDayIdx);
                          const maxIdx = Math.max(dragState.startDayIdx, dragState.currentDayIdx);
                          const isTargetDay = dayIndex >= minIdx && dayIndex <= maxIdx && day !== dragState.schedule.dayOfWeek;
                          if (!isTargetDay) return null;

                          const startMins = timeToMinutes(dragState.startTime);
                          const endMins = timeToMinutes(dragState.endTime);
                          const top = (startMins - CALENDAR_START_MINS) * PIXELS_PER_MINUTE;
                          const height = (endMins - startMins) * PIXELS_PER_MINUTE;

                          return (
                            <div 
                              className="absolute left-1 right-1 rounded-xl border-2 border-dashed border-emerald-500 bg-emerald-50/90 shadow-md flex flex-col justify-between p-2 pointer-events-none z-40 animate-pulse"
                              style={{ top: `${top}px`, height: `${height}px` }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[9.5px] font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded">
                                  ✨ Copy to {day}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-emerald-900 truncate my-auto">
                                {getCanonicalSubjectName(subjects.find(s => s.id === dragState.schedule.subjectId)?.name || '')}
                              </p>
                            </div>
                          );
                        })()}

                        {/* Ghost Block Preview (ONLY shown when Form Drawer is Open!) */}
                        {(() => {
                          if (!isFormOpen) return null;
                          if (editingScheduleId) return null;
                          if (!scheduleForm.daysOfWeek.includes(day)) return null;
                          if (!scheduleForm.startTime || !scheduleForm.endTime) return null;
                          
                          const startMins = timeToMinutes(scheduleForm.startTime);
                          const endMins = timeToMinutes(scheduleForm.endTime);
                          if (startMins >= endMins || startMins < CALENDAR_START_MINS) return null;
                          
                          const isThisDayConflicted = conflictAnalysis.hasConflict && (!conflictAnalysis.conflictingDay || conflictAnalysis.conflictingDay === day);
                          
                          const top = (startMins - CALENDAR_START_MINS) * PIXELS_PER_MINUTE;
                          const height = (endMins - startMins) * PIXELS_PER_MINUTE;
                          
                          return (
                            <div 
                              className={`absolute left-1 right-1 rounded-2xl border-2 border-dashed flex flex-col p-2 overflow-hidden z-20 pointer-events-none transition-all duration-200 ${
                                isThisDayConflicted 
                                  ? 'bg-rose-100/95 border-rose-500 shadow-md ring-2 ring-rose-300' 
                                  : 'bg-emerald-100/80 border-emerald-500 shadow-md'
                              }`}
                              style={{ top: `${top}px`, height: `${height}px` }}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-black ${isThisDayConflicted ? 'text-rose-800' : 'text-emerald-800'}`}>
                                  {formatTime12(scheduleForm.startTime)} - {formatTime12(scheduleForm.endTime)}
                                </span>
                                {isThisDayConflicted ? (
                                  <span className="bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Conflict!
                                  </span>
                                ) : (
                                  <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Available
                                  </span>
                                )}
                              </div>

                              {isThisDayConflicted ? (
                                <div className="mt-1 space-y-0.5">
                                  <p className="text-[11px] font-black text-rose-900 truncate leading-tight">
                                    ⚠️ {conflictAnalysis.conflictingSubjectName || 'Conflicting Subject'}
                                  </p>
                                  {conflictAnalysis.conflictingTeacherName && (
                                    <p className="text-[10px] font-bold text-rose-800 truncate">
                                      Teacher: {conflictAnalysis.conflictingTeacherName}
                                    </p>
                                  )}
                                  {conflictAnalysis.conflictingSectionName && (
                                    <p className="text-[9px] font-semibold text-rose-700 truncate">
                                      {conflictAnalysis.conflictingSectionName}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <p className="text-xs font-bold mt-1 truncate text-emerald-900">
                                    {selectedSubjectName || 'New Class'}
                                  </p>
                                  {scheduleForm.sectionId && (
                                    <p className="text-[11px] font-semibold truncate text-emerald-700">
                                      {sections.find(s => s.id === scheduleForm.sectionId)?.name}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })()}

                        {/* Actual Assigned Schedule Blocks */}
                        {teacherSchedules.filter(s => s.dayOfWeek === day).map(schedule => {
                          const subject = subjects.find(s => s.id === schedule.subjectId);
                          const section = sections.find(s => s.id === schedule.sectionId);
                          const classroom = classrooms.find(c => c.id === section?.classroomId);
                          const isEditing = editingScheduleId === schedule.id;
                          const isBeingDragged = dragState?.mode === 'move' && dragState.scheduleId === schedule.id;
                          const isBeingResized = dragState?.mode === 'resize-v' && dragState.scheduleId === schedule.id;

                          // Check if this schedule block has a conflict (permanent red styling even if not hovered or selected)
                          const isConflicted = schedules.some(s => {
                            if (s.id === schedule.id || s.dayOfWeek !== day || s.academicYear !== syName) {
                              return false;
                            }
                            const overlap = isOverlapping(schedule.startTime, schedule.endTime, s.startTime, s.endTime);
                            if (!overlap) return false;

                            if (s.teacherId === schedule.teacherId) return true;
                            if (schedule.sectionId && s.sectionId === schedule.sectionId) return true;

                            return false;
                          });

                          // Check if this card is collided by the moving drag preview
                          const isCollidedByDrag = dragState?.mode === 'move' && 
                            dragState.currentDay === day && 
                            schedule.id !== dragState.scheduleId &&
                            isOverlapping(minutesToTime(dragState.currentStartMins), minutesToTime(dragState.currentEndMins), schedule.startTime, schedule.endTime);
                          
                          const startMins = timeToMinutes(schedule.startTime);
                          const currentEndMins = isBeingResized ? dragState.currentEndMins : timeToMinutes(schedule.endTime);
                          const top = Math.max(0, startMins - CALENDAR_START_MINS) * PIXELS_PER_MINUTE;
                          const height = Math.max(0, currentEndMins - startMins) * PIXELS_PER_MINUTE;
                          
                          return (
                            <div
                              key={schedule.id}
                              onPointerDown={(e) => startMoveDrag(e, schedule)}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(schedule);
                              }}
                              className={`absolute left-1 right-1 rounded-xl border p-2 flex flex-col justify-between overflow-hidden group transition-all duration-150 cursor-grab active:cursor-grabbing z-10 shadow-2xs hover:shadow-md hover:z-30 ${
                                isBeingDragged
                                  ? 'opacity-40 ring-2 ring-slate-400'
                                  : isCollidedByDrag
                                  ? 'bg-rose-100 border-rose-600 ring-2 ring-rose-400 shadow-md'
                                  : isConflicted
                                  ? 'bg-rose-50/95 border-rose-400 text-rose-950 ring-1 ring-rose-300 shadow-xs'
                                  : isBeingResized
                                  ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400 shadow-lg z-40'
                                  : isEditing 
                                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/80 shadow-md' 
                                  : 'bg-white border-slate-200/90 hover:border-slate-300'
                              }`}
                              style={{ top: `${top}px`, height: `${height}px` }}
                              title={isConflicted ? "⚠️ Scheduling Conflict Detected on this class slot" : "Click to edit, drag to move, drag bottom handle to resize, or drag right handle to copy across days"}
                            >
                              {/* Horizontal Expand Handle on the Right (Copy to Mon-Fri) */}
                              <div 
                                onPointerDown={(e) => startHorizontalExpand(e, schedule)}
                                className="w-3.5 absolute right-0 top-0 bottom-0 cursor-ew-resize hover:bg-red-500/10 flex items-center justify-center group/hhandle z-30 transition-colors"
                                title="↔️ Drag right across columns to fill schedule from Monday to Friday"
                              >
                                <div className="w-1 h-7 bg-slate-200 group-hover/hhandle:bg-[#D8232A] rounded-full transition-colors" />
                              </div>

                              <div className="flex items-center justify-between gap-1 pr-3">
                                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded leading-none whitespace-nowrap ${
                                  isConflicted 
                                    ? 'text-rose-800 bg-rose-100 border border-rose-200 font-extrabold' 
                                    : 'text-slate-700 bg-slate-100/90'
                                }`}>
                                  {isConflicted && <span className="mr-0.5 text-rose-600">⚠️</span>}
                                  {formatTime12(schedule.startTime)} - {formatTime12(isBeingResized ? minutesToTime(dragState.currentEndMins) : schedule.endTime)}
                                </span>
                                
                                {/* Always-Visible Action Buttons */}
                                <div className="flex items-center gap-1 shrink-0 z-20">
                                  <button 
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      handleEditClick(schedule); 
                                    }} 
                                    className="p-1 rounded-md text-slate-600 hover:text-[#D8232A] hover:bg-red-50 bg-slate-50 border border-slate-200 transition-colors shadow-2xs"
                                    title="Edit Schedule Slot"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      handleDelete(schedule.id); 
                                    }} 
                                    className="p-1 rounded-md text-slate-600 hover:text-rose-600 hover:bg-rose-50 bg-slate-50 border border-slate-200 transition-colors shadow-2xs"
                                    title="Delete Schedule Slot"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              <div className="my-auto pr-3">
                                <p className={`text-xs font-black leading-snug truncate ${isConflicted ? 'text-rose-950' : 'text-slate-900'}`}>
                                  {getCanonicalSubjectName(subject?.name || 'Unknown Subject')}
                                </p>
                                
                                <p className={`text-[10px] font-semibold truncate mt-0.5 ${isConflicted ? 'text-rose-700 font-bold' : 'text-slate-500'}`}>
                                  {getCleanSectionDisplay(section)} {isConflicted ? '• Conflict' : ''}
                                </p>
                              </div>

                              {/* Vertical Resize Handle at the Bottom */}
                              <div 
                                onPointerDown={(e) => startVerticalResize(e, schedule)}
                                className="h-2.5 -mx-2 -mb-2 mt-1 cursor-ns-resize hover:bg-slate-200/80 rounded-b-xl flex items-center justify-center group/vhandle z-30 transition-colors"
                                title="↕️ Drag down to increase duration, or up to shorten"
                              >
                                <div className="w-10 h-1 bg-slate-300 group-hover/vhandle:bg-[#D8232A] rounded-full transition-colors" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Slide-out Form Panel (Create / Edit Schedule Drawer) */}
            <div 
              className={`w-[380px] sm:w-[420px] bg-white border-l border-slate-200 shadow-2xl transition-all duration-300 z-40 flex flex-col ${
                isFormOpen ? 'translate-x-0' : 'translate-x-full hidden'
              }`}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-50 text-[#D8232A] flex items-center justify-center font-bold">
                    {editingScheduleId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {editingScheduleId ? 'Edit Schedule Slot' : 'Create Teaching Schedule'}
                  </h3>
                </div>
                <Button variant="ghost" size="icon" onClick={resetForm} className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-5 custom-scrollbar">
                <form onSubmit={handleSaveSchedule} className="space-y-5">
                  
                  {/* Real-time Conflict Alert or Success Banner */}
                  {conflictAnalysis.hasConflict ? (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-900 text-xs flex flex-col gap-2.5 shadow-2xs">
                      <div className="flex items-center gap-2 text-rose-700 font-bold">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="text-xs uppercase tracking-wider font-black">Schedule Conflict Detected</span>
                      </div>
                      
                      <p className="text-[11px] font-medium text-rose-800 leading-relaxed">
                        {conflictAnalysis.message}
                      </p>

                      {(conflictAnalysis.conflictingSubjectName || conflictAnalysis.conflictingTeacherName) && (
                        <div className="mt-1 pt-2.5 border-t border-rose-200/60 grid grid-cols-1 gap-1.5 bg-white/80 p-3 rounded-xl text-[11px] shadow-2xs">
                          {conflictAnalysis.conflictingSubjectName && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500 font-semibold shrink-0">Conflicting Subject:</span>
                              <span className="font-bold text-slate-800 text-right truncate">
                                {conflictAnalysis.conflictingSubjectName} {conflictAnalysis.conflictingSubjectCode ? `(${conflictAnalysis.conflictingSubjectCode})` : ''}
                              </span>
                            </div>
                          )}
                          {conflictAnalysis.conflictingTeacherName && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500 font-semibold shrink-0">Assigned Teacher:</span>
                              <span className="font-black text-[#D8232A] text-right truncate">
                                {conflictAnalysis.conflictingTeacherName}
                              </span>
                            </div>
                          )}
                          {conflictAnalysis.conflictingSectionName && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500 font-semibold shrink-0">Section / Room:</span>
                              <span className="font-bold text-slate-800 text-right truncate">
                                {conflictAnalysis.conflictingSectionName}
                              </span>
                            </div>
                          )}
                          {conflictAnalysis.conflictingTimeSlot && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500 font-semibold shrink-0">Occupied Slot:</span>
                              <span className="font-bold text-slate-800 text-right">
                                {conflictAnalysis.conflictingTimeSlot} {conflictAnalysis.conflictingDay ? `(${conflictAnalysis.conflictingDay})` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : scheduleForm.subjectId && scheduleForm.sectionId ? (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-[11px]">Time slot is available on all selected days!</span>
                    </div>
                  ) : null}

                  {error && !conflictAnalysis.hasConflict && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* 1. Day Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Days of Week</Label>
                      {!editingScheduleId && <span className="text-[10px] text-slate-400 font-medium">(Multi-select enabled)</span>}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {DAYS_OF_WEEK.map(day => {
                        const isSelected = scheduleForm.daysOfWeek.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            disabled={!!editingScheduleId && !isSelected}
                            onClick={() => {
                              if (editingScheduleId) return;
                              setScheduleForm(prev => ({
                                ...prev,
                                daysOfWeek: isSelected
                                  ? (prev.daysOfWeek.length > 1 ? prev.daysOfWeek.filter(d => d !== day) : prev.daysOfWeek)
                                  : [...prev.daysOfWeek, day]
                              }));
                            }}
                            className={`h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                              isSelected 
                                ? 'bg-[#D8232A] text-white shadow-xs' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                    {editingScheduleId && <p className="text-[10px] text-amber-700 font-medium">Day cannot be altered while editing.</p>}
                  </div>

                  {/* 2. Start and End Time */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Start Time</Label>
                        <Input 
                          type="time" 
                          required 
                          value={scheduleForm.startTime} 
                          onChange={e => setScheduleForm({...scheduleForm, startTime: e.target.value})} 
                          className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-bold" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">End Time</Label>
                        <Input 
                          type="time" 
                          required 
                          value={scheduleForm.endTime} 
                          onChange={e => setScheduleForm({...scheduleForm, endTime: e.target.value})} 
                          className="h-10 rounded-xl bg-slate-50 border-slate-200 text-xs font-bold" 
                        />
                      </div>
                    </div>

                    {/* Quick Duration Helpers */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 mr-1">Duration:</span>
                      {[
                        { label: '45m', mins: 45 },
                        { label: '1 hr', mins: 60 },
                        { label: '1.5 hrs', mins: 90 },
                        { label: '2 hrs', mins: 120 }
                      ].map(dur => (
                        <button
                          key={dur.label}
                          type="button"
                          disabled={!scheduleForm.startTime}
                          className="h-6.5 px-2.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          onClick={() => setScheduleForm(prev => ({
                            ...prev,
                            endTime: addMinutesToTime(prev.startTime, dur.mins)
                          }))}
                        >
                          +{dur.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Subject Selector (Clean Deduplicated List) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Subject</Label>
                    <Select 
                      value={selectedSubjectName} 
                      onValueChange={v => {
                        setSelectedSubjectName(v);
                        const matchSub = subjects.find(s => s.name?.trim().toLowerCase() === v.toLowerCase());
                        if (matchSub) {
                          setScheduleForm(prev => ({ ...prev, subjectId: matchSub.id }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-10.5 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold w-full">
                        <SelectValue placeholder="Select Subject to Teach">
                          {selectedSubjectName ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800">{selectedSubjectName}</span>
                              {(() => {
                                const sub = uniqueSubjectList.find(s => s.name === selectedSubjectName);
                                return sub?.code ? <span className="text-[11px] text-slate-400 font-normal">({sub.code})</span> : null;
                              })()}
                            </div>
                          ) : null}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[260px] rounded-xl">
                        <div className="p-2 sticky -top-1 bg-white z-10 border-b border-slate-100">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input 
                              placeholder="Search subject..." 
                              className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 rounded-lg" 
                              value={subjectDropdownSearch}
                              onChange={e => setSubjectDropdownSearch(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        {uniqueSubjectList
                          .filter(s => s.name.toLowerCase().includes(subjectDropdownSearch.toLowerCase()) || (s.code && s.code.toLowerCase().includes(subjectDropdownSearch.toLowerCase())))
                          .map(s => (
                            <SelectItem key={s.name} value={s.name} className="text-xs font-medium py-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{s.name}</span>
                                {s.code && (
                                  <span className="text-[10px] text-slate-400 font-mono">({s.code})</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 4. Section / Class Selector (Grade 1 to 6 Only, Clean Display) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Section / Class</Label>
                    <Select value={scheduleForm.sectionId} onValueChange={v => setScheduleForm({...scheduleForm, sectionId: v})}>
                      <SelectTrigger className="h-10.5 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold w-full">
                        <SelectValue placeholder="Select Target Section">
                          {(() => {
                            if (!scheduleForm.sectionId) return null;
                            const selectedSec = sections.find(s => s.id === scheduleForm.sectionId);
                            return selectedSec ? getCleanSectionDisplay(selectedSec) : null;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[280px] rounded-xl">
                        <div className="p-2 sticky -top-1 bg-white z-10 border-b border-slate-100">
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input 
                              placeholder="Search section..." 
                              className="h-8 pl-8 text-xs bg-slate-50 border-slate-200 rounded-lg" 
                              value={sectionDropdownSearch}
                              onChange={e => setSectionDropdownSearch(e.target.value)}
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        {(() => {
                          const q = sectionDropdownSearch.toLowerCase();
                          // Filter to Grade 1 to 6 only
                          const grade1to6 = sections.filter(s => {
                            const num = parseInt((s.gradeLevel || '').toString().replace(/[^0-9]/g, ''), 10);
                            return num >= 1 && num <= 6;
                          });

                          const groupedSectionsForView = grade1to6
                            .filter(s => {
                              const matchName = (s.name || '').toLowerCase().includes(q);
                              const matchGrade = (s.gradeLevel || '').toLowerCase().includes(q);
                              return matchName || matchGrade;
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
                            return numA - numB;
                          });

                          if (sortedGrades.length === 0) {
                            return <div className="p-3 text-center text-xs text-slate-500 font-medium">No Grade 1-6 sections found.</div>;
                          }

                          return sortedGrades.map(grade => {
                            const sortedSections = [...groupedSectionsForView[grade]].sort((a, b) => {
                              const nameA = getCleanSectionDisplay(a);
                              const nameB = getCleanSectionDisplay(b);
                              return nameA.localeCompare(nameB);
                            });

                            return (
                              <SelectGroup key={grade}>
                                <SelectLabel className="font-black text-[#D8232A] text-xs bg-slate-100/90 py-1.5 px-3 uppercase tracking-wider sticky top-0 z-10">{grade}</SelectLabel>
                                {sortedSections.map(s => (
                                  <SelectItem key={s.id} value={s.id} className="text-xs font-semibold pl-4 py-2 hover:bg-slate-50 cursor-pointer">
                                    <span>{getCleanSectionDisplay(s)}</span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            );
                          });
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Submit Button & Delete Option */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    {editingScheduleId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDelete(editingScheduleId)}
                        className="h-11 px-3.5 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs shrink-0"
                        title="Delete this schedule slot"
                      >
                        <Trash2 className="w-4 h-4 mr-1 text-rose-600" />
                        Delete
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      disabled={conflictAnalysis.hasConflict}
                      className="flex-1 h-11 bg-[#D8232A] hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold shadow-xs transition-all text-xs"
                    >
                      {editingScheduleId ? 'Update Schedule Slot' : 'Save Schedule'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Auto-Generate Confirmation Modal */}
      <Dialog open={confirmGenerate} onOpenChange={setConfirmGenerate}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-0 shadow-2xl">
          <DialogHeader>
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 mb-2">
              <Sparkles className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-black text-slate-900">Auto-Generate Teaching Load</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
              This automated process will clear ALL existing schedules for Academic Year <span className="font-bold text-slate-800">{syName}</span> and automatically assign curriculum subjects to available teachers based on grade levels.
            </p>
          </div>
          <DialogFooter className="flex space-x-2 justify-end mt-4">
            <Button variant="outline" className="rounded-xl px-4 text-xs font-bold" onClick={() => setConfirmGenerate(false)}>Cancel</Button>
            <Button className="rounded-xl px-5 bg-[#D8232A] hover:bg-red-700 text-white font-bold text-xs shadow-xs" onClick={executeAutoGenerate}>Generate Schedules</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Schedule Confirmation Modal */}
      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-0 shadow-2xl">
          <DialogHeader>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mb-2">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-black text-slate-900">Remove Class Schedule</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Are you sure you want to remove this teaching schedule? This will delete the time slot from the teacher and section timetables.
            </p>
          </div>
          <DialogFooter className="flex space-x-2 justify-end mt-4">
            <Button variant="outline" className="rounded-xl px-4 text-xs font-bold" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
            <Button className="rounded-xl px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs" onClick={() => confirmDeleteId && executeDelete(confirmDeleteId)}>
              Remove
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
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-0 shadow-2xl">
          <DialogHeader>
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mb-2">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-black text-rose-600">
              {strictResetModal?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-xs text-slate-500 font-medium">
              This action is permanent and cannot be undone. All selected schedules will be wiped.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">
                To confirm, type <span className="font-black text-rose-600 select-none">RESET</span> below:
              </Label>
              <Input 
                value={resetConfirmationText} 
                onChange={e => setResetConfirmationText(e.target.value)} 
                placeholder="Type RESET"
                className="h-10 rounded-xl border-rose-200 focus:border-rose-500 text-xs font-bold"
              />
            </div>
          </div>
          <DialogFooter className="flex space-x-2 justify-end mt-4">
            <Button variant="outline" className="rounded-xl px-4 text-xs font-bold" onClick={() => { setStrictResetModal(null); setResetConfirmationText(''); }}>Cancel</Button>
            <Button 
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-5 font-bold text-xs shadow-xs" 
              disabled={resetConfirmationText !== 'RESET'}
              onClick={async () => {
                if (strictResetModal?.action && resetConfirmationText === 'RESET') {
                  await strictResetModal.action();
                  setStrictResetModal(null);
                  setResetConfirmationText('');
                }
              }}
            >
              Confirm Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
