const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'modules', 'teacher', 'TeacherStudentDetailView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const newReturnStmt = `<div className="flex flex-col h-full bg-white relative">
      {/* HEADER */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={onBack} className="text-slate-500 font-medium hover:text-slate-700 transition-colors cursor-pointer">
            Students
          </button>
          <span className="text-slate-400">›</span>
          <span className="font-bold text-slate-900 uppercase">{child.firstName} {child.lastName}</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 rounded-lg px-4 gap-2 font-semibold">
            <XCircle className="w-4 h-4" /> Reject
          </Button>
          <Button className="bg-[#001D3D] hover:bg-[#001529] text-white rounded-lg px-4 gap-2 font-semibold border-none shadow-sm">
            <CheckCircle2 className="w-4 h-4" /> Approve Enrollment
          </Button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
        
        {/* ALERT */}
        <div className="bg-[#FFF9E6] border border-[#FFE082] p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900">Enrollment is pending review</h4>
            <p className="text-sm text-amber-700/80 mt-0.5">This student's enrollment is currently pending your review. Please verify the submitted documents below.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COL */}
          <div className="lg:col-span-1 space-y-6 h-fit">
            <Card className="p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-sm border-slate-200 rounded-xl">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-slate-100 bg-slate-50 flex items-center justify-center">
                 {(() => {
                    const photo = getStudentPhoto(child);
                    return photo ? (
                      <img src={photo} alt={child.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-slate-300" />
                    );
                  })()}
              </div>
              <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight mt-2">
                {child.firstName} {child.lastName}
              </h2>
              <div className="flex items-center gap-2 justify-center flex-wrap mt-2">
                <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 px-3 py-1 font-medium rounded-full shadow-none text-xs">Grade {child.gradeLevel}</Badge>
                <Badge variant="outline" className="text-slate-600 border-slate-200 bg-slate-50 px-3 py-1 font-medium rounded-full shadow-none text-xs">School Year 2026-2027</Badge>
              </div>
            </Card>
          </div>

          {/* RIGHT COL */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="personal" className="w-full">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                <TabsList className="bg-transparent border-none p-0 h-auto gap-4">
                  <TabsTrigger value="personal" className="px-2 py-2 rounded-none text-sm font-semibold text-slate-500 data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent hover:bg-slate-50/50 transition-none flex items-center gap-2 border-transparent">
                    <User className="w-4 h-4" /> Personal Info
                  </TabsTrigger>
                  <TabsTrigger value="medical" className="px-2 py-2 rounded-none text-sm font-semibold text-slate-500 data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent hover:bg-slate-50/50 transition-none flex items-center gap-2 border-transparent">
                    <BarChart3 className="w-4 h-4" /> Medical
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="px-2 py-2 rounded-none text-sm font-semibold text-slate-500 data-[state=active]:text-slate-900 data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none bg-transparent hover:bg-slate-50/50 transition-none flex items-center gap-2 border-transparent">
                    <FileText className="w-4 h-4" /> Documents
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="personal" className="mt-6 space-y-4 outline-none">
                {/* Personal Information */}
                <Card className="p-6 rounded-xl border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
                      <p className="text-xs text-slate-500 font-medium">Basic student details & demographics</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">FIRST NAME</p>
                      <p className="text-sm text-slate-900 font-semibold uppercase">{child.firstName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">MIDDLE NAME</p>
                      <p className="text-sm text-slate-900 font-semibold uppercase">{child.middleName || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">LAST NAME</p>
                      <p className="text-sm text-slate-900 font-semibold uppercase">{child.lastName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">DATE OF BIRTH</p>
                      <p className="text-sm text-slate-900 font-semibold">{child.birthDate || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">GENDER</p>
                      <p className="text-sm text-slate-900 font-semibold capitalize">{child.gender || '--'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">MOTHER TONGUE</p>
                      <p className="text-sm text-slate-900 font-semibold">{child.additional?.motherTongue || '--'}</p>
                    </div>
                  </div>
                </Card>

                {/* Address & Contact */}
                <Card className="p-6 rounded-xl border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Address & Contact</h3>
                      <p className="text-xs text-slate-500 font-medium">Primary residence & location details</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">PRIMARY RESIDENCE</p>
                    <div className="bg-slate-50/80 p-4 rounded-xl text-xs font-medium text-slate-700 break-all border border-slate-100 leading-relaxed shadow-inner">
                      {child.address?.street ? \`\${child.address.street}, \` : ''}{child.address?.barangay || ''}{child.address?.city ? \`, \${child.address.city}\` : ''}{child.address?.zipCode ? \`, \${child.address.zipCode}\` : ''}
                      {!child.address?.street && !child.address?.barangay && "https://lh3.googleusercontent.com/a/acg-..."}
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="medical" className="mt-4 outline-none">
                <Card className="p-12 text-center border-slate-200 shadow-sm rounded-xl">
                  <p className="text-slate-500 font-medium">Medical Information will appear here.</p>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-4 outline-none">
                <Card className="p-12 text-center border-slate-200 shadow-sm rounded-xl">
                  <p className="text-slate-500 font-medium">Student Documents will appear here.</p>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>`;

const returnStartIndex = content.indexOf('<div className="flex flex-col h-full bg-[#F4F7F9]">');
const editDialogIndex = content.indexOf('{/* Edit Student Dialog */}');

if (returnStartIndex === -1 || editDialogIndex === -1) {
  console.error("Could not find insertion points.");
  process.exit(1);
}

const beforeReturn = content.substring(0, returnStartIndex);
const afterDialog = content.substring(editDialogIndex);

const newContent = beforeReturn + newReturnStmt + "\n\n      " + afterDialog;
fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Successfully replaced UI!");
