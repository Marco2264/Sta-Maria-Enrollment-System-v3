import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { CalendarClock, Clock } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../lib/AuthContext';
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

export function MyScheduleView() {
  const { user } = useAuth();
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

  const getSchedulesForDay = (day: string) => {
    return schedules
      .filter(s => s.dayOfWeek === day)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <CalendarClock className="w-5 h-5" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">My Teaching Schedule</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed hidden sm:block">
              View your assigned subjects, sections, and class times for the academic year {syName}.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {DAYS_OF_WEEK.map(day => (
            <Card key={day} className="bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
              <div className="bg-slate-50/80 border-b border-slate-100 p-3 text-center">
                <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">{day}</h3>
              </div>
              <div className="p-3 flex-1 flex flex-col gap-3">
                {getSchedulesForDay(day).length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic">
                    No classes
                  </div>
                ) : (
                  getSchedulesForDay(day).map(schedule => {
                    const subject = subjects.find(s => s.id === schedule.subjectId);
                    const section = sections.find(s => s.id === schedule.sectionId);
                    
                    return (
                      <div key={schedule.id} className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-1.5 text-primary font-bold text-sm mb-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {schedule.startTime} - {schedule.endTime}
                        </div>
                        
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800 text-sm leading-tight">{subject?.name || 'Unknown Subject'}</p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-[10px] font-semibold bg-white border-slate-200 text-slate-600 px-1.5 py-0">
                              {section ? `${section.gradeLevel} - ${section.name}` : 'Unknown Section'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
