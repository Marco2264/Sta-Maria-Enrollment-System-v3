import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderOpen,
  Settings,
  UserPlus,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  LogOut,
  GraduationCap,
  AlertTriangle
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/Sheet';
import { ParentDataProvider } from '../../lib/parentData';
import { ParentDashboardView } from '../../components/parent/ParentDashboardView';
import { MyChildrenView } from '../../components/parent/MyChildrenView';
import { EnrollmentForm } from '../../components/parent/EnrollmentForm';
import { ChildDetailView } from '../../components/parent/ChildDetailView';
import { RequirementsView } from '../../components/parent/RequirementsView';
import { ParentSettingsView } from '../../components/parent/ParentSettingsView';
import { AnnouncementsView } from '../../components/parent/AnnouncementsView';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { NotificationBell } from '../../components/shared/NotificationBell';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

interface ParentSidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  userData: any;
  onLogout: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
  navItems: NavItem[];
}

const ParentSidebar: React.FC<ParentSidebarProps> = React.memo(({
  activeView,
  onNavigate,
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
  const initials = uData ? `${uData.firstName?.charAt(0) || ''}${uData.lastName?.charAt(0) || ''}`.toUpperCase() : 'P';
  const fullName = uData ? `${uData.firstName} ${uData.lastName}` : 'Parent User';
  const relationship = uData?.relationship || 'Parent / Guardian';

  const categories = ['Main Menu', 'Registration', 'Documents'];

  return (
    <div className="flex flex-col h-full bg-white font-sans select-none overflow-hidden relative border-r border-slate-200/80">
      {/* Brand Header */}
      <div className="h-[72px] border-b border-slate-200/80 flex items-center px-4 shrink-0 overflow-hidden relative">
        <div
          onClick={() => onNavigate('dashboard')}
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
              Parent Portal
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
                  const isActive =
                    activeView === item.id ||
                    (item.id === 'children' && activeView === 'child-detail');

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
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
                onNavigate('settings');
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
          {typeof (userData as any)?.photoURL === 'string' && (userData as any).photoURL ? (
            <img
              src={(userData as any).photoURL}
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
                {relationship}
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
              {fullName} ({relationship})
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ParentSidebar.displayName = 'ParentSidebar';

function ParentPortalContent() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('parent_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('parent_sidebar_collapsed', String(next));
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

  const handleNavigate = (view: string) => {
    setActiveView(view);
    setMobileOpen(false);
    if (view !== 'child-detail') {
      setSelectedChildId(null);
    }
  };

  const handleSelectChild = (id: string) => {
    setSelectedChildId(id);
    setActiveView('child-detail');
  };

  const navItems: NavItem[] = [
    // Main Menu
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Main Menu' },
    { id: 'children', label: 'My Students', icon: Users, category: 'Main Menu' },
    { id: 'announcements', label: 'Announcements', icon: Bell, category: 'Main Menu' },

    // Registration
    { id: 'enrollment', label: 'Student Registration', icon: UserPlus, category: 'Registration' },

    // Documents
    { id: 'requirements', label: 'Document Center', icon: FolderOpen, category: 'Documents' }
  ];

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <ParentDashboardView onNavigate={handleNavigate} />;
      case 'children':
      case 'my-students':
        return <MyChildrenView onSelectChild={handleSelectChild} onNavigate={handleNavigate} />;
      case 'enrollment':
        return (
          <EnrollmentForm
            onComplete={() => handleNavigate('children')}
            onNavigateToRequirements={() => handleNavigate('requirements')}
          />
        );
      case 'requirements':
        return <RequirementsView />;
      case 'announcements':
        return <AnnouncementsView />;
      case 'settings':
        return <ParentSettingsView />;
      case 'attendance':
      case 'academic-records':
        return <MyChildrenView onSelectChild={handleSelectChild} onNavigate={handleNavigate} />;
      case 'child-detail':
        return selectedChildId ? (
          <ChildDetailView childId={selectedChildId} onBack={() => handleNavigate('children')} />
        ) : (
          <MyChildrenView onSelectChild={handleSelectChild} onNavigate={handleNavigate} />
        );
      default:
        return <ParentDashboardView onNavigate={handleNavigate} />;
    }
  };

  const uData = userData as Record<string, string> | null;
  const initials = uData ? `${uData.firstName?.charAt(0) || ''}${uData.lastName?.charAt(0) || ''}`.toUpperCase() : 'P';

  return (
    <div className="flex h-screen w-full bg-[#F4F7F9] overflow-hidden font-sans">
      {/* Desktop Persistent Sticky Sidebar */}
      <aside
        className={`hidden lg:flex ${
          sidebarCollapsed ? 'w-[76px]' : 'w-64'
        } h-screen flex-col shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] sticky top-0 z-30`}
      >
        <ParentSidebar
          activeView={activeView}
          onNavigate={handleNavigate}
          sidebarCollapsed={sidebarCollapsed}
          toggleSidebar={toggleSidebar}
          userData={userData}
          onLogout={handleLogout}
          navItems={navItems}
        />
      </aside>

      {/* Main Workspace (Independent Scroll Container) */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-slate-150 bg-white px-4 flex items-center justify-between shrink-0 shadow-sm z-20">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2 hover:bg-slate-100 rounded-xl">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col bg-white border-0">
              <ParentSidebar
                activeView={activeView}
                onNavigate={handleNavigate}
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
          <div
            className="flex items-center gap-2.5 font-bold text-sm text-slate-800 cursor-pointer"
            onClick={() => handleNavigate('dashboard')}
          >
            <div className="p-1 bg-primary/5 rounded-lg border border-primary/10 shadow-sm shrink-0">
              <img src="/pasted-image.jpg" alt="Logo" className="w-5 h-5 rounded-md object-cover" />
            </div>
            Parent Portal
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell onNavigate={handleNavigate} />
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D8232A] to-[#f87171] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
              {initials}
            </div>
          </div>
        </header>

        {/* View Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#F4F7F9] flex flex-col relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView + (selectedChildId || '')}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.4 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="flex-1 flex flex-col h-full"
            >
              <ViewErrorBoundary key={activeView}>
                {renderActiveView()}
              </ViewErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

class ViewErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Portal View Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[400px] text-center space-y-4 bg-white rounded-3xl m-6 border border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Something went wrong in this view</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              An unexpected error occurred while loading this section.
            </p>
          </div>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
          >
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ParentPortal() {
  return (
    <ParentDataProvider>
      <ParentPortalContent />
    </ParentDataProvider>
  );
}
