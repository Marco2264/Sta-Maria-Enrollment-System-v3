import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { 
  Heart, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Download, 
  Search, 
  Filter, 
  Users, 
  Sparkles, 
  UserCheck, 
  Scale, 
  RefreshCw 
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { HealthAnalyticsService, HealthData, NutritionalStats } from '../../lib/services/healthAnalyticsService';
import { NutritionalStatsChart } from './analytics/NutritionalStatsChart';
import { useAuth } from '../../lib/AuthContext';
import { normalizeRole } from '../../lib/roles';
import { generateAdminSF8 } from '../../lib/excelGenerator';

export function HealthDashboardView() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'feeding' | 'roster'>('analytics');
  const [allHealthData, setAllHealthData] = useState<HealthData[]>([]);
  const [stats, setStats] = useState<NutritionalStats[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [assignedSectionNames, setAssignedSectionNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [nutritionalFilter, setNutritionalFilter] = useState('all');
  const [hfaFilter, setHfaFilter] = useState('all');

  const { role: currentUserRole, userData } = useAuth();
  const isSubAdmin = normalizeRole(currentUserRole) === 'subadmin';
  const assignedGrade = isSubAdmin ? (userData?.assignedGrade as string | undefined) : undefined;

  const fetchData = async () => {
    setLoading(true);
    try {
      let allowedSectionIds: string[] = [];
      const userRole = normalizeRole(currentUserRole);

      const [healthData, nutritionalStats, sectSnap] = await Promise.all([
        HealthAnalyticsService.getHealthData(assignedGrade),
        HealthAnalyticsService.getNutritionalStats(assignedGrade),
        getDocs(collection(db, 'sections'))
      ]);

      const sectionsList = sectSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setSections(sectionsList);

      if (userRole === 'teacher') {
        const assignSnap = await getDocs(
          query(
            collection(db, 'assignments'),
            where('teacherId', '==', userData?.uid || userData?.id || '')
          )
        );
        allowedSectionIds = assignSnap.docs.map(doc => doc.data().sectionId);

        const names = allowedSectionIds.map(id => {
          const s = sectionsList.find(sec => sec.id === id);
          return s ? s.name : id;
        });
        setAssignedSectionNames(names);
      }

      let filteredHealthData = healthData;
      if (userRole === 'teacher') {
        filteredHealthData = healthData.filter(d => d.sectionId && allowedSectionIds.includes(d.sectionId));
      }

      setAllHealthData(filteredHealthData);

      if (userRole === 'teacher') {
        const categories = [
          { status: 'Severely Wasted', color: '#ef4444' },
          { status: 'Wasted', color: '#f59e0b' },
          { status: 'Normal', color: '#10b981' },
          { status: 'Overweight', color: '#3b82f6' },
          { status: 'Obese', color: '#8b5cf6' }
        ];
        const counts = categories.map(cat => ({
          status: cat.status as any,
          count: filteredHealthData.filter(d => d.nutritionalStatus === cat.status).length,
          color: cat.color
        }));
        setStats(counts);
      } else {
        setStats(nutritionalStats);
      }
    } catch (err) {
      console.error('Failed to load health and nutrition records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [assignedGrade]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setGradeFilter('all');
    setSectionFilter('all');
    setGenderFilter('all');
    setNutritionalFilter('all');
    setHfaFilter('all');
  };

  // Get list of unique grades and sections for dropdown options
  const uniqueGrades = useMemo(() => {
    const grades = new Set<string>();
    allHealthData.forEach(d => {
      if (d.gradeLevel) grades.add(d.gradeLevel);
    });
    return Array.from(grades).sort();
  }, [allHealthData]);

  const uniqueSections = useMemo(() => {
    const sectionIds = new Set<string>();
    allHealthData.forEach(d => {
      if (d.sectionId) sectionIds.add(d.sectionId);
    });
    return Array.from(sectionIds).map(id => {
      const s = sections.find(sec => sec.id === id);
      return { id, name: s ? s.name : id };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [allHealthData, sections]);

  // Derived metrics
  const metrics = useMemo(() => {
    const total = allHealthData.length;
    const feedingEligible = allHealthData.filter(
      d => d.nutritionalStatus === 'Severely Wasted' || d.nutritionalStatus === 'Wasted'
    ).length;
    const obeseOverweight = allHealthData.filter(
      d => d.nutritionalStatus === 'Obese' || d.nutritionalStatus === 'Overweight'
    ).length;
    const stuntedGrowth = allHealthData.filter(
      d => d.heightForAge === 'Severely Stunted' || d.heightForAge === 'Stunted'
    ).length;

    return {
      total,
      feedingEligible,
      obeseOverweight,
      stuntedGrowth
    };
  }, [allHealthData]);

  // Filtered Roster Data
  const filteredRoster = useMemo(() => {
    return allHealthData.filter(student => {
      const matchSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (student.lrn && student.lrn.includes(searchTerm));
      const matchGrade = gradeFilter === 'all' || student.gradeLevel === gradeFilter;
      const matchSection = sectionFilter === 'all' || student.sectionId === sectionFilter;
      const matchGender = genderFilter === 'all' || student.gender === genderFilter;
      const matchNutritional = nutritionalFilter === 'all' || student.nutritionalStatus === nutritionalFilter;
      const matchHfa = hfaFilter === 'all' || student.heightForAge === hfaFilter;

      return matchSearch && matchGrade && matchSection && matchGender && matchNutritional && matchHfa;
    });
  }, [allHealthData, searchTerm, gradeFilter, sectionFilter, genderFilter, nutritionalFilter, hfaFilter]);

  // Filtered Feeding Candidates
  const feedingCandidates = useMemo(() => {
    return allHealthData.filter(d => {
      const isEligible = d.nutritionalStatus === 'Severely Wasted' || d.nutritionalStatus === 'Wasted';
      if (!isEligible) return false;

      const matchSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (d.lrn && d.lrn.includes(searchTerm));
      const matchGrade = gradeFilter === 'all' || d.gradeLevel === gradeFilter;
      const matchSection = sectionFilter === 'all' || d.sectionId === sectionFilter;
      const matchGender = genderFilter === 'all' || d.gender === genderFilter;

      return matchSearch && matchGrade && matchSection && matchGender;
    });
  }, [allHealthData, searchTerm, gradeFilter, sectionFilter, genderFilter]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (filteredRoster.length === 0) {
      alert("No student records available to export.");
      return;
    }
    setIsExporting(true);
    try {
      const userRole = normalizeRole(currentUserRole);
      let adviserName = "";
      if (userRole === 'teacher') {
        const u = userData as any;
        adviserName = `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || (typeof u?.displayName === 'string' ? u?.displayName : '') || (typeof u?.fullName === 'string' ? u?.fullName : '') || "";
      }
      let gradeLevel = "All Grades";
      if (gradeFilter !== 'all') {
        gradeLevel = gradeFilter;
      } else if ((filteredRoster[0] as any)?.gradeLevel) {
        gradeLevel = (filteredRoster[0] as any).gradeLevel;
      }
      let section = "All Sections";
      if (userRole === 'teacher') {
        section = assignedSectionNames.join(', ') || "Assigned Section";
      } else if (sectionFilter !== 'all') {
        section = sections.find(s => s.id === sectionFilter)?.name || sectionFilter;
      }
      const schoolYear = (filteredRoster[0] as any)?.schoolYear || "2025-2026";

      await generateAdminSF8({
        schoolYear,
        gradeLevel,
        section,
        learners: filteredRoster,
        adviserName: adviserName || undefined
      });
    } catch (err) {
      console.error("Failed to export SF8:", err);
      alert("An error occurred while exporting SF8 Excel sheet. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] relative overflow-hidden">
      {/* Soft Decorative Ambient Background */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-teal-500/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

      {/* Header Panel */}
      <header className="h-[76px] px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 flex items-center shadow-2xs relative z-10">
        <div className="flex flex-row items-center justify-between gap-6 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100/50 shadow-2xs">
              <Heart className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 leading-none mb-1">Health Command Center</span>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">Health & Nutrition</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 duration-100 border-none disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting...' : 'Export Excel'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Roster Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full relative z-10">
        
        {/* KPI Cards Panel */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1: Total Measured */}
          <Card className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs relative overflow-hidden transition-all duration-200 hover:shadow-xs group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
            <div className="flex items-center justify-between mb-3.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100/50">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50/50 px-2 py-0.5 rounded-full">Assessed</span>
            </div>
            <div className="space-y-0.5">
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">{metrics.total}</h3>
              <p className="text-xs font-semibold text-slate-500 pt-1.5 uppercase tracking-wider">Total Measured Students</p>
            </div>
          </Card>

          {/* Card 2: Feeding Candidates */}
          <Card className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs relative overflow-hidden transition-all duration-200 hover:shadow-xs group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
            <div className="flex items-center justify-between mb-3.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-100/50">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50/50 px-2 py-0.5 rounded-full">Feeding Candidates</span>
            </div>
            <div className="space-y-0.5">
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">{metrics.feedingEligible}</h3>
              <p className="text-xs font-semibold text-slate-500 pt-1.5 uppercase tracking-wider">Wasted & Severely Wasted</p>
            </div>
          </Card>

          {/* Card 3: Obese / Overweight */}
          <Card className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs relative overflow-hidden transition-all duration-200 hover:shadow-xs group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
            <div className="flex items-center justify-between mb-3.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100/50">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D8232A] bg-red-50/50 px-2 py-0.5 rounded-full">Over-nutrition</span>
            </div>
            <div className="space-y-0.5">
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">{metrics.obeseOverweight}</h3>
              <p className="text-xs font-semibold text-slate-500 pt-1.5 uppercase tracking-wider">Obese & Overweight</p>
            </div>
          </Card>

          {/* Card 4: Stunted growth HFA */}
          <Card className="bg-white border border-slate-100 p-5 rounded-2xl shadow-2xs relative overflow-hidden transition-all duration-200 hover:shadow-xs group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
            <div className="flex items-center justify-between mb-3.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-50 text-violet-600 border border-violet-100/50">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50/50 px-2 py-0.5 rounded-full">Growth Alerts</span>
            </div>
            <div className="space-y-0.5">
              <h3 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">{metrics.stuntedGrowth}</h3>
              <p className="text-xs font-semibold text-slate-500 pt-1.5 uppercase tracking-wider">Stunted & Severely Stunted</p>
            </div>
          </Card>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => { setActiveTab('analytics'); handleResetFilters(); }}
            className={`pb-4 text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
              activeTab === 'analytics' 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview & Charts
          </button>
          <button
            onClick={() => { setActiveTab('feeding'); handleResetFilters(); }}
            className={`pb-4 text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
              activeTab === 'feeding' 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Feeding Candidates ({metrics.feedingEligible})
          </button>
          <button
            onClick={() => { setActiveTab('roster'); handleResetFilters(); }}
            className={`pb-4 text-sm font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
              activeTab === 'roster' 
                ? 'border-emerald-600 text-emerald-600' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            All Student Roster
          </button>
        </div>

        {/* Tab Content 1: Overview & Analytics */}
        {activeTab === 'analytics' && (
          <div className="grid gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-3">
            {/* Chart Widget Panel */}
            <Card className="lg:col-span-2 bg-white border border-slate-200/50 rounded-2xl shadow-2xs overflow-hidden flex flex-col p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800 leading-tight">Nutritional Distribution</h3>
                <p className="text-xs text-slate-400 mt-1">Overall distribution of students classified by Body Mass Index (BMI)</p>
              </div>
              <div className="flex-1 min-h-[340px] flex items-center justify-center">
                <NutritionalStatsChart data={stats} />
              </div>
            </Card>

            {/* Quick Summary Reference List */}
            <Card className="bg-white border border-slate-200/50 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-base font-bold text-slate-800 leading-tight">Nutritional Summary</h3>
                <p className="text-xs text-slate-400 mt-1">Aggregated totals by status group</p>
              </div>
              <div className="p-6 flex-1 space-y-4">
                {stats.length > 0 ? (
                  stats.map((item) => {
                    let pct = 0;
                    if (metrics.total > 0) {
                      pct = parseFloat(((item.count / metrics.total) * 100).toFixed(1));
                    }
                    return (
                      <div key={item.status} className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-slate-600">{item.status}</span>
                          <span className="text-slate-800">{item.count} students ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              item.status === 'Severely Wasted' ? 'bg-red-600' :
                              item.status === 'Wasted' ? 'bg-amber-500' :
                              item.status === 'Normal' ? 'bg-emerald-500' :
                              item.status === 'Overweight' ? 'bg-blue-500' :
                              'bg-violet-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs font-medium">
                    No nutritional status aggregates found.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Tab Content 2: Feeding Program Candidates */}
        {activeTab === 'feeding' && (
          <div className="space-y-6">
            
            {/* Roster Controls: Search & Grade filters */}
            <Card className="bg-white border border-slate-200/50 p-4 rounded-2xl shadow-2xs flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student name or LRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 bg-[#f8fafc]/50 placeholder-slate-400"
                />
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mr-1">
                  <Filter className="w-3.5 h-3.5" />
                  Filters:
                </div>
                
                {/* Grade filter */}
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-700 font-semibold"
                >
                  <option value="all">All Grades</option>
                  {uniqueGrades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>

                {/* Section filter */}
                {normalizeRole(currentUserRole) === 'teacher' ? (
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                    Section: {assignedSectionNames.join(', ')}
                  </span>
                ) : (
                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-700 font-semibold"
                  >
                    <option value="all">All Sections</option>
                    {uniqueSections.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                )}

                {/* Gender filter */}
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-700 font-semibold"
                >
                  <option value="all">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </Card>

            {/* Candidates Table Grid */}
            <Card className="bg-white border border-slate-200/50 rounded-2xl shadow-2xs overflow-hidden">
              {feedingCandidates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-[#f8fafc] text-slate-500 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">LRN</th>
                        <th className="px-6 py-4">Grade & Section</th>
                        <th className="px-6 py-4">Gender</th>
                        <th className="px-6 py-4">BMI Score</th>
                        <th className="px-6 py-4">Nutritional Status</th>
                        <th className="px-6 py-4">HFA Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {feedingCandidates.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{student.name}</td>
                          <td className="px-6 py-4 text-slate-600 font-mono text-xs font-medium">{student.lrn}</td>
                          <td className="px-6 py-4 text-slate-600 font-medium">
                            {student.gradeLevel} 
                            {student.sectionId ? ` - ${sections.find(s => s.id === student.sectionId)?.name || student.sectionId}` : ''}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border border-opacity-40 ${
                              student.gender === 'Male' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200'
                            }`}>
                              {student.gender}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-slate-700 font-bold font-mono">{student.bmi.toFixed(2)}</td>
                          <td className="px-6 py-4">
                            <Badge 
                              variant="outline" 
                              className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border border-opacity-40 uppercase tracking-wide ${
                                student.nutritionalStatus === 'Severely Wasted' 
                                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {student.nutritionalStatus}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {student.heightForAge ? (
                              <Badge 
                                variant="outline" 
                                className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border border-opacity-40 uppercase tracking-wide ${
                                  student.heightForAge === 'Severely Stunted' || student.heightForAge === 'Stunted'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : student.heightForAge === 'Normal'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                {student.heightForAge}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 font-normal">--</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                    <UserCheck className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h4 className="text-slate-700 font-bold mb-1">No candidates match these criteria</h4>
                  <p className="text-sm text-slate-500">Ensure the search terms or filters are correct, or check if all students are healthy.</p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Tab Content 3: All Student Roster */}
        {activeTab === 'roster' && (
          <div className="space-y-6">
            
            {/* Roster Controls: Multi-Filters */}
            <Card className="bg-white border border-slate-200/50 p-5 rounded-2xl shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                
                {/* Search Bar */}
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by student name or LRN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600 bg-[#f8fafc]/50 placeholder-slate-400"
                  />
                </div>

                <div className="flex gap-2 items-center text-xs font-semibold text-slate-400">
                  <span>Showing {filteredRoster.length} of {allHealthData.length} records</span>
                </div>
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mr-1">
                  <Filter className="w-3.5 h-3.5" />
                  Refine By:
                </div>
                
                {/* Grade */}
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-700 font-semibold"
                >
                  <option value="all">All Grades</option>
                  {uniqueGrades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>

                {/* Section */}
                {normalizeRole(currentUserRole) === 'teacher' ? (
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                    Section: {assignedSectionNames.join(', ')}
                  </span>
                ) : (
                  <select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-700 font-semibold"
                  >
                    <option value="all">All Sections</option>
                    {uniqueSections.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.name}</option>
                    ))}
                  </select>
                )}

                {/* Gender */}
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-700 font-semibold"
                >
                  <option value="all">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>

                {/* Nutritional status filter */}
                <select
                  value={nutritionalFilter}
                  onChange={(e) => setNutritionalFilter(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-700 font-semibold"
                >
                  <option value="all">All BMI Statuses</option>
                  <option value="Severely Wasted">Severely Wasted</option>
                  <option value="Wasted">Wasted</option>
                  <option value="Normal">Normal</option>
                  <option value="Overweight">Overweight</option>
                  <option value="Obese">Obese</option>
                </select>

                {/* Height-for-Age Status filter */}
                <select
                  value={hfaFilter}
                  onChange={(e) => setHfaFilter(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-700 font-semibold"
                >
                  <option value="all">All HFA Statuses</option>
                  <option value="Severely Stunted">Severely Stunted</option>
                  <option value="Stunted">Stunted</option>
                  <option value="Normal">Normal</option>
                  <option value="Tall">Tall</option>
                </select>
              </div>
            </Card>

            {/* Complete Health Data Table */}
            <Card className="bg-white border border-slate-200/50 rounded-2xl shadow-2xs overflow-hidden">
              {filteredRoster.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-[#f8fafc] text-slate-500 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Student Name</th>
                        <th className="px-6 py-4">Grade & Section</th>
                        <th className="px-6 py-4">Gender</th>
                        <th className="px-6 py-4">Age</th>
                        <th className="px-6 py-4">Height (m)</th>
                        <th className="px-6 py-4">Weight (kg)</th>
                        <th className="px-6 py-4">BMI Score</th>
                        <th className="px-6 py-4">Nutritional Status</th>
                        <th className="px-6 py-4">HFA Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRoster.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-800">{student.name}</td>
                          <td className="px-6 py-4 text-slate-600 font-medium">
                            {student.gradeLevel} 
                            {student.sectionId ? ` - ${sections.find(s => s.id === student.sectionId)?.name || student.sectionId}` : ''}
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border border-opacity-40 ${
                              student.gender === 'Male' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200'
                            }`}>
                              {student.gender}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{student.age} yrs</td>
                          <td className="px-6 py-4 text-slate-700 font-mono font-medium">{student.height > 0 ? student.height.toFixed(2) : '--'}</td>
                          <td className="px-6 py-4 text-slate-700 font-mono font-medium">{student.weight > 0 ? student.weight.toFixed(1) : '--'}</td>
                          <td className="px-6 py-4 text-slate-700 font-bold font-mono">{student.bmi > 0 ? student.bmi.toFixed(2) : '--'}</td>
                          <td className="px-6 py-4">
                            {student.nutritionalStatus ? (
                              <Badge 
                                variant="outline" 
                                className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border border-opacity-40 uppercase tracking-wide ${
                                  student.nutritionalStatus === 'Normal' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  student.nutritionalStatus === 'Severely Wasted' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  student.nutritionalStatus === 'Wasted' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  student.nutritionalStatus === 'Overweight' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-violet-50 text-violet-700 border-violet-200'
                                }`}
                              >
                                {student.nutritionalStatus}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 font-normal">--</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {student.heightForAge ? (
                              <Badge 
                                variant="outline" 
                                className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border border-opacity-40 uppercase tracking-wide ${
                                  student.heightForAge === 'Severely Stunted' || student.heightForAge === 'Stunted'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : student.heightForAge === 'Normal'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                {student.heightForAge}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 font-normal">--</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                    <Users className="w-8 h-8 text-slate-300" />
                  </div>
                  <h4 className="text-slate-700 font-bold mb-1">No Student Profiles Found</h4>
                  <p className="text-sm text-slate-500">We couldn't find any students matching your criteria.</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
