const fs = require('fs');
let content = fs.readFileSync('src/pages/parent/ParentPortal.tsx', 'utf8');

const newSidebarContent = `  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const collapsed = isMobile ? false : sidebarCollapsed;
    return (
      <div className="flex flex-col h-full bg-white font-sans border-r border-slate-100 z-50 overflow-x-hidden">
        {/* Brand Header */}
          <div className="h-16 lg:h-28 border-b border-slate-100 flex items-center px-4 shrink-0 overflow-hidden relative cursor-pointer" onClick={() => handleNavigate('dashboard')}>
            <div className="p-1.5 bg-[#D32F2F]/5 rounded-xl border border-[#D32F2F]/10 shadow-sm shrink-0 transition-all duration-200">
              <img src="/pasted-image.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            </div>
            <div className={\`ml-3 flex flex-col text-left overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out \${collapsed ? 'w-0 opacity-0' : 'w-36 opacity-100'}\`}>
              <span className="font-extrabold text-sm text-slate-800 tracking-tight leading-none">Sta. Maria</span>
              <span className="text-[10px] font-bold text-[#D8232A] uppercase tracking-widest leading-none mt-1 truncate">Parent Portal</span>
            </div>
          </div>

        {/* Nav Menu Items */}
        <div className={\`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar \${collapsed ? 'py-4 px-2 space-y-4' : 'py-5 px-4 space-y-5'}\`}>
          {/* Toggle button row */}
            {!isMobile && (
              <div className="mb-4">
                <button
                  onClick={toggleSidebar}
                  className={\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-full border border-transparent \${collapsed ? 'justify-center p-2.5' : 'px-4 py-2.5'}\`}
                  title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <div className="p-1.5 rounded-full group-hover:bg-red-50 transition-colors flex items-center justify-center">
                      {collapsed ? <PanelLeftOpen className="w-4.5 h-4.5 text-slate-400 group-hover:text-[#D8232A]" /> : <PanelLeftClose className="w-4.5 h-4.5 text-slate-400 group-hover:text-[#D8232A]" />}
                    </div>
                  </div>
                  {!collapsed && (
                    <div className="ml-3.5 flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100">
                      <span className="text-xs font-extrabold text-slate-400 group-hover:text-[#D8232A] uppercase tracking-widest">COLLAPSE</span>
                    </div>
                  )}
                </button>
              </div>
            )}

          {/* Category: Main Menu */}
          <div className="space-y-2">
            {!collapsed ? (
              <div className="text-[11px] font-extrabold text-[#D8232A] uppercase tracking-widest px-4 mb-2">Main Menu</div>
            ) : (
              <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider text-center mb-1 select-none">MENU</div>
            )}
            <div className="space-y-1">
              <button
                onClick={() => handleNavigate('dashboard')}
                className={\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-full border \${collapsed ? 'justify-center p-2.5' : 'px-4 py-2.5'} text-sm \${activeView === 'dashboard' ? 'bg-[#D8232A]/10 text-[#D8232A] border-[#D8232A] font-bold' : 'border-transparent text-slate-600 hover:bg-[#D8232A]/5 hover:text-[#D8232A] font-medium'}\`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <LayoutDashboard className={\`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 \${activeView === 'dashboard' ? 'text-[#D8232A]' : 'text-slate-400 group-hover:text-[#D8232A]'}\`} />
                </div>
                <div className={\`\${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100\`}>
                  <span className="truncate">Dashboard</span>
                </div>
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                    Dashboard
                  </div>
                )}
              </button>

              <button
                onClick={() => handleNavigate('children')}
                className={\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-full border \${collapsed ? 'justify-center p-2.5' : 'px-4 py-2.5'} text-sm \${activeView === 'children' || activeView === 'child-detail' ? 'bg-[#D8232A]/10 text-[#D8232A] border-[#D8232A] font-bold' : 'border-transparent text-slate-600 hover:bg-[#D8232A]/5 hover:text-[#D8232A] font-medium'}\`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Users className={\`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 \${activeView === 'children' || activeView === 'child-detail' ? 'text-[#D8232A]' : 'text-slate-400 group-hover:text-[#D8232A]'}\`} />
                </div>
                <div className={\`\${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100\`}>
                  <span className="truncate">My Students</span>
                </div>
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                    My Students
                  </div>
                )}
              </button>

              <button
                onClick={() => handleNavigate('announcements')}
                className={\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-full border \${collapsed ? 'justify-center p-2.5' : 'px-4 py-2.5'} text-sm \${activeView === 'announcements' ? 'bg-[#D8232A]/10 text-[#D8232A] border-[#D8232A] font-bold' : 'border-transparent text-slate-600 hover:bg-[#D8232A]/5 hover:text-[#D8232A] font-medium'}\`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Bell className={\`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 \${activeView === 'announcements' ? 'text-[#D8232A]' : 'text-slate-400 group-hover:text-[#D8232A]'}\`} />
                </div>
                <div className={\`\${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100\`}>
                  <span className="truncate">Announcements</span>
                </div>
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
              <div className="text-[11px] font-extrabold text-[#D8232A] uppercase tracking-widest px-4 mb-2">Registration</div>
            ) : (
              <div className="w-full flex justify-center my-2">
                <div className="w-4 h-[2px] bg-slate-200 rounded-full" />
              </div>
            )}
            <div className="space-y-1">
              <button
                onClick={() => handleNavigate('enrollment')}
                className={\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-full border \${collapsed ? 'justify-center p-2.5' : 'px-4 py-2.5'} text-sm \${activeView === 'enrollment' ? 'bg-[#D8232A]/10 text-[#D8232A] border-[#D8232A] font-bold' : 'border-transparent text-slate-600 hover:bg-[#D8232A]/5 hover:text-[#D8232A] font-medium'}\`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <UserPlus className={\`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 \${activeView === 'enrollment' ? 'text-[#D8232A]' : 'text-slate-400 group-hover:text-[#D8232A]'}\`} />
                </div>
                <div className={\`\${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100\`}>
                  <span className="truncate">Student Registration</span>
                </div>
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
              <div className="text-[11px] font-extrabold text-[#D8232A] uppercase tracking-widest px-4 mb-2">Documents</div>
            ) : (
              <div className="w-full flex justify-center my-2">
                <div className="w-4 h-[2px] bg-slate-200 rounded-full" />
              </div>
            )}
            <div className="space-y-1">
              <button
                onClick={() => handleNavigate('requirements')}
                className={\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-full border \${collapsed ? 'justify-center p-2.5' : 'px-4 py-2.5'} text-sm \${activeView === 'requirements' ? 'bg-[#D8232A]/10 text-[#D8232A] border-[#D8232A] font-bold' : 'border-transparent text-slate-600 hover:bg-[#D8232A]/5 hover:text-[#D8232A] font-medium'}\`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <FolderOpen className={\`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 \${activeView === 'requirements' ? 'text-[#D8232A]' : 'text-slate-400 group-hover:text-[#D8232A]'}\`} />
                </div>
                <div className={\`\${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100\`}>
                  <span className="truncate">Document Center</span>
                </div>
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                    Document Center
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* User Profile Section */}
        <div className={\`p-4 border-t border-slate-100 bg-white space-y-3 transition-all duration-300 \${collapsed ? 'px-2' : 'px-4'}\`}>
          {showUserMenu && !collapsed && (
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60 shadow-sm space-y-1 mb-3 animate-in fade-in slide-in-from-bottom-2">
              <button
                onClick={() => handleNavigate('settings')}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                Sign Out
              </button>
            </div>
          )}
          <div 
            className={\`w-full flex items-center \${collapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2'} hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-2xl cursor-pointer transition-all active:scale-98 relative group overflow-hidden\`}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-9 h-9 rounded-full bg-red-50 text-[#D8232A] flex items-center justify-center font-bold text-xs shrink-0 border border-red-100 shadow-inner overflow-hidden">
              {typeof (userData as any)?.photoURL === 'string' && (userData as any).photoURL ? (
                <img src={(userData as any).photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0 overflow-hidden text-left">
                  <p className="text-xs font-black truncate text-slate-800 leading-tight" title={fullName}>{fullName}</p>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate mt-0.5">{relationship}</p>
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
                {fullName}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };`;

const startIndex = content.indexOf('  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {');
const endIndex = content.indexOf('  return (', startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newSidebarContent + "\n\n" + content.substring(endIndex);
  fs.writeFileSync('src/pages/parent/ParentPortal.tsx', content);
  
  // Also copy to modules directory to be safe
  fs.copyFileSync('src/pages/parent/ParentPortal.tsx', 'src/modules/parent/ParentPortal.tsx');
  console.log("Successfully replaced SidebarContent");
} else {
  console.error("Could not find start or end index");
}
