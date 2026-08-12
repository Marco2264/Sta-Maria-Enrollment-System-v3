import React, { useState, useEffect } from 'react';
import { cn } from '../../components/ui/utils';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/Table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '../../components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/Select';

import {
  EyeOff,
  Search,
  Filter,
  Edit,
  Eye,
  Plus,
  Trash2,
  Users,
  GraduationCap,
  Heart,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { useAdminData, User } from '../../lib/adminData';
import { db } from '../../lib/firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { firebaseConfig } from '../../lib/firebase';

// Secondary app for admin to create users without being logged out
const secondaryApp = getApps().find(app => app.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
const secondaryAuth = getAuth(secondaryApp);

// Deterministic pastel color palette for user avatars
const getAvatarStyle = (str: string) => {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const styles = [
    'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    'bg-sky-50 text-sky-700 border-sky-200/80',
    'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    'bg-amber-50 text-amber-700 border-amber-200/80',
    'bg-rose-50 text-rose-700 border-rose-200/80',
    'bg-violet-50 text-violet-700 border-violet-200/80',
  ];
  return styles[Math.abs(hash) % styles.length];
};

// Simplified flat role badge styling with subtle red tint
const getRoleBadgeStyle = () => 'bg-red-50 text-[#D8232A] font-medium';

export function UsersView() {
  const { users, addUser, updateUser, deleteUser, loading, sections, classrooms, assignments } = useAdminData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const getDateString = (ts: unknown) => {
    if (!ts) return 'N/A';
    if (typeof ts === 'object' && 'toDate' in ts && typeof (ts as { toDate?: () => Date }).toDate === 'function') {
      return (ts as { toDate: () => Date }).toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return new Date(ts as string | number | Date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const [newUser, setNewUser] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    role: 'Teacher' as 'Teacher' | 'Parent' | 'Subadmin',
    assignedGrade: 'Grade 1',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    email: '',
    contactNumber: '',
    password: '',
    confirmPassword: '',
    status: 'Active' as 'Active' | 'Pending'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.password !== newUser.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordError(null);
    setIsSaving(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        newUser.email,
        newUser.password
      );
      const user = userCredential.user;

      const userProfile = {
        firstName: newUser.firstName,
        middleName: newUser.middleName,
        lastName: newUser.lastName,
        suffix: newUser.suffix,
        gender: newUser.gender,
        role: newUser.role.toLowerCase(),
        assignedGrade: newUser.role === 'Subadmin' ? newUser.assignedGrade : null,
        email: newUser.email,
        contactNumber: newUser.contactNumber,
        status: newUser.status,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);

      addUser({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        gender: newUser.gender,
        email: newUser.email,
        contactNumber: newUser.contactNumber,
        role: newUser.role,
        assignedGrade: newUser.role === 'Subadmin' ? newUser.assignedGrade : undefined,
        status: newUser.status,
        id: user.uid,
        createdAt: userProfile.createdAt
      });

      setIsAddOpen(false);
      setNewUser({
        firstName: '',
        middleName: '',
        lastName: '',
        suffix: '',
        role: 'Teacher',
        assignedGrade: 'Grade 1',
        gender: 'Male',
        email: '',
        contactNumber: '',
        password: '',
        confirmPassword: '',
        status: 'Active'
      });
    } catch (err) {
      console.error(err);
      const error = err as Error & { code?: string };
      let message = "Failed to create account.";
      if (error.code === 'auth/email-already-in-use') {
        message = "This email address is already in use.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Invalid email address format.";
      } else if (error.code === 'auth/weak-password') {
        message = "Password must be at least 6 characters.";
      }
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      updateUser(selectedUser.id, selectedUser);
      setIsEditOpen(false);
      setSelectedUser(null);
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedUser?.email) return;
    try {
      setIsResettingPassword(true);
      await sendPasswordResetEmail(secondaryAuth, selectedUser.email);
      alert("Password reset email has been sent to " + selectedUser.email);
    } catch (err) {
      console.error("Error sending password reset email:", err);
      alert("Failed to send password reset email.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const totalUsers = users.length;
  const teacherCount = users.filter(u => u.role?.toLowerCase() === 'teacher').length;
  const parentCount = users.filter(u => u.role?.toLowerCase() === 'parent').length;

  const filteredUsers = users.filter((u) => {
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role?.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const [parentChildren, setParentChildren] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  useEffect(() => {
    if (!selectedUser || selectedUser.role?.toLowerCase() !== 'parent') {
      setParentChildren([]);
      return;
    }

    const fetchChildren = async () => {
      setLoadingChildren(true);
      try {
        const q = query(collection(db, 'enrollments'), where('parentId', '==', selectedUser.id));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setParentChildren(list);
      } catch (err) {
        console.error("Error fetching parent's children:", err);
      } finally {
        setLoadingChildren(false);
      }
    };

    fetchChildren();
  }, [selectedUser]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);

      if (start === 1) {
        end = maxVisible;
      } else if (end === totalPages) {
        start = totalPages - maxVisible + 1;
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D8232A]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/40">
      {/* Clean White Header Banner (No gradient wash) */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex flex-row items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-slate-900">
              <Users className="w-5 h-5 text-[#D8232A]" />
              <h1 className="text-lg font-bold tracking-tight text-slate-900">System Users</h1>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
            <p className="text-xs text-slate-500 max-w-md hidden lg:block truncate">
              Manage and monitor all school personnel, teachers, and parent accounts across the system.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Accounts', value: totalUsers, icon: Users, iconColor: 'text-[#D8232A] bg-red-50/80 border-red-100' },
            { label: 'Teaching Staff', value: teacherCount, icon: GraduationCap, iconColor: 'text-[#D8232A] bg-red-100/70 border-red-200/60' },
            { label: 'Registered Parents', value: parentCount, icon: Heart, iconColor: 'text-[#D8232A] bg-red-50/60 border-red-100' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4 group"
            >
              <div className={`p-3.5 rounded-xl border ${stat.iconColor} shrink-0 transition-transform duration-200 group-hover:scale-105`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{stat.value}</p>
                {/* FIX 1: slate-500 instead of slate-400 */}
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Unified Search Filter & Table Container */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50/50 border-b border-slate-200/70">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by user name or email..."
                  className="pl-9 h-10 rounded-xl bg-white border-slate-200/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-[150px] h-10 rounded-xl border-slate-200/80 bg-white text-xs font-semibold text-slate-700">
                    <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Roles</SelectItem>
                    <SelectItem value="Teacher">Teachers</SelectItem>
                    <SelectItem value="Parent">Parents</SelectItem>
                    <SelectItem value="Subadmin">Sub-Admins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50">
              {/* FIX 1: slate-500 for user count label */}
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                {filteredUsers.length} user(s)
              </span>

              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="h-10 px-4 rounded-xl bg-[#D8232A] hover:bg-[#b91c22] text-white font-semibold text-xs transition-all shadow-xs shrink-0">
                    <Plus className="h-4 w-4 mr-1.5" /> Add User
                  </Button>
                </DialogTrigger>

                {/* Add User Modal */}
                <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/40">
                    <DialogTitle className="text-lg font-bold text-slate-900">Create System Account</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">Fill in the details below to register a new user in the system.</DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleAddUser} className="space-y-6 px-6 py-5">
                    {/* Section 1: Personal Information */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Personal Information</span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <Label htmlFor="firstName" className="text-xs font-semibold text-slate-700">First Name</Label>
                          <Input id="firstName" required value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} placeholder="e.g. Maria" className="h-10 rounded-xl border-slate-200/80 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A]" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="lastName" className="text-xs font-semibold text-slate-700">Last Name</Label>
                          <Input id="lastName" required value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} placeholder="e.g. Santos" className="h-10 rounded-xl border-slate-200/80 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A]" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <Label htmlFor="middleName" className="text-xs font-semibold text-slate-700">Middle Name (Optional)</Label>
                          <Input id="middleName" value={newUser.middleName} onChange={(e) => setNewUser({ ...newUser, middleName: e.target.value })} placeholder="e.g. Garcia" className="h-10 rounded-xl border-slate-200/80 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A]" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="suffix" className="text-xs font-semibold text-slate-700">Suffix (Optional)</Label>
                          <Select value={newUser.suffix} onValueChange={(v: string) => setNewUser({ ...newUser, suffix: v === "none" ? "" : v })}>
                            <SelectTrigger className="h-10 rounded-xl border-slate-200/80 text-xs"><SelectValue placeholder="Select suffix" /></SelectTrigger>
                            <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="Jr.">Jr.</SelectItem><SelectItem value="Sr.">Sr.</SelectItem><SelectItem value="II">II</SelectItem><SelectItem value="III">III</SelectItem><SelectItem value="IV">IV</SelectItem><SelectItem value="V">V</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700">Gender</Label>
                          <Select value={newUser.gender} onValueChange={(v: string) => setNewUser({ ...newUser, gender: v as 'Male' | 'Female' | 'Other' })}>
                            <SelectTrigger className="h-10 rounded-xl border-slate-200/80 text-xs"><SelectValue placeholder="Select gender" /></SelectTrigger>
                            <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="contactNumber" className="text-xs font-semibold text-slate-700">Contact Number</Label>
                          <Input id="contactNumber" required type="tel" maxLength={11} pattern="[0-9]{11}" value={newUser.contactNumber} onChange={(e) => setNewUser({ ...newUser, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="e.g. 09123456789" className="h-10 rounded-xl border-slate-200/80 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A]" />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Role & Access Assignment */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Role & Access Control</span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className={cn("space-y-1.5 transition-all duration-200", newUser.role !== 'Subadmin' && "sm:col-span-2")}>
                          <Label className="text-xs font-semibold text-slate-700">User Role</Label>
                          <Select value={newUser.role} onValueChange={(v: string) => setNewUser({ ...newUser, role: v as 'Teacher' | 'Parent' | 'Subadmin' })}>
                            <SelectTrigger className="h-10 rounded-xl border-slate-200/80 text-xs"><SelectValue placeholder="Select role" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Teacher">Teacher</SelectItem>
                              <SelectItem value="Parent">Parent</SelectItem>
                              <SelectItem value="Subadmin">Sub-Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Smooth Transition for Subadmin Grade Assignment */}
                        <div className={cn("transition-all duration-300 overflow-hidden", newUser.role === 'Subadmin' ? "max-h-24 opacity-100" : "max-h-0 opacity-0")}>
                          {newUser.role === 'Subadmin' && (
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-slate-700">Assigned Grade</Label>
                              <Select value={newUser.assignedGrade} onValueChange={(v: string) => setNewUser({ ...newUser, assignedGrade: v })}>
                                <SelectTrigger className="h-10 rounded-xl border-slate-200/80 text-xs"><SelectValue placeholder="Select grade" /></SelectTrigger>
                                <SelectContent>
                                  {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => (
                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Credentials & Security */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Account Credentials</span>
                        <div className="flex-1 h-px bg-slate-100" />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Email Address</Label>
                        <Input id="email" required type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="name@school.edu" className="h-10 rounded-xl border-slate-200/80 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A]" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1.5">
                          <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label>
                          <div className="relative">
                            <Input id="password" required type={showPassword ? "text" : "password"} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="pr-10 h-10 rounded-xl border-slate-200/80 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A]" />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg"
                              title={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">Confirm Password</Label>
                          <div className="relative">
                            <Input id="confirmPassword" required type={showConfirmPassword ? "text" : "password"} value={newUser.confirmPassword} onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })} className="pr-10 h-10 rounded-xl border-slate-200/80 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A]" />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors rounded-lg"
                              title={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {passwordError && <p className="text-xs font-medium text-rose-600">{passwordError}</p>}
                    {error && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium">
                        {error}
                      </div>
                    )}

                    <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-2 -mx-6 -mb-5 mt-4">
                      <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-xl h-9 text-xs" disabled={isSaving}>Cancel</Button>
                      <Button type="submit" className="rounded-xl h-9 px-6 bg-[#D8232A] hover:bg-[#b91c22] text-white text-xs transition-all shadow-xs font-semibold" disabled={isSaving}>
                        {isSaving ? "Creating..." : "Save Account"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Desktop Table View */}
          {/* FIX 4: sticky header with shadow that appears on scroll (needs scroll listener) */}
          <div className="hidden lg:block overflow-x-auto max-h-[65vh] overflow-y-auto relative">
            <Table>
              <TableHeader className="bg-slate-50/95 backdrop-blur-sm border-b border-slate-200/70 sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
                <TableRow className="hover:bg-transparent border-none h-11">
                  {/* FIX 1: slate-500 for column headers */}
                  <TableHead className="w-14 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 pl-4">#</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">User Information</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Role</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">Joined Date</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center gap-2 max-w-xs mx-auto">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-1 text-slate-400">
                          <Search className="w-5 h-5 opacity-60" />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">No matching user accounts</p>
                        <p className="text-[11px] text-slate-500 leading-normal">Check your spelling or reset role filters to view more accounts.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((user, index) => (
                    <TableRow
                      key={user.id}
                      onClick={() => { setSelectedUser(user); setIsViewOpen(true); }}
                      style={{ animationDelay: `${index * 25}ms` }}
                      // FIX 3: h-12 instead of h-14 for tighter density on large datasets
                      className="border-b border-slate-100/70 hover:bg-slate-50/50 transition-colors h-12 cursor-pointer animate-in fade-in-50 slide-in-from-bottom-1 duration-200"
                    >
                      <TableCell className="text-center text-xs text-slate-500 font-medium pl-4">{index + 1 + (currentPage - 1) * itemsPerPage}</TableCell>
                      <TableCell className="whitespace-nowrap py-2">
                        <div className="flex items-center gap-3">
                          {/* Multi-Tone Pastel Avatars — slightly smaller for tighter rows */}
                          {user.photoURL || (user as any).photoUrl ? (
                            <img
                              src={user.photoURL || (user as any).photoUrl}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="h-8 w-8 rounded-full object-cover shrink-0 border shadow-2xs"
                            />
                          ) : (
                            <div className={cn("h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs", getAvatarStyle(user.id || user.firstName))}>
                              {user.firstName?.charAt(0) || ''}{user.lastName?.charAt(0) || ''}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 text-xs leading-tight">{user.firstName} {user.lastName}</span>
                            <span className="text-[11px] text-slate-500 font-normal mt-0.5">{user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap py-2">
                        <div className="flex flex-col gap-1">
                          {/* FIX 2: no border, true flat pill */}
                          <Badge variant="outline" className={cn(
                            "capitalize text-[10px] px-2 py-0.5 rounded-md self-start border-0",
                            getRoleBadgeStyle()
                          )}>
                            {user.role}
                          </Badge>
                          {user.role?.toLowerCase() === 'teacher' && (() => {
                            const assignment = assignments.find(a => a.teacherId === user.id);
                            const section = assignment ? sections.find(s => s.id === assignment.sectionId) : null;
                            if (!section) return null;
                            return (
                              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider pl-0.5">
                                {section.gradeLevel} - {section.name}
                              </span>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs font-normal whitespace-nowrap py-2">
                        {getDateString(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-[#D8232A] hover:bg-red-50 rounded-lg transition-colors"
                            onClick={() => { setSelectedUser(user); setIsViewOpen(true); }}
                            title="View Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-[#D8232A] hover:bg-red-50 rounded-lg transition-colors"
                            onClick={() => { setSelectedUser(user); setIsEditOpen(true); }}
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            onClick={() => setUserToDelete(user)}
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="block lg:hidden divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 px-4 text-slate-400">
                <Search className="w-6 h-6 opacity-30 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No matching user accounts</p>
                <p className="text-[11px] text-slate-500">Try adjusting your search terms.</p>
              </div>
            ) : (
              currentItems.map((user) => (
                <div
                  key={user.id}
                  onClick={() => { setSelectedUser(user); setIsViewOpen(true); }}
                  className="p-4 hover:bg-slate-50/50 transition-colors cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border", getAvatarStyle(user.id || user.firstName))}>
                        {user.firstName?.charAt(0) || ''}{user.lastName?.charAt(0) || ''}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-900 truncate">{user.firstName} {user.lastName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>

                    <Badge variant="outline" className={cn(
                      "capitalize text-[10px] px-2 py-0.5 rounded-md shrink-0 border-0",
                      getRoleBadgeStyle()
                    )}>
                      {user.role}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100/60" onClick={(e) => e.stopPropagation()}>
                    <span>Joined: {getDateString(user.createdAt)}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-[#D8232A] hover:bg-red-50 rounded-lg transition-colors" onClick={() => { setSelectedUser(user); setIsViewOpen(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-[#D8232A] hover:bg-red-50 rounded-lg transition-colors" onClick={() => { setSelectedUser(user); setIsEditOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => setUserToDelete(user)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3.5 border-t border-slate-200/70 bg-slate-50/40">
              <div className="text-xs text-slate-500 font-medium">
                Showing <span className="font-semibold text-slate-700">{indexOfFirstItem + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(indexOfLastItem, filteredUsers.length)}</span> of <span className="font-semibold text-slate-700">{filteredUsers.length}</span> records
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 rounded-lg border-slate-200/80 text-xs text-slate-600 hover:bg-red-50 hover:text-[#D8232A] disabled:opacity-50 transition-all"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-semibold border-slate-200/80 transition-all duration-200 active:scale-95",
                        currentPage === page
                          ? "bg-[#D8232A] text-white hover:bg-[#b91c22] border-[#D8232A] shadow-xs"
                          : "text-slate-600 hover:bg-red-50 hover:text-[#D8232A]"
                      )}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 rounded-lg border-slate-200/80 text-xs text-slate-600 hover:bg-red-50 hover:text-[#D8232A] disabled:opacity-50 transition-all"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/40">
            <DialogTitle className="text-lg font-bold text-slate-900">Edit User Details</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Modify personal information or trigger a password reset email.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditUser} className="space-y-6 px-6 py-5">
              {/* Section 1: Personal Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Personal Details</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-firstName" className="text-xs font-semibold text-slate-700">First Name</Label>
                    <Input
                      id="edit-firstName"
                      required
                      value={selectedUser.firstName}
                      onChange={(e) => setSelectedUser({ ...selectedUser, firstName: e.target.value })}
                      className="h-10 rounded-xl border-slate-200/80 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-lastName" className="text-xs font-semibold text-slate-700">Last Name</Label>
                    <Input
                      id="edit-lastName"
                      required
                      value={selectedUser.lastName}
                      onChange={(e) => setSelectedUser({ ...selectedUser, lastName: e.target.value })}
                      className="h-10 rounded-xl border-slate-200/80 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-email" className="text-xs font-semibold text-slate-700">Email Address</Label>
                    <Input
                      id="edit-email"
                      required
                      type="email"
                      value={selectedUser.email}
                      onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                      className="h-10 rounded-xl border-slate-200/80 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-contact" className="text-xs font-semibold text-slate-700">Contact Number</Label>
                    <Input
                      id="edit-contact"
                      required
                      maxLength={11}
                      value={selectedUser.contactNumber}
                      onChange={(e) => setSelectedUser({ ...selectedUser, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                      className="h-10 rounded-xl border-slate-200/80 text-xs focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Gender</Label>
                    <Select
                      value={selectedUser.gender}
                      onValueChange={(v: string) => setSelectedUser({ ...selectedUser, gender: v as 'Male' | 'Female' | 'Other' })}>
                      <SelectTrigger className="h-10 rounded-xl border-slate-200/80 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedUser?.role?.toLowerCase() === 'subadmin' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Assigned Grade</Label>
                      <Select
                        value={selectedUser.assignedGrade || 'Grade 1'}
                        onValueChange={(v: string) => setSelectedUser({ ...selectedUser, assignedGrade: v })}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200/80 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Security & Password Reset */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Security & Credentials</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-slate-700 border-slate-200 hover:bg-red-50 hover:text-[#D8232A] hover:border-red-200/80 h-10 text-xs font-semibold rounded-xl transition-all"
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                >
                  <Lock className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  {isResettingPassword ? "Sending Reset Email..." : "Send Password Reset Link"}
                </Button>
              </div>

              <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 gap-2 -mx-6 -mb-5 mt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl h-9 text-xs">Cancel</Button>
                <Button type="submit" className="rounded-xl h-9 px-6 bg-[#D8232A] hover:bg-[#b91c22] text-white text-xs transition-all shadow-xs font-semibold">Update User</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View User Details Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className={cn("p-0 rounded-2xl border-none shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200", selectedUser?.role?.toLowerCase() === 'parent' ? "sm:max-w-[640px]" : "sm:max-w-[540px]")}>
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/40">
            <DialogTitle className="text-lg font-bold text-slate-900">User Profile</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Comprehensive information and assigned records.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-5 px-6 py-5">
              <div className="flex items-center gap-4 p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border shadow-2xs", getAvatarStyle(selectedUser.id || selectedUser.firstName))}>
                  {selectedUser.firstName?.charAt(0) || ''}{selectedUser.lastName?.charAt(0) || ''}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900">{selectedUser.firstName} {selectedUser.lastName}</h3>
                  <Badge variant="outline" className={cn("capitalize text-[10px] font-semibold mt-1 border-0", getRoleBadgeStyle())}>
                    {selectedUser.role}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-0.5">
                  <p className="text-slate-500 font-medium text-[11px]">Email Address</p>
                  <p className="font-semibold text-slate-800">{selectedUser.email}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-500 font-medium text-[11px]">Contact Number</p>
                  <p className="font-semibold text-slate-800">{selectedUser.contactNumber || 'N/A'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-500 font-medium text-[11px]">Gender</p>
                  <p className="font-semibold text-slate-800">{selectedUser.gender}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-500 font-medium text-[11px]">Joined Date</p>
                  <p className="font-semibold text-slate-800">{getDateString(selectedUser.createdAt)}</p>
                </div>
              </div>

              {selectedUser.role?.toLowerCase() === 'parent' && (
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Linked Children / Enrolled Students</h4>
                  {loadingChildren ? (
                    <div className="flex justify-center items-center py-4">
                      <div className="w-5 h-5 border-2 border-[#D8232A] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : parentChildren.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No children currently enrolled under this parent account.</p>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-white">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200/60 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                            <th className="py-2.5 pl-3 w-10">No.</th>
                            <th className="py-2.5">Student Name</th>
                            <th className="py-2.5">LRN</th>
                            <th className="py-2.5">Grade</th>
                            <th className="py-2.5 pr-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parentChildren.map((child, index) => (
                            <tr key={child.id} className="border-b border-slate-100/60 last:border-0 hover:bg-slate-50/50 transition-colors">
                              <td className="py-2 pl-3 text-slate-500 font-medium">{index + 1}</td>
                              <td className="py-2 font-semibold text-slate-700">{child.lastName}, {child.firstName}</td>
                              <td className="py-2 font-mono text-slate-500">{child.lrn || 'N/A'}</td>
                              <td className="py-2 text-slate-600">{child.gradeLevel || 'N/A'}</td>
                              <td className="py-2 pr-3">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border",
                                  child.status?.toLowerCase() === 'enrolled' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    child.status?.toLowerCase() === 'dropped' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-600 border-slate-200"
                                )}>
                                  {child.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {selectedUser.role?.toLowerCase() === 'teacher' && (() => {
                const assignment = assignments.find(a => a.teacherId === selectedUser.id);
                const section = assignment ? sections.find(s => s.id === assignment.sectionId) : null;
                const classroom = assignment ? classrooms.find(c => c.id === assignment.classroomId) : null;

                return (
                  <div className="space-y-2.5 pt-3 border-t border-slate-100">
                    <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Class Assignment</h4>
                    {assignment ? (
                      <div className="grid grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assigned Section</span>
                          <span className="font-semibold text-slate-800">{section ? section.name : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Grade Level</span>
                          <span className="font-semibold text-slate-800">{section ? section.gradeLevel : (classroom ? classroom.gradeLevel : 'N/A')}</span>
                        </div>
                        {classroom && (
                          <div className="col-span-2 pt-2 border-t border-slate-200/50">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Room / Classroom</span>
                            <span className="font-semibold text-slate-800">{classroom.roomName} ({classroom.roomType})</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No assigned section or classroom for this teacher.</p>
                    )}
                  </div>
                );
              })()}

              <DialogFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 -mx-6 -mb-5 mt-4">
                <Button onClick={() => setIsViewOpen(false)} className="w-full h-9 rounded-xl bg-[#D8232A] hover:bg-[#b91c22] text-white text-xs font-semibold shadow-xs">Close Profile</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Softened Delete Confirmation */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] p-0 rounded-2xl border-none shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <DialogHeader className="px-6 pt-6 pb-3 border-b border-slate-100 bg-slate-50/40">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Please confirm if you want to delete this user profile.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-2 text-xs text-slate-600">
            <p>
              Are you sure you want to delete the account for <strong className="text-slate-900 font-bold">{userToDelete?.firstName} {userToDelete?.lastName}</strong> (<span className="text-slate-500">{userToDelete?.email}</span>)?
            </p>
            <p className="text-slate-500 text-[11px]">
              This action permanently removes the user's login access and associated profile data.
            </p>
          </div>

          <DialogFooter className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setUserToDelete(null)} className="rounded-xl h-9 text-xs font-medium">Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-rose-600 hover:bg-rose-700 rounded-xl h-9 text-xs font-semibold px-4 shadow-xs"
              onClick={() => {
                if (userToDelete) {
                  deleteUser(userToDelete.id);
                  setUserToDelete(null);
                }
              }}
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}