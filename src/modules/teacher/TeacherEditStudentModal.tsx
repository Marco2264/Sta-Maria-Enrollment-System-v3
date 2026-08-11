import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Save, Loader2, User, Upload, Camera, Check } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { uploadToImageKit, buildImageKitFolder, buildStandardizedFileName } from '../../lib/services/imageUploadService';

interface TeacherEditStudentModalProps {
  student: any;
  isOpen: boolean;
  onClose: () => void;
}

export function TeacherEditStudentModal({ student, isOpen, onClose }: TeacherEditStudentModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && student) {
      setFormData({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        middleName: student.middleName || '',
        gender: student.gender || '',
        birthDate: student.birthDate || '',
        photoURL: student.photoURL || student.photoUrl || student.profilePicture || '',
        lrn: student.lrn || '',
        gradeLevel: student.gradeLevel ? student.gradeLevel.toString() : '',
        status: student.status || 'Pending',
        sectionId: student.sectionId || 'unassigned',
        // Address
        addressStreet: student.address?.street || '',
        addressBarangay: student.address?.barangay || '',
        addressCity: student.address?.city || '',
        addressProvince: student.address?.province || '',
        addressZipCode: student.address?.zipCode || '',
        // Contact & Emergency
        emergencyContact: student.medical?.emergencyContact || '',
        emergencyPhone: student.medical?.emergencyPhone || '',
        // Medical
        height: student.medical?.height || '',
        weight: student.medical?.weight || '',
        bloodType: student.medical?.bloodType || '',
        allergies: student.medical?.allergies || '',
      });
    }
  }, [isOpen, student]);

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const folder = buildImageKitFolder({ role: 'student', category: 'profiles' });
      const fileName = buildStandardizedFileName({
        role: 'student',
        fullName: `${formData.firstName || student.firstName} ${formData.lastName || student.lastName}`,
        originalFileName: file.name,
        gradeLevel: student.gradeLevel
      });
      const url = await uploadToImageKit(file, { folder, fileName, useUniqueFileName: false });
      setFormData((prev: any) => ({ ...prev, photoURL: url }));
    } catch (err) {
      console.error('Failed to upload photo to ImageKit:', err);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!student?.id) return;
    setIsSaving(true);
    try {
      const updates: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleName: formData.middleName,
        gender: formData.gender,
        birthDate: formData.birthDate,
        photoURL: formData.photoURL,
        lrn: formData.lrn,
        // gradeLevel, status, and sectionId are purposefully excluded to prevent teachers from modifying them
        'address.street': formData.addressStreet,
        'address.barangay': formData.addressBarangay,
        'address.city': formData.addressCity,
        'address.province': formData.addressProvince,
        'address.zipCode': formData.addressZipCode,
        'medical.emergencyContact': formData.emergencyContact,
        'medical.emergencyPhone': formData.emergencyPhone,
        'medical.height': formData.height,
        'medical.weight': formData.weight,
        'medical.bloodType': formData.bloodType,
        'medical.allergies': formData.allergies,
      };

      await updateDoc(doc(db, 'enrollments', student.id), updates);
      if (student) (student as any).photoURL = formData.photoURL;
      onClose();
    } catch (error) {
      console.error('Error updating student:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-2xl p-0 shadow-2xl bg-white border-0">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 pb-6 border-b border-border/50 sticky top-0 z-10 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-800">
              {(() => {
                const photoFields = [student.photoURL, (student as any).photoUrl, (student as any).profilePicture, (student as any).avatarUrl, (student as any).avatar, (student as any).photo];
                const photo = photoFields.find((p): p is string => typeof p === 'string' && p.trim().length > 0) || null;
                return photo ? (
                  <img src={photo} alt={student.firstName} className="w-12 h-12 rounded-full object-cover border border-primary/30 shadow-sm shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg border border-primary/30 shadow-sm shrink-0">
                    {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                  </div>
                );
              })()}
              <div>
                <div className="flex items-center gap-2">
                  <span>Edit Student Profile</span>
                </div>
                <div className="text-sm font-medium text-slate-500 mt-1">
                  {student.lastName}, {student.firstName} • LRN: {student.lrn || 'N/A'}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Middle Name</Label>
                <Input value={formData.middleName} onChange={e => setFormData({...formData, middleName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                  <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Birth Date</Label>
                <Input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-1 md:col-span-3">
                <Label>Profile Photo</Label>
                <div className="flex items-center gap-3">
                  {formData.photoURL ? (
                    <img src={formData.photoURL} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200 shrink-0 font-bold text-sm">
                      {formData.firstName?.charAt(0)}{formData.lastName?.charAt(0)}
                    </div>
                  )}
                  <Input 
                    placeholder="https://ik.imagekit.io/... or click Upload" 
                    value={formData.photoURL || ''} 
                    onChange={e => setFormData({...formData, photoURL: e.target.value})} 
                    className="flex-1"
                  />
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePhotoFileChange} 
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={isUploadingPhoto} 
                    onClick={() => fileInputRef.current?.click()} 
                    className="shrink-0 rounded-xl"
                  >
                    {isUploadingPhoto ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2 text-primary" />
                    )}
                    Upload Photo
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Academic & Enrollment */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Academic & Enrollment (Read-Only)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>LRN</Label>
                <Input value={formData.lrn} onChange={e => setFormData({...formData, lrn: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Grade Level</Label>
                <Input disabled value={`Grade ${formData.gradeLevel}`} className="bg-slate-50 cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Input disabled value={formData.status} className="bg-slate-50 cursor-not-allowed" />
              </div>
            </div>
          </div>

          {/* Address & Contact */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Address & Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Street / House No.</Label>
                <Input value={formData.addressStreet} onChange={e => setFormData({...formData, addressStreet: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Barangay</Label>
                <Input value={formData.addressBarangay} onChange={e => setFormData({...formData, addressBarangay: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>City / Municipality</Label>
                <Input value={formData.addressCity} onChange={e => setFormData({...formData, addressCity: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Province</Label>
                <Input value={formData.addressProvince} onChange={e => setFormData({...formData, addressProvince: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Person</Label>
                <Input value={formData.emergencyContact} onChange={e => setFormData({...formData, emergencyContact: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Emergency Contact Number</Label>
                <Input value={formData.emergencyPhone} onChange={e => setFormData({...formData, emergencyPhone: e.target.value})} />
              </div>
            </div>
          </div>

          {/* Medical Info */}
          <div className="pt-6 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Medical Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Height (cm)</Label>
                <Input value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Blood Type</Label>
                <Input value={formData.bloodType} onChange={e => setFormData({...formData, bloodType: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Allergies</Label>
                <Input value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} placeholder="None" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 bg-slate-50/50 border-t border-slate-100">
          <DialogFooter className="flex-col sm:flex-row gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto rounded-xl bg-white" disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto rounded-xl shadow-md" disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
