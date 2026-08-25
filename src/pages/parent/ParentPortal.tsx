import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';
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
          onClick={() => {
            if (isMobile) {
              onNavigate('settings');
              if (onCloseMobile) onCloseMobile();
            } else {
              setShowUserMenu(!showUserMenu);
            }
          }}
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('parent_sidebar_collapsed') === 'true';
  });
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);

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
        <header className="lg:hidden h-16 border-b border-slate-200/80 bg-white px-3.5 sm:px-4 flex items-center justify-between shrink-0 shadow-2xs z-20 sticky top-0">
          <div
            className="flex items-center gap-2.5 font-black text-sm text-slate-900 cursor-pointer select-none"
            onClick={() => handleNavigate('dashboard')}
          >
            <div className="p-1 bg-red-50 rounded-xl border border-red-100 shadow-2xs shrink-0 flex items-center justify-center">
              <img src="/pasted-image.jpg" alt="Logo" className="w-6 h-6 rounded-lg object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="tracking-tight text-xs sm:text-sm font-black text-slate-900 leading-none">Sta. Maria Elem.</span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D8232A] mt-0.5">Parent Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            <NotificationBell onNavigate={handleNavigate} />
            
            {/* Mobile Header Avatar Trigger */}
            <div
              onClick={() => setMobileProfileOpen(!mobileProfileOpen)}
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D8232A] to-[#f87171] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs cursor-pointer active:scale-95 transition-transform"
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
                      {userData ? `${(userData as any).firstName || ''} ${(userData as any).lastName || ''}`.trim() : 'Parent User'}
                    </p>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate mt-0.5">
                      {(userData as any)?.relationship || 'Parent / Guardian'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      handleNavigate('settings');
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

        {/* View Content Area with Mobile Safe Bottom Padding */}
        <div className="flex-1 overflow-y-auto bg-[#F4F7F9] flex flex-col relative pb-18 lg:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView + (selectedChildId || '')}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.4 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="flex-1 flex flex-col h-full min-h-0"
            >
              <ViewErrorBoundary key={activeView}>
                {renderActiveView()}
              </ViewErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Navigation Bar (Quick Thumb Access) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/80 z-30 flex items-center justify-around px-1 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] select-none">
          <button
            onClick={() => handleNavigate('dashboard')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all cursor-pointer border-none bg-transparent",
              activeView === 'dashboard' ? "text-[#D8232A]" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <LayoutDashboard className={cn("w-5 h-5 mb-0.5 transition-transform", activeView === 'dashboard' && "scale-110")} />
            <span>Home</span>
          </button>

          <button
            onClick={() => handleNavigate('children')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all cursor-pointer border-none bg-transparent",
              activeView === 'children' || activeView === 'child-detail' ? "text-[#D8232A]" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Users className={cn("w-5 h-5 mb-0.5 transition-transform", (activeView === 'children' || activeView === 'child-detail') && "scale-110")} />
            <span>Students</span>
          </button>

          <button
            onClick={() => handleNavigate('enrollment')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all cursor-pointer border-none bg-transparent",
              activeView === 'enrollment' ? "text-[#D8232A]" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center -mt-2 mb-0.5 shadow-md transition-all",
              activeView === 'enrollment' ? "bg-[#D8232A] text-white" : "bg-slate-900 text-white"
            )}>
              <UserPlus className="w-4 h-4" />
            </div>
            <span>Register</span>
          </button>

          <button
            onClick={() => handleNavigate('requirements')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all cursor-pointer border-none bg-transparent",
              activeView === 'requirements' ? "text-[#D8232A]" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <FolderOpen className={cn("w-5 h-5 mb-0.5 transition-transform", activeView === 'requirements' && "scale-110")} />
            <span>Docs</span>
          </button>

          <button
            onClick={() => handleNavigate('settings')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-bold transition-all cursor-pointer border-none bg-transparent",
              activeView === 'settings' ? "text-[#D8232A]" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Settings className={cn("w-5 h-5 mb-0.5 transition-transform", activeView === 'settings' && "scale-110")} />
            <span>Settings</span>
          </button>
        </nav>
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
