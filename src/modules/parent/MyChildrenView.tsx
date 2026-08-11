import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '../../components/ui/Dialog';

import {
  CheckCircle2,
  CircleDashed,
  XCircle,
  ChevronRight,
  Users,
  GraduationCap,
  Trash2,
  Search,
  ArrowRight,
  User,
  Eye,
  FileText,
  Lock,
  AlertTriangle,
  Wrench
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useParentData } from '../../lib/parentData';

export function MyChildrenView({
  onSelectChild
}: { onSelectChild: (id: string) => void; }) {
  const parentData = useParentData();
  const children = parentData?.children || [];
  const loading = parentData?.loading || false;
  const deleteChild = parentData?.deleteChild;

  const [searchQuery, setSearchQuery] = useState('');
  const [childToDelete, setChildToDelete] = useState<any | null>(null);

  const filteredChildren = useMemo(() => {
    const list = children || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(c => {
      if (!c) return false;
      const fullName = `${c.firstName || ''} ${c.middleName || ''} ${c.lastName || ''}`.toLowerCase();
      const lrn = (c.lrn || '').toLowerCase();
      const grade = `grade ${c.gradeLevel || ''}`.toLowerCase();
      return fullName.includes(q) || lrn.includes(q) || grade.includes(q);
    });
  }, [children, searchQuery]);

  const [isFixing, setIsFixing] = useState(false);

  const handleFixEnrollments = async () => {
    try {
      setIsFixing(true);
      const snapshot = await getDocs(collection(db, 'enrollments'));
      let count = 0;
      for (const document of snapshot.docs) {
        const data = document.data();
        if (data.status !== 'Pending') {
          await updateDoc(doc(db, 'enrollments', document.id), {
            status: 'Pending',
            sectionId: '',
            section: '',
            submittedAt: data.submittedAt || serverTimestamp()
          });
          count++;
        }
      }
      alert(`Success! ${count} students have been reset to Pending and added to the Admin/Teacher views.`);
    } catch (e: any) {
      alert(`Error fixing: ${e.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#F4F7F9] font-sans">
        <header className="px-6 py-6 lg:py-0 lg:h-28 border-b border-slate-100 bg-white flex items-center shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="space-y-2">
              <div className="h-7 w-40 bg-slate-200 animate-pulse rounded-lg" />
              <div className="h-3 w-64 bg-slate-100 animate-pulse rounded-md" />
            </div>
            <div className="h-9 w-60 bg-slate-100 animate-pulse rounded-full" />
          </div>
        </header>
        <div className="flex-1 p-6 sm:p-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 space-y-4">
            <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
            <div className="h-12 bg-slate-50 animate-pulse rounded-xl" />
            <div className="h-12 bg-slate-50 animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Enrolled':
      case 'Approved':
      case 'Active':
        return (
          <span className="px-3.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full border border-emerald-100/80 inline-flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Enrolled
          </span>
        );
      case 'Pending':
        return (
          <span className="px-3.5 py-1 bg-amber-50 text-amber-600 text-xs font-semibold rounded-full border border-amber-100/80 inline-flex items-center gap-1.5 shadow-2xs">
            <CircleDashed className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" /> Pending
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-3.5 py-1 bg-rose-50 text-rose-600 text-xs font-semibold rounded-full border border-rose-100/80 inline-flex items-center gap-1.5 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-500" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-3.5 py-1 bg-amber-50 text-amber-600 text-xs font-semibold rounded-full border border-amber-100/80 inline-flex items-center gap-1.5 shadow-2xs">
            <CircleDashed className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" /> Pending
          </span>
        );
    }
  };

  const getStudentAverage = (c: any): string => {
    if (!c.grades) return 'N/A';
    const gradesValues: number[] = [];
    Object.values(c.grades).forEach((subjectGrades: any) => {
      if (typeof subjectGrades === 'object' && subjectGrades !== null) {
        Object.values(subjectGrades).forEach((g: any) => {
          const num = parseFloat(g);
          if (!isNaN(num)) gradesValues.push(num);
        });
      } else {
        const num = parseFloat(subjectGrades);
        if (!isNaN(num)) gradesValues.push(num);
      }
    });
    if (gradesValues.length === 0) return 'N/A';
    return (gradesValues.reduce((a, b) => a + b, 0) / gradesValues.length).toFixed(1);
  };

  const getAcademicStandingBadge = (avgStr: string) => {
    const num = parseFloat(avgStr);
    if (isNaN(num)) return null;
    if (num >= 90) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (num >= 85) return { label: 'Very Good', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (num >= 75) return { label: 'Satisfactory', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Needs Improvement', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9]">
      {/* ── TOP HEADER BAR ── */}
      <header className="px-6 py-6 lg:py-0 lg:h-28 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#2563eb]">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">My Students</h1>
            <p className="text-xs text-slate-500 font-medium">Manage and view registered student profiles and academic evaluations.</p>
          </div>
        </div>

        {/* Search & Enrolled Count Badge */}
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleFixEnrollments} 
            disabled={isFixing}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs"
          >
            <Wrench className="w-4 h-4 mr-1" />
            {isFixing ? 'Fixing...' : 'Fix DB (Make Pending)'}
          </Button>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search student name or LRN..."
              className="pl-9 pr-4 py-1.5 bg-slate-50 border-slate-200/80 rounded-full text-xs font-medium focus:bg-white transition-all w-full"
            />
          </div>
          <span className="px-3.5 py-1.5 bg-blue-50 text-[#2563eb] border border-blue-100 rounded-full text-xs font-bold whitespace-nowrap shadow-2xs">
            {children.length} Enrolled
          </span>
        </div>
      </header>

      {/* ── MAIN SLEEK TABLE CONTENT ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="w-full space-y-6">
          {filteredChildren.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-12 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Students Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {children.length === 0
                  ? "You haven't enrolled any students yet. Register a learner to get started."
                  : "No students matched your search criteria."}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full min-w-[650px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6 w-12 text-center">#</th>
                      <th className="py-4 px-6">STUDENT NAME</th>
                      <th className="py-4 px-6">GRADE & SECTION</th>
                      <th className="py-4 px-6">LRN NUMBER</th>
                      <th className="py-4 px-6">ENROLLMENT STATUS</th>
                      <th className="py-4 px-6">GENERAL AVERAGE</th>
                      <th className="py-4 px-6 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredChildren.map((child, index) => {
                      const rawAvg = getStudentAverage(child);
                      const avgDisplay = rawAvg === 'N/A' ? 'No grades yet' : `${rawAvg}%`;
                      const displayGrade = (child.gradeLevel || '').toString().toLowerCase().startsWith('grade')
                        ? child.gradeLevel
                        : `Grade ${child.gradeLevel || 'Level'}`;
                      const displaySection = (child.status === 'Enrolled' || child.status === 'Approved')
                        ? (child.section
                          ? (child.section.toString().toLowerCase().startsWith('section') ? child.section : `Section ${child.section}`)
                          : 'TBA')
                        : 'TBA';
                      const studentId = child.lrn || '126220200414';

                      return (
                        <tr
                          key={child.id}
                          onClick={() => onSelectChild(child.id)}
                          className="hover:bg-slate-50/60 transition-colors duration-150 cursor-pointer group"
                        >
                          {/* Row Index */}
                          <td className="py-5 px-6 text-slate-400 font-medium text-center">
                            {index + 1}
                          </td>

                          {/* Student Name & Avatar */}
                          <td className="py-5 px-6">
                            <div className="flex items-center gap-3">
                              {child.photoURL || (child as any).photoUrl ? (
                                <img
                                  src={child.photoURL || (child as any).photoUrl}
                                  alt={child.firstName}
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-50/80 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-blue-100/80 uppercase">
                                  {child.firstName?.charAt(0)}{child.lastName?.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-extrabold text-slate-900 uppercase text-xs leading-snug">
                                  {child.lastName}, {child.firstName} {child.middleName ? `${child.middleName.charAt(0)}.` : ''}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Grade & Section */}
                          <td className="py-5 px-6">
                            <p className="font-bold text-slate-900 text-xs leading-snug">{displayGrade}</p>
                            <p className="text-[11px] font-medium text-slate-400 mt-0.5">{displaySection}</p>
                          </td>

                          {/* LRN Number */}
                          <td className="py-5 px-6 font-bold text-slate-800 text-xs">
                            {studentId}
                          </td>

                          {/* Enrollment Status */}
                          <td className="py-5 px-6">
                            {getStatusBadge(child.status)}
                          </td>

                          {/* General Average */}
                          <td className="py-5 px-6 font-extrabold text-slate-900 text-xs">
                            {avgDisplay}
                          </td>

                          {/* Action Button */}
                          <td className="py-5 px-6" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => onSelectChild(child.id)}
                                className="px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-full text-xs font-semibold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                View Profile
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                              {false ? (
                                <button
                                  type="button"
                                  disabled
                                  className="p-1.5 text-slate-300 rounded-lg cursor-not-allowed opacity-40"
                                  title="Officially enrolled student profiles cannot be deleted."
                                >
                                  <Trash2 className="w-4 h-4 text-slate-300" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setChildToDelete(child)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Cancel & Delete Registration"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Warning Confirmation Modal for Pending Applications */}
      <Dialog open={childToDelete !== null} onOpenChange={(open) => {
        if (!open) setChildToDelete(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <DialogTitle className="text-center text-base sm:text-lg font-black text-slate-900">
              Warning: Cancel Pending Registration?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500 leading-relaxed pt-1">
              Are you sure you want to cancel and delete the pending enrollment application for{' '}
              <strong className="text-slate-900 font-extrabold uppercase">
                {childToDelete?.firstName} {childToDelete?.lastName}
              </strong>? All submitted student details and uploaded documents will be permanently removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setChildToDelete(null)} className="w-full sm:w-auto rounded-xl text-xs font-bold border-slate-200">
              Keep Registration
            </Button>
            <Button
              variant="default"
              className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-2xs border-none"
              onClick={async () => {
                if (childToDelete) {
                  try {
                    await deleteChild(childToDelete.id);
                  } catch (e) {
                    console.error("Failed to delete child:", e);
                    alert("Failed to delete the enrollment profile. Please check your permissions or try again.");
                  } finally {
                    setChildToDelete(null);
                  }
                }
              }}
            >
              Yes, Delete Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MyChildrenView;