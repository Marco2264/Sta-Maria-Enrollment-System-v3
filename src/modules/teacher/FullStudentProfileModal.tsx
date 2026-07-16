import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';
import { User, MapPin, Activity, Info, Phone, Ruler, Scale } from 'lucide-react';
import { Child } from '../../lib/parentData';

interface FullStudentProfileModalProps {
  student: Child | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveBmi?: (id: string, height: string, weight: string) => void;
  allowEditHealth?: boolean;
}

export function FullStudentProfileModal({
  student,
  isOpen,
  onClose,
  onSaveBmi,
  allowEditHealth = true
}: FullStudentProfileModalProps) {
  const [editBmi, setEditBmi] = useState({ height: '', weight: '' });

  useEffect(() => {
    if (student && isOpen) {
      setEditBmi({
        height: student.medical?.height || '',
        weight: student.medical?.weight || ''
      });
    }
  }, [student, isOpen]);

  if (!student) return null;

  const handleSaveBmi = () => {
    if (onSaveBmi && student) {
      onSaveBmi(student.id, editBmi.height, editBmi.weight);
      onClose();
    }
  };

  const calcBmi = (h?: string, w?: string) => {
    if (!h || !w) return '--';
    const hm = parseFloat(h) / 100;
    const wk = parseFloat(w);
    if (hm > 0 && wk > 0) return (wk / (hm * hm)).toFixed(1);
    return '--';
  };

  const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
        <Icon className="w-4 h-4" />
      </div>
      <h4 className="font-bold text-slate-800 text-lg tracking-tight">{title}</h4>
    </div>
  );

  const InfoCard = ({ label, value }: { label: string, value: string | React.ReactNode }) => (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
      <div className="font-medium text-slate-800 text-sm">{value || <span className="text-slate-400 italic">None</span>}</div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[85vh] rounded-2xl p-0 overflow-hidden border-0 shadow-2xl bg-white flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 pb-5 border-b border-border/50 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-slate-800">
              <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg border border-primary/30 shadow-sm">
                {student.firstName?.charAt(0) || ''}{student.lastName?.charAt(0) || ''}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span>{student.lastName}, {student.firstName} {student.middleName}</span>
                  <Badge variant="outline" className={`ml-2 text-xs border-0 ${student.status === 'Enrolled' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {student.status}
                  </Badge>
                </div>
                <div className="text-sm font-mono text-slate-500 mt-1 font-medium">LRN: {student.lrn}</div>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-8 overflow-y-auto flex-1">
          
          {/* Personal Information */}
          <div>
            <SectionTitle icon={User} title="Personal Information" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoCard label="Gender" value={student.gender} />
              <InfoCard label="Birth Date" value={student.birthDate} />
              <InfoCard label="Grade Level" value={`Grade ${student.gradeLevel}`} />
            </div>
          </div>

          {/* Contact & Address */}
          <div className="border-t border-slate-100 pt-6">
            <SectionTitle icon={MapPin} title="Address & Contact" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <InfoCard label="Street Address" value={student.address?.street} />
              <InfoCard label="Barangay" value={student.address?.barangay} />
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <InfoCard label="City" value={student.address?.city} />
              <InfoCard label="Province" value={student.address?.province} />
              <InfoCard label="Zip Code" value={student.address?.zipCode} />
            </div>
            
            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Emergency Contact</p>
                  <p className="font-bold text-slate-800">{student.medical?.emergencyContact || 'Not provided'}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Phone Number</p>
                <p className="font-bold font-mono text-slate-800">{student.medical?.emergencyPhone || 'Not provided'}</p>
              </div>
            </div>
          </div>

          {/* Medical History */}
          <div className="border-t border-slate-100 pt-6">
            <SectionTitle icon={Activity} title="Medical History" />
            <div className="grid grid-cols-2 gap-3 mb-3">
              <InfoCard label="Blood Type" value={student.medical?.bloodType || 'Unknown'} />
              <InfoCard label="Allergies" value={student.medical?.allergies || 'None'} />
            </div>
            
            <div className="space-y-3">
              {(student.medical?.hasDiagnosis || (student.medical?.diagnoses && student.medical.diagnoses.length > 0)) && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">Special Diagnoses</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {student.medical.diagnoses?.map((d, i) => (
                      <Badge key={i} variant="outline" className="bg-white border-amber-200 text-amber-800">{d}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {(student.medical?.hasManifestations || (student.medical?.manifestations && student.medical.manifestations.length > 0)) && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">Manifestations</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {student.medical.manifestations?.map((m, i) => (
                      <Badge key={i} variant="outline" className="bg-white border-amber-200 text-amber-800">{m}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {student.medical?.hasPwdId && (
                <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-sky-700 font-semibold text-sm">Registered PWD</span>
                  <span className="font-mono text-sky-800 font-bold bg-white px-2 py-1 rounded-md border border-sky-200">ID: {student.medical.pwdId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div className="border-t border-slate-100 pt-6">
            <SectionTitle icon={Info} title="Additional Information" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoCard label="Mother Tongue" value={student.additional?.motherTongue} />
              <InfoCard label="Religion" value={student.additional?.religion} />
              <InfoCard label="Learning Mode" value={student.additional?.learningMode} />
            </div>
            
            <div className="flex flex-wrap gap-3 mt-3">
              {student.additional?.is4ps && (
                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 px-3 py-1.5">
                  4Ps Beneficiary
                </Badge>
              )}
              {student.additional?.isIndigenous && (
                <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 px-3 py-1.5">
                  Indigenous Group: {student.additional.indigenousGroup}
                </Badge>
              )}
            </div>
          </div>

          {/* Health Data Update */}
          {allowEditHealth && (
            <div className="border-t border-slate-100 pt-6 bg-slate-50/50 -mx-6 px-6 pb-2">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-slate-800 text-lg">Update Health Data</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-600 font-semibold">
                    <Ruler className="w-4 h-4" /> Height (cm)
                  </Label>
                  <Input
                    type="number"
                    value={editBmi.height}
                    onChange={(e) => setEditBmi({ ...editBmi, height: e.target.value })}
                    className="rounded-xl border-slate-200 focus:ring-primary/20 bg-white"
                    placeholder="e.g. 150"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-600 font-semibold">
                    <Scale className="w-4 h-4" /> Weight (kg)
                  </Label>
                  <Input
                    type="number"
                    value={editBmi.weight}
                    onChange={(e) => setEditBmi({ ...editBmi, weight: e.target.value })}
                    className="rounded-xl border-slate-200 focus:ring-primary/20 bg-white"
                    placeholder="e.g. 45"
                  />
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                <span className="text-sm font-semibold text-slate-700">Calculated BMI</span>
                <Badge variant="secondary" className="bg-slate-100 border border-slate-200 text-lg px-3 py-1 shadow-sm font-mono text-slate-800">
                  {calcBmi(editBmi.height, editBmi.weight)}
                </Badge>
              </div>
            </div>
          )}
          
        </div>

        <div className="p-6 bg-slate-50/50 border-t border-slate-100 shrink-0">
          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto rounded-xl bg-white">
              {allowEditHealth ? 'Cancel' : 'Close'}
            </Button>
            {allowEditHealth && (
              <Button className="w-full sm:w-auto rounded-xl shadow-md" onClick={handleSaveBmi}>
                Save Health Data
              </Button>
            )}
          </DialogFooter>
        </div>

      </DialogContent>
    </Dialog>
  );
}
