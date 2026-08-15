import React, { useState, useEffect } from "react";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/Tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/Table";
import { ArrowLeft, CheckCircle2, CircleDashed, XCircle, AlertCircle, User, HeartPulse, CalendarCheck, Edit, MapPin, BarChart3, GraduationCap, Loader2, Camera, Search, FileText, Lock, ShieldCheck, Users, Ruler, Scale, Save, X } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/Select";
import { db } from "../../lib/firebase";
import { doc, updateDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { uploadToImageKit, buildImageKitFolder, buildStandardizedFileName } from "../../lib/services/imageUploadService";
import { AdminEditStudentModal } from "./AdminEditStudentModal";

interface Props { student: any; onBack: () => void; }

export function AdminStudentDetailView({ student: child, onBack }: Props) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);

  // Card editing state
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [cardHeight, setCardHeight] = useState(child?.medical?.height || '');
  const [cardWeight, setCardWeight] = useState(child?.medical?.weight || '');
  const [cardStatus, setCardStatus] = useState(child?.status || 'Enrolled');
  const [cardTransferredOutSchoolName, setCardTransferredOutSchoolName] = useState(child?.transferredOutSchoolName || '');
  const [cardTransferredOutSchoolType, setCardTransferredOutSchoolType] = useState(child?.transferredOutSchoolType || 'Public');
  const [cardTransferredOutDate, setCardTransferredOutDate] = useState(child?.transferredOutDate || '');
  const [cardTransferredInSchoolName, setCardTransferredInSchoolName] = useState(child?.transferredInSchoolName || '');
  const [cardTransferredInSchoolType, setCardTransferredInSchoolType] = useState(child?.transferredInSchoolType || 'Public');
  const [cardTransferredInDate, setCardTransferredInDate] = useState(child?.transferredInDate || '');
  const [cardDroppedReason, setCardDroppedReason] = useState(child?.droppedReason || '');
  const [cardDroppedDate, setCardDroppedDate] = useState(child?.droppedDate || '');
  const [isSavingCard, setIsSavingCard] = useState(false);

  useEffect(() => {
    if (child) {
      setCardHeight(child.medical?.height || '');
      setCardWeight(child.medical?.weight || '');
      setCardStatus(child.status || 'Enrolled');
      setCardTransferredOutSchoolName(child.transferredOutSchoolName || '');
      setCardTransferredOutSchoolType(child.transferredOutSchoolType || 'Public');
      setCardTransferredOutDate(child.transferredOutDate || '');
      setCardTransferredInSchoolName(child.transferredInSchoolName || '');
      setCardTransferredInSchoolType(child.transferredInSchoolType || 'Public');
      setCardTransferredInDate(child.transferredInDate || '');
      setCardDroppedReason(child.droppedReason || '');
      setCardDroppedDate(child.droppedDate || '');
    }
  }, [child]);

  const handleSaveCardDetails = async () => {
    if (!child?.id) return;
    setIsSavingCard(true);
    try {
      const updates: any = {
        status: cardStatus,
        'medical.height': cardHeight,
        'medical.weight': cardWeight,
        transferredOutSchoolName: cardTransferredOutSchoolName,
        transferredOutSchoolType: cardTransferredOutSchoolType,
        transferredOutDate: cardTransferredOutDate,
        transferredInSchoolName: cardTransferredInSchoolName,
        transferredInSchoolType: cardTransferredInSchoolType,
        transferredInDate: cardTransferredInDate,
        droppedReason: cardDroppedReason,
        droppedDate: cardDroppedDate
      };
      await updateDoc(doc(db, 'enrollments', child.id), updates);
      setIsEditingCard(false);
    } catch (err) {
      console.error('Error saving student card details:', err);
    } finally {
      setIsSavingCard(false);
    }
  };

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
          <div className="bg-red-50/80 border border-red-100 text-[#D8232A] p-4 rounded-2xl flex items-center gap-3 text-xs font-medium">
            <ShieldCheck className="w-5 h-5 text-[#D8232A] shrink-0" />
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
                <span className="px-3 py-1 bg-red-50 text-[#D8232A] text-xs font-semibold rounded-full border border-red-100">{cardStatus || child.status || "Enrolled"}</span>
              </div>

              {/* Height & Weight Display on Admin Student Card */}
              <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100/80">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Ruler className="w-3.5 h-3.5 text-blue-500" /> HEIGHT
                  </p>
                  {isEditingCard ? (
                    <div className="flex items-center justify-center gap-1">
                      <Input 
                        type="number" 
                        value={cardHeight} 
                        onChange={e => setCardHeight(e.target.value)} 
                        className="h-8 text-center text-xs font-bold w-16 bg-white" 
                        placeholder="cm" 
                      />
                      <span className="text-xs font-bold text-slate-500">cm</span>
                    </div>
                  ) : (
                    <p className="text-sm font-black text-slate-800">
                      {cardHeight ? `${cardHeight} cm` : (child.medical?.height ? `${child.medical.height} cm` : '--')}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100/80">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    <Scale className="w-3.5 h-3.5 text-emerald-500" /> WEIGHT
                  </p>
                  {isEditingCard ? (
                    <div className="flex items-center justify-center gap-1">
                      <Input 
                        type="number" 
                        value={cardWeight} 
                        onChange={e => setCardWeight(e.target.value)} 
                        className="h-8 text-center text-xs font-bold w-16 bg-white" 
                        placeholder="kg" 
                      />
                      <span className="text-xs font-bold text-slate-500">kg</span>
                    </div>
                  ) : (
                    <p className="text-sm font-black text-slate-800">
                      {cardWeight ? `${cardWeight} kg` : (child.medical?.weight ? `${child.medical.weight} kg` : '--')}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Editing Controls on Card when Editing */}
              {isEditingCard && (
                <div className="w-full space-y-3 pt-3 border-t border-slate-100 text-left">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Student Status</Label>
                    <Select value={cardStatus} onValueChange={v => setCardStatus(v)}>
                      <SelectTrigger className="h-9 text-xs bg-white"><SelectValue placeholder="Select Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Enrolled">Enrolled</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Transferred Out">Transferred Out (T/O)</SelectItem>
                        <SelectItem value="Transferred In">Transferred In (T/I)</SelectItem>
                        <SelectItem value="Dropped">Dropped (DRP)</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(cardStatus === 'Transferred Out' || cardStatus === 'Transferred') && (
                    <div className="space-y-2 p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs">
                      <div>
                        <Label className="text-[11px] font-bold text-indigo-900">Transferred To (School)</Label>
                        <Input value={cardTransferredOutSchoolName} onChange={e => setCardTransferredOutSchoolName(e.target.value)} className="h-8 text-xs bg-white mt-1" placeholder="School Name" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px] font-bold text-indigo-900">School Type</Label>
                          <Select value={cardTransferredOutSchoolType} onValueChange={v => setCardTransferredOutSchoolType(v)}>
                            <SelectTrigger className="h-8 text-xs bg-white mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Public">Public (P)</SelectItem>
                              <SelectItem value="Private">Private (PR)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] font-bold text-indigo-900">Date</Label>
                          <Input type="date" value={cardTransferredOutDate} onChange={e => setCardTransferredOutDate(e.target.value)} className="h-8 text-xs bg-white mt-1" />
                        </div>
                      </div>
                    </div>
                  )}

                  {cardStatus === 'Transferred In' && (
                    <div className="space-y-2 p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs">
                      <div>
                        <Label className="text-[11px] font-bold text-blue-900">Transferred From (School)</Label>
                        <Input value={cardTransferredInSchoolName} onChange={e => setCardTransferredInSchoolName(e.target.value)} className="h-8 text-xs bg-white mt-1" placeholder="School Name" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px] font-bold text-blue-900">School Type</Label>
                          <Select value={cardTransferredInSchoolType} onValueChange={v => setCardTransferredInSchoolType(v)}>
                            <SelectTrigger className="h-8 text-xs bg-white mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Public">Public (P)</SelectItem>
                              <SelectItem value="Private">Private (PR)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] font-bold text-blue-900">Date</Label>
                          <Input type="date" value={cardTransferredInDate} onChange={e => setCardTransferredInDate(e.target.value)} className="h-8 text-xs bg-white mt-1" />
                        </div>
                      </div>
                    </div>
                  )}

                  {cardStatus === 'Dropped' && (
                    <div className="space-y-2 p-3 bg-rose-50/70 rounded-xl border border-rose-100 text-xs">
                      <div>
                        <Label className="text-[11px] font-bold text-rose-900">Reason for Dropping</Label>
                        <Input value={cardDroppedReason} onChange={e => setCardDroppedReason(e.target.value)} className="h-8 text-xs bg-white mt-1" placeholder="Reason" />
                      </div>
                      <div>
                        <Label className="text-[11px] font-bold text-rose-900">Effectivity Date</Label>
                        <Input type="date" value={cardDroppedDate} onChange={e => setCardDroppedDate(e.target.value)} className="h-8 text-xs bg-white mt-1" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button to Edit or Save Card Details */}
              <div className="w-full pt-2">
                {isEditingCard ? (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleSaveCardDetails} 
                      disabled={isSavingCard}
                      className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isSavingCard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Card
                    </button>
                    <button 
                      onClick={() => setIsEditingCard(false)} 
                      className="h-9 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setIsEditingCard(true)} 
                    className="w-full h-9 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-500" /> Edit Card Details
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 space-y-4">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">STUDENT SUMMARY</h3>
              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between"><span className="text-slate-500 font-medium">Enrollment Status</span><span className="font-extrabold text-[#D8232A] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">{cardStatus || child.status || "Active"}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500 font-medium">Height</span><span className="font-bold text-slate-900">{cardHeight ? `${cardHeight} cm` : (child.medical?.height ? `${child.medical.height} cm` : '--')}</span></div>
                <div className="flex items-center justify-between"><span className="text-slate-500 font-medium">Weight</span><span className="font-bold text-slate-900">{cardWeight ? `${cardWeight} kg` : (child.medical?.weight ? `${child.medical.weight} kg` : '--')}</span></div>
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
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#D8232A]"><User className="w-5 h-5" /></div>
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
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#D8232A]"><MapPin className="w-5 h-5" /></div>
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
                    <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-[#D8232A]"><Users className="w-5 h-5" /></div>
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
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-[#D8232A]"><FileText className="w-5 h-5" /></div>
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
                            {docInfo.fileUrl && <a href={docInfo.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-[#D8232A] hover:bg-red-50 rounded-lg transition-colors"><Search className="w-4 h-4" /></a>}
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
