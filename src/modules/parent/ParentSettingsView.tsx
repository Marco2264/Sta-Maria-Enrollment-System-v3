import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { db, auth } from '../../lib/firebase';
import { sendPasswordResetEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { Input } from '../../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  Edit3,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Key,
  Plus,
  Trash2,
  ImageIcon,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

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

export interface AddressItem {
  id: string;
  label: string;
  province: string;
  city: string;
  customProvince?: string;
  customCity?: string;
  barangay: string;
  streetAddress: string;
  zipCode: string;
  isPrimary?: boolean;
}

export function ParentSettingsView() {
  const { user, userData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Section Editing Flags
  const [editPersonal, setEditPersonal] = useState(false);
  const [editContact, setEditContact] = useState(false);
  const [editAddress, setEditAddress] = useState(false);

  // Loading & Feedback State
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Warning Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmLabel: 'Yes, Delete',
    onConfirm: () => {}
  });

  // Primary Address Transfer Modal State
  const [primaryModal, setPrimaryModal] = useState<{
    isOpen: boolean;
    targetIdx: number;
    targetLabel: string;
  }>({
    isOpen: false,
    targetIdx: 0,
    targetLabel: ''
  });

  const uData = userData as Record<string, any> | null;

  // Profile Photo State
  const [photoURL, setPhotoURL] = useState<string>('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoFileInfo, setPhotoFileInfo] = useState<{ name: string; size: string; type: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: 'None',
    relationship: 'Guardian',
    contactNumber: '',
    email: '',
    username: ''
  });

  // Multiple Addresses State (Up to 3)
  const [addresses, setAddresses] = useState<AddressItem[]>([
    {
      id: 'addr-1',
      label: 'Address 1',
      province: 'Zamboanga City',
      city: 'Zamboanga City',
      customProvince: '',
      customCity: '',
      barangay: '',
      streetAddress: '',
      zipCode: '',
      isPrimary: true
    }
  ]);
  const [activeAddressIdx, setActiveAddressIdx] = useState<number>(0);

  // Synchronize state with userData from AuthContext
  useEffect(() => {
    if (uData) {
      setPhotoURL(uData.photoURL || '');
      setUploadProgress(0);
      setIsUploadingPhoto(false);
      setFormData({
        firstName: uData.firstName || '',
        middleName: uData.middleName || '',
        lastName: uData.lastName || '',
        suffix: uData.suffix || 'None',
        relationship: uData.relationship || 'Guardian',
        contactNumber: uData.contactNumber || '',
        email: uData.email || user?.email || '',
        username: uData.username || ''
      });

      // Load Addresses from Firestore or default
      if (Array.isArray(uData.addresses) && uData.addresses.length > 0) {
        setAddresses(
          uData.addresses.map((a: any, i: number) => {
            const isKnownProv = Object.keys(PROVINCES_CITIES).includes(a.province);
            return {
              id: a.id || `addr-${i + 1}`,
              label: a.label || `Address ${i + 1}`,
              province: isKnownProv ? a.province : (a.province ? 'Others' : 'Zamboanga City'),
              city: isKnownProv ? (a.city || '') : 'Others',
              customProvince: !isKnownProv ? (a.province || '') : '',
              customCity: !isKnownProv ? (a.city || '') : '',
              barangay: a.barangay || '',
              streetAddress: a.streetAddress || '',
              zipCode: a.zipCode || '',
              isPrimary: a.isPrimary ?? (i === 0)
            };
          })
        );
      } else {
        const isKnownProv = Object.keys(PROVINCES_CITIES).includes(uData.province);
        setAddresses([
          {
            id: 'addr-1',
            label: 'Address 1',
            province: isKnownProv ? uData.province : (uData.province ? 'Others' : 'Zamboanga City'),
            city: isKnownProv ? (uData.city || '') : 'Others',
            customProvince: !isKnownProv ? (uData.province || '') : '',
            customCity: !isKnownProv ? (uData.city || '') : '',
            barangay: uData.barangay || '',
            streetAddress: uData.streetAddress || '',
            zipCode: uData.zipCode || '',
            isPrimary: true
          }
        ]);
      }
    }
  }, [uData, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === 'contactNumber') {
      const cleaned = value.replace(/\D/g, '').slice(0, 11);
      setFormData(prev => ({ ...prev, [id]: cleaned }));
      return;
    }
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Address Input Handlers
  const handleAddressChange = (field: keyof AddressItem, value: any) => {
    setAddresses(prev => {
      const next = [...prev];
      const current = { ...next[activeAddressIdx] };

      if (field === 'province') {
        if (value === 'Others') {
          current.province = 'Others';
          current.city = 'Others';
        } else {
          current.province = value;
          const available = PROVINCES_CITIES[value] || [];
          current.city = available[0] || '';
          current.customProvince = '';
          current.customCity = '';
        }
      } else if (field === 'isPrimary') {
        return next.map((a, i) => ({
          ...a,
          isPrimary: i === activeAddressIdx
        }));
      } else {
        (current as any)[field] = value;
      }

      next[activeAddressIdx] = current;
      return next;
    });
  };

  const handleAddAddress = () => {
    if (addresses.length >= 3) return;
    const newIdx = addresses.length + 1;
    const newAddr: AddressItem = {
      id: `addr-${Date.now()}`,
      label: `Address ${newIdx}`,
      province: 'Zamboanga City',
      city: 'Zamboanga City',
      customProvince: '',
      customCity: '',
      barangay: '',
      streetAddress: '',
      zipCode: '',
      isPrimary: false
    };
    setAddresses(prev => [...prev, newAddr]);
    setActiveAddressIdx(addresses.length);
  };

  const requestPrimaryTransfer = (targetIdx: number) => {
    if (addresses[targetIdx]?.isPrimary) return;
    const targetLabel = addresses[targetIdx]?.label || `Address ${targetIdx + 1}`;

    setPrimaryModal({
      isOpen: true,
      targetIdx,
      targetLabel
    });
  };

  const confirmPrimaryTransfer = async () => {
    const targetIdx = primaryModal.targetIdx;
    const targetLabel = primaryModal.targetLabel;

    const next = addresses.map((a, i) => ({
      ...a,
      isPrimary: i === targetIdx
    }));
    setAddresses(next);
    setPrimaryModal(prev => ({ ...prev, isOpen: false }));

    if (user) {
      try {
        const primaryAddr = next[targetIdx];
        const formatted = next.map(a => ({
          id: a.id,
          label: a.label,
          province: a.province === 'Others' ? a.customProvince?.trim() : a.province,
          city: a.province === 'Others' ? a.customCity?.trim() : a.city,
          barangay: a.barangay.trim(),
          streetAddress: a.streetAddress.trim(),
          zipCode: a.zipCode.trim(),
          isPrimary: a.isPrimary
        }));
        await updateDoc(doc(db, 'users', user.uid), {
          addresses: formatted,
          province: primaryAddr.province === 'Others' ? primaryAddr.customProvince?.trim() : primaryAddr.province,
          city: primaryAddr.province === 'Others' ? primaryAddr.customCity?.trim() : primaryAddr.city,
          barangay: primaryAddr.barangay.trim(),
          streetAddress: primaryAddr.streetAddress.trim(),
          zipCode: primaryAddr.zipCode.trim(),
          updatedAt: new Date().toISOString()
        });
        setSuccessMsg(`Primary address successfully updated to ${targetLabel}!`);
      } catch (err) {
        console.error('Error transferring primary address:', err);
        setErrorMsg('Failed to update primary address.');
      }
    }
  };

  const handleRemoveAddress = (idx: number) => {
    if (addresses.length <= 1) return;
    const targetLabel = addresses[idx]?.label || 'this address location';

    setDeleteModal({
      isOpen: true,
      title: `Delete ${targetLabel}?`,
      description: `Are you sure you want to delete ${targetLabel}? This address location will be permanently removed.`,
      confirmLabel: 'Yes, Delete',
      onConfirm: async () => {
        setDeleteModal(prev => ({ ...prev, isOpen: false }));
        const isRemovingPrimary = addresses[idx].isPrimary;
        const next = addresses.filter((_, i) => i !== idx);
        if (isRemovingPrimary && next.length > 0) {
          next[0].isPrimary = true;
        }
        setAddresses(next);
        setActiveAddressIdx(Math.max(0, idx - 1));

        if (!editAddress && user) {
          try {
            const primaryAddr = next.find(a => a.isPrimary) || next[0];
            const formatted = next.map(a => ({
              id: a.id,
              label: a.label,
              province: a.province === 'Others' ? a.customProvince?.trim() : a.province,
              city: a.province === 'Others' ? a.customCity?.trim() : a.city,
              barangay: a.barangay.trim(),
              streetAddress: a.streetAddress.trim(),
              zipCode: a.zipCode.trim(),
              isPrimary: a.isPrimary
            }));
            await updateDoc(doc(db, 'users', user.uid), {
              addresses: formatted,
              province: primaryAddr.province === 'Others' ? primaryAddr.customProvince?.trim() : primaryAddr.province,
              city: primaryAddr.province === 'Others' ? primaryAddr.customCity?.trim() : primaryAddr.city,
              barangay: primaryAddr.barangay.trim(),
              streetAddress: primaryAddr.streetAddress.trim(),
              zipCode: primaryAddr.zipCode.trim(),
              updatedAt: new Date().toISOString()
            });
            setSuccessMsg(`${targetLabel} deleted successfully!`);
          } catch (err) {
            console.error('Error deleting address:', err);
            setErrorMsg('Failed to delete address.');
          }
        }
      }
    });
  };

  // Profile Photo Upload Handler with Slow Progress Animation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Selected file exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    setPhotoFile(file);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const fileType = file.type.split('/')[1]?.toUpperCase() || 'JPEG';
    setPhotoFileInfo({
      name: file.name,
      size: `${sizeInMB} MB`,
      type: fileType
    });

    setIsUploadingPhoto(true);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const imageResult = event.target.result as string;
        let current = 0;
        const interval = setInterval(() => {
          current += Math.floor(Math.random() * 12) + 8;
          if (current >= 100) {
            current = 100;
            clearInterval(interval);
            setUploadProgress(100);
            setPhotoURL(imageResult);
            setTimeout(() => {
              setIsUploadingPhoto(false);
            }, 1200);
          } else {
            setUploadProgress(current);
          }
        }, 110);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCancelPhoto = () => {
    setPhotoFile(null);
    setPhotoFileInfo(null);
    setPhotoURL(uData?.photoURL || '');
    setUploadProgress(0);
    setIsUploadingPhoto(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ── SAVE HANDLERS FOR EACH SECTION ──

  const handleSavePersonal = async () => {
    if (!user) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMsg('First Name and Last Name are required.');
      return;
    }

    setSavingSection('personal');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim(),
        lastName: formData.lastName.trim(),
        suffix: formData.suffix,
        relationship: formData.relationship,
        photoURL: photoURL,
        updatedAt: new Date().toISOString()
      });
      setSuccessMsg('Personal Information updated successfully!');
      setEditPersonal(false);
      setPhotoFile(null);
      setPhotoFileInfo(null);
    } catch (err: any) {
      console.error('Error saving personal info:', err);
      setErrorMsg('Failed to save Personal Information.');
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveContact = async () => {
    if (!user) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    if (formData.contactNumber.length !== 11) {
      setErrorMsg('Mobile number must be exactly 11 digits.');
      return;
    }

    setSavingSection('contact');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        contactNumber: formData.contactNumber,
        updatedAt: new Date().toISOString()
      });
      setSuccessMsg('Contact Information updated successfully!');
      setEditContact(false);
    } catch (err: any) {
      console.error('Error saving contact info:', err);
      setErrorMsg('Failed to save Contact Information.');
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveAddress = async () => {
    if (!user) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    for (let i = 0; i < addresses.length; i++) {
      const a = addresses[i];
      const resProv = a.province === 'Others' ? a.customProvince?.trim() : a.province;
      const resCity = a.province === 'Others' ? a.customCity?.trim() : a.city;
      if (!resProv || !resCity) {
        setErrorMsg(`Please specify Province and City for ${a.label}.`);
        setActiveAddressIdx(i);
        return;
      }
      if (!a.barangay.trim() || !a.streetAddress.trim()) {
        setErrorMsg(`Barangay and Street Address are required for ${a.label}.`);
        setActiveAddressIdx(i);
        return;
      }
    }

    setSavingSection('address');
    try {
      const primaryAddr = addresses.find(a => a.isPrimary) || addresses[0];
      const resolvedPrimaryProv = primaryAddr.province === 'Others' ? primaryAddr.customProvince?.trim() : primaryAddr.province;
      const resolvedPrimaryCity = primaryAddr.province === 'Others' ? primaryAddr.customCity?.trim() : primaryAddr.city;

      const formattedAddresses = addresses.map((a) => ({
        id: a.id,
        label: a.label,
        province: a.province === 'Others' ? a.customProvince?.trim() : a.province,
        city: a.province === 'Others' ? a.customCity?.trim() : a.city,
        barangay: a.barangay.trim(),
        streetAddress: a.streetAddress.trim(),
        zipCode: a.zipCode.trim(),
        isPrimary: a.isPrimary
      }));

      await updateDoc(doc(db, 'users', user.uid), {
        province: resolvedPrimaryProv,
        city: resolvedPrimaryCity,
        barangay: primaryAddr.barangay.trim(),
        streetAddress: primaryAddr.streetAddress.trim(),
        zipCode: primaryAddr.zipCode.trim(),
        addresses: formattedAddresses,
        updatedAt: new Date().toISOString()
      });
      setSuccessMsg('Residence Address updated successfully!');
      setEditAddress(false);
    } catch (err: any) {
      console.error('Error saving address:', err);
      setErrorMsg('Failed to save Residence Address.');
    } finally {
      setSavingSection(null);
    }
  };

  const currentAddress = addresses[activeAddressIdx] || addresses[0];
  const displayProvince = currentAddress.province === 'Others' ? currentAddress.customProvince : currentAddress.province;
  const displayCity = currentAddress.province === 'Others' ? currentAddress.customCity : currentAddress.city;

  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false);

  // Change Password Form State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const isPasswordFormValid =
    currentPasswordInput.length > 0 &&
    newPasswordInput.length >= 8 &&
    confirmPasswordInput.length >= 8 &&
    newPasswordInput === confirmPasswordInput;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordFormValid) return;

    const currentUser = auth.currentUser;
    const userEmail = currentUser?.email || user?.email || formData.email || uData?.email;

    if (!currentUser || !userEmail) {
      setErrorMsg('No active user session or email found.');
      return;
    }

    setIsUpdatingPassword(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const credential = EmailAuthProvider.credential(userEmail, currentPasswordInput);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPasswordInput);

      setSuccessMsg('Password updated successfully.');
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err: any) {
      console.error('Password update error:', err);
      if (
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential' ||
        err?.message?.toLowerCase().includes('wrong-password') ||
        err?.message?.toLowerCase().includes('invalid-credential')
      ) {
        setErrorMsg('Current password is incorrect.');
      } else if (err?.code === 'auth/requires-recent-login') {
        setErrorMsg('For your security, please sign out and sign in again before updating your password.');
      } else {
        setErrorMsg(err?.message || 'Failed to update password. Please check your current password and try again.');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleChangePassword = async () => {
    const targetEmail = user?.email || formData.email || uData?.email;
    if (!targetEmail) {
      setErrorMsg('No registered email address associated with this account.');
      return;
    }

    setIsSendingPasswordReset(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setSuccessMsg(`Password Reset Email Sent: A secure password reset link has been sent to ${targetEmail}. Please check your inbox or spam folder.`);
    } catch (err: any) {
      console.error('Error sending password reset email:', err);
      setErrorMsg(err?.message || 'Failed to send password reset email. Please verify your internet connection or try again later.');
    } finally {
      setIsSendingPasswordReset(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 w-full font-sans bg-[#F4F7F9]">
      
      {/* ── NOTIFICATIONS ── */}
      {successMsg && (
        <div className="p-3.5 sm:p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 animate-in fade-in-50 duration-200 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 sm:p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-3 animate-in fade-in-50 duration-200 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* ── CARD 1: PERSONAL INFORMATION & PROFILE PHOTO UPLOAD ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        
        {/* Header with Section Edit Button */}
        <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex items-center justify-between gap-3 sm:gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Personal Information</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Your legal name and relationship to registered students.</p>
            </div>
          </div>

          <div className="shrink-0">
            {!editPersonal ? (
              <button
                type="button"
                onClick={() => setEditPersonal(true)}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-[#0C3B99] hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditPersonal(false);
                    handleCancelPhoto();
                  }}
                  disabled={savingSection === 'personal'}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePersonal}
                  disabled={savingSection === 'personal'}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-1.5 bg-[#0C3B99] hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  {savingSection === 'personal' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-6 md:p-8 flex flex-col lg:flex-row gap-6 sm:gap-8">
          
          {/* Left Column: Profile Photo Upload Sidebar */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="bg-slate-50/50 border border-slate-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col items-center text-center space-y-4">
              <p className="text-sm font-bold text-slate-900">Upload Profile Photo</p>
              <p className="text-[11px] text-slate-400 font-medium">Choose a photo that represents you.</p>
              
              {/* Upload Circle Avatar with Dynamic Progress Ring & Percentage Badge */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden shadow-inner relative z-0">
                  {photoURL ? (
                    <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-9 h-9 sm:w-10 sm:h-10 text-slate-300" />
                  )}
                </div>

                {isUploadingPhoto && (
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
                      className="stroke-[#0C3B99] transition-all duration-300 ease-out"
                      strokeWidth="4"
                      strokeDasharray={339.29}
                      strokeDashoffset={339.29 - (uploadProgress / 100) * 339.29}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                )}

                {isUploadingPhoto && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-white/95 border border-blue-200/80 shadow-xs rounded-full text-[10px] font-black text-[#0C3B99] z-20 backdrop-blur-xs tracking-wide animate-in fade-in-50">
                    {uploadProgress}%
                  </div>
                )}
              </div>

              {/* File Info Card */}
              <div className="w-full bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 text-blue-600">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left overflow-hidden flex-1">
                  <p className="text-[11px] font-bold text-slate-700 truncate">
                    {photoFileInfo ? photoFileInfo.name : (photoURL ? 'profile-photo.jpg' : 'Add Image')}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    {photoFileInfo ? `${photoFileInfo.size} • ${photoFileInfo.type}` : (photoURL ? 'Loaded Profile Photo' : 'No photo selected')}
                  </p>
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                onChange={handleFileSelect}
                className="hidden"
                disabled={!editPersonal}
              />

              {/* Action Buttons */}
              <div className="w-full grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!editPersonal}
                  onClick={() => {
                    if (!editPersonal) return;
                    if (photoFile) {
                      setSuccessMsg('Profile photo confirmed! Click "Save" to save your profile.');
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`px-3 sm:px-4 py-2 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[38px] ${
                    !editPersonal ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#0C3B99] hover:bg-blue-800'
                  }`}
                >
                  {photoFile ? 'Confirm' : 'Select Image'}
                </button>
                <button
                  type="button"
                  disabled={!editPersonal}
                  onClick={handleCancelPhoto}
                  className={`px-3 sm:px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all min-h-[38px] ${
                    !editPersonal ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'
                  }`}
                >
                  Cancel
                </button>
              </div>

              <p className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">
                JPG, PNG, WEBP UP TO 5MB
              </p>
            </div>
          </div>

          {/* Right Column: Personal Information Form Fields */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            
            {/* First Name */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">First Name *</label>
              {editPersonal ? (
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13"
                />
              ) : (
                <div className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm">
                  {formData.firstName || '—'}
                </div>
              )}
            </div>

            {/* Middle Name */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Middle Name</label>
              {editPersonal ? (
                <Input
                  id="middleName"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13"
                />
              ) : (
                <div className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-400 font-medium text-sm">
                  {formData.middleName || '—'}
                </div>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Last Name *</label>
              {editPersonal ? (
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13"
                />
              ) : (
                <div className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm">
                  {formData.lastName || '—'}
                </div>
              )}
            </div>

            {/* Suffix */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Suffix</label>
              {editPersonal ? (
                <Select value={formData.suffix} onValueChange={(v) => handleSelectChange('suffix', v)}>
                  <SelectTrigger className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13">
                    <SelectValue placeholder="Select suffix" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200">
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Jr.">Jr.</SelectItem>
                    <SelectItem value="Sr.">Sr.</SelectItem>
                    <SelectItem value="II">II</SelectItem>
                    <SelectItem value="III">III</SelectItem>
                    <SelectItem value="IV">IV</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm">
                  {formData.suffix !== 'None' ? formData.suffix : 'None'}
                </div>
              )}
            </div>

            {/* Relationship to Student */}
            <div className="space-y-1.5 sm:space-y-2 sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Relationship to Student *</label>
              {editPersonal ? (
                <Select value={formData.relationship} onValueChange={(v) => handleSelectChange('relationship', v)}>
                  <SelectTrigger className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200">
                    <SelectItem value="Father">Father</SelectItem>
                    <SelectItem value="Mother">Mother</SelectItem>
                    <SelectItem value="Guardian">Guardian</SelectItem>
                    <SelectItem value="Grandparent">Grandparent</SelectItem>
                    <SelectItem value="Relative">Relative</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm">
                  {formData.relationship}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 2: CONTACT INFORMATION ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex items-center justify-between gap-3 sm:gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Contact Information</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Used for official school communications and emergency notifications.</p>
            </div>
          </div>

          <div className="shrink-0">
            {!editContact ? (
              <button
                type="button"
                onClick={() => setEditContact(true)}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-[#0C3B99] hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setEditContact(false)}
                  disabled={savingSection === 'contact'}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveContact}
                  disabled={savingSection === 'contact'}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-1.5 bg-[#0C3B99] hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  {savingSection === 'contact' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Mobile Number *</label>
            {editContact ? (
              <Input
                id="contactNumber"
                value={formData.contactNumber}
                onChange={handleInputChange}
                maxLength={11}
                placeholder="09XXXXXXXXX"
                className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13"
              />
            ) : (
              <div className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                {formData.contactNumber || '—'}
              </div>
            )}
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Email Address (Login)</label>
            <div className="px-3.5 sm:px-4 py-3 bg-slate-100/70 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-600 font-medium text-sm flex items-center gap-2 truncate">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{formData.email || user?.email || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 3: RESIDENCE ADDRESS ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {/* Section Header + Address Navigation Bar + Edit Button */}
        <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Residence Address</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Manage up to 3 address locations.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            {/* Capsule Track Address Tabs (Mobile Scrollable) */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 max-w-full overflow-x-auto no-scrollbar">
              {addresses.map((addr, idx) => (
                <button
                  key={addr.id}
                  type="button"
                  onClick={() => setActiveAddressIdx(idx)}
                  className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeAddressIdx === idx
                      ? 'bg-[#0C3B99] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  {addr.label}
                </button>
              ))}

              {addresses.length < 3 && editAddress && (
                <button
                  type="button"
                  onClick={handleAddAddress}
                  className="px-2.5 sm:px-3 py-1.5 text-slate-400 hover:text-slate-700 text-xs font-bold flex items-center gap-1 transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New
                </button>
              )}
            </div>

            {/* Section Edit Button */}
            {!editAddress ? (
              <button
                type="button"
                onClick={() => setEditAddress(true)}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-[#0C3B99] hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => setEditAddress(false)}
                  disabled={savingSection === 'address'}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={savingSection === 'address'}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-1.5 bg-[#0C3B99] hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  {savingSection === 'address' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Address Fields Grid */}
        <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Province */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Province *</label>
              {editAddress ? (
                <Select
                  value={currentAddress.province}
                  onValueChange={(v) => handleAddressChange('province', v)}
                >
                  <SelectTrigger className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13">
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200">
                    {Object.keys(PROVINCES_CITIES).map((prov) => (
                      <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                    ))}
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm">
                  {displayProvince || '—'}
                </div>
              )}
            </div>

            {/* Custom Province if Others */}
            {currentAddress.province === 'Others' && editAddress ? (
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Specify Custom Province *</label>
                <Input
                  value={currentAddress.customProvince || ''}
                  onChange={(e) => handleAddressChange('customProvince', e.target.value)}
                  placeholder="Enter province"
                  className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13"
                />
              </div>
            ) : null}

            {/* City / Municipality */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">City / Municipality *</label>
              {editAddress ? (
                currentAddress.province === 'Others' ? (
                  <Input
                    value={currentAddress.customCity || ''}
                    onChange={(e) => handleAddressChange('customCity', e.target.value)}
                    placeholder="Enter city / municipality"
                    className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13"
                  />
                ) : (
                  <Select
                    value={currentAddress.city}
                    onValueChange={(v) => handleAddressChange('city', v)}
                  >
                    <SelectTrigger className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13">
                      <SelectValue placeholder="Select city / municipality" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 max-h-56 overflow-y-auto">
                      {(PROVINCES_CITIES[currentAddress.province] || []).map((ct) => (
                        <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              ) : (
                <div className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm">
                  {displayCity || '—'}
                </div>
              )}
            </div>

            {/* Barangay */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Barangay *</label>
              {editAddress ? (
                <Input
                  value={currentAddress.barangay}
                  onChange={(e) => handleAddressChange('barangay', e.target.value)}
                  className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13"
                />
              ) : (
                <div className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm">
                  {currentAddress.barangay || '—'}
                </div>
              )}
            </div>

            {/* ZIP Code */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">ZIP Code</label>
              {editAddress ? (
                <Input
                  value={currentAddress.zipCode}
                  onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                  className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13"
                />
              ) : (
                <div className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-400 font-medium text-sm">
                  {currentAddress.zipCode || '—'}
                </div>
              )}
            </div>

            {/* Street Address */}
            <div className="sm:col-span-2 space-y-1.5 sm:space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Street Address *</label>
              {editAddress ? (
                <Input
                  value={currentAddress.streetAddress}
                  onChange={(e) => handleAddressChange('streetAddress', e.target.value)}
                  className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13"
                />
              ) : (
                <div className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm">
                  {currentAddress.streetAddress || '—'}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => requestPrimaryTransfer(activeAddressIdx)}
              className="flex items-center gap-2.5 text-xs font-bold cursor-pointer select-none text-left"
            >
              <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all ${
                currentAddress.isPrimary
                  ? 'border-emerald-600 bg-emerald-600 shadow-xs'
                  : 'border-slate-300 bg-white hover:border-emerald-500'
              }`}>
                {currentAddress.isPrimary && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <span className={currentAddress.isPrimary ? 'text-emerald-700 font-extrabold' : 'text-slate-600 font-bold hover:text-emerald-700 transition-colors'}>
                {currentAddress.isPrimary ? 'Primary Residence Address' : 'Set as Primary Address'}
              </span>
            </button>

            {addresses.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveAddress(activeAddressIdx)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Address
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CARD 4: ACCOUNT CREDENTIALS ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex items-center justify-between gap-3 sm:gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Account Credentials</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Portal credentials, security role, and account status.</p>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              disabled={isSendingPasswordReset}
              onClick={handleChangePassword}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingPasswordReset ? (
                <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>Change Password</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 md:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Username</label>
            <div className="px-3.5 sm:px-4 py-3 bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm flex items-center gap-2 truncate">
              <Key className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{formData.username || uData?.username || uData?.email || '—'}</span>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">System Role</label>
            <div className="px-3.5 sm:px-4 py-3 bg-slate-100/70 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-700 font-bold text-sm uppercase tracking-wider">
              {uData?.role || 'Parent'}
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Member Since</label>
            <div className="px-3.5 sm:px-4 py-3 bg-slate-100/70 border border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-700 font-bold text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              {uData?.createdAt ? new Date(uData.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Active'}
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 5: CHANGE PASSWORD ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">Change Password</h2>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Update your account password using your current password.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* Current Password */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Current Password *</label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="Enter current password"
                  className="px-3.5 sm:px-4 py-3 pr-10 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13 focus:bg-white transition-all w-full"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">New Password (Min. 8 chars) *</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="At least 8 characters"
                  className="px-3.5 sm:px-4 py-3 pr-10 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13 focus:bg-white transition-all w-full"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block ml-0.5">Confirm New Password *</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Re-enter new password"
                  className="px-3.5 sm:px-4 py-3 pr-10 bg-slate-50/80 border-slate-200/80 rounded-xl sm:rounded-2xl text-slate-800 font-bold text-sm h-11 sm:h-13 focus:bg-white transition-all w-full"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Security Note & Update Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 font-medium leading-normal flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              For your security, you may be asked to sign in again after changing your password.
            </p>

            <button
              type="submit"
              disabled={!isPasswordFormValid || isUpdatingPassword}
              className="px-5 py-2.5 bg-[#0C3B99] hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              {isUpdatingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── WARNING CONFIRMATION MODAL ── */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">{deleteModal.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  {deleteModal.description}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteModal.onConfirm}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {deleteModal.confirmLabel || 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRIMARY ADDRESS TRANSFER MODAL ── */}
      {primaryModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
                <MapPin className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">Transfer Primary Address?</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  Your primary residence location will be updated to <strong className="text-slate-800 font-bold">{primaryModal.targetLabel}</strong>. Official school records and communications will default to this address.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPrimaryModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPrimaryTransfer}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
