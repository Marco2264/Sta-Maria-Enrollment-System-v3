import React, { useState, useEffect } from 'react';
import { cn } from '../ui/utils';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
'../ui/Table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter } from
'../ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'../ui/Select';

import {
  EyeOff,
  Search,
  Filter,
  Edit,
  Eye,
  ViewIcon,
  Plus,
  CircleDashed,
  Trash2,
  Users,
  GraduationCap,
  UserCheck,
  Heart
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
      // 1. Create user in Firebase Auth (using secondary instance to keep admin logged in)
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth,
        newUser.email,
        newUser.password
      );
      const user = userCredential.user;

      // 2. Prepare profile for Firestore
      const userProfile = {
        firstName: newUser.firstName,
        middleName: newUser.middleName,
        lastName: newUser.lastName,
        suffix: newUser.suffix,
        gender: newUser.gender,
        role: newUser.role.toLowerCase(), // Store as lowercase for app consistency
        assignedGrade: newUser.role === 'Subadmin' ? newUser.assignedGrade : null,
        email: newUser.email,
        contactNumber: newUser.contactNumber,
        status: newUser.status,
        createdAt: new Date().toISOString()
      };

      // 3. Save to Firestore
      await setDoc(doc(db, 'users', user.uid), userProfile);

      // 4. Update local state via admin context
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

      // 5. Success cleanup
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

  const [roleFilter, setRoleFilter] = useState('All');
  
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
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const renderTable = () => {
    return (
      <Card className="border-none shadow-sm ring-1 ring-slate-200/60 overflow-hidden rounded-2xl bg-white mt-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
              <TableRow className="hover:bg-transparent border-none h-12">
                <TableHead className="w-16 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 pl-4">#</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap">User Information</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap">Role</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 whitespace-nowrap">Joined Date</TableHead>
                <TableHead className="text-right text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                        <Search className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="text-base font-semibold text-slate-900">No records found</p>
                      <p className="text-sm">Try adjusting your filters or search terms.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentItems.map((user, index) => (
                  <TableRow
                    key={user.id}
                    onClick={() => { setSelectedUser(user); setIsViewOpen(true); }}
                    className="border-b border-slate-100/60 hover:bg-slate-50/50 transition-colors h-16 cursor-pointer"
                  >
                    <TableCell className="text-center text-slate-400 font-medium pl-4">{index + 1 + (currentPage - 1) * itemsPerPage}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-primary/5">
                          {user.firstName?.charAt(0) || ''}{user.lastName?.charAt(0) || ''}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm leading-tight">{user.firstName} {user.lastName}</span>
                          <span className="text-xs text-slate-400 font-medium mt-0.5">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                     <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={cn(
                          "text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider self-start",
                          user.role?.toLowerCase() === 'teacher' ? "bg-blue-50 text-blue-600" :
                            user.role?.toLowerCase() === 'parent' ? "bg-purple-50 text-purple-600" : "bg-indigo-50 text-indigo-600"
                        )}>
                          {user.role}
                        </span>
                        {user.role?.toLowerCase() === 'teacher' && (() => {
                          const assignment = assignments.find(a => a.teacherId === user.id);
                          const section = assignment ? sections.find(s => s.id === assignment.sectionId) : null;
                          if (!section) return null;
                          return (
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-0.5">
                              {section.gradeLevel} - {section.name}
                            </span>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-[13px] font-medium whitespace-nowrap">
                      {getDateString(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                          onClick={(e) => { e.stopPropagation(); setSelectedUser(user); setIsEditOpen(true); }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                          onClick={(e) => { e.stopPropagation(); setUserToDelete(user); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50/30">
            <div className="text-sm text-slate-500 font-medium">
              Showing <span className="font-semibold text-slate-800">{indexOfFirstItem + 1}</span> to <span className="font-semibold text-slate-800">{Math.min(indexOfLastItem, filteredUsers.length)}</span> of <span className="font-semibold text-slate-800">{filteredUsers.length}</span> records
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
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
                      "w-9 h-9 rounded-xl font-semibold border-slate-200",
                      currentPage === page 
                        ? "bg-primary text-white hover:bg-primary/90 hover:text-white" 
                        : "text-slate-600 hover:bg-slate-100"
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
                className="h-9 px-3 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    );
  };
  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-8 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Users className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">System Users</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              Manage and monitor all school personnel and parent accounts across the system.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto rounded-xl px-6 bg-primary shadow-sm hover:bg-primary/90 font-semibold transition-all">
                  <Plus className="w-4 h-4 mr-2" /> Add New Account
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Create System Account</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddUser} className="space-y-6 pt-4">
                  {/* ... reusing the existing form fields from the original DialogContent ... */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" required value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} placeholder="e.g. Maria" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" required value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} placeholder="e.g. Santos" className="rounded-xl" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="middleName">Middle Name (Optional)</Label>
                      <Input id="middleName" value={newUser.middleName} onChange={(e) => setNewUser({ ...newUser, middleName: e.target.value })} placeholder="e.g. Garcia" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="suffix">Suffix (Optional)</Label>
                      <Select value={newUser.suffix} onValueChange={(v: string) => setNewUser({ ...newUser, suffix: v === "none" ? "" : v })}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select suffix" /></SelectTrigger>
                        <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="Jr.">Jr.</SelectItem><SelectItem value="Sr.">Sr.</SelectItem><SelectItem value="II">II</SelectItem><SelectItem value="III">III</SelectItem><SelectItem value="IV">IV</SelectItem><SelectItem value="V">V</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select value={newUser.gender} onValueChange={(v: string) => setNewUser({ ...newUser, gender: v as 'Male' | 'Female' | 'Other' })}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>User Role</Label>
                      <Select value={newUser.role} onValueChange={(v: string) => setNewUser({ ...newUser, role: v as 'Teacher' | 'Parent' | 'Subadmin' })}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Teacher">Teacher</SelectItem>
                          <SelectItem value="Parent">Parent</SelectItem>
                          <SelectItem value="Subadmin">Sub-Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {newUser.role === 'Subadmin' && (
                    <div className="space-y-2">
                      <Label>Assigned Grade</Label>
                      <Select value={newUser.assignedGrade} onValueChange={(v: string) => setNewUser({ ...newUser, assignedGrade: v })}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select grade" /></SelectTrigger>
                        <SelectContent>
                          {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" required type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="name@school.edu" className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input id="contactNumber" required type="tel" maxLength={11} pattern="[0-9]{11}" value={newUser.contactNumber} onChange={(e) => setNewUser({ ...newUser, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="e.g. 09123456789" className="rounded-xl" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input id="password" required type={showPassword ? "text" : "password"} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="pr-10 rounded-xl" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Input id="confirmPassword" required type={showConfirmPassword ? "text" : "password"} value={newUser.confirmPassword} onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })} className="pr-10 rounded-xl" />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      </div>
                    </div>
                  </div>

                  {passwordError && <p className="text-sm font-medium text-destructive">{passwordError}</p>}
                  {error && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                      {error}
                    </div>
                  )}

                  <DialogFooter className="pt-4 border-t gap-2">
                    <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl" disabled={isSaving}>Cancel</Button>
                    <Button type="submit" className="rounded-xl px-8 bg-primary hover:bg-primary/90 transition-all" disabled={isSaving}>
                      {isSaving ? "Creating..." : "Save Account"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Header & Stats Section */}
        <div className="space-y-8">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              { label: 'Total Accounts', value: totalUsers, icon: Users, color: 'indigo' },
              { label: 'Teaching Staff', value: teacherCount, icon: GraduationCap, color: 'blue' },
              { label: 'Registered Parents', value: parentCount, icon: Heart, color: 'rose' },
            ].map((stat, i) => {
              const colorClasses = ({
                blue: 'from-blue-50 to-blue-100/50 border-blue-200/50 text-blue-600 bg-blue-200/50',
                emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-200/50 text-emerald-600 bg-emerald-200/50',
                rose: 'from-rose-50 to-rose-100/50 border-rose-200/50 text-rose-600 bg-rose-200/50',
                indigo: 'from-indigo-50 to-indigo-100/50 border-indigo-200/50 text-indigo-600 bg-indigo-200/50'
              } as Record<string, string>)[stat.color || 'blue'] || 'from-blue-50 to-blue-100/50 border-blue-200/50 text-blue-600 bg-blue-200/50';

              return (
                <Card key={i} className={`bg-gradient-to-br ${colorClasses.split(' text-')[0]} p-6 rounded-2xl shadow-sm relative overflow-hidden transition-all hover:shadow-md`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${colorClasses.split(' bg-')[1]} text-${stat.color}-600`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                      {stat.label}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Data Management Section */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
              <div className="relative w-full sm:w-96 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search by name, email, or role..." 
                  className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] h-11 rounded-xl border-slate-200 bg-white">
                    <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" />
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
            
            <div className="hidden lg:block h-8 w-px bg-slate-200" />
            
            <div className="flex items-center gap-4 px-2">
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Database</p>
                <p className="text-sm font-semibold text-slate-600 mt-1">{filteredUsers.length} records</p>
              </div>
            </div>
          </div>

          <Card className="border-none shadow-sm ring-1 ring-slate-200/60 overflow-hidden rounded-2xl bg-white">
            {renderTable()}
          </Card>
        </div>
      </div>

      {/* Edit User Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditUser} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    required
                    value={selectedUser.firstName}
                    onChange={(e) => setSelectedUser({ ...selectedUser, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    required
                    value={selectedUser.lastName}
                    onChange={(e) => setSelectedUser({ ...selectedUser, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email Address</Label>
                  <Input
                    id="edit-email"
                    required
                    type="email"
                    value={selectedUser.email}
                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-contact">Contact Number</Label>
                  <Input
                    id="edit-contact"
                    required
                    maxLength={11}
                    value={selectedUser.contactNumber}
                    onChange={(e) => setSelectedUser({ ...selectedUser, contactNumber: e.target.value.replace(/\D/g, '').slice(0, 11) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={selectedUser.gender}
                    onValueChange={(v: string) => setSelectedUser({ ...selectedUser, gender: v as 'Male' | 'Female' | 'Other' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedUser?.role?.toLowerCase() === 'subadmin' && (
                  <div className="space-y-2">
                    <Label>Assigned Grade</Label>
                    <Select
                      value={selectedUser.assignedGrade || 'Grade 1'}
                      onValueChange={(v: string) => setSelectedUser({ ...selectedUser, assignedGrade: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

              </div>

              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? "Sending..." : "Send Password Reset Email"}
                </Button>
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button type="submit">Update User</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

       {/* View User Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className={cn("rounded-2xl border-none shadow-2xl animate-in fade-in zoom-in-95 duration-200", selectedUser?.role?.toLowerCase() === 'parent' ? "sm:max-w-[650px]" : (selectedUser?.role?.toLowerCase() === 'teacher' ? "sm:max-w-[550px]" : "sm:max-w-[500px]"))}>
          <DialogHeader>
            <DialogTitle>User Information</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                  {selectedUser.firstName?.charAt(0) || ''}{selectedUser.lastName?.charAt(0) || ''}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.firstName} {selectedUser.lastName}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Contact</p>
                  <p className="font-medium">{selectedUser.contactNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Gender</p>
                  <p className="font-medium">{selectedUser.gender}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Member Since</p>
                  <p className="font-medium">{getDateString(selectedUser.createdAt)}</p>
                </div>
              </div>

              {selectedUser.role?.toLowerCase() === 'parent' && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="font-semibold text-slate-800 text-sm">Linked Children / Enrolled Students</h4>
                  {loadingChildren ? (
                    <div className="flex justify-center items-center py-4">
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    </div>
                  ) : parentChildren.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No children currently enrolled under this parent account.</p>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-100/80 bg-slate-50/50">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200/60 text-slate-400 font-bold uppercase tracking-wider bg-slate-50">
                            <th className="py-2.5 pl-3 w-10">No.</th>
                            <th className="py-2.5">Student Name</th>
                            <th className="py-2.5">LRN</th>
                            <th className="py-2.5">Grade</th>
                            <th className="py-2.5 pr-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parentChildren.map((child, index) => (
                            <tr key={child.id} className="border-b border-slate-100/60 last:border-0 hover:bg-white transition-colors">
                              <td className="py-2 pl-3 text-slate-400 font-medium">{index + 1}</td>
                              <td className="py-2 font-semibold text-slate-700">{child.lastName}, {child.firstName}</td>
                              <td className="py-2 font-mono text-slate-500">{child.lrn || 'N/A'}</td>
                              <td className="py-2 text-slate-600">{child.gradeLevel || 'N/A'}</td>
                              <td className="py-2 pr-3">
                                <span className={cn(
                                  "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                  child.status?.toLowerCase() === 'enrolled' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                    child.status?.toLowerCase() === 'dropped' ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-slate-100 text-slate-500"
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
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <h4 className="font-semibold text-slate-800 text-sm">Class Assignment</h4>
                    {assignment ? (
                      <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Assigned Section</span>
                          <span className="text-sm font-semibold text-slate-800">{section ? section.name : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Grade Level</span>
                          <span className="text-sm font-semibold text-slate-800">{section ? section.gradeLevel : (classroom ? classroom.gradeLevel : 'N/A')}</span>
                        </div>
                        {classroom && (
                          <div className="col-span-2 mt-2 pt-2 border-t border-slate-200/50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Room / Classroom</span>
                            <span className="text-sm font-semibold text-slate-800">{classroom.roomName} ({classroom.roomType})</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No assigned section or classroom for this teacher.</p>
                    )}
                  </div>
                );
              })()}
              
              <DialogFooter className="pt-4 border-t">
                <Button onClick={() => setIsViewOpen(false)} className="w-full">Close Profile</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete the account for <strong className="text-slate-900">{userToDelete?.firstName} {userToDelete?.lastName}</strong>?
            </p>
            <p className="text-sm text-slate-600 mt-2">
              This action cannot be undone. All associated data will be permanently removed.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setUserToDelete(null)}>Cancel</Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                if (userToDelete) {
                  deleteUser(userToDelete.id);
                  setUserToDelete(null);
                }
              }}
            >
              Yes, Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}