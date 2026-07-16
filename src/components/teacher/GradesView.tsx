import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/Table';
import { Save, CheckCircle2, FileSpreadsheet, Calculator } from 'lucide-react';
import { useTeacherData } from '../../lib/teacherData';



export function GradesView() {
  const { students, subjects, updateStudentGrade, loading } = useTeacherData();
  const enrolled = React.useMemo(() => students.filter((s) => s.status === 'Enrolled'), [students]);
  
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, string>>>({});
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (loading || subjects.length === 0) return;
    const map: Record<string, Record<string, string>> = {};
    enrolled.forEach((s) => {
      map[s.id] = {};
      subjects.forEach((sub) => {
        const code = sub.code ?? sub.name;
        map[s.id][code] = (s.grades as Record<string, unknown>)?.[code]?.toString() || '';
      });
    });
    setLocalGrades(map);
  }, [loading, enrolled, subjects]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const [studentId, grades] of Object.entries(localGrades)) {
        for (const [code, val] of Object.entries(grades)) {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            await updateStudentGrade(studentId, code, num);
          }
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving grades", error);
    } finally {
      setIsSaving(false);
    }
  };

  const getAvg = (studentId: string) => {
    const vals = Object.values(localGrades[studentId] || {})
      .map((v) => parseFloat(v))
      .filter((v) => !isNaN(v));
    return vals.length > 0
      ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
      : '--';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const encodedCount = enrolled.filter(s => getAvg(s.id) !== '--').length;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-8 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <FileSpreadsheet className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Grade Encoding</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              Encode and review numeric grades for each student across all subjects. The class average is calculated automatically.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto bg-card p-2 rounded-2xl shadow-sm border border-border">
            <div className="flex items-center px-4 space-x-2 text-sm font-semibold text-slate-600">
              <Calculator className="w-4 h-4 text-primary" />
              <span>{encodedCount} / {enrolled.length} Encoded</span>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <Button
              className="rounded-xl px-6 shadow-md transition-all active:scale-95"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Saving...
                </div>
              ) : saved ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Saved!
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save All Grades
                </div>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-md">
          <div className="p-5 border-b border-border flex items-center justify-between bg-white">
            <h3 className="font-bold text-lg text-slate-800">Class Grades</h3>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
              {subjects.length} Subjects
            </span>
          </div>
          <div className="overflow-x-auto bg-white/50">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-border">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="font-bold text-slate-700 pl-6 w-16">#</TableHead>
                  <TableHead className="font-bold text-slate-700 w-64">Learner Name</TableHead>
                  {subjects.map((sub) => (
                    <TableHead
                      key={sub.code ?? sub.name}
                      className="font-bold text-slate-700 text-center whitespace-nowrap px-4"
                    >
                      {sub.name}
                    </TableHead>
                  ))}
                  <TableHead className="font-bold text-slate-700 text-center whitespace-nowrap pr-6 w-32">
                    Average
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolled.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={subjects.length + 3} className="text-center py-12 text-muted-foreground">
                      No students currently enrolled in this section.
                    </TableCell>
                  </TableRow>
                ) : (
                  enrolled.map((s, idx) => (
                    <TableRow
                      key={s.id}
                      className="border-b border-border/40 hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell className="pl-6 text-slate-400 font-semibold">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center text-xs font-bold">
                            {s.firstName?.charAt(0) || ''}{s.lastName?.charAt(0) || ''}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-sm">
                              {s.lastName}, {s.firstName}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">{s.lrn}</span>
                          </div>
                        </div>
                      </TableCell>
                        {subjects.map((sub) => {
                          const code = sub.code ?? sub.name;
                          return (
                          <TableCell key={code} className="text-center px-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              className="w-16 h-9 font-mono text-center mx-auto text-sm border-slate-200 hover:border-primary focus:ring-primary/20 transition-all rounded-lg shadow-sm"
                              value={localGrades[s.id]?.[code] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                // Allow only numbers and one decimal point
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  if (parseFloat(val) > 100) return; // Cap at 100
                                  setLocalGrades({
                                    ...localGrades,
                                    [s.id]: {
                                      ...localGrades[s.id],
                                      [code]: val
                                    }
                                  });
                                  setSaved(false);
                                }
                              }}
                            />
                          </TableCell>
                          );
                        })}
                      <TableCell className="text-center pr-6">
                        <Badge
                          variant="secondary"
                          className="bg-slate-100 text-slate-700 font-mono text-sm px-3 py-1 border border-slate-200 shadow-sm rounded-lg"
                        >
                          {getAvg(s.id)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}