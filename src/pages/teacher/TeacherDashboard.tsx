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
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Megaphone,
  LogOut } from 'lucide-react';
import { ManageAnnouncementsView } from '../../components/shared/ManageAnnouncementsView';
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
  const { students, assignedSections } = useTeacherData();
  const { userData } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('teacher_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('teacher_sidebar_collapsed', String(next));
      return next;
    });
  };
  
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
    { id: 'announcements', label: 'Announcements', icon: Megaphone, category: 'Classroom' },
    { id: 'reports', label: 'Reports (SF1, SF2, SF5...)', icon: FileText, category: 'Documents' }
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
      case 'announcements': return <ManageAnnouncementsView sections={assignedSections} students={students} />;
      case 'reports': return <TeacherReportsView />;
      default: return <TeacherDashboardView />;
    }
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const collapsed = isMobile ? false : sidebarCollapsed;
    return (
      <div className="flex flex-col h-full bg-white font-sans overflow-x-hidden">
        {/* Brand Header */}
        <div className={`h-16 lg:h-28 flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-6'} border-b border-slate-100 shrink-0 cursor-pointer overflow-hidden`} onClick={() => setActiveView('dashboard')}>
          <div className="p-1.5 bg-primary/5 rounded-xl border border-primary/10 shadow-sm shrink-0">
            <img src="/pasted-image.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
          </div>
          {!collapsed && (
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-sm text-slate-800 tracking-tight leading-none">Sta. Maria</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mt-1">Teacher Portal</span>
            </div>
          )}
        </div>

        {/* Nav Menu Items */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar ${collapsed ? 'py-4 px-2 space-y-4' : 'py-5 px-4 space-y-5'}`}>
          {/* Toggle Button row above category */}
          {!isMobile && (
            <div className={`flex items-center ${collapsed ? 'justify-center mb-2' : 'justify-between px-4 mb-2'}`}>
              {!collapsed && (
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Collapse</span>
              )}
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer shrink-0 relative group"
                title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {collapsed ? <PanelLeftOpen className="w-4.5 h-4.5 text-slate-500" /> : <PanelLeftClose className="w-4.5 h-4.5" />}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                    Expand Sidebar
                  </div>
                )}
              </button>
            </div>
          )}

          {['Home', 'Classroom', 'Documents'].map((category) => (
            <div key={category} className="space-y-2">
              {!collapsed ? (
                <p className="px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">{category}</p>
              ) : (
                <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider text-center mb-1 select-none">{category.substring(0, 4)}</div>
              )}
              <div className="space-y-1">
                {navItems.filter(item => item.category === category).map(item => {
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveView(item.id); setMobileOpen(false); }}
                      className={`w-full flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-2.5'} text-sm transition-all duration-200 cursor-pointer relative group ${
                        isActive 
                          ? collapsed 
                            ? 'bg-primary/10 text-primary font-bold rounded-xl shadow-xs' 
                            : 'bg-primary/5 text-primary border border-primary/10 font-bold shadow-sm rounded-xl'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium rounded-xl'
                      }`}
                    >
                      <item.icon className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                      {!collapsed && item.badge && (
                        <Badge className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0">
                          {item.badge}
                        </Badge>
                      )}
                      {collapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl flex items-center gap-2">
                          {item.label}
                          {item.badge && (
                            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User settings & Profile bar at bottom */}
        <div className={`h-24 border-t border-slate-100 ${collapsed ? 'p-2' : 'px-4'} flex items-center shrink-0 relative bg-white`}>
          {showUserMenu && (
            <div className={`absolute ${collapsed ? 'left-full ml-3 bottom-2 w-48' : 'bottom-20 left-4 right-4'} bg-white border border-slate-200/60 p-2 rounded-2xl shadow-xl space-y-1 animate-in fade-in-50 duration-200 z-50 backdrop-blur-md`}>
              <button className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-all">
                <Settings className="w-4 h-4 text-slate-400" />
                Settings
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Sign Out
              </button>
            </div>
          )}
          <div 
            className={`w-full flex items-center ${collapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2'} hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-2xl cursor-pointer transition-all active:scale-98 relative group overflow-hidden`}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20 shadow-inner">{initials}</div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 overflow-hidden text-left">
                  <p className="text-xs font-black truncate text-slate-800 leading-tight" title={fullName}>{fullName}</p>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate mt-0.5">{userRole}</p>
                </div>
                {showUserMenu ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </>
            )}
            {collapsed && (
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                {fullName}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-slate-50/50 overflow-hidden font-sans">
      <aside className={`hidden lg:flex ${sidebarCollapsed ? 'w-20' : 'w-64'} border-r border-slate-200/60 bg-white flex-col shrink-0 transition-all duration-300 ease-in-out`}>
        <SidebarContent />
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden h-16 border-b border-slate-150 bg-white px-4 flex items-center justify-between shrink-0 shadow-sm">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2 hover:bg-slate-100 rounded-xl">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col bg-white border-0">
              <SidebarContent isMobile={true} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2.5 font-bold text-sm text-slate-800">
            <div className="p-1 bg-primary/5 rounded-lg border border-primary/10 shadow-sm shrink-0">
              <img src="/pasted-image.jpg" alt="Logo" className="w-5 h-5 rounded-md object-cover" />
            </div>
            Teacher Portal
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20 shadow-sm">{initials}</div>
        </header>
        <div className="flex-1 overflow-hidden bg-slate-50/50">
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
