import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { RegistrationProcessShowcase } from '../components/landing/RegistrationProcessShowcase';
import {
  Users, LineChart, ClipboardCheck, Megaphone, ClipboardList, Settings,
  UserPlus, LayoutDashboard, ClipboardEdit, Send, ShieldCheck, PartyPopper,
  LogIn, Menu, X, Check, GraduationCap, ArrowRight, LucideIcon, Sparkles,
  School, CheckCircle2, ChevronLeft, ChevronRight, BarChart3, FileCheck,
  FileText, Bell, Layers, Database, ArrowUpRight, Award, Calendar, Clock
} from 'lucide-react';

// Icon lookup map for string-keyed icon names
const ICON_MAP: Record<string, LucideIcon> = {
  'lucide:users':            Users,
  'lucide:line-chart':       LineChart,
  'lucide:clipboard-check':  ClipboardCheck,
  'lucide:megaphone':        Megaphone,
  'lucide:clipboard-list':   ClipboardList,
  'lucide:settings':         Settings,
  'lucide:user-plus':        UserPlus,
  'lucide:layout-dashboard': LayoutDashboard,
  'lucide:clipboard-edit':   ClipboardEdit,
  'lucide:send':             Send,
  'lucide:shield-check':     ShieldCheck,
  'lucide:party-popper':     PartyPopper,
  'lucide:graduation-cap':   GraduationCap,
  'lucide:check':            Check,
  'lucide:x':                X,
  'lucide:log-in':           LogIn,
};

function Icon({ name, size = 20, className = '' }: { name: string; size?: number; className?: string }) {
  const Comp = ICON_MAP[name];
  return Comp ? <Comp size={size} className={className} /> : null;
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface FeatureData {
  icon: string;
  color: string;
  title: string;
  desc: string;
  benefits: string[];
}

const featureData: Record<string, FeatureData> = {
  'parent-hub': {
    icon: 'lucide:users', color: 'primary', title: 'Parent Portal',
    desc: "The Parent Portal empowers parents and guardians with instant access to important student information. From monitoring academic performance to receiving school announcements, parents can stay informed and actively support their child's education anytime and anywhere.",
    benefits: [
      'Real-time grade monitoring', 'Daily attendance updates', 'Online enrollment access',
      'School announcements and notices', 'Student performance tracking',
      'Academic progress reports', 'Parent-friendly dashboard', 'Mobile-accessible platform',
    ],
  },
  'student-insight': {
    icon: 'lucide:line-chart', color: 'indigo-600', title: 'Student Performance Monitoring',
    desc: 'Gain valuable insights into student learning and development. This feature provides a complete overview of academic performance, helping parents and teachers track progress across DepEd 3-Term grading periods and support continuous improvement.',
    benefits: [
      'Academic performance tracking', 'DepEd 3-Term grade monitoring (Term 1, 2, 3)', 'Attendance analytics',
      'Learning progress reports', 'Student achievement records', 'Performance history archive',
      'Easy-to-read summaries', 'Data-driven student insights',
    ],
  },
  'smart-uploads': {
    icon: 'lucide:clipboard-check', color: 'red-600', title: 'Digital Enrollment',
    desc: 'Designed to eliminate long queues and manual paperwork, the Digital Enrollment module allows parents to register students, submit information, and monitor enrollment status through a convenient online platform.',
    benefits: [
      'Online student registration', 'Secure information submission', 'Enrollment status monitoring',
      'Digital student records', 'Faster processing time', 'Reduced paperwork',
      'Organized enrollment database', 'Convenient application management',
    ],
  },
  'live-bulletins': {
    icon: 'lucide:megaphone', color: 'amber-600', title: 'School Communication Center',
    desc: 'Keep the entire school community connected through timely communication. Parents, teachers, and administrators can easily access important announcements, upcoming activities, and academic reminders.',
    benefits: [
      'School-wide announcements', 'Event notifications', 'Academic reminders',
      'Emergency updates', 'School calendar information', 'Parent notifications',
      'Activity announcements', 'Centralized communication platform',
    ],
  },
  'vault-security': {
    icon: 'lucide:clipboard-list', color: 'emerald-600', title: 'Teacher Productivity Suite',
    desc: 'The Teacher Productivity Suite streamlines classroom and administrative responsibilities through automation and digital record management. Teachers can efficiently manage student information, attendance, reports, and school forms with fewer manual processes.',
    benefits: [
      'Automated school forms', 'Digital attendance management', 'Student record organization',
      'Faster report generation', 'Reduced administrative workload', 'Simplified documentation',
      'Centralized classroom records', 'Improved workflow efficiency',
    ],
  },
  'agile-ops': {
    icon: 'lucide:settings', color: 'rose-600', title: 'Smart School Administration',
    desc: 'A comprehensive administrative solution designed to support teachers and school personnel in handling daily operations efficiently. By centralizing school data and automating repetitive processes, the system helps improve productivity and accuracy.',
    benefits: [
      'Schedule management', 'Attendance sheet generation', 'Student information management',
      'Digital record keeping', 'Administrative reporting tools', 'Organized school database',
      'Workflow automation', 'Efficient data management',
    ],
  },
};

// ── 3D Tilt Card for Feature & Timeline Items ──────────────────────────────────
function TiltCard({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 25 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / rect.width - 0.5);
    y.set(mouseY / rect.height - 0.5);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`relative rounded-[2rem] transition-all cursor-pointer ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[2rem] z-20 mix-blend-overlay opacity-60"
        style={{
          background: useTransform(
            () => `radial-gradient(circle at ${(x.get() + 0.5) * 100}% ${(y.get() + 0.5) * 100}%, rgba(255,255,255,0.7) 0%, transparent 60%)`
          )
        }}
      />
      <div style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }} className="w-full h-full relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

// ── Clean & Unobscured Floating Hero Photo Composition (Static to Cursor) ──────
function HeroPhotoComposition() {
  return (
    <div className="hidden lg:flex relative h-[620px] w-full items-center justify-center select-none pointer-events-none">
      <div className="relative w-full h-full flex items-center justify-center">
        
        {/* 1. Main Centerpiece Campus Photo */}
        <div className="absolute z-20 lp-floating-main shadow-[0_30px_60px_-10px_rgba(0,0,0,0.22)] rounded-[2.5rem] overflow-hidden border-[5px] border-white bg-white">
          <img
            src="/images/sta_maria_new.jpg"
            onError={(e) => { e.currentTarget.src = '/images/sta_maria_bg.jpg'; }}
            alt="Sta Maria Central School Main Campus"
            className="w-76 h-[400px] object-cover pointer-events-none"
          />
        </div>

        {/* 2. Floating Top-Left School Crest Badge */}
        <div className="absolute top-10 -left-6 z-30 lp-floating-alt-3 shadow-[0_20px_40px_rgba(0,0,0,0.18)] rounded-full overflow-hidden border-[4px] border-white bg-white w-24 h-24 flex items-center justify-center">
          <img
            src="/images/sta_maria_school_logo.jpg"
            alt="School Crest Logo"
            className="w-full h-full object-cover pointer-events-none"
          />
        </div>

        {/* 3. Floating Top-Right Satellite Photo */}
        <div className="absolute -top-4 -right-12 z-10 lp-floating-alt-1 shadow-[0_20px_45px_rgba(0,0,0,0.14)] rounded-3xl overflow-hidden border-[4px] border-white transform rotate-6 bg-white">
          <img
            src="/images/hero_bg_2.jpg"
            alt="Learners at Sta. Maria"
            className="w-56 h-40 object-cover pointer-events-none"
          />
        </div>

        {/* 4. Floating Bottom-Left Satellite Photo */}
        <div className="absolute -bottom-8 -left-12 z-10 lp-floating-alt-2 shadow-[0_25px_50px_rgba(0,0,0,0.16)] rounded-3xl overflow-hidden border-[4px] border-white transform -rotate-6 bg-white">
          <img
            src="/images/hero_bg_3.jpg"
            alt="Classroom & Learning Activities"
            className="w-64 h-44 object-cover pointer-events-none"
          />
        </div>

        {/* 5. Floating Bottom-Right Satellite Photo */}
        <div
          className="absolute -bottom-6 -right-6 z-30 lp-floating-main shadow-[0_20px_40px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden border-[4px] border-white transform rotate-12 bg-white"
          style={{ animationDelay: '-3s' }}
        >
          <img
            src="/images/blaba.jpg"
            alt="School Activity"
            className="w-48 h-36 object-cover pointer-events-none"
          />
        </div>

      </div>
    </div>
  );
}

// ── 3D Feature Showcase Slides Definition ──────────────────────────────────────
interface FeatureSlide {
  key: string;
  tabLabel: string;
  badge: string;
  title: string;
  desc: string;
  highlights: string[];
  color: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  iconName: string;
}

const FEATURE_SLIDES: FeatureSlide[] = [
  {
    key: 'parent-hub',
    tabLabel: 'Parent Portal',
    badge: 'Real-Time Guardian Hub',
    title: 'Your Child’s Education, Tracked in Real-Time',
    desc: 'Empowers parents and guardians with continuous, transparent access to learner grades, live daily attendance, school announcements, and digital requirements.',
    highlights: [
      'Live Subject Grades & Quarterly Honor Standing',
      'Daily Attendance Clock-in & Absence Alerts',
      'Instant Document Verification & Status Tracking'
    ],
    color: '#D8232A',
    accentBg: 'bg-red-50',
    accentText: 'text-[#D8232A]',
    accentBorder: 'border-red-100',
    iconName: 'lucide:users'
  },
  {
    key: 'student-insight',
    tabLabel: 'Performance',
    badge: 'Academic Analytics',
    title: 'Visual Insights into Learning & Progress',
    desc: 'Transforms complex grading sheets into easy-to-understand visual progress reports. Identify subject strengths, track term-by-term performance (Terms 1, 2, and 3), and support student success.',
    highlights: [
      '3-Term Progression (Term 1, Term 2, Term 3)',
      'Subject-by-Subject Mastery & Rating Breakdown',
      'Automated Honor Roll & Academic Standing'
    ],
    color: '#4F46E5',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-600',
    accentBorder: 'border-indigo-100',
    iconName: 'lucide:line-chart'
  },
  {
    key: 'smart-uploads',
    tabLabel: 'Enrollment',
    badge: 'Zero-Paperwork Online',
    title: 'Fast, Hassle-Free Digital Registration',
    desc: 'Eliminate long campus queues and manual paper handling. Submit student requirements online, monitor registrar approvals, and secure official enrollment.',
    highlights: [
      'Digital PSA, SF9, & Medical Document Uploads',
      'Automated Document Verification Workflows',
      'Instant Application Status Notifications'
    ],
    color: '#059669',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-600',
    accentBorder: 'border-emerald-100',
    iconName: 'lucide:clipboard-check'
  },
  {
    key: 'live-bulletins',
    tabLabel: 'Broadcasts',
    badge: 'Campus Communication',
    title: 'Instant Multi-Channel School Announcements',
    desc: 'Keep the entire school community unified and informed. Receive urgent weather advisories, PTA assembly notices, and academic reminders in one central feed.',
    highlights: [
      'Urgent Class Suspension & Weather Alerts',
      'General PTA Assemblies & Campus Event Schedules',
      'Multi-Channel Web & Portal Broadcasts'
    ],
    color: '#D97706',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-600',
    accentBorder: 'border-amber-100',
    iconName: 'lucide:megaphone'
  },
  {
    key: 'vault-security',
    tabLabel: 'Teacher Suite',
    badge: 'Educator Productivity',
    title: 'Automated Official DepEd Forms & Grading',
    desc: 'Relieve educators from tedious manual paperwork. Automatically compute grades, record daily attendance, and generate official DepEd forms in a single click.',
    highlights: [
      '1-Click Export for DepEd SF1, SF2, & SF9',
      'Automated Quarterly Grade & Weight Calculations',
      'Centralized Class Masterlists & Learner Data'
    ],
    color: '#0284C7',
    accentBg: 'bg-sky-50',
    accentText: 'text-sky-600',
    accentBorder: 'border-sky-100',
    iconName: 'lucide:clipboard-list'
  },
  {
    key: 'agile-ops',
    tabLabel: 'Administration',
    badge: 'Smart School Management',
    title: 'Centralized Administrative Control & Operations',
    desc: 'A unified operations platform for school administrators. Monitor campus enrollment quotas, manage sectioning, oversee faculty rosters, and sync cloud data.',
    highlights: [
      'Real-Time Enrollment Capacity & Demographics',
      'Automated Sectioning & Class Allocations',
      'High-Security Cloud Database Architecture'
    ],
    color: '#E11D48',
    accentBg: 'bg-rose-50',
    accentText: 'text-rose-600',
    accentBorder: 'border-rose-100',
    iconName: 'lucide:settings'
  }
];

// ── 3D Live UI Mockups for Feature Slides ─────────────────────────────────────
function FeatureMockupCard({ slideKey }: { slideKey: string }) {
  switch (slideKey) {
    case 'parent-hub':
      return (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.08)] space-y-4 w-full max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-[#D8232A] font-black">
                <Users size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">CARL TTEST</h4>
                <p className="text-[11px] font-bold text-slate-400">Grade 6 • SY 2026-2027</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase">
              Enrolled Active
            </span>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400">General Average</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">94.2</span>
                <span className="text-[10px] font-bold text-emerald-600">With Honors</span>
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400">Attendance Rate</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">100%</span>
                <span className="text-[10px] font-bold text-emerald-600">22 / 22 Days</span>
              </div>
            </div>
          </div>

          {/* Document Status Item */}
          <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800">PSA Birth Certificate</p>
                <p className="text-[10px] text-emerald-700 font-medium">Verified by Registrar</p>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-700">Approved ✓</span>
          </div>

          {/* Live Notification Item */}
          <div className="flex items-center gap-2.5 text-slate-500 text-[11px] font-medium pt-1 px-1">
            <span className="w-2 h-2 rounded-full bg-[#D8232A] animate-pulse" />
            <span>Term 1 progress report synchronized today</span>
          </div>
        </div>
      );

    case 'student-insight':
      return (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.08)] space-y-4 w-full max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                <LineChart size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">3-Term Academic Progress</h4>
                <p className="text-[11px] font-bold text-slate-400">Academic Trajectory Analysis</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold uppercase">
              Top 5% Rank
            </span>
          </div>

          {/* Visual Progress Bars for 3 Terms */}
          <div className="space-y-3 pt-1">
            {[
              { term: 'Term 1 (Prelims)', score: 91, width: '91%', color: 'from-indigo-400 to-indigo-600' },
              { term: 'Term 2 (Midterms)', score: 93, width: '93%', color: 'from-indigo-500 to-indigo-600' },
              { term: 'Term 3 (Finals)', score: 96, width: '96%', color: 'from-[#D8232A] to-red-600' },
            ].map(item => (
              <div key={item.term} className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-700">
                  <span>{item.term}</span>
                  <span className="font-black text-slate-900">{item.score}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: item.width }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Subject Pills */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 bg-slate-50 rounded-xl text-center border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Mathematics</p>
              <p className="text-sm font-black text-slate-800">95 (High)</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl text-center border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase">Science</p>
              <p className="text-sm font-black text-slate-800">94 (High)</p>
            </div>
          </div>
        </div>
      );

    case 'smart-uploads':
      return (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.08)] space-y-4 w-full max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-black">
                <ClipboardCheck size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">Digital Checklist</h4>
                <p className="text-[11px] font-bold text-slate-400">Enrollment Document Center</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase">
              100% Uploaded
            </span>
          </div>

          {/* Document Upload Items */}
          <div className="space-y-2.5">
            {[
              { name: 'PSA Birth Certificate', size: '1.8 MB PDF', status: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { name: 'Report Card (SF9 Form)', size: '2.4 MB PDF', status: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { name: 'Certificate of Good Moral', size: '1.1 MB JPG', status: 'Verified', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            ].map((doc, idx) => (
              <div key={doc.name} className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-tight">{doc.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{doc.size}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${doc.color}`}>
                  {doc.status} ✓
                </span>
              </div>
            ))}
          </div>

          {/* Submission Bar */}
          <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs font-bold shadow-md">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Application Verified
            </span>
            <span className="text-slate-400 font-medium text-[11px]">Ready for Sectioning</span>
          </div>
        </div>
      );

    case 'live-bulletins':
      return (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.08)] space-y-4 w-full max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-black">
                <Megaphone size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">Live Broadcast Feed</h4>
                <p className="text-[11px] font-bold text-slate-400">Campus Notices & Bulletins</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold uppercase">
              2 New Updates
            </span>
          </div>

          {/* Broadcast Item 1 */}
          <div className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-100 space-y-1">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[9px] font-extrabold uppercase">
                Class Suspension
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Just Now</span>
            </div>
            <p className="text-xs font-black text-slate-900">Weather Advisory: Modular Learning</p>
            <p className="text-[11px] text-slate-500 line-clamp-1">Heavy rainfall advisory in effect. Classes transition online.</p>
          </div>

          {/* Broadcast Item 2 */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase">
                General Assembly
              </span>
              <span className="text-[10px] text-slate-400 font-medium">July 25</span>
            </div>
            <p className="text-xs font-black text-slate-900">1st Quarter General PTA Assembly</p>
            <p className="text-[11px] text-slate-500 line-clamp-1">All parents are invited to the Covered Court on Aug 5.</p>
          </div>

          {/* Broadcast Tag */}
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-1">
            <span>Broadcast Scope: All Guardians</span>
            <span className="text-emerald-600 font-extrabold">Instant Notification Sync</span>
          </div>
        </div>
      );

    case 'vault-security':
      return (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.08)] space-y-4 w-full max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 font-black">
                <ClipboardList size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">DepEd School Forms</h4>
                <p className="text-[11px] font-bold text-slate-400">1-Click Automation Suite</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-extrabold uppercase">
              Auto-Calculated
            </span>
          </div>

          {/* Form Generation Cards */}
          <div className="space-y-2.5">
            {[
              { form: 'DepEd Form SF2', desc: 'Daily Attendance Register', badge: 'Auto-Synced' },
              { form: 'DepEd Form SF9', desc: 'Learner Progress Report Card', badge: 'Computed' },
              { form: 'DepEd Form SF1', desc: 'School Register Masterlist', badge: 'Cloud Ready' },
            ].map(f => (
              <div key={f.form} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-900">{f.form}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{f.desc}</p>
                </div>
                <button className="px-3 py-1 bg-white hover:bg-slate-100 text-sky-700 border border-slate-200 rounded-xl text-[10px] font-bold shadow-2xs transition-colors">
                  {f.badge}
                </button>
              </div>
            ))}
          </div>

          <div className="p-3 bg-sky-50 text-sky-900 rounded-2xl flex items-center justify-between text-xs font-bold border border-sky-100">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" /> Zero Manual Math
            </span>
            <span className="text-[11px] text-sky-700 font-medium">Saves 4+ Hours / Week</span>
          </div>
        </div>
      );

    case 'agile-ops':
      return (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.08)] space-y-4 w-full max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-black">
                <Settings size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase">Admin Command Center</h4>
                <p className="text-[11px] font-bold text-slate-400">Campus Operations Monitor</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold uppercase">
              100% Operational
            </span>
          </div>

          {/* Metric Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400">Enrolled Learners</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">1,280</span>
                <span className="text-[10px] text-slate-400 font-medium">/ 1,350</span>
              </div>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <p className="text-[10px] font-bold uppercase text-slate-400">Active Sections</p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">24</span>
                <span className="text-[10px] text-emerald-600 font-bold">Grades 1-6</span>
              </div>
            </div>
          </div>

          {/* Cloud Health Metric */}
          <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-2 shadow-sm">
            <div className="flex justify-between items-center text-[11px] font-bold">
              <span className="text-slate-300">Enrollment Capacity Load</span>
              <span className="text-emerald-400 font-black">94.8%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 w-[94.8%] rounded-full" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-1">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <Database size={13} /> Firestore Cloud Synced
            </span>
            <span>Real-Time Audit Log</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// ── 3D Feature Showcase Interactive Carousel ───────────────────────────────────
function FeatureShowcaseCarousel({ onOpenModal }: { onOpenModal: (key: string) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const currentSlide = FEATURE_SLIDES[currentIndex];

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % FEATURE_SLIDES.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + FEATURE_SLIDES.length) % FEATURE_SLIDES.length);
  };

  const handleSelectTab = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  // Motion variants for directional slide transitions
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 350, damping: 32 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 },
      },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 60 : -60,
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.2 },
    }),
  };

  return (
    <div className="w-full space-y-8">
      
      {/* ── 1. Top Category Status Bar (Read-Only Stage Tracker) ── */}
      <div className="flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar gap-2 sm:gap-3 pb-2 px-2 select-none">
        {FEATURE_SLIDES.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={slide.key}
              className={`relative px-4 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all whitespace-nowrap select-none flex items-center gap-2 ${
                isActive
                  ? 'text-white shadow-md shadow-red-500/25'
                  : 'bg-slate-100/80 text-slate-500 border border-slate-200/60'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="featureActiveStatus"
                  className="absolute inset-0 bg-[#D8232A] rounded-2xl -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="text-[10px] opacity-80">0{idx + 1}</span>
              <span>{slide.tabLabel}</span>
            </div>
          );
        })}
      </div>

      {/* ── 2. Main 3D Feature Stage ── */}
      <div className="relative bg-gradient-to-b from-slate-50/80 to-white rounded-3xl sm:rounded-[2.5rem] border border-slate-200/90 shadow-[0_20px_50px_rgba(0,0,0,0.04)] overflow-hidden p-4 sm:p-8 lg:p-12 flex items-center">
        
        {/* Soft Ambient Background Glow Tailored to Slide Theme */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-[100px] opacity-30 pointer-events-none transition-colors duration-700"
          style={{ backgroundColor: currentSlide.color }}
        />

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide.key}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 sm:gap-8 lg:gap-12 items-center z-10"
          >
            
            {/* Left Column: Narrative Content */}
            <div className="space-y-4 sm:space-y-5 text-left">
              
              {/* Badge & Index */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider border ${currentSlide.accentBg} ${currentSlide.accentText} ${currentSlide.accentBorder}`}>
                  {currentSlide.badge}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Module 0{currentIndex + 1} of 06
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-[1.15] uppercase flex items-center">
                  {currentSlide.title}
                </h3>
                <p className="text-slate-500 text-xs sm:text-sm md:text-base font-medium leading-relaxed">
                  {currentSlide.desc}
                </p>
              </div>

              {/* Checklist Highlights */}
              <div className="space-y-2 pt-1">
                {currentSlide.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-700">{h}</span>
                  </div>
                ))}
              </div>

            </div>

            {/* Right Column: Dedicated 3D UI Preview Mockup */}
            <div className="w-full flex items-center justify-center pt-2 lg:pt-0">
              <FeatureMockupCard slideKey={currentSlide.key} />
            </div>

          </motion.div>
        </AnimatePresence>

      </div>

      {/* ── 3. Bottom Carousel Controls & Slide Segment Indicator ── */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-4 px-2 pt-1">
        
        {/* Slide Counter */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span className="font-black text-slate-900 text-sm sm:text-base">0{currentIndex + 1}</span>
          <span>/</span>
          <span>06</span>
          <span className="ml-1 sm:ml-2 text-slate-400 font-medium truncate max-w-[140px] sm:max-w-none">• {currentSlide.tabLabel}</span>
        </div>

        {/* Segmented Progress Bars (Clickable) */}
        <div className="flex items-center gap-1.5 sm:gap-2 order-3 sm:order-2 w-full sm:w-auto justify-center sm:justify-start">
          {FEATURE_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectTab(idx)}
              className="group py-2 cursor-pointer"
              aria-label={`Jump to slide ${idx + 1}`}
            >
              <div className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'w-8 sm:w-10 bg-[#D8232A]'
                  : 'w-2.5 sm:w-3 bg-slate-200 group-hover:bg-slate-300'
              }`} />
            </button>
          ))}
        </div>

        {/* Next / Prev Navigation Buttons */}
        <div className="flex items-center gap-2 shrink-0 order-2 sm:order-3">
          <button
            onClick={handlePrev}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNext}
            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#D8232A] hover:bg-red-700 text-white flex items-center justify-center shadow-md shadow-red-500/25 hover:shadow-red-500/40 transition-all active:scale-95 cursor-pointer"
            aria-label="Next Slide"
          >
            <ChevronRight size={16} />
          </button>
        </div>

      </div>

    </div>
  );
}

// ── Feature Modal ──────────────────────────────────────────────────────────────
function FeatureModal({ featureKey, onClose }: { featureKey: string | null; onClose: () => void }) {
  const data = featureKey ? featureData[featureKey] : null;
  const isActive = !!data;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (isActive) document.body.classList.add('overflow-hidden');
    else document.body.classList.remove('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, [isActive]);

  const iconBgClass = featureKey === 'parent-hub'
    ? 'bg-red-100 text-red-700'
    : `bg-${data?.color?.split('-')[0]}-50 text-${data?.color}`;

  return (
    <div
      onClick={(e) => { if ((e.target as HTMLElement).id === 'feature-modal-overlay') onClose(); }}
      id="feature-modal-overlay"
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300 ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      <div className={`w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col transition-all duration-500 border border-slate-100 ${isActive ? 'scale-100 translate-y-0' : 'scale-95 translate-y-6'}`}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-[#D8232A] hover:text-white transition-all z-20 cursor-pointer"
        >
          <X size={18} />
        </button>

        {data && (
          <>
            <div className="p-6 md:p-12 overflow-y-auto flex-1 pb-4">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl ${iconBgClass} flex items-center justify-center mb-6 md:mb-8 shadow-sm`}>
                <Icon name={data.icon} size={36} />
              </div>
              <h3 className="font-black text-2xl md:text-4xl uppercase mb-4 md:mb-6 pr-8 text-slate-900 leading-tight">{data.title}</h3>
              <p className="text-slate-500 text-sm md:text-lg leading-relaxed mb-6 md:mb-8 font-medium">{data.desc}</p>
              <div className="space-y-3 md:space-y-4">
                {data.benefits.map((b) => (
                  <div key={b} className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full ${iconBgClass} flex items-center justify-center shrink-0`}>
                      <Check size={12} />
                    </div>
                    <span className="text-slate-600 text-xs md:text-base font-semibold">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 md:px-12 pb-6 md:pb-10 pt-4 border-t border-slate-100 bg-white">
              <button
                onClick={onClose}
                className="w-full py-4 bg-[#D8232A] hover:bg-red-700 text-white rounded-2xl font-bold uppercase tracking-widest text-xs md:text-sm transition-all shadow-lg shadow-red-500/25 hover:shadow-red-500/40 cursor-pointer active:scale-98"
              >
                Get Started with {data.title}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showNavLogin, setShowNavLogin] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  // Track scroll position to trigger navbar Login button and active nav section
  useEffect(() => {
    const handleScroll = () => {
      // 1. Navbar Login CTA Visibility based on hero buttons
      const heroCta = document.getElementById('hero-cta-group');
      if (heroCta) {
        const rect = heroCta.getBoundingClientRect();
        // Login button appears smoothly once hero CTA scrolls past top
        setShowNavLogin(rect.bottom < 80);
      } else {
        setShowNavLogin(window.scrollY > 280);
      }

      // 2. Active Section Tracking
      const sections = ['home', 'registration-process', 'features', 'about'];
      const scrollPos = window.scrollY + 200;
      for (const s of sections) {
        const el = document.getElementById(s);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(s);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll reveal observer initialized immediately
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('landing-active');
          } else {
            entry.target.classList.remove('landing-active');
          }
        });
      },
      { threshold: 0.06, rootMargin: '0px 0px -30px 0px' }
    );
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll('.landing-reveal').forEach((el) => observer.observe(el));
    });
    return () => { observer.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

        .landing-page * { font-family: 'Plus Jakarta Sans', sans-serif; }

        @keyframes lp-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1.5deg); }
        }
        @keyframes lp-float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(10px) rotate(-1.5deg); }
        }
        .lp-floating-main { animation: lp-float 7s ease-in-out infinite; }
        .lp-floating-alt-1 { animation: lp-float-reverse 8s ease-in-out infinite; animation-delay: -2s; }
        .lp-floating-alt-2 { animation: lp-float 6s ease-in-out infinite; animation-delay: -4s; }
        .lp-floating-alt-3 { animation: lp-float-reverse 9s ease-in-out infinite; animation-delay: -1s; }

        .landing-reveal {
          opacity: 0;
          transform: translateY(35px) scale(0.97);
          transition:
            opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.75s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .landing-reveal.landing-active {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .lp-stagger-1 { transition-delay: 0.05s; }
        .lp-stagger-2 { transition-delay: 0.10s; }
        .lp-stagger-3 { transition-delay: 0.15s; }
        .lp-stagger-4 { transition-delay: 0.20s; }
        .lp-stagger-5 { transition-delay: 0.25s; }

        .lp-skeleton {
          background: #f1f5f9; position: relative; overflow: hidden; border-radius: 0.75rem;
        }
        .lp-skeleton::after {
          content: ""; position: absolute; inset: 0; transform: translateX(-100%);
          background-image: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: lp-shimmer 2s infinite ease-in-out;
        }
        @keyframes lp-shimmer { 100% { transform: translateX(100%); } }

        .lp-timeline-line {
          transform: scaleY(0); transform-origin: top;
          transition: transform 0.6s cubic-bezier(0.16,1,0.3,1);
          transition-delay: 350ms;
        }
        .group:hover .lp-timeline-line { transform: scaleY(1); }
      `}</style>

      <div className="landing-page relative min-h-screen text-slate-900 selection:bg-red-600 selection:text-white bg-[#F8FAFC] overflow-x-hidden">
        
        {/* Dynamic 3D Mesh Background */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[55%] rounded-full bg-[#0f172a] blur-[160px] opacity-25 mix-blend-multiply" />
          <div className="absolute top-[25%] right-[-10%] w-[50%] h-[60%] rounded-full bg-[#D8232A] blur-[170px] opacity-20 mix-blend-multiply" />
          <div className="absolute bottom-[-10%] left-[20%] w-[55%] h-[45%] rounded-full bg-[#F59E0B] blur-[160px] opacity-20 mix-blend-multiply" />
        </div>

        {/* ── ALIGNED FLOATING NAVBAR (Matches Container Width & Corner Radius rounded-[2.5rem] sm:rounded-[3rem]) ── */}
        <header className="fixed top-4 sm:top-5 left-1/2 -translate-x-1/2 w-[96%] max-w-[1400px] z-50 bg-white/85 backdrop-blur-2xl border border-white/70 shadow-[0_10px_35px_rgba(0,0,0,0.06)] rounded-[2.5rem] sm:rounded-[3rem] transition-all duration-300">
          <div className="flex justify-between items-center px-6 sm:px-10 h-16 sm:h-18 w-full">
            
            {/* Logo Section */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                className="lg:hidden shrink-0 p-2 text-[#D8232A] hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
              <a className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 group" href="#home">
                <div className="relative shrink-0">
                  <img
                    alt="Sta Maria Central School SPED Center Logo"
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-full shadow-md object-cover border-2 border-white group-hover:scale-105 transition-transform"
                    src="/images/sta_maria_school_logo.jpg"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div className="min-w-0 leading-tight">
                  <span className="block font-black text-[#D8232A] uppercase tracking-wider text-xs sm:text-sm md:text-base leading-none whitespace-nowrap">
                    Sta Maria Central School
                  </span>
                  <span className="block font-bold text-[#D8232A]/70 uppercase tracking-wide text-[10px] sm:text-xs md:text-sm leading-none whitespace-nowrap mt-1">
                    SPED Center
                  </span>
                </div>
              </a>
            </div>

            {/* Right-Aligned Desktop Navigation Links & Animated Login CTA */}
            <motion.div layout className="hidden lg:flex items-center gap-8 lg:gap-10 shrink-0">
              <nav className="flex items-center gap-8 lg:gap-10">
                {(['Home', 'Registration', 'Features', 'About'] as const).map((label) => {
                  const href = label === 'Home' ? '#home' : label === 'Registration' ? '#registration-process' : `#${label.toLowerCase()}`;
                  const id = label === 'Home' ? 'home' : label === 'Registration' ? 'registration-process' : label.toLowerCase();
                  const isActive = activeSection === id;
                  return (
                    <a
                      key={label}
                      href={href}
                      className={`transition-colors text-sm font-bold uppercase tracking-widest relative py-1 ${
                        isActive ? 'text-[#D8232A]' : 'text-slate-600 hover:text-[#D8232A]'
                      }`}
                    >
                      {label}
                      {isActive && (
                        <motion.div
                          layoutId="navActiveIndicator"
                          className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D8232A] rounded-full"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </a>
                  );
                })}
              </nav>

              {/* Scroll-Reactive Navbar Login CTA */}
              <AnimatePresence>
                {showNavLogin && (
                  <motion.button
                    initial={{ opacity: 0, x: 25, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 25, scale: 0.9 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    onClick={() => navigate('/login')}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#D8232A] to-red-600 hover:from-red-600 hover:to-[#D8232A] text-white rounded-2xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>

          </div>
        </header>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden fixed inset-x-4 top-24 z-40 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4"
            >
              <nav className="flex flex-col gap-2">
                {[
                  { label: 'Home', href: '#home' },
                  { label: 'Registration Process', href: '#registration-process' },
                  { label: 'System Features', href: '#features' },
                  { label: 'About SPED Center', href: '#about' },
                ].map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    onClick={closeMobileMenu}
                    className="text-slate-700 hover:text-[#D8232A] hover:bg-red-50 px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all"
                  >
                    {label}
                  </a>
                ))}
              </nav>
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  onClick={() => { closeMobileMenu(); navigate('/login'); }}
                  className="flex-1 py-3 bg-[#D8232A] text-white rounded-xl font-bold uppercase text-xs tracking-wider text-center shadow-md flex items-center justify-center gap-2"
                >
                  <LogIn size={16} /> Login
                </button>
                <button
                  onClick={() => { closeMobileMenu(); navigate('/signup'); }}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold uppercase text-xs tracking-wider text-center"
                >
                  Sign Up
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MASSIVE MAIN CONTENT CONTAINER ── */}
        <motion.main
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-[1400px] mx-auto w-[94%] sm:w-[96%] bg-white/90 backdrop-blur-3xl rounded-3xl sm:rounded-[3rem] border border-slate-200 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] mt-20 sm:mt-28 mb-10 sm:mb-16 overflow-hidden relative z-10"
        >
          
          {/* ── 1. HERO SECTION ── */}
          <section className="relative min-h-[75vh] sm:min-h-[85vh] flex items-center overflow-visible bg-transparent pt-6 sm:pt-12 pb-10 sm:pb-16" id="home">
            <div className="relative z-[2] w-full">
              <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 w-full grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-8 items-center min-h-[60vh] sm:min-h-[70vh]">
                
                {/* Left Column (Headline + SaaS CTAs) */}
                <div className="max-w-2xl text-slate-900 z-10 space-y-5 sm:space-y-8">
                  
                  {/* Live Indicator Pill */}
                  <div className="landing-reveal inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-slate-50 border border-slate-200/80 shadow-sm text-[9px] sm:text-xs font-extrabold text-slate-700 uppercase tracking-widest">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D8232A] animate-pulse shadow-[0_0_10px_#D8232A]" />
                    <span>ALIVIO • STA MARIA CENTRAL SCHOOL SYSTEM</span>
                  </div>
                  
                  {/* Headline */}
                  <h1 className="landing-reveal lp-stagger-1 text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight font-black leading-[1.06] text-slate-950">
                    <span className="block">Your School,</span>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#D8232A] via-red-600 to-rose-600">
                      In Your Hands.
                    </span>
                  </h1>
                  
                  {/* Subtitle */}
                  <p className="landing-reveal lp-stagger-2 text-sm sm:text-lg md:text-xl text-slate-500 max-w-xl font-medium leading-relaxed">
                    Skip the lines. Enroll online, check grades, and get the latest school updates—all from your phone or computer.
                  </p>

                  {/* Primary Hero CTA Group */}
                  <div id="hero-cta-group" className="landing-reveal lp-stagger-3 flex flex-col sm:flex-row gap-3 sm:gap-4 pt-1 sm:pt-2 w-full sm:w-auto">
                    <button
                      id="cta-login"
                      onClick={() => navigate('/login')}
                      className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-gradient-to-r from-[#D8232A] to-red-600 hover:from-red-600 hover:to-[#D8232A] text-white rounded-2xl font-extrabold uppercase tracking-wider transition-all shadow-[0_10px_30px_rgba(216,35,42,0.35)] hover:shadow-[0_15px_40px_rgba(216,35,42,0.45)] hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2.5 cursor-pointer text-sm sm:text-base"
                    >
                      <LogIn size={20} />
                      <span>Login</span>
                    </button>
                    <button
                      id="cta-signup"
                      onClick={() => navigate('/signup')}
                      className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-extrabold uppercase tracking-wider transition-all shadow-sm hover:shadow-md hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-2.5 cursor-pointer text-sm sm:text-base"
                    >
                      <UserPlus size={20} />
                      <span>Sign Up</span>
                    </button>
                  </div>

                </div>

                {/* Right Column (Clean & Unobscured Floating Photo Composition) */}
                <HeroPhotoComposition />

              </div>
            </div>
          </section>

          {/* ── 2. REGISTRATION PROCESS SECTION (INTERACTIVE SAAS-TIER SHOWCASE) ── */}
          <section className="py-14 sm:py-20 lg:py-24 bg-slate-50/60 relative border-t border-slate-100" id="registration-process">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12">
              <RegistrationProcessShowcase />
            </div>
          </section>

          {/* ── 3. SYSTEM FEATURES SECTION (PREMIUM 3D SHOWCASE CAROUSEL) ── */}
          <section className="py-14 sm:py-20 lg:py-24 bg-white border-t border-slate-100" id="features">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12">
              <div className="space-y-8 sm:space-y-12">
                
                {/* Section Headline */}
                <div className="text-center max-w-3xl mx-auto space-y-3 sm:space-y-4 landing-reveal px-2">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-100 text-[#D8232A] text-[10px] sm:text-xs font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Interactive System Showcase</span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl uppercase font-black text-slate-900 tracking-tight leading-[1.08]">
                    Making Every School Process Simpler
                  </h2>
                  <p className="text-slate-500 text-xs sm:text-base md:text-lg font-medium leading-relaxed">
                    Explore how Sta. Maria Central School's integrated portal empowers parents, teachers, and administrators.
                  </p>
                </div>

                {/* 3D Showcase Carousel Component */}
                <div className="landing-reveal lp-stagger-1">
                  <FeatureShowcaseCarousel onOpenModal={setActiveModal} />
                </div>

              </div>
            </div>
          </section>

          {/* ── 4. ABOUT SECTION ── */}
          <section className="py-14 sm:py-20 lg:py-24 bg-slate-50/60 relative overflow-visible border-t border-slate-100" id="about">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center">
                
                {/* School Badge Showcase */}
                <div className="lg:col-span-5 landing-reveal perspective-1000">
                  <TiltCard className="bg-white rounded-[2.5rem] shadow-xl overflow-visible border border-slate-100 pb-4">
                    <div className="relative rounded-[2rem] overflow-hidden" style={{ height: '300px', transform: "translateZ(20px)" }}>
                      <img
                        src="/images/sta_maria_new.jpg"
                        alt="Sta Maria Central School Building"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0" style={{ height: '72px' }}>
                        <svg viewBox="0 0 500 72" preserveAspectRatio="none" className="w-full h-full">
                          <path d="M0,72 L0,38 Q125,5 250,28 Q375,50 500,20 L500,72 Z" fill="#06b6d4" opacity="0.85"/>
                          <path d="M0,72 L0,50 Q125,15 250,40 Q375,62 500,35 L500,72 Z" fill="#ec4899" opacity="0.9"/>
                        </svg>
                      </div>
                    </div>

                    <div className="px-4 pt-4 pb-2" style={{ transform: "translateZ(30px)" }}>
                      <div className="bg-[#D8232A] text-white rounded-2xl shadow-lg w-full p-4 flex justify-between items-center">
                        <div>
                          <p className="text-2xl font-black leading-none">EST. 1920</p>
                          <p className="text-[10px] font-extrabold tracking-widest uppercase text-amber-300 mt-1">Serving Generations of Learners</p>
                        </div>
                        <School className="w-8 h-8 text-white/80" />
                      </div>
                    </div>
                  </TiltCard>
                </div>

                {/* About Content */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="landing-reveal inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-100 text-[#D8232A] text-xs font-black uppercase tracking-wider">
                    <School className="w-4 h-4" />
                    <span>About Our Institution</span>
                  </div>
                  <h2 className="landing-reveal lp-stagger-1 text-3xl sm:text-5xl lg:text-6xl uppercase leading-none font-black text-slate-900 tracking-tight">
                    Sta. Maria Central School SPED Center
                  </h2>
                  <p className="landing-reveal lp-stagger-2 text-slate-500 leading-relaxed text-base sm:text-lg font-medium">
                    Sta. Maria Central School SPED Center is a public elementary school dedicated to providing quality education to all students, including those with special educational needs. Our management system supports teachers, parents, and administrators in creating a seamless learning environment.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 perspective-1000 pt-2">
                    <TiltCard className="landing-reveal lp-stagger-2 p-8 bg-white rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col">
                      <div className="w-12 h-12 bg-[#D8232A]/10 rounded-2xl flex items-center justify-center text-[#D8232A] mb-5 shrink-0" style={{ transform: "translateZ(20px)" }}>
                        <Users size={24} />
                      </div>
                      <h5 className="text-xl uppercase font-black mb-2 text-slate-900" style={{ transform: "translateZ(10px)" }}>Parent Management</h5>
                      <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-medium" style={{ transform: "translateZ(5px)" }}>
                        Helping parents stay actively involved through real-time access to grades, attendance, announcements, and digital requirements.
                      </p>
                    </TiltCard>
                    <TiltCard className="landing-reveal lp-stagger-3 p-8 bg-white rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-5 shrink-0" style={{ transform: "translateZ(20px)" }}>
                        <GraduationCap size={24} />
                      </div>
                      <h5 className="text-xl uppercase font-black mb-2 text-slate-900" style={{ transform: "translateZ(10px)" }}>Teacher Productivity</h5>
                      <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-medium" style={{ transform: "translateZ(5px)" }}>
                        Empowering educators with digital tools that streamline attendance management, automated grading, and official school records.
                      </p>
                    </TiltCard>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* ── FOOTER ── */}
          <footer className="bg-slate-950 text-white py-16 border-t border-slate-900">
            <div className="max-w-7xl mx-auto px-6 md:px-12">
              <div className="flex flex-col items-center gap-8 text-center landing-reveal">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center p-2 shadow-lg hover:scale-105 transition-transform">
                    <img alt="DepEd Seal Logo" className="h-full w-full object-contain" src="/images/deped_logo.png" />
                  </div>
                  <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center p-2 shadow-lg hover:scale-105 transition-transform">
                    <img alt="Sta Maria School Crest Logo" className="h-full w-full object-contain rounded-xl" src="/images/sta_maria_school_logo.jpg" />
                  </div>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl text-white uppercase font-black tracking-tight">Sta Maria SPED Center</p>
                  <p className="text-slate-400 text-xs sm:text-sm tracking-widest uppercase mt-2 font-bold">Official DepEd School Management Portal</p>
                </div>
              </div>
              <div className="mt-12 pt-8 border-t border-slate-800/80 text-center">
                <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">
                  &copy; {new Date().getFullYear()} Sta Maria Central School SPED Center. All Rights Reserved.
                </p>
              </div>
            </div>
          </footer>

        </motion.main>

        {/* ── FEATURE MODAL ── */}
        <FeatureModal featureKey={activeModal} onClose={() => setActiveModal(null)} />
      </div>
    </>
  );
}
