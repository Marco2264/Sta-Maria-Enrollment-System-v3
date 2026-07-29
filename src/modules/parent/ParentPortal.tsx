import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FolderOpen,
  Menu,
  LogOut,
  GraduationCap
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white font-sans border-r border-slate-100 z-50">
      {/* Brand Header */}
      <div className="p-6 sm:p-8 flex items-center gap-3 border-b border-slate-100 shrink-0 cursor-pointer" onClick={() => navigate('/')}>
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

      <div className="border-t border-border p-3 shrink-0">
        {showUserMenu && (
          <div className="mb-2 space-y-1 animate-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={() => {
                handleNavigate('settings');
                setShowUserMenu(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'settings' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
            >
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
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 uppercase overflow-hidden">
            {uData?.photoURL ? (
              <img src={uData.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <>{uData?.firstName?.charAt(0) || 'P'}{uData?.lastName?.charAt(0) || 'U'}</>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate text-slate-900">
              {uData?.firstName} {uData?.lastName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate font-medium uppercase tracking-wider">
              {uData?.relationship || 'Parent'} | {uData?.email}
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
    <div className="flex h-screen w-full bg-muted/30 overflow-hidden font-sans">
      <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col shrink-0">
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
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 font-semibold text-sm">
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
        <div className="flex-1 overflow-y-auto bg-muted/30 flex flex-col">
          {renderActiveView()}
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
