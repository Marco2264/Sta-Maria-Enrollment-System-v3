import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  UserPlus,
  UserCheck,
  MapPin,
  Users,
  FileUp,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  Clock,
  Lock,
  Smartphone,
  Check,
  GraduationCap,
  Sparkles,
  School,
  LucideIcon
} from 'lucide-react';

interface StepData {
  id: number;
  badge: string;
  title: string;
  shortDesc: string;
  tag: string;
  icon: LucideIcon;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
}

const STEPS: StepData[] = [
  {
    id: 1,
    badge: 'Step 01',
    title: 'Create Parent Account',
    shortDesc: 'Register your parent portal account with name, contact number, and secure password to get started.',
    tag: '~2 Mins',
    icon: UserPlus,
    accentColor: '#D8232A',
    badgeBg: 'bg-red-50 border-red-200',
    badgeText: 'text-[#D8232A]'
  },
  {
    id: 2,
    badge: 'Step 02',
    title: 'Learner Information & LRN',
    shortDesc: 'Enter student details, grade level, classification (New, Transferee, or Balik-Aral), and 12-digit DepEd LRN.',
    tag: 'LRN Auto-Check',
    icon: UserCheck,
    accentColor: '#4f46e5',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-600'
  },
  {
    id: 3,
    badge: 'Step 03',
    title: 'Residence & Health Profile',
    shortDesc: 'Provide household address information and medical/SPED support needs for tailored learner accommodations.',
    tag: 'SPED & Medical',
    icon: MapPin,
    accentColor: '#059669',
    badgeBg: 'bg-emerald-50 border-emerald-200',
    badgeText: 'text-emerald-700'
  },
  {
    id: 4,
    badge: 'Step 04',
    title: 'Parent & Guardian Details',
    shortDesc: 'Record father, mother, or designated guardian emergency contact details for school communications.',
    tag: 'Guardian Info',
    icon: Users,
    accentColor: '#7c3aed',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-700'
  },
  {
    id: 5,
    badge: 'Step 05',
    title: 'Upload Supporting Documents',
    shortDesc: 'Attach PSA Birth Certificate, SF-9/SF-10 report card, and 2x2 ID photo directly through the Document Center.',
    tag: 'Document Vault',
    icon: FileUp,
    accentColor: '#d97706',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-700'
  },
  {
    id: 6,
    badge: 'Step 06',
    title: 'Review, Submit & Verification',
    shortDesc: 'Review all encoded data, submit your application, and track real-time enrollment status updates directly on your parent account.',
    tag: 'Official Admission',
    icon: FileCheck,
    accentColor: '#e11d48',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700'
  }
];

export function RegistrationProcessShowcase() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);
  const [progress, setProgress] = useState(0);

  const STEP_DURATION = 6000; // 6 seconds per step

  // Continuous auto-progress cycler (runs dynamically without stopping on hover)
  useEffect(() => {
    const interval = 50;
    const increment = (interval / STEP_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveStep((current) => (current % STEPS.length) + 1);
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [activeStep]);

  const handleStepClick = (stepId: number) => {
    setActiveStep(stepId);
    setProgress(0);
  };

  const currentStepData = STEPS.find((s) => s.id === activeStep) || STEPS[0];

  return (
    <div className="w-full space-y-8 sm:space-y-12">
      {/* ── SECTION HEADER (Matches other landing sections) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4 px-2"
      >
        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-red-50 border border-red-100 text-[#D8232A] text-[10px] sm:text-xs font-black uppercase tracking-wider">
          <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Step-by-Step Registration</span>
        </div>
        <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl uppercase font-black text-slate-900 tracking-tight leading-[1.08]">
          Step-by-Step Registration Process
        </h2>
        <p className="text-slate-500 text-xs sm:text-base md:text-lg font-medium max-w-2xl mx-auto leading-relaxed">
          Follow our simplified, paperless workflow to register your account, submit student requirements, and track official enrollment seamlessly.
        </p>
      </motion.div>

      {/* ── MAIN INTERACTIVE CONTAINER (Always dynamically progressing) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-stretch">
        {/* ── LEFT COLUMN: STEP SELECTOR RAIL (5 Cols) ── */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="space-y-2 sm:space-y-2.5">
            {STEPS.map((step) => {
              const isActive = activeStep === step.id;
              const IconComp = step.icon;

              return (
                <div
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  className={`group relative overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 transition-all duration-300 cursor-pointer border text-left ${
                    isActive
                      ? 'bg-white shadow-[0_10px_25px_rgba(0,0,0,0.06)] border-[#D8232A]/30 ring-2 ring-[#D8232A]/10'
                      : 'bg-white/70 hover:bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Active Progress Bar (Top border animated indicator) */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-red-50 overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-[#D8232A] to-red-500"
                        style={{ width: `${progress}%` }}
                        transition={{ ease: 'linear' }}
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Step Icon Badge */}
                    <div
                      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isActive
                          ? 'bg-[#D8232A] text-white shadow-md shadow-red-500/25 scale-105'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-red-50 group-hover:text-[#D8232A]'
                      }`}
                    >
                      <IconComp className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>

                    {/* Step Text Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                        <span
                          className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                            isActive ? 'text-[#D8232A]' : 'text-slate-400'
                          }`}
                        >
                          {step.badge}
                        </span>
                        <span
                          className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold tracking-tight border ${
                            isActive
                              ? 'bg-red-50 text-[#D8232A] border-red-100'
                              : 'bg-slate-100 text-slate-600 border-slate-200/60'
                          }`}
                        >
                          {step.tag}
                        </span>
                      </div>

                      <h3
                        className={`text-xs sm:text-sm md:text-base font-black tracking-tight leading-snug transition-colors ${
                          isActive ? 'text-slate-950' : 'text-slate-700 group-hover:text-slate-900'
                        }`}
                      >
                        {step.title}
                      </h3>

                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1.5 sm:mt-2"
                        >
                          {step.shortDesc}
                        </motion.p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick CTA Rail Footer */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => navigate('/signup')}
              className="w-full py-3.5 px-5 sm:px-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#D8232A] to-red-600 hover:from-red-600 hover:to-[#D8232A] text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus size={16} />
              <span>Start Online Registration</span>
              <ArrowRight size={14} className="opacity-80" />
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN: LIVE 3D INTERACTIVE SIMULATOR VIEWPORT (7 Cols - LIGHT PALETTE) ── */}
        <div className="lg:col-span-7 flex">
          <SimulatorViewport step={currentStepData} />
        </div>
      </div>

      {/* ── SLEEK SAAS TELEMETRY PROOF GRID (CLEAN VECTOR ICONS, MATCHING LIGHT THEME) ── */}
      <div className="pt-6 border-t border-slate-200/80">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-4 hover:border-slate-300 transition-all">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-black text-slate-900 truncate">&lt; 5 Min Process</p>
              <p className="text-[9px] sm:text-[11px] text-slate-500 font-medium leading-tight">Average completion time</p>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-4 hover:border-slate-300 transition-all">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-black text-slate-900 truncate">100% Paperless</p>
              <p className="text-[9px] sm:text-[11px] text-slate-500 font-medium leading-tight">DepEd SF standard ready</p>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-4 hover:border-slate-300 transition-all">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-black text-slate-900 truncate">Encrypted Storage</p>
              <p className="text-[9px] sm:text-[11px] text-slate-500 font-medium leading-tight">Protected student records</p>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-2.5 sm:gap-4 hover:border-slate-300 transition-all">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-black text-slate-900 truncate">Multi-Device</p>
              <p className="text-[9px] sm:text-[11px] text-slate-500 font-medium leading-tight">Phone, tablet, desktop</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 3D SIMULATOR VIEWPORT (LIGHT-MODE MATCHING THE LANDING PAGE) ────────────
function SimulatorViewport({ step }: { step: StepData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 350, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 350, damping: 25 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['4deg', '-4deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-4deg', '4deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || window.innerWidth < 1024) return;
    const rect = cardRef.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className="relative w-full rounded-2xl sm:rounded-[2.5rem] bg-gradient-to-b from-slate-50 via-white to-slate-50 p-1 sm:p-2 shadow-[0_20px_60px_rgba(15,23,42,0.08)] border border-slate-200/90 flex flex-col justify-between min-h-[430px] sm:min-h-[500px] overflow-hidden"
    >
      {/* Subtle ambient lighting accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-slate-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Top Simulator Browser Header (Clean Light Chrome) */}
      <div className="relative z-10 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md rounded-t-xl sm:rounded-t-[2.2rem]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400" />
          <div className="ml-1 sm:ml-2 px-2.5 sm:px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-[10px] sm:text-[11px] font-bold text-slate-600 font-mono tracking-tight hidden sm:flex items-center gap-1.5">
            <Lock size={11} className="text-emerald-600" />
            <span>portal.stamariasped.ph/enrollment</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live Form Preview</span>
        </div>
      </div>

      {/* Dynamic Simulated UI Canvas */}
      <div className="relative z-10 p-3.5 sm:p-6 lg:p-8 flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-lg"
          >
            {renderStepSimulation(step.id)}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Simulator Footer Bar */}
      <div className="relative z-10 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-slate-100/70 border-t border-slate-200/80 rounded-b-xl sm:rounded-b-[2.2rem] flex flex-col sm:flex-row gap-1 sm:gap-0 items-start sm:items-center justify-between text-[10px] sm:text-[11px] font-bold text-slate-500">
        <span className="flex items-center gap-1.5 text-slate-700 truncate">
          <School size={14} className="text-[#D8232A] shrink-0" />
          Sta. Maria Elementary SPED Center
        </span>
        <span className="text-slate-600 font-medium">DepEd S.Y. 2026–2027</span>
      </div>
    </motion.div>
  );
}

// ── STEP MOCKUPS GENERATOR (ACCURATE TO THE REAL ENROLLMENT FORM & LIGHT THEME) ──
function renderStepSimulation(stepId: number) {
  switch (stepId) {
    case 1:
      // STEP 1: CREATE PARENT ACCOUNT
      return (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.05)] space-y-3 sm:space-y-4 text-left">
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 text-[#D8232A] flex items-center justify-center font-black">
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900">Parent Registration</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Guardian Account Creation</p>
              </div>
            </div>
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] sm:text-[10px] font-bold uppercase">
              Step 1 of 6
            </span>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <div>
              <label className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Parent / Guardian Name</label>
              <div className="mt-1 p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-900 flex items-center justify-between">
                <span>Maria Santos Dela Cruz</span>
                <Check size={14} className="text-emerald-600 shrink-0 ml-2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Relationship</label>
                <div className="mt-1 p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-900">
                  Mother
                </div>
              </div>
              <div>
                <label className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Mobile Number</label>
                <div className="mt-1 p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-900">
                  0917 882 1940
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold text-slate-500">
                <span>Password Security Strength</span>
                <span className="text-emerald-600">Strong (100%)</span>
              </div>
              <div className="mt-1 sm:mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 w-full rounded-full" />
              </div>
            </div>
          </div>
        </div>
      );

    case 2:
      // STEP 2: LEARNER INFORMATION & LRN
      return (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.05)] space-y-3 sm:space-y-4 text-left">
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900">Learner Information</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">DepEd Student Record</p>
              </div>
            </div>
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] sm:text-[10px] font-bold uppercase">
              Step 2 of 6
            </span>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <div className="p-2.5 sm:p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-indigo-700">DepEd 12-Digit LRN</span>
                <span className="text-[9px] sm:text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <Check size={12} /> Valid Format
                </span>
              </div>
              <p className="text-xs sm:text-sm font-mono font-bold tracking-widest text-indigo-950">108293847291</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Grade Level</label>
                <div className="mt-1 p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-900">
                  Grade 3 (Regular / SPED)
                </div>
              </div>
              <div>
                <label className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Classification</label>
                <div className="mt-1 p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-900">
                  New Student / Transferee
                </div>
              </div>
            </div>

            <div>
              <label className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Student Name</label>
              <div className="mt-1 p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-900">
                Juan Santos Dela Cruz
              </div>
            </div>
          </div>
        </div>
      );

    case 3:
      // STEP 3: RESIDENCE & HEALTH PROFILE (SPED & Medical)
      return (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.05)] space-y-3 sm:space-y-4 text-left">
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900">Residence & Health Profile</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Household & Support Assessment</p>
              </div>
            </div>
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] sm:text-[10px] font-bold uppercase">
              Step 3 of 6
            </span>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <div>
              <label className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Residential Address</label>
              <div className="mt-1 p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-900">
                Barangay Sta. Maria, Zamboanga City
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500">4Ps Beneficiary</p>
                <p className="text-[11px] sm:text-xs font-bold text-slate-900 mt-0.5">Yes, Registered</p>
              </div>
              <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Learner Support</p>
                <p className="text-[11px] sm:text-xs font-bold text-emerald-600 mt-0.5">SPED Accommodated</p>
              </div>
            </div>

            <div className="p-2 sm:p-2.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between text-[11px] sm:text-xs">
              <span className="text-emerald-800 font-medium">Health Status:</span>
              <span className="font-bold text-emerald-700">Complete / Updated</span>
            </div>
          </div>
        </div>
      );

    case 4:
      // STEP 4: PARENT & GUARDIAN DETAILS
      return (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.05)] space-y-3 sm:space-y-4 text-left">
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900">Parent & Guardian Details</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Authorized Emergency Contacts</p>
              </div>
            </div>
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[9px] sm:text-[10px] font-bold uppercase">
              Step 4 of 6
            </span>
          </div>

          <div className="space-y-2 sm:space-y-2.5">
            <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Mother / Guardian</span>
                <span className="text-[9px] sm:text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Primary</span>
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-900">Maria Santos Dela Cruz</p>
              <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono">Contact: 0917 882 1940</p>
            </div>

            <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-0.5">
              <div className="flex justify-between items-center">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Father</span>
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-900">Roberto Gomez Dela Cruz</p>
              <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono">Contact: 0928 554 2190</p>
            </div>
          </div>
        </div>
      );

    case 5:
      // STEP 5: UPLOAD SUPPORTING DOCUMENTS
      return (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.05)] space-y-3 sm:space-y-4 text-left">
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                <FileUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900">Document Upload Vault</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">DepEd Requirements Ingestion</p>
              </div>
            </div>
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] sm:text-[10px] font-bold uppercase">
              Step 5 of 6
            </span>
          </div>

          <div className="space-y-2 sm:space-y-2.5">
            {[
              { name: 'PSA Birth Certificate', size: '1.8 MB • PDF', status: 'Uploaded' },
              { name: 'Report Card (SF-9 / Form 138)', size: '2.4 MB • PDF', status: 'Uploaded' },
              { name: '2x2 Recent Student Photo', size: '820 KB • JPG', status: 'Uploaded' }
            ].map((doc, idx) => (
              <div
                key={idx}
                className="p-2.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs font-bold text-slate-900 truncate">{doc.name}</p>
                    <p className="text-[9px] sm:text-[10px] text-slate-400">{doc.size}</p>
                  </div>
                </div>
                <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 sm:px-2 py-0.5 rounded-md shrink-0">
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case 6:
    default:
      // STEP 6: REVIEW, SUBMIT & VERIFICATION
      return (
        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.05)] space-y-3 sm:space-y-4 text-left">
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 text-[#D8232A] flex items-center justify-center font-black">
                <FileCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-900">Application Submitted</p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">Registrar Verification Queue</p>
              </div>
            </div>
            <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] sm:text-[10px] font-bold uppercase">
              Confirmed
            </span>
          </div>

          <div className="p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200 space-y-1.5 sm:space-y-2">
            <div className="flex justify-between text-[11px] sm:text-xs font-medium">
              <span className="text-slate-500">Tracking Code:</span>
              <span className="font-mono text-[#D8232A] font-bold">STA-2026-8849</span>
            </div>
            <div className="flex justify-between text-[11px] sm:text-xs font-medium">
              <span className="text-slate-500">Student:</span>
              <span className="text-slate-900 font-bold">Juan Santos Dela Cruz</span>
            </div>
            <div className="flex justify-between text-[11px] sm:text-xs font-medium">
              <span className="text-slate-500">Grade Level:</span>
              <span className="text-slate-900 font-bold">Grade 3 • SPED Center</span>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 bg-red-50/70 border border-red-200/80 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-2.5">
            <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#D8232A] shrink-0" />
            <p className="text-[11px] sm:text-xs font-bold text-red-950 leading-snug">
              Registration Under Registrar Evaluation. Status updates directly on your parent account.
            </p>
          </div>
        </div>
      );
  }
}
