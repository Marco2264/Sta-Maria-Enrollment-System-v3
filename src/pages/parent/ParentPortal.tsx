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
  Menu,
  LogOut } from
'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../../components/ui/Sheet';
import { ParentDataProvider } from '../../lib/parentData';
import { ParentDashboardView } from '../../components/parent/ParentDashboardView';
import { MyChildrenView } from '../../components/parent/MyChildrenView';
import { EnrollmentForm } from '../../components/parent/EnrollmentForm';
import { ChildDetailView } from '../../components/parent/ChildDetailView';
import { RequirementsView } from '../../components/parent/RequirementsView';
import { ParentSettingsView } from '../../components/parent/ParentSettingsView';
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
      case 'settings': return <ParentSettingsView />;
      case 'child-detail': return selectedChildId ? <ChildDetailView childId={selectedChildId} onBack={() => handleNavigate('children')} /> : <MyChildrenView onSelectChild={handleSelectChild} />;
      default: return <ParentDashboardView onNavigate={handleNavigate} />;
    }
  };

  const uData = userData as Record<string, string> | null;
  const initials = uData ? `${uData.firstName?.charAt(0) || ''}${uData.lastName?.charAt(0) || ''}`.toUpperCase() : 'P';
  const fullName = uData ? `${uData.firstName} ${uData.lastName}` : 'Parent User';
  const relationship = uData?.relationship || 'Parent';

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Brand Header */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="p-1.5 bg-primary/5 rounded-xl border border-primary/10 shadow-sm shrink-0">
            <img src="/pasted-image.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-sm text-slate-800 tracking-tight leading-none">Sta. Maria</span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none mt-1">Parent Portal</span>
          </div>
        </div>
      </div>

      {/* Nav Menu Items */}
      <div className="flex-1 overflow-y-auto py-8 px-4 space-y-7">
        {/* Category: Home */}
        <div className="space-y-2">
          <p className="px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">Home</p>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('dashboard')}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 text-sm transition-all duration-200 rounded-xl relative group ${
                activeView === 'dashboard'
                  ? 'bg-primary/5 text-primary border border-primary/10 font-bold shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
              }`}
            >
              <LayoutDashboard className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${activeView === 'dashboard' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span className="flex-1 text-left truncate">Dashboard</span>
            </button>

            <button
              onClick={() => handleNavigate('children')}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 text-sm transition-all duration-200 rounded-xl relative group ${
                activeView === 'children' || activeView === 'child-detail'
                  ? 'bg-primary/5 text-primary border border-primary/10 font-bold shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
              }`}
            >
              <Users className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${activeView === 'children' || activeView === 'child-detail' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span className="flex-1 text-left truncate">My Students</span>
            </button>

            <button className="w-full flex items-center gap-3.5 px-4 py-2.5 text-sm transition-all duration-200 rounded-xl relative group text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium">
              <Bell className="w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 text-slate-400 group-hover:text-slate-600" />
              <span className="flex-1 text-left truncate">Announcements</span>
            </button>
          </div>
        </div>

        {/* Category: Registration */}
        <div className="space-y-2">
          <p className="px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">Registration</p>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('enrollment')}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 text-sm transition-all duration-200 rounded-xl relative group ${
                activeView === 'enrollment'
                  ? 'bg-primary/5 text-primary border border-primary/10 font-bold shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
              }`}
            >
              <UserPlus className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${activeView === 'enrollment' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span className="flex-1 text-left truncate">Student Registration</span>
            </button>
          </div>
        </div>

        {/* Category: Documents */}
        <div className="space-y-2">
          <p className="px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none mb-1">Documents</p>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('requirements')}
              className={`w-full flex items-center gap-3.5 px-4 py-2.5 text-sm transition-all duration-200 rounded-xl relative group ${
                activeView === 'requirements'
                  ? 'bg-primary/5 text-primary border border-primary/10 font-bold shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
              }`}
            >
              <FileText className={`w-4.5 h-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105 ${activeView === 'requirements' ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <span className="flex-1 text-left truncate">Requirements</span>
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
    <div className="flex h-screen w-full bg-slate-50/50 overflow-hidden font-sans">
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
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
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
