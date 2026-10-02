import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { ChevronLeft, ChevronRight, CalendarCheck, Calendar } from 'lucide-react';
import { getGlobalSettings, GlobalSettings } from '../../lib/services/settingsService';

interface AttendanceRecord {
  date: string; // e.g. "2026-08-12"
  status?: string;
  amStatus?: string;
  pmStatus?: string;
}

interface StudentAttendanceCalendarProps {
  records: AttendanceRecord[];
}

export function StudentAttendanceCalendar({ records }: StudentAttendanceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    getGlobalSettings().then(s => {
      setSettings(s);
      if (s.schoolYearStart) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (todayStr < s.schoolYearStart) {
          const parts = s.schoolYearStart.split('-');
          if (parts.length >= 2) {
            setCurrentDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
          }
        }
      }
    }).catch(console.error);
  }, []);

  const schoolYearStart = settings?.schoolYearStart || '';
  const schoolYearEnd = settings?.schoolYearEnd || '';

  const recordsMap = new Map<string, AttendanceRecord>();
  records.forEach(r => {
    if (!r?.date) return;
    let dStr = '';
    if (typeof r.date === 'string') {
      dStr = r.date.split('T')[0];
    } else if (typeof (r.date as any)?.toDate === 'function') {
      const dt = (r.date as any).toDate();
      dStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }
    if (dStr) {
      recordsMap.set(dStr, r);
    }
  });

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Generate calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  // pad to end of week
  while (days.length % 7 !== 0) {
    days.push(null);
  }

  const renderStatusBadge = (status: string | undefined | null) => {
    if (!status || status === 'Unmarked') {
      return (
        <div className="bg-slate-50/80 text-slate-400 text-[10px] font-medium px-2 py-0.5 rounded flex items-center justify-center border border-slate-100">
          --
        </div>
      );
    }
    if (status === 'Present') {
      return (
        <div className="bg-emerald-100/80 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center justify-center">
          Present
        </div>
      );
    }
    if (status === 'Late') {
      return (
        <div className="bg-amber-100/80 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center justify-center">
          Late
        </div>
      );
    }
    if (status === 'Absent') {
      return (
        <div className="bg-rose-100/80 text-rose-700 text-[10px] font-semibold px-2 py-0.5 rounded flex items-center justify-center">
          Absent
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white border border-slate-200/60 shadow-sm rounded-xl overflow-hidden p-6 sm:p-8">
      {/* Header matching screenshot */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-red-600" />
            Attendance History
          </h3>
          <p className="text-sm text-slate-500">
            {schoolYearStart 
              ? `Daily session tracking records • School Day Start: ${schoolYearStart}`
              : 'Daily session tracking records'}
          </p>
        </div>
        {schoolYearStart && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-100 text-xs font-bold w-fit">
            <Calendar className="w-3.5 h-3.5" />
            <span>S.Y. Start: {schoolYearStart}</span>
          </div>
        )}
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-slate-900">
          {monthNames[month]} {year}
        </h4>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors bg-white shadow-sm cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors bg-white shadow-sm cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
            <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 bg-slate-100 gap-[1px]">
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="bg-white min-h-[110px] p-2" />;
            }
            
            const localDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = recordsMap.get(localDateString);
            const isBeforeSY = Boolean(schoolYearStart && localDateString < schoolYearStart);
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            
            return (
              <div key={day} className={`bg-white min-h-[110px] p-2 flex flex-col relative transition-colors ${isToday ? 'ring-1 ring-inset ring-red-500/50 bg-red-50/10' : ''} hover:bg-slate-50/50`}>
                <div className="flex justify-end mb-2">
                  <span className={`text-sm font-semibold ${isToday ? 'text-red-600' : isBeforeSY ? 'text-slate-300' : 'text-slate-700'}`}>
                    {day}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1.5 mt-auto">
                  {isBeforeSY ? (
                    <div className="bg-slate-50 text-slate-300 text-[10px] font-medium px-2 py-0.5 rounded flex items-center justify-center border border-slate-100/50" title={`Before School Day Start Date (${schoolYearStart})`}>
                      --
                    </div>
                  ) : record ? (
                    <div className="flex-1">{renderStatusBadge(record.status || record.amStatus)}</div>
                  ) : (
                    <div className="flex-1">{renderStatusBadge(null)}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center justify-end gap-4 sm:gap-6 text-xs font-medium text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Late</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
          <span>No Record / N/A</span>
        </div>
      </div>
    </Card>
  );
}
