const fs = require('fs');

const path1 = 'src/pages/parent/ParentPortal.tsx';
let content = fs.readFileSync(path1, 'utf8');

const targetHeader = `        {/* Brand Header */}
          <div className="h-[72px] border-b border-slate-200 flex items-center px-4 shrink-0 overflow-hidden relative cursor-pointer" onClick={() => handleNavigate('dashboard')}>
            <div className="p-1.5 bg-[#D32F2F]/5 rounded-xl border border-[#D32F2F]/10 shadow-sm shrink-0 transition-all duration-200">
              <img src="/pasted-image.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            </div>
            <div className={\`ml-3 flex flex-col text-left overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out \${collapsed ? 'w-0 opacity-0' : 'w-36 opacity-100'}\`}>
              <span className="font-extrabold text-sm text-slate-800 tracking-tight leading-none">Sta. Maria</span>
              <span className="text-[10px] font-bold text-[#D8232A] uppercase tracking-widest leading-none mt-1 truncate">Parent Portal</span>
            </div>
          </div>`;

const newHeader = `        {/* Brand Header */}
          <div className="h-16 lg:h-28 border-b border-slate-100 flex items-center px-4 shrink-0 overflow-hidden relative cursor-pointer" onClick={() => handleNavigate('dashboard')}>
            <div className="p-1.5 bg-[#D32F2F]/5 rounded-xl border border-[#D32F2F]/10 shadow-sm shrink-0 transition-all duration-200">
              <img src="/pasted-image.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            </div>
            <div className={\`ml-3 flex flex-col text-left overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out \${collapsed ? 'w-0 opacity-0' : 'w-36 opacity-100'}\`}>
              <span className="font-extrabold text-sm text-slate-800 tracking-tight leading-none">Sta. Maria</span>
              <span className="text-[10px] font-bold text-[#D8232A] uppercase tracking-widest leading-none mt-1 truncate">Parent Portal</span>
            </div>
          </div>`;

const targetToggle = `          {/* Toggle button row */}
            {!isMobile && (
              <div className={\`mb-4 px-4 flex \${collapsed ? 'justify-center' : 'justify-end'}\`}>
                <button
                  onClick={toggleSidebar}
                  className="flex items-center gap-2 text-xs font-extrabold transition-all duration-200 cursor-pointer text-slate-400 hover:text-[#D8232A] uppercase tracking-widest group"
                  title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                  {collapsed ? (
                    <div className="p-1.5 rounded-full hover:bg-red-50 transition-colors">
                      <PanelLeftOpen className="w-4.5 h-4.5" />
                    </div>
                  ) : (
                    <>
                      <div className="p-1.5 rounded-full group-hover:bg-red-50 transition-colors">
                        <PanelLeftClose className="w-4.5 h-4.5" />
                      </div>
                      <span className="mt-0.5">COLLAPSE</span>
                    </>
                  )}
                </button>
              </div>
            )}`;

const newToggle = `          {/* Toggle button row */}
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
            )}`;

content = content.replace(targetHeader, newHeader);
content = content.replace(targetToggle, newToggle);

fs.writeFileSync(path1, content);

fs.copyFileSync(path1, 'src/modules/parent/ParentPortal.tsx');
try {
  fs.copyFileSync(path1, 'src/pages/ParentPortal.tsx');
} catch (e) {}

console.log("Done");
