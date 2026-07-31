import React, { useState } from 'react';
import { User, Lock, Phone, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { useAuth } from '../../lib/AuthContext';
import { useParentData } from '../../lib/parentData';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export function ParentProfileView() {
  const { user } = useAuth();
  const { children } = useParentData();
  const [contactInfo, setContactInfo] = useState({
    phone: user?.phoneNumber || '',
    address: '',
    emergencyContact: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'contact' | 'password'>('profile');

  const handleUpdateContactInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {

      // Update parent user document with contact info
      await updateDoc(doc(db, 'users', user.uid), {
        contactNumber: contactInfo.phone,
        address: contactInfo.address,
        emergencyContact: contactInfo.emergencyContact,
        updatedAt: new Date()
      });

      // Updates apply to all children automatically (they reference parent via parentId)
      setMessage({
        type: 'success',
        text: 'Contact information updated successfully!'
      });
    } catch (error) {
      console.error('Error updating contact info:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update contact information'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'New passwords do not match'
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 6 characters'
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Reauthenticate first
      if (!user.email) throw new Error('Email not found');

      const credential = EmailAuthProvider.credential(
        user.email,
        passwordForm.currentPassword
      );

      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, passwordForm.newPassword);

      setMessage({
        type: 'success',
        text: 'Password changed successfully!'
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      if ((error as any)?.code === 'auth/wrong-password') {
        setMessage({
          type: 'error',
          text: 'Current password is incorrect'
        });
      } else {
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Failed to change password'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F4F7F9]">
      <header className="px-6 py-6 lg:py-0 lg:h-28 border-b border-slate-100 bg-white flex items-center shrink-0">
        <div className="max-w-4xl mx-auto w-full space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          </div>
          <p className="text-sm text-slate-600 ml-11">
            Manage your account information and contact details
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              My Children
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'contact'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Contact Info
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'password'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Password
            </button>
          </div>

          {/* Messages */}
          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          {/* My Children Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {children.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-slate-600">No children enrolled yet</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {children.map((child) => (
                    <Card key={child.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {child.firstName} {child.lastName}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">
                            {child.gradeLevel}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                          <div>
                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                              LRN
                            </p>
                            <p className="text-sm font-medium text-slate-900 mt-1">
                              {child.lrn || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                              Status
                            </p>
                            <p className="mt-1">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                  child.status === 'Enrolled'
                                    ? 'bg-green-100 text-green-800'
                                    : child.status === 'Pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {child.status}
                              </span>
                            </p>
                          </div>
                        </div>

                        {child.classroomId && (
                          <div className="text-sm text-slate-600 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Classroom: {child.classroomId}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contact Info Tab */}
          {activeTab === 'contact' && (
            <Card className="p-6">
              <form onSubmit={handleUpdateContactInfo} className="space-y-4">
                <div>
                  <Label>Phone Number</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Phone className="w-5 h-5 text-slate-400" />
                    <Input
                      type="tel"
                      placeholder="Enter phone number"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Address</Label>
                  <div className="flex items-start gap-2 mt-2">
                    <MapPin className="w-5 h-5 text-slate-400 mt-2.5 shrink-0" />
                    <textarea
                      placeholder="Enter your address"
                      value={contactInfo.address}
                      onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                      className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      rows={3}
                    />
                  </div>
                </div>

                <div>
                  <Label>Emergency Contact Person</Label>
                  <Input
                    type="text"
                    placeholder="Enter emergency contact name and number"
                    value={contactInfo.emergencyContact}
                    onChange={(e) => setContactInfo({ ...contactInfo, emergencyContact: e.target.value })}
                    className="mt-2"
                  />
                  <p className="text-xs text-slate-500 mt-1">Format: Name - Phone Number</p>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white hover:bg-primary/90"
                >
                  {loading ? 'Updating...' : 'Update Contact Information'}
                </Button>

                <p className="text-xs text-slate-600 pt-4 border-t border-slate-200">
                  ℹ️ All information is automatically updated for your children's records in the school system.
                </p>
              </form>
            </Card>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <Card className="p-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <Label>Current Password</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Lock className="w-5 h-5 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Enter current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="flex-1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>New Password</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Lock className="w-5 h-5 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="flex-1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Confirm New Password</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Lock className="w-5 h-5 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="flex-1"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white hover:bg-primary/90"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </Button>

                <p className="text-xs text-slate-600 pt-4 border-t border-slate-200">
                  🔒 Password must be at least 6 characters long. Keep your password secure and do not share it with anyone.
                </p>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
