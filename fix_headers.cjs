const fs = require('fs');

const path1 = 'src/modules/parent/RequirementsView.tsx';
let content1 = fs.readFileSync(path1, 'utf8');

const targetHeader1 = `      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <header className="px-6 py-6 lg:py-0 lg:h-28 border-b border-slate-100 bg-white flex items-center shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">Document Center</h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage and sync required documents for your learner's registration.
            </p>
          </div>`;

const newHeader1 = `      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <header className="px-6 py-6 lg:py-0 lg:h-28 border-b border-slate-100 bg-white flex items-center shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#D8232A] shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">Document Center</h1>
              <p className="text-xs text-slate-500 font-medium">
                Manage and sync required documents for your learner's registration.
              </p>
            </div>
          </div>`;

content1 = content1.replace(targetHeader1, newHeader1);
fs.writeFileSync(path1, content1);
console.log("Updated RequirementsView.tsx");

// EnrollmentForm
const path2 = 'src/components/parent/EnrollmentForm.tsx';
let content2 = fs.readFileSync(path2, 'utf8');

// Ensure UserPlus is imported
if (!content2.includes('UserPlus,')) {
  content2 = content2.replace('Users,', 'Users,\\n  UserPlus,');
}

const targetHeader2 = `      {/* ── HEADER CARD WITH PROGRESS BAR ── */}
      <header className="px-6 sm:px-8 bg-white border-b border-slate-100 lg:h-28 flex items-center shrink-0">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Title & Subtitle */}
          <div className="text-left">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">Student Registration Form</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5 leading-none">Sta. Maria Elementary School Learner Portal</p>
          </div>`;

const newHeader2 = `      {/* ── HEADER CARD WITH PROGRESS BAR ── */}
      <header className="px-6 sm:px-8 bg-white border-b border-slate-100 lg:h-28 flex items-center shrink-0">
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Title & Subtitle */}
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#D8232A] shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">Student Registration Form</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5 leading-none">Sta. Maria Elementary School Learner Portal</p>
            </div>
          </div>`;

content2 = content2.replace(targetHeader2, newHeader2);
fs.writeFileSync(path2, content2);
console.log("Updated EnrollmentForm.tsx");
