import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Clock,
  Sparkles
} from 'lucide-react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationBell } from '../../components/shared/NotificationBell';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

interface AdminSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  role?: string | null;
  user: any;
  userData: any;
  onLogout: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
  navItems: NavItem[];
}

const AdminSidebar: React.FC<AdminSidebarProps> = React.memo(({
  activeView,
  setActiveView,
  sidebarCollapsed,
  toggleSidebar,
  role,
  user,
  userData,
  onLogout,
  isMobile = false,
  onCloseMobile,
  navItems
}) => {
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollPositionRef = useRef<number>(0);

  const collapsed = isMobile ? false : sidebarCollapsed;

  // Handle scroll events and preserve scroll position
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      savedScrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  }, []);

  // Restore scroll position whenever component updates or active view changes
  useEffect(() => {
    if (scrollContainerRef.current && savedScrollPositionRef.current > 0) {
      scrollContainerRef.current.scrollTop = savedScrollPositionRef.current;
    }
  }, [activeView, collapsed]);

  const initials = userData?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'A';
  const fullName = userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : 'Admin User';
  const displayRole = role || 'Administrator';

  const categories = ['Home', 'General Management', 'Student Management', 'Documents'];

  return (
    <div className="flex flex-col h-full bg-white font-sans select-none overflow-hidden relative border-r border-slate-200/80">
      {/* Brand Header */}
      <div className="h-[72px] border-b border-slate-200/80 flex items-center px-4 shrink-0 overflow-hidden relative">
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-50 to-red-100/60 p-1.5 border border-red-200/60 shadow-xs shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <img src="/pasted-image.jpg" alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
          </div>

          <div
            className={`flex flex-col text-left overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              collapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-36 opacity-100'
            }`}
          >
            <span className="font-extrabold text-sm text-slate-900 tracking-tight leading-none">
              Sta. Maria
            </span>
            <span className="text-[10px] font-bold text-[#D8232A] uppercase tracking-widest leading-none mt-1 truncate">
              Admin Portal
            </span>
          </div>
        </div>
      </div>

      {/* Independent Scrollable Navigation Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar ${
          collapsed ? 'py-4 px-2.5 space-y-4' : 'py-5 px-3.5 space-y-6'
        }`}
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Toggle Collapse Button Row */}
        {!isMobile && (
          <div className="mb-1">
            <button
              onClick={toggleSidebar}
              className={`w-full flex items-center ${
                collapsed ? 'justify-center h-10 px-0' : 'h-10 px-3'
              } text-xs font-bold transition-all duration-200 cursor-pointer relative group rounded-2xl border border-transparent text-slate-400 hover:bg-slate-100/80 hover:text-slate-700 hover:border-slate-200 active:scale-95`}
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <div className="w-6 h-6 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
                {collapsed ? (
                  <PanelLeftOpen className="w-4.5 h-4.5 text-slate-500 group-hover:text-[#D8232A]" />
                ) : (
                  <PanelLeftClose className="w-4.5 h-4.5 text-slate-500 group-hover:text-[#D8232A]" />
                )}
              </div>

              {!collapsed && (
                <span className="ml-3 text-[11px] font-bold tracking-wider text-slate-500 group-hover:text-slate-800 transition-colors uppercase">
                  Collapse Sidebar
                </span>
              )}

              {/* Tooltip on Collapsed State */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap border border-slate-700/50">
                  Expand Sidebar
                </div>
              )}
            </button>
          </div>
        )}

        {/* Navigation Categories */}
        {categories.map((category) => {
          const categoryItems = navItems.filter((item) => item.category === category);
          if (categoryItems.length === 0) return null;

          return (
            <div key={category} className="space-y-1.5">
              {/* Category Heading Header */}
              <div
                className={`overflow-hidden transition-all duration-200 ease-in-out ${
                  collapsed ? 'max-h-0 opacity-0 mb-0 pointer-events-none' : 'max-h-6 opacity-100 px-3 mb-1.5'
                }`}
              >
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#D8232A] leading-none">
                  {category}
                </p>
              </div>

              {/* Navigation Items List */}
              <div className="space-y-1">
                {categoryItems.map((item) => {
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveView(item.id);
                        if (isMobile && onCloseMobile) {
                          onCloseMobile();
                        }
                      }}
                      className={`w-full flex items-center transition-all duration-150 cursor-pointer relative group rounded-2xl ${
                        collapsed ? 'justify-center h-11 w-11 mx-auto' : 'h-11 px-3'
                      } ${
                        isActive
                          ? 'bg-gradient-to-r from-red-500/10 via-red-500/8 to-transparent text-[#D8232A] border border-red-200 font-bold shadow-2xs'
                          : 'border border-transparent text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 font-semibold'
                      }`}
                    >
                      {/* Active Indicator Left Accent Bar */}
                      {isActive && !collapsed && (
                        <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#D8232A] rounded-r-full shadow-sm" />
                      )}

                      {/* Icon */}
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <item.icon
                          className={`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-110 ${
                            isActive ? 'text-[#D8232A]' : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                      </div>

                      {/* Label in Expanded State */}
                      <div
                        className={`flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out ${
                          collapsed ? 'w-0 opacity-0 ml-0 pointer-events-none' : 'w-auto opacity-100 ml-3'
                        }`}
                      >
                        <span className="text-xs tracking-tight truncate">{item.label}</span>
                        {isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#D8232A] shrink-0" />
                        )}
                      </div>

                      {/* Floating Tooltip in Collapsed State */}
                      {collapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 backdrop-blur-sm text-white text-xs font-bold rounded-xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50 whitespace-nowrap flex items-center gap-2 border border-slate-700/50">
                          <span>{item.label}</span>
                          <span className="text-[9px] uppercase tracking-wider text-red-300 font-extrabold bg-white/10 px-1.5 py-0.5 rounded-md">
                            {item.category}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Profile Bar at Bottom */}
      <div className="h-[76px] border-t border-slate-200/80 px-3 flex items-center shrink-0 relative bg-white">
        {showUserMenu && (
          <div
            className={`absolute ${
              collapsed ? 'left-full ml-3 bottom-2 w-52' : 'bottom-20 left-3 right-3'
            } bg-white border border-slate-200/90 p-2 rounded-2xl shadow-xl space-y-1 animate-in fade-in-50 slide-in-from-bottom-2 duration-150 z-50 backdrop-blur-md`}
          >
            <button
              onClick={() => {
                setActiveView('settings');
                setShowUserMenu(false);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 rounded-xl transition-all"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Settings
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              Sign Out
            </button>
          </div>
        )}

        <div
          className={`w-full flex items-center ${
            collapsed ? 'justify-center px-1' : 'px-2.5'
          } py-2 hover:bg-slate-100/70 border border-transparent hover:border-slate-200/60 rounded-2xl cursor-pointer transition-all active:scale-98 relative group overflow-hidden`}
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#D8232A] to-[#f87171] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
            {initials}
          </div>

          <div
            className={`flex-1 min-w-0 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out ${
              collapsed ? 'w-0 opacity-0 ml-0 pointer-events-none' : 'w-auto opacity-100 ml-3'
            }`}
          >
            <div className="flex flex-col text-left overflow-hidden min-w-0">
              <p className="text-xs font-bold truncate text-slate-900 leading-tight" title={fullName}>
                {fullName}
              </p>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate mt-0.5">
                {displayRole}
              </p>
            </div>
            {showUserMenu ? (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            )}
          </div>

          {collapsed && (
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl border border-slate-700/50">
              {fullName} ({displayRole})
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

AdminSidebar.displayName = 'AdminSidebar';

function AdminDashboardContent() {
  const navigate = useNavigate();
  const { setupComplete, users, sections } = useAdminData();
  const { role, user, userData } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!setupComplete) {
    return <SetupWizard />;
  }

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('admin_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems: NavItem[] = [
    // Home
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Home' },
    { id: 'announcements', label: 'Announcement', icon: Megaphone, category: 'Home' },

    // General Management
    ...(role?.toLowerCase() !== 'subadmin'
      ? [{ id: 'users', label: 'Users', icon: Users, category: 'General Management' }]
      : []),
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
        return <DashboardView onNavigate={setActiveView} />;
      case 'users':
        return <UsersView />;
      case 'students':
        return <StudentsView />;
      case 'classrooms':
        return <ClassroomsView />;
      case 'subjects':
        return <SubjectsView />;
      case 'attendance':
        return <AttendanceView />;
      case 'academic':
        return <AdminGradesView />;
      case 'schedules':
        return <SchedulesView />;
      case 'health':
        return <HealthDashboardView />;
      case 'announcements':
        return (
          <ManageAnnouncementsView
            teachers={(users || []).filter((u) => u.role?.toLowerCase() === 'teacher')}
            sections={sections || []}
          />
        );
      case 'reports':
        return <ReportsView />;
      case 'sf10':
        return <SF10Module isAdmin={true} />;
      case 'settings':
        return <AdminSettingsView />;
      default:
        return <DashboardView onNavigate={setActiveView} />;
    }
  };

  const uData = userData as { firstName?: string; lastName?: string; [key: string]: any } | null;
  const initials = uData?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'A';

  return (
    <div className="flex h-screen w-full bg-slate-50/50 overflow-hidden font-sans">
      {/* Desktop Persistent Sticky Sidebar */}
      <aside
        className={`hidden lg:flex ${
          sidebarCollapsed ? 'w-[76px]' : 'w-64'
        } h-screen flex-col shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] sticky top-0 z-30`}
      >
        <AdminSidebar
          activeView={activeView}
          setActiveView={setActiveView}
          sidebarCollapsed={sidebarCollapsed}
          toggleSidebar={toggleSidebar}
          role={role}
          user={user}
          userData={userData}
          onLogout={handleLogout}
          navItems={navItems}
        />
      </aside>

      {/* Main Dashboard Workspace (Independent Scroll Container) */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Top Header */}
        <header className="lg:hidden h-14 border-b border-slate-200 bg-white px-5 flex items-center justify-between shrink-0 shadow-sm z-20">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2 hover:bg-slate-100 rounded-xl">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col bg-white border-0">
              <AdminSidebar
                activeView={activeView}
                setActiveView={setActiveView}
                sidebarCollapsed={false}
                toggleSidebar={() => {}}
                role={role}
                user={user}
                userData={userData}
                onLogout={handleLogout}
                isMobile={true}
                onCloseMobile={() => setMobileOpen(false)}
                navItems={navItems}
              />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2.5 font-bold text-sm text-slate-800">
            Admin Portal
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell onNavigate={setActiveView} />
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D8232A] to-[#f87171] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              {initials}
            </div>
          </div>
        </header>

        {/* View Transition Area */}
        <div className="flex-1 overflow-hidden bg-slate-50/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="h-full w-full overflow-hidden"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
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
