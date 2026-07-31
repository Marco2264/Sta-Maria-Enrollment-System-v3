import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, LineChart, ClipboardCheck, Megaphone, ClipboardList, Settings,
  UserPlus, LayoutDashboard, ClipboardEdit, Send, ShieldCheck, PartyPopper,
  LogIn, Menu, X, Check, GraduationCap, ArrowRight, LucideIcon,
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
    desc: 'Gain valuable insights into student learning and development. This feature provides a complete overview of academic performance, helping parents and teachers identify strengths, monitor progress, and support continuous improvement.',
    benefits: [
      'Academic performance tracking', 'Quarterly grade monitoring', 'Attendance analytics',
      'Learning progress reports', 'Student achievement records', 'Performance history archive',
      'Easy-to-read summaries', 'Data-driven student insights',
    ],
  },
  'smart-uploads': {
    icon: 'lucide:clipboard-check', color: 'blue-600', title: 'Digital Enrollment',
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

// ── Feature Modal ──────────────────────────────────────────────────────────────
function FeatureModal({ featureKey, onClose }: { featureKey: string | null; onClose: () => void }) {
  const data = featureKey ? featureData[featureKey] : null;
  const isActive = !!data;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    if (isActive) document.body.classList.add('overflow-hidden');
    else document.body.classList.remove('overflow-hidden');
    return () => document.body.classList.remove('overflow-hidden');
  }, [isActive]);

  const iconBgClass = featureKey === 'parent-hub'
    ? 'bg-blue-100 text-blue-700'
    : `bg-${data?.color?.split('-')[0]}-50 text-${data?.color}`;

  return (
    <div
      onClick={(e) => { if ((e.target as HTMLElement).id === 'feature-modal-overlay') onClose(); }}
      id="feature-modal-overlay"
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300 ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      <div className={`w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col transition-all duration-500 ${isActive ? 'scale-100 translate-y-0' : 'scale-95 translate-y-6'}`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-[#004ac6] hover:text-white transition-all z-20"
        >
          <X size={18} />
        </button>

        {data && (
          <>
            {/* Scrollable content area */}
            <div className="p-6 md:p-12 overflow-y-auto flex-1 pb-4">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl ${iconBgClass} flex items-center justify-center mb-6 md:mb-8`}>
                <Icon name={data.icon} size={36} />
              </div>
              <h3 className="font-black text-2xl md:text-4xl uppercase mb-4 md:mb-6 pr-8 text-slate-900 leading-tight">{data.title}</h3>
              <p className="text-slate-500 text-sm md:text-lg leading-relaxed mb-6 md:mb-8">{data.desc}</p>
              <div className="space-y-3 md:space-y-4">
                {data.benefits.map((b) => (
                  <div key={b} className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded-full ${iconBgClass} flex items-center justify-center shrink-0`}>
                      <Check size={12} />
                    </div>
                    <span className="text-slate-600 text-xs md:text-base font-medium">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pinned Get Started button — always visible at bottom */}
            <div className="px-6 md:px-12 pb-6 md:pb-10 pt-4 border-t border-slate-100 bg-white">
              <button
                onClick={onClose}
                className="w-full py-3.5 md:py-4 bg-[#004ac6] text-white rounded-xl font-bold uppercase tracking-widest text-xs md:text-sm hover:bg-[#003ea8] transition-all shadow-lg"
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
  const [contentReady, setContentReady] = useState(false);
  // Track which elements have been revealed — persists across React re-renders
  const revealedElements = useRef<WeakSet<Element>>(new WeakSet());

  // Simulate skeleton loading then show content
  useEffect(() => {
    const timer = setTimeout(() => {
      setContentReady(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);


  // Scroll reveal — fades in on enter, fades out on leave, works both scroll directions
  useEffect(() => {
    if (!contentReady) return;
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
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll('.landing-reveal').forEach((el) => observer.observe(el));
    });
    return () => { observer.disconnect(); cancelAnimationFrame(raf); };
  }, [contentReady]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      {/* Google Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .landing-page * { font-family: 'Plus Jakarta Sans', sans-serif; }

        @keyframes lp-crossfade {
          0%   { opacity: 0; transform: scale(1.02); }
          12%  { opacity: 0.85; }
          33%  { opacity: 0.85; transform: scale(1); }
          45%  { opacity: 0; }
          100% { opacity: 0; }
        }

        .lp-slide {
          position: absolute; inset: 0; opacity: 0;
          animation: lp-crossfade 18s infinite ease-in-out;
          will-change: opacity, transform;
        }
        .lp-slide:nth-child(2) { animation-delay: 6s; }
        .lp-slide:nth-child(3) { animation-delay: 12s; }

        /* Scroll reveal — fades in/out smoothly on every viewport enter/leave */
        .landing-reveal {
          opacity: 0;
          transform: translateY(24px);
          transition:
            opacity 0.7s cubic-bezier(0.25, 1, 0.5, 1),
            transform 0.7s cubic-bezier(0.25, 1, 0.5, 1);
          will-change: opacity, transform;
        }
        .landing-reveal.landing-active {
          opacity: 1;
          transform: translateY(0);
        }
        .lp-stagger-1 { transition-delay: 0.06s; }
        .lp-stagger-2 { transition-delay: 0.12s; }
        .lp-stagger-3 { transition-delay: 0.18s; }
        .lp-stagger-4 { transition-delay: 0.24s; }
        .lp-stagger-5 { transition-delay: 0.30s; }

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

        .lp-hero-shadow { text-shadow: 0 4px 24px rgba(0,0,0,0.85); }

        .lp-nav-active { color: #004ac6 !important; position: relative; }
        .lp-nav-active::after {
          content: ''; position: absolute; bottom: -4px; left: 0; right: 0;
          height: 2px; border-radius: 99px; background: #004ac6;
        }
      `}</style>

      <div className="landing-page bg-white text-slate-900 selection:bg-blue-600 selection:text-white">

        {/* ── NAVBAR ── */}
        <header className="sticky top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
          <div className="flex justify-between items-center px-4 sm:px-6 md:px-12 h-16 sm:h-20 w-full max-w-7xl mx-auto">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                className="md:hidden shrink-0 p-2 text-[#004ac6] hover:bg-slate-50 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
              <a className="flex items-center gap-2 sm:gap-3 min-w-0" href="#home">
                <img alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-sm object-cover shrink-0" src="/images/sta_maria_school_logo.jpg" />
                <div className="min-w-0 leading-tight">
                  <span className="block font-black text-[#004ac6] uppercase tracking-wide text-[11px] sm:text-sm md:text-base leading-none whitespace-nowrap">Sta Maria Central School</span>
                  <span className="block font-bold text-[#004ac6]/70 uppercase tracking-wide text-[10px] sm:text-xs md:text-sm leading-none whitespace-nowrap">SPED Center</span>
                </div>
              </a>
            </div>
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 lg:gap-10 shrink-0">
              {(['Home', 'Registration', 'Features', 'About'] as const).map((label) => {
                const href = label === 'Home' ? '#home' : label === 'Registration' ? '#registration-process' : `#${label.toLowerCase()}`;
                return (
                  <a key={label} href={href} className="text-slate-600 hover:text-[#004ac6] transition-colors text-sm font-bold uppercase tracking-widest">
                    {label}
                  </a>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-16 z-40 bg-white/98 backdrop-blur-lg border-b border-slate-100">
            <nav className="flex flex-col p-8 gap-6">
              {[
                { label: 'Home', href: '#home' },
                { label: 'Registration', href: '#registration-process' },
                { label: 'Features', href: '#features' },
                { label: 'About', href: '#about' },
              ].map(({ label, href }) => (
                <a key={label} href={href} onClick={closeMobileMenu}
                  className="text-slate-600 hover:text-[#004ac6] transition-all text-lg font-bold uppercase tracking-widest py-3 border-b border-slate-50">
                  {label}
                </a>
              ))}
            </nav>
          </div>
        )}

        <main>
          {/* ── HERO ── */}
          <section className="relative min-h-[85vh] flex items-center overflow-hidden" id="home">
            {/* Background slides — always mounted so animation starts immediately */}
            <div className="absolute inset-0 bg-slate-950">
              <div className="lp-slide bg-cover bg-center" style={{ backgroundImage: "url('/images/blaba.jpg')" }} />
              <div className="lp-slide bg-cover bg-center" style={{ backgroundImage: "url('/images/hero_bg_2.jpg')" }} />
              <div className="lp-slide bg-cover bg-center" style={{ backgroundImage: "url('/images/hero_bg_3.jpg')" }} />
            </div>
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent z-[1]" />

            {/* Skeleton — sits on top while loading */}
            {!contentReady && (
              <div className="absolute inset-0 z-[2] flex items-center">
                <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
                  <div className="lp-skeleton w-48 h-8 mb-6 opacity-20" />
                  <div className="lp-skeleton w-full max-w-xl h-20 md:h-32 mb-6 opacity-20" />
                  <div className="lp-skeleton w-3/4 max-w-md h-6 mb-10 opacity-20" />
                  <div className="flex gap-4">
                    <div className="lp-skeleton w-40 h-14 opacity-20" />
                    <div className="lp-skeleton w-40 h-14 opacity-20" />
                  </div>
                </div>
              </div>
            )}

            {/* Hero text — shown after skeleton */}
            {contentReady && (
              <div className="relative z-[2] w-full">
                <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
                  <div className="max-w-3xl text-white py-20 md:py-0">
                    <div className="landing-reveal inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-white uppercase tracking-widest mb-6 backdrop-blur-sm">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_#2563eb]" />
                      <span>ALIVIO - STA MARIA CENTRAL SCHOOL SYSTEM</span>
                    </div>
                    <h1 className="landing-reveal lp-stagger-1 text-4xl md:text-6xl uppercase tracking-tight lp-hero-shadow font-black leading-[1.05] mb-6">
                      <span className="block">STA MARIA SCHOOL</span>
                      <span className="block text-blue-400">TEACHERS &amp; PARENTS</span>
                      <span className="block">MANAGEMENT PORTAL</span>
                    </h1>
                    <p className="landing-reveal lp-stagger-2 text-lg text-slate-300 mb-10 max-w-xl font-medium leading-relaxed">
                      Making school processes easier through online enrollment, student monitoring, and seamless communication for the entire Sta. Maria School community.
                    </p>
                    <div className="landing-reveal lp-stagger-3 flex flex-wrap gap-4">
                      <button
                        id="cta-login"
                        onClick={() => navigate('/login')}
                        className="px-10 py-4 bg-[#004ac6] hover:bg-[#003ea8] text-white rounded-xl font-bold uppercase tracking-wider transition-all transform hover:scale-105 shadow-xl shadow-blue-900/30 flex items-center gap-2"
                      >
                        <LogIn size={20} /> Login
                      </button>
                      <button
                        id="cta-signup"
                        onClick={() => navigate('/signup')}
                        className="px-10 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold uppercase tracking-wider transition-all backdrop-blur-md flex items-center gap-2"
                      >
                        <UserPlus size={20} /> Register Parent
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── REGISTRATION PROCESS ── */}
          <section className="py-24 bg-slate-50 relative" id="registration-process">
            <div className="max-w-7xl mx-auto px-6">
              {!contentReady ? (
                <div className="flex flex-col lg:flex-row gap-20">
                  <div className="lg:w-1/3">
                    <div className="lp-skeleton w-32 h-6 mb-4" />
                    <div className="lp-skeleton w-full h-20 mb-6" />
                    <div className="lp-skeleton w-3/4 h-16" />
                  </div>
                  <div className="lg:w-2/3 space-y-8">
                    <div className="lp-skeleton w-full h-32" />
                    <div className="lp-skeleton w-full h-32" />
                    <div className="lp-skeleton w-full h-32" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-20">
                  {/* Left */}
                  <div className="lg:w-1/3 landing-reveal">
                    <h4 className="text-[#004ac6] font-bold uppercase tracking-widest text-sm mb-4">Step-by-Step</h4>
                    <h2 className="text-[32px] sm:text-5xl lg:text-6xl uppercase leading-none font-black mb-6 text-slate-900">
                      Registration<br />Process
                    </h2>
                    <p className="text-slate-500 leading-relaxed mb-10 text-lg">
                      Follow our simplified vertical timeline to register, upload documents, and complete your child's enrollment seamlessly.
                    </p>
                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-lg">
                      <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">For School Year</p>
                      <p className="text-xl font-bold text-[#004ac6]">2026-2027 Registration</p>
                    </div>
                  </div>
                  {/* Timeline */}
                  <div className="lg:w-2/3 space-y-12 relative">
                    {[
                      { icon: 'lucide:user-plus',       label: 'Create Parent Account',        desc: 'Register a secure parent account to access the online registration system.',                              primary: true  },
                      { icon: 'lucide:layout-dashboard', label: 'Register Student',               desc: 'Enter student information and begin the registration application.',                                       primary: false },
                      { icon: 'lucide:clipboard-edit',   label: 'Complete Registration Form',    desc: 'Fill out the required personal, academic, and contact information.',                                      primary: false },
                      { icon: 'lucide:send',             label: 'Submit Application',             desc: 'Review and submit the registration application for school processing.',                                   primary: false },
                      { icon: 'lucide:shield-check',     label: 'School Review & Verification',  desc: 'The school evaluates submitted information and verifies application requirements.',                      primary: false },
                      { icon: 'lucide:party-popper',     label: 'Official Enrollment',           desc: 'Upon approval, the student becomes officially enrolled in Sta. Maria Elementary School.',               primary: false, final: true },
                    ].map((step, i) => (
                      <div key={step.label} className={`landing-reveal lp-stagger-${Math.min(i + 1, 5)} group relative flex items-start gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1`}>
                        <div className={`relative z-10 w-12 h-12 shrink-0 ${step.primary ? 'bg-[#004ac6]' : step.final ? 'bg-emerald-500' : 'bg-slate-50 group-hover:bg-[#004ac6]'} rounded-xl flex items-center justify-center ${step.primary || step.final ? 'text-white' : 'text-[#004ac6] group-hover:text-white'} border ${step.primary || step.final ? 'border-transparent' : 'border-slate-100'} shadow-md transition-all duration-300`}>
                          <Icon name={step.icon} size={20} />
                        </div>
                        <div>
                          <h3 className={`text-lg font-bold tracking-wide mb-1.5 ${step.final ? 'text-emerald-600' : 'text-slate-900 group-hover:text-[#004ac6]'} transition-colors`}>{step.label}</h3>
                          <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                        </div>
                        {!step.final && (
                          <div className="absolute left-12 top-full h-12 w-4 -translate-x-1/2 flex flex-col items-center justify-between pointer-events-none z-0">
                            <div className="lp-timeline-line w-[3px] h-8 bg-gradient-to-b from-blue-200 to-blue-300" />
                            <svg width="14" height="12" viewBox="0 0 14 12" fill="none" className="text-blue-300">
                              <path d="M2.5 3 L7 7.5 L11.5 3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── FEATURES ── */}
          <section className="py-24 bg-white" id="features">
            <div className="max-w-7xl mx-auto px-6">
              {!contentReady ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[...Array(6)].map((_, i) => <div key={i} className="lp-skeleton w-full h-80" />)}
                </div>
              ) : (
                <>
                  <div className="text-center max-w-3xl mx-auto mb-20 landing-reveal">
                    <h4 className="text-[#004ac6] font-bold uppercase tracking-widest text-sm mb-4">System features</h4>
                    <h2 className="text-[32px] sm:text-5xl lg:text-6xl uppercase font-black text-slate-900">
                      Making Every School Process Simpler
                    </h2>
                    <p className="text-slate-500 mt-6 text-lg">From registration to student progress tracking, manage everything through one connected platform.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                      { key: 'parent-hub',      icon: 'lucide:users',           label: 'Parent Portal',                  desc: "Stay connected with your child's academic journey through real-time access to grades, attendance, announcements, and school updates.",        textColor: 'text-[#004ac6]',   bgColor: 'bg-[#004ac6]/10 group-hover:bg-[#004ac6] text-[#004ac6] group-hover:text-white' },
                      { key: 'student-insight', icon: 'lucide:line-chart',       label: 'Student Performance Monitoring', desc: 'Monitor student achievement, attendance records, and academic growth through detailed progress tracking tools.',                               textColor: 'text-indigo-600',  bgColor: 'bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white' },
                      { key: 'smart-uploads',   icon: 'lucide:clipboard-check',  label: 'Digital Enrollment',             desc: 'Simplify the enrollment process through secure online registration and digital application management.',                                        textColor: 'text-blue-600',    bgColor: 'bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white' },
                      { key: 'live-bulletins',  icon: 'lucide:megaphone',        label: 'School Communication Center',    desc: 'Receive important school announcements, event updates, reminders, and notifications in one centralized platform.',                              textColor: 'text-amber-600',   bgColor: 'bg-amber-50 group-hover:bg-amber-600 text-amber-600 group-hover:text-white' },
                      { key: 'vault-security',  icon: 'lucide:clipboard-list',   label: 'Teacher Productivity Suite',     desc: 'Automate routine administrative tasks and reduce paperwork to allow teachers to focus more on teaching.',                                          textColor: 'text-emerald-600', bgColor: 'bg-emerald-50 group-hover:bg-emerald-600 text-emerald-600 group-hover:text-white' },
                      { key: 'agile-ops',       icon: 'lucide:settings',         label: 'Smart School Administration',    desc: 'Manage school operations, schedules, records, and administrative processes through an integrated management platform.',                          textColor: 'text-rose-600',    bgColor: 'bg-rose-50 group-hover:bg-rose-600 text-rose-600 group-hover:text-white' },
                    ].map((f, i) => (
                      <div key={f.key} className={`landing-reveal lp-stagger-${(i % 3) + 1} bg-white border border-blue-100 rounded-[2rem] p-6 sm:p-10 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 group`}>
                        <div className={`w-16 h-16 rounded-2xl ${f.bgColor} flex items-center justify-center mb-8 transition-all`}>
                          <Icon name={f.icon} size={36} />
                        </div>
                        <h3 className="text-3xl uppercase font-black mb-4">{f.label}</h3>
                        <p className="text-slate-500 leading-relaxed mb-8">{f.desc}</p>
                        <button
                          onClick={() => setActiveModal(f.key)}
                          className={`inline-flex items-center gap-2 ${f.textColor} font-bold uppercase tracking-widest text-xs group-hover:gap-4 transition-all`}
                        >
                          Explore Module <ArrowRight size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ── ABOUT ── */}
          <section className="py-24 bg-slate-50 relative overflow-hidden" id="about">
            <div className="max-w-7xl mx-auto px-6">
              {!contentReady ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                  <div className="lg:col-span-5"><div className="lp-skeleton w-full h-[500px]" /></div>
                  <div className="lg:col-span-7">
                    <div className="lp-skeleton w-1/4 h-6 mb-4" />
                    <div className="lp-skeleton w-full h-20 mb-8" />
                    <div className="lp-skeleton w-full h-32" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
                  {/* School image — card matching reference screenshot */}
                  <div className="lg:col-span-5 landing-reveal">
                    {/* Outer white card */}
                    <div className="relative bg-white rounded-[2rem] shadow-xl overflow-visible" style={{ paddingBottom: '1rem' }}>

                      {/* Photo wrapper — rounded + clipped */}
                      <div className="relative rounded-[1.5rem] overflow-hidden" style={{ height: '280px' }}>
                        <img
                          src="/images/sta_maria_bulding.png"
                          alt="Sta Maria School Building"
                          className="w-full h-full object-cover"
                        />

                        {/* Colorful wave overlay — bottom of photo */}
                        <div className="absolute bottom-0 left-0 right-0" style={{ height: '72px' }}>
                          <svg viewBox="0 0 500 72" preserveAspectRatio="none" className="w-full h-full">
                            {/* Teal wave — back */}
                            <path d="M0,72 L0,38 Q125,5 250,28 Q375,50 500,20 L500,72 Z" fill="#06b6d4" opacity="0.85"/>
                            {/* Pink wave — front */}
                            <path d="M0,72 L0,50 Q125,15 250,40 Q375,62 500,35 L500,72 Z" fill="#ec4899" opacity="0.9"/>
                          </svg>
                        </div>
                      </div>

                      {/* Bottom row — EST. 1920 badge only, full width */}
                      <div className="px-3 pt-3 pb-2">
                        <div className="bg-[#004ac6] text-white rounded-xl shadow-lg w-full" style={{ padding: '0.85rem 1.25rem' }}>
                          <p style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1, margin: 0 }}>EST. 1920</p>
                          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fbbf24', marginTop: '4px' }}>Serving Generations of Learners</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Text */}
                  <div className="lg:col-span-7 mt-8 lg:mt-0">
                    <h4 className="landing-reveal text-[#004ac6] font-bold uppercase tracking-widest text-sm mb-4">About Us</h4>
                    <h2 className="landing-reveal lp-stagger-1 text-[32px] sm:text-5xl lg:text-6xl uppercase leading-none font-black mb-8 text-slate-900">
                      Sta. Maria Central School SPED Center
                    </h2>
                    <p className="landing-reveal lp-stagger-2 text-slate-500 leading-relaxed text-lg mb-10">
                      Sta. Maria Central School SPED Center is a public elementary school dedicated to providing quality education to all students, including those with special educational needs. Our management system supports teachers, parents, and administrators in creating a seamless learning environment.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="landing-reveal lp-stagger-2 p-8 bg-white rounded-3xl border border-blue-100 shadow-lg">
                        <div className="w-12 h-12 bg-[#004ac6]/10 rounded-xl flex items-center justify-center text-[#004ac6] mb-6">
                          <Users size={24} />
                        </div>
                        <h5 className="text-2xl uppercase font-black mb-3">Parent Management</h5>
                        <p className="text-slate-500 text-sm leading-relaxed italic">Helping parents stay actively involved in their child's education through real-time access to grades, attendance records, announcements, and enrollment information.</p>
                      </div>
                      <div className="landing-reveal lp-stagger-3 p-8 bg-white rounded-3xl border border-blue-100 shadow-lg">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6">
                          <GraduationCap size={24} />
                        </div>
                        <h5 className="text-2xl uppercase font-black mb-3">Teacher Productivity</h5>
                        <p className="text-slate-500 text-sm leading-relaxed italic">Empowering educators with digital tools that streamline attendance management, automate school forms, and reduce administrative workload.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* ── FOOTER ── */}
        <footer className="bg-slate-900 py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col items-center gap-8 text-center landing-reveal">
              <div className="flex gap-4">
                <div className="h-16 w-16 bg-white rounded-xl flex items-center justify-center p-1.5 shadow hover:opacity-90 transition-opacity">
                  <img alt="DepEd Logo" className="h-full w-full object-contain" src="/images/deped_logo.png" />
                </div>
                <div className="h-16 w-16 bg-white rounded-xl flex items-center justify-center p-1.5 shadow hover:opacity-90 transition-opacity">
                  <img alt="Sta Maria School Logo" className="h-full w-full object-contain rounded-lg" src="/images/sta_maria_school_logo.jpg" />
                </div>
              </div>
              <div>
                <p className="text-3xl text-white uppercase font-black">Sta Maria SPED Center</p>
                <p className="text-slate-400 text-sm tracking-widest uppercase mt-2">Official Management Portal</p>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-slate-800 text-center">
              <p className="text-slate-600 text-xs uppercase tracking-widest font-bold">
                &copy; 2026 Sta Maria Central School SPED Center. All Rights Reserved.
              </p>
            </div>
          </div>
        </footer>

        {/* ── FEATURE MODAL ── */}
        <FeatureModal featureKey={activeModal} onClose={() => setActiveModal(null)} />
      </div>
    </>
  );
}
