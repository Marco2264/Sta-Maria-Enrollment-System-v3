import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { CalendarClock, Clock } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../lib/AuthContext';
import { useTeacherData } from '../../lib/teacherData';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Schedule } from '../../lib/adminData';
import { getCurrentSchoolYear } from '../../lib/utils';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const CALENDAR_START_MINS = 7 * 60; // 07:00
const CALENDAR_END_MINS = 17 * 60; // 17:00
const CALENDAR_HOURS = Array.from({ length: 11 }, (_, i) => i + 7); // 7 to 17
const PIXELS_PER_MINUTE = 80 / 60; // 80px per hour

export function MyScheduleView() {
  const { user } = useAuth();
  const { assignedSections } = useTeacherData();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const syName = getCurrentSchoolYear(); // we can also fetch active school year if needed

  useEffect(() => {
    if (!user) return;

    // Fetch Subjects and Sections for mapping names
    const fetchReferences = async () => {
      try {
        const [subSnap, secSnap] = await Promise.all([
          getDocs(collection(db, 'subjects')),
          getDocs(collection(db, 'sections'))
        ]);
        setSubjects(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setSections(secSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching references:", error);
      }
    };

    fetchReferences();

    // Subscribe to teacher's schedules
    const q = query(
      collection(db, 'schedules'),
      where('teacherId', '==', user.uid),
      where('academicYear', '==', syName)
    );

    const unsub = onSnapshot(q, (snap) => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() } as Schedule)));
      setLoading(false);
    });

    return () => unsub();
  }, [user, syName]);

  const teacherSchedules = schedules.filter(s => !s.status || s.status === 'published');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-gradient-to-r  shrink-0 flex items-center justify-between">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4  w-full">
          <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2 xl:gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2 bg-rose-50 rounded-xl text-[#D8232A] shrink-0 border border-rose-100/50 shadow-sm">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D8232A] leading-none mb-1">Schedule</span>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">My Teaching Schedule</h1>
              </div>
            </div>
            <p className="hidden lg:block text-xs text-slate-500 lg:border-l lg:border-slate-200 lg:pl-5 py-0.5 flex-1 leading-relaxed truncate">
              View your assigned subjects, sections, and class times for the academic year {syName}.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-4 sm:p-6 lg:p-8  w-full">
        <Card className="flex flex-col h-full bg-white border-slate-200/60 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm">Weekly Schedule</h3>
              <Badge variant="outline" className="bg-white text-primary border-primary/20 shadow-sm">
                {teacherSchedules.length} Classes
              </Badge>
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
              <div className="w-12 sm:w-14 shrink-0 border-r border-slate-200 bg-slate-50/80 sticky left-0 z-10 float-left h-[880px]">
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
                className="absolute left-12 sm:left-14 right-0 top-0 h-[880px] bg-[length:100%_80px]" 
                style={{ backgroundImage: 'linear-gradient(to bottom, transparent 79px, #e2e8f0 80px)' }}
              >
                <div className="absolute inset-0 flex h-full">
                  {DAYS_OF_WEEK.map(day => (
                    <div key={day} className="flex-1 relative border-r last:border-r-0 border-slate-200/50">
                      {/* Actual Assigned Blocks */}
                      {teacherSchedules.filter(s => s.dayOfWeek === day).map(schedule => {
                        const subject = subjects.find(s => s.id === schedule.subjectId);
                        const section = sections.find(s => s.id === schedule.sectionId);
                        const isAdviser = assignedSections.some(as => as.sectionId === schedule.sectionId && as.isAdvisor);
                        
                        const startMins = timeToMinutes(schedule.startTime);
                        const endMins = timeToMinutes(schedule.endTime);
                        const top = Math.max(0, startMins - CALENDAR_START_MINS) * PIXELS_PER_MINUTE;
                        const height = Math.max(0, endMins - startMins) * PIXELS_PER_MINUTE;
                        
                        return (
                          <div
                            key={schedule.id}
                            className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 rounded-md sm:rounded-lg border flex flex-col p-1 sm:p-1.5 overflow-hidden transition-all bg-white border-primary/20 shadow-sm hover:shadow-md hover:border-primary/50 z-10 hover:z-30 cursor-default`}
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            <div className="flex items-start justify-between">
                              <span className={`text-[9px] font-bold text-primary bg-white/50 rounded px-1 -ml-0.5 inline-block`}>
                                {schedule.startTime}
                              </span>
                            </div>
                            
                            <span 
                              title={subject?.name || 'Unknown'} 
                              className={`text-[10px] font-bold mt-0.5 leading-tight text-slate-800 ${height < 40 ? 'truncate' : 'line-clamp-2'}`}
                            >
                              {subject?.name || 'Unknown Subject'}
                            </span>
                            
                            {height >= 50 && (
                              <div className="mt-auto pt-1 flex flex-wrap gap-1 items-center">
                                <span className="text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-full flex items-center gap-1">
                                  {section ? `${section.gradeLevel} - ${section.name}` : 'Unknown'}
                                  {isAdviser && (
                                    <span className="bg-amber-100 text-amber-700 text-[8px] px-1 py-0 rounded font-bold uppercase tracking-wider">
                                      Adviser
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
