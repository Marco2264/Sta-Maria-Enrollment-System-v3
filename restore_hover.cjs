const fs = require('fs');
let content = fs.readFileSync('src/pages/parent/ParentPortal.tsx', 'utf8');

// Replace the inactive hover styles on the nav items
// Currently: 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
// We want: 'border-transparent text-slate-600 hover:bg-red-50/50 hover:text-[#D8232A] font-medium'
content = content.replace(/hover:bg-slate-50 hover:text-slate-900/g, 'hover:bg-[#D8232A]/5 hover:text-[#D8232A]');

fs.writeFileSync('src/pages/parent/ParentPortal.tsx', content);
