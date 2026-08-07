import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  Settings,
  Home,
  ChevronDown,
  ChevronRight,
  Menu,
  CalendarDays,
  Clock,
  ClipboardList,
  Megaphone,
  GraduationCap,
  Heart
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/Sheet';
import { AdminDataProvider, useAdminData } from '../lib/adminData';
import { useAuth } from '../lib/AuthContext';
import { DashboardView } from '../components/admin/DashboardView';
import { UsersView } from '../components/admin/UsersView';
import { ClassroomsView } from '../components/admin/ClassroomsView';
import { SubjectsView } from '../components/admin/SubjectsView';
import { ReportsView } from '../components/admin/ReportsView';
import { SetupWizard } from '../components/admin/SetupWizard';
import { AttendanceView } from '../components/admin/AttendanceView';

function AdminDashboardContent() {
  const navigate = useNavigate();
  const { setupComplete } = useAdminData();
  const { role } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!setupComplete) {
    return <SetupWizard />;
  }
  const navItems = [
    // Home
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Home' },
    { id: 'announcements', label: 'Announcement', icon: Megaphone, category: 'Home' },

    // General Management
    ...(role?.toLowerCase() !== 'subadmin' ? [{ id: 'users', label: 'Users', icon: Users, category: 'General Management' }] : []),
    { id: 'schedules', label: 'Teachers Load', icon: Clock, category: 'General Management' },
    { id: 'classrooms', label: 'Classroom', icon: Home, category: 'General Management' },
    { id: 'subjects', label: 'Subject', icon: BookOpen, category: 'General Management' },

    // Student Management
    { id: 'students', label: 'Students', icon: GraduationCap, category: 'Student Management' },
    { id: 'attendance', label: 'Attendance', icon: CalendarDays, category: 'Student Management' },
    { id: 'academic', label: 'Master Sheet', icon: ClipboardList, category: 'Student Management' },
    { id: 'health', label: 'Health & nutrition', icon: Heart, category: 'Student Management' },

    // Documents
    { id: 'reports', label: 'School Forms', icon: FileText, category: 'Documents' },
    { id: 'sf10', label: 'Permanent Record (SF10)', icon: FileText, category: 'Documents' }
  ];


  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'users':
        return <UsersView />;
      case 'classrooms':
        return <ClassroomsView />;
      case 'subjects':
        return <SubjectsView />;
      case 'attendance':
        return <AttendanceView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <DashboardView />;
    }
  };
  const SidebarContent = () =>
  <>
      <div className="h-16 flex items-center justify-between px-6 shrink-0">
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
              Admin Portal
            </span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground hidden lg:block" />
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        {['Home', 'General Management', 'Student Management', 'Documents'].map((category) =>
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
            
                    <item.icon className="w-4 h-4" />
                    {item.label}
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
            AU
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">Admin User</p>
            <p className="text-xs text-muted-foreground truncate">
              admin@school.edu
            </p>
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
            
            Admin Portal
          </div>

          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
            AU
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-muted/30">
          {renderActiveView()}
        </div>
      </main>
    </div>);

}
export function AdminDashboard() {
  return (
    <AdminDataProvider>
      <AdminDashboardContent />
    </AdminDataProvider>);

}