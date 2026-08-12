const fs = require('fs');
const path = require('path');

const dir = 'src/modules/teacher';

function processFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // 1. Remove max-w constraints for full width ("consume all space")
    content = content.replace(/max-w-7xl mx-auto/g, '');
    content = content.replace(/max-w-\[1600px\] mx-auto/g, '');
    
    // 2. Make headers static and small
    // Match common header class variations and replace with h-14 to sync with sidebar
    content = content.replace(/<header className="[^"]*">/g, (match) => {
        // preserve background if it has one, otherwise white
        let bgClass = match.includes('bg-') ? match.match(/bg-[a-zA-Z0-9\-\/]+/)[0] : 'bg-white';
        let blurClass = match.includes('backdrop-blur') ? 'backdrop-blur-md' : '';
        return `<header className="h-14 px-6 sm:px-8 border-b border-slate-200 ${bgClass} ${blurClass} shrink-0 flex items-center">`;
    });
    
    // 3. Minimize text sizes in the header titles to fit the h-14 space
    content = content.replace(/<h1 className="[^"]*text-2xl sm:text-3xl[^"]*">/g, '<h1 className="text-xl font-bold tracking-tight text-slate-900">');
    content = content.replace(/<h1 className="[^"]*text-3xl[^"]*">/g, '<h1 className="text-xl font-bold tracking-tight text-slate-900">');
    content = content.replace(/<h1 className="[^"]*text-xl sm:text-2xl[^"]*">/g, '<h1 className="text-xl font-bold tracking-tight text-slate-900">');
    
    // 4. Reduce description sizes to fit the tighter layout
    content = content.replace(/<p className="text-sm text-slate-500/g, '<p className="text-xs text-slate-500');
    content = content.replace(/<p className="text-sm text-slate-600/g, '<p className="text-xs text-slate-600');
    
    fs.writeFileSync(filePath, content, 'utf-8');
}

// Process all views
const views = [
    'AttendanceView.tsx',
    'EnrollmentsView.tsx',
    'GradesView.tsx',
    'MyScheduleView.tsx',
    'ObservedValuesView.tsx',
    'StudentsView.tsx',
    'TeacherDashboardView.tsx',
    'TeacherReportsView.tsx',
    'TeacherStudentDetailView.tsx'
];

views.forEach(v => processFile(path.join(dir, v)));

// Fix the layout in src/pages/TeacherDashboard.tsx to sync logo and collapse button
let layoutPath = 'src/pages/TeacherDashboard.tsx';
if (fs.existsSync(layoutPath)) {
    let layout = fs.readFileSync(layoutPath, 'utf-8');
    
    // Convert logo container to h-14 to match the synced headers, and add border-b
    layout = layout.replace(/<div className="h-16 flex items-center justify-between px-6 shrink-0">/, '<div className="h-14 flex items-center justify-between px-6 shrink-0 border-b border-border">');
    
    // Make logo click read-only and remove chevron if exists
    layout = layout.replace(/onClick=\{[^}]*\}\s*className="flex items-center gap-3 cursor-pointer"/, 'className="flex items-center gap-3"');
    layout = layout.replace(/<ChevronDown className="w-4 h-4 text-muted-foreground hidden lg:block" \/>/, '');
    
    fs.writeFileSync(layoutPath, layout, 'utf-8');
}

console.log('Fixed headers and layout width.');
