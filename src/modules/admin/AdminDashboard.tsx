import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Settings,
  Home,
  Heart,
  ChevronDown,
  ChevronRight,
  Menu,
  GraduationCap,
  LogOut,
  CalendarDays
} from
  'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/Sheet';
import { AdminDataProvider, useAdminData } from '../../lib/adminData';
import { DashboardView } from '../../components/admin/DashboardView';
import { UsersView } from '../../components/admin/UsersView';
import { ClassroomsView } from '../../components/admin/ClassroomsView';
import { SubjectsView } from '../../components/admin/SubjectsView';
import { ReportsView } from '../../components/admin/ReportsView';
import { SetupWizard } from '../../components/admin/SetupWizard';
import { HealthDashboardView } from '../../components/admin/HealthDashboardView';
import { StudentsView } from '../../components/admin/StudentsView';
import { AttendanceView } from '../../components/admin/AttendanceView';
import { SchedulesView } from '../../components/admin/SchedulesView';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';

function AdminDashboardContent() {
  const navigate = useNavigate();
  const { setupComplete } = useAdminData();
  const { role, user, userData } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (!setupComplete) {
    return <SetupWizard />;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'System' },
    ...(role?.toLowerCase() !== 'subadmin' ? [{ id: 'users', label: 'Users', icon: Users, category: 'Management' }] : []),
    { id: 'students', label: 'Students', icon: GraduationCap, category: 'Management' },
    { id: 'classrooms', label: 'Classrooms', icon: Home, category: 'Management' },
    { id: 'subjects', label: 'Subjects', icon: BookOpen, category: 'Management' },
    { id: 'attendance', label: 'Attendance', icon: CalendarDays, category: 'Management' },
    { id: 'schedules', label: 'Faculty Teaching Load', icon: CalendarDays, category: 'Management' },
    { id: 'health', label: 'Health & Nutrition', icon: Heart, category: 'Management' },
    { id: 'reports', label: 'Reports (SF1, SF2, SF4, SF8)', icon: FileText, category: 'Documents' }
  ];

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView />;
      case 'users': return <UsersView />;
      case 'students': return <StudentsView />;
      case 'classrooms': return <ClassroomsView />;
      case 'subjects': return <SubjectsView />;
      case 'attendance': return <AttendanceView />;
      case 'schedules': return <SchedulesView />;
      case 'health': return <HealthDashboardView />;
      case 'reports': return <ReportsView />;
      default: return <DashboardView />;
    }
  };

  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center justify-between px-6 border-b border-border shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/pasted-image.jpg" alt="Logo" className="w-8 h-8 rounded-md object-cover" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none">Sta. Maria</span>
            <span className="text-xs text-muted-foreground leading-none mt-1">Admin Portal</span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground hidden lg:block" />
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        {['System', 'Management', 'Documents'].map((category) => (
          <div key={category}>
            <p className="px-3 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{category}</p>
            <div className="space-y-1">
              {navItems.filter(item => item.category === category).map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveView(item.id); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeView === item.id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
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
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
            {userData?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate text-slate-900">
              {userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}` : 'Admin User'}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground truncate">
              {user?.email || 'admin@school.edu'}
            </p>
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
            Admin Portal
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
            {userData?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'A'}
          </div>
        </header>
        <div className="flex-1 overflow-hidden flex flex-col">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
}

export function AdminDashboard() {
  return (
    <AdminDataProvider>
      <AdminDashboardContent />
    </AdminDataProvider>
  );
}
