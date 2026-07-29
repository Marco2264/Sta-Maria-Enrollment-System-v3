import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/Table';
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  XCircle,
  AlertCircle,
  User,
  HeartPulse,
  CalendarCheck,
  Edit,
  Calendar,
  Baby,
  Fingerprint,
  MapPin,
  Scale,
  Ruler,
  Phone,
  BarChart3,
  GraduationCap,
  Loader2,
  ImageIcon,
  Upload,
  X,
  Camera
} from 'lucide-react';
import { useParentData } from '../../lib/parentData';
import { uploadToCloudinary } from '../../lib/services/enrollmentDocumentsService';

export function ChildDetailView({
  childId,
  onBack
}: {childId: string;onBack: () => void;}) {
  const { children, updateChild } = useParentData();
  const child = children.find((c) => c.id === childId);
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  if (!child) return null;

  const handleOpenEdit = () => {
    // Make a deep copy to edit independently
    setEditData(JSON.parse(JSON.stringify(child)));
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editData) return;
    setIsSaving(true);
    try {
      // Remove fields that shouldn't be updated here if any
      const { id, parentId, submittedAt, attendance, status, requirements, requirementUploads, schemaVersion, ...updates } = editData;
      await updateChild(child.id, updates);
      setIsEditOpen(false);
    } catch (error) {
      console.error("Failed to update child:", error);
      alert("Failed to update child details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Enrolled':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none px-3 py-1 font-semibold shadow-sm rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Enrolled
          </Badge>
        );
      case 'Pending':
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none px-3 py-1 font-semibold shadow-sm rounded-full">
            <CircleDashed className="w-3.5 h-3.5 mr-1.5 animate-spin-slow" /> Pending
          </Badge>
        );
      case 'Rejected':
        return (
          <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none px-3 py-1 font-semibold shadow-sm rounded-full">
            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getAttendanceBadge = (status: string) => {
    switch (status) {
      case 'Present':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-none font-semibold px-2.5 py-0.5 rounded-md shadow-sm">
            Present
          </Badge>
        );
      case 'Absent':
        return (
          <Badge className="bg-rose-100 text-rose-700 border-none font-semibold px-2.5 py-0.5 rounded-md shadow-sm">
            Absent
          </Badge>
        );
      case 'Late':
        return (
          <Badge className="bg-amber-100 text-amber-700 border-none font-semibold px-2.5 py-0.5 rounded-md shadow-sm">
            Late
          </Badge>
        );
      default:
        return (
          <span className="text-slate-400 text-xs font-medium">
            --
          </span>
        );
    }
  };

  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; type: string } | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be under 5MB.');
      return;
    }

    const formattedSize = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    setSelectedFile(file);
    setFileInfo({
      name: file.name,
      size: formattedSize,
      type: file.type.split('/')[1]?.toUpperCase() || 'IMAGE'
    });
  };

  const handleConfirmPhotoUpload = async () => {
    if (!selectedFile) return;

    setIsPhotoUploading(true);
    setUploadProgress(5);

    // Track when we started so we can enforce a minimum visible duration
    const startTime = Date.now();
    const MIN_LOADING_MS = 1200; // minimum time the loading ring is shown

    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 30) return prev + 5;
        if (prev < 60) return prev + 8;
        if (prev < 85) return prev + 3;
        return prev;
      });
    }, 150);

    try {
      let photoUrl = '';
      try {
        photoUrl = await uploadToCloudinary(selectedFile);
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, converting to local data URL:', cloudErr);
        photoUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      }

      clearInterval(progressTimer);
      setUploadProgress(95);
      await updateChild(child.id, { photoURL: photoUrl });
      setUploadProgress(100);

      // Ensure loading ring is shown for at least MIN_LOADING_MS
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(MIN_LOADING_MS - elapsed, 400);

      setTimeout(() => {
        setIsPhotoUploading(false);
        setIsPhotoModalOpen(false);
        setSelectedFile(null);
        setFileInfo(null);
        setUploadProgress(0);
      }, remainingDelay);
    } catch (err) {
      clearInterval(progressTimer);
      setIsPhotoUploading(false);
      setUploadProgress(0);
      console.error('Failed to update student photo:', err);
      alert('Failed to update profile picture. Please try again.');
    }
  };

  const handleCancelModalPhoto = () => {
    setSelectedFile(null);
    setFileInfo(null);
    setIsPhotoModalOpen(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePhotoSelect(e);
    setIsPhotoModalOpen(true);
  };

  // Performance calculations
  const getStudentAverage = (c: any): string => {
    if (!c.grades) return 'N/A';
    const gradesValues: number[] = [];
    Object.values(c.grades).forEach((subjectGrades: any) => {
      if (typeof subjectGrades === 'object' && subjectGrades !== null) {
        Object.values(subjectGrades).forEach((g: any) => {
          const num = parseFloat(g);
          if (!isNaN(num)) gradesValues.push(num);
        });
      } else {
        const num = parseFloat(subjectGrades);
        if (!isNaN(num)) gradesValues.push(num);
      }
    });
    if (gradesValues.length === 0) return 'N/A';
    return (gradesValues.reduce((a, b) => a + b, 0) / gradesValues.length).toFixed(1);
  };

  const getAcademicStandingBadge = (avgStr: string) => {
    const num = parseFloat(avgStr);
    if (isNaN(num)) return null;
    if (num >= 95) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', status: 'Performing Well', statusColor: 'bg-emerald-500' };
    if (num >= 90) return { label: 'Very Good', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', status: 'Performing Well', statusColor: 'bg-emerald-500' };
    if (num >= 85) return { label: 'Good', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', status: 'Performing Well', statusColor: 'bg-emerald-500' };
    if (num >= 80) return { label: 'Satisfactory', color: 'bg-amber-50 text-amber-700 border-amber-200', status: 'Monitor Progress', statusColor: 'bg-amber-500' };
    return { label: 'Needs Improvement', color: 'bg-rose-50 text-rose-700 border-rose-200', status: 'Needs Attention', statusColor: 'bg-rose-500' };
  };

  const rawAvg = getStudentAverage(child);
  const avgDisplay = rawAvg === 'N/A' ? 'No Grades Yet' : rawAvg;
  const standingInfo = getAcademicStandingBadge(rawAvg);

  const getSubjectStatus = (gradeNum: number) => {
    if (gradeNum >= 90) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (gradeNum >= 80) return { label: 'Good', color: 'bg-blue-50 text-[#2563eb] border-blue-200' };
    return { label: 'Needs Improvement', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  const getPerformanceSummaryMessage = (avgStr: string) => {
    const num = parseFloat(avgStr);
    if (isNaN(num)) return "Grades have not been encoded yet by subject teachers for this term.";
    if (num >= 92) return "Student is performing above the class average and maintaining excellent academic standing.";
    if (num >= 85) return "Student is performing well in most subjects across the curriculum.";
    return "Student requires additional academic support and guidance in selected subjects.";
  };

  const isApproved = child.status === 'Enrolled' || child.status === 'Approved';
  const regBadge = isApproved
    ? { label: 'Approved', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    : child.status === 'Pending'
    ? { label: 'Under Review', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
    : { label: 'Action Required', bg: 'bg-rose-50 text-rose-700 border-rose-200' };

  const reqStatusLabel = child.requirements === 'Complete' ? 'Complete' : 'Under Review';
  const reqStatusColor = child.requirements === 'Complete' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="h-auto py-5 flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mr-2 hover:bg-primary/10 hover:text-primary transition-colors rounded-xl shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative group">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shadow-inner border border-primary/20 overflow-hidden shrink-0 relative">
                {child.photoURL ? (
                  <img src={child.photoURL} alt={child.firstName} className="w-full h-full object-cover" />
                ) : (
                  <>{child.firstName.charAt(0)}{child.lastName.charAt(0)}</>
                )}

                {isPhotoUploading && (
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-10 animate-in fade-in-50">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isPhotoUploading} />
                {isPhotoUploading ? (
                  <Loader2 className="w-3 h-3 text-[#2563eb] animate-spin" />
                ) : (
                  <Edit className="w-3 h-3 text-slate-600" />
                )}
              </label>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 uppercase">
                {child.firstName} {child.lastName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="outline" className="border-slate-300 text-slate-700 bg-white/80 font-bold px-2.5 py-0.5 rounded-md text-xs">
                  Grade {child.gradeLevel}
                </Badge>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${regBadge.bg}`}>
                  Registration: {regBadge.label}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${reqStatusColor}`}>
                  Requirements: {reqStatusLabel}
                </span>
                {standingInfo && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${standingInfo.color}`}>
                    Standing: {standingInfo.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full sm:w-auto rounded-xl border-primary/20 text-primary hover:bg-primary/5 bg-white shadow-sm shrink-0 font-bold"
          onClick={handleOpenEdit}
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Info
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {child.status === 'Pending' && (
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 text-amber-800 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-amber-200/50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1 pt-1">
                <h4 className="font-bold text-amber-900">
                  Enrollment is pending approval
                </h4>
                <p className="text-sm mt-1 text-amber-700 leading-relaxed">
                  Your child's enrollment is currently being reviewed by the
                  school administration. You will be notified once it is approved.
                </p>
                {child.requirements !== 'Complete' && (
                  <div className="mt-3 bg-white/60 p-3 rounded-xl border border-amber-200/60 inline-block">
                    <p className="text-sm font-bold text-rose-600">
                      Action required: {child.requirements}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <Tabs defaultValue="personal" className="w-full">
            <div className="mb-6 flex justify-start overflow-x-auto">
              <TabsList className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-full border border-slate-200/50 w-fit h-11">
                <TabsTrigger 
                  value="personal" 
                  className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm hover:text-slate-800 transition-all flex items-center gap-2 h-full bg-transparent shadow-none"
                >
                  <User className="w-4 h-4 shrink-0" />
                  Personal Info
                </TabsTrigger>
                <TabsTrigger 
                  value="medical" 
                  className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm hover:text-slate-800 transition-all flex items-center gap-2 h-full bg-transparent shadow-none"
                >
                  <HeartPulse className="w-4 h-4 shrink-0" />
                  Medical
                </TabsTrigger>
                <TabsTrigger 
                  value="attendance" 
                  className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm hover:text-slate-800 transition-all flex items-center gap-2 h-full bg-transparent shadow-none"
                >
                  <CalendarCheck className="w-4 h-4 shrink-0" />
                  Attendance
                </TabsTrigger>
                <TabsTrigger 
                  value="performance" 
                  className="px-5 py-2 text-xs sm:text-sm font-semibold rounded-full text-slate-500 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm hover:text-slate-800 transition-all flex items-center gap-2 h-full bg-transparent shadow-none"
                >
                  <BarChart3 className="w-4 h-4 shrink-0 text-[#2563eb]" />
                  Performance
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Card: Student Profile Summary */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl text-center relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary to-primary/60" />
                  
                  {/* Student Photo / Avatar */}
                  <div className="relative group/photo w-32 h-32 mx-auto mt-4 flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/80 to-primary text-[#0C3B99] flex items-center justify-center font-bold text-3xl shadow-md border-2 border-white overflow-hidden relative">
                      {child.photoURL ? (
                        <img src={child.photoURL} alt={child.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white">{child.firstName.charAt(0)}{child.lastName.charAt(0)}</span>
                      )}
                    </div>

                    {isPhotoUploading && (
                      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-10 animate-in fade-in-50 duration-200" viewBox="0 0 120 120">
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          className="stroke-blue-100"
                          strokeWidth="4"
                          fill="none"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          className="stroke-[#2563eb] transition-all duration-300 ease-out"
                          strokeWidth="4"
                          strokeDasharray={339.29}
                          strokeDashoffset={339.29 - (uploadProgress / 100) * 339.29}
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                    )}

                    {isPhotoUploading && (
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-white/95 border border-blue-200/80 shadow-xs rounded-full text-[10px] font-black text-[#2563eb] z-20 backdrop-blur-xs tracking-wide animate-in fade-in-50">
                        {uploadProgress}%
                      </div>
                    )}

                    <button 
                      type="button"
                      onClick={() => setIsPhotoModalOpen(true)}
                      className="absolute bottom-0 right-0 bg-[#2563eb] text-white p-2 rounded-full shadow-md hover:bg-blue-700 transition-colors z-20"
                      title="Upload Student Photo"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPhotoModalOpen(true)}
                    className="mt-3 text-xs font-bold text-[#2563eb] hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100/80 px-3.5 py-1.5 rounded-xl transition-all inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" /> Change Student Photo
                  </button>
                  
                  <h2 className="text-xl font-extrabold text-slate-900 mt-4 leading-tight uppercase">
                    {child.firstName} {child.lastName}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-semibold tracking-wider uppercase">
                    LRN: {child.lrn || 'Not assigned'}
                  </p>
                  
                  <div className="flex justify-center gap-2 mt-4 flex-wrap">
                    {getStatusBadge(child.status)}
                    <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50 font-semibold px-2.5 py-1 rounded-full text-xs">
                      Grade {child.gradeLevel}
                    </Badge>
                  </div>

                  <hr className="my-6 border-slate-100" />

                  {/* Quick Specs list */}
                  <div className="space-y-4 text-left">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-semibold">Gender</span>
                      <span className="font-bold text-slate-800">{child.gender}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-semibold">Birth Date</span>
                      <span className="font-bold text-slate-800">{child.birthDate}</span>
                    </div>
                    {child.additional?.religion && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-semibold">Religion</span>
                        <span className="font-bold text-slate-800">{child.additional.religion}</span>
                      </div>
                    )}
                    {child.additional?.motherTongue && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-semibold">Mother Tongue</span>
                        <span className="font-bold text-slate-800">{child.additional.motherTongue}</span>
                      </div>
                    )}
                    {child.additional?.learningMode && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-semibold">Learning Mode</span>
                        <span className="font-bold text-primary bg-primary/5 px-2.5 py-0.5 rounded-lg text-xs">{child.additional.learningMode}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Right Side: Tab Contents */}
              <div className="lg:col-span-2 space-y-6">
                <TabsContent value="personal" className="mt-0 outline-none space-y-6">
                  {/* Basic Information Card */}
                  <Card className="p-6 sm:p-8 bg-white border border-slate-100 shadow-sm rounded-3xl">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-3 border-b border-slate-50">
                      <User className="w-5 h-5 text-primary" />
                      Student Information
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">First Name</dt>
                        <dd className="text-base font-bold text-slate-800">{child.firstName}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Middle Name</dt>
                        <dd className="text-base font-bold text-slate-800">{child.middleName || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Last Name</dt>
                        <dd className="text-base font-bold text-slate-800">{child.lastName}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Grade Level</dt>
                        <dd className="text-base font-bold text-slate-800">{child.gradeLevel}</dd>
                      </div>
                      {child.fatherName && (
                        <div>
                          <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Father's Name</dt>
                          <dd className="text-base font-bold text-slate-800">{child.fatherName}</dd>
                        </div>
                      )}
                      {child.motherName && (
                        <div>
                          <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mother's Name</dt>
                          <dd className="text-base font-bold text-slate-800">{child.motherName}</dd>
                        </div>
                      )}
                    </dl>
                  </Card>

                  {/* Address Card */}
                  <Card className="p-6 sm:p-8 bg-white border border-slate-100 shadow-sm rounded-3xl">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-3 border-b border-slate-50">
                      <MapPin className="w-5 h-5 text-primary" />
                      Address Details
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                      <div className="sm:col-span-2">
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Street Address</dt>
                        <dd className="text-base font-bold text-slate-800">{child.address.street || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Barangay</dt>
                        <dd className="text-base font-bold text-slate-800">{child.address.barangay}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">City / Municipality</dt>
                        <dd className="text-base font-bold text-slate-800">{child.address.city}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Province</dt>
                        <dd className="text-base font-bold text-slate-800">{child.address.province}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Zip Code</dt>
                        <dd className="text-base font-bold text-slate-800">{child.address.zipCode}</dd>
                      </div>
                    </dl>
                  </Card>

                  {/* Additional details */}
                  <Card className="p-6 sm:p-8 bg-white border border-slate-100 shadow-sm rounded-3xl">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-3 border-b border-slate-50">
                      <AlertCircle className="w-5 h-5 text-primary" />
                      Additional Details
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mother Tongue</dt>
                        <dd className="text-base font-bold text-slate-800">{child.additional?.motherTongue || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Religion</dt>
                        <dd className="text-base font-bold text-slate-800">{child.additional?.religion || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Learning Mode</dt>
                        <dd className="text-base font-bold text-slate-800">{child.additional?.learningMode || '-'}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Indigenous Group</dt>
                        <dd className="text-base font-bold text-slate-800">
                          {child.additional?.isIndigenous ? child.additional?.indigenousGroup || 'Yes' : 'No'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">4Ps Beneficiary</dt>
                        <dd className="text-base font-bold text-slate-800">{child.additional?.is4ps ? 'Yes' : 'No'}</dd>
                      </div>
                    </dl>
                  </Card>
                </TabsContent>

                <TabsContent value="medical" className="mt-0 outline-none space-y-6">
                  {/* Physical Details Card */}
                  <Card className="p-6 sm:p-8 bg-white border border-slate-100 shadow-sm rounded-3xl">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-3 border-b border-slate-50">
                      <HeartPulse className="w-5 h-5 text-rose-500" />
                      Physical Details
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-8">
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Height</dt>
                        <dd className="text-base font-bold text-slate-800">{child.medical.height ? `${child.medical.height} cm` : '--'}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Weight</dt>
                        <dd className="text-base font-bold text-slate-800">{child.medical.weight ? `${child.medical.weight} kg` : '--'}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Blood Type</dt>
                        <dd className="text-sm font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 inline-block">
                          {child.medical.bloodType || '--'}
                        </dd>
                      </div>
                    </dl>
                  </Card>

                  {/* Health Conditions Card */}
                  <Card className="p-6 sm:p-8 bg-white border border-slate-100 shadow-sm rounded-3xl">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-3 border-b border-slate-50">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      Health Conditions
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Allergies</dt>
                        <dd className="text-base font-bold text-slate-800">{child.medical.allergies || 'None reported'}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Medical Conditions</dt>
                        <dd className="text-base font-bold text-slate-800">{child.medical.diagnoses?.join(', ') || 'None reported'}</dd>
                      </div>
                    </dl>
                  </Card>

                  {/* Emergency Contact Card */}
                  <Card className="p-6 sm:p-8 bg-white border border-slate-100 shadow-sm rounded-3xl">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 pb-3 border-b border-slate-50">
                      <User className="w-5 h-5 text-indigo-500" />
                      Emergency Contact
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Name</dt>
                        <dd className="text-base font-bold text-slate-800">{child.medical.emergencyContact || '--'}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Phone</dt>
                        <dd className="text-base font-bold font-mono text-indigo-700">{child.medical.emergencyPhone || '--'}</dd>
                      </div>
                    </dl>
                  </Card>
                </TabsContent>

                <TabsContent value="attendance" className="mt-0 outline-none space-y-6">
                  <Card className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                    <div className="p-6 sm:p-8 border-b border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5 text-primary" />
                        Attendance History
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Double session tracking records</p>
                    </div>
                    
                    {child.status !== 'Enrolled' ? (
                      <div className="p-16 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <CalendarCheck className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Not Enrolled Yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto text-sm">
                          Attendance records will be available once the student is officially enrolled in a class.
                        </p>
                      </div>
                    ) : !child.attendance || child.attendance.length === 0 ? (
                      <div className="p-16 text-center">
                        <div className="w-20 h-20 bg-emerald-50/50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <CalendarCheck className="w-10 h-10 text-emerald-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No Records Yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto text-sm">
                          There are no attendance records logged for this student yet.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                            <TableRow className="hover:bg-transparent border-none">
                              <TableHead className="font-bold text-slate-700 pl-6 sm:pl-8 py-4 whitespace-nowrap">
                                Date
                              </TableHead>
                              <TableHead className="font-bold text-slate-700 py-4 whitespace-nowrap">
                                Morning (AM)
                              </TableHead>
                              <TableHead className="font-bold text-slate-700 py-4 whitespace-nowrap">
                                Afternoon (PM)
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {child.attendance.map((record, i) => (
                              <TableRow
                                key={i}
                                className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                              >
                                <TableCell className="font-bold text-slate-800 pl-6 sm:pl-8 py-4 whitespace-nowrap text-sm">
                                  {new Date(record.date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </TableCell>
                                <TableCell className="py-4 whitespace-nowrap text-sm">
                                  {getAttendanceBadge(record.amStatus || record.status || 'Unmarked')}
                                </TableCell>
                                <TableCell className="py-4 whitespace-nowrap text-sm">
                                  {getAttendanceBadge(record.pmStatus || record.status || 'Unmarked')}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                <TabsContent value="performance" className="mt-0 outline-none space-y-6">
                  {/* Academic Status Card */}
                  <Card className="p-6 sm:p-8 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-[#2563eb]" />
                          Academic Status Overview
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">Real-time synchronized student academic evaluation</p>
                      </div>

                      {standingInfo && (
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${standingInfo.statusColor} animate-pulse`} />
                          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">{standingInfo.status}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current General Average</p>
                        <p className="text-3xl font-black text-slate-900">{avgDisplay}</p>
                      </div>

                      <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Academic Standing</p>
                        <div className="pt-1">
                          {standingInfo ? (
                            <span className={`inline-block px-3 py-1 rounded-lg text-sm font-extrabold border ${standingInfo.color}`}>
                              {standingInfo.label}
                            </span>
                          ) : (
                            <span className="text-sm font-bold text-slate-400">No Evaluation Yet</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Subject Performance Card */}
                  <Card className="p-6 sm:p-8 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-6">
                    <div className="pb-3 border-b border-slate-100">
                      <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-[#2563eb]" />
                        Subject Performance Breakdown
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">Directly synchronized with teacher grade encoding</p>
                    </div>

                    {!child.grades || Object.keys(child.grades).length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <BarChart3 className="w-8 h-8 text-slate-300" />
                        </div>
                        <h4 className="text-base font-bold text-slate-800 mb-1">No Grades Encoded Yet</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Subject teachers have not submitted grades for this student yet. Check back once quarterly grades are encoded.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {Object.entries(child.grades).map(([subjName, subjVal]: [string, any]) => {
                          let finalVal: number | null = null;
                          if (typeof subjVal === 'object' && subjVal !== null) {
                            const nums = Object.values(subjVal).map(v => parseFloat(v as any)).filter(n => !isNaN(n));
                            if (nums.length > 0) finalVal = Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
                          } else {
                            const n = parseFloat(subjVal);
                            if (!isNaN(n)) finalVal = n;
                          }

                          const displayGrade = finalVal !== null ? finalVal : 'N/A';
                          const subjBadge = finalVal !== null ? getSubjectStatus(finalVal) : null;

                          return (
                            <div key={subjName} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center justify-between gap-3">
                              <div>
                                <h4 className="font-extrabold text-slate-900 text-sm">{subjName}</h4>
                                <span className="text-xs font-bold text-slate-500 mt-0.5 block">Grade: {displayGrade}</span>
                              </div>
                              {subjBadge ? (
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${subjBadge.color}`}>
                                  {subjBadge.label}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">Pending</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>

                  {/* Performance Summary Card */}
                  <Card className="p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 border border-blue-100 shadow-sm rounded-3xl">
                    <div className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-white text-[#2563eb] border border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-slate-900">Performance Summary</h4>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">
                          {getPerformanceSummaryMessage(rawAvg)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Edit Student Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => !open && setIsEditOpen(false)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student Information</DialogTitle>
          </DialogHeader>
          
          {editData && (
            <div className="space-y-8 pt-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={editData.firstName} onChange={e => setEditData({...editData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={editData.lastName} onChange={e => setEditData({...editData, lastName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Middle Name</Label>
                    <Input value={editData.middleName} onChange={e => setEditData({...editData, middleName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Birth Date</Label>
                    <Input type="date" value={editData.birthDate} onChange={e => setEditData({...editData, birthDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={editData.gender} onValueChange={v => setEditData({...editData, gender: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>LRN</Label>
                    <Input value={editData.lrn} onChange={e => setEditData({...editData, lrn: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <Label>Street</Label>
                    <Input value={editData.address.street} onChange={e => setEditData({...editData, address: {...editData.address, street: e.target.value}})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Barangay</Label>
                    <Input value={editData.address.barangay} onChange={e => setEditData({...editData, address: {...editData.address, barangay: e.target.value}})} />
                  </div>
                  <div className="space-y-2">
                    <Label>City/Municipality</Label>
                    <Input value={editData.address.city} onChange={e => setEditData({...editData, address: {...editData.address, city: e.target.value}})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Province</Label>
                    <Input value={editData.address.province} onChange={e => setEditData({...editData, address: {...editData.address, province: e.target.value}})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Zip Code</Label>
                    <Input value={editData.address.zipCode} onChange={e => setEditData({...editData, address: {...editData.address, zipCode: e.target.value}})} />
                  </div>
                </div>
              </div>

              {/* Medical */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Medical Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Height (cm)</Label>
                    <Input value={editData.medical.height} onChange={e => setEditData({...editData, medical: {...editData.medical, height: e.target.value}})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input value={editData.medical.weight} onChange={e => setEditData({...editData, medical: {...editData.medical, weight: e.target.value}})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Blood Type</Label>
                    <Select value={editData.medical.bloodType} onValueChange={v => setEditData({...editData, medical: {...editData.medical, bloodType: v}})}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem><SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem><SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem><SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem><SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="Unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Allergies</Label>
                    <Input value={editData.medical.allergies} onChange={e => setEditData({...editData, medical: {...editData.medical, allergies: e.target.value}})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency Contact</Label>
                    <Input value={editData.medical.emergencyContact} onChange={e => setEditData({...editData, medical: {...editData.medical, emergencyContact: e.target.value}})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Emergency Phone</Label>
                    <Input value={editData.medical.emergencyPhone} onChange={e => setEditData({...editData, medical: {...editData.medical, emergencyPhone: e.target.value}})} />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Student Profile Photo Dialog */}
      <Dialog open={isPhotoModalOpen} onOpenChange={(open) => !open && handleCancelModalPhoto()}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl p-6 bg-white border-0 shadow-2xl">
          <DialogHeader className="text-center space-y-1">
            <DialogTitle className="text-xl font-black text-slate-900 text-center">Upload Profile Photo</DialogTitle>
            <p className="text-xs text-slate-400 font-medium text-center">Choose a photo for {child.firstName}.</p>
          </DialogHeader>

          <div className="flex flex-col items-center text-center space-y-5 pt-2">
            {/* Avatar Circle with Dynamic SVG Progress Ring & Percentage Pill */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-2 border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden shadow-inner relative z-0">
                {selectedFile ? (
                  <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="w-full h-full object-cover" />
                ) : child.photoURL ? (
                  <img src={child.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-300" />
                )}
              </div>

              {isPhotoUploading && (
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-10 animate-in fade-in-50 duration-200" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    className="stroke-blue-100"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    className="stroke-[#2563eb] transition-all duration-300 ease-out"
                    strokeWidth="4"
                    strokeDasharray={339.29}
                    strokeDashoffset={339.29 - (uploadProgress / 100) * 339.29}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              )}

              {isPhotoUploading && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-white/95 border border-blue-200/80 shadow-xs rounded-full text-[10px] font-black text-[#2563eb] z-20 backdrop-blur-xs tracking-wide animate-in fade-in-50">
                  {uploadProgress}%
                </div>
              )}
            </div>

            {/* File Info Card */}
            <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 text-[#2563eb]">
                <ImageIcon className="w-4 h-4 text-[#2563eb]" />
              </div>
              <div className="text-left overflow-hidden flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {fileInfo ? fileInfo.name : (child.photoURL ? 'profile-photo.jpg' : 'Add Image')}
                </p>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  {fileInfo ? `${fileInfo.size} • ${fileInfo.type}` : (child.photoURL ? 'Loaded Profile Photo' : 'No photo selected')}
                </p>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {/* Action Buttons */}
            <div className="w-full grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (selectedFile) {
                    handleConfirmPhotoUpload();
                  } else {
                    photoInputRef.current?.click();
                  }
                }}
                disabled={isPhotoUploading}
                className="px-4 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {isPhotoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : selectedFile ? 'Confirm Upload' : 'Select Image'}
              </button>
              <button
                type="button"
                onClick={handleCancelModalPhoto}
                disabled={isPhotoUploading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
              JPG, PNG, WEBP UP TO 5MB
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ChildDetailView;