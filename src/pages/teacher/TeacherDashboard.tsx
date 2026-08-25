import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  LogOut,
  Home,
  CalendarDays,
  Heart,
  AlertTriangle
} from 'lucide-react';
import { ManageAnnouncementsView } from '../../components/shared/ManageAnnouncementsView';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/Sheet';
import { TeacherDataProvider, useTeacherData } from '../../lib/teacherData';
import { TeacherDashboardView } from '../../components/teacher/TeacherDashboardView';
import { TeacherSettingsView } from '../../modules/teacher/TeacherSettingsView';
import { EnrollmentsView } from '../../components/teacher/EnrollmentsView';
import { StudentsView } from '../../components/teacher/StudentsView';
import { AttendanceView } from '../../components/teacher/AttendanceView';
import { GradesView } from '../../components/teacher/GradesView';
import { TeacherReportsView } from '../../components/teacher/TeacherReportsView';
import { SF10Module } from '../../modules/admin/SF10Module';
import { ObservedValuesView } from '../../components/teacher/ObservedValuesView';
import { MyScheduleView } from '../../components/teacher/MyScheduleView';
import { HealthDashboardView } from '../../components/admin/HealthDashboardView';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationBell } from '../../components/shared/NotificationBell';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackView?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class DashboardErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Teacher Dashboard Error Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-[#D8232A]">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Module Temporarily Unavailable</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              We encountered an unexpected issue while loading this section. Click below to reload or return to the overview.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="bg-[#D8232A] hover:bg-[#b01c22] text-white rounded-xl text-xs font-bold px-4 cursor-pointer"
              >
                Reload Module
              </Button>
              {this.props.fallbackView && (
                <Button
                  variant="outline"
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    this.props.fallbackView?.();
                  }}
                  className="rounded-xl text-xs font-bold border-slate-200 cursor-pointer"
                >
                  Go to Overview
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  badge?: number;
}

interface TeacherSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  userData: any;
  onLogout: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
  navItems: NavItem[];
}

const TeacherSidebar: React.FC<TeacherSidebarProps> = React.memo(({
  activeView,
  setActiveView,
  sidebarCollapsed,
  toggleSidebar,
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

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      savedScrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current && savedScrollPositionRef.current > 0) {
      scrollContainerRef.current.scrollTop = savedScrollPositionRef.current;
    }
  }, [activeView, collapsed]);

  const uData = userData as Record<string, string> | null;
  const initials = uData ? `${uData.firstName?.charAt(0) || ''}${uData.lastName?.charAt(0) || ''}`.toUpperCase() : 'T';
  const fullName = uData ? `${uData.firstName} ${uData.lastName}` : 'Teacher';
  const userRole = uData?.role || 'Teacher';

  const categories = ['Main', 'Classroom', 'Documents'];

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
              Teacher Portal
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
                        {item.badge && item.badge > 0 && (
                          <Badge className="bg-red-50 text-[#D8232A] border border-red-200 text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 ml-2 shadow-2xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>

                      {/* Floating Tooltip in Collapsed State */}
                      {collapsed && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 backdrop-blur-sm text-white text-xs font-bold rounded-xl shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-150 z-50 whitespace-nowrap flex items-center gap-2 border border-slate-700/50">
                          <span>{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="bg-[#D8232A] text-white text-[9px] px-1.5 py-0.5 rounded-md font-bold">
                              {item.badge}
                            </span>
                          )}
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
      <div className="border-t border-slate-200/80 p-3 flex flex-col gap-2 shrink-0 relative bg-white">
        {isMobile && (
          <button
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer border border-rose-100 shadow-2xs"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Sign Out</span>
          </button>
        )}

        {showUserMenu && !isMobile && (
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
          {uData?.photoURL ? (
            <img
              src={uData.photoURL}
              alt="Profile"
              className="w-9 h-9 rounded-2xl object-cover shrink-0 border border-slate-200 shadow-inner"
            />
          ) : (
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#D8232A] to-[#f87171] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
              {initials}
            </div>
          )}

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
                {userRole}
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
              {fullName} ({userRole})
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

TeacherSidebar.displayName = 'TeacherSidebar';

function TeacherDashboardContent() {
  const navigate = useNavigate();
  const { students, assignedSections, currentSection, setCurrentSection } = useTeacherData();
  const { userData } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);

  useEffect(() => {
    if (['students', 'enrollments', 'observed-values', 'reports', 'sf10'].includes(activeView)) {
      const advisorySec = assignedSections.find((s) => s.isAdvisor);
      if (advisorySec && currentSection !== advisorySec.sectionId) {
        setCurrentSection(advisorySec.sectionId);
      }
    }
  }, [activeView, assignedSections, currentSection, setCurrentSection]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('teacher_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('teacher_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  const pendingCount = students.filter((s) => s.status === 'Pending').length;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems: NavItem[] = [
    // Main
    { id: 'dashboard', label: 'Home', icon: Home, category: 'Main' },
    { id: 'schedule', label: 'My Schedule', icon: Calendar, category: 'Main' },
    { id: 'attendance', label: 'Attendance', icon: CalendarDays, category: 'Main' },
    { id: 'announcements', label: 'Announcement', icon: Megaphone, category: 'Main' },
    ...(pendingCount > 0
      ? [{ id: 'enrollments', label: 'Enrollments', icon: UserCheck, category: 'Main', badge: pendingCount }]
      : []),

    // Classroom
    { id: 'students', label: 'Students', icon: Users, category: 'Classroom' },
    { id: 'grades', label: 'Grades', icon: ClipboardList, category: 'Classroom' },
    { id: 'observed-values', label: 'Observed Values', icon: Heart, category: 'Classroom' },
    { id: 'health', label: 'Health & Nutrition', icon: Heart, category: 'Classroom' },

    // Documents
    { id: 'reports', label: 'School Forms', icon: FileText, category: 'Documents' },
    { id: 'sf10', label: 'Permanent Records', icon: FileText, category: 'Documents' }
  ];

  const handleNavigate = (view: string, targetSectionId?: string) => {
    if (targetSectionId && targetSectionId !== currentSection) {
      setCurrentSection(targetSectionId);
    }
    setActiveView(view);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <TeacherDashboardView onNavigate={handleNavigate} />;
      case 'enrollments':
        return <EnrollmentsView />;
      case 'students':
        return <StudentsView />;
      case 'attendance':
        return <AttendanceView />;
      case 'schedule':
        return <MyScheduleView />;
      case 'grades':
        return <GradesView />;
      case 'observed-values':
        return <ObservedValuesView />;
      case 'announcements':
        return <ManageAnnouncementsView sections={assignedSections} students={students} />;
      case 'reports':
        return <TeacherReportsView />;
      case 'sf10':
        return (
          <SF10Module
            students={students}
            sections={assignedSections.filter((s) => s.isAdvisor)}
            isAdmin={false}
          />
        );
      case 'settings':
        return <TeacherSettingsView />;
      case 'health':
        return <HealthDashboardView />;
      default:
        return <TeacherDashboardView onNavigate={handleNavigate} />;
    }
  };

  const uData = userData as Record<string, string> | null;
  const initials = uData ? `${uData.firstName?.charAt(0) || ''}${uData.lastName?.charAt(0) || ''}`.toUpperCase() : 'T';

  return (
    <div className="flex h-screen w-full bg-slate-50/50 overflow-hidden font-sans">
      {/* Desktop Persistent Sticky Sidebar */}
      <aside
        className={`hidden lg:flex ${
          sidebarCollapsed ? 'w-[76px]' : 'w-64'
        } h-screen flex-col shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] sticky top-0 z-30`}
      >
        <TeacherSidebar
          activeView={activeView}
          setActiveView={setActiveView}
          sidebarCollapsed={sidebarCollapsed}
          toggleSidebar={toggleSidebar}
          userData={userData}
          onLogout={handleLogout}
          navItems={navItems}
        />
      </aside>

      {/* Main Dashboard Workspace (Independent Scroll Container) */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 border-b border-slate-200 bg-white px-5 flex items-center justify-between shrink-0 shadow-sm z-20">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2 hover:bg-slate-100 rounded-xl">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col bg-white border-0">
              <TeacherSidebar
                activeView={activeView}
                setActiveView={setActiveView}
                sidebarCollapsed={false}
                toggleSidebar={() => {}}
                userData={userData}
                onLogout={handleLogout}
                isMobile={true}
                onCloseMobile={() => setMobileOpen(false)}
                navItems={navItems}
              />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2.5 font-bold text-sm text-slate-800">
            Teacher Portal
          </div>
          <div className="flex items-center gap-2 relative">
            <NotificationBell onNavigate={handleNavigate} />
            <div
              onClick={() => setMobileProfileOpen(!mobileProfileOpen)}
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D8232A] to-[#f87171] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm cursor-pointer active:scale-95 transition-transform"
            >
              {initials}
            </div>

            {/* Mobile Profile Dropdown Popover */}
            {mobileProfileOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]"
                  onClick={() => setMobileProfileOpen(false)}
                />
                <div className="absolute right-0 top-11 w-56 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-2.5 z-50 animate-in fade-in-50 slide-in-from-top-2 duration-150 select-none space-y-1">
                  <div className="px-2.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {userData ? `${(userData as any).firstName || ''} ${(userData as any).lastName || ''}`.trim() : 'Teacher User'}
                    </p>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate mt-0.5">
                      {(userData as any)?.role === 'teacher' ? 'Faculty Teacher' : 'Faculty Staff'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveView('settings');
                      setMobileProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all cursor-pointer border-0 bg-transparent"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Account Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setMobileProfileOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border-0 bg-transparent"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
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
              <DashboardErrorBoundary fallbackView={() => setActiveView('dashboard')}>
                {renderActiveView()}
              </DashboardErrorBoundary>
            </motion.div>
          </AnimatePresence>
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
