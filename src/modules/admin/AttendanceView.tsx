import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
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
import { Users, Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { useAdminData } from '../../lib/adminData';

export function AttendanceView() {
  const { sections } = useAdminData();
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  
  const todayDate = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [openGrade, setOpenGrade] = useState(false);
  const [openSection, setOpenSection] = useState(false);

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
    if (record) return { am: record.amStatus || record.status || 'Present', pm: record.pmStatus || record.status || 'Present' };
    
    // Auto-present logic for Admin View
    const targetDate = new Date(selectedDate);
    const isAutoDate = targetDate >= new Date('2026-06-08');
    const dayOfWeek = targetDate.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    const def = (isAutoDate && isWeekday) ? 'Present' : 'Absent';
    return { am: def, pm: def };
  };

  const filteredSections = useMemo(() => {
    if (selectedGrade === 'All') return sections;
    return sections.filter(s => s.gradeLevel === selectedGrade);
  }, [sections, selectedGrade]);

  const uniqueGrades = useMemo(() => {
    return Array.from(new Set(sections.map(s => s.gradeLevel))).sort();
  }, [sections]);

  const amPresentCount = sortedStudents.filter(s => getStudentAttendanceStatus(s.id).am === 'Present').length;
  const pmPresentCount = sortedStudents.filter(s => getStudentAttendanceStatus(s.id).pm === 'Present').length;
  const amAbsentCount = sortedStudents.filter(s => getStudentAttendanceStatus(s.id).am === 'Absent').length;
  const pmAbsentCount = sortedStudents.filter(s => getStudentAttendanceStatus(s.id).pm === 'Absent').length;
  const amLateCount = sortedStudents.filter(s => getStudentAttendanceStatus(s.id).am === 'Late').length;
  const pmLateCount = sortedStudents.filter(s => getStudentAttendanceStatus(s.id).pm === 'Late').length;

  const maleStudents = sortedStudents.filter(s => s.gender === 'Male');
  const femaleStudents = sortedStudents.filter(s => s.gender === 'Female');

  const renderBadge = (status: string) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${status === 'Present' ? 'bg-emerald-100 text-emerald-800' :
          status === 'Absent' ? 'bg-rose-100 text-rose-800' :
            'bg-amber-100 text-amber-800'
        }`}>
        {status}
      </span>
    );
  };

  const renderStudentRow = (student: any) => {
    const status = getStudentAttendanceStatus(student.id);
    return (
      <TableRow key={student.id}>
        <TableCell className="font-medium">
          {student.lastName}, {student.firstName}
        </TableCell>
        <TableCell>{renderBadge(status.am)}</TableCell>
        <TableCell className="text-right pr-6">{renderBadge(status.pm)}</TableCell>
      </TableRow>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-6 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Attendance Records</h1>
              <p className="text-muted-foreground mt-1 text-lg">View student attendance by grade and section</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                max={todayDate}
                value={selectedDate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val > todayDate) {
                    setSelectedDate(todayDate);
                  } else {
                    setSelectedDate(val);
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Grade Level</label>
              <Popover open={openGrade} onOpenChange={setOpenGrade}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openGrade}
                    className="w-[200px] justify-between bg-background"
                  >
                    {selectedGrade === 'All' ? "All Grades" : selectedGrade}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
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
              <label className="text-sm font-medium text-slate-700">Section</label>
              <Popover open={openSection} onOpenChange={setOpenSection}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openSection}
                    disabled={selectedGrade === 'All'}
                    className="w-[250px] justify-between bg-background"
                  >
                    {selectedSection === 'All' 
                      ? "Select Section..." 
                      : filteredSections.find(s => s.id === selectedSection)?.name || "Select Section..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0">
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

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {selectedSection === 'All' ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Select a grade level and section to view attendance.</p>
            </div>
          ) : loadingStudents || loadingAttendance ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="p-4 flex items-center justify-between bg-emerald-50/50 border-emerald-100">
                  <div>
                    <p className="text-sm font-medium text-emerald-800">Present</p>
                    <h3 className="text-xl font-bold text-emerald-600">AM: {amPresentCount} | PM: {pmPresentCount}</h3>
                  </div>
                </Card>
                <Card className="p-4 flex items-center justify-between bg-rose-50/50 border-rose-100">
                  <div>
                    <p className="text-sm font-medium text-rose-800">Absent</p>
                    <h3 className="text-xl font-bold text-rose-600">AM: {amAbsentCount} | PM: {pmAbsentCount}</h3>
                  </div>
                </Card>
                <Card className="p-4 flex items-center justify-between bg-amber-50/50 border-amber-100">
                  <div>
                    <p className="text-sm font-medium text-amber-800">Late</p>
                    <h3 className="text-xl font-bold text-amber-600">AM: {amLateCount} | PM: {pmLateCount}</h3>
                  </div>
                </Card>
              </div>

              <Card className="overflow-hidden shadow-sm border-border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>AM Status</TableHead>
                      <TableHead className="text-right pr-6">PM Status</TableHead>
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
                            <TableCell colSpan={3} className="font-bold text-slate-700 tracking-widest text-xs py-2 pl-4">
                              MALE
                            </TableCell>
                          </TableRow>
                        )}
                        {maleStudents.map(student => renderStudentRow(student))}

                        {femaleStudents.length > 0 && (
                          <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableCell colSpan={3} className="font-bold text-slate-700 tracking-widest text-xs py-2 pl-4">
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
    </div>
  );
}
