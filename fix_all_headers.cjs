const fs = require('fs');

function updateRequirementsView(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Add FolderOpen if missing
  if (!content.includes('FolderOpen,')) {
    content = content.replace('FileText,', 'FileText,\\n  FolderOpen,');
  }

  const targetHeader = `      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <header className="px-6 py-6 lg:py-0 lg:h-28 border-b border-slate-100 bg-white flex items-center shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">Document Center</h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage and sync required documents for your learner's registration.
            </p>
          </div>`;

  const newHeader = `      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
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

  if (content.includes(targetHeader)) {
    content = content.replace(targetHeader, newHeader);
    fs.writeFileSync(filePath, content);
    console.log("Updated " + filePath);
  }
}

function updateEnrollmentForm(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Add UserPlus if missing
  if (!content.includes('UserPlus,')) {
    content = content.replace('Users,', 'Users,\\n  UserPlus,');
  }

  const targetHeader = `      {/* ── HEADER CARD WITH PROGRESS BAR ── */}
      <header className="px-6 sm:px-8 bg-white border-b border-slate-100 lg:h-28 flex items-center shrink-0">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Title & Subtitle */}
          <div className="text-left">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">Student Registration Form</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5 leading-none">Sta. Maria Elementary School Learner Portal</p>
          </div>`;

  const newHeader = `      {/* ── HEADER CARD WITH PROGRESS BAR ── */}
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

  if (content.includes(targetHeader)) {
    content = content.replace(targetHeader, newHeader);
    fs.writeFileSync(filePath, content);
    console.log("Updated " + filePath);
  }
}

updateRequirementsView('src/components/parent/RequirementsView.tsx');
updateRequirementsView('src/modules/parent/RequirementsView.tsx');
updateEnrollmentForm('src/components/parent/EnrollmentForm.tsx');
updateEnrollmentForm('src/modules/parent/EnrollmentForm.tsx');
