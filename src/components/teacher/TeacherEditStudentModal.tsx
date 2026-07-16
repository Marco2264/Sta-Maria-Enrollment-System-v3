import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Save, Loader2, User, BookOpen, MapPin, Heart, Phone } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface TeacherEditStudentModalProps {
  student: any;
  isOpen: boolean;
  onClose: () => void;
}

export function TeacherEditStudentModal({ student, isOpen, onClose }: TeacherEditStudentModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      setFormData({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        middleName: student.middleName || '',
        gender: student.gender || '',
        birthDate: student.birthDate || '',
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

  const formatStudentName = (firstName: string | undefined, lastName: string | undefined) => {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    if (!last) return first || 'Unnamed Student';
    if (!first) return last || 'Unnamed Student';
    return `${last}, ${first}`;
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
      onClose();
    } catch (error) {
      console.error('Error updating student:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!student) return null;

  const isMale = formData.gender === 'Male';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-3xl p-0 shadow-2xl bg-white border-0">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-xl shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-4 text-slate-900">
              <div className={`w-14 h-14 rounded-full border flex items-center justify-center text-base font-extrabold shadow-sm shrink-0 ${
                isMale 
                  ? 'bg-blue-50 text-blue-700 border-blue-100' 
                  : 'bg-pink-50 text-pink-700 border-pink-100'
              }`}>
                {formData.firstName?.charAt(0) || ''}{formData.lastName?.charAt(0) || ''}
              </div>
              <div className="space-y-0.5">
                <div className="text-xl font-extrabold tracking-tight">Edit Student Profile</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {formatStudentName(formData.firstName, formData.lastName)} • LRN: {formData.lrn || 'N/A'}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 space-y-8">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" />
              <span>Basic Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">First Name</Label>
                <Input 
                  value={formData.firstName} 
                  onChange={e => setFormData({...formData, firstName: e.target.value})} 
                  className="bg-white border-slate-200 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Last Name</Label>
                <Input 
                  value={formData.lastName} 
                  onChange={e => setFormData({...formData, lastName: e.target.value})} 
                  className="bg-white border-slate-200 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Middle Name</Label>
                <Input 
                  value={formData.middleName} 
                  onChange={e => setFormData({...formData, middleName: e.target.value})} 
                  className="bg-white border-slate-200 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Gender</Label>
                <Select value={formData.gender} onValueChange={v => setFormData({...formData, gender: v})}>
                  <SelectTrigger className="bg-white border-slate-200 rounded-xl h-11 text-slate-700">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Birth Date</Label>
                <Input 
                  type="date" 
                  value={formData.birthDate} 
                  onChange={e => setFormData({...formData, birthDate: e.target.value})} 
                  className="bg-white border-slate-200 rounded-xl h-11"
                />
              </div>
            </div>
          </div>

          {/* Academic & Enrollment */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-slate-500" />
              <span>Academic & Enrollment (Read-Only)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">LRN</Label>
                <Input 
                  value={formData.lrn} 
                  onChange={e => setFormData({...formData, lrn: e.target.value})} 
                  className="bg-white border-slate-200 rounded-xl h-11 font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Grade Level</Label>
                <Input 
                  disabled 
                  value={`Grade ${formData.gradeLevel}`} 
                  className="bg-slate-100/50 cursor-not-allowed border-slate-200 rounded-xl h-11 text-slate-500 font-semibold" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Status</Label>
                <Input 
                  disabled 
                  value={formData.status} 
                  className="bg-slate-100/50 cursor-not-allowed border-slate-200 rounded-xl h-11 text-slate-500 font-semibold" 
                />
              </div>
            </div>
          </div>

          {/* Address & Contact */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-500" />
              <span>Address & Emergency Contact</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Street / House No.</Label>
                <Input 
                  value={formData.addressStreet} 
                  onChange={e => setFormData({...formData, addressStreet: e.target.value})} 
                  className="bg-white border-slate-200 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Barangay</Label>
                <Input 
                  value={formData.addressBarangay} 
                  onChange={e => setFormData({...formData, addressBarangay: e.target.value})} 
                  className="bg-white border-slate-200 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">City / Municipality</Label>
                <Input 
                  value={formData.addressCity} 
                  onChange={e => setFormData({...formData, addressCity: e.target.value})} 
                  className="bg-white border-slate-200 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Province</Label>
                <Input 
                  value={formData.addressProvince} 
                  onChange={e => setFormData({...formData, addressProvince: e.target.value})} 
                  className="bg-white border-slate-200 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Emergency Contact Person</Label>
                <Input 
                  value={formData.emergencyContact} 
                  onChange={e => setFormData({...formData, emergencyContact: e.target.value})} 
                  className="bg-white border-slate-200 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Emergency Contact Number</Label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input 
                    value={formData.emergencyPhone} 
                    onChange={e => setFormData({...formData, emergencyPhone: e.target.value})} 
                    className="bg-white border-slate-200 rounded-xl h-11 pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Medical Info */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Heart className="w-5 h-5 text-slate-500" />
              <span>Medical Information</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Height (cm)</Label>
                <Input 
                  value={formData.height} 
                  onChange={e => setFormData({...formData, height: e.target.value})} 
                  className="bg-white border-slate-200 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Weight (kg)</Label>
                <Input 
                  value={formData.weight} 
                  onChange={e => setFormData({...formData, weight: e.target.value})} 
                  className="bg-white border-slate-200 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Blood Type</Label>
                <Input 
                  value={formData.bloodType} 
                  onChange={e => setFormData({...formData, bloodType: e.target.value})} 
                  className="bg-white border-slate-200 rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Allergies</Label>
                <Input 
                  value={formData.allergies} 
                  onChange={e => setFormData({...formData, allergies: e.target.value})} 
                  placeholder="None" 
                  className="bg-white border-slate-200 rounded-xl h-11"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <DialogFooter className="flex-col sm:flex-row gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="w-full sm:w-auto rounded-xl bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-sm font-semibold h-11 px-6 active:scale-95 duration-100 shadow-sm text-slate-700" 
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              className="w-full sm:w-auto rounded-xl bg-slate-900 hover:bg-slate-800 text-white hover:shadow-md text-sm font-semibold h-11 px-6 active:scale-95 duration-100 flex items-center justify-center gap-1.5 shadow-sm" 
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
