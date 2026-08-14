import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
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

// ── 3D Tilt Card ───────────────────────────────────────────────────────────────
function TiltCard({ children, className = '', onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // Snappier springs for a more premium, responsive feel
  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 25 });
  
  // Increased rotation for a more dramatic 3D effect
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
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
      {/* Glare effect */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[2rem] z-20 mix-blend-overlay"
        style={{
          background: useTransform(
            () => `radial-gradient(circle at ${(x.get() + 0.5) * 100}% ${(y.get() + 0.5) * 100}%, rgba(255,255,255,0.8) 0%, transparent 60%)`
          )
        }}
      />
      {/* Content wrapper with depth */}
      <div style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }} className="w-full h-full relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

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
    ? 'bg-red-100 text-red-700'
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
          className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-[#D8232A] hover:text-white transition-all z-20"
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
                className="w-full py-3.5 md:py-4 bg-[#D8232A] text-white rounded-xl font-bold uppercase tracking-widest text-xs md:text-sm hover:bg-[#a61a20] transition-all shadow-lg"
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

        @keyframes lp-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes lp-float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(12px) rotate(-1deg); }
        }
        .lp-floating-main { animation: lp-float 7s ease-in-out infinite; }
        .lp-floating-alt-1 { animation: lp-float-reverse 8s ease-in-out infinite; animation-delay: -2s; }
        .lp-floating-alt-2 { animation: lp-float 6s ease-in-out infinite; animation-delay: -4s; }
        .lp-floating-alt-3 { animation: lp-float-reverse 9s ease-in-out infinite; animation-delay: -1s; }

        /* Scroll reveal — fades in/out smoothly on every viewport enter/leave */
        .landing-reveal {
          opacity: 0;
          transform: translateY(40px) scale(0.95) rotateX(10deg);
          transform-origin: top center;
          transition:
            opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .landing-reveal.landing-active {
          opacity: 1;
          transform: translateY(0) scale(1) rotateX(0deg);
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

        .lp-nav-active { color: #D8232A !important; position: relative; }
        .lp-nav-active::after {
          content: ''; position: absolute; bottom: -4px; left: 0; right: 0;
          height: 2px; border-radius: 99px; background: #D8232A;
        }
      `}</style>

      <div className="landing-page relative min-h-screen text-slate-900 selection:bg-red-600 selection:text-white bg-slate-50 overflow-hidden">
        
        {/* Dynamic 3D Mesh Background (Navy, Red, Gold) */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-[-5%] w-[40%] h-[50%] rounded-full bg-[#0f172a] blur-[140px] opacity-40 mix-blend-multiply" />
          <div className="absolute top-[30%] right-[-5%] w-[45%] h-[55%] rounded-full bg-[#D8232A] blur-[140px] opacity-30 mix-blend-multiply" />
          <div className="absolute bottom-[-5%] left-[20%] w-[50%] h-[40%] rounded-full bg-[#F59E0B] blur-[140px] opacity-30 mix-blend-multiply" />
        </div>
        {/* ── FLOATING PILL NAVBAR ── */}
        <header className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl z-50 bg-white/90 backdrop-blur-xl border border-slate-200 shadow-sm rounded-full">
          <div className="flex justify-between items-center px-4 sm:px-6 h-14 sm:h-16 w-full">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                className="md:hidden shrink-0 p-2 text-[#D8232A] hover:bg-slate-50 rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
              <a className="flex items-center gap-2 sm:gap-3 min-w-0" href="#home">
                <img alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-sm object-cover shrink-0" src="/images/sta_maria_school_logo.jpg" />
                <div className="min-w-0 leading-tight">
                  <span className="block font-black text-[#D8232A] uppercase tracking-wide text-[11px] sm:text-sm md:text-base leading-none whitespace-nowrap">Sta Maria Central School</span>
                  <span className="block font-bold text-[#D8232A]/70 uppercase tracking-wide text-[10px] sm:text-xs md:text-sm leading-none whitespace-nowrap">SPED Center</span>
                </div>
              </a>
            </div>
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8 lg:gap-10 shrink-0">
              {(['Home', 'Registration', 'Features', 'About'] as const).map((label) => {
                const href = label === 'Home' ? '#home' : label === 'Registration' ? '#registration-process' : `#${label.toLowerCase()}`;
                return (
                  <a key={label} href={href} className="text-slate-600 hover:text-[#D8232A] transition-colors text-sm font-bold uppercase tracking-widest">
                    {label}
                  </a>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-4 top-24 z-40 bg-white/95 backdrop-blur-lg border border-slate-200 rounded-2xl shadow-xl">
            <nav className="flex flex-col p-6 gap-4">
              {[
                { label: 'Home', href: '#home' },
                { label: 'Registration', href: '#registration-process' },
                { label: 'Features', href: '#features' },
                { label: 'About', href: '#about' },
              ].map(({ label, href }) => (
                <a key={label} href={href} onClick={closeMobileMenu}
                  className="text-slate-600 hover:text-[#D8232A] transition-all text-base font-bold uppercase tracking-widest py-2 border-b border-slate-50 last:border-0">
                  {label}
                </a>
              ))}
            </nav>
          </div>
        )}

        {/* ── MASSIVE WHITE CONTENT CONTAINER ── */}
        <main className="max-w-[1400px] mx-auto w-[96%] bg-white/90 backdrop-blur-3xl rounded-[3rem] border border-slate-200 shadow-sm mt-24 mb-16 overflow-hidden relative z-10">
          {/* ── HERO ── */}
          <section className="relative min-h-[85vh] flex items-center overflow-visible bg-transparent pt-10" id="home">

            {/* Skeleton — sits on top while loading */}
            {!contentReady && (
              <div className="absolute inset-0 z-[2] flex items-center">
                <div className="max-w-7xl mx-auto px-6 md:px-12 w-full grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div>
                    <div className="lp-skeleton w-48 h-8 mb-6 opacity-40" />
                    <div className="lp-skeleton w-full max-w-xl h-20 md:h-32 mb-6 opacity-40" />
                    <div className="lp-skeleton w-3/4 max-w-md h-6 mb-10 opacity-40" />
                    <div className="flex gap-4">
                      <div className="lp-skeleton w-40 h-14 opacity-40" />
                      <div className="lp-skeleton w-40 h-14 opacity-40" />
                    </div>
                  </div>
                  <div className="hidden lg:block relative">
                     <div className="lp-skeleton absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-96 rounded-[2.5rem] opacity-40" />
                  </div>
                </div>
              </div>
            )}

            {/* Hero content */}
            {contentReady && (
              <div className="relative z-[2] w-full py-20 lg:py-0">
                <div className="max-w-7xl mx-auto px-6 md:px-12 w-full grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-8 items-center min-h-[70vh]">
                  {/* Left Column (Text) */}
                  <div className="max-w-2xl text-slate-900 z-10">
                    <div className="landing-reveal inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-widest mb-6 md:mb-8">
                      <span className="w-2 h-2 rounded-full bg-[#D8232A] animate-pulse shadow-[0_0_8px_#D8232A]" />
                      <span>ALIVIO - STA MARIA CENTRAL SCHOOL SYSTEM</span>
                    </div>
                    <h1 className="landing-reveal lp-stagger-1 text-5xl md:text-6xl lg:text-7xl tracking-tighter font-black leading-[1.05] mb-6 text-slate-900">
                      <span className="block">Your School,</span>
                      <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#D8232A] to-red-500">In Your Hands.</span>
                    </h1>
                    <p className="landing-reveal lp-stagger-2 text-lg md:text-xl text-slate-500 mb-10 max-w-xl font-medium leading-relaxed">
                      Skip the lines. Enroll online, check grades, and get the latest school updates—all from your phone or computer.
                    </p>
                    <div className="landing-reveal lp-stagger-3 flex flex-wrap gap-4">
                      <button
                        id="cta-login"
                        onClick={() => navigate('/login')}
                        className="px-10 py-4 bg-gradient-to-r from-[#D8232A] to-red-600 hover:to-red-700 text-white rounded-2xl font-bold uppercase tracking-wider transition-all shadow-[0_8px_30px_rgb(0,74,198,0.3)] hover:shadow-[0_10px_40px_rgb(0,74,198,0.4)] hover:-translate-y-1 flex items-center gap-2"
                      >
                        <LogIn size={20} /> Login
                      </button>
                      <button
                        id="cta-signup"
                        onClick={() => navigate('/signup')}
                        className="px-10 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl font-bold uppercase tracking-wider transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                      >
                        <UserPlus size={20} /> Sign Up
                      </button>
                    </div>
                  </div>

                  {/* Right Column (3D Photo Composition) */}
                  <div className="hidden lg:block relative h-[600px] w-full perspective-1000 z-0">
                    <div className="absolute inset-0 flex items-center justify-center transform-style-3d">
                      
                      {/* Main Centerpiece */}
                      <div className="absolute z-20 lp-floating-main shadow-[0_30px_60px_rgba(0,0,0,0.2)] rounded-[2.5rem] overflow-hidden border-4 border-white">
                        <img 
                          src="/images/sta_maria_new.jpg" 
                          onError={(e) => { e.currentTarget.src = '/images/sta_maria_bg.jpg'; }}
                          alt="Sta Maria" 
                          className="w-72 h-96 object-cover pointer-events-none" 
                        />
                      </div>

                      {/* 1. Floating Element (Top Left) - Avatar */}
                      <div className="absolute top-10 -left-6 z-30 lp-floating-alt-3 shadow-xl rounded-full overflow-hidden border-[3px] border-white transform -rotate-12 bg-white flex items-center justify-center w-24 h-24">
                        <img src="/images/sta_maria_school_logo.jpg" alt="Logo" className="w-full h-full object-cover pointer-events-none" />
                      </div>

                      {/* 2. Floating Element (Top Right) */}
                      <div className="absolute -top-4 -right-12 z-10 lp-floating-alt-1 shadow-[0_15px_35px_rgba(0,0,0,0.12)] rounded-3xl overflow-hidden border-[3px] border-white transform rotate-6">
                        <img src="/images/hero_bg_2.jpg" alt="Students" className="w-56 h-40 object-cover pointer-events-none" />
                      </div>

                      {/* 3. Floating Element (Bottom Left) */}
                      <div className="absolute -bottom-8 -left-12 z-10 lp-floating-alt-2 shadow-[0_25px_45px_rgba(0,0,0,0.18)] rounded-3xl overflow-hidden border-[3px] border-white transform -rotate-6">
                        <img src="/images/hero_bg_3.jpg" alt="Classroom" className="w-64 h-44 object-cover pointer-events-none" />
                      </div>

                      {/* 4. Floating Element (Bottom Right) */}
                      <div className="absolute -bottom-6 -right-6 z-30 lp-floating-main shadow-[0_20px_40px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden border-[3px] border-white transform rotate-12" style={{ animationDelay: '-3s' }}>
                        <img src="/images/blaba.jpg" alt="Activity" className="w-48 h-36 object-cover pointer-events-none" />
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── REGISTRATION PROCESS ── */}
          <section className="py-24 bg-slate-50 relative border-t border-slate-100" id="registration-process">
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
                    <h4 className="text-[#D8232A] font-bold uppercase tracking-widest text-sm mb-4">Step-by-Step</h4>
                    <h2 className="text-[32px] sm:text-5xl lg:text-6xl uppercase leading-none font-black mb-6 text-slate-900">
                      Registration<br />Process
                    </h2>
                    <p className="text-slate-500 leading-relaxed mb-10 text-lg">
                      Follow our simplified vertical timeline to register, upload documents, and complete your child's enrollment seamlessly.
                    </p>
                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-lg">
                      <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">For School Year</p>
                      <p className="text-xl font-bold text-[#D8232A]">2026-2027 Registration</p>
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
                      <div key={step.label} className={`landing-reveal lp-stagger-${Math.min(i + 1, 5)} group relative flex items-start gap-6 perspective-1000`}>
                        <TiltCard className="flex items-start gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-red-200 transition-all duration-300 w-full z-10">
                          <div className={`relative z-10 w-12 h-12 shrink-0 ${step.primary ? 'bg-[#D8232A]' : step.final ? 'bg-emerald-500' : 'bg-slate-50 group-hover:bg-[#D8232A]'} rounded-xl flex items-center justify-center ${step.primary || step.final ? 'text-white' : 'text-[#D8232A] group-hover:text-white'} border ${step.primary || step.final ? 'border-transparent' : 'border-slate-100'} shadow-md transition-all duration-300`} style={{ transform: "translateZ(20px)" }}>
                            <Icon name={step.icon} size={20} />
                          </div>
                          <div style={{ transform: "translateZ(10px)" }}>
                            <h3 className={`text-lg font-bold tracking-wide mb-1.5 ${step.final ? 'text-emerald-600' : 'text-slate-900 group-hover:text-[#D8232A]'} transition-colors`}>{step.label}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                          </div>
                        </TiltCard>
                        {!step.final && (
                          <div className="absolute left-12 top-full h-12 w-4 -translate-x-1/2 flex flex-col items-center justify-between pointer-events-none z-0">
                            <div className="lp-timeline-line w-[3px] h-8 bg-gradient-to-b from-red-300 to-red-400 opacity-50" />
                            <svg width="14" height="12" viewBox="0 0 14 12" fill="none" className="text-red-400 opacity-50">
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
          <section className="py-24 bg-white border-t border-slate-100" id="features">
            <div className="max-w-7xl mx-auto px-6">
              {!contentReady ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[...Array(6)].map((_, i) => <div key={i} className="lp-skeleton w-full h-80" />)}
                </div>
              ) : (
                <>
                  <div className="text-center max-w-3xl mx-auto mb-20 landing-reveal">
                    <h4 className="text-[#D8232A] font-bold uppercase tracking-widest text-sm mb-4">System features</h4>
                    <h2 className="text-[32px] sm:text-5xl lg:text-6xl uppercase font-black text-slate-900">
                      Making Every School Process Simpler
                    </h2>
                    <p className="text-slate-500 mt-6 text-lg">From registration to student progress tracking, manage everything through one connected platform.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[
                      { key: 'parent-hub',      icon: 'lucide:users',           label: 'Parent Portal',                  desc: "Stay connected with your child's academic journey through real-time access to grades, attendance, announcements, and school updates.",        textColor: 'text-[#D8232A]',   bgColor: 'bg-[#D8232A]/10 group-hover:bg-[#D8232A] text-[#D8232A] group-hover:text-white' },
                      { key: 'student-insight', icon: 'lucide:line-chart',       label: 'Student Performance Monitoring', desc: 'Monitor student achievement, attendance records, and academic growth through detailed progress tracking tools.',                               textColor: 'text-indigo-600',  bgColor: 'bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white' },
                      { key: 'smart-uploads',   icon: 'lucide:clipboard-check',  label: 'Digital Enrollment',             desc: 'Simplify the enrollment process through secure online registration and digital application management.',                                        textColor: 'text-red-600',    bgColor: 'bg-red-50 group-hover:bg-red-600 text-red-600 group-hover:text-white' },
                      { key: 'live-bulletins',  icon: 'lucide:megaphone',        label: 'School Communication Center',    desc: 'Receive important school announcements, event updates, reminders, and notifications in one centralized platform.',                              textColor: 'text-amber-600',   bgColor: 'bg-amber-50 group-hover:bg-amber-600 text-amber-600 group-hover:text-white' },
                      { key: 'vault-security',  icon: 'lucide:clipboard-list',   label: 'Teacher Productivity Suite',     desc: 'Automate routine administrative tasks and reduce paperwork to allow teachers to focus more on teaching.',                                          textColor: 'text-emerald-600', bgColor: 'bg-emerald-50 group-hover:bg-emerald-600 text-emerald-600 group-hover:text-white' },
                      { key: 'agile-ops',       icon: 'lucide:settings',         label: 'Smart School Administration',    desc: 'Manage school operations, schedules, records, and administrative processes through an integrated management platform.',                          textColor: 'text-rose-600',    bgColor: 'bg-rose-50 group-hover:bg-rose-600 text-rose-600 group-hover:text-white' },
                    ].map((f, i) => (
                      <div key={f.key} className={`landing-reveal lp-stagger-${(i % 3) + 1} group perspective-1000`}>
                        <TiltCard 
                          onClick={() => setActiveModal(f.key)}
                          className="bg-white border-2 border-transparent hover:border-slate-100 p-8 sm:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)] transition-all h-full flex flex-col relative overflow-hidden"
                        >
                          {/* Colored glowing orb behind the icon for premium feel */}
                          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full ${f.bgColor.split(' ')[0]} blur-[60px] opacity-0 group-hover:opacity-40 transition-opacity duration-500`} style={{ transform: "translateZ(10px)" }} />
                          
                          <div className={`w-16 h-16 rounded-2xl ${f.bgColor} flex items-center justify-center mb-10 transition-all shadow-sm`} style={{ transform: "translateZ(40px)" }}>
                            <Icon name={f.icon} size={32} />
                          </div>
                          <h3 className="text-2xl lg:text-3xl uppercase font-black mb-4 text-slate-900 leading-tight" style={{ transform: "translateZ(30px)" }}>{f.label}</h3>
                          <p className="text-slate-500 font-medium leading-relaxed mb-10 flex-1" style={{ transform: "translateZ(20px)" }}>{f.desc}</p>
                          <div className={`inline-flex items-center gap-2 ${f.textColor} font-bold uppercase tracking-widest text-xs group-hover:gap-4 transition-all`} style={{ transform: "translateZ(30px)" }}>
                            Explore Module <ArrowRight size={14} />
                          </div>
                        </TiltCard>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* ── ABOUT ── */}
          <section className="py-24 bg-slate-50 relative overflow-visible border-t border-slate-100" id="about">
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
                  <div className="lg:col-span-5 landing-reveal perspective-1000">
                    <TiltCard className="bg-white rounded-[2rem] shadow-xl overflow-visible border border-slate-100 pb-4">
                      {/* Photo wrapper — rounded + clipped */}
                      <div className="relative rounded-[1.5rem] overflow-hidden" style={{ height: '280px', transform: "translateZ(20px)" }}>
                        <img
                          src="/images/sta_maria_new.jpg"
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
                      <div className="px-3 pt-3 pb-2" style={{ transform: "translateZ(30px)" }}>
                        <div className="bg-[#D8232A] text-white rounded-xl shadow-lg w-full" style={{ padding: '0.85rem 1.25rem' }}>
                          <p style={{ fontSize: '1.6rem', fontWeight: 900, lineHeight: 1, margin: 0 }}>EST. 1920</p>
                          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fbbf24', marginTop: '4px' }}>Serving Generations of Learners</p>
                        </div>
                      </div>
                    </TiltCard>
                  </div>

                  {/* Text */}
                  <div className="lg:col-span-7 mt-8 lg:mt-0">
                    <h4 className="landing-reveal text-[#D8232A] font-bold uppercase tracking-widest text-sm mb-4">About Us</h4>
                    <h2 className="landing-reveal lp-stagger-1 text-[32px] sm:text-5xl lg:text-6xl uppercase leading-none font-black mb-8 text-slate-900">
                      Sta. Maria Central School SPED Center
                    </h2>
                    <p className="landing-reveal lp-stagger-2 text-slate-500 leading-relaxed text-lg mb-10">
                      Sta. Maria Central School SPED Center is a public elementary school dedicated to providing quality education to all students, including those with special educational needs. Our management system supports teachers, parents, and administrators in creating a seamless learning environment.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 perspective-1000">
                      <TiltCard className="landing-reveal lp-stagger-2 p-8 bg-white rounded-3xl border border-slate-100 shadow-lg h-full flex flex-col">
                        <div className="w-12 h-12 bg-[#D8232A]/10 rounded-xl flex items-center justify-center text-[#D8232A] mb-6" style={{ transform: "translateZ(20px)" }}>
                          <Users size={24} />
                        </div>
                        <h5 className="text-2xl uppercase font-black mb-3" style={{ transform: "translateZ(10px)" }}>Parent Management</h5>
                        <p className="text-slate-500 text-sm leading-relaxed italic" style={{ transform: "translateZ(5px)" }}>Helping parents stay actively involved in their child's education through real-time access to grades, attendance records, announcements, and enrollment information.</p>
                      </TiltCard>
                      <TiltCard className="landing-reveal lp-stagger-3 p-8 bg-white rounded-3xl border border-slate-100 shadow-lg h-full flex flex-col">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-6" style={{ transform: "translateZ(20px)" }}>
                          <GraduationCap size={24} />
                        </div>
                        <h5 className="text-2xl uppercase font-black mb-3" style={{ transform: "translateZ(10px)" }}>Teacher Productivity</h5>
                        <p className="text-slate-500 text-sm leading-relaxed italic" style={{ transform: "translateZ(5px)" }}>Empowering educators with digital tools that streamline attendance management, automate school forms, and reduce administrative workload.</p>
                      </TiltCard>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
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
        </main>

        {/* ── FEATURE MODAL ── */}
        <FeatureModal featureKey={activeModal} onClose={() => setActiveModal(null)} />
      </div>
    </>
  );
}
