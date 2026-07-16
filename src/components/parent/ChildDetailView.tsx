import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/Table';
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
  Phone
} from 'lucide-react';
import { useParentData } from '../../lib/parentData';

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

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="h-auto py-4 flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0 gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mr-2 hover:bg-primary/10 hover:text-primary transition-colors rounded-xl shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shadow-inner border border-primary/20">
              {child.firstName.charAt(0)}{child.lastName.charAt(0)}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {child.firstName} {child.lastName}
            </h1>
            {getStatusBadge(child.status)}
            <Badge variant="outline" className="border-slate-300 text-slate-600 bg-white/60 font-semibold px-3 py-1 rounded-full shadow-sm">
              Grade {child.gradeLevel}
            </Badge>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full sm:w-auto rounded-xl border-primary/20 text-primary hover:bg-primary/5 bg-white shadow-sm shrink-0"
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
            <div className="mb-6 flex justify-start">
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
              </TabsList>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Card: Student Profile Summary */}
              <div className="lg:col-span-1 space-y-6">
                <Card className="p-6 bg-white border border-slate-100 shadow-sm rounded-3xl text-center relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-primary to-primary/60" />
                  
                  {/* Avatar Initials with gradient */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/80 to-primary text-white flex items-center justify-center font-bold text-3xl mx-auto mt-4 shadow-md border-4 border-white">
                    {child.firstName.charAt(0)}{child.lastName.charAt(0)}
                  </div>
                  
                  <h2 className="text-xl font-bold text-slate-800 mt-4 leading-tight">
                    {child.firstName} {child.lastName}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-semibold tracking-wider uppercase">
                    LRN: {child.lrn || 'Not assigned'}
                  </p>
                  
                  <div className="flex justify-center gap-2 mt-4">
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