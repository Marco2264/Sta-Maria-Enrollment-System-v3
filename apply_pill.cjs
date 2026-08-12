const fs = require('fs');
let content = fs.readFileSync('src/pages/parent/ParentPortal.tsx', 'utf8');

// 1. Update Section Headers to be Red
// Current: <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-3">Main Menu</div>
content = content.replace(/<div className="text-\[11px\] font-bold text-slate-400 uppercase tracking-widest px-4 mb-3">(.*?)<\/div>/g, 
  `<div className="text-[11px] font-extrabold text-[#D8232A] uppercase tracking-widest px-4 mb-2">$1</div>`);

// 2. Update Toggle Button (Collapse)
// Bring back "COLLAPSE" text and align to the right side
content = content.replace(/\{\/\* Toggle button row \*\/\}\s*\{\!isMobile && \(\s*<div className=\{\`mb-2 \$\{collapsed \? 'px-1' : ''\}\`\}>\s*<button[\s\S]*?onClick=\{toggleSidebar\}[\s\S]*?className="w-full flex items-center px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer relative group rounded-xl border border-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-700 hover:border-slate-200"[\s\S]*?>[\s\S]*?<div className="w-5 h-5 flex items-center justify-center shrink-0">[\s\S]*?\{collapsed \? <PanelLeftOpen className="w-4\.5 h-4\.5" \/> : <PanelLeftClose className="w-4\.5 h-4\.5" \/>\}[\s\S]*?<\/div>[\s\S]*?<\/button>\s*<\/div>\s*\)\}/, 
`{/* Toggle button row */}
            {!isMobile && (
              <div className={\`mb-4 px-4 flex \${collapsed ? 'justify-center' : 'justify-end'}\`}>
                <button
                  onClick={toggleSidebar}
                  className="flex items-center gap-2 text-xs font-extrabold transition-all duration-200 cursor-pointer text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                  title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                  {collapsed ? (
                    <PanelLeftOpen className="w-4.5 h-4.5" />
                  ) : (
                    <>
                      <span className="mt-0.5">Collapse</span>
                      <PanelLeftClose className="w-4.5 h-4.5" />
                    </>
                  )}
                </button>
              </div>
            )}`);

// 3. Update Nav Items (Pill shape, active state styles)
// Current active: 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs'
// Current inactive: 'border-transparent text-slate-600 hover:bg-[#D32F2F]/5 hover:text-[#D32F2F] hover:border-[#D32F2F]/40 font-medium'
// Current generic: 'w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2'} text-sm'
// We want `rounded-full` instead of `rounded-xl`, maybe `px-4 py-2.5`.
// And no hover border for inactive, just hover bg/text.

const activeStyle = `'bg-[#D8232A]/10 text-[#D8232A] border-[#D8232A] font-bold'`;
const inactiveStyle = `'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'`;
const genericStyle = `'w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-full border \${collapsed ? 'justify-center p-2.5' : 'px-4 py-2.5'} text-sm'`;

// We have 5 blocks, let's just do a blanket replace for the classes:
content = content.replace(/className=\{\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-xl border \$\{collapsed \? 'justify-center p-2\.5' : 'px-3 py-2'\} text-sm \$\{(.*?)\}\`\}/g, (match, cond) => {
  // cond is something like `activeView === 'dashboard' ? 'bg-[#D32F2F]/10 text-[#D32F2F] border-[#D32F2F] font-bold shadow-xs' : 'border-transparent text-slate-600 hover:bg-[#D32F2F]/5 hover:text-[#D32F2F] hover:border-[#D32F2F]/40 font-medium'`
  // Let's replace it by extracting the condition
  const condMatch = cond.match(/^(.*?) \? /);
  if (condMatch) {
    const activeCondition = condMatch[1];
    return `className={\`w-full flex items-center transition-all duration-200 cursor-pointer relative group rounded-full border \${collapsed ? 'justify-center p-2.5' : 'px-4 py-2.5'} text-sm \${${activeCondition} ? ${activeStyle} : ${inactiveStyle}}\`}`;
  }
  return match;
});

// Update the icon colors: D32F2F to D8232A
content = content.replace(/text-\[\#D32F2F\]/g, 'text-[#D8232A]');

fs.writeFileSync('src/pages/parent/ParentPortal.tsx', content);
