  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const collapsed = isMobile ? false : sidebarCollapsed;
    return (
      <div className="flex flex-col h-full bg-white font-sans border-r border-slate-100 z-50 overflow-x-hidden">
        {/* Brand Header */}
        <div className={`h-16 lg:h-28 flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-6'} border-b border-slate-100 shrink-0 cursor-pointer overflow-hidden`} onClick={() => handleNavigate('dashboard')}>
          <div className="p-1.5 bg-red-50/80 rounded-xl border border-red-100/80 shadow-xs shrink-0">
            <img src="/pasted-image.jpg" alt="Sta. Maria Logo" className="w-8 h-8 rounded-lg object-cover" />
          </div>
          {!collapsed && (
            <div className="flex flex-col text-left">
              <span className="text-xl font-bold tracking-tight text-slate-900 leading-none">Sta. Maria</span>
              <span className="text-[10px] font-extrabold text-[#D8232A] uppercase tracking-widest leading-none mt-1">Parent Portal</span>
            </div>
          )}
        </div>

        {/* Nav Menu Items */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden no-scrollbar ${collapsed ? 'py-4 px-2 space-y-4' : 'py-5 px-4 space-y-5'}`}>
          {/* Toggle Button row above Main Menu */}
          {!isMobile && (
            <div className={`flex items-center justify-center mb-2`}>

              <button
                onClick={toggleSidebar}
                className="p-1.5 rounded-xl text-slate-400 hover:text-[#D8232A] hover:bg-red-50 transition-all cursor-pointer shrink-0 relative group"
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
                className={`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'} text-sm ${
                  activeView === 'dashboard'
                    ? collapsed 
                      ? 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs' 
                      : 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs'
                    : 'border-transparent text-slate-600 hover:bg-[#D32F2F]/5 hover:text-[#D32F2F] hover:border-[#D32F2F]/40 font-medium'
                }`}
              >
                <LayoutDashboard className={`w-5 h-5 shrink-0 ${activeView === 'dashboard' ? 'text-[#D8232A]' : 'text-slate-400'}`} />
                <div className={`${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100`}><span className="truncate">Dashboard</span></div>
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                    Dashboard
                  </div>
                )}
              </button>

              <button
                onClick={() => handleNavigate('children')}
                className={`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'} text-sm ${
                  activeView === 'children' || activeView === 'child-detail'
                    ? collapsed 
                      ? 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs' 
                      : 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs'
                    : 'border-transparent text-slate-600 hover:bg-[#D32F2F]/5 hover:text-[#D32F2F] hover:border-[#D32F2F]/40 font-medium'
                }`}
              >
                <Users className={`w-5 h-5 shrink-0 ${activeView === 'children' || activeView === 'child-detail' ? 'text-[#D8232A]' : 'text-slate-400'}`} />
                <div className={`${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100`}><span className="truncate">My Students</span></div>
                {collapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">
                    My Students
                  </div>
                )}
              </button>

              <button
                onClick={() => handleNavigate('announcements')}
                className={`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'} text-sm ${
                  activeView === 'announcements'
                    ? collapsed 
                      ? 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs' 
                      : 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs'
                    : 'border-transparent text-slate-600 hover:bg-[#D32F2F]/5 hover:text-[#D32F2F] hover:border-[#D32F2F]/40 font-medium'
                }`}
              >
                <Bell className={`w-5 h-5 shrink-0 ${activeView === 'announcements' ? 'text-[#D8232A]' : 'text-slate-400'}`} />
                <div className={`${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100`}><span className="truncate">Announcements</span></div>
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
                className={`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'} text-sm ${
                  activeView === 'enrollment'
                    ? collapsed 
                      ? 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs' 
                      : 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs'
                    : 'border-transparent text-slate-600 hover:bg-[#D32F2F]/5 hover:text-[#D32F2F] hover:border-[#D32F2F]/40 font-medium'
                }`}
              >
                <UserPlus className={`w-5 h-5 shrink-0 ${activeView === 'enrollment' ? 'text-[#D8232A]' : 'text-slate-400'}`} />
                <div className={`${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100`}><span className="truncate">Student Registration</span></div>
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
                className={`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'} text-sm ${
                  activeView === 'requirements'
                    ? collapsed 
                      ? 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs' 
                      : 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs'
                    : 'border-transparent text-slate-600 hover:bg-[#D32F2F]/5 hover:text-[#D32F2F] hover:border-[#D32F2F]/40 font-medium'
                }`}
              >
                <FolderOpen className={`w-5 h-5 shrink-0 ${activeView === 'requirements' ? 'text-[#D8232A]' : 'text-slate-400'}`} />
                <div className={`${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100`}><span className="truncate">Document Center</span></div>
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
  };

