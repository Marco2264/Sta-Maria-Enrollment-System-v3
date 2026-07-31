import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../../components/ui/Button';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  UserPlus,
  Bell,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  FolderOpen,
  Menu,
  LogOut,
  GraduationCap
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/Sheet';
import { ParentDataProvider } from '../../lib/parentData';
import { ParentDashboardView } from './ParentDashboardView';
import { MyChildrenView } from './MyChildrenView';
import { EnrollmentForm } from '../../components/parent/EnrollmentForm';
import { ChildDetailView } from './ChildDetailView';
import { RequirementsView } from './RequirementsView';
import { ParentSettingsView } from './ParentSettingsView';
import { AnnouncementsView } from './AnnouncementsView';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';

function ParentPortalContent() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard': return <ParentDashboardView onNavigate={handleNavigate} />;
      case 'children': return <MyChildrenView onSelectChild={handleSelectChild} />;
      case 'enrollment': return <EnrollmentForm onComplete={() => handleNavigate('children')} />;
      case 'requirements': return <RequirementsView />;
      case 'announcements': return <AnnouncementsView />;
      case 'settings': return <ParentSettingsView />;
      case 'child-detail': return selectedChildId ? <ChildDetailView childId={selectedChildId} onBack={() => handleNavigate('children')} /> : <MyChildrenView onSelectChild={handleSelectChild} />;
      default: return <ParentDashboardView onNavigate={handleNavigate} />;
    }
  };

  const uData = userData as Record<string, string> | null;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('parent_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('parent_sidebar_collapsed', String(next));
      return next;
    });
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const collapsed = isMobile ? false : sidebarCollapsed;
    return (
      <div className="flex flex-col h-full bg-white font-sans border-r border-slate-100 z-50 overflow-x-hidden">
        {/* Brand Header */}
        <div className={`h-16 lg:h-28 flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-6'} border-b border-slate-100 shrink-0 cursor-pointer overflow-hidden`} onClick={() => handleNavigate('dashboard')}>
          <div className="p-1.5 bg-blue-50/80 rounded-xl border border-blue-100/80 shadow-xs shrink-0">
            <img src="/pasted-image.jpg" alt="Sta. Maria Logo" className="w-8 h-8 rounded-lg object-cover" />
          </div>
          {!collapsed && (
            <div className="flex flex-col text-left">
              <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">Sta. Maria</span>
              <span className="text-[10px] font-extrabold text-[#2563eb] uppercase tracking-widest leading-none mt-1">Parent Portal</span>
            </div>
          )}
        </div>

        {/* Nav Menu Items */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar ${collapsed ? 'py-4 px-2 space-y-4' : 'py-5 px-4 space-y-5'}`}>
          {/* Toggle Button row above Main Menu */}
          {!isMobile && (
            <div className={`flex items-center ${collapsed ? 'justify-center mb-2' : 'justify-between px-4 mb-2'}`}>
              {!collapsed && (
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Collapse</span>
              )}
              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-xl text-slate-400 hover:text-[#2563eb] hover:bg-blue-50 transition-all cursor-pointer shrink-0 relative group"
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

          {/* Category: Main Menu */}
          <div className="space-y-2">
            {!collapsed ? (
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-3">Main Menu</div>
            ) : (
              <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider text-center mb-1 select-none">MENU</div>
            )}
            <div className="space-y-1">
              <button
                onClick={() => handleNavigate('dashboard')}
                className={`w-full flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-3'} text-sm font-medium transition-all duration-200 cursor-pointer relative group ${
                  activeView === 'dashboard'
                    ? collapsed 
                      ? 'bg-blue-50 text-[#2563eb] font-bold rounded-xl shadow-xs' 
                      : 'bg-blue-50/80 text-[#2563eb] font-bold border-l-4 border-[#2563eb] rounded-r-lg shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg'
                }`}
              >
                <LayoutDashboard className={`w-5 h-5 shrink-0 ${activeView === 'dashboard' ? 'text-[#2563eb]' : 'text-slate-400'}`} />
                {!collapsed && <span className="flex-1 text-left truncate">Dashboard</span>}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                    Dashboard
                  </div>
                )}
              </button>

              <button
                onClick={() => handleNavigate('children')}
                className={`w-full flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-3'} text-sm font-medium transition-all duration-200 cursor-pointer relative group ${
                  activeView === 'children' || activeView === 'child-detail'
                    ? collapsed 
                      ? 'bg-blue-50 text-[#2563eb] font-bold rounded-xl shadow-xs' 
                      : 'bg-blue-50/80 text-[#2563eb] font-bold border-l-4 border-[#2563eb] rounded-r-lg shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg'
                }`}
              >
                <Users className={`w-5 h-5 shrink-0 ${activeView === 'children' || activeView === 'child-detail' ? 'text-[#2563eb]' : 'text-slate-400'}`} />
                {!collapsed && <span className="flex-1 text-left truncate">My Students</span>}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                    My Students
                  </div>
                )}
              </button>

              <button
                onClick={() => handleNavigate('announcements')}
                className={`w-full flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-3'} text-sm font-medium transition-all duration-200 cursor-pointer relative group ${
                  activeView === 'announcements'
                    ? collapsed 
                      ? 'bg-blue-50 text-[#2563eb] font-bold rounded-xl shadow-xs' 
                      : 'bg-blue-50/80 text-[#2563eb] font-bold border-l-4 border-[#2563eb] rounded-r-lg shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg'
                }`}
              >
                <Bell className={`w-5 h-5 shrink-0 ${activeView === 'announcements' ? 'text-[#2563eb]' : 'text-slate-400'}`} />
                {!collapsed && <span className="flex-1 text-left truncate">Announcements</span>}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                    Announcements
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Category: Registration */}
          <div className="space-y-2">
            {!collapsed ? (
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-3">Registration</div>
            ) : (
              <div className="w-full flex justify-center my-2">
                <div className="w-4 h-[2px] bg-slate-200 rounded-full" />
              </div>
            )}
            <div className="space-y-1">
              <button
                onClick={() => handleNavigate('enrollment')}
                className={`w-full flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-3'} text-sm font-medium transition-all duration-200 cursor-pointer relative group ${
                  activeView === 'enrollment'
                    ? collapsed 
                      ? 'bg-blue-50 text-[#2563eb] font-bold rounded-xl shadow-xs' 
                      : 'bg-blue-50/80 text-[#2563eb] font-bold border-l-4 border-[#2563eb] rounded-r-lg shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg'
                }`}
              >
                <UserPlus className={`w-5 h-5 shrink-0 ${activeView === 'enrollment' ? 'text-[#2563eb]' : 'text-slate-400'}`} />
                {!collapsed && <span className="flex-1 text-left truncate">Student Registration</span>}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                    Student Registration
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Category: Documents */}
          <div className="space-y-2">
            {!collapsed ? (
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-3">Documents</div>
            ) : (
              <div className="w-full flex justify-center my-2">
                <div className="w-4 h-[2px] bg-slate-200 rounded-full" />
              </div>
            )}
            <div className="space-y-1">
              <button
                onClick={() => handleNavigate('requirements')}
                className={`w-full flex items-center ${collapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-3'} text-sm font-medium transition-all duration-200 cursor-pointer relative group ${
                  activeView === 'requirements'
                    ? collapsed 
                      ? 'bg-blue-50 text-[#2563eb] font-bold rounded-xl shadow-xs' 
                      : 'bg-blue-50/80 text-[#2563eb] font-bold border-l-4 border-[#2563eb] rounded-r-lg shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg'
                }`}
              >
                <FolderOpen className={`w-5 h-5 shrink-0 ${activeView === 'requirements' ? 'text-[#2563eb]' : 'text-slate-400'}`} />
                {!collapsed && <span className="flex-1 text-left truncate">Document Center</span>}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                    Document Center
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* User settings & Profile bar at bottom */}
        <div className={`h-24 border-t border-slate-100 ${collapsed ? 'p-2' : 'px-4'} flex items-center shrink-0 relative bg-white`}>
          {showUserMenu && (
            <div className={`absolute ${collapsed ? 'left-full ml-3 bottom-2 w-48' : 'bottom-20 left-4 right-4'} bg-white border border-slate-200/60 p-2 rounded-2xl shadow-xl space-y-1 animate-in fade-in-50 duration-200 z-50 backdrop-blur-md`}>
              <button
                onClick={() => {
                  handleNavigate('settings');
                  setShowUserMenu(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  activeView === 'settings'
                    ? 'bg-primary/5 text-primary border border-primary/10'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                }`}
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
            className={`w-full flex items-center ${collapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2'} hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-2xl cursor-pointer transition-all active:scale-98 relative group overflow-hidden`}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20 shadow-inner overflow-hidden">
              {typeof (userData as any)?.photoURL === 'string' && (userData as any).photoURL ? (
                <img src={(userData as any).photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <>{uData?.firstName?.charAt(0) || 'P'}{uData?.lastName?.charAt(0) || 'U'}</>
              )}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 overflow-hidden text-left">
                  <p className="text-xs font-black truncate text-slate-800 leading-tight" title={`${uData?.firstName || ''} ${uData?.lastName || ''}`}>
                    {uData?.firstName} {uData?.lastName}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate font-bold uppercase tracking-wider mt-0.5">
                    {uData?.relationship || 'Parent'}
                  </p>
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
                {uData?.firstName} {uData?.lastName}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-muted/30 overflow-hidden font-sans">
      <aside className={`hidden lg:flex ${sidebarCollapsed ? 'w-20' : 'w-64'} border-r border-border bg-card flex-col shrink-0 transition-all duration-300 ease-in-out`}>
        <SidebarContent />
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <SidebarContent isMobile={true} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 font-semibold text-sm cursor-pointer" onClick={() => handleNavigate('dashboard')}>
            <img src="/pasted-image.jpg" alt="Logo" className="w-6 h-6 rounded-md object-cover" />
            Parent Portal
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
            {uData?.photoURL ? (
              <img src={uData.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <>{uData?.firstName?.charAt(0) || 'P'}{uData?.lastName?.charAt(0) || 'U'}</>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-muted/30 flex flex-col relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView + (selectedChildId || '')}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.4 }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
              className="flex-1 flex flex-col h-full"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export function ParentPortal() {
  return (
    <ParentDataProvider>
      <ParentPortalContent />
    </ParentDataProvider>
  );
}
