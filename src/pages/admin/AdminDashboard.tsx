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
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  GraduationCap,
  LogOut,
  Megaphone,
  CalendarDays,
  ClipboardList,
  Clock } from 'lucide-react';
import { ManageAnnouncementsView } from '../../components/shared/ManageAnnouncementsView';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/Sheet';
import { AdminDataProvider, useAdminData } from '../../lib/adminData';
import { DashboardView } from '../../modules/admin/DashboardView';
import { UsersView } from '../../modules/admin/UsersView';
import { ClassroomsView } from '../../modules/admin/ClassroomsView';
import { SubjectsView } from '../../modules/admin/SubjectsView';
import { ReportsView } from '../../modules/admin/ReportsView';
import { SF10Module } from '../../modules/admin/SF10Module';
import { SetupWizard } from '../../modules/admin/SetupWizard';
import { HealthDashboardView } from '../../modules/admin/HealthDashboardView';
import { StudentsView } from '../../modules/admin/StudentsView';
import { AttendanceView } from '../../modules/admin/AttendanceView';
import { SchedulesView } from '../../modules/admin/SchedulesView';
import { AdminGradesView } from '../../components/admin/AdminGradesView';
import { AdminSettingsView } from '../../modules/admin/AdminSettingsView';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';

function AdminDashboardContent() {
  const navigate = useNavigate();
  const { setupComplete, users, sections } = useAdminData();
  const { role, user, userData } = useAuth();
  const uData = userData as { firstName?: string; lastName?: string; [key: string]: any } | null;
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (!setupComplete) {
    return <SetupWizard />;
  }

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
      case 'dashboard': return <DashboardView />;
      case 'users': return <UsersView />;
      case 'students': return <StudentsView />;
      case 'classrooms': return <ClassroomsView />;
      case 'subjects': return <SubjectsView />;
      case 'attendance': return <AttendanceView />;
      case 'academic': return <AdminGradesView />;
      case 'schedules': return <SchedulesView />;
      case 'health': return <HealthDashboardView />;
      case 'announcements': return <ManageAnnouncementsView teachers={users.filter(u => u.role?.toLowerCase() === 'teacher')} sections={sections} />;
      case 'reports': return <ReportsView />;
      case 'sf10': return <SF10Module isAdmin={true} />;
      case 'settings': return <AdminSettingsView />;
      default: return <DashboardView />;
    }
  };

  const initials = uData?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'A';
  const fullName = uData?.firstName ? `${uData.firstName} ${uData.lastName || ''}` : 'Admin User';
  const displayRole = role || 'Admin';

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const collapsed = isMobile ? false : sidebarCollapsed;
    return (
      <div className="flex flex-col h-full bg-white font-sans overflow-x-hidden">
        {/* Brand Header */}
        <div className="h-[72px] border-b border-slate-200 flex items-center px-4 shrink-0 overflow-hidden relative">
          <div className="p-1.5 bg-primary/5 rounded-xl border border-primary/10 shadow-sm shrink-0 transition-all duration-200">
            <img src="/pasted-image.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
          </div>

          <div className={`ml-3 flex flex-col text-left overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${collapsed ? 'w-0 opacity-0' : 'w-36 opacity-100'}`}>
            <span className="font-extrabold text-sm text-slate-800 tracking-tight leading-none">Sta. Maria</span>
            <span className="text-[10px] font-bold text-[#D8232A] uppercase tracking-widest leading-none mt-1 truncate">Admin Portal</span>
          </div>
        </div>

        {/* Nav Menu Items */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar ${collapsed ? 'py-4 px-2 space-y-3' : 'py-5 px-3 space-y-5'}`}>
          {/* Toggle button row — below header dividing line, above nav items */}
          {!isMobile && (
            <div className={`mb-2 ${collapsed ? 'px-1' : ''}`}>
              <button
                onClick={toggleSidebar}
                className="w-full flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer relative group rounded-xl border border-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-200"
                title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {collapsed ? <PanelLeftOpen className="w-4.5 h-4.5" /> : <PanelLeftClose className="w-4.5 h-4.5" />}
                </div>
                {!collapsed && (
                  <span className="ml-3.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 group-hover:text-slate-600">
                    Collapse
                  </span>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                    Expand Sidebar
                  </div>
                )}
              </button>
            </div>
          )}
          {['Home', 'General Management', 'Student Management', 'Documents'].map((category) => (
            <div key={category} className={collapsed ? "space-y-1" : "space-y-2"}>
              {!collapsed && (
                <div className="px-2 text-[10px] font-extrabold uppercase tracking-widest leading-none mb-1 text-[#D32F2F]">
                  {category}
                </div>
              )}
              <div className="space-y-1">
                {navItems.filter(item => item.category === category).map(item => {
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveView(item.id); setMobileOpen(false); }}
                      className={`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border ${
                        collapsed ? 'justify-center p-2.5' : 'px-3 py-2'
                      } text-sm ${
                        isActive 
                          ? 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs' 
                          : 'border-transparent text-slate-600 hover:bg-[#D32F2F]/5 hover:text-[#D32F2F] hover:border-[#D32F2F]/40 font-medium'
                      }`}
                    >
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        <item.icon className={`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 ${isActive ? 'text-[#D32F2F]' : 'text-slate-400 group-hover:text-[#D32F2F]'}`} />
                      </div>
                      <div className={`${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100`}>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {collapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                          {item.label}
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
        <div className="h-20 border-t border-slate-100 px-3 flex items-center shrink-0 relative bg-white">
          {showUserMenu && (
            <div className={`absolute ${collapsed ? 'left-full ml-3 bottom-2 w-48' : 'bottom-20 left-3 right-3'} bg-white border border-slate-200/60 p-2 rounded-2xl shadow-xl space-y-1 animate-in fade-in-50 duration-200 z-50 backdrop-blur-md`}>
              <button 
                onClick={() => { setActiveView('settings'); setShowUserMenu(false); }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition-all"
              >
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
            className="w-full flex items-center px-2.5 py-2 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-2xl cursor-pointer transition-all active:scale-98 relative group overflow-hidden"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20 shadow-inner">{initials}</div>
            <div className={`ml-2.5 flex-1 min-w-0 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <div className="flex flex-col text-left overflow-hidden min-w-0">
                <p className="text-xs font-black truncate text-slate-800 leading-tight" title={fullName}>{fullName}</p>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate mt-0.5">{displayRole}</p>
              </div>
              {showUserMenu ? (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              )}
            </div>
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
      <aside className={`hidden lg:flex ${sidebarCollapsed ? 'w-20' : 'w-64'} border-r border-slate-200 bg-white flex-col shrink-0 transition-[width] duration-300 ease-in-out`}>
        <SidebarContent />
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden h-14 border-b border-slate-200 bg-white px-5 flex items-center justify-between shrink-0 shadow-sm">
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
            Admin Portal
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

export function AdminDashboard() {
  return (
    <AdminDataProvider>
      <AdminDashboardContent />
    </AdminDataProvider>
  );
}
