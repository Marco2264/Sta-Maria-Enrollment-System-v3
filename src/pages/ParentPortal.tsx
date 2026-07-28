import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  UserPlus,
  Bell,
  ChevronDown,
  ChevronRight,
  Menu } from
'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/Sheet';
import { ParentDataProvider } from '../lib/parentData';
import { ParentDashboardView } from '../components/parent/ParentDashboardView';
import { MyChildrenView } from '../components/parent/MyChildrenView';
import { EnrollmentForm } from '../components/parent/EnrollmentForm';
import { ChildDetailView } from '../components/parent/ChildDetailView';
import { RequirementsView } from '../components/parent/RequirementsView';
import { ParentSettingsView } from '../components/parent/ParentSettingsView';
import { useAuth } from '../lib/AuthContext';
function ParentPortalContent() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
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
      case 'dashboard':
        return <ParentDashboardView onNavigate={handleNavigate} />;
      case 'children':
        return <MyChildrenView onSelectChild={handleSelectChild} />;
      case 'enrollment':
        return <EnrollmentForm onComplete={() => handleNavigate('requirements')} />;
      case 'requirements':
        return <RequirementsView />;
      case 'settings':
        return <ParentSettingsView />;
      case 'child-detail':
        return selectedChildId ?
        <ChildDetailView
          childId={selectedChildId}
          onBack={() => handleNavigate('children')} /> :
        <MyChildrenView onSelectChild={handleSelectChild} />;

      default:
        return <ParentDashboardView onNavigate={handleNavigate} />;
    }
  };
  const uData = userData as Record<string, string> | null;

  const SidebarContent = () =>
  <>
      <div className="h-16 flex items-center justify-between px-6 border-b border-border shrink-0">
        <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => navigate('/')}>
        
          <img
          src="/pasted-image.jpg"
          alt="Logo"
          className="w-8 h-8 rounded-md object-cover" />
        
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none">
              Sta. Maria
            </span>
            <span className="text-xs text-muted-foreground leading-none mt-1">
              Parent Portal
            </span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground hidden lg:block" />
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        <div>
          <p className="px-3 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Home
          </p>
          <div className="space-y-1">
            <button
            onClick={() => handleNavigate('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'dashboard' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
            
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              Dashboard
            </button>
            <button
            onClick={() => handleNavigate('children')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'children' || activeView === 'child-detail' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
              <Users className="w-4 h-4 shrink-0" />
              My Students
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-md transition-colors">
              <Bell className="w-4 h-4 shrink-0" />
              Announcements
            </button>
          </div>
        </div>

        <div>
          <p className="px-3 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Registration
          </p>
          <div className="space-y-1">
            <button
            onClick={() => handleNavigate('enrollment')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'enrollment' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
            
              <UserPlus className="w-4 h-4 shrink-0" />
              Student Registration
            </button>
          </div>
        </div>

        <div>
          <p className="px-3 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Documents
          </p>
          <div className="space-y-1">
            <button
              onClick={() => handleNavigate('requirements')}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeView === 'requirements' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
              <FileText className="w-4 h-4 shrink-0" />
              Requirements
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-border p-3 shrink-0">
        <button
          onClick={() => handleNavigate('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors mb-2 ${activeView === 'settings' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>

        <div
        className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
        onClick={() => navigate('/')}>
        
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
              {uData?.relationship || 'Parent'} • {uData?.email}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </div>
    </>;

  return (
    <div className="flex h-screen w-full bg-muted/30 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Top Bar */}
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
            <img
              src="/pasted-image.jpg"
              alt="Logo"
              className="w-6 h-6 rounded-md object-cover" />
            
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

        <div className="flex-1 overflow-y-auto bg-muted/30">
          {renderActiveView()}
        </div>
      </main>
    </div>);

}
export function ParentPortal() {
  return (
    <ParentDataProvider>
      <ParentPortalContent />
    </ParentDataProvider>);

}