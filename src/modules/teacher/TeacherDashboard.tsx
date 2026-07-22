import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  FileText,
  Settings,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Menu,
  LogOut
} from
  'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/Sheet';
import { TeacherDataProvider, useTeacherData } from '../../lib/teacherData';
import { TeacherDashboardView } from '../../components/teacher/TeacherDashboardView';
import { EnrollmentsView } from '../../components/teacher/EnrollmentsView';
import { StudentsView } from '../../components/teacher/StudentsView';
import { AttendanceView } from '../../components/teacher/AttendanceView';
import { GradesView } from '../../components/teacher/GradesView';
import { TeacherReportsView } from '../../components/teacher/TeacherReportsView';
import { ObservedValuesView } from '../../components/teacher/ObservedValuesView';
import { MyScheduleView } from '../../components/teacher/MyScheduleView';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { Heart } from 'lucide-react';

function TeacherDashboardContent() {
  const navigate = useNavigate();
  const { students, assignedSections, currentSection, setCurrentSection } = useTeacherData();
  const { userData } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const uData = userData as Record<string, string> | null;
  const initials = uData ? `${uData.firstName?.charAt(0) || ''}${uData.lastName?.charAt(0) || ''}`.toUpperCase() : 'T';
  const fullName = uData ? `${uData.firstName} ${uData.lastName}` : 'Teacher';
  const userRole = uData?.role || 'teacher';
  const pendingCount = students.filter((s) => s.status === 'Pending').length;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Home' },
    { id: 'enrollments', label: 'Enrollments', icon: UserCheck, category: 'Classroom', badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'students', label: 'Students', icon: Users, category: 'Classroom' },
    { id: 'attendance', label: 'Attendance', icon: Calendar, category: 'Classroom' },
    { id: 'schedule', label: 'My Schedule', icon: Calendar, category: 'Classroom' },
    { id: 'grades', label: 'Grades', icon: ClipboardList, category: 'Classroom' },
    { id: 'observed-values', label: 'Observed Values', icon: Heart, category: 'Classroom' },
    { id: 'reports', label: 'Reports (SF1, SF2, SF5, SF8, SF9)', icon: FileText, category: 'Documents' }
  ];

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard': return <TeacherDashboardView />;
      case 'enrollments': return <EnrollmentsView />;
      case 'students': return <StudentsView />;
      case 'attendance': return <AttendanceView />;
      case 'schedule': return <MyScheduleView />;
      case 'grades': return <GradesView />;
      case 'observed-values': return <ObservedValuesView />;
      case 'reports': return <TeacherReportsView />;
      default: return <TeacherDashboardView />;
    }
  };

  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center justify-between px-6 border-b border-border shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/pasted-image.jpg" alt="Logo" className="w-8 h-8 rounded-md object-cover" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none">Sta. Maria</span>
            <span className="text-xs text-muted-foreground leading-none mt-1">Teacher Portal</span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground hidden lg:block" />
      </div>

      {assignedSections.length > 1 && (
        <div className="px-6 py-4 border-b border-border bg-slate-50/50 shrink-0">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
            Select Section
          </label>
          <div className="relative">
            <select
              value={currentSection}
              onChange={(e) => setCurrentSection(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2 text-sm font-medium rounded-md border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-700"
            >
              {assignedSections.map(s => (
                <option key={s.sectionId} value={s.sectionId}>
                  {s.gradeLevel} - {s.name} ({s.isAdvisor ? 'Adviser' : 'Subject'})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        {['Home', 'Classroom', 'Documents'].map((category) => (
          <div key={category}>
            <p className="px-3 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{category}</p>
            <div className="space-y-1">
              {navItems.filter(item => item.category === category).map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveView(item.id); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeView === item.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {item.badge && <Badge className="bg-orange-100 text-orange-700 border-none text-xs px-1.5 py-0 h-5 shrink-0">{item.badge}</Badge>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3 shrink-0">
        {showUserMenu && (
          <div className="mb-2 space-y-1 animate-in slide-in-from-bottom-2 duration-200">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-md transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
        <div
          className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">{initials}</div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate text-slate-900">{fullName}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">{userRole as string}</p>
          </div>
          {showUserMenu ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden font-sans p-3 sm:p-4 gap-4">
      <aside className="hidden lg:flex w-64 border border-slate-200 rounded-2xl bg-white flex-col shrink-0 shadow-sm overflow-hidden relative">
        <SidebarContent />
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm relative">
        <header className="lg:hidden h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 font-semibold text-sm">
            <img src="/pasted-image.jpg" alt="Logo" className="w-6 h-6 rounded-md object-cover" />
            Teacher Portal
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">{initials}</div>
        </header>
        <div className="flex-1 overflow-hidden flex flex-col">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}

export function TeacherDashboard() {
  return (
    <TeacherDataProvider>
      <TeacherDashboardContent />
    </TeacherDataProvider>
  );
}
