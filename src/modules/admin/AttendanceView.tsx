import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { Card } from '../../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../components/ui/command';
import { cn } from '../../lib/utils';
import { Users, Loader2, ChevronsUpDown, Check, CalendarCheck, CalendarX, X } from 'lucide-react';
import { useAdminData } from '../../lib/adminData';

export function AttendanceView() {
  const { sections } = useAdminData();
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
  const todayDate = new Date().toISOString().split('T')[0];
  const getInitialDate = () => {
    const today = new Date();
    const day = today.getDay();
    if (day === 0) { // Sunday -> get Friday
      const friday = new Date(today);
      friday.setDate(today.getDate() - 2);
      return friday.toISOString().split('T')[0];
    } else if (day === 6) { // Saturday -> get Friday
      const friday = new Date(today);
      friday.setDate(today.getDate() - 1);
      return friday.toISOString().split('T')[0];
    }
    return today.toISOString().split('T')[0];
  };
  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [openGrade, setOpenGrade] = useState(false);
  const [openSection, setOpenSection] = useState(false);
  const [isWeekendModalOpen, setIsWeekendModalOpen] = useState(false);
  const [weekendSelectedDateStr, setWeekendSelectedDateStr] = useState('');

  // Fetch students when section changes
  useEffect(() => {
    if (selectedSection === 'All') {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    const q = query(
      collection(db, 'enrollments'),
      where('sectionId', '==', selectedSection),
      where('status', 'in', ['Enrolled'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingStudents(false);
    });
    return () => unsub();
  }, [selectedSection]);

  // Fetch attendance when section or date changes
  useEffect(() => {
    if (selectedSection === 'All' || !selectedDate) {
      setAttendance([]);
      return;
    }
    setLoadingAttendance(true);
    const q = query(
      collection(db, 'attendance'),
      where('sectionId', '==', selectedSection),
      where('date', '==', selectedDate)
    );
    const unsub = onSnapshot(q, (snap) => {
      setAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingAttendance(false);
    });
    return () => unsub();
  }, [selectedSection, selectedDate]);

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      if (a.gender !== b.gender) {
        if (a.gender === 'Male') return -1;
        if (b.gender === 'Male') return 1;
        if (a.gender === 'Female') return -1;
        if (b.gender === 'Female') return 1;
      }
      const nameA = a.lastName?.toLowerCase() || '';
      const nameB = b.lastName?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });
  }, [students]);

  const getStudentAttendanceStatus = (studentId: string) => {
    const record = attendance.find(a => a.studentId === studentId);
    if (record) return (record.status || (record as any).amStatus || 'Present') as 'Present' | 'Absent' | 'Late' | 'Unmarked';
    
    const targetDate = new Date(selectedDate);
    const dayOfWeek = targetDate.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (!isWeekday) {
      return '—';
    }

    return 'Unmarked';
  };

  const filteredSections = useMemo(() => {
    if (selectedGrade === 'All') return sections;
    return sections.filter(s => s.gradeLevel === selectedGrade);
  }, [sections, selectedGrade]);

  const uniqueGrades = useMemo(() => {
    return Array.from(new Set(sections.map(s => s.gradeLevel))).sort();
  }, [sections]);

  const presentCount = sortedStudents.filter(s => getStudentAttendanceStatus(s.id) === 'Present').length;
  const absentCount = sortedStudents.filter(s => getStudentAttendanceStatus(s.id) === 'Absent').length;
  const lateCount = sortedStudents.filter(s => getStudentAttendanceStatus(s.id) === 'Late').length;

  const maleStudents = sortedStudents.filter(s => s.gender === 'Male');
  const femaleStudents = sortedStudents.filter(s => s.gender === 'Female');

  const renderBadge = (status: string) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
        ${status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
          status === 'Absent' ? 'bg-rose-100 text-rose-800' :
            status === 'Late' ? 'bg-amber-100 text-amber-800' :
              'bg-slate-100 text-slate-600'
        }`}>
        {status}
      </span>
    );
  };

  const renderStudentRow = (student: any) => {
    const status = getStudentAttendanceStatus(student.id);
    return (
      <TableRow key={student.id}>
        <TableCell className="font-bold text-slate-800 text-sm pl-6">
          {student.lastName}, {student.firstName}
        </TableCell>
        <TableCell className="text-slate-500 font-mono text-sm font-medium">
          {student.lrn}
        </TableCell>
        <TableCell className="text-right pr-6">{renderBadge(status)}</TableCell>
      </TableRow>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9]">
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 z-10">
        <div className="flex flex-row items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#D8232A]/10 text-[#D8232A] border border-[#D8232A]/20 rounded-2xl shadow-sm">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D8232A] leading-none mb-1">Admin Portal</span>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">Attendance Records</h1>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Date</label>
              <input
                type="date"
                max={todayDate}
                value={selectedDate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const parts = val.split('-');
                  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                  const selectedDay = d.getDay();
                  if (selectedDay === 0 || selectedDay === 6) {
                    const dayName = selectedDay === 0 ? 'Sunday' : 'Saturday';
                    const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    setWeekendSelectedDateStr(`${dayName}, ${formatted}`);
                    setIsWeekendModalOpen(true);
                    return;
                  }
                  if (val > todayDate) {
                    setSelectedDate(todayDate);
                  } else {
                    setSelectedDate(val);
                  }
                }}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/15 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Grade Level</label>
              <Popover open={openGrade} onOpenChange={setOpenGrade}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openGrade}
                    className="w-[200px] h-10 justify-between bg-background rounded-xl border-slate-200 text-sm font-semibold"
                  >
                    {selectedGrade === 'All' ? "All Grades" : selectedGrade}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 rounded-xl shadow-lg border-slate-200">
                  <Command>
                    <CommandInput placeholder="Search grade..." />
                    <CommandList>
                      <CommandEmpty>No grade found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setSelectedGrade('All');
                            setSelectedSection('All');
                            setOpenGrade(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedGrade === 'All' ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All Grades
                        </CommandItem>
                        {uniqueGrades.map(grade => (
                          <CommandItem
                            key={grade}
                            value={grade}
                            onSelect={(val) => {
                              const matched = uniqueGrades.find(g => g.toLowerCase() === val) || grade;
                              setSelectedGrade(matched);
                              setSelectedSection('All');
                              setOpenGrade(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedGrade === grade ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {grade}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase">Section</label>
              <Popover open={openSection} onOpenChange={setOpenSection}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSection}
                    disabled={selectedGrade === 'All'}
                    className="w-[250px] h-10 justify-between bg-background rounded-xl border-slate-200 text-sm font-semibold"
                  >
                    {selectedSection === 'All' 
                      ? "Select Section..." 
                      : filteredSections.find(s => s.id === selectedSection)?.name || "Select Section..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0 rounded-xl shadow-lg border-slate-200">
                  <Command>
                    <CommandInput placeholder="Search section..." />
                    <CommandList>
                      <CommandEmpty>No section found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all"
                          onSelect={() => {
                            setSelectedSection('All');
                            setOpenSection(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedSection === 'All' ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Select Section...
                        </CommandItem>
                        {filteredSections.map(section => (
                          <CommandItem
                            key={section.id}
                            value={section.name}
                            onSelect={(val) => {
                              const matched = filteredSections.find(s => s.name.toLowerCase() === val) || section;
                              setSelectedSection(matched.id);
                              setOpenSection(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedSection === section.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {section.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 sm:p-8">
        <div className="w-full space-y-6">
          {selectedSection === 'All' ? (
            <div className="text-center py-16 text-slate-400 font-medium">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-25" />
              <p>Select a grade level and section to view attendance.</p>
            </div>
          ) : loadingStudents || loadingAttendance ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50 p-5 rounded-2xl shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Present</p>
                      <h3 className="text-2xl font-extrabold text-emerald-600">{presentCount} <span className="text-sm font-medium text-emerald-700/60">students</span></h3>
                    </div>
                  </div>
                </Card>
                <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200/50 p-5 rounded-2xl shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-rose-800 uppercase tracking-wider">Absent</p>
                      <h3 className="text-2xl font-extrabold text-rose-600">{absentCount} <span className="text-sm font-medium text-rose-700/60">students</span></h3>
                    </div>
                  </div>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50 p-5 rounded-2xl shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-800 uppercase tracking-wider">Late</p>
                      <h3 className="text-2xl font-extrabold text-amber-600">{lateCount} <span className="text-sm font-medium text-amber-700/60">students</span></h3>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="overflow-hidden shadow-md border-slate-200/60 rounded-2xl bg-white">
                <Table>
                  <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                    <TableRow>
                      <TableHead className="font-bold text-slate-700 pl-6 py-4">Student Name</TableHead>
                      <TableHead className="font-bold text-slate-700 py-4">LRN</TableHead>
                      <TableHead className="font-bold text-slate-700 w-48 text-right pr-6 py-4">Attendance Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          No enrolled students found for this section.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {maleStudents.length > 0 && (
                          <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableCell colSpan={3} className="font-bold text-slate-700 tracking-widest text-xs py-2 pl-6">
                              MALE
                            </TableCell>
                          </TableRow>
                        )}
                        {maleStudents.map(student => renderStudentRow(student))}

                        {femaleStudents.length > 0 && (
                          <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableCell colSpan={3} className="font-bold text-slate-700 tracking-widest text-xs py-2 pl-6">
                              FEMALE
                            </TableCell>
                          </TableRow>
                        )}
                        {femaleStudents.map(student => renderStudentRow(student))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </>
          )}
        </div>
      </main>

      {/* ── BEAUTIFUL & MINIMALIST WEEKEND / SCHOOL DAYS POPUP MODAL ── */}
      <AnimatePresence>
        {isWeekendModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Smooth Blur Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWeekendModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity cursor-pointer"
            />

            {/* Unique Minimalist Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 14 }}
              transition={{ type: "spring", damping: 26, stiffness: 360 }}
              className="relative w-full max-w-[370px] bg-white rounded-[28px] p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.16)] border border-slate-100 overflow-hidden text-center z-10"
            >
              {/* Subtle Warm Amber/Red Ambient Glow */}
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-36 h-36 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={() => setIsWeekendModalOpen(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100/80 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Calendar Weekend Icon */}
              <div className="relative mx-auto w-14 h-14 rounded-2xl bg-gradient-to-b from-red-50 to-rose-100/60 border border-red-200/60 flex items-center justify-center shadow-inner mb-4 text-[#D8232A]">
                <CalendarX className="w-6 h-6" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-[9px] font-black text-amber-950">!</span>
              </div>

              {/* Text Information */}
              <div className="space-y-1.5 mb-5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200/60 text-[#D8232A] text-[10px] font-black tracking-wider uppercase mb-1">
                  School Days Only
                </div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Weekend Selected
                </h3>
                {weekendSelectedDateStr && (
                  <p className="text-[11px] font-bold text-slate-400">
                    {weekendSelectedDateStr}
                  </p>
                )}
                <p className="text-xs text-slate-500 leading-relaxed font-medium pt-1 px-1">
                  Attendance can only be recorded from <strong className="text-slate-800 font-bold">Monday to Friday</strong>. Weekends are non-instructional school days.
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setIsWeekendModalOpen(false)}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-sm transition-all duration-150 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Got it</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
