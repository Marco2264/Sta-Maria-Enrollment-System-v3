import React, { useState } from 'react';
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
  ChevronRight,
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
      case 'children':
      case 'my-students': 
        return <MyChildrenView onSelectChild={handleSelectChild} />;
      case 'enrollment': return <EnrollmentForm onComplete={() => handleNavigate('children')} onNavigateToRequirements={() => handleNavigate('requirements')} />;
      case 'requirements': return <RequirementsView />;
      case 'announcements': return <AnnouncementsView />;
      case 'settings': return <ParentSettingsView />;
      case 'attendance':
      case 'academic-records':
        return <MyChildrenView onSelectChild={handleSelectChild} />;
      case 'child-detail': return selectedChildId ? <ChildDetailView childId={selectedChildId} onBack={() => handleNavigate('children')} /> : <MyChildrenView onSelectChild={handleSelectChild} />;
      default: return <ParentDashboardView onNavigate={handleNavigate} />;
    }
  };

  const uData = userData as Record<string, string> | null;
  const initials = uData ? `${uData.firstName?.charAt(0) || ''}${uData.lastName?.charAt(0) || ''}`.toUpperCase() : 'P';
  const fullName = uData ? `${uData.firstName} ${uData.lastName}` : 'Parent User';
  const relationship = uData?.relationship || 'Parent';

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white font-sans border-r border-slate-100 z-50">
      {/* Brand Header */}
      <div className="h-16 lg:h-28 flex items-center gap-3 px-6 sm:px-8 border-b border-slate-100 shrink-0 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-10 h-10 bg-[#2563eb] rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">Sta. Maria</span>
          <span className="text-[10px] font-extrabold text-[#2563eb] uppercase tracking-widest leading-none mt-1">Parent Portal</span>
        </div>
      </div>

      {/* Nav Menu Items */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6">
        {/* Category: Main Menu */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-3">Main Menu</div>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('dashboard')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeView === 'dashboard'
                  ? 'bg-blue-50/80 text-[#2563eb] font-bold border-l-4 border-[#2563eb] rounded-r-lg shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg'
              }`}
            >
              <LayoutDashboard className={`w-5 h-5 shrink-0 ${activeView === 'dashboard' ? 'text-[#2563eb]' : 'text-slate-400'}`} />
              <span className="flex-1 text-left truncate">Dashboard</span>
            </button>

            <button
              onClick={() => handleNavigate('children')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeView === 'children' || activeView === 'child-detail'
                  ? 'bg-blue-50/80 text-[#2563eb] font-bold border-l-4 border-[#2563eb] rounded-r-lg shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg'
              }`}
            >
              <Users className={`w-5 h-5 shrink-0 ${activeView === 'children' || activeView === 'child-detail' ? 'text-[#2563eb]' : 'text-slate-400'}`} />
              <span className="flex-1 text-left truncate">My Students</span>
            </button>

            <button
              onClick={() => handleNavigate('announcements')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeView === 'announcements'
                  ? 'bg-blue-50/80 text-[#2563eb] font-bold border-l-4 border-[#2563eb] rounded-r-lg shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg'
              }`}
            >
              <Bell className={`w-5 h-5 shrink-0 ${activeView === 'announcements' ? 'text-[#2563eb]' : 'text-slate-400'}`} />
              <span className="flex-1 text-left truncate">Announcements</span>
            </button>
          </div>
        </div>

        {/* Category: Registration */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-3">Registration</div>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('enrollment')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeView === 'enrollment'
                  ? 'bg-blue-50/80 text-[#2563eb] font-bold border-l-4 border-[#2563eb] rounded-r-lg shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg'
              }`}
            >
              <UserPlus className={`w-5 h-5 shrink-0 ${activeView === 'enrollment' ? 'text-[#2563eb]' : 'text-slate-400'}`} />
              <span className="flex-1 text-left truncate">Student Registration</span>
            </button>
          </div>
        </div>

        {/* Category: Documents */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-3">Documents</div>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('requirements')}
              className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                activeView === 'requirements'
                  ? 'bg-blue-50/80 text-[#2563eb] font-bold border-l-4 border-[#2563eb] rounded-r-lg shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg'
              }`}
            >
              <FolderOpen className={`w-5 h-5 shrink-0 ${activeView === 'requirements' ? 'text-[#2563eb]' : 'text-slate-400'}`} />
              <span className="flex-1 text-left truncate">Document Center</span>
            </button>
          </div>
        </div>
      </div>

      {/* User settings & Profile bar at bottom */}
      <div className="border-t border-slate-100 p-4 shrink-0 relative bg-white">
        {showUserMenu && (
          <div className="absolute bottom-20 left-4 right-4 bg-white border border-slate-200/60 p-2 rounded-2xl shadow-xl space-y-1 animate-in fade-in-50 slide-in-from-bottom-3 duration-200 z-50 backdrop-blur-md">
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
          className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-2xl cursor-pointer transition-all active:scale-98" 
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20 shadow-inner overflow-hidden">
            {typeof (userData as any)?.photoURL === 'string' && (userData as any).photoURL ? (
              <img src={(userData as any).photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 overflow-hidden text-left">
            <p className="text-sm font-extrabold truncate text-slate-800 leading-none">{fullName}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate mt-1.5">{relationship}</p>
          </div>
          {showUserMenu ? (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#F4F7F9] overflow-hidden font-sans">
      <aside className="hidden lg:flex w-64 border-r border-slate-200/60 bg-white flex-col shrink-0">
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
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2.5 font-bold text-sm text-slate-800">
            <div className="p-1 bg-primary/5 rounded-lg border border-primary/10 shadow-sm shrink-0">
              <img src="/pasted-image.jpg" alt="Logo" className="w-5 h-5 rounded-md object-cover" />
            </div>
            Parent Portal
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20 shadow-sm">{initials}</div>
        </header>
        <div className="flex-1 overflow-y-auto bg-[#F4F7F9] flex flex-col relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView + (selectedChildId || '')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
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
    console.error('[ViewErrorBoundary] Caught view error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 m-6 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Unable to display view</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{this.state.error?.message || 'An unexpected rendering error occurred.'}</p>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="bg-[#2563eb] text-white px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer"
          >
            Reload View
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
      <ViewErrorBoundary>
        <ParentPortalContent />
      </ViewErrorBoundary>
    </ParentDataProvider>
  );
}

export default ParentPortal;
