import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '../../components/ui/Dialog';

import { CheckCircle2, CircleDashed, XCircle, ChevronRight, Users, GraduationCap, Trash2 } from 'lucide-react';
import { useParentData } from '../../lib/parentData';

export function MyChildrenView({
  onSelectChild
}: {onSelectChild: (id: string) => void;}) {
  const { children, loading, deleteChild } = useParentData();
  const [childToDelete, setChildToDelete] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Enrolled':
        return (
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none rounded-full px-3 py-1 font-semibold flex w-fit items-center shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Enrolled
          </Badge>
        );

      case 'Pending':
        return (
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none rounded-full px-3 py-1 font-semibold flex w-fit items-center shadow-sm"
          >
            <CircleDashed className="w-3.5 h-3.5 mr-1.5 animate-spin-slow" /> Pending
          </Badge>
        );

      case 'Rejected':
        return (
          <Badge
            variant="secondary"
            className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none rounded-full px-3 py-1 font-semibold flex w-fit items-center shadow-sm"
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Rejected
          </Badge>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-8 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Users className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">My Students</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              View and manage profiles for all your enrolled students. Click on a card to see detailed academic and attendance records.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto bg-card p-3 rounded-2xl shadow-sm border border-border">
            <div className="flex items-center px-4 space-x-2 text-sm font-semibold text-slate-600">
              <GraduationCap className="w-4 h-4 text-primary" />
              <span>{children.length} Enrolled Students</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {children.length === 0 ? (
          <Card className="bg-white border-dashed border-2 border-primary/20 p-12 text-center shadow-sm rounded-3xl max-w-2xl mx-auto mt-8">
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">No students enrolled yet</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              You haven't enrolled any students in the system yet. Start your enrollment process by clicking "New Enrollment" in the sidebar.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <Card 
                key={child.id} 
                className="group relative bg-white border-slate-200/60 rounded-3xl p-6 shadow-sm transition-all duration-300 hover:shadow-xl cursor-pointer overflow-hidden transform hover:-translate-y-1"
                onClick={() => onSelectChild(child.id)}
              >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-gradient-to-br from-primary/5 to-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 text-primary flex items-center justify-center font-bold text-2xl shadow-inner border border-primary/20">
                    {child.firstName.charAt(0)}{child.lastName.charAt(0)}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(child.status)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChildToDelete(child.id);
                      }}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Delete Profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 relative z-10">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                      {child.firstName} {child.lastName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-none rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider shadow-sm">
                        Grade {child.gradeLevel}
                      </Badge>
                      <Badge variant="outline" className="text-slate-500 border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider">
                        {child.gender}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-6 mt-4 border-t border-slate-100">
                    <div className="space-y-1 bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        Birthday
                      </p>
                      <p className="text-sm font-bold text-slate-700">
                        {new Date(child.birthDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="space-y-1 bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requirements</p>
                      <p className={`text-sm font-bold truncate ${child.requirements === 'Complete' ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {child.requirements}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-6 right-6 flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                  <span>View Details</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={childToDelete !== null} onOpenChange={(open) => {
        if (!open) setChildToDelete(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Enrollment Profile?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this child's enrollment profile? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setChildToDelete(null)}>
              Cancel
            </Button>
            <Button 
              variant="default"
              className="bg-rose-600 hover:bg-rose-700 text-white border-none"
              onClick={async () => {
                if (childToDelete) {
                  try {
                    await deleteChild(childToDelete);
                  } catch (e) {
                    console.error("Failed to delete child:", e);
                    alert("Failed to delete the enrollment profile. Please check your permissions or try again.");
                  } finally {
                    setChildToDelete(null);
                  }
                }
              }}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}