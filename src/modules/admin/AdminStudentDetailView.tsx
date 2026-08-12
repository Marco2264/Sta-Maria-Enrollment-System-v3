import React, { useState, useEffect } from "react";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/Tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table";
import { ArrowLeft, CheckCircle2, CircleDashed, XCircle, AlertCircle, User, HeartPulse, CalendarCheck, Edit, MapPin, BarChart3, GraduationCap, Loader2, Camera, Search, FileText, Lock, ShieldCheck, Users } from "lucide-react";
import { db } from "../../lib/firebase";
import { doc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { uploadToImageKit, buildImageKitFolder, buildStandardizedFileName } from "../../lib/services/imageUploadService";
import { AdminEditStudentModal } from "./AdminEditStudentModal";

interface Props { student: any; onBack: () => void; }

export function AdminStudentDetailView({ student: child, onBack }: Props) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (!child?.id) return;
    const q = query(collection(db, 'enrollment_documents'), where('enrollmentId', '==', child.id));
    const unsub = onSnapshot(q, snap => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [child?.id]);

  if (!child) return null;
  const childStatus = (child.status as string) || "";

  const getStudentPhoto = (s: any): string | null => {
    if (!s) return null;
    const fields = [s.photoURL, s.photoUrl, s.profilePicture, s.avatarUrl, s.avatar, s.photo];
    const direct = fields.find((p): p is string => typeof p === "string" && p.trim().length > 0);
    if (direct) return direct.trim();
    const reqs = s.requirementUploads;
    if (reqs && typeof reqs === "object") {
      for (const key of Object.keys(reqs)) {
        const lower = key.toLowerCase();
        if (lower.includes("2x2") || lower.includes("photo") || lower.includes("picture") || lower.includes("avatar")) {
          const fileUrl = reqs[key]?.fileUrl;
          if (typeof fileUrl === "string" && fileUrl.trim()) return fileUrl.trim();
        }
      }
    }
    return null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Enrolled": return <Badge className="bg-emerald-100 text-emerald-700 border-none px-3 py-1 font-semibold rounded-full"><CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Enrolled</Badge>;
      case "Pending": return <Badge className="bg-amber-100 text-amber-700 border-none px-3 py-1 font-semibold rounded-full"><CircleDashed className="w-3.5 h-3.5 mr-1 inline" /> Pending</Badge>;
      case "Rejected": return <Badge className="bg-rose-100 text-rose-700 border-none px-3 py-1 font-semibold rounded-full"><XCircle className="w-3.5 h-3.5 mr-1 inline" /> Rejected</Badge>;
      default: return null;
    }
  };

  const getAttendanceBadge = (status: string) => {
    switch (status) {
      case "Present": return <Badge className="bg-emerald-100 text-emerald-700 border-none font-semibold px-2.5 py-0.5 rounded-md">Present</Badge>;
      case "Absent": return <Badge className="bg-rose-100 text-rose-700 border-none font-semibold px-2.5 py-0.5 rounded-md">Absent</Badge>;
      case "Late": return <Badge className="bg-amber-100 text-amber-700 border-none font-semibold px-2.5 py-0.5 rounded-md">Late</Badge>;
      default: return <span className="text-slate-400 text-xs font-medium">--</span>;
    }
  };

  const TAB_CLASS = "px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all flex items-center gap-2 whitespace-nowrap";

  const Field = ({ label, value }: { label: string; value?: any }) => (
    <div>
      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">{label}</p>
      <p className="text-[16px] text-slate-900 font-semibold">{value || "--"}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9]">
      {/* HEADER */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 font-semibold hover:text-[#D8232A] transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Students
          </button>
          <span className="text-slate-300">/</span>
          <span className="font-extrabold text-slate-900 uppercase tracking-tight">{child.firstName} {child.lastName}</span>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(childStatus)}
          <button onClick={() => setIsEditOpen(true)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer">
            <Edit className="w-3.5 h-3.5" /> Edit Info
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
        {childStatus === "Pending" && (
          <div className="bg-[#FFF9E6] border border-[#FFE082] p-5 rounded-2xl flex items-start gap-4 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900">Enrollment is pending review</h4>
              <p className="text-sm text-amber-700/80 mt-1 font-medium">This student enrollment is pending. Please verify the submitted documents.</p>
            </div>
          </div>
        )}
        {(childStatus === "Enrolled" || childStatus === "Approved") && (
          <div className="bg-blue-50/80 border border-blue-100 text-blue-900 p-4 rounded-2xl flex items-center gap-3 text-xs font-medium">
            <ShieldCheck className="w-5 h-5 text-[#2563eb] shrink-0" />
            <span><strong className="font-bold">Official Enrolled Record:</strong> This student is officially enrolled for Academic Year 2026-2027.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Profile + Summary */}
          <div className="lg:col-span-1 space-y-5 h-fit">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 text-center space-y-4">
              <div className="relative flex flex-col items-center">
                <div className="relative w-28 h-28 flex items-center justify-center my-1 z-10">
                  <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-100 shadow-md flex items-center justify-center overflow-hidden relative">
                    {(() => { const p = getStudentPhoto(child); return p ? <img src={p} alt={child.firstName} className="w-full h-full object-cover" /> : <span className="text-2xl font-black text-[#D8232A]">{child.firstName?.charAt(0)}{child.lastName?.charAt(0)}</span>; })()}
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-800">{child.firstName} {child.middleName ? `${child.middleName} ` : ""}{child.lastName}</h2>
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full border border-slate-200/60">Grade {child.gradeLevel}</span>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100">SY 2026-2027</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">STUDENT SUMMARY</h3>
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between"><span className="text-slate-500 font-medium">Enrollment Status</span><span className="font-extrabold text-[#D8232A] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">{child.status || "Active"}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500 font-medium">Grade Level</span><span className="font-bold text-slate-900">Grade {child.gradeLevel}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500 font-medium">Section</span><span className="font-bold text-slate-900">{(child as any).sectionName || (child as any).section || "N/A"}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500 font-medium">LRN Number</span><span className="font-bold text-slate-900 font-mono">{child.lrn || "N/A"}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500 font-medium">Gender</span><span className="font-bold text-slate-900">{child.gender || "N/A"}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500 font-medium">School Year</span><span className="font-bold text-slate-900">SY 2026-2027</span></div>
              </div>
            </div>
          </div>

          {/* RIGHT: Tabs */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="personal" className="w-full">
              <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 w-full overflow-x-auto shadow-2xs">
                <TabsList className="bg-transparent border-none p-0 h-auto gap-1 w-full justify-start">
                  <TabsTrigger value="personal" className={TAB_CLASS}><User className="w-3.5 h-3.5 text-[#D8232A]" /> Personal Info</TabsTrigger>
                  <TabsTrigger value="documents" className={TAB_CLASS}><FileText className="w-3.5 h-3.5 text-[#D8232A]" /> Documents</TabsTrigger>
                </TabsList>
              </div>

              {/* PERSONAL TAB */}
              <TabsContent value="personal" className="mt-0 outline-none space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#2563eb]"><User className="w-5 h-5" /></div>
                    <div><h3 className="text-lg font-bold text-slate-900">Personal Information</h3><p className="text-xs text-slate-400 font-medium">Basic student details</p></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-8">
                    <Field label="FIRST NAME" value={child.firstName} />
                    <Field label="MIDDLE NAME" value={child.middleName} />
                    <Field label="LAST NAME" value={child.lastName} />
                    <Field label="DATE OF BIRTH" value={child.birthDate} />
                    <Field label="GENDER" value={child.gender} />
                    <Field label="MOTHER TONGUE" value={child.additional?.motherTongue} />
                    <Field label="LRN" value={child.lrn} />
                    <Field label="NATIONALITY" value={child.additional?.nationality} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#2563eb]"><MapPin className="w-5 h-5" /></div>
                    <div><h3 className="text-lg font-bold text-slate-900">Address &amp; Contact</h3><p className="text-xs text-slate-400 font-medium">Primary residence details</p></div>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">PRIMARY RESIDENCE</p>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[15px] font-semibold text-slate-800">
                      {child.address?.street ? `${child.address?.street}, ` : ""}{child.address?.barangay || "--"}, {child.address?.city || "--"}, {child.address?.zipCode || "--"}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                    <Field label="CITY / MUNICIPALITY" value={child.address?.city} />
                    <Field label="PROVINCE" value={child.address?.province} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><Users className="w-5 h-5" /></div>
                    <div><h3 className="text-lg font-bold text-slate-900">Guardian &amp; Emergency Contact</h3><p className="text-xs text-slate-400 font-medium">Primary guardian details</p></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                    <Field label="CONTACT NAME" value={child.medical?.emergencyContact || (child as any).guardianDetails?.fullName} />
                    <Field label="RELATIONSHIP" value={(child as any).guardianDetails?.relationship} />
                    <Field label="CONTACT NUMBER" value={child.medical?.emergencyPhone || (child as any).guardianDetails?.contactNumber} />
                    <Field label="EMAIL ADDRESS" value={(child as any).guardianDetails?.email} />
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500"><HeartPulse className="w-5 h-5" /></div>
                    <div><h3 className="text-lg font-bold text-slate-900">Medical Information</h3><p className="text-xs text-slate-400 font-medium">Health details and conditions</p></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-8">
                    <Field label="HEIGHT" value={child.medical?.height ? `${child.medical.height} cm` : undefined} />
                    <Field label="WEIGHT" value={child.medical?.weight ? `${child.medical.weight} kg` : undefined} />
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">BLOOD TYPE</p>
                      <p className="text-sm font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 inline-block">{child.medical?.bloodType || "--"}</p>
                    </div>
                    <Field label="ALLERGIES" value={child.medical?.allergies || "None reported"} />
                    <div className="sm:col-span-2">
                      <Field label="MEDICAL CONDITIONS" value={(Array.isArray((child.medical as any)?.diagnoses) ? (child.medical as any).diagnoses.join(", ") : (child.medical as any)?.diagnoses) || "None reported"} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-0 outline-none space-y-6">
                <Card className="p-6 sm:p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6 bg-white">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 text-sky-600"><FileText className="w-5 h-5" /></div>
                    <div><h3 className="text-lg font-bold text-slate-900">Uploaded Documents</h3><p className="text-xs text-slate-500 font-medium">Verification files and requirements</p></div>
                  </div>
                  {(() => {
                    const mergedDocs = [...documents];
                    if (child.requirementUploads) {
                      Object.entries(child.requirementUploads).forEach(([key, info]: [string, any]) => {
                        if (!mergedDocs.some(d => d.fileUrl === info.fileUrl)) {
                          mergedDocs.push({
                            id: key,
                            documentType: key,
                            fileName: info.fileName,
                            fileUrl: info.fileUrl
                          });
                        }
                      });
                    }

                    if (mergedDocs.length === 0) {
                      return <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100"><p className="text-sm font-semibold text-slate-500">No documents uploaded yet.</p></div>;
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {mergedDocs.map((docInfo: any) => (
                          <div key={docInfo.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm"><FileText className="w-5 h-5 text-slate-400" /></div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate capitalize">{(docInfo.documentType || "Document").replace(/_/g, " ")}</h4>
                              <p className="text-xs text-slate-500 font-medium truncate">{docInfo.fileName || "Document"}</p>
                            </div>
                            {docInfo.fileUrl && <a href={docInfo.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Search className="w-4 h-4" /></a>}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <AdminEditStudentModal student={isEditOpen ? child : null} isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} />
    </div>
  );
}
