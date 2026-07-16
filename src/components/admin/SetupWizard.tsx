import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAdminData } from '../../lib/adminData';

export function SetupWizard() {
  const { 
    setSetupComplete,
    addClassroom,
    addSection,
    addSubject
  } = useAdminData();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Local state for wizard
  const [sy, setSy] = useState({
    startYear: '2025',
    endYear: '2026'
  });
  const [classrooms, setLocalClassrooms] = useState([
    { roomName: 'Room 101', roomType: 'Lecture' as 'Lecture' | 'Laboratory' | 'Multipurpose' }
  ]);
  const [sections, setLocalSections] = useState<{ name: string; classroomIndex?: number }[]>([
    { name: 'Section A' }
  ]);
  const [subjects, setLocalSubjects] = useState([
    { name: 'Mathematics', code: 'MATH101', gradeLevel: '1' }
  ]);

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      const academicYearStr = `${sy.startYear}-${sy.endYear}`;
      await setDoc(doc(db, 'settings', 'system'), {
        currentAcademicYear: academicYearStr,
        setupComplete: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSetupComplete(true);
    } catch (error) {
      console.error("Skip Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const academicYearStr = `${sy.startYear}-${sy.endYear}`;
      
      // 1. Save settings
      await setDoc(doc(db, 'settings', 'system'), {
        currentAcademicYear: academicYearStr,
        setupComplete: true,
        updatedAt: serverTimestamp()
      });

      // 2. Save classrooms and get IDs
      const classroomIds: string[] = [];
      for (const c of classrooms) {
        const docRef = await addClassroom({
          roomName: c.roomName,
          roomType: c.roomType,
          status: 'Available',
          gradeLevel: '1', // Default during setup
          academicYear: academicYearStr
        });
        if (docRef) classroomIds.push(docRef);
      }

      const firstClassroomId = classroomIds.length > 0 ? classroomIds[0] : 'unassigned';

      // 3. Save sections
      for (const s of sections) {
        await addSection({
          name: s.name,
          classroomId: firstClassroomId,
          status: 'Active',
          gradeLevel: '1' // Default
        });
      }

      // 4. Save subjects
      for (const s of subjects) {
        await addSubject({
          name: s.name,
          code: s.code,
          gradeLevel: s.gradeLevel,
          academicYear: academicYearStr,
          status: 'Active'
        });
      }

      setSetupComplete(true);
    } catch (error) {
      console.error("Setup Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 via-white to-primary/5 flex items-center justify-center p-4">
      {/* Premium grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Logo header */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-5 py-3 rounded-2xl shadow-sm border border-slate-200/60">
            <img
              src="/pasted-image.jpg"
              alt="Logo"
              className="w-9 h-9 rounded-xl object-cover shadow-sm border border-slate-200/60"
            />
            <div className="leading-tight">
              <p className="font-bold text-slate-900 text-base tracking-tight">Sta. Maria Admin Setup</p>
              <p className="text-xs text-slate-400 font-medium">Initial System Configuration</p>
            </div>
          </div>
        </div>

        {/* Step progress indicator */}
        <div className="flex items-center justify-center mb-8 px-4 gap-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm ${
                  step > i
                    ? 'bg-emerald-500 text-white shadow-emerald-200'
                    : step === i
                    ? 'bg-primary text-primary-foreground shadow-primary/20 scale-110'
                    : 'bg-white text-slate-400 border-2 border-slate-200'
                }`}
              >
                {step > i ? <CheckCircle2 className="w-4 h-4" /> : i}
              </div>
              {i < 5 && (
                <div
                  className={`h-1 w-10 sm:w-16 rounded-full transition-all duration-500 ${
                    step > i ? 'bg-emerald-400' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-xl shadow-slate-200/50 overflow-hidden relative min-h-[420px] rounded-3xl">
          <AnimatePresence mode="wait" custom={1}>
            {step === 1 &&
            <motion.div
              key="step1"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.3
              }}
              className="p-4 sm:p-8 h-full flex flex-col">
              
                <h2 className="text-xl sm:text-2xl font-bold mb-2">
                  Set School Year
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                  Initialize the foundational academic year.
                </p>
                <div className="space-y-4 flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Year</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={sy.startYear}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*$/.test(val)) {
                            setSy({ ...sy, startYear: val });
                          }
                        }}
                        placeholder="e.g. 2025" />
                    </div>
                    <div className="space-y-2">
                      <Label>End Year</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={sy.endYear}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*$/.test(val)) {
                            setSy({ ...sy, endYear: val });
                          }
                        }}
                        placeholder="e.g. 2026" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between pt-6 mt-auto">
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto text-slate-500 hover:text-slate-700">
                    Skip Setup
                  </Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto">
                    Next Step <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            }

            {step === 2 &&
            <motion.div
              key="step2"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.3
              }}
              className="p-4 sm:p-8 h-full flex flex-col">
              
                <h2 className="text-xl sm:text-2xl font-bold mb-2">
                  Create Classrooms
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                  Add the main grade levels or classroom groups.
                </p>
                <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                  {classrooms.map((c, i) =>
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-muted/30">
                  
                      <div className="space-y-2">
                        <Label>Room Name</Label>
                        <Input
                      value={c.roomName}
                      onChange={(e) => {
                        const newC = [...classrooms];
                        newC[i].roomName = e.target.value;
                        setLocalClassrooms(newC);
                      }} />
                      </div>
                      <div className="space-y-2">
                        <Label>Room Type</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          value={c.roomType}
                          onChange={(e) => {
                            const newC = [...classrooms];
                            newC[i].roomType = e.target.value as 'Lecture' | 'Laboratory' | 'Multipurpose';
                            setLocalClassrooms(newC);
                          }}
                        >
                          <option value="Lecture">Lecture</option>
                          <option value="Laboratory">Laboratory</option>
                          <option value="Multipurpose">Multipurpose</option>
                        </select>
                      </div>
                    </div>
                )}
                  <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() =>
                  setLocalClassrooms([
                  ...classrooms,
                  {
                    roomName: '',
                    roomType: 'Lecture'
                  }]
                  )
                  }>
                  
                    + Add Another Classroom
                  </Button>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 mt-auto">
                  <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto">
                  
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                  onClick={() => setStep(3)}
                  className="w-full sm:w-auto">
                  
                    Next Step <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            }

            {step === 3 &&
            <motion.div
              key="step3"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.3
              }}
              className="p-4 sm:p-8 h-full flex flex-col">
              
                <h2 className="text-xl sm:text-2xl font-bold mb-2">
                  Create Sections
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                  Divide classrooms into specific sections.
                </p>
                <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                  {sections.map((s, i) =>
                <div
                  key={i}
                  className="space-y-2 p-4 border border-border rounded-lg bg-muted/30">
                  
                      <Label>Section Name</Label>
                      <Input
                    value={s.name}
                    onChange={(e) => {
                      const newS = [...sections];
                      newS[i].name = e.target.value;
                      setLocalSections(newS);
                    }}
                    placeholder="e.g. Section A" />
                  
                    </div>
                )}
                  <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() =>
                  setLocalSections([
                  ...sections,
                  {
                    name: '',
                    classroomIndex: 0
                  }]
                  )
                  }>
                  
                    + Add Another Section
                  </Button>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 mt-auto">
                  <Button
                  variant="ghost"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto">
                  
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                  onClick={() => setStep(4)}
                  className="w-full sm:w-auto">
                  
                    Next Step <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            }

            {step === 4 &&
            <motion.div
              key="step4"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.3
              }}
              className="p-4 sm:p-8 h-full flex flex-col">
              
                <h2 className="text-xl sm:text-2xl font-bold mb-2">
                  Create Subjects
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
                  Define the curriculum subjects.
                </p>
                <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                  {subjects.map((s, i) =>
                <div
                  key={i}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-muted/30">
                  
                      <div className="space-y-2">
                        <Label>Subject Name</Label>
                        <Input
                      value={s.name}
                      onChange={(e) => {
                        const newS = [...subjects];
                        newS[i].name = e.target.value;
                        setLocalSubjects(newS);
                      }} />
                    
                      </div>
                      <div className="space-y-2">
                        <Label>Subject Code</Label>
                        <Input
                      value={s.code}
                      onChange={(e) => {
                        const newS = [...subjects];
                        newS[i].code = e.target.value;
                        setLocalSubjects(newS);
                      }} />
                    
                      </div>
                      <div className="space-y-2">
                        <Label>Grade Level</Label>
                        <Input
                      value={s.gradeLevel}
                      onChange={(e) => {
                        const newS = [...subjects];
                        newS[i].gradeLevel = e.target.value;
                        setLocalSubjects(newS);
                      }} />
                      </div>
                    </div>
                )}
                  <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() =>
                  setLocalSubjects([
                  ...subjects,
                  {
                    name: '',
                    code: '',
                    gradeLevel: '1'
                  }]
                  )
                  }>
                  
                    + Add Another Subject
                  </Button>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 pt-6 mt-auto">
                  <Button
                  variant="ghost"
                  onClick={() => setStep(3)}
                  className="w-full sm:w-auto">
                  
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                  onClick={() => setStep(5)}
                  className="w-full sm:w-auto">
                  
                    Review <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            }

            {step === 5 &&
            <motion.div
              key="step5"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                duration: 0.3
              }}
              className="p-4 sm:p-8 h-full flex flex-col items-center justify-center text-center">
              
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">
                  Ready to Initialize
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-md">
                  You are about to initialize the system for SY {sy.startYear}-{sy.endYear} with{' '}
                  {classrooms.length} classrooms, {sections.length} sections,
                  and {subjects.length} subjects.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-auto w-full sm:w-auto">
                  <Button
                  variant="ghost"
                  onClick={() => setStep(4)}
                  className="w-full sm:w-auto"
                  disabled={isSubmitting}>
                  
                    Review Changes
                  </Button>
                  <Button
                  onClick={handleComplete}
                  className="w-full sm:w-auto sm:px-8"
                  disabled={isSubmitting}>
                  
                    {isSubmitting ? 'Saving...' : 'Complete Setup'}
                  </Button>
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </Card>
      </div>
    </div>);

}