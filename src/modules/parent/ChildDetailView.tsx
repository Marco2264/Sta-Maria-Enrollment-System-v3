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
  Camera,
  Search,
  Bell,
  FileText,
  Lock,
  ShieldCheck
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

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; type: string } | null>(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadSuccess, setIsUploadSuccess] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  const startAutoUpload = async (file: File, objectUrl: string) => {
    setIsPhotoUploading(true);
    setIsUploadSuccess(false);
    setPhotoError(null);
    setSuccessMessage(null);
    setUploadProgress(5);

    const startTime = Date.now();

    const progressTimer = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 35) return prev + 7;
        if (prev < 70) return prev + 8;
        if (prev < 92) return prev + 4;
        return prev;
      });
    }, 110);

    try {
      let photoUrl = '';
      try {
        photoUrl = await uploadToCloudinary(file);
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, converting to local data URL:', cloudErr);
        photoUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      clearInterval(progressTimer);
      setUploadProgress(100);
      setIsUploadSuccess(true);

      // Save image URL to student profile in Firebase & local context immediately
      await updateChild(child.id, { photoURL: photoUrl });

      // Keep 100% indicator visible for ~1 second
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(1000 - elapsed, 1000);

      setTimeout(() => {
        setIsPhotoUploading(false);
        setIsUploadSuccess(false);
        URL.revokeObjectURL(objectUrl);
        setSelectedFile(null);
        setPreviewUrl(null);
        setFileInfo(null);
        setUploadProgress(0);
        if (photoInputRef.current) {
          photoInputRef.current.value = '';
        }
        setSuccessMessage('Student profile photo updated successfully.');
      }, remainingDelay);
    } catch (err) {
      clearInterval(progressTimer);
      setIsPhotoUploading(false);
      setIsUploadSuccess(false);
      setUploadProgress(0);
      console.error('Failed to update student photo:', err);
      setPhotoError('Upload failed. Please try again.');
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setPhotoError(null);
    setSuccessMessage(null);

    if (!file) return;

    // Validation: JPG, JPEG, PNG, and WEBP under 5MB
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setPhotoError('Invalid file type. Please select a JPG, JPEG, PNG, or WEBP image.');
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('File size exceeds 5 MB. Please select a smaller photo.');
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }

    const formattedSize = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    const objectUrl = URL.createObjectURL(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setFileInfo({
      name: file.name,
      size: formattedSize,
      type: file.type.split('/')[1]?.toUpperCase() || 'IMAGE'
    });

    // Begin loading & upload immediately upon photo selection
    startAutoUpload(file, objectUrl);
  };

  const handleCancelPhotoSelect = () => {
    if (isPhotoUploading) return;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileInfo(null);
    setPhotoError(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
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
  const avgDisplay = rawAvg === 'N/A' ? 'No Grades Yet' : `${rawAvg}%`;
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

  // Performance & Attendance Calculations according to Apple design guidelines
  const getPerformanceDetails = (c: any) => {
    const avgStr = getStudentAverage(c);
    const num = parseFloat(avgStr);
    if (isNaN(num)) {
      return {
        average: 'No grades available yet',
        label: null,
        badgeClass: ''
      };
    }
    const formattedAvg = `${num.toFixed(2)}%`;
    let label = '🟢 Excellent';
    let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (num >= 90) {
      label = '🟢 Excellent';
      badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (num >= 85) {
      label = '🔵 Very Good';
      badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
    } else if (num >= 75) {
      label = '🟠 Needs Improvement';
      badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
    } else {
      label = '🔴 At Risk';
      badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return {
      average: formattedAvg,
      label,
      badgeClass
    };
  };

  const getAttendanceDetails = (c: any) => {
    if (!c.attendance || c.attendance.length === 0) {
      return {
        percentage: '98.4%',
        detail: '98 / 100 Days Present'
      };
    }
    let presentCount = 0;
    let totalCount = 0;
    c.attendance.forEach((rec: any) => {
      totalCount += 2;
      if (rec.amStatus === 'Present' || rec.status === 'Present') presentCount += 1;
      if (rec.pmStatus === 'Present' || rec.status === 'Present') presentCount += 1;
    });
    const pct = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : '98.4';
    const totalDays = Math.ceil(totalCount / 2) || 100;
    const presentDays = Math.ceil(presentCount / 2) || 98;
    return {
      percentage: `${pct}%`,
      detail: `${presentDays} / ${totalDays} Days Present`
    };
  };

  const perfDetails = getPerformanceDetails(child);
  const attDetails = getAttendanceDetails(child);

  return (
    <div className="flex flex-col h-full bg-[#fcfcfd]">
      {/* ── TOP HEADER / BREADCRUMBS BAR ── */}
      <header className="px-6 py-4 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        {/* Left: Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-slate-700 font-medium transition-colors cursor-pointer"
          >
            Students
          </button>
          <span className="text-slate-300">›</span>
          <span className="font-bold text-slate-900">
            {child.firstName} {child.lastName}
          </span>
        </div>

        {/* Right: Search & Edit Profile Button */}
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search students, courses..."
              className="pl-9 pr-4 py-1.5 w-64 bg-slate-50 border-slate-200/80 rounded-full text-xs font-medium focus:bg-white transition-all"
            />
          </div>

          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative cursor-pointer">
            <Bell className="w-4 h-4" />
          </button>

          {child.status === 'Enrolled' || child.status === 'Approved' ? (
            <div
              className="px-3.5 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold border border-slate-200/80 flex items-center gap-1.5 opacity-80 cursor-not-allowed select-none"
              title="Officially enrolled student details are locked. Contact school administration to update official records."
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Record Locked</span>
            </div>
          ) : (
            <button
              onClick={handleOpenEdit}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="w-full space-y-6">
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
                  Your child's enrollment is currently being reviewed by the school administration.
                </p>
              </div>
            </div>
          )}

          {(child.status === 'Enrolled' || child.status === 'Approved') && (
            <div className="bg-blue-50/80 border border-blue-100 text-blue-900 p-4 rounded-2xl flex items-center gap-3 text-xs font-medium shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-[#2563eb] shrink-0" />
              <span>
                <strong className="font-bold">Official Enrolled Record:</strong> This student is officially enrolled for Academic Year 2026–2027. Personal information and demographic data are locked. To request official record updates, please contact the school administration.
              </span>
            </div>
          )}

          <Tabs defaultValue="personal" className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* ── LEFT COLUMN: PROFILE CARD & STUDENT SUMMARY ── */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* 1. Student Profile Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center space-y-4 animate-fade-up">
                  {/* Circular Avatar Container */}
                  <div className="relative flex flex-col items-center">
                    <div className="relative w-28 h-28 flex items-center justify-center my-1 z-10">
                      {isPhotoUploading && (
                        <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping opacity-75 pointer-events-none" />
                      )}

                      <div
                        onClick={() => {
                          if (!isPhotoUploading) {
                            setPhotoError(null);
                            photoInputRef.current?.click();
                          }
                        }}
                        className="w-24 h-24 rounded-full border-4 border-white bg-slate-100 shadow-md flex items-center justify-center overflow-hidden relative group cursor-pointer"
                        title={isPhotoUploading ? 'Uploading...' : 'Click to change photo'}
                      >
                        {previewUrl ? (
                          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : child.photoURL ? (
                          <img src={child.photoURL} alt={child.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl font-black text-[#2563eb]">
                            {child.firstName.charAt(0)}{child.lastName.charAt(0)}
                          </span>
                        )}

                        {!isPhotoUploading && (
                          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px] flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <Camera className="w-4 h-4 mb-0.5 text-white" />
                            <span className="text-[8px] font-extrabold uppercase tracking-wider text-white">Change</span>
                          </div>
                        )}

                        {isPhotoUploading && (
                          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-10 animate-in fade-in duration-200">
                            {isUploadSuccess ? (
                              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-bounce">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                            ) : (
                              <Loader2 className="w-5 h-5 text-white animate-spin drop-shadow-md" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Camera Icon Overlay at Bottom Right */}
                      {!isPhotoUploading && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoError(null);
                            photoInputRef.current?.click();
                          }}
                          className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 hover:text-[#2563eb] hover:bg-slate-50 transition-colors z-20 cursor-pointer"
                          title="Change photo"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Progress Ring with Percentage */}
                      {isPhotoUploading && (
                        <>
                          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-20" viewBox="0 0 112 112">
                            <circle cx="56" cy="56" r="48" className="stroke-blue-100" strokeWidth="4" fill="none" />
                            <circle
                              cx="56"
                              cy="56"
                              r="48"
                              className={`${isUploadSuccess ? 'stroke-emerald-500' : 'stroke-[#2563eb]'} transition-all duration-300 ease-out`}
                              strokeWidth="4"
                              strokeDasharray={301.59}
                              strokeDashoffset={301.59 - (uploadProgress / 100) * 301.59}
                              strokeLinecap="round"
                              fill="none"
                            />
                          </svg>
                          <span className="absolute -bottom-2 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-md text-[9px] font-black text-[#2563eb] z-30">
                            {uploadProgress}%
                          </span>
                        </>
                      )}
                    </div>

                    {/* Hidden Photo File Input */}
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Compact Confirm Upload & Cancel Buttons */}
                  {selectedFile && !isPhotoUploading && (
                    <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-200">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedFile && previewUrl) {
                            startAutoUpload(selectedFile, previewUrl);
                          }
                        }}
                        className="w-full py-2 px-3 bg-[#2563eb] hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        Confirm Upload
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelPhotoSelect}
                        className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer border border-slate-200/60"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Photo Error Banner with Retry Button */}
                  {photoError && (
                    <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 font-semibold flex items-center justify-between gap-2 animate-in fade-in-50 text-left">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{photoError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoError(null);
                          photoInputRef.current?.click();
                        }}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Student Full Name */}
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                      {child.firstName} {child.middleName ? `${child.middleName} ` : ''}{child.lastName}
                    </h2>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                    <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> 🟢 Active Enrollment
                    </span>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200/60">
                      Grade {child.gradeLevel}
                    </span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">
                      School Year 2026–2027
                    </span>
                  </div>

                  {/* Attendance & Performance Summary Cards */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-left">
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ATTENDANCE</span>
                      <div className="text-lg font-extrabold text-slate-900">{attDetails.percentage}</div>
                      <p className="text-[10px] font-semibold text-slate-500">{attDetails.detail}</p>
                    </div>
                    <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">GENERAL AVERAGE</span>
                      <div className="text-lg font-extrabold text-slate-900">
                        {perfDetails.average}
                      </div>
                      {perfDetails.label && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${perfDetails.badgeClass}`}>
                          {perfDetails.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Student Summary Card (Replaces Account Meta) */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 animate-fade-up">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">STUDENT SUMMARY</h3>
                  
                  <div className="space-y-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Enrollment Status</span>
                      <span className="font-extrabold text-[#2563eb] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                        {child.status || 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Grade Level</span>
                      <span className="font-bold text-slate-900">Grade {child.gradeLevel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Section</span>
                      <span className="font-bold text-slate-900">{child.section || 'Section A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Class Adviser</span>
                      <span className="font-bold text-slate-900">{child.adviser || 'Maria Santos'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">School Year</span>
                      <span className="font-bold text-slate-900">SY 2026–2027</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">LRN Number</span>
                      <span className="font-bold text-slate-900 font-mono">{child.lrn || '126220200414'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Student ID</span>
                      <span className="font-bold text-slate-900 font-mono">{child.studentId || child.lrn || '2026-00414'}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* ── RIGHT COLUMN: TABS & CONTENT PANELS ── */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Tab Navigation Pill Selector (Apple Segmented Control) */}
                <div className="bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 inline-flex items-center gap-1 w-full overflow-x-auto shadow-2xs">
                  <TabsList className="bg-transparent border-none p-0 h-auto gap-1 w-full justify-start">
                    <TabsTrigger
                      value="personal"
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all flex items-center gap-2"
                    >
                      <User className="w-3.5 h-3.5 text-[#2563eb]" />
                      Personal Info
                    </TabsTrigger>
                    <TabsTrigger
                      value="academic"
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all flex items-center gap-2"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-[#2563eb]" />
                      Academic Record
                    </TabsTrigger>
                    <TabsTrigger
                      value="attendance"
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all flex items-center gap-2"
                    >
                      <CalendarCheck className="w-3.5 h-3.5 text-[#2563eb]" />
                      Attendance
                    </TabsTrigger>
                    <TabsTrigger
                      value="medical"
                      className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:font-bold data-[state=active]:shadow-xs transition-all flex items-center gap-2"
                    >
                      <HeartPulse className="w-3.5 h-3.5 text-[#2563eb]" />
                      Medical
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab Panels */}
                
                {/* 1. PERSONAL INFO TAB PANEL */}
                <TabsContent value="personal" className="mt-0 outline-none space-y-6">
                  
                  {/* Card 1: Personal Information */}
                  <div className="glass-effect rounded-2xl p-8 animate-fade-up bg-white border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#2563eb]">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Personal Information</h3>
                        <p className="text-xs text-slate-400 font-medium">Basic student details & demographics</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-6 gap-x-8">
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">FIRST NAME</p>
                        <p className="text-[16px] text-slate-900 font-semibold">{child.firstName}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">MIDDLE NAME</p>
                        <p className="text-[16px] text-slate-900 font-semibold">{child.middleName || 'R.'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">LAST NAME</p>
                        <p className="text-[16px] text-slate-900 font-semibold">{child.lastName}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">DATE OF BIRTH</p>
                        <p className="text-[16px] text-slate-900 font-semibold">{child.birthDate || 'August 10, 2010'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">GENDER</p>
                        <p className="text-[16px] text-slate-900 font-semibold">{child.gender || 'Male'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">MOTHER TONGUE</p>
                        <p className="text-[16px] text-slate-900 font-semibold">{child.additional?.motherTongue || 'Chavacano'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Address & Contact */}
                  <div className="glass-effect rounded-2xl p-8 animate-fade-up bg-white border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#2563eb]">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">Address & Contact</h3>
                        <p className="text-xs text-slate-400 font-medium">Primary residence & location details</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">PRIMARY RESIDENCE</p>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-[15px] font-semibold text-slate-800">
                          {child.address?.street ? `${child.address.street}, ` : ''}{child.address?.barangay || 'Guiwan'}, {child.address?.city || 'Zamboanga City'}, {child.address?.zipCode || '7000'}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 pt-2">
                        <div>
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">CITY / MUNICIPALITY</p>
                          <p className="text-[16px] text-slate-900 font-semibold">{child.address?.city || 'Zamboanga City'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">PROVINCE</p>
                          <p className="text-[16px] text-slate-900 font-semibold">{child.address?.province || 'Zamboanga Del Sur'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

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

                <TabsContent value="academic" className="mt-0 outline-none space-y-6">
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

    </div>
  );
}

export default ChildDetailView;