import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { logActivity } from '../../lib/services/activityLogService';
import { Input } from '../../components/ui/Input';
import { ImageUpload } from '../../components/ui/ImageUpload';
import {
  Edit2, Check, X, Loader2, Key
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
    language: 'English'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: ''
  });

  // Track which field is actively being edited
  const [editingField, setEditingField] = useState<string | null>(null);
  const [savingField, setSavingField] = useState<string | null>(null);

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
        language: 'English'
      });
    }
  }, [uData, user]);

  const clearFeedback = () => {
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const handleImageKitUploaded = async (url: string) => {
    setPhotoURL(url);
    if (user?.uid) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          photoURL: url,
          updatedAt: new Date().toISOString()
        });
        if (updateUserData) updateUserData({ photoURL: url });
        setSuccessMsg('Profile photo updated successfully!');
      } catch (err) {
        console.error('Failed to update photo URL in Firestore:', err);
        setErrorMsg('Failed to save photo to database.');
      }
    }
  };

  const handleSaveField = async (fieldKey: string, newValue: string) => {
    if (!user) return;
    clearFeedback();
    setSavingField(fieldKey);

    try {
      const dataToUpdate = {
        [fieldKey]: newValue,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'users', user.uid), dataToUpdate);
      if (updateUserData) updateUserData(dataToUpdate);
      
      await logActivity({
        parentId: user.uid,
        title: 'Profile Updated',
        subtitle: `Updated ${fieldKey}`,
        type: 'profile'
      });

      setSuccessMsg('Information saved successfully.');
      setEditingField(null);
    } catch (err: any) {
      console.error(`Error updating ${fieldKey}:`, err);
      setErrorMsg(`Failed to update information. Please try again.`);
    } finally {
      setSavingField(null);
    }
  };

  const handleSavePassword = async () => {
    if (!user || !user.email) return;
    clearFeedback();

    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setErrorMsg('Please enter both current and new password.');
      return;
    }
    
    setSavingField('password');
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
      setEditingField(null);
      setPasswordData({ currentPassword: '', newPassword: '' });
    } catch (err: any) {
      setErrorMsg('Failed to change password. Ensure your current password is correct.');
    } finally {
      setSavingField(null);
    }
  };

  const fullName = `${formData.firstName} ${formData.lastName}`.trim();

  const EditableField = ({ label, fieldKey, value, type = 'text', disabled = false, placeholder = '' }: any) => {
    const isEditing = editingField === fieldKey;
    const isSaving = savingField === fieldKey;
    const [localVal, setLocalVal] = useState(value);

    // Sync local value if parent value changes (e.g. from context load)
    useEffect(() => { setLocalVal(value); }, [value]);

    return (
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-800">{label}</label>
        <div className="flex gap-2 items-center">
          <Input 
            type={type}
            value={isEditing ? localVal : (type === 'password' && !isEditing ? '••••••••' : value)}
            onChange={(e) => setLocalVal(e.target.value)}
            disabled={!isEditing || disabled}
            placeholder={placeholder}
            className={`h-11 flex-1 transition-colors ${!isEditing ? 'bg-slate-50 border-slate-200/60 text-slate-600' : 'bg-white border-slate-300 shadow-sm'}`}
          />
          {!disabled && (
            isEditing ? (
              <div className="flex gap-1 shrink-0 animate-in zoom-in-95 duration-200">
                <button 
                  onClick={() => {
                    if (fieldKey === 'password') {
                      handleSavePassword();
                    } else {
                      handleSaveField(fieldKey, localVal);
                    }
                  }}
                  disabled={isSaving}
                  className="w-11 h-11 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => {
                    setEditingField(null);
                    setLocalVal(value);
                  }}
                  disabled={isSaving}
                  className="w-11 h-11 flex items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setEditingField(fieldKey)}
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-white font-sans text-slate-900 pb-20">
      
      {/* Top Page Header */}
      <div className="w-full px-1 sm:px-2 pt-10 pb-6">
        <h1 className="text-2xl font-semibold mb-1">Settings</h1>
        <p className="text-sm text-slate-500">Customize your profile, personal information, password, language, and theme settings.</p>
        
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

      {/* Main Container */}
      <div className="w-full px-1 sm:px-2">
        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
          
          {/* Profile Section */}
          <div className="p-6 sm:p-8 bg-white">
            <h2 className="text-[17px] font-semibold text-slate-900 mb-1">Profile</h2>
            <p className="text-[13px] text-slate-500 mb-6 max-w-3xl">View and manage your professional profile details, including your photo, legal name, and assigned role.</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className={`w-20 h-20 sm:w-24 sm:h-24 shrink-0 relative rounded-full overflow-hidden border-2 ${editingField === 'name' ? 'border-indigo-500/50 ring-4 ring-indigo-500/10' : 'border-slate-200'} bg-slate-50 transition-all duration-300`}>
                  {editingField === 'name' ? (
                    <ImageUpload
                      currentImageUrl={photoURL}
                      onImageUploaded={handleImageKitUploaded}
                      folder="profiles"
                      shape="circle"
                      size={96}
                    />
                  ) : (
                    <img 
                      src={photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || 'T P')}&background=random`} 
                      alt="Profile" 
                      className="w-full h-full object-cover" 
                    />
                  )}
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="text-2xl sm:text-3xl font-black italic text-slate-900 leading-tight tracking-tight">{fullName || 'Teacher Name'}</h3>
                  {formData.position && <p className="text-sm font-semibold text-slate-500 mt-0.5 uppercase tracking-wider">{formData.position}</p>}
                </div>
              </div>
              
              <button 
                onClick={() => setEditingField('name')}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
            
            {/* Inline Name Edit (Shows if editing 'name') */}
            {editingField === 'name' && (
              <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">First Name</label>
                  <Input 
                    value={formData.firstName} 
                    onChange={(e) => setFormData(prev => ({...prev, firstName: e.target.value}))} 
                    className="h-10 bg-white" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Last Name</label>
                  <Input 
                    value={formData.lastName} 
                    onChange={(e) => setFormData(prev => ({...prev, lastName: e.target.value}))} 
                    className="h-10 bg-white" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Position / Title</label>
                  <Input 
                    value={formData.position} 
                    onChange={(e) => setFormData(prev => ({...prev, position: e.target.value}))} 
                    className="h-10 bg-white" 
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
                  <button onClick={() => setEditingField(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
                  <button 
                    onClick={async () => {
                      setSavingField('name');
                      await handleSaveField('firstName', formData.firstName);
                      await handleSaveField('lastName', formData.lastName);
                      await handleSaveField('position', formData.position);
                      setSavingField(null);
                      setEditingField(null);
                    }} 
                    disabled={savingField === 'name'}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
                  >
                    {savingField === 'name' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Personal Information Section */}
          <div className="p-6 sm:p-8 bg-white">
            <h2 className="text-[17px] font-semibold text-slate-900 mb-1">Personal Information</h2>
            <p className="text-[13px] text-slate-500 mb-6 max-w-3xl">Manage your contact and identification details, including your employee ID, departmental assignment, and communication channels.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <EditableField 
                label="Employee ID (Username)" 
                fieldKey="employeeId" 
                value={formData.employeeId} 
              />
              <EditableField 
                label="Department" 
                fieldKey="department" 
                value={formData.department} 
              />
              <EditableField 
                label="Email" 
                fieldKey="email" 
                value={formData.email} 
                disabled={true} 
              />
              <EditableField 
                label="Phone Number" 
                fieldKey="contactNumber" 
                value={formData.contactNumber} 
              />
            </div>
          </div>

          {/* Account Section */}
          <div className="p-6 sm:p-8 bg-white">
            <h2 className="text-[17px] font-semibold text-slate-900 mb-1">Account</h2>
            <p className="text-[13px] text-slate-500 mb-6 max-w-3xl">Manage your account security and preferences, including your login credentials and system language.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              
              {/* Custom Password Field Handler */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-800">Password</label>
                {editingField === 'password' ? (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Input 
                      type="password"
                      placeholder="Current Password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({...prev, currentPassword: e.target.value}))}
                      className="h-10 bg-white"
                    />
                    <Input 
                      type="password"
                      placeholder="New Password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({...prev, newPassword: e.target.value}))}
                      className="h-10 bg-white"
                    />
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={() => setEditingField(null)} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-md">Cancel</button>
                      <button onClick={handleSavePassword} disabled={savingField === 'password'} className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1.5">
                        {savingField === 'password' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <Input 
                      type="password"
                      value="••••••••"
                      disabled
                      className="h-11 flex-1 bg-slate-50 border-slate-200/60 text-slate-600"
                    />
                    <button 
                      onClick={() => setEditingField('password')}
                      className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Language Field */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-800">Language</label>
                <div className="flex gap-2 items-center">
                  <div className="h-11 flex-1 bg-slate-50 border border-slate-200/60 rounded-xl px-4 flex items-center text-slate-600 text-sm">
                    🇺🇸 English
                  </div>
                  <button 
                    disabled
                    className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg bg-slate-100/50 text-slate-400 cursor-not-allowed"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
