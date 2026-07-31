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
  ExternalLink,
  Upload,
  Trash2,
  RefreshCw,
  Pencil,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useParentData } from '../../lib/parentData';
import { logActivity } from '../../lib/services/activityLogService';
import { DOCUMENT_TYPES, DocumentType } from '../../lib/schema/phase2';
import { db } from '../../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import {
  uploadToCloudinary,
  addEnrollmentDocumentRecord,
  validateRequirementUpload
} from '../../lib/services/enrollmentDocumentsService';

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
  const { submitFullEnrollment, documents, children, uploadRequirementDocument } = useParentData();

  const uData = userData as Record<string, any> | null;

  // Sub-step index (1 to 11, 12 = Success Screen)
  const [subStep, setSubStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  // Store local files selected for confirmation during Step 5 before registration is submitted
  const [step5Uploads, setStep5Uploads] = useState<Record<string, {
    file: File;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    sizeBytes: number;
  }>>({});

  const handleStep5DocSelect = (docType: DocumentType, file: File) => {
    const valErr = validateRequirementUpload(file);
    if (valErr) {
      setErrorMsg(valErr);
      return;
    }
    setErrorMsg(null);
    const localUrl = URL.createObjectURL(file);
    setStep5Uploads((prev) => ({
      ...prev,
      [docType]: {
        file,
        fileName: file.name,
        fileUrl: localUrl,
        mimeType: file.type,
        sizeBytes: file.size
      }
    }));
  };

  const handleStep5DocRemove = (docType: DocumentType) => {
    setErrorMsg(null);
    setStep5Uploads((prev) => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
  };

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

  // Guardian & Emergency Contact Info
  const [parentStudentInfo, setParentStudentInfo] = useState({
    isPrimaryGuardian: 'Yes',
    primaryParentName: '',
    primaryRelationship: 'Mother',
    primaryContact: '',
    primaryEmail: '',
    primaryAddress: '',
    religion: 'Roman Catholic',
    otherReligion: '',
    isIndigenous: 'No',
    ipCommunity: '',
    is4ps: 'No'
  });

  const [isConfirmed, setIsConfirmed] = useState(false);

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

    if (subStep === 8) { // Guardian Confirmation
      // Yes/No selection is always selected by default ('Yes')
      return true;
    }

    if (subStep === 85) { // Guardian & Emergency Contact Details (when NO selected)
      if (!parentStudentInfo.primaryParentName.trim()) {
        setErrorMsg('Guardian Full Name is required.');
        return false;
      }
      if (!parentStudentInfo.primaryRelationship) {
        setErrorMsg('Relationship to Learner is required.');
        return false;
      }
      if (!parentStudentInfo.primaryContact.trim()) {
        setErrorMsg('Guardian Mobile Number is required.');
        return false;
      }
      if (parentStudentInfo.primaryContact.trim().length !== 11) {
        setErrorMsg('Guardian Mobile Number must be exactly 11 digits (e.g. 09123456789).');
        return false;
      }
      if (!parentStudentInfo.primaryAddress.trim()) {
        setErrorMsg('Guardian Complete Address is required.');
        return false;
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

    if (subStep === 8) {
      if (parentStudentInfo.isPrimaryGuardian === 'Yes') {
        setDirection(1);
        setSubStep(9);
        return;
      } else {
        setDirection(1);
        setSubStep(85);
        return;
      }
    }

    if (subStep === 85) {
      setDirection(1);
      setSubStep(9);
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
    if (subStep === 9) {
      if (parentStudentInfo.isPrimaryGuardian === 'Yes') {
        setDirection(-1);
        setSubStep(8);
        return;
      } else {
        setDirection(-1);
        setSubStep(85);
        return;
      }
    }
    if (subStep === 85) {
      setDirection(-1);
      setSubStep(8);
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

      const isAccountSource = parentStudentInfo.isPrimaryGuardian === 'Yes';

      const registrationPayload: any = {
        firstName: studentInfo.firstName.trim().toUpperCase(),
        middleName: studentInfo.middleName.trim().toUpperCase(),
        lastName: studentInfo.lastName.trim().toUpperCase(),
        birthDate: studentInfo.birthDate,
        gender: studentInfo.gender,
        gradeLevel: studentInfo.gradeLevel,
        lrn: studentInfo.lrn.trim(),
        guardianSource: isAccountSource ? 'account' : 'manual',
        guardianDetails: {
          fullName: isAccountSource ? parentFullName.toUpperCase() : parentStudentInfo.primaryParentName.trim().toUpperCase(),
          relationship: isAccountSource ? 'Account Holder / Parent' : parentStudentInfo.primaryRelationship,
          contactNumber: isAccountSource ? (uData?.contactNumber || uData?.phoneNumber || '') : parentStudentInfo.primaryContact.trim(),
          email: isAccountSource ? (uData?.email || user?.email || '') : parentStudentInfo.primaryEmail.trim(),
          address: isAccountSource ? activeAddr.previewText.toUpperCase() : parentStudentInfo.primaryAddress.trim().toUpperCase()
        },
        fatherName: isAccountSource ? parentFullName.toUpperCase() : parentStudentInfo.primaryParentName.trim().toUpperCase(),
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
          emergencyContact: isAccountSource ? parentFullName.toUpperCase() : parentStudentInfo.primaryParentName.trim().toUpperCase(),
          emergencyPhone: isAccountSource ? (uData?.contactNumber || uData?.phoneNumber || '') : parentStudentInfo.primaryContact.trim()
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

      try {
        await logActivity({
          parentId: user?.uid || '',
          title: 'Learner Registration Submitted',
          subtitle: `Submitted registration for ${studentInfo.firstName} ${studentInfo.lastName} (${studentInfo.classification}).`,
          type: 'registration',
          badgeText: 'SUBMITTED',
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          dotColor: 'bg-amber-500'
        });
      } catch (err) {
        console.warn('Could not log registration activity:', err);
      }

      // Upload staged documents only after successful registration submission
      const localUploadedKeys = Object.keys(step5Uploads);
      for (const docType of localUploadedKeys) {
        const fileData = step5Uploads[docType];
        if (fileData && fileData.file) {
          try {
            if (uploadRequirementDocument) {
              await uploadRequirementDocument({
                enrollmentId,
                documentType: docType as DocumentType,
                file: fileData.file
              });
            }
          } catch (docErr) {
            console.error(`Failed to upload ${docType} document during registration:`, docErr);
          }
        }
      }

      setSubStep(13); // Success screen
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
    if (subStep === 8 || subStep === 85 || subStep === 9) return 4; // Parent & Student Info (Guardian Info)
    if (subStep === 10) return 5; // Supporting Documents
    if (subStep === 11 || subStep === 12) return 6; // Review & Submit
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
  if (subStep === 13) {
    return (
      <div className="min-h-[85vh] flex flex-col justify-center items-center p-4 font-sans">
        <div className="w-full max-w-xl my-auto">
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
                <div className="flex items-center gap-1.5 font-bold text-sm text-[#2563eb]">
                  <FileCheck className="w-4 h-4 text-[#2563eb]" /> Requirements Management
                </div>
                <p className="text-[11px] leading-normal text-blue-800">
                  You can upload missing supporting documents anytime from the <strong>Document Center</strong> in the sidebar.
                </p>
              </div>
            </div>

            <Button
              onClick={onComplete}
              className="w-full px-6 py-3 bg-[#2563eb] hover:bg-blue-800 text-white rounded-2xl font-bold shadow-xs transition-all flex items-center justify-center gap-2"
            >
              Go to Requirements Page
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const activeAddrDetails = getSelectedAddressDetails();

  return (
    <div className="flex flex-col h-full bg-white font-sans text-slate-900 w-full overflow-hidden text-left">
      
      {/* ── HEADER CARD WITH PROGRESS BAR ── */}
      <header className="px-8 bg-white border-b border-slate-100 lg:h-28 flex flex-col justify-between pt-7 pb-5 shrink-0">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-[#2563eb] font-black text-sm shrink-0">
                {mainStep}
              </div>
              <div className="text-left">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">Student Registration Form</h1>
                <p className="text-xs text-slate-400 font-medium mt-1 leading-none">Sta. Maria Elementary School Learner Portal</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-white border border-slate-200 text-slate-655 rounded-lg text-[10px] font-extrabold uppercase tracking-widest shrink-0">
              STEP {mainStep} OF 6
            </span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-extrabold tracking-wider uppercase">
              <span className="text-[#2563eb]">PROGRESS: {Math.round((mainStep / 6) * 100)}%</span>
              <span className="text-slate-450">{[
                'STUDENT INFORMATION',
                'ADDRESS INFORMATION',
                'MEDICAL INFORMATION',
                'PARENT & GUARDIAN DETAILS',
                'SUPPORTING DOCUMENTS',
                'REVIEW & SUBMISSION'
              ][mainStep - 1]}</span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2563eb] rounded-full transition-all duration-500"
                style={{ width: `${(mainStep / 6) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN SCROLLABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto pt-10 pb-8 px-8 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Toast Alerts */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2.5 animate-in fade-in-50 duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-xs font-semibold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 animate-in fade-in-50 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold">{successMsg}</span>
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
              className="space-y-6"
            >
            
            {/* ── SUB-STEP 1: STUDENT NAME & BIRTH DATE (4 FIELDS MAX) ── */}
            {subStep === 1 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-3 flex items-start gap-3 text-left">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#2563eb] shrink-0">
                    <User className="w-5 h-5 text-[#2563eb]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight leading-tight flex items-center gap-1.5">
                      Student Information <span className="text-xs text-slate-400 font-medium">(Part 1 of 2)</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">Provide the learner's basic identification details.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
                  {/* Field 1: First Name */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1">First Name *</Label>
                    <Input
                      value={studentInfo.firstName}
                      onChange={e => setStudentInfo({ ...studentInfo, firstName: e.target.value })}
                      placeholder="e.g. Juan"
                      className="w-full h-14 px-5 bg-slate-50 border-slate-100/60 rounded-2xl text-slate-800 font-bold text-sm placeholder:text-slate-350 focus:bg-white focus:border-blue-500 transition-all"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">First name as shown on PSA birth certificate.</p>
                  </div>

                  {/* Field 2: Last Name */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1">Last Name *</Label>
                    <Input
                      value={studentInfo.lastName}
                      onChange={e => setStudentInfo({ ...studentInfo, lastName: e.target.value })}
                      placeholder="e.g. Dela Cruz"
                      className="w-full h-14 px-5 bg-slate-50 border-slate-100/60 rounded-2xl text-slate-800 font-bold text-sm placeholder:text-slate-350 focus:bg-white focus:border-blue-500 transition-all"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Learner's legal surname / family name.</p>
                  </div>

                  {/* Field 3: Middle Name */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1">
                      Middle Name <span className="text-slate-400 font-bold lowercase">(optional)</span>
                    </Label>
                    <Input
                      value={studentInfo.middleName}
                      onChange={e => setStudentInfo({ ...studentInfo, middleName: e.target.value })}
                      placeholder="e.g. Santos"
                      className="w-full h-14 px-5 bg-slate-50 border-slate-100/60 rounded-2xl text-slate-800 font-bold text-sm placeholder:text-slate-350 focus:bg-white focus:border-blue-500 transition-all"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Middle name or leave blank if none.</p>
                  </div>

                  {/* Field 4: Birth Date */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">Birth Date *</Label>
                      {computedAge !== null && (
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                          {computedAge} yrs old
                        </span>
                      )}
                    </div>
                    <Input
                      type="date"
                      value={studentInfo.birthDate}
                      onChange={e => setStudentInfo({ ...studentInfo, birthDate: e.target.value })}
                      className="w-full h-14 px-5 bg-slate-50 border-slate-100/60 rounded-2xl text-slate-800 font-bold text-sm placeholder:text-slate-350 focus:bg-white focus:border-blue-500 transition-all"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Date of birth (age calculated automatically).</p>
                  </div>
                </div>

                {/* Important Notice alert notice */}
                <div className="p-4 sm:p-5 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-3 mt-4 text-left">
                  <Info className="w-5 h-5 text-[#2563eb] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-blue-900 tracking-wider uppercase">IMPORTANT NOTICE</h4>
                    <p className="text-xs text-blue-800 font-semibold leading-relaxed">
                      Please ensure all information matches legal documents exactly. Any discrepancies may delay the registration and verification process for the upcoming school year.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── SUB-STEP 2: GENDER, GRADE, LRN & STUDENT CLASSIFICATION (4 FIELDS MAX) ── */}
            {subStep === 2 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#2563eb]" />
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
                    <p className="text-[10px] font-semibold text-[#2563eb] bg-blue-50/70 p-2.5 rounded-lg border border-blue-100 mt-1">
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
                            ? 'bg-blue-50/80 border-[#2563eb] text-slate-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="addressChoice"
                          checked={selectedAddressOption === `${idx}`}
                          onChange={() => setSelectedAddressOption(`${idx}`)}
                          className="w-4 h-4 text-[#2563eb] accent-[#2563eb] mt-0.5 shrink-0"
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
                          ? 'bg-blue-50/80 border-[#2563eb] text-slate-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="addressChoice"
                        checked={selectedAddressOption === 'other'}
                        onChange={() => setSelectedAddressOption('other')}
                        className="w-4 h-4 text-[#2563eb] accent-[#2563eb] mt-0.5 shrink-0"
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
                            className="w-4 h-4 text-[#2563eb] accent-[#2563eb]"
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
                            className="w-4 h-4 text-[#2563eb] accent-[#2563eb]"
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
                            className="w-4 h-4 text-[#2563eb] accent-[#2563eb]"
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

            {/* ── SUB-STEP 8: GUARDIAN CONFIRMATION (STEP 1 OF 3 / STEP 1 OF 4) ── */}
            {subStep === 8 && (
              <div className="space-y-4">
                {/* Header & Subtitle */}
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2563eb]" />
                    Guardian Confirmation ({parentStudentInfo.isPrimaryGuardian === 'Yes' ? 'Step 1 of 3' : 'Step 1 of 4'})
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Confirm the learner's primary guardian and emergency contact information.
                  </p>
                </div>

                {/* Account Holder Card */}
                <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#2563eb] uppercase tracking-wider">
                      REGISTERED ACCOUNT HOLDER
                    </span>
                    <span className="px-2.5 py-0.5 bg-blue-100/80 text-[#2563eb] border border-blue-200 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#2563eb]" /> Synchronized from Account
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold text-slate-800 pt-1">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Full Name</span>
                      <span className="text-slate-900">{uData ? `${uData.firstName} ${uData.lastName}` : (user?.displayName || '—')}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Mobile Number</span>
                      <span className="text-slate-900">{uData?.contactNumber || uData?.phoneNumber || '—'}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Email Address</span>
                      <span className="text-slate-900 truncate block">{uData?.email || user?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Question & Radio Options */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <Label className="text-xs font-bold text-slate-800 leading-snug block">
                    Will the registered account holder serve as the learner's primary guardian and emergency contact? <span className="text-rose-600">*</span>
                  </Label>

                  <div className="flex items-center gap-6 pt-0.5">
                    {['Yes', 'No'].map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                        <input
                          type="radio"
                          name="isPrimaryGuardian"
                          checked={parentStudentInfo.isPrimaryGuardian === opt}
                          onChange={() => setParentStudentInfo({ ...parentStudentInfo, isPrimaryGuardian: opt as 'Yes' | 'No' })}
                          className="w-4 h-4 text-[#2563eb] accent-[#2563eb]"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>

                  {/* IF YES: Display Success Notice */}
                  {parentStudentInfo.isPrimaryGuardian === 'Yes' && (
                    <div className="mt-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in-50 duration-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>✓ Guardian and emergency contact information will be synchronized from your account.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── SUB-STEP 85: GUARDIAN & EMERGENCY CONTACT DETAILS (STEP 2 OF 4 - ONLY WHEN NO) ── */}
            {subStep === 85 && (
              <div className="space-y-4">
                {/* Header & Subtitle */}
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2563eb]" />
                    Guardian & Emergency Contact Details (Step 2 of 4)
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Enter the primary guardian and emergency contact details for the learner.
                  </p>
                </div>

                <div className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Full Name */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 uppercase">
                        Full Name <span className="text-rose-600">*</span>
                      </Label>
                      <Input
                        value={parentStudentInfo.primaryParentName}
                        onChange={e => setParentStudentInfo({ ...parentStudentInfo, primaryParentName: e.target.value })}
                        placeholder="e.g. Juanita Santos Dela Cruz"
                        className="px-3.5 py-2.5 bg-white border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                      />
                    </div>

                    {/* Relationship to Learner */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 uppercase">
                        Relationship to Learner <span className="text-rose-600">*</span>
                      </Label>
                      <Select
                        value={parentStudentInfo.primaryRelationship}
                        onValueChange={v => setParentStudentInfo({ ...parentStudentInfo, primaryRelationship: v })}
                      >
                        <SelectTrigger className="px-3.5 py-2.5 bg-white border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11">
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="Mother">Mother</SelectItem>
                          <SelectItem value="Father">Father</SelectItem>
                          <SelectItem value="Grandparent">Grandparent</SelectItem>
                          <SelectItem value="Legal Guardian">Legal Guardian</SelectItem>
                          <SelectItem value="Relative / Aunt / Uncle">Relative / Aunt / Uncle</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Mobile Number */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 uppercase">
                        Mobile Number <span className="text-rose-600">*</span>
                      </Label>
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

                    {/* Email Address (optional) */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 uppercase">
                        Email Address <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </Label>
                      <Input
                        type="email"
                        value={parentStudentInfo.primaryEmail}
                        onChange={e => setParentStudentInfo({ ...parentStudentInfo, primaryEmail: e.target.value })}
                        placeholder="e.g. guardian@example.com"
                        className="px-3.5 py-2.5 bg-white border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                      />
                    </div>

                    {/* Complete Address */}
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[11px] font-bold text-slate-700 uppercase">
                        Complete Address <span className="text-rose-600">*</span>
                      </Label>
                      <Input
                        value={parentStudentInfo.primaryAddress}
                        onChange={e => setParentStudentInfo({ ...parentStudentInfo, primaryAddress: e.target.value })}
                        placeholder="House No., Street, Barangay, City/Municipality, Province"
                        className="px-3.5 py-2.5 bg-white border-slate-200 rounded-xl text-slate-900 font-bold text-xs h-11"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    This information will be used as the learner's primary guardian and emergency contact.
                  </p>
                </div>
              </div>
            )}

            {/* ── SUB-STEP 9: ADDITIONAL INFORMATION (STEP 2 OF 3 / STEP 3 OF 4) ── */}
            {subStep === 9 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2.5">
                  <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2563eb]" />
                    Additional Information ({parentStudentInfo.isPrimaryGuardian === 'Yes' ? 'Step 2 of 3' : 'Step 3 of 4'})
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
                            className="w-4 h-4 text-[#2563eb] accent-[#2563eb]"
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
                            className="w-4 h-4 text-[#2563eb] accent-[#2563eb]"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 5 OF 6: SUPPORTING DOCUMENTS ── */}
            {subStep === 10 && (() => {
              const allUploaded = requiredDocDefs.every(d =>
                Boolean(step5Uploads[d.type])
              );

              return (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-2.5">
                    <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#2563eb]" />
                      Supporting Documents
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Upload your required documents now or continue and upload them later.
                    </p>
                  </div>

                  {/* Clarification Reminder Banner */}
                  <div className="p-3.5 bg-blue-50/90 border border-blue-200/90 rounded-xl flex items-start gap-3 shadow-xs">
                    <Info className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[11px] text-blue-950 font-bold leading-relaxed">
                        You may upload your documents now or skip this step. Missing documents can be uploaded later through the Document Center.
                      </p>
                      <p className="text-[10px] text-blue-700 font-medium">
                        Uploading documents is optional during registration, but required before final verification by the school.
                      </p>
                    </div>
                  </div>

                  {/* Student Classification Badge */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                    <span className="text-slate-500 font-bold">Student Classification:</span>
                    <span className="font-extrabold text-[#2563eb] bg-white px-2.5 py-1 rounded-lg border border-blue-100">
                      {studentInfo.classification}
                    </span>
                  </div>

                  {/* Required Documents List */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Required Documents ({requiredDocDefs.length})
                    </span>

                    {requiredDocDefs.map(docDef => {
                      const localDoc = step5Uploads[docDef.type];

                      return (
                        <div key={docDef.key} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 transition-all hover:border-slate-300 text-left">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <FileText className="w-4.5 h-4.5 text-[#2563eb] shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <h3 className="text-xs font-bold text-slate-900">{docDef.title}</h3>
                                {localDoc && (
                                  <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium font-sans">
                                    {localDoc.fileName}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Status Badge */}
                            {localDoc ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Status: Document Inserted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-650 border border-slate-200">
                                Status: Not Uploaded
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 flex-wrap">
                            {localDoc ? (
                              <>
                                {/* View Button */}
                                <button
                                  type="button"
                                  onClick={() => window.open(localDoc.fileUrl, '_blank')}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-[#2563eb] rounded-lg text-[11px] font-bold text-[#2563eb] shadow-2xs transition-all hover:bg-blue-50/50 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </button>

                                {/* Replace Button */}
                                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-[#2563eb] rounded-lg text-[11px] font-bold text-[#2563eb] shadow-2xs transition-all cursor-pointer hover:bg-blue-50/50">
                                  <RefreshCw className="w-3.5 h-3.5 text-[#2563eb]" />
                                  Replace
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleStep5DocSelect(docDef.type as DocumentType, file);
                                    }}
                                    className="hidden"
                                  />
                                </label>

                                {/* Remove Button */}
                                <button
                                  type="button"
                                  onClick={() => handleStep5DocRemove(docDef.type as DocumentType)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 hover:border-rose-350 rounded-lg text-[11px] font-bold text-rose-600 shadow-2xs transition-all hover:bg-rose-50/50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  Remove
                                </button>
                              </>
                            ) : (
                              /* Upload Button (When Not Uploaded) */
                              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#002878] text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer hover:shadow-sm active:scale-98">
                                <Upload className="w-4 h-4" />
                                Upload Document
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleStep5DocSelect(docDef.type as DocumentType, file);
                                  }}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {allUploaded ? (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <p className="text-[11px] text-emerald-800 font-bold">
                        ✔ All required documents have been uploaded! You may proceed to review your registration.
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onNavigateToRequirements}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 hover:border-slate-300 bg-white text-slate-700 rounded-xl text-xs font-bold transition-all hover:bg-slate-50"
                    >
                      <FolderOpen className="w-4 h-4 text-[#2563eb]" />
                      Open Document Center
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  )}
                </div>
              );
            })()}

            {/* ── STEP 6 OF 6 (PART 1 OF 2): REVIEW REGISTRATION INFORMATION ── */}
            {subStep === 11 && (
              <div className="space-y-5">
                {/* Header & Subtitle */}
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
                    <Sparkles className="w-4.5 h-4.5 text-[#2563eb]" />
                    Review Registration Information (Part 1 of 2)
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Review learner, guardian, and address information before proceeding to final submission.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* 1. Student Information Card */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#2563eb]" />
                        Student Information
                      </h3>
                      <button
                        type="button"
                        onClick={() => setSubStep(1)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 text-[#2563eb]" /> Edit
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Learner Name</span>
                        <span className="font-bold text-slate-900">{studentInfo.firstName} {studentInfo.middleName ? `${studentInfo.middleName} ` : ''}{studentInfo.lastName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Grade Level</span>
                        <span className="font-bold text-slate-900">{studentInfo.gradeLevel}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Classification</span>
                        <span className="font-bold text-[#2563eb]">{studentInfo.classification}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">LRN Number</span>
                        <span className="font-bold text-slate-900">{studentInfo.lrn || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Birth Date</span>
                        <span className="font-bold text-slate-900">{studentInfo.birthDate || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Age & Sex</span>
                        <span className="font-bold text-slate-900">{computedAge !== null ? `${computedAge} yrs old` : '—'} • {studentInfo.gender}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Guardian & Emergency Contact Card */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#2563eb]" />
                          Guardian & Emergency Contact
                        </h3>
                        {parentStudentInfo.isPrimaryGuardian === 'Yes' ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Synced from Parent Account
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-50 text-[#2563eb] border border-blue-200 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-[#2563eb]" /> Manually Provided
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSubStep(8)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 text-[#2563eb]" /> Edit
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Guardian Name</span>
                        <span className="font-bold text-slate-900">
                          {parentStudentInfo.isPrimaryGuardian === 'Yes'
                            ? (uData ? `${uData.firstName} ${uData.lastName}` : (user?.displayName || '—'))
                            : (parentStudentInfo.primaryParentName || '—')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Relationship</span>
                        <span className="font-bold text-slate-900">
                          {parentStudentInfo.isPrimaryGuardian === 'Yes'
                            ? 'Parent / Account Holder'
                            : (parentStudentInfo.primaryRelationship || '—')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Mobile Number</span>
                        <span className="font-bold text-slate-900">
                          {parentStudentInfo.isPrimaryGuardian === 'Yes'
                            ? (uData?.contactNumber || uData?.phoneNumber || '—')
                            : (parentStudentInfo.primaryContact || '—')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Address Information Card (Single Formatted Address) */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#2563eb]" />
                        Address Information
                      </h3>
                      <button
                        type="button"
                        onClick={() => setSubStep(3)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 text-[#2563eb]" /> Edit
                      </button>
                    </div>

                    <div className="text-xs">
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mb-1">Primary Residence Address</span>
                      <p className="font-bold text-slate-900 text-sm">
                        {activeAddrDetails.streetAddress ? `${activeAddrDetails.streetAddress}, ` : ''}
                        {activeAddrDetails.barangay}, {activeAddrDetails.city}, {activeAddrDetails.province}
                        {activeAddrDetails.zipCode ? `, ${activeAddrDetails.zipCode}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 6 OF 6 (PART 2 OF 2): SUPPORTING INFORMATION & SUBMISSION ── */}
            {subStep === 12 && (
              <div className="space-y-5">
                {/* Header & Subtitle */}
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
                    <Sparkles className="w-4.5 h-4.5 text-[#2563eb]" />
                    Supporting Information & Submission (Part 2 of 2)
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Review medical info, supporting documents status, and confirm your registration submission.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* 1. Medical Information Card */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <HeartPulse className="w-3.5 h-3.5 text-[#2563eb]" />
                        Medical Information
                      </h3>
                      <button
                        type="button"
                        onClick={() => setSubStep(6)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#2563eb] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 text-[#2563eb]" /> Edit
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Height</span>
                        <span className="font-bold text-slate-900">{medicalInfo.height ? `${medicalInfo.height} cm` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Weight</span>
                        <span className="font-bold text-slate-900">{medicalInfo.weight ? `${medicalInfo.weight} kg` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">PWD Status</span>
                        <span className="font-bold text-slate-900">{medicalInfo.hasPwdId === 'Yes' ? `Yes (${medicalInfo.pwdIdNumber || 'ID Pending'})` : 'No'}</span>
                      </div>
                      {medicalInfo.bloodType && (
                        <div>
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Blood Type</span>
                          <span className="font-bold text-slate-900">{medicalInfo.bloodType}</span>
                        </div>
                      )}
                      {medicalInfo.allergies && (
                        <div className="sm:col-span-2">
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Allergies</span>
                          <span className="font-bold text-slate-900">{medicalInfo.allergies}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Supporting Documents Card */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-[#2563eb]" />
                        Supporting Documents
                      </h3>
                      <button
                        type="button"
                        onClick={onNavigateToRequirements}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-[#2563eb] hover:bg-blue-50/60 transition-all cursor-pointer shadow-2xs"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-[#2563eb]" /> Go to Document Center
                      </button>
                    </div>

                    <div className="space-y-2">
                      {requiredDocDefs.map(docDef => {
                        const localDoc = step5Uploads[docDef.type];
                        const docRecord = documents.find(d => d.documentType === docDef.type);
                        const status = docRecord?.status;

                        return (
                          <div key={docDef.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200/70 text-xs">
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                                <span>{docDef.title}</span>
                              </div>
                              {localDoc ? (
                                <p className="text-[10px] text-slate-500 font-medium pl-5">
                                  {localDoc.fileName}
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-400 font-medium pl-5">
                                  Missing documents may be uploaded later through the Document Center.
                                </p>
                              )}
                            </div>

                            <div className="shrink-0 pl-5 sm:pl-0">
                              {status === 'APPROVED' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 🟢 Verified
                                </span>
                              ) : status === 'PENDING' || localDoc ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600 animate-pulse" /> 🟡 Under Review
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertCircle className="w-3 h-3 text-rose-600" /> 🔴 Missing
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Submission Notice Card (Registration Reminder Card) */}
                  <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3.5 shadow-2xs">
                    <Info className="w-5 h-5 text-[#2563eb] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-[#2563eb] tracking-tight">Registration Reminder</h4>
                      <p className="text-xs text-blue-950 font-medium leading-relaxed">
                        You may submit your registration even if some supporting documents are still missing. Missing documents can be uploaded later through the Document Center. Your registration will remain pending until the school has reviewed all required documents.
                      </p>
                    </div>
                  </div>

                  {/* 5. Declaration / Confirmation Checkbox */}
                  <label className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3 cursor-pointer select-none hover:bg-slate-100/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={isConfirmed}
                      onChange={e => setIsConfirmed(e.target.checked)}
                      className="w-4 h-4 text-[#2563eb] accent-[#2563eb] rounded mt-0.5 cursor-pointer shrink-0"
                    />
                    <span className="text-xs font-extrabold text-slate-800 leading-snug">
                      I confirm that all information provided is true, complete, and accurate to the best of my knowledge.
                    </span>
                  </label>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>

    {/* ── FOOTER NAVIGATION CONTROLS ── */}
    <footer className="h-24 bg-white border-t border-slate-100 px-8 flex items-start pt-5 shrink-0">
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-4">
        {subStep > 1 ? (
          <button
            type="button"
            onClick={handleBackSubStep}
            disabled={isSubmitting}
            className="px-0 py-2 bg-transparent text-slate-400 hover:text-slate-655 font-extrabold uppercase tracking-widest text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 border-0 outline-none"
          >
            &lt; Previous
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="px-0 py-2 bg-transparent text-slate-200 font-extrabold uppercase tracking-widest text-xs flex items-center gap-1.5 border-0 outline-none cursor-not-allowed"
          >
            &lt; Previous
          </button>
        )}

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => {
              setSuccessMsg("Registration draft saved successfully!");
              setTimeout(() => setSuccessMsg(null), 3000);
            }}
            className="text-slate-500 hover:text-slate-700 font-extrabold uppercase tracking-widest text-xs cursor-pointer transition-colors border-0 bg-transparent outline-none"
          >
            Save as Draft
          </button>

          {subStep === 11 ? (
            <button
              type="button"
              onClick={() => {
                setDirection(1);
                setSubStep(12);
              }}
              className="px-6 py-3 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-md shadow-blue-500/10 transition-all text-xs flex items-center gap-1.5 cursor-pointer border-0 outline-none"
            >
              Continue &gt;
            </button>
          ) : subStep === 12 ? (
            <button
              type="button"
              onClick={handleSubmitRegistration}
              disabled={isSubmitting || !isConfirmed}
              className="px-6 py-3 bg-[#2563eb] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-extrabold shadow-md shadow-blue-500/10 transition-all text-xs flex items-center gap-1.5 cursor-pointer border-0 outline-none"
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
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNextSubStep}
              className="px-6 py-3 bg-[#2563eb] hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-md shadow-blue-500/10 transition-all text-xs flex items-center gap-1.5 cursor-pointer border-0 outline-none"
            >
              Next Step &gt;
            </button>
          )}
        </div>
      </div>
    </footer>
  </div>
  );
}
