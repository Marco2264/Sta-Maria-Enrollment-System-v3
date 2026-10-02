const fs = require('fs');
let content = fs.readFileSync('src/pages/parent/ParentPortal.tsx', 'utf8');

content = content.replace(/className=\{\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \$\{collapsed \? 'justify-center p-2\.5' : 'px-3 py-2'\} text-sm \$\{\}/g, "className={`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'} text-sm ${");

// Fix the active state for dashboard
content = content.replace(/className=\{\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \$\{collapsed \? 'justify-center p-2\.5' : 'px-3 py-2'\} text-sm \$\{\s*>\s*<LayoutDashboard className=\{\`w-5 h-5 shrink-0 \$\{activeView === 'dashboard' \? 'text-\[\#D8232A\]' : 'text-slate-400'\}\`\} \/>\s*\{\!collapsed && <span className="flex-1 text-left truncate">Dashboard<\/span>\}/g, 
`className={\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'} text-sm \${activeView === 'dashboard' ? 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs' : 'border-transparent text-slate-600 hover:bg-[#D32F2F]/5 hover:text-[#D32F2F] hover:border-[#D32F2F]/40 font-medium'}\`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <LayoutDashboard className={\`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 \${activeView === 'dashboard' ? 'text-[#D32F2F]' : 'text-slate-400 group-hover:text-[#D32F2F]'}\`} />
                </div>
                <div className={\`\${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100\`}>
                  <span className="truncate">Dashboard</span>
                </div>`);

// Fix My Students
content = content.replace(/className=\{\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \$\{collapsed \? 'justify-center p-2\.5' : 'px-3 py-2'\} text-sm \$\{\s*>\s*<Users className=\{\`w-5 h-5 shrink-0 \$\{activeView === 'children' \|\| activeView === 'child-detail' \? 'text-\[\#D8232A\]' : 'text-slate-400'\}\`\} \/>\s*\{\!collapsed && <span className="flex-1 text-left truncate">My Students<\/span>\}/g, 
`className={\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'} text-sm \${(activeView === 'children' || activeView === 'child-detail') ? 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs' : 'border-transparent text-slate-600 hover:bg-[#D32F2F]/5 hover:text-[#D32F2F] hover:border-[#D32F2F]/40 font-medium'}\`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Users className={\`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 \${(activeView === 'children' || activeView === 'child-detail') ? 'text-[#D32F2F]' : 'text-slate-400 group-hover:text-[#D32F2F]'}\`} />
                </div>
                <div className={\`\${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100\`}>
                  <span className="truncate">My Students</span>
                </div>`);

// Fix Announcements
content = content.replace(/className=\{\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \$\{collapsed \? 'justify-center p-2\.5' : 'px-3 py-2'\} text-sm \$\{\s*>\s*<Bell className=\{\`w-5 h-5 shrink-0 \$\{activeView === 'announcements' \? 'text-\[\#D8232A\]' : 'text-slate-400'\}\`\} \/>\s*\{\!collapsed && <span className="flex-1 text-left truncate">Announcements<\/span>\}/g, 
`className={\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'} text-sm \${activeView === 'announcements' ? 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs' : 'border-transparent text-slate-600 hover:bg-[#D32F2F]/5 hover:text-[#D32F2F] hover:border-[#D32F2F]/40 font-medium'}\`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Bell className={\`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 \${activeView === 'announcements' ? 'text-[#D32F2F]' : 'text-slate-400 group-hover:text-[#D32F2F]'}\`} />
                </div>
                <div className={\`\${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100\`}>
                  <span className="truncate">Announcements</span>
                </div>`);

// Fix Student Registration
content = content.replace(/className=\{\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \$\{collapsed \? 'justify-center p-2\.5' : 'px-3 py-2'\} text-sm \$\{\s*>\s*<UserPlus className=\{\`w-5 h-5 shrink-0 \$\{activeView === 'enrollment' \? 'text-\[\#D8232A\]' : 'text-slate-400'\}\`\} \/>\s*\{\!collapsed && <span className="flex-1 text-left truncate">Student Registration<\/span>\}/g, 
`className={\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'} text-sm \${activeView === 'enrollment' ? 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs' : 'border-transparent text-slate-600 hover:bg-[#D32F2F]/5 hover:text-[#D32F2F] hover:border-[#D32F2F]/40 font-medium'}\`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <UserPlus className={\`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 \${activeView === 'enrollment' ? 'text-[#D32F2F]' : 'text-slate-400 group-hover:text-[#D32F2F]'}\`} />
                </div>
                <div className={\`\${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100\`}>
                  <span className="truncate">Student Registration</span>
                </div>`);

// Fix Document Center
content = content.replace(/className=\{\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \$\{collapsed \? 'justify-center p-2\.5' : 'px-3 py-2'\} text-sm \$\{\s*>\s*<FolderOpen className=\{\`w-5 h-5 shrink-0 \$\{activeView === 'requirements' \? 'text-\[\#D8232A\]' : 'text-slate-400'\}\`\} \/>\s*\{\!collapsed && <span className="flex-1 text-left truncate">Document Center<\/span>\}/g, 
`className={\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'} text-sm \${activeView === 'requirements' ? 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs' : 'border-transparent text-slate-600 hover:bg-[#D32F2F]/5 hover:text-[#D32F2F] hover:border-[#D32F2F]/40 font-medium'}\`}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <FolderOpen className={\`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105 \${activeView === 'requirements' ? 'text-[#D32F2F]' : 'text-slate-400 group-hover:text-[#D32F2F]'}\`} />
                </div>
                <div className={\`\${collapsed ? 'hidden' : 'ml-3.5'} flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out w-auto opacity-100\`}>
                  <span className="truncate">Document Center</span>
                </div>`);

// Brand Header update (matching Admin portal)
content = content.replace(/\{\/\* Brand Header \*\/\}\s*<div className=\{\`h-16 lg:h-28 flex items-center \$\{collapsed \? 'justify-center px-2' : 'gap-3 px-6'\} border-b border-slate-100 shrink-0 cursor-pointer overflow-hidden\`\} onClick=\{[\s\S]*?\}>\s*<div className="p-1\.5 bg-red-50\/80 rounded-xl border border-red-100\/80 shadow-xs shrink-0">\s*<img src="\/pasted-image\.jpg" alt="Sta\. Maria Logo" className="w-8 h-8 rounded-lg object-cover" \/>\s*<\/div>\s*\{\!collapsed && \(\s*<div className="flex flex-col text-left">\s*<span className="text-xl font-bold tracking-tight text-slate-900 leading-none">Sta\. Maria<\/span>\s*<span className="text-\[10px\] font-extrabold text-\[\#D8232A\] uppercase tracking-widest leading-none mt-1">Parent Portal<\/span>\s*<\/div>\s*\)\}\s*<\/div>/, 
`{/* Brand Header */}
          <div className="h-[72px] border-b border-slate-200 flex items-center px-4 shrink-0 overflow-hidden relative cursor-pointer" onClick={() => handleNavigate('dashboard')}>
            <div className="p-1.5 bg-[#D32F2F]/5 rounded-xl border border-[#D32F2F]/10 shadow-sm shrink-0 transition-all duration-200">
              <img src="/pasted-image.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            </div>
            <div className={\`ml-3 flex flex-col text-left overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out \${collapsed ? 'w-0 opacity-0' : 'w-36 opacity-100'}\`}>
              <span className="font-extrabold text-sm text-slate-800 tracking-tight leading-none">Sta. Maria</span>
              <span className="text-[10px] font-bold text-[#D32F2F] uppercase tracking-widest leading-none mt-1 truncate">Parent Portal</span>
            </div>
          </div>`);

// Finally, update the Toggle Button itself to match admin style
content = content.replace(/\{\/\* Toggle Button row above Main Menu \*\/\}\s*\{\!isMobile && \(\s*<div className=\{\`flex items-center justify-center mb-2\`\}>\s*<button\s*onClick=\{toggleSidebar\}\s*className="p-1\.5 rounded-xl text-slate-400 hover:text-\[\#D8232A\] hover:bg-red-50 transition-all cursor-pointer shrink-0 relative group"\s*title=\{collapsed \? 'Expand Sidebar' : 'Collapse Sidebar'\}\s*>\s*\{collapsed \? <PanelLeftOpen className="w-4\.5 h-4\.5 text-slate-500" \/> : <PanelLeftClose className="w-4\.5 h-4\.5" \/>\}\s*\{collapsed && \(\s*<div className="absolute left-full ml-3 px-3 py-1\.5 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap shadow-xl">\s*Expand Sidebar\s*<\/div>\s*\)\}\s*<\/button>\s*<\/div>\s*\)\}/,
`{/* Toggle button row */}
            {!isMobile && (
              <div className={\`mb-2 \${collapsed ? 'px-1' : ''}\`}>
                <button
                  onClick={toggleSidebar}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer relative group rounded-xl border border-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-200"
                  title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {collapsed ? <PanelLeftOpen className="w-4.5 h-4.5" /> : <PanelLeftClose className="w-4.5 h-4.5" />}
                  </div>
                </button>
              </div>
            )}`);

fs.writeFileSync('src/pages/parent/ParentPortal.tsx', content);
