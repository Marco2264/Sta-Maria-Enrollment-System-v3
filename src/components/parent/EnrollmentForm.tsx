import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { CheckCircle2, ArrowRight, ArrowLeft, Upload, FileText } from 'lucide-react';
import { useParentData } from '../../lib/parentData';
import { DOCUMENT_TYPES } from '../../lib/schema/phase2';
export function EnrollmentForm({ onComplete }: {onComplete: () => void;}) {
  const { submitFullEnrollment } = useParentData();
  const [step, setStep] = useState(1);
  const [birthCertFile, setBirthCertFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    birthDate: '',
    gender: '',
    lrn: '',
    gradeLevel: '',
    fatherName: '',
    motherName: '',
    isReturning: false, // Balik-Aral
    lastGradeLevel: '',
    lastSchoolAttended: '',
    lastSchoolYear: '',
    address: {
      street: '',
      barangay: '',
      city: '',
      province: '',
      zipCode: ''
    },
    medical: {
      height: '',
      weight: '',
      bloodType: '',
      allergies: '',
      hasDiagnosis: false,
      diagnoses: [] as string[],
      hasManifestations: false,
      manifestations: [] as string[],
      hasPwdId: false,
      pwdId: '',
      emergencyContact: '',
      emergencyPhone: ''
    },
    additional: {
      motherTongue: '',
      religion: '',
      isIndigenous: false,
      indigenousGroup: '',
      is4ps: false,
      learningMode: 'Blended' as 'Modular Print' | 'Digital' | 'Blended'
    }
  });
  const [otherMotherTongue, setOtherMotherTongue] = useState('');
  const [otherReligion, setOtherReligion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setUploadError(null);
    try {
      const toUpper = (str: string | undefined | null) => str ? str.toUpperCase() : '';
      
      const upperCaseFormData = {
        ...formData,
        firstName: toUpper(formData.firstName),
        lastName: toUpper(formData.lastName),
        middleName: toUpper(formData.middleName),
        fatherName: toUpper(formData.fatherName),
        motherName: toUpper(formData.motherName),
        address: {
          ...formData.address,
          street: toUpper(formData.address.street),
          barangay: toUpper(formData.address.barangay),
          city: toUpper(formData.address.city),
          province: toUpper(formData.address.province)
        },
        medical: {
          ...formData.medical,
          allergies: toUpper(formData.medical.allergies),
          emergencyContact: toUpper(formData.medical.emergencyContact),
          pwdId: toUpper(formData.medical.pwdId)
        },
        additional: {
          ...formData.additional,
          motherTongue: formData.additional.motherTongue === 'Others' ? toUpper(otherMotherTongue) : toUpper(formData.additional.motherTongue),
          religion: formData.additional.religion === 'Others' ? toUpper(otherReligion) : toUpper(formData.additional.religion),
          indigenousGroup: toUpper(formData.additional.indigenousGroup)
        }
      };

      await submitFullEnrollment(upperCaseFormData, birthCertFile ? {
        documentType: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE,
        file: birthCertFile
      } : undefined);
      onComplete();
    } catch (error) {
      console.error("Error submitting enrollment:", error);
      setUploadError((error as Error).message || "Failed to submit enrollment.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };
  return (
    <div className="flex flex-col h-full bg-slate-50/50 uppercase-inputs">
      <header className="px-6 py-5 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shadow-inner border border-primary/20">
              {step}
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Student Enrollment Form</h1>
              <p className="text-xs text-slate-500 font-medium">Step {step} of 6</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step > i
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                      : step === i
                      ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {step > i ? <CheckCircle2 className="w-3.5 h-3.5" /> : i}
                </div>
                {i < 6 && (
                  <div className={`h-0.5 w-6 rounded-full transition-all duration-500 ${ step > i ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center">
        <div className="w-full max-w-3xl">
          {/* Mobile step indicator */}
          <div className="flex sm:hidden justify-between mb-6 px-2 relative">
            <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-slate-200 -z-10 -translate-y-1/2"></div>
            <div
              className="absolute top-1/2 left-2 h-0.5 bg-primary -z-10 -translate-y-1/2 transition-all duration-500"
              style={{ width: `${((step - 1) / 5) * 100}%` }}
            />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step > i ? 'bg-emerald-500 text-white shadow-sm' : step === i ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-white text-slate-400 border border-slate-200'
                }`}
              >
                {step > i ? <CheckCircle2 className="w-4 h-4" /> : i}
              </div>
            ))}
          </div>

          <Card className="bg-white border-slate-200/60 shadow-sm overflow-hidden relative min-h-[500px] rounded-3xl">
            <AnimatePresence mode="wait" custom={1}>
              {step === 1 &&
              <motion.div
                key="step1"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.3
                }}
                className="p-4 sm:p-8 h-full flex flex-col">
                
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">
                    Personal Information
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                    Enter the learner's basic details.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 flex-1">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                      value={formData.firstName}
                      onChange={(e) =>
                      setFormData({
                        ...formData,
                        firstName: e.target.value
                      })
                      } />
                    
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                      value={formData.lastName}
                      onChange={(e) =>
                      setFormData({
                        ...formData,
                        lastName: e.target.value
                      })
                      } />
                    
                    </div>
                    <div className="space-y-2">
                      <Label>Middle Name</Label>
                      <Input
                      value={formData.middleName}
                      onChange={(e) =>
                      setFormData({
                        ...formData,
                        middleName: e.target.value
                      })
                      } />
                    
                    </div>
                    <div className="space-y-2">
                      <Label>Birth Date</Label>
                      <Input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) =>
                      setFormData({
                        ...formData,
                        birthDate: e.target.value
                      })
                      } />
                    
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select
                      value={formData.gender}
                      onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        gender: v
                      })
                      }>
                      
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Grade Level to Enroll</Label>
                      <Select
                      value={formData.gradeLevel}
                      onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        gradeLevel: v
                      })
                      }>
                      
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
                          {[1, 2, 3, 4, 5, 6].map((g) => (
                            <SelectItem key={g} value={g.toString()}>Grade {g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Learner Reference Number (LRN) <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        maxLength={12}
                        value={formData.lrn}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, ''); // Only digits allowed
                          setFormData({ ...formData, lrn: val });
                        }}
                        placeholder="Enter 12-digit LRN (Must match PSA Certificate)" 
                      />
                    </div>

                    <div className="space-y-4 sm:col-span-2 p-4 border border-border rounded-lg bg-muted/30">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="returning"
                          checked={formData.isReturning}
                          onCheckedChange={(c) => setFormData({ ...formData, isReturning: !!c })}
                        />
                        <Label htmlFor="returning" className="font-bold text-slate-700">
                          Balik-Aral (Returning Student)
                        </Label>
                      </div>
                      <p className="text-[10px] text-muted-foreground pl-6">
                        Check this if the student is returning to school after dropping out in previous years.
                      </p>

                      {formData.isReturning && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="space-y-2">
                            <Label>Last Grade Level Completed</Label>
                            <Input
                              value={formData.lastGradeLevel}
                              onChange={(e) => setFormData({ ...formData, lastGradeLevel: e.target.value })}
                              placeholder="e.g. Grade 5"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Last School Attended</Label>
                            <Input
                              value={formData.lastSchoolAttended}
                              onChange={(e) => setFormData({ ...formData, lastSchoolAttended: e.target.value })}
                              placeholder="Name of previous school"
                            />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Last School Year Attended</Label>
                            <Input
                              value={formData.lastSchoolYear}
                              onChange={(e) => setFormData({ ...formData, lastSchoolYear: e.target.value })}
                              placeholder="e.g. 2022-2023"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end pt-6 mt-6 border-t border-border">
                    <Button
                    onClick={() => setStep(2)}
                    className="w-full sm:w-auto"
                    disabled={
                    !formData.firstName ||
                    !formData.lastName ||
                    !formData.gradeLevel ||
                    formData.lrn.length !== 12
                    }>
                    
                      Next Step <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              }

              {step === 2 &&
              <motion.div
                key="step2"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.3
                }}
                className="p-4 sm:p-8 h-full flex flex-col">
                
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">
                    Address
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                    Current residential address.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 flex-1">
                    <div className="space-y-2 sm:col-span-2">
                      <Label>House No. / Street</Label>
                      <Input
                      value={formData.address.street}
                      onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: {
                          ...formData.address,
                          street: e.target.value
                        }
                      })
                      } />
                    
                    </div>
                    <div className="space-y-2">
                      <Label>Barangay</Label>
                      <Input
                      value={formData.address.barangay}
                      onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: {
                          ...formData.address,
                          barangay: e.target.value
                        }
                      })
                      } />
                    
                    </div>
                    <div className="space-y-2">
                      <Label>City / Municipality</Label>
                      <Input
                      value={formData.address.city}
                      onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: {
                          ...formData.address,
                          city: e.target.value
                        }
                      })
                      } />
                    
                    </div>
                    <div className="space-y-2">
                      <Label>Province</Label>
                      <Input
                      value={formData.address.province}
                      onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: {
                          ...formData.address,
                          province: e.target.value
                        }
                      })
                      } />
                    
                    </div>
                    <div className="space-y-2">
                      <Label>Zip Code</Label>
                      <Input
                      value={formData.address.zipCode}
                      onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: {
                          ...formData.address,
                          zipCode: e.target.value
                        }
                      })
                      } />
                    
                    </div>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 mt-6 border-t border-border">
                    <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="w-full sm:w-auto">
                    
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                    onClick={() => setStep(3)}
                    className="w-full sm:w-auto">
                    
                      Next Step <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              }

              {step === 3 &&
              <motion.div
                key="step3"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.3
                }}
                className="p-4 sm:p-8 h-full flex flex-col">
                
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">
                    Medical Information
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                    Important health details for emergencies.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 flex-1">
                    <div className="space-y-2">
                      <Label>Height (cm)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formData.medical.height}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setFormData({
                              ...formData,
                              medical: {
                                ...formData.medical,
                                height: val
                              }
                            });
                          }
                        }} />
                    
                    </div>
                    <div className="space-y-2">
                      <Label>Weight (kg)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formData.medical.weight}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setFormData({
                              ...formData,
                              medical: {
                                ...formData.medical,
                                weight: val
                              }
                            });
                          }
                        }} />
                    
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Blood Type</Label>
                      <Select
                      value={formData.medical.bloodType}
                      onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        medical: {
                          ...formData.medical,
                          bloodType: v
                        }
                      })
                      }>
                      
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Emergency Contact Name</Label>
                      <Input
                      value={formData.medical.emergencyContact}
                      onChange={(e) =>
                      setFormData({
                        ...formData,
                        medical: {
                          ...formData.medical,
                          emergencyContact: e.target.value
                        }
                      })
                      } />
                    
                    </div>
                    <div className="space-y-2">
                      <Label>Emergency Contact Phone</Label>
                      <Input
                        type="text"
                        inputMode="tel"
                        value={formData.medical.emergencyPhone}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow numbers, spaces, and common phone symbols
                          if (val === '' || /^[\d\s+\-()]*$/.test(val)) {
                            setFormData({
                              ...formData,
                              medical: {
                                ...formData.medical,
                                emergencyPhone: val
                              }
                            });
                          }
                        }} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Allergies (if any)</Label>
                      <Input
                        value={formData.medical.allergies}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            medical: {
                              ...formData.medical,
                              allergies: e.target.value
                            }
                          })
                        }
                        placeholder="e.g. Peanuts, Penicillin (Leave blank if none)"
                      />
                    </div>

                    <div className="space-y-4 sm:col-span-2 p-4 border border-border rounded-lg bg-blue-50/30">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="diagnosis"
                          checked={formData.medical.hasDiagnosis}
                          onCheckedChange={(c) => setFormData({ ...formData, medical: { ...formData.medical, hasDiagnosis: !!c } })}
                        />
                        <Label htmlFor="diagnosis" className="font-bold text-blue-900">
                          Licensed Diagnosis
                        </Label>
                      </div>
                      <p className="text-[10px] text-blue-700/70 pl-6">
                        Check if the child has a medical certificate for specific conditions.
                      </p>

                      {formData.medical.hasDiagnosis && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6 pt-2">
                          {['ADHD', 'Autism', 'Hearing Impairment', 'Learning Disability', 'Visual Impairment'].map((d) => (
                            <div key={d} className="flex items-center space-x-2">
                              <Checkbox
                                id={`diag-${d}`}
                                checked={formData.medical.diagnoses.includes(d)}
                                onCheckedChange={(c) => {
                                  const newDiags = c 
                                    ? [...formData.medical.diagnoses, d]
                                    : formData.medical.diagnoses.filter(x => x !== d);
                                  setFormData({ ...formData, medical: { ...formData.medical, diagnoses: newDiags } });
                                }}
                              />
                              <Label htmlFor={`diag-${d}`} className="text-xs">{d}</Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 sm:col-span-2 p-4 border border-border rounded-lg bg-orange-50/30">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="manifestations"
                          checked={formData.medical.hasManifestations}
                          onCheckedChange={(c) => setFormData({ ...formData, medical: { ...formData.medical, hasManifestations: !!c } })}
                        />
                        <Label htmlFor="manifestations" className="font-bold text-orange-900">
                          With Manifestations
                        </Label>
                      </div>
                      <p className="text-[10px] text-orange-700/70 pl-6">
                        Difficulties in seeing, hearing, or communicating (without formal diagnosis).
                      </p>

                      {formData.medical.hasManifestations && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6 pt-2">
                          {['Seeing Difficulty', 'Hearing Difficulty', 'Communicating Difficulty', 'Mobility Difficulty'].map((m) => (
                            <div key={m} className="flex items-center space-x-2">
                              <Checkbox
                                id={`man-${m}`}
                                checked={formData.medical.manifestations.includes(m)}
                                onCheckedChange={(c) => {
                                  const newMans = c 
                                    ? [...formData.medical.manifestations, m]
                                    : formData.medical.manifestations.filter(x => x !== m);
                                  setFormData({ ...formData, medical: { ...formData.medical, manifestations: newMans } });
                                }}
                              />
                              <Label htmlFor={`man-${m}`} className="text-xs">{m}</Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 sm:col-span-2 p-4 border border-border rounded-lg bg-muted/30">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pwd"
                          checked={formData.medical.hasPwdId}
                          onCheckedChange={(c) => setFormData({ ...formData, medical: { ...formData.medical, hasPwdId: !!c } })}
                        />
                        <Label htmlFor="pwd" className="font-bold">
                          Has Official PWD ID?
                        </Label>
                      </div>
                      {formData.medical.hasPwdId && (
                        <div className="pl-6 pt-2">
                          <Label className="text-xs mb-1 block">PWD ID Number</Label>
                          <Input
                            value={formData.medical.pwdId}
                            onChange={(e) => setFormData({ ...formData, medical: { ...formData.medical, pwdId: e.target.value } })}
                            placeholder="Enter PWD ID number"
                            className="h-8"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 mt-6 border-t border-border">
                    <Button
                    variant="ghost"
                    onClick={() => setStep(2)}
                    className="w-full sm:w-auto">
                    
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                    onClick={() => setStep(4)}
                    className="w-full sm:w-auto">
                    
                      Next Step <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              }

              {step === 4 &&
              <motion.div
                key="step4"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.3
                }}
                className="p-4 sm:p-8 h-full flex flex-col">
                
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">
                    Additional Information
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                    Required demographic data.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 flex-1">
                    <div className="space-y-2">
                      <Label>Mother Tongue</Label>
                      <Select
                      value={formData.additional.motherTongue}
                      onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        additional: {
                          ...formData.additional,
                          motherTongue: v
                        }
                      })
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Mother Tongue" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Tagalog">Tagalog</SelectItem>
                          <SelectItem value="Cebuano">Cebuano</SelectItem>
                          <SelectItem value="Chavacano">Chavacano</SelectItem>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Tausug">Tausug</SelectItem>
                          <SelectItem value="Ilonggo">Ilonggo</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {formData.additional.motherTongue === 'Others' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pt-2"
                        >
                          <Input
                            placeholder="Please specify Mother Tongue"
                            value={otherMotherTongue}
                            onChange={(e) => setOtherMotherTongue(e.target.value)}
                            className="bg-blue-50/50"
                          />
                        </motion.div>
                      )}
                    </div>
                    <div className="space-y-4 sm:col-span-2 p-4 border border-border rounded-lg bg-pink-50/30 mt-2">
                      <h3 className="font-bold text-pink-900 mb-2">Parents Information</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Father's Name</Label>
                          <Input
                            value={formData.fatherName}
                            onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                            placeholder="e.g. Juan De la Cruz"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Mother's Name (Maiden Name)</Label>
                          <Input
                            value={formData.motherName}
                            onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                            placeholder="e.g. Maria Clara"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Religion</Label>
                      <Select
                      value={formData.additional.religion}
                      onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        additional: {
                          ...formData.additional,
                          religion: v
                        }
                      })
                      }>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Religion" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Roman Catholic">Roman Catholic</SelectItem>
                          <SelectItem value="Islam">Islam</SelectItem>
                          <SelectItem value="Iglesia ni Cristo">Iglesia ni Cristo</SelectItem>
                          <SelectItem value="Born Again Christian">Born Again Christian</SelectItem>
                          <SelectItem value="Protestant">Protestant</SelectItem>
                          <SelectItem value="MCGI">MCGI</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {formData.additional.religion === 'Others' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pt-2"
                        >
                          <Input
                            placeholder="Please specify Religion"
                            value={otherReligion}
                            onChange={(e) => setOtherReligion(e.target.value)}
                            className="bg-blue-50/50"
                          />
                        </motion.div>
                      )}
                    </div>
                    <div className="space-y-4 sm:col-span-2 mt-2 sm:mt-4 p-4 border border-border rounded-lg bg-muted/30">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                        id="indigenous"
                        checked={formData.additional.isIndigenous}
                        onCheckedChange={(c) =>
                        setFormData({
                          ...formData,
                          additional: {
                            ...formData.additional,
                            isIndigenous: !!c
                          }
                        })
                        } />
                      
                        <Label htmlFor="indigenous" className="font-bold">
                          Belongs to an Indigenous Peoples (IP) Community
                        </Label>
                      </div>
                      {formData.additional.isIndigenous &&
                        <div className="space-y-2 pl-6">
                          <Label>Specify IP Group</Label>
                          <Input
                            value={formData.additional.indigenousGroup}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                additional: {
                                  ...formData.additional,
                                  indigenousGroup: e.target.value
                                }
                              })
                            } />
                        </div>
                      }
                    </div>

                    <div className="space-y-4 sm:col-span-2 p-4 border border-border rounded-lg bg-green-50/30">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="4ps"
                          checked={formData.additional.is4ps}
                          onCheckedChange={(c) => setFormData({ ...formData, additional: { ...formData.additional, is4ps: !!c } })}
                        />
                        <Label htmlFor="4ps" className="font-bold text-green-900">
                          4Ps Beneficiary?
                        </Label>
                      </div>
                      <p className="text-[10px] text-green-700/70 pl-6">
                        Check if the family is currently a recipient of the Pantawid Pamilyang Pilipino Program.
                      </p>
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label className="font-bold">Distance Learning Preference</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Choose how you prefer your child to learn if they cannot attend physical classes.
                      </p>
                      <Select
                        value={formData.additional.learningMode}
                        onValueChange={(v) => setFormData({ ...formData, additional: { ...formData.additional, learningMode: v as 'Modular Print' | 'Digital' | 'Blended' } })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select learning mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Modular Print">Modular Print</SelectItem>
                          <SelectItem value="Digital">Digital</SelectItem>
                          <SelectItem value="Blended">Blended (Physical + Digital)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 mt-6 border-t border-border">
                    <Button
                    variant="ghost"
                    onClick={() => setStep(3)}
                    className="w-full sm:w-auto">
                    
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                    onClick={() => setStep(5)}
                    className="w-full sm:w-auto">
                    
                      Next Step <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              }

              {step === 5 &&
              <motion.div
                key="step5"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="p-4 sm:p-8 h-full flex flex-col">
                
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-slate-800">Document Upload</h2>
                    <p className="text-slate-500 mt-1">Please provide the PSA/Birth Certificate for verification. (Optional - you can submit later)</p>
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">PSA Birth Certificate</h3>
                    <p className="text-sm text-slate-500 max-w-sm mb-6">
                      Upload a clear scanned copy or photo of the learner's official PSA Birth Certificate.
                    </p>
                    
                    <label className="inline-flex cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setBirthCertFile(file);
                        }}
                      />
                      <span className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 h-12 text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
                        <Upload className="w-4 h-4 mr-2" />
                        {birthCertFile ? 'Replace Document' : 'Choose File'}
                      </span>
                    </label>
                    <p className="text-xs text-slate-400 mt-3">PDF, JPG, or PNG (Max 10MB)</p>
                    
                    {birthCertFile && (
                      <div className="mt-6 flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm text-left max-w-sm w-full">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 truncate">{birthCertFile.name}</p>
                          <p className="text-xs text-slate-500">{(birthCertFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 mt-6 border-t border-border">
                    <Button variant="ghost" onClick={() => setStep(4)} className="w-full sm:w-auto">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button 
                      onClick={() => setStep(6)} 
                      className="w-full sm:w-auto">
                      Review <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              }

              {step === 6 &&
              <motion.div
                key="step6"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.3
                }}
                className="p-4 sm:p-8 h-full flex flex-col">
                
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">
                    Review & Submit
                  </h2>
                  <p className="text-sm sm:text-base text-muted-foreground mb-6">
                    Please review the information before submitting.
                  </p>

                  <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 pr-2">
                    <div className="p-4 border border-border rounded-lg bg-muted/30">
                      <h3 className="font-semibold mb-3">Personal Info</h3>
                      <p className="text-sm">
                        <span className="text-muted-foreground w-24 inline-block">
                          Name:
                        </span>{' '}
                        {formData.firstName} {formData.lastName}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground w-24 inline-block">
                          Grade:
                        </span>{' '}
                        {formData.gradeLevel}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground w-24 inline-block">
                          LRN:
                        </span>{' '}
                        {formData.lrn || 'None'}
                      </p>
                    </div>
                    <div className="p-4 border border-border rounded-lg bg-muted/30">
                      <h3 className="font-semibold mb-3">Address</h3>
                      <p className="text-sm">
                        {formData.address.street}, {formData.address.barangay},{' '}
                        {formData.address.city}
                      </p>
                    </div>
                    <div className="p-4 border border-border rounded-lg bg-muted/30">
                      <h3 className="font-semibold mb-3">Emergency Contact</h3>
                      <p className="text-sm">
                        <span className="text-muted-foreground w-24 inline-block">
                          Name:
                        </span>{' '}
                        {formData.medical.emergencyContact}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground w-24 inline-block">
                          Phone:
                        </span>{' '}
                        {formData.medical.emergencyPhone}
                      </p>
                    </div>
                    <div className="p-4 border border-border rounded-lg bg-muted/30">
                      <h3 className="font-semibold mb-3">Requirements</h3>
                      <p className="text-sm">
                        <span className="text-muted-foreground w-24 inline-block">
                          Birth Cert:
                        </span>{' '}
                        {birthCertFile ? (
                          <span className="text-emerald-600 font-medium">Ready to upload ({birthCertFile.name})</span>
                        ) : (
                          <span className="text-amber-600 font-medium">To be submitted later</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
                      {uploadError}
                    </div>
                  )}

                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 mt-6 border-t border-border">
                    <Button
                    variant="ghost"
                    onClick={() => setStep(5)}
                    className="w-full sm:w-auto">
                    
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                    onClick={handleSubmit}
                    className="w-full sm:w-auto sm:px-8"
                    disabled={isSubmitting}>
                    
                      {isSubmitting ? 'Submitting...' : 'Submit Enrollment'}
                    </Button>
                  </div>
                </motion.div>
              }
            </AnimatePresence>
          </Card>
        </div>
      </div>
    </div>);

}