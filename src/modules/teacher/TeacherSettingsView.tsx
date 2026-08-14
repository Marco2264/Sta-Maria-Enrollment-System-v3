import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { logActivity } from '../../lib/services/activityLogService';
import { uploadToImageKit, validateImageFile } from '../../lib/services/imageUploadService';
import { Input } from '../../components/ui/Input';
import {
  Loader2, Camera, Briefcase, Mail, User, MapPin, Shield, Lock, X, Upload
} from 'lucide-react';

export function TeacherSettingsView() {
  const { user, userData, updateUserData } = useAuth();

  const [photoURL, setPhotoURL] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const uData = userData as Record<string, any> | null;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    department: '',
    position: '',
    employeeId: '',
    contactNumber: '',
    email: '',
    dateOfBirth: '',
    country: '',
    city: '',
    postalCode: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [editingSection, setEditingSection] = useState<'personal' | 'address' | 'security' | null>(null);
  const [savingSection, setSavingSection] = useState<'personal' | 'address' | 'security' | null>(null);
  
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (uData) {
      setPhotoURL(uData.photoURL || '');
      setFormData({
        firstName: uData.firstName || '',
        lastName: uData.lastName || '',
        department: uData.department || '',
        position: uData.position || '',
        employeeId: uData.employeeId || '',
        contactNumber: uData.contactNumber || '',
        email: uData.email || user?.email || '',
        dateOfBirth: uData.dateOfBirth || '',
        country: uData.country || '',
        city: uData.city || '',
        postalCode: uData.postalCode || ''
      });
    }
  }, [uData, user]);

  const clearFeedback = () => {
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    clearFeedback();
    
    // Revert form data back to user data
    if (uData) {
      setFormData({
        firstName: uData.firstName || '',
        lastName: uData.lastName || '',
        department: uData.department || '',
        position: uData.position || '',
        employeeId: uData.employeeId || '',
        contactNumber: uData.contactNumber || '',
        email: uData.email || user?.email || '',
        dateOfBirth: uData.dateOfBirth || '',
        country: uData.country || '',
        city: uData.city || '',
        postalCode: uData.postalCode || ''
      });
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Invalid image file.');
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCancelPhoto = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || !user) return;
    
    setIsUploadingPhoto(true);
    setUploadProgress(10);
    clearFeedback();

    try {
      const url = await uploadToImageKit(selectedFile, {
        folder: '/profiles',
        fileName: `profile_${user.uid}_${Date.now()}`,
        onProgress: (p) => setUploadProgress(p)
      });
      
      setUploadProgress(100);
      
      await updateDoc(doc(db, 'users', user.uid), {
        photoURL: url,
        updatedAt: new Date().toISOString()
      });
      
      if (updateUserData) updateUserData({ photoURL: url });
      setPhotoURL(url);
      setSuccessMsg('Profile photo updated successfully!');
      
      handleCancelPhoto();
    } catch (err: any) {
      console.error('Failed to update photo:', err);
      setErrorMsg(err?.message || 'Failed to update photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveSection = async (section: 'personal' | 'address') => {
    if (!user) return;
    clearFeedback();
    setSavingSection(section);

    try {
      const dataToUpdate = section === 'personal' ? {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        contactNumber: formData.contactNumber,
        updatedAt: new Date().toISOString()
      } : {
        country: formData.country,
        city: formData.city,
        postalCode: formData.postalCode,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'users', user.uid), dataToUpdate);
      if (updateUserData) updateUserData(dataToUpdate);
      
      await logActivity({
        parentId: user.uid,
        title: 'Profile Updated',
        subtitle: `Updated ${section} information`,
        type: 'profile'
      });

      setSuccessMsg('Information saved successfully.');
      setEditingSection(null);
    } catch (err: any) {
      console.error(`Error updating ${section}:`, err);
      setErrorMsg(`Failed to update information. Please try again.`);
    } finally {
      setSavingSection(null);
    }
  };

  const handleSavePassword = async () => {
    if (!user || !user.email) return;
    clearFeedback();

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setErrorMsg('Please fill in all password fields.');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }
    
    setSavingSection('security');
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.newPassword);
      
      await logActivity({
        parentId: user.uid,
        title: 'Password Changed',
        subtitle: 'Successfully updated account password.',
        type: 'profile'
      });

      setSuccessMsg('Password updated successfully!');
      setEditingSection(null);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setErrorMsg('Failed to change password. Ensure your current password is correct.');
    } finally {
      setSavingSection(null);
    }
  };

  const fullName = `${formData.firstName} ${formData.lastName}`.trim();
  const defaultPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'Teacher')}&background=random`;

  return (
    <div className="h-full overflow-y-auto bg-[#f8f9fa] font-sans p-6 sm:p-10 pb-20">
      <div className="w-full">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Settings</h1>
          <p className="text-sm text-slate-500">Manage your experience and security credentials.</p>
          
          {/* Global Feedback */}
          {successMsg && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-between">
              <p className="text-[13px] font-medium text-emerald-800">{successMsg}</p>
              <button onClick={clearFeedback} className="p-1 text-emerald-500 hover:bg-emerald-100 rounded-full"><X className="w-4 h-4" /></button>
            </div>
          )}
          {errorMsg && (
            <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-between">
              <p className="text-[13px] font-medium text-rose-800">{errorMsg}</p>
              <button onClick={clearFeedback} className="p-1 text-rose-500 hover:bg-rose-100 rounded-full"><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm flex flex-col sm:flex-row sm:items-center gap-8 mb-6 border border-slate-100">
          <div className="relative w-32 h-32 rounded-[2rem] overflow-hidden bg-slate-50 flex-shrink-0 border border-slate-100">
             <img 
               src={previewUrl || photoURL || defaultPhoto} 
               alt="Profile" 
               className={`w-full h-full object-cover transition-opacity duration-300 ${isUploadingPhoto ? 'opacity-50 blur-sm' : ''}`}
             />
             
             {isUploadingPhoto && (
               <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-10" viewBox="0 0 128 128">
                 <circle cx="64" cy="64" r="54" className="stroke-red-100/50" strokeWidth="6" fill="none" />
                 <circle 
                   cx="64" 
                   cy="64" 
                   r="54" 
                   className="stroke-[#D32F2F] transition-all duration-300 ease-out" 
                   strokeWidth="6" 
                   strokeDasharray={339.29} 
                   strokeDashoffset={339.29 - (uploadProgress / 100) * 339.29} 
                   strokeLinecap="round" 
                   fill="none" 
                 />
               </svg>
             )}
             
             {isUploadingPhoto && (
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="px-2 py-0.5 bg-white/95 border border-red-200 shadow-xs rounded-full text-[10px] font-black text-[#D32F2F] z-20 backdrop-blur-xs tracking-wider">
                   {uploadProgress}%
                 </div>
               </div>
             )}
             
             <input 
               type="file" 
               ref={fileInputRef} 
               className="hidden" 
               accept=".jpg,.jpeg,.png,.webp"
               onChange={handlePhotoSelect} 
             />
          </div>
          
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{fullName || 'Teacher Name'}</h2>
            <div className="flex flex-wrap gap-4 text-sm font-medium">
              <span className="flex items-center gap-1.5 text-red-500/90">
                <Briefcase className="w-4 h-4" /> {formData.position || 'Teacher'}
              </span>
              <span className="flex items-center gap-1.5 text-red-500/90">
                <Mail className="w-4 h-4" /> {formData.email || 'tester@cics.com'}
              </span>
            </div>
            
            {/* Upload Buttons */}
            {selectedFile ? (
              <div className="flex items-center gap-2 mt-2">
                <button 
                  onClick={handleConfirmUpload} 
                  disabled={isUploadingPhoto} 
                  className="bg-[#D32F2F] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 hover:bg-[#b71c1c]"
                >
                   {isUploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 
                   Upload
                </button>
                <button 
                  onClick={handleCancelPhoto} 
                  disabled={isUploadingPhoto} 
                  className="bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 hover:bg-slate-200"
                >
                   Cancel
                </button>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 bg-[#0f172a] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 w-max hover:bg-slate-800 transition-colors"
              >
                <Camera className="w-4 h-4" /> Change Profile Picture
              </button>
            )}
          </div>
        </div>

        {/* Personal Information Card */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm mb-6 border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">Personal Information</h3>
              <p className="text-sm text-slate-500">Details reflecting your professional identity</p>
            </div>
            {editingSection === 'personal' ? (
              <div className="flex gap-2">
                <button 
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleSaveSection('personal')}
                  disabled={savingSection === 'personal'}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#D32F2F] text-white hover:bg-[#b71c1c] transition-colors flex items-center gap-2"
                >
                  {savingSection === 'personal' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setEditingSection('personal')}
                className="border border-red-100 bg-red-50/50 text-[#D32F2F] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-50 transition-colors"
              >
                <User className="w-3.5 h-3.5" /> Edit Details
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">First Name</p>
              {editingSection === 'personal' ? (
                <Input value={formData.firstName} onChange={(e) => setFormData(p => ({...p, firstName: e.target.value}))} className="h-9 text-sm" />
              ) : (
                <p className="text-sm font-bold text-slate-700">{formData.firstName || '—'}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Last Name</p>
              {editingSection === 'personal' ? (
                <Input value={formData.lastName} onChange={(e) => setFormData(p => ({...p, lastName: e.target.value}))} className="h-9 text-sm" />
              ) : (
                <p className="text-sm font-bold text-slate-700">{formData.lastName || '—'}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date of Birth</p>
              {editingSection === 'personal' ? (
                <Input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData(p => ({...p, dateOfBirth: e.target.value}))} className="h-9 text-sm" />
              ) : (
                formData.dateOfBirth ? (
                  <p className="text-sm font-bold text-slate-700">{formData.dateOfBirth}</p>
                ) : (
                  <p className="text-sm font-semibold text-slate-400 italic">Not set</p>
                )
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email Address</p>
              <p className="text-sm font-bold text-slate-700">{formData.email || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone Number</p>
              {editingSection === 'personal' ? (
                <Input value={formData.contactNumber} onChange={(e) => setFormData(p => ({...p, contactNumber: e.target.value}))} className="h-9 text-sm" />
              ) : (
                <p className="text-sm font-bold text-slate-700">{formData.contactNumber || '—'}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Role</p>
              <p className="text-sm font-bold text-slate-700">{formData.position || 'Teacher'}</p>
            </div>
          </div>
        </div>

        {/* Residential Address Card */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm mb-6 border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-1">Residential Address</h3>
              <p className="text-sm text-slate-500">Verified location for official correspondence</p>
            </div>
            {editingSection === 'address' ? (
              <div className="flex gap-2">
                <button 
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleSaveSection('address')}
                  disabled={savingSection === 'address'}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-900 transition-colors flex items-center gap-2"
                >
                  {savingSection === 'address' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setEditingSection('address')}
                className="border border-slate-200 bg-white text-slate-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" /> Update Address
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Country</p>
              {editingSection === 'address' ? (
                <Input value={formData.country} onChange={(e) => setFormData(p => ({...p, country: e.target.value}))} className="h-9 text-sm" />
              ) : (
                <p className="text-sm font-bold text-slate-700">{formData.country || '—'}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">City</p>
              {editingSection === 'address' ? (
                <Input value={formData.city} onChange={(e) => setFormData(p => ({...p, city: e.target.value}))} className="h-9 text-sm" />
              ) : (
                <p className="text-sm font-bold text-slate-700">{formData.city || '—'}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Postal Code</p>
              {editingSection === 'address' ? (
                <Input value={formData.postalCode} onChange={(e) => setFormData(p => ({...p, postalCode: e.target.value}))} className="h-9 text-sm" />
              ) : (
                <p className="text-sm font-bold text-slate-700">{formData.postalCode || '—'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Account Security Card */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm mb-6 border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-[#D32F2F] shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-1">Account Security</h3>
                <p className="text-sm text-slate-500">Control access and secure your credentials.</p>
              </div>
            </div>
            {editingSection !== 'security' && (
              <button 
                onClick={() => setEditingSection('security')}
                className="border border-red-100 bg-red-50/50 text-[#D32F2F] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-red-50 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" /> Change Password
              </button>
            )}
          </div>

          {editingSection !== 'security' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Last Password Change</p>
                <p className="text-sm font-bold text-slate-700">2 months ago</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">2FA Status</p>
                <p className="text-sm font-semibold text-slate-400 italic">Not configured</p>
              </div>
            </div>
          )}

          {/* Password Edit Section Matching the new Mockup */}
          {editingSection === 'security' && (
            <div className="mt-8 pt-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Current Password</label>
                  <Input 
                    type="password" 
                    placeholder="********" 
                    value={passwordData.currentPassword} 
                    onChange={(e) => setPasswordData(p => ({...p, currentPassword: e.target.value}))} 
                    className="h-11 bg-slate-50/50 border-slate-100/60 text-sm font-medium rounded-[1rem] shadow-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">New Password</label>
                  <Input 
                    type="password" 
                    placeholder="Min. 8 characters" 
                    value={passwordData.newPassword} 
                    onChange={(e) => setPasswordData(p => ({...p, newPassword: e.target.value}))} 
                    className="h-11 bg-slate-50/50 border-slate-100/60 text-sm font-medium rounded-[1rem] shadow-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Confirm Password</label>
                  <Input 
                    type="password" 
                    placeholder="Confirm your choice" 
                    value={passwordData.confirmPassword} 
                    onChange={(e) => setPasswordData(p => ({...p, confirmPassword: e.target.value}))} 
                    className="h-11 bg-slate-50/50 border-slate-100/60 text-sm font-medium rounded-[1rem] shadow-none focus:bg-white"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-6 mt-6">
                <button 
                  onClick={handleSavePassword}
                  disabled={savingSection === 'security'}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#D32F2F] hover:bg-[#b71c1c] text-white transition-colors flex items-center gap-2 shadow-sm disabled:opacity-70"
                >
                  {savingSection === 'security' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save New Password
                </button>
                <button 
                  onClick={handleCancelEdit}
                  className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
