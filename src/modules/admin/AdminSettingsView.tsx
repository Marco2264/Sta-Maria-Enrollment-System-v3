import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { GlobalSettings, getGlobalSettings, updateGlobalSettings } from '../../lib/services/settingsService';
import { Input } from '../../components/ui/Input';
import { Loader2, Save, Calendar, Shield, Eye, EyeOff, Building, Info, Lock, Edit2, X } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { logActivity } from '../../lib/services/activityLogService';

type Tab = 'academic' | 'identity' | 'security';

export function AdminSettingsView() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('academic');
  
  const [isEditingAcademic, setIsEditingAcademic] = useState(false);
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getGlobalSettings();
      setSettings(data);
    } catch (err) {
      console.error("Failed to load settings", err);
      setErrorMsg("Failed to load global settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (field: keyof GlobalSettings, value: any) => {
    if (settings) {
      setSettings({ ...settings, [field]: value });
    }
  };

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg('');
    } else {
      setSuccessMsg(msg);
      setErrorMsg('');
    }
    setTimeout(() => {
      setSuccessMsg('');
      setErrorMsg('');
    }, 4000);
  };

  const handleSaveAcademic = async () => {
    if (!settings) return;
    try {
      setSavingAcademic(true);
      await updateGlobalSettings(settings);
      setIsEditingAcademic(false);
      showFeedback('Academic settings updated successfully!');
      
      if (user) {
        await logActivity({
          parentId: user.uid,
          title: 'Academic Settings Updated',
          subtitle: 'Admin updated academic configuration',
          type: 'profile'
        });
      }
    } catch (err) {
      console.error("Failed to save settings", err);
      showFeedback('Failed to save academic settings.', true);
    } finally {
      setSavingAcademic(false);
    }
  };

  const handleSaveIdentity = async () => {
    if (!settings) return;
    try {
      setSavingIdentity(true);
      await updateGlobalSettings(settings);
      setIsEditingIdentity(false);
      showFeedback('School Identity updated successfully!');
      
      if (user) {
        await logActivity({
          parentId: user.uid,
          title: 'School Identity Updated',
          subtitle: 'Admin updated school information',
          type: 'profile'
        });
      }
    } catch (err) {
      console.error("Failed to save settings", err);
      showFeedback('Failed to save school identity.', true);
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleSavePassword = async () => {
    if (!user || !user.email) return;

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showFeedback('Please fill in all password fields.', true);
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showFeedback('New password and confirm password do not match.', true);
      return;
    }
    
    setSavingSecurity(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordData.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordData.newPassword);
      
      await logActivity({
        parentId: user.uid,
        title: 'Admin Password Changed',
        subtitle: 'Successfully updated admin account password.',
        type: 'profile'
      });

      showFeedback('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      console.error(err);
      showFeedback('Failed to change password. Ensure your current password is correct.', true);
    } finally {
      setSavingSecurity(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="h-full overflow-y-auto bg-[#fafbfc] font-sans p-6 sm:p-10 pb-20">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1a202c] tracking-tight mb-1">System Settings</h1>
          <p className="text-sm text-slate-500">Manage global school configurations and security protocols.</p>
        </div>

        {/* Global Feedback */}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between animate-in fade-in">
            <p className="text-sm font-medium text-emerald-800">{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-between animate-in fade-in">
            <p className="text-sm font-medium text-rose-800">{errorMsg}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-8 border-b border-slate-200 mb-8">
          <button
            onClick={() => setActiveTab('academic')}
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative ${
              activeTab === 'academic' ? 'text-[#D32F2F]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Academic Configuration
            {activeTab === 'academic' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#D32F2F] rounded-t-sm" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('identity')}
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative ${
              activeTab === 'identity' ? 'text-[#D32F2F]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            School Identity
            {activeTab === 'identity' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#D32F2F] rounded-t-sm" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 text-xs font-bold uppercase tracking-widest transition-colors relative ${
              activeTab === 'security' ? 'text-[#D32F2F]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Security Settings
            {activeTab === 'security' && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#D32F2F] rounded-t-sm" />
            )}
          </button>
        </div>

        {/* Tab Content: Academic Configuration */}
        {activeTab === 'academic' && (
          <div className="bg-white rounded-[1.5rem] p-8 shadow-sm border border-slate-100 animate-in fade-in duration-300">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#D32F2F] flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="mt-1">
                  <h2 className="text-lg font-bold text-slate-800">Academic Year & Terms</h2>
                  <p className="text-sm text-slate-500">Define active school years and grading cycle dates.</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingAcademic(!isEditingAcademic)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
                  isEditingAcademic 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isEditingAcademic ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                {isEditingAcademic ? 'Cancel Edit' : 'Edit Mode'}
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Active School Year</label>
                  <Input 
                    disabled={!isEditingAcademic}
                    value={settings.activeSchoolYear} 
                    onChange={(e) => handleSettingsChange('activeSchoolYear', e.target.value)} 
                    placeholder="2023-2024"
                    className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Enrollment Status</label>
                  <div className="flex items-center justify-between h-11 px-4 bg-slate-50/50 border border-slate-100 rounded-xl">
                    <span className={`text-sm font-bold ${settings.enrollmentOpen ? 'text-emerald-500' : 'text-slate-500'}`}>
                      {settings.enrollmentOpen ? 'Open for Enrollment' : 'Enrollment Closed'}
                    </span>
                    <label className={`relative inline-flex items-center ${isEditingAcademic ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                      <input 
                        type="checkbox" 
                        disabled={!isEditingAcademic}
                        className="sr-only peer" 
                        checked={settings.enrollmentOpen}
                        onChange={(e) => handleSettingsChange('enrollmentOpen', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">School Year Start</label>
                  <Input 
                    type="date"
                    disabled={!isEditingAcademic}
                    value={settings.schoolYearStart} 
                    onChange={(e) => handleSettingsChange('schoolYearStart', e.target.value)} 
                    className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white text-slate-600 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">School Year End</label>
                  <Input 
                    type="date"
                    disabled={!isEditingAcademic}
                    value={settings.schoolYearEnd} 
                    onChange={(e) => handleSettingsChange('schoolYearEnd', e.target.value)} 
                    className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white text-slate-600 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="pt-8">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6">Grading Periods (Terms)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">1st Term Start</label>
                    <Input disabled={!isEditingAcademic} type="date" value={settings.firstTermStart} onChange={(e) => handleSettingsChange('firstTermStart', e.target.value)} className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white text-slate-600 disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">1st Term End</label>
                    <Input disabled={!isEditingAcademic} type="date" value={settings.firstTermEnd} onChange={(e) => handleSettingsChange('firstTermEnd', e.target.value)} className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white text-slate-600 disabled:opacity-60" />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">2nd Term Start</label>
                    <Input disabled={!isEditingAcademic} type="date" value={settings.secondTermStart} onChange={(e) => handleSettingsChange('secondTermStart', e.target.value)} className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white text-slate-600 disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">2nd Term End</label>
                    <Input disabled={!isEditingAcademic} type="date" value={settings.secondTermEnd} onChange={(e) => handleSettingsChange('secondTermEnd', e.target.value)} className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white text-slate-600 disabled:opacity-60" />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">3rd Term Start</label>
                    <Input disabled={!isEditingAcademic} type="date" value={settings.thirdTermStart} onChange={(e) => handleSettingsChange('thirdTermStart', e.target.value)} className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white text-slate-600 disabled:opacity-60" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">3rd Term End</label>
                    <Input disabled={!isEditingAcademic} type="date" value={settings.thirdTermEnd} onChange={(e) => handleSettingsChange('thirdTermEnd', e.target.value)} className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white text-slate-600 disabled:opacity-60" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-8">
                <button 
                  onClick={handleSaveAcademic}
                  disabled={!isEditingAcademic || savingAcademic}
                  className="bg-[#D32F2F] hover:bg-[#b71c1c] text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {savingAcademic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Academic Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: School Identity */}
        {activeTab === 'identity' && (
          <div className="bg-white rounded-[1.5rem] p-8 shadow-sm border border-slate-100 animate-in fade-in duration-300">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#D32F2F] flex items-center justify-center shrink-0">
                  <Building className="w-6 h-6" />
                </div>
                <div className="mt-1">
                  <h2 className="text-lg font-bold text-slate-800">School Information</h2>
                  <p className="text-sm text-slate-500">Official details used in DepEd forms and reporting.</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingIdentity(!isEditingIdentity)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
                  isEditingIdentity 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isEditingIdentity ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                {isEditingIdentity ? 'Cancel Edit' : 'Edit Mode'}
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">School Name</label>
                <Input 
                  disabled={!isEditingIdentity}
                  value={settings.schoolName} 
                  onChange={(e) => handleSettingsChange('schoolName', e.target.value)} 
                  className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">School Address</label>
                <Input 
                  disabled={!isEditingIdentity}
                  value={settings.schoolAddress} 
                  onChange={(e) => handleSettingsChange('schoolAddress', e.target.value)} 
                  className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white disabled:opacity-60"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">School ID</label>
                  <Input 
                    disabled={!isEditingIdentity}
                    value={settings.schoolId} 
                    onChange={(e) => handleSettingsChange('schoolId', e.target.value)} 
                    className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Region</label>
                  <Input 
                    disabled={!isEditingIdentity}
                    value={settings.region} 
                    onChange={(e) => handleSettingsChange('region', e.target.value)} 
                    className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Division</label>
                  <Input 
                    disabled={!isEditingIdentity}
                    value={settings.division} 
                    onChange={(e) => handleSettingsChange('division', e.target.value)} 
                    className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">District</label>
                  <Input 
                    disabled={!isEditingIdentity}
                    value={settings.district} 
                    onChange={(e) => handleSettingsChange('district', e.target.value)} 
                    className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">School Head / Principal Name</label>
                  <Input 
                    disabled={!isEditingIdentity}
                    value={settings.principalName} 
                    onChange={(e) => handleSettingsChange('principalName', e.target.value)} 
                    className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Contact Number</label>
                  <Input 
                    disabled={!isEditingIdentity}
                    value={settings.contactNumber} 
                    onChange={(e) => handleSettingsChange('contactNumber', e.target.value)} 
                    className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-8">
                <button 
                  onClick={handleSaveIdentity}
                  disabled={!isEditingIdentity || savingIdentity}
                  className="bg-[#D32F2F] hover:bg-[#b71c1c] text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {savingIdentity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Update School Information
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Security Settings */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-[1.5rem] p-8 shadow-sm border border-slate-100">
              <div className="flex items-start gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#D32F2F] flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="mt-1">
                  <h2 className="text-lg font-bold text-slate-800">Security Protocol</h2>
                  <p className="text-sm text-slate-500">Update your administrative access credentials.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Verification of Identity</label>
                  <div className="relative">
                    <Input 
                      type={showPasswords.current ? "text" : "password"} 
                      placeholder="********" 
                      value={passwordData.currentPassword} 
                      onChange={(e) => setPasswordData(p => ({...p, currentPassword: e.target.value}))} 
                      className="bg-slate-50/50 border-slate-100 h-11 text-sm font-bold tracking-widest rounded-xl shadow-none focus:bg-white pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({...p, current: !p.current}))}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 font-medium">Enter your existing password to authorize changes.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">New Password</label>
                    <div className="relative">
                      <Input 
                        type={showPasswords.new ? "text" : "password"} 
                        placeholder="Minimum 8 chars" 
                        value={passwordData.newPassword} 
                        onChange={(e) => setPasswordData(p => ({...p, newPassword: e.target.value}))} 
                        className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(p => ({...p, new: !p.new}))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Confirm New Access</label>
                    <div className="relative">
                      <Input 
                        type={showPasswords.confirm ? "text" : "password"} 
                        placeholder="Repeat new choice" 
                        value={passwordData.confirmPassword} 
                        onChange={(e) => setPasswordData(p => ({...p, confirmPassword: e.target.value}))} 
                        className="bg-slate-50/50 border-slate-100 h-11 text-sm font-medium rounded-xl shadow-none focus:bg-white pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(p => ({...p, confirm: !p.confirm}))}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    onClick={handleSavePassword}
                    disabled={savingSecurity}
                    className="w-full bg-[#D32F2F] hover:bg-[#b71c1c] text-white px-6 py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
                  >
                    {savingSecurity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    Authorize & Update Password
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-100 flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Security Recommendation</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  For optimal protection, your password should be unique and contain a combination of uppercase letters, numeric values, and special symbols (@, #, $, etc.).
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
