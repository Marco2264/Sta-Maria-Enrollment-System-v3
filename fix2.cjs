const fs = require('fs');
const path = require('path');

const dir = 'src/modules/teacher';

function processFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace h-14 with min-h-[72px] py-3 to give enough space for the elements but keep it compact
    content = content.replace(/<header className="h-14 px-6 sm:px-8 border-b border-slate-200 (.*?) shrink-0 flex items-center">/g, 
        '<header className="min-h-[72px] py-3 px-6 sm:px-8 border-b border-slate-200 $1 shrink-0 flex items-center justify-between">');
    
    // Fix any flex-col in the immediate wrapper so it aligns horizontally
    content = content.replace(/<div className="flex flex-col md:flex-row md:items-center/g, 
        '<div className="flex flex-row items-center');

    // Hide the description if it exists so it's cleaner in a compact header
    content = content.replace(/<p className="text-xs text-slate-500/g, '<p className="hidden md:block text-xs text-slate-500');
    content = content.replace(/<p className="text-xs text-slate-600/g, '<p className="hidden md:block text-xs text-slate-600');

    fs.writeFileSync(filePath, content, 'utf-8');
}

const views = [
    'AttendanceView.tsx',
    'EnrollmentsView.tsx',
    'GradesView.tsx',
    'MyScheduleView.tsx',
    'ObservedValuesView.tsx',
    'StudentsView.tsx',
    'TeacherDashboardView.tsx',
    'TeacherReportsView.tsx'
];

views.forEach(v => processFile(path.join(dir, v)));

// Fix the layout in src/pages/TeacherDashboard.tsx to sync logo and collapse button
let layoutPath = 'src/pages/TeacherDashboard.tsx';
if (fs.existsSync(layoutPath)) {
    let layout = fs.readFileSync(layoutPath, 'utf-8');
    
    // Convert logo container to match min-h-[72px]
    layout = layout.replace(/<div className="h-14 flex items-center justify-between px-6 shrink-0 border-b border-border">/, '<div className="min-h-[72px] py-3 flex items-center justify-between px-6 shrink-0 border-b border-border">');
    
    fs.writeFileSync(layoutPath, layout, 'utf-8');
}

console.log('Fixed header heights to 72px.');
