import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';

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

  const recordsMap = new Map<string, AttendanceRecord>();
  records.forEach(r => {
    recordsMap.set(r.date, r);
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
      <div className="mb-6 flex flex-col gap-1">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-blue-600" />
          Attendance History
        </h3>
        <p className="text-sm text-slate-500">Double session tracking records</p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-slate-900">
          {monthNames[month]} {year}
        </h4>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors bg-white shadow-sm">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors bg-white shadow-sm">
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
            
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            
            return (
              <div key={day} className={`bg-white min-h-[110px] p-2 flex flex-col relative transition-colors ${isToday ? 'ring-1 ring-inset ring-blue-500/50 bg-blue-50/10' : ''} hover:bg-slate-50/50`}>
                <div className="flex justify-end mb-2">
                  <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                    {day}
                  </span>
                </div>
                
                {record ? (
                  <div className="flex flex-col gap-1.5 mt-auto">
                    <div className="flex items-center gap-1.5 bg-slate-50/50 rounded p-1">
                      <span className="text-[10px] font-bold text-slate-500 w-4">AM</span>
                      <div className="flex-1">{renderStatusBadge(record.amStatus || record.status)}</div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50/50 rounded p-1">
                      <span className="text-[10px] font-bold text-slate-500 w-4">PM</span>
                      <div className="flex-1">{renderStatusBadge(record.pmStatus || record.status)}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-6 flex items-center justify-end gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-emerald-300 bg-transparent"></div>
          <span className="text-sm font-medium text-slate-600">Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-slate-200 bg-slate-50"></div>
          <span className="text-sm font-medium text-slate-600">No Record / N/A</span>
        </div>
      </div>
    </Card>
  );
}
