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
  SelectValue
} from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  User,
  MapPin,
  HeartPulse,
  Users,
  Sparkles,
  AlertCircle,
  Loader2,
  Info,
  Calendar,
  FileCheck,
  FileText,
  FolderOpen,
  ShieldCheck,
  Clock,
  XCircle,
  Eye,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useParentData } from '../../lib/parentData';
import { DOCUMENT_TYPES } from '../../lib/schema/phase2';

interface EnrollmentFormProps {
  onComplete: () => void;
  onNavigateToRequirements?: () => void;
}

const PROVINCES_CITIES: Record<string, string[]> = {
  'Zamboanga City': ['Zamboanga City'],
  'Zamboanga del Sur': [
    'Pagadian City', 'Aurora', 'Bayog', 'Dimataling', 'Dinas', 'Dumalinao',
    'Dumingag', 'Guipos', 'Josefina', 'Kumalarang', 'Labangan', 'Lakewood',
    'Lapuyan', 'Mahayag', 'Margosatubig', 'Midsalip', 'Molave', 'Pitogo',
    'Ramon Magsaysay', 'San Pablo', 'San Miguel', 'Tabina', 'Tamboulig',
    'Tigbao', 'Tukuran', 'Vincenzo A. Sagun'
  ],
  'Zamboanga del Norte': [
    'Dipolog City', 'Dapitan City', 'Bacungan', 'Baliguian', 'Godod', 'Gutalac',
    'Jose Dalman', 'Kalawit', 'Katipunan', 'La Libertad', 'Labason', 'Leon B. Postigo',
    'Liloy', 'Manukan', 'Mutia', 'Pinan', 'Polanco', 'President Manuel A. Roxas',
    'Rizal', 'Salug', 'Sergio Osmena Sr.', 'Siayan', 'Sibuco', 'Sirawai', 'Siocon'
  ],
  'Zamboanga Sibugay': [
    'Ipil', 'Alicia', 'Buug', 'Diplahan', 'Imelda', 'Kabasalan', 'Mabuhay',
    'Malangas', 'Naga', 'Olutanga', 'Payao', 'Roseller Lim', 'Siay', 'Talusan',
    'Titay', 'Tungawan'
  ]
};

const DIAGNOSED_CONDITIONS = [
  'ADHD',
  'Autism Spectrum Disorder (ASD)',
  'Hearing Impairment',
  'Visual Impairment',
  'Speech Impairment',
  'Physical Disability',
  'Intellectual Disability',
  'Learning Disability',
  'Other'
];

const FUNCTIONAL_DIFFICULTIES = [
  'Seeing Difficulty',
  'Hearing Difficulty',
  'Communicating Difficulty',
  'Walking / Mobility Difficulty',
  'Self-care Difficulty',
  'Remembering / Concentrating Difficulty'
];

type StudentClassificationType = 'New Student' | 'Transferee' | 'Balik-Aral' | 'Continuing Student';

export function EnrollmentForm({ onComplete, onNavigateToRequirements }: EnrollmentFormProps) {
  const { user, userData } = useAuth();
  const { submitFullEnrollment, documents, children } = useParentData();

  const uData = userData as Record<string, any> | null;

  // Sub-step index (1 to 11, 12 = Success Screen)
  const [subStep, setSubStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Student Info
  const [studentInfo, setStudentInfo] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    birthDate: '',
    gender: '',
    gradeLevel: '',
    lrn: '',
    classification: 'New Student' as StudentClassificationType
  });

  // Age Calculator
  const calculateAge = (bDate: string): number | null => {
    if (!bDate) return null;
    const today = new Date();
    const birth = new Date(bDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const computedAge = calculateAge(studentInfo.birthDate);

  // Address Info
  const [selectedAddressOption, setSelectedAddressOption] = useState<string>('0');
  const [manualAddress, setManualAddress] = useState({
    province: 'Zamboanga City',
    customProvince: '',
    city: 'Zamboanga City',
    customCity: '',
    barangay: '',
    streetAddress: '',
    zipCode: ''
  });

  const parentAddresses = Array.isArray(uData?.addresses) && uData.addresses.length > 0
    ? uData.addresses
    : (uData?.streetAddress ? [{
        id: 'addr-default',
        label: 'Home Address 1',
        province: uData.province || 'Zamboanga City',
        city: uData.city || 'Zamboanga City',
        barangay: uData.barangay || '',
        streetAddress: uData.streetAddress || '',
        zipCode: uData.zipCode || '',
        isPrimary: true
      }] : []);

  const getSelectedAddressDetails = () => {
    if (selectedAddressOption === 'other' || parentAddresses.length === 0) {
      const prov = manualAddress.province === 'Others' ? manualAddress.customProvince : manualAddress.province;
      const city = manualAddress.province === 'Others' ? manualAddress.customCity : manualAddress.city;
      const zipPart = manualAddress.zipCode ? `, ${manualAddress.zipCode}` : '';
      return {
        province: prov,
        city: city,
        barangay: manualAddress.barangay,
        streetAddress: manualAddress.streetAddress,
        zipCode: manualAddress.zipCode,
        previewText: manualAddress.barangay && manualAddress.streetAddress
          ? `${manualAddress.streetAddress}, Brgy. ${manualAddress.barangay}, ${city}, ${prov}${zipPart}`
          : manualAddress.barangay
            ? `Brgy. ${manualAddress.barangay}, ${city}, ${prov}${zipPart}`
            : 'Manual Custom Address Entry'
      };
    }

    const idx = parseInt(selectedAddressOption, 10);
    const addr = parentAddresses[idx] || parentAddresses[0];
    if (!addr) {
      return {
        province: '',
        city: '',
        barangay: '',
        streetAddress: '',
        zipCode: '',
        previewText: 'No address selected'
      };
    }
    const provDisplay = addr.province === 'Others' ? (addr.customProvince || 'Others') : addr.province;
    const cityDisplay = addr.province === 'Others' ? (addr.customCity || 'Others') : addr.city;
    const zipPart = addr.zipCode ? `, ${addr.zipCode}` : '';
    return {
      province: provDisplay,
      city: cityDisplay,
      barangay: addr.barangay || '',
      streetAddress: addr.streetAddress || '',
      zipCode: addr.zipCode || '',
      previewText: `${addr.streetAddress ? `${addr.streetAddress}, ` : ''}Brgy. ${addr.barangay || '—'}, ${cityDisplay || '—'}, ${provDisplay || '—'}${zipPart}`
    };
  };

  // Medical Info
  const [medicalInfo, setMedicalInfo] = useState({
    height: '',
    weight: '',
    bloodType: '',
    allergies: '',
    diagnoses: [] as string[],
    otherDiagnosis: '',
    functionalDifficulties: [] as string[],
    hasPwdId: 'No',
    pwdIdNumber: ''
  });

  // Parent & Student Info
  const [parentStudentInfo, setParentStudentInfo] = useState({
    isPrimaryGuardian: 'Yes',
    primaryParentName: '',
    primaryRelationship: 'Father',
    primaryContact: '',
    religion: 'Roman Catholic',
    otherReligion: '',
    isIndigenous: 'No',
    ipCommunity: '',
    is4ps: 'No'
  });

  // The enrollment form does NOT store documents locally.
  // Documents are managed exclusively from the Document Center (RequirementsView).
  // Step 5 reads live status from Firestore via useParentData.

  // Screen Validation
  const validateSubStep = (): boolean => {
    setErrorMsg(null);

    if (subStep === 1) { // 1A: Name & Birth Date
      if (!studentInfo.firstName.trim() || !studentInfo.lastName.trim()) {
        setErrorMsg('First Name and Last Name are required.');
        return false;
      }
      if (!studentInfo.birthDate) {
        setErrorMsg('Birth Date is required.');
        return false;
      }
    }

    if (subStep === 2) { // 1B: Gender, Grade, LRN, Classification
      if (!studentInfo.gender) {
        setErrorMsg('Please select Gender.');
        return false;
      }
      if (!studentInfo.gradeLevel) {
        setErrorMsg('Please select Grade Level to apply for.');
        return false;
      }
      if (!studentInfo.lrn.trim() || studentInfo.lrn.trim().length !== 12 || !/^\d+$/.test(studentInfo.lrn.trim())) {
        setErrorMsg('Learner Reference Number (LRN) must be exactly 12 numeric digits.');
        return false;
      }
      if (!studentInfo.classification) {
        setErrorMsg('Please select Student Classification.');
        return false;
      }
    }

    if (subStep === 4) { // Manual address part 1
      if (selectedAddressOption === 'other') {
        if (!manualAddress.province || !manualAddress.city || !manualAddress.barangay.trim()) {
          setErrorMsg('Province, City, and Barangay are required.');
          return false;
        }
      }
    }

    if (subStep === 5) { // Manual address part 2
      if (selectedAddressOption === 'other') {
        if (!manualAddress.streetAddress.trim()) {
          setErrorMsg('Street Address is required.');
          return false;
        }
      }
    }

    if (subStep === 6) { // Medical part 1
      if (!medicalInfo.height.trim() || !medicalInfo.weight.trim()) {
        setErrorMsg('Height and Weight are required.');
        return false;
      }
    }

    if (subStep === 7) { // Medical part 2 (PWD)
      if (medicalInfo.hasPwdId === 'Yes' && !medicalInfo.pwdIdNumber.trim()) {
        setErrorMsg('PWD ID Number is required when PWD ID is Yes.');
        return false;
      }
    }

    if (subStep === 8) { // Parent info part 1
      if (parentStudentInfo.isPrimaryGuardian === 'No') {
        if (!parentStudentInfo.primaryParentName.trim() || !parentStudentInfo.primaryContact.trim()) {
          setErrorMsg('Primary Parent/Guardian Name and Contact Number are required.');
          return false;
        }
      }
    }

    if (subStep === 9) { // Parent info part 2
      if (!parentStudentInfo.religion) {
        setErrorMsg('Religion selection is required.');
        return false;
      }
      if (parentStudentInfo.religion === 'Others' && !parentStudentInfo.otherReligion.trim()) {
        setErrorMsg('Please specify Religion.');
        return false;
      }
    }

    return true;
  };

  const handleNextSubStep = () => {
    if (!validateSubStep()) return;

    if (subStep === 3 && selectedAddressOption !== 'other') {
      setDirection(1);
      setSubStep(6);
      return;
    }

    setDirection(1);
    setSubStep(prev => prev + 1);
  };

  const handleBackSubStep = () => {
    setErrorMsg(null);
    if (subStep === 6 && selectedAddressOption !== 'other') {
      setDirection(-1);
      setSubStep(3);
      return;
    }
    setDirection(-1);
    setSubStep(prev => prev - 1);
  };

  // Submit Registration
  const handleSubmitRegistration = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const activeAddr = getSelectedAddressDetails();
      const parentFullName = uData ? `${uData.firstName} ${uData.lastName}` : (user?.displayName || 'Parent');

      const registrationPayload: any = {
        firstName: studentInfo.firstName.trim().toUpperCase(),
        middleName: studentInfo.middleName.trim().toUpperCase(),
        lastName: studentInfo.lastName.trim().toUpperCase(),
        birthDate: studentInfo.birthDate,
        gender: studentInfo.gender,
        gradeLevel: studentInfo.gradeLevel,
        lrn: studentInfo.lrn.trim(),
        fatherName: parentStudentInfo.isPrimaryGuardian === 'No' ? parentStudentInfo.primaryParentName.trim().toUpperCase() : parentFullName.toUpperCase(),
        motherName: parentFullName.toUpperCase(),
        isReturning: studentInfo.classification !== 'New Student',
        studentClassification: studentInfo.classification,
        address: {
          street: activeAddr.streetAddress.toUpperCase(),
          barangay: activeAddr.barangay.toUpperCase(),
          city: activeAddr.city.toUpperCase(),
          province: activeAddr.province.toUpperCase(),
          zipCode: activeAddr.zipCode
        },
        medical: {
          height: medicalInfo.height,
          weight: medicalInfo.weight,
          bloodType: medicalInfo.bloodType,
          allergies: medicalInfo.allergies.toUpperCase(),
          hasDiagnosis: medicalInfo.diagnoses.length > 0,
          diagnoses: medicalInfo.diagnoses.includes('Other') && medicalInfo.otherDiagnosis
            ? [...medicalInfo.diagnoses.filter(d => d !== 'Other'), `OTHER: ${medicalInfo.otherDiagnosis.toUpperCase()}`]
            : medicalInfo.diagnoses,
          hasManifestations: medicalInfo.functionalDifficulties.length > 0,
          manifestations: medicalInfo.functionalDifficulties,
          hasPwdId: medicalInfo.hasPwdId === 'Yes',
          pwdId: medicalInfo.pwdIdNumber.toUpperCase(),
          emergencyContact: parentFullName.toUpperCase(),
          emergencyPhone: uData?.contactNumber || ''
        },
        additional: {
          motherTongue: 'Tagalog / Bisaya',
          religion: parentStudentInfo.religion === 'Others' ? parentStudentInfo.otherReligion.toUpperCase() : parentStudentInfo.religion.toUpperCase(),
          isIndigenous: parentStudentInfo.isIndigenous === 'Yes',
          indigenousGroup: parentStudentInfo.ipCommunity.toUpperCase(),
          is4ps: parentStudentInfo.is4ps === 'Yes',
          learningMode: 'Blended'
        }
      };

      const enrollmentId = await submitFullEnrollment(registrationPayload);

      // Documents are managed exclusively from the Document Center.
      // No document uploads happen here.

      setSubStep(12); // Success screen
    } catch (err: any) {
      console.error('Error submitting registration:', err);
      setErrorMsg(err.message || 'Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 20 : -20,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 20 : -20,
      opacity: 0
    })
  };

  const getMainStepNumber = () => {
    if (subStep <= 2) return 1; // Student Info
    if (subStep <= 5) return 2; // Address Info
    if (subStep <= 7) return 3; // Medical Info
    if (subStep <= 9) return 4; // Parent & Student Info
    if (subStep === 10) return 5; // Supporting Documents
    if (subStep === 11) return 6; // Review & Submit
    return 6;
  };

  const mainStep = getMainStepNumber();

  const getRequiredDocDefs = () => {
    if (studentInfo.classification === 'Transferee') {
      return [
        { key: 'psa', type: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE, title: 'PSA Birth Certificate' },
        { key: 'reportCard', type: DOCUMENT_TYPES.REPORT_CARD, title: 'Report Card (SF9)' },
        { key: 'goodMoral', type: DOCUMENT_TYPES.GOOD_MORAL, title: 'Good Moral Certificate' }
      ];
    }
    if (studentInfo.classification === 'Balik-Aral') {
      return [
        { key: 'psa', type: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE, title: 'PSA Birth Certificate' },
        { key: 'reportCard', type: DOCUMENT_TYPES.REPORT_CARD, title: 'Most Recent Report Card (if available)' }
      ];
    }
    // New Student & Continuing Student
    return [
      { key: 'psa', type: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE, title: 'PSA Birth Certificate' }
    ];
  };

  const requiredDocDefs = getRequiredDocDefs();

  // Helper text for Student Classification
  const getClassificationHelper = (cls: StudentClassificationType) => {
    if (cls === 'New Student') return 'A learner registering as a new applicant.';
    if (cls === 'Transferee') return 'A learner transferring from another school.';
    if (cls === 'Balik-Aral') return 'A learner who previously stopped attending school and is now returning to continue their studies.';
    if (cls === 'Continuing Student') return 'A learner who was promoted to a higher grade level in the same school.';
    return '';
  };

  // ── SUCCESS SCREEN ──
  if (subStep === 12) {
    return (
      <div className="max-w-xl mx-auto p-4 font-sans">
        <Card className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 text-center space-y-6 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Registration Submitted Successfully
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
              Your registration for <strong className="text-slate-900 font-bold">{studentInfo.firstName} {studentInfo.lastName}</strong> ({studentInfo.gradeLevel}) is now submitted.
            </p>
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 font-medium leading-relaxed text-left space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-sm text-[#0C3B99]">
                <FileCheck className="w-4 h-4 text-[#0C3B99]" /> Requirements Management
              </div>
              <p className="text-[11px] leading-normal text-blue-800">
                You can upload missing supporting documents anytime from the <strong>Document Center</strong> in the sidebar.
              </p>
            </div>
          </div>

          <Button
            onClick={onComplete}
            className="w-full px-6 py-3 bg-[#0C3B99] hover:bg-blue-800 text-white rounded-2xl font-bold shadow-xs transition-all flex items-center justify-center gap-2"
          >
            Go to Requirements Page
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>
      </div>
    );
  }

  const activeAddrDetails = getSelectedAddressDetails();

  return (
    <div className="max-w-xl mx-auto px-3 py-4 pb-16 font-sans space-y-4">
      
      {/* ── HEADER CARD WITH PROGRESS BAR ── */}
      <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-[#0C3B99] font-black text-xs">
              {mainStep}
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 leading-tight">Student Registration Form</h1>
              <p className="text-[11px] text-slate-400 font-medium">Sta. Maria Elementary School Learner Portal</p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-blue-50 text-[#0C3B99] rounded-lg text-[10px] font-black uppercase tracking-wider">
            Step {mainStep} of 6
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
            <div
              className="h-full bg-[#0C3B99] rounded-full transition-all duration-300"
              style={{ width: `${(mainStep / 6) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Progress: {Math.round((mainStep / 6) * 100)}%</span>
            <span>{[
              'Student Info',
              'Address Info',
              'Medical Info',
              'Parent Info',
              'Supporting Documents',
              'Review & Submit'
            ][mainStep - 1]}</span>
          </div>
        </div>
      </Card>

      {/* ── ERROR ALERT ── */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2.5 animate-in fade-in-50 duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="text-xs font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* ── STEP CONTENT AREA (MAX 4 INPUT FIELDS AT A TIME) ── */}
      <AnimatePresence custom={direction} mode="wait">
        <motion.div
          key={subStep}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.18, ease: 'easeInOut' }}
        >
          <Card className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
            
            {/* ── SUB-STEP 1: STUDENT NAME & BIRTH DATE (4 FIELDS MAX) ── */}
            {subStep === 1 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#0C3B99]" />
                    Student Information (Part 1 of 2)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Learner's basic information.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Field 1: First Name */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">First Name *</Label>
                    <Input
                      value={studentInfo.firstName}
                      onChange={e => setStudentInfo({ ...studentInfo, firstName: e.target.value })}
                      placeholder="e.g. Juan"
                      className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">First name as shown on PSA birth certificate.</p>
                  </div>

                  {/* Field 2: Last Name */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Last Name *</Label>
                    <Input
                      value={studentInfo.lastName}
                      onChange={e => setStudentInfo({ ...studentInfo, lastName: e.target.value })}
                      placeholder="e.g. Dela Cruz"
                      className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Learner's legal surname / family name.</p>
                  </div>

                  {/* Field 3: Middle Name */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Middle Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </Label>
                    <Input
                      value={studentInfo.middleName}
                      onChange={e => setStudentInfo({ ...studentInfo, middleName: e.target.value })}
                      placeholder="e.g. Santos"
                      className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-800 font-medium text-xs h-11"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Middle name or leave blank if none.</p>
                  </div>

                  {/* Field 4: Birth Date */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Birth Date *</Label>
                      {computedAge !== null && (
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {computedAge} yrs old
                        </span>
                      )}
                    </div>
                    <Input
                      type="date"
                      value={studentInfo.birthDate}
                      onChange={e => setStudentInfo({ ...studentInfo, birthDate: e.target.value })}
                      className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Date of birth (age calculated automatically).</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-STEP 2: GENDER, GRADE, LRN & STUDENT CLASSIFICATION (4 FIELDS MAX) ── */}
            {subStep === 2 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#0C3B99]" />
                    Student Information (Part 2 of 2)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Gender, grade level, DepEd LRN, and applicant classification.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Field 1: Gender */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Gender *</Label>
                    <Select
                      value={studentInfo.gender}
                      onValueChange={v => setStudentInfo({ ...studentInfo, gender: v })}
                    >
                      <SelectTrigger className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-400 font-medium">Learner's legal sex for school records.</p>
                  </div>

                  {/* Field 2: Grade Level */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Grade Level to Apply For *</Label>
                    <Select
                      value={studentInfo.gradeLevel}
                      onValueChange={v => setStudentInfo({ ...studentInfo, gradeLevel: v })}
                    >
                      <SelectTrigger className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11">
                        <SelectValue placeholder="Select grade level" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 max-h-52 overflow-y-auto">
                        <SelectItem value="Grade 1">Grade 1</SelectItem>
                        <SelectItem value="Grade 2">Grade 2</SelectItem>
                        <SelectItem value="Grade 3">Grade 3</SelectItem>
                        <SelectItem value="Grade 4">Grade 4</SelectItem>
                        <SelectItem value="Grade 5">Grade 5</SelectItem>
                        <SelectItem value="Grade 6">Grade 6</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-slate-400 font-medium">Grade level applying for next school year.</p>
                  </div>

                  {/* Field 3: LRN */}
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Learner Reference Number (LRN) *</Label>
                    <Input
                      value={studentInfo.lrn}
                      maxLength={12}
                      onChange={e => {
                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 12);
                        setStudentInfo({ ...studentInfo, lrn: cleaned });
                      }}
                      placeholder="12-digit LRN (e.g. 123456789012)"
                      className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">12-digit DepEd reference number (found on report card).</p>
                  </div>

                  {/* Field 4: Student Classification Dropdown with Clear Helper Descriptions */}
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Student Classification *
                    </Label>
                    <Select
                      value={studentInfo.classification}
                      onValueChange={v => setStudentInfo({ ...studentInfo, classification: v as StudentClassificationType })}
                    >
                      <SelectTrigger className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11">
                        <SelectValue placeholder="Select student classification" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="New Student">New Student</SelectItem>
                        <SelectItem value="Continuing Student">Continuing Student (Promoted to Higher Grade)</SelectItem>
                        <SelectItem value="Transferee">Transferee</SelectItem>
                        <SelectItem value="Balik-Aral">Balik-Aral (Returning Student)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] font-semibold text-[#0C3B99] bg-blue-50/70 p-2.5 rounded-lg border border-blue-100 mt-1">
                      {getClassificationHelper(studentInfo.classification)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-STEP 3: ADDRESS SELECTION ── */}
            {subStep === 3 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Address Information
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Select a saved address from your account or enter a new address.</p>
                </div>

                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Choose Learner Residence Address *
                  </Label>

                  <div className="space-y-2">
                    {parentAddresses.map((addr, idx) => (
                      <label
                        key={addr.id || idx}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedAddressOption === `${idx}`
                            ? 'bg-blue-50/80 border-[#0C3B99] text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="addressChoice"
                          checked={selectedAddressOption === `${idx}`}
                          onChange={() => setSelectedAddressOption(`${idx}`)}
                          className="w-4 h-4 text-[#0C3B99] accent-[#0C3B99] mt-0.5 shrink-0"
                        />
                        <div className="text-xs font-semibold">
                          <span className="font-bold text-slate-900 block">
                            {addr.label || `Home Address ${idx + 1}`} {addr.isPrimary ? '(Primary Address)' : ''}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            Brgy. {addr.barangay || '—'}, {addr.city || addr.province}
                          </span>
                        </div>
                      </label>
                    ))}

                    <label
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedAddressOption === 'other'
                          ? 'bg-blue-50/80 border-[#0C3B99] text-slate-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="addressChoice"
                        checked={selectedAddressOption === 'other'}
                        onChange={() => setSelectedAddressOption('other')}
                        className="w-4 h-4 text-[#0C3B99] accent-[#0C3B99] mt-0.5 shrink-0"
                      />
                      <div className="text-xs font-semibold">
                        <span className="font-bold text-slate-900 block">Other Address</span>
                        <span className="text-slate-500 text-[11px]">Specify a new custom address location for this learner.</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-STEP 4: MANUAL ADDRESS PART 1 (4 FIELDS MAX) ── */}
            {subStep === 4 && selectedAddressOption === 'other' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Manual Address Entry (Part 1)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Province, city, barangay, and ZIP code.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Province *</Label>
                    <Select
                      value={manualAddress.province}
                      onValueChange={v => {
                        if (v === 'Others') {
                          setManualAddress({ ...manualAddress, province: 'Others', city: 'Others' });
                        } else {
                          const cities = PROVINCES_CITIES[v] || [];
                          setManualAddress({
                            ...manualAddress,
                            province: v,
                            city: cities[0] || '',
                            customProvince: '',
                            customCity: ''
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11">
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {Object.keys(PROVINCES_CITIES).map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">City / Municipality *</Label>
                    {manualAddress.province === 'Others' ? (
                      <Input
                        value={manualAddress.customCity}
                        onChange={e => setManualAddress({ ...manualAddress, customCity: e.target.value })}
                        placeholder="Enter city"
                        className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                      />
                    ) : (
                      <Select
                        value={manualAddress.city}
                        onValueChange={v => setManualAddress({ ...manualAddress, city: v })}
                      >
                        <SelectTrigger className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 max-h-52 overflow-y-auto">
                          {(PROVINCES_CITIES[manualAddress.province] || []).map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Barangay *</Label>
                    <Input
                      value={manualAddress.barangay}
                      onChange={e => setManualAddress({ ...manualAddress, barangay: e.target.value })}
                      placeholder="e.g. Poblacion"
                      className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Local barangay name.</p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      ZIP Code <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </Label>
                    <Input
                      value={manualAddress.zipCode}
                      onChange={e => setManualAddress({ ...manualAddress, zipCode: e.target.value })}
                      placeholder="e.g. 7000"
                      className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Postal ZIP code.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-STEP 5: MANUAL ADDRESS PART 2 (STREET ADDRESS) ── */}
            {subStep === 5 && selectedAddressOption === 'other' && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    Manual Address Entry (Part 2)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Street address details.</p>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Street Address *</Label>
                    <Input
                      value={manualAddress.streetAddress}
                      onChange={e => setManualAddress({ ...manualAddress, streetAddress: e.target.value })}
                      placeholder="House No., Street Name, Sitio"
                      className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">House number and street location.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-STEP 6: PHYSICAL METRICS (4 FIELDS MAX) ── */}
            {subStep === 6 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-500" />
                    Medical Information (Part 1 of 2)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Physical height, weight, blood type, and allergies.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Height (cm) *</Label>
                    <Input
                      type="number"
                      value={medicalInfo.height}
                      onChange={e => setMedicalInfo({ ...medicalInfo, height: e.target.value })}
                      placeholder="e.g. 115"
                      className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Weight (kg) *</Label>
                    <Input
                      type="number"
                      value={medicalInfo.weight}
                      onChange={e => setMedicalInfo({ ...medicalInfo, weight: e.target.value })}
                      placeholder="e.g. 22"
                      className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Blood Type <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </Label>
                    <Select
                      value={medicalInfo.bloodType}
                      onValueChange={v => setMedicalInfo({ ...medicalInfo, bloodType: v })}
                    >
                      <SelectTrigger className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-800 font-medium text-xs h-11">
                        <SelectValue placeholder="Select blood type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bt => (
                          <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Allergies <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </Label>
                    <Input
                      value={medicalInfo.allergies}
                      onChange={e => setMedicalInfo({ ...medicalInfo, allergies: e.target.value })}
                      placeholder="e.g. Peanuts, Penicillin"
                      className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-800 font-medium text-xs h-11"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-STEP 7: CONDITIONS, DIFFICULTIES & PWD ID ── */}
            {subStep === 7 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-500" />
                    Medical Information (Part 2 of 2)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Diagnosed conditions, functional difficulties, and PWD ID status.</p>
                </div>

                {/* Diagnosed Conditions */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Does the learner have any diagnosed medical conditions? *
                      </Label>
                      <p className="text-[10px] text-slate-400 font-medium">e.g. ADHD, Autism, Hearing/Visual Impairments</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {['No', 'Yes'].map(opt => (
                        <label key={opt} className="flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="hasDiagnosedConditionPrompt"
                            checked={(medicalInfo.diagnoses.length > 0 ? 'Yes' : 'No') === opt}
                            onChange={() => {
                              if (opt === 'No') {
                                setMedicalInfo({ ...medicalInfo, diagnoses: [], otherDiagnosis: '' });
                              } else if (medicalInfo.diagnoses.length === 0) {
                                setMedicalInfo({ ...medicalInfo, diagnoses: ['Other'] });
                              }
                            }}
                            className="w-4 h-4 text-[#0C3B99] accent-[#0C3B99]"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>

                  {medicalInfo.diagnoses.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-3 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2"
                    >
                      {DIAGNOSED_CONDITIONS.map(cond => (
                        <label key={cond} className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200/80 hover:bg-slate-50 transition-colors cursor-pointer select-none">
                          <Checkbox
                            checked={medicalInfo.diagnoses.includes(cond)}
                            onCheckedChange={checked => {
                              if (checked) {
                                setMedicalInfo({ ...medicalInfo, diagnoses: [...medicalInfo.diagnoses, cond] });
                              } else {
                                const updated = medicalInfo.diagnoses.filter(d => d !== cond);
                                setMedicalInfo({ ...medicalInfo, diagnoses: updated });
                              }
                            }}
                          />
                          <span className="text-xs font-bold text-slate-700">{cond}</span>
                        </label>
                      ))}

                      {medicalInfo.diagnoses.includes('Other') && (
                        <div className="sm:col-span-2 pt-1">
                          <Input
                            value={medicalInfo.otherDiagnosis}
                            onChange={e => setMedicalInfo({ ...medicalInfo, otherDiagnosis: e.target.value })}
                            placeholder="Specify diagnosed condition"
                            className="px-3 py-2 bg-white border-slate-200 rounded-lg text-xs font-bold"
                          />
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Functional Difficulties */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Does the learner experience any functional difficulties? *
                      </Label>
                      <p className="text-[10px] text-slate-400 font-medium">e.g. Seeing, Hearing, Mobility, or Communication</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {['No', 'Yes'].map(opt => (
                        <label key={opt} className="flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="hasFunctionalDifficultyPrompt"
                            checked={(medicalInfo.functionalDifficulties.length > 0 ? 'Yes' : 'No') === opt}
                            onChange={() => {
                              if (opt === 'No') {
                                setMedicalInfo({ ...medicalInfo, functionalDifficulties: [] });
                              } else if (medicalInfo.functionalDifficulties.length === 0) {
                                setMedicalInfo({ ...medicalInfo, functionalDifficulties: [FUNCTIONAL_DIFFICULTIES[0]] });
                              }
                            }}
                            className="w-4 h-4 text-[#0C3B99] accent-[#0C3B99]"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>

                  {medicalInfo.functionalDifficulties.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-3 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2"
                    >
                      {FUNCTIONAL_DIFFICULTIES.map(diff => (
                        <label key={diff} className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-200/80 hover:bg-slate-50 transition-colors cursor-pointer select-none">
                          <Checkbox
                            checked={medicalInfo.functionalDifficulties.includes(diff)}
                            onCheckedChange={checked => {
                              if (checked) {
                                setMedicalInfo({ ...medicalInfo, functionalDifficulties: [...medicalInfo.functionalDifficulties, diff] });
                              } else {
                                setMedicalInfo({ ...medicalInfo, functionalDifficulties: medicalInfo.functionalDifficulties.filter(d => d !== diff) });
                              }
                            }}
                          />
                          <span className="text-xs font-bold text-slate-700">{diff}</span>
                        </label>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* PWD Question */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Does the learner have an official PWD ID? *
                      </Label>
                      <p className="text-[10px] text-slate-400 font-medium">Government-issued Persons with Disability ID card</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {['No', 'Yes'].map(opt => (
                        <label key={opt} className="flex items-center gap-1.5 text-xs font-bold text-slate-800 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="hasPwdId"
                            checked={medicalInfo.hasPwdId === opt}
                            onChange={() => setMedicalInfo({ ...medicalInfo, hasPwdId: opt as 'Yes' | 'No' })}
                            className="w-4 h-4 text-[#0C3B99] accent-[#0C3B99]"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>

                  {medicalInfo.hasPwdId === 'Yes' && (
                    <div className="pt-2 border-t border-slate-200/70">
                      <Input
                        value={medicalInfo.pwdIdNumber}
                        onChange={e => setMedicalInfo({ ...medicalInfo, pwdIdNumber: e.target.value })}
                        placeholder="Enter Official PWD ID Number *"
                        className="px-3.5 py-2.5 bg-white border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SUB-STEP 8: REGISTERED BY & PRIMARY GUARDIAN ── */}
            {subStep === 8 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Parent & Student Information (Part 1 of 2)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Account holder synchronization and primary guardian confirmation.</p>
                </div>

                <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">Registered By (Account Holder)</span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-800">
                    <div>Name: <span className="text-slate-900">{uData ? `${uData.firstName} ${uData.lastName}` : (user?.displayName || '—')}</span></div>
                    <div>Phone: <span className="text-slate-900">{uData?.contactNumber || '—'}</span></div>
                  </div>
                </div>

                <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Are you the learner's primary parent or legal guardian? *
                  </Label>
                  <div className="flex items-center gap-6">
                    {['Yes', 'No'].map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                        <input
                          type="radio"
                          name="isPrimaryGuardian"
                          checked={parentStudentInfo.isPrimaryGuardian === opt}
                          onChange={() => setParentStudentInfo({ ...parentStudentInfo, isPrimaryGuardian: opt as 'Yes' | 'No' })}
                          className="w-4 h-4 text-[#0C3B99] accent-[#0C3B99]"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>

                  {parentStudentInfo.isPrimaryGuardian === 'No' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/70">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700 uppercase">Primary Parent Name *</Label>
                        <Input
                          value={parentStudentInfo.primaryParentName}
                          onChange={e => setParentStudentInfo({ ...parentStudentInfo, primaryParentName: e.target.value })}
                          placeholder="e.g. Maria Dela Cruz"
                          className="px-3.5 py-2.5 bg-white border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700 uppercase">Contact Number *</Label>
                        <Input
                          value={parentStudentInfo.primaryContact}
                          maxLength={11}
                          onChange={e => {
                            const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11);
                            setParentStudentInfo({ ...parentStudentInfo, primaryContact: cleaned });
                          }}
                          placeholder="09XXXXXXXXX"
                          className="px-3.5 py-2.5 bg-white border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SUB-STEP 9: RELIGION, IP & 4PS (3 FIELDS MAX) ── */}
            {subStep === 9 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    Parent & Student Information (Part 2 of 2)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Religion, Indigenous Peoples, and 4Ps affiliation.</p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Religion *</Label>
                    <Select
                      value={parentStudentInfo.religion}
                      onValueChange={v => setParentStudentInfo({ ...parentStudentInfo, religion: v })}
                    >
                      <SelectTrigger className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11">
                        <SelectValue placeholder="Select religion" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="Roman Catholic">Roman Catholic</SelectItem>
                        <SelectItem value="Islam">Islam</SelectItem>
                        <SelectItem value="Evangelical / Protestant">Evangelical / Protestant</SelectItem>
                        <SelectItem value="Seventh-day Adventist">Seventh-day Adventist</SelectItem>
                        <SelectItem value="Iglesia ni Cristo">Iglesia ni Cristo</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {parentStudentInfo.religion === 'Others' && (
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Specify Religion *</Label>
                      <Input
                        value={parentStudentInfo.otherReligion}
                        onChange={e => setParentStudentInfo({ ...parentStudentInfo, otherReligion: e.target.value })}
                        placeholder="Enter religion"
                        className="px-3.5 py-2.5 bg-slate-50 border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                      />
                    </div>
                  )}

                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Does the learner belong to an Indigenous Peoples (IP) community? *
                    </Label>
                    <div className="flex items-center gap-6">
                      {['No', 'Yes'].map(opt => (
                        <label key={opt} className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="isIndigenous"
                            checked={parentStudentInfo.isIndigenous === opt}
                            onChange={() => setParentStudentInfo({ ...parentStudentInfo, isIndigenous: opt as 'Yes' | 'No' })}
                            className="w-4 h-4 text-[#0C3B99] accent-[#0C3B99]"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>

                    {parentStudentInfo.isIndigenous === 'Yes' && (
                      <div className="pt-2">
                        <Input
                          value={parentStudentInfo.ipCommunity}
                          onChange={e => setParentStudentInfo({ ...parentStudentInfo, ipCommunity: e.target.value })}
                          placeholder="Specify IP Community (Optional)"
                          className="px-3.5 py-2 bg-white border-slate-200 rounded-xl text-slate-900 text-xs font-bold"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                    <Label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Is the learner a beneficiary of the Pantawid Pamilyang Pilipino Program (4Ps)? *
                    </Label>
                    <div className="flex items-center gap-6">
                      {['No', 'Yes'].map(opt => (
                        <label key={opt} className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="is4ps"
                            checked={parentStudentInfo.is4ps === opt}
                            onChange={() => setParentStudentInfo({ ...parentStudentInfo, is4ps: opt as 'Yes' | 'No' })}
                            className="w-4 h-4 text-[#0C3B99] accent-[#0C3B99]"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 5 OF 6: SUPPORTING DOCUMENTS (SYNC VIEW) ── */}
            {subStep === 10 && (() => {
              // Find the most recent enrollment for this student by matching name + grade
              // or just use the first enrollment from `children` that matches the current form data.
              // Since we're mid-registration (not yet submitted), there's no enrollmentId yet.
              // We show a pre-registration notice pointing to Document Center.
              const allUploaded = requiredDocDefs.every(d =>
                documents.some(doc => doc.documentType === d.type)
              );

              return (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2.5">
                    <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#0C3B99]" />
                      Supporting Documents
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Your document status is synchronized from the Document Center.
                    </p>
                  </div>

                  {/* Sync info banner */}
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-start gap-2.5">
                    <FolderOpen className="w-4 h-4 text-[#0C3B99] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-900 font-semibold leading-relaxed">
                      Documents are managed from the <strong>Document Center</strong>. Upload your required documents there — they will automatically appear in your registration and be reviewed by the school.
                    </p>
                  </div>

                  {/* Classification */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                    <span className="text-slate-500 font-bold">Student Classification:</span>
                    <span className="font-extrabold text-[#0C3B99] bg-white px-2.5 py-1 rounded-lg border border-blue-100">
                      {studentInfo.classification}
                    </span>
                  </div>

                  {/* Document status list */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Required Documents ({requiredDocDefs.length})
                    </span>

                    {requiredDocDefs.map(docDef => {
                      // Look up any existing upload for this doc type across all children
                      const docRecord = documents.find(d => d.documentType === docDef.type);
                      const status = docRecord?.status;

                      return (
                        <div key={docDef.key} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <FileText className="w-4 h-4 text-[#0C3B99] shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <h3 className="text-xs font-bold text-slate-900">{docDef.title}</h3>
                              </div>
                            </div>

                            {status === 'APPROVED' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="w-3 h-3" /> Verified
                              </span>
                            )}
                            {status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Clock className="w-3 h-3 animate-pulse" /> Under Review
                              </span>
                            )}
                            {status === 'REJECTED' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3" /> Needs Re-upload
                              </span>
                            )}
                            {!docRecord && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Not Uploaded
                              </span>
                            )}
                          </div>

                          {status === 'APPROVED' && docRecord && (
                            <button
                              type="button"
                              onClick={() => window.open(docRecord.fileUrl, '_blank')}
                              className="flex items-center gap-1.5 text-[11px] font-bold text-[#0C3B99] hover:underline"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Document
                            </button>
                          )}

                          {!docRecord && (
                            <div className="bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2 flex items-start gap-2">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                                This document has not been uploaded yet. You may continue your registration now and upload this document later from the Document Center.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {allUploaded ? (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <p className="text-[11px] text-emerald-800 font-bold">
                        ✔ All required documents have already been uploaded. No further action is required.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onNavigateToRequirements}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#0C3B99]/30 hover:border-[#0C3B99]/60 text-[#0C3B99] rounded-xl text-xs font-bold transition-all hover:bg-blue-50/50"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Go to Document Center
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <p className="text-[11px] text-slate-400 font-medium italic text-center">
                    You may submit your registration now and upload missing documents later from the Document Center.
                  </p>
                </div>
              );
            })()}

            {/* ── STEP 6 OF 6: REVIEW & SUBMIT ── */}
            {subStep === 11 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#0C3B99]" />
                    Review & Submit Registration
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">Review all registration details before submitting.</p>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Student Summary */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
                      <span>Student Information</span>
                      <button type="button" onClick={() => setSubStep(1)} className="text-[#0C3B99] hover:underline font-bold">Edit</button>
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-slate-700">
                      <div>Name: <strong>{studentInfo.firstName} {studentInfo.lastName}</strong></div>
                      <div>Birth Date: <strong>{studentInfo.birthDate} ({computedAge} yrs)</strong></div>
                      <div>Grade / LRN: <strong>{studentInfo.gradeLevel} ({studentInfo.lrn})</strong></div>
                      <div>Classification: <strong>{studentInfo.classification}</strong></div>
                    </div>
                  </div>

                  {/* Address Summary */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
                      <span>Address Location</span>
                      <button type="button" onClick={() => setSubStep(3)} className="text-[#0C3B99] hover:underline font-bold">Edit</button>
                    </h3>
                    <p className="font-bold text-slate-800">
                      {activeAddrDetails.previewText}
                      {activeAddrDetails.zipCode && !activeAddrDetails.previewText.includes(activeAddrDetails.zipCode) ? ` (ZIP Code: ${activeAddrDetails.zipCode})` : ''}
                    </p>
                  </div>

                  {/* Medical Summary */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center justify-between">
                      <span>Medical Info</span>
                      <button type="button" onClick={() => setSubStep(6)} className="text-[#0C3B99] hover:underline font-bold">Edit</button>
                    </h3>
                    <p className="font-bold text-slate-800">
                      Height: {medicalInfo.height} cm | Weight: {medicalInfo.weight} kg | PWD: {medicalInfo.hasPwdId}
                    </p>
                  </div>

                  {/* Document Status Summary — live from Document Center */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                      Supporting Documents
                    </h3>

                    <div className="space-y-1.5">
                      {requiredDocDefs.map(docDef => {
                        const docRecord = documents.find(d => d.documentType === docDef.type);
                        const status = docRecord?.status;

                        return (
                          <div key={docDef.key} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/70 text-xs font-semibold">
                            <span className="text-slate-800 font-bold">{docDef.title}</span>
                            {status === 'APPROVED' && (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                              </span>
                            )}
                            {status === 'PENDING' && (
                              <span className="text-blue-700 font-bold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-blue-500" /> Under Review
                              </span>
                            )}
                            {status === 'REJECTED' && (
                              <span className="text-rose-700 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Needs Re-upload
                              </span>
                            )}
                            {!docRecord && (
                              <span className="text-amber-700 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> ⚠ Missing
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Submission Reminder */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-semibold leading-relaxed">
                  You may still submit your registration even if some documents are missing. Missing documents can be uploaded later through the Document Center. Registration review may take longer until all required documents have been submitted.
                </div>
              </div>
            )}

            {/* ── FOOTER NAVIGATION CONTROLS ── */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
              {subStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackSubStep}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50 transition-all text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </Button>
              ) : <div />}

              {subStep < 11 ? (
                <Button
                  type="button"
                  onClick={handleNextSubStep}
                  className="px-5 py-2 bg-[#0C3B99] hover:bg-blue-800 text-white rounded-xl font-bold shadow-xs transition-all text-xs flex items-center gap-1.5"
                >
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmitRegistration}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#0C3B99] hover:bg-blue-800 text-white rounded-xl font-bold shadow-xs transition-all text-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Submit Registration
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* No local file preview modal needed — all previews handled by Document Center */}
    </div>
  );
}