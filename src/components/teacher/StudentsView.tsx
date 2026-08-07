import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/Table';
import { TeacherEditStudentModal } from './TeacherEditStudentModal';
import { Eye, Users, Activity, Scale, Ruler, Trash2, FileEdit, Search, Filter, CalendarDays } from 'lucide-react';
import { useTeacherData } from '../../lib/teacherData';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { HealthAnalyticsService } from '../../lib/services/healthAnalyticsService';

export function StudentsView() {
  const { students, updateStudentBmi, loading } = useTeacherData();
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [editBmi, setEditBmi] = useState({ height: '', weight: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#D8232A]/20 border-t-[#D8232A] rounded-full animate-spin"></div>
      </div>
    );
  }

  const formatStudentName = (firstName: string | undefined, lastName: string | undefined) => {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    if (!last) return first || 'Unnamed Student';
    if (!first) return last || 'Unnamed Student';
    return `${last}, ${first}`;
  };

  const enrolled = React.useMemo(() => {
    return students
      .filter((s) => {
        if (s.status !== 'Enrolled' && s.status !== 'enrolled' && s.status !== 'PROMOTED' && s.status !== 'RETAINED' && s.status !== 'IRREGULAR') return false;
        if ((s as any).isManualHistory === true) return false;
        
        // Search filter
        const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || s.lrn.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Gender filter
        const matchesGender = genderFilter === 'All' || s.gender?.toLowerCase() === genderFilter.toLowerCase();
        
        return matchesSearch && matchesGender;
      })
      .sort((a, b) => {
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
  }, [students, searchTerm, genderFilter]);
  
  const student = selectedStudent ? students.find((s) => s.id === selectedStudent) : null;

  const openProfile = (id: string) => {
    const s = students.find((st) => st.id === id);
    if (s) {
      setEditBmi({
        height: s.medical?.height || '',
        weight: s.medical?.weight || ''
      });
      setSelectedStudent(id);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'enrollments', id));
      } catch (error) {
        console.error("Error deleting student:", error);
        alert("Failed to delete student.");
      }
    }
  };

  const calcBmi = (h?: string, w?: string) => {
    if (!h || !w) return '--';
    const hm = parseFloat(h) / 100;
    const wk = parseFloat(w);
    if (hm > 0 && wk > 0) return (wk / (hm * hm)).toFixed(1);
    return '--';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
      {/* Soft Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#D8232A]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#D8232A]/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      <header className="relative px-8 py-10 bg-white/70 backdrop-blur-md shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#D8232A]">Classroom</span>
            </div>
            <div className="flex items-center gap-3 text-slate-800">
              <div className="p-2.5 bg-[#D8232A]/10 text-[#D8232A] border border-[#D8232A]/20 rounded-2xl shadow-sm">
                <Users className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Student Profiles</h1>
            </div>
            <p className="text-sm text-slate-500 pl-14">
              View and manage your enrolled students' profiles, physical health parameters, and BMI calculations.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 hover:border-[#D8232A]/30 shadow-sm transition-all md:self-center">
            <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Health Coverage</p>
              <p className="text-sm font-bold text-slate-700 leading-tight mt-0.5">
                {enrolled.filter(s => s.medical?.height && s.medical?.weight).length} / {enrolled.length} Records
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full relative">
        <Card className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="p-6 border-b border-slate-100 bg-white/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-bold text-xl text-slate-900">Enrolled Students</h3>
                <p className="text-xs text-slate-400 font-medium">Manage records and health metrics for this classroom section.</p>
              </div>
              <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-[#D8232A]/10 text-[#D8232A] uppercase tracking-wider border border-[#D8232A]/20">
                {enrolled.length} {enrolled.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search student name or LRN..."
                  className="pl-10 h-11 rounded-xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/15 transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="w-full sm:w-[170px]">
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-[#D8232A]/15 focus:border-[#D8232A] transition-all font-medium text-sm text-slate-700">
                    <div className="flex items-center">
                      <Filter className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                      <SelectValue placeholder="Gender" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-slate-200">
                    <SelectItem value="All">All Genders</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider pl-6 py-4">Learner Name</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4">LRN</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4">Gender</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4">Height</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4">Weight</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4">Health Status Summary</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider text-right pr-6 py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolled.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-slate-400 font-medium">
                      No enrolled students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  enrolled.map((s) => (
                    <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-xs font-bold shadow-sm ${
                            s.gender === 'Male' 
                              ? 'bg-blue-50 text-blue-700 border-blue-100' 
                              : 'bg-pink-50 text-pink-700 border-pink-100'
                          }`}>
                            {s.firstName?.charAt(0) || ''}{s.lastName?.charAt(0) || ''}
                          </div>
                          <span className="font-bold text-slate-800 text-sm tracking-tight">
                            {formatStudentName(s.firstName, s.lastName)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs font-medium py-4">
                        {s.lrn}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border border-opacity-40 ${
                          s.gender === 'Male' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200'
                        }`}>
                          {s.gender}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-semibold text-slate-600 text-sm py-4">
                        {s.medical?.height ? `${s.medical.height} cm` : <span className="text-slate-400 font-normal">--</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-semibold text-slate-600 text-sm py-4">
                        {s.medical?.weight ? `${s.medical.weight} kg` : <span className="text-slate-400 font-normal">--</span>}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-wrap gap-1.5 py-1">
                          {/* BMI Badge */}
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">BMI</span>
                            <span className="font-mono">{calcBmi(s.medical?.height, s.medical?.weight)}</span>
                          </span>
                          
                          {/* Nutritional status badge */}
                          {s.medical?.height && s.medical?.weight && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold shadow-sm ${
                              (() => {
                                const bmiVal = parseFloat(calcBmi(s.medical.height, s.medical.weight));
                                const status = HealthAnalyticsService.getNutritionalStatus(bmiVal);
                                if (status === 'Severely Wasted' || status === 'Wasted') return 'text-rose-700 bg-rose-50 border-rose-200/60';
                                if (status === 'Normal') return 'text-emerald-700 bg-emerald-50 border-emerald-200/60';
                                return 'text-blue-700 bg-blue-50 border-blue-200/60';
                              })()
                            }`}>
                              <span className="text-[10px] opacity-65 font-bold uppercase mr-0.5">Nutr</span>
                              {(() => {
                                const bmiVal = parseFloat(calcBmi(s.medical.height, s.medical.weight));
                                return HealthAnalyticsService.getNutritionalStatus(bmiVal);
                              })()}
                            </span>
                          )}

                          {/* Height-for-Age badge */}
                          {s.medical?.height && s.medical?.weight && s.birthDate && (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-xs font-bold shadow-sm ${
                              (() => {
                                const h = parseFloat(s.medical.height);
                                const ageMonths = HealthAnalyticsService.calculateAgeInMonths(s.birthDate);
                                const status = HealthAnalyticsService.getHfaStatus(h, s.gender ?? 'Male', ageMonths);
                                if (status === 'Severely Stunted' || status === 'Stunted') return 'text-rose-700 bg-rose-50 border-rose-200/60';
                                if (status === 'Normal') return 'text-emerald-700 bg-emerald-50 border-emerald-200/60';
                                return 'text-indigo-700 bg-indigo-50 border-indigo-200/60';
                              })()
                            }`}>
                              <span className="text-[10px] opacity-65 font-bold uppercase mr-0.5">HFA</span>
                              {(() => {
                                const h = parseFloat(s.medical.height);
                                const ageMonths = HealthAnalyticsService.calculateAgeInMonths(s.birthDate);
                                return HealthAnalyticsService.getHfaStatus(h, s.gender ?? 'Male', ageMonths);
                              })()}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3.5 text-[#D8232A] hover:bg-[#D8232A]/10 hover:text-[#D8232A] transition-colors rounded-xl font-bold text-xs inline-flex items-center gap-1.5 active:scale-95 duration-100"
                          onClick={() => openProfile(s.id)}
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          Edit Profile
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors rounded-xl active:scale-95 duration-100 inline-flex items-center justify-center"
                          onClick={() => handleDeleteStudent(s.id, formatStudentName(s.firstName, s.lastName))}
                          title="Delete Student Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      <TeacherEditStudentModal
        student={student || null}
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
}