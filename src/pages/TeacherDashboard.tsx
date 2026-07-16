import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
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
  Menu } from
'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/Sheet';
import { TeacherDataProvider, useTeacherData } from '../lib/teacherData';
import { TeacherDashboardView } from '../components/teacher/TeacherDashboardView';
import { EnrollmentsView } from '../components/teacher/EnrollmentsView';
import { StudentsView } from '../components/teacher/StudentsView';
import { AttendanceView } from '../components/teacher/AttendanceView';
import { GradesView } from '../components/teacher/GradesView';
import { TeacherReportsView } from '../components/teacher/TeacherReportsView';
function TeacherDashboardContent() {
  const navigate = useNavigate();
  const { students } = useTeacherData();
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const pendingCount = students.filter((s) => s.status === 'Pending').length;
  const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    category: 'Home'
  },
  {
    id: 'enrollments',
    label: 'Enrollments',
    icon: UserCheck,
    category: 'Classroom',
    badge: pendingCount > 0 ? pendingCount : undefined
  },
  {
    id: 'students',
    label: 'Students',
    icon: Users,
    category: 'Classroom'
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: Calendar,
    category: 'Classroom'
  },
  {
    id: 'grades',
    label: 'Grades',
    icon: ClipboardList,
    category: 'Classroom'
  },
  {
    id: 'reports',
    label: 'Reports (SF1, SF2, SF5, SF8, SF9)',
    icon: FileText,
    category: 'Documents'
  }];

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <TeacherDashboardView />;
      case 'enrollments':
        return <EnrollmentsView />;
      case 'students':
        return <StudentsView />;
      case 'attendance':
        return <AttendanceView />;
      case 'grades':
        return <GradesView />;
      case 'reports':
        return <TeacherReportsView />;
      default:
        return <TeacherDashboardView />;
    }
  };
  const SidebarContent = () =>
  <>
      <div className="h-16 flex items-center justify-between px-6 border-b border-border shrink-0">
        <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => navigate('/')}>
        
          <img
          src="/pasted-image.jpg"
          alt="Logo"
          className="w-8 h-8 rounded-md object-cover" />
        
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none">
              Sta. Maria
            </span>
            <span className="text-xs text-muted-foreground leading-none mt-1">
              Teacher Portal
            </span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground hidden lg:block" />
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        {['Home', 'Classroom', 'Documents'].map((category) =>
      <div key={category}>
            <p className="px-3 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              {category}
            </p>
            <div className="space-y-1">
              {navItems.
          filter((item) => item.category === category).
          map((item) =>
          <button
            key={item.id}
            onClick={() => {
              setActiveView(item.id);
              setMobileOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeView === item.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
            
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left truncate">
                      {item.label}
                    </span>
                    {item.badge &&
            <Badge className="bg-orange-100 text-orange-700 border-none text-xs px-1.5 py-0 h-5 shrink-0">
                        {item.badge}
                      </Badge>
            }
                  </button>
          )}
            </div>
          </div>
      )}
      </div>

      <div className="border-t border-border p-3 shrink-0">
        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-md transition-colors mb-2">
          <Settings className="w-4 h-4" />
          Settings
        </button>

        <div
        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
        onClick={() => navigate('/')}>
        
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
            MS
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">Maria Santos</p>
            <p className="text-xs text-muted-foreground truncate">Teacher</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </div>
    </>;

  return (
    <div className="flex h-screen w-full bg-muted/30 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Top Bar */}
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
            <img
              src="/pasted-image.jpg"
              alt="Logo"
              className="w-6 h-6 rounded-md object-cover" />
            
            Teacher Portal
          </div>

          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
            MS
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-muted/30">
          {renderActiveView()}
        </div>
      </main>
    </div>);

}
export function TeacherDashboard() {
  return (
    <TeacherDataProvider>
      <TeacherDashboardContent />
    </TeacherDataProvider>);

}