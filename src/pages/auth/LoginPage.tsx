import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, Eye, EyeOff, ArrowRight, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { normalizeRole } from '../../lib/roles';
import { motion } from 'framer-motion';

// ── Floating Label Input Component ──────────────────────────────────────────
interface FloatInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

function FloatInput({
  id,
  type = 'text',
  label,
  value,
  onChange,
  icon,
  suffix,
  autoFocus,
  required,
  ...props
}: FloatInputProps) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || (value !== undefined && value !== null && String(value).length > 0);

  return (
    <div className="relative w-full text-left">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        autoFocus={autoFocus}
        {...props}
        style={{
          paddingTop: lifted ? '22px' : '14px',
          paddingBottom: lifted ? '6px' : '14px',
        }}
        className={`
          w-full h-14 bg-slate-50 border rounded-xl text-sm text-slate-900 font-medium
          outline-none transition-all duration-200 ${icon ? 'pl-11' : 'pl-4'} ${suffix ? 'pr-11' : 'pr-4'}
          ${focused
            ? 'border-slate-900 ring-2 ring-slate-900/10 bg-white'
            : 'border-slate-200 hover:border-slate-300'
          }
        `}
      />
      {/* Floating Label */}
      <label
        htmlFor={id}
        className={`absolute pointer-events-none transition-all duration-200 origin-left ${icon ? 'left-11' : 'left-4'}`}
        style={{
          top: lifted ? '6px' : '50%',
          transform: lifted ? 'translateY(0) scale(0.75)' : 'translateY(-50%) scale(1)',
          color: focused ? '#0f172a' : '#94a3b8',
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </label>
      {icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          {icon}
        </div>
      )}
      {suffix && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10">
          {suffix}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { user, role } = useAuth();

  useEffect(() => {
    if (roleParam) setEmail(`${roleParam}@school.edu`);
  }, [roleParam]);

  useEffect(() => {
    if (user && role) {
      const normalizedRole = normalizeRole(role);
      if (normalizedRole === 'subadmin' || normalizedRole === 'admin') {
        navigate('/admin');
      } else if (normalizedRole) {
        navigate(`/${normalizedRole}`);
      }
    }
  }, [user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const loggedUser = userCredential.user;
      const docRef = doc(db, 'users', loggedUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const rawRole = docSnap.data().role;
        const normalizedRole = normalizeRole(rawRole);
        if (normalizedRole === 'subadmin' || normalizedRole === 'admin') {
          navigate('/admin');
        } else if (normalizedRole) {
          navigate(`/${normalizedRole}`);
        } else {
          setError('Invalid user role. Please contact administrator.');
        }
      } else {
        setError('User role not found. Please contact administrator.');
      }
    } catch (err) {
      const errorObj = err as Error & { code?: string; message?: string };
      const code = errorObj.code || '';
      const msg = errorObj.message?.toLowerCase() || '';

      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        msg.includes('invalid-credential') ||
        msg.includes('wrong-password') ||
        msg.includes('user-not-found')
      ) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (code === 'auth/invalid-email' || msg.includes('invalid-email')) {
        setError('Invalid email address format.');
      } else if (code === 'auth/user-disabled' || msg.includes('user-disabled')) {
        setError('This account has been disabled. Please contact administrator.');
      } else if (code === 'auth/too-many-requests' || msg.includes('too-many-requests')) {
        setError('Too many failed login attempts. Please try again later or reset your password.');
      } else {
        setError('Failed to sign in. Please check your credentials and try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-[#F8FAFC]">
      {/* Soothing Dynamic Ambient Glow Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[5%] w-[45%] h-[55%] rounded-full bg-slate-900 blur-[160px] opacity-15 mix-blend-multiply" />
        <div className="absolute top-[30%] -right-[5%] w-[45%] h-[55%] rounded-full bg-[#D8232A] blur-[160px] opacity-12 mix-blend-multiply" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[45%] rounded-full bg-amber-500 blur-[160px] opacity-10 mix-blend-multiply" />
      </div>

      {/* Main Glassmorphic Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-4xl overflow-hidden flex flex-col md:flex-row bg-white rounded-[2rem] border border-slate-200/80 shadow-[0_25px_70px_rgba(15,23,42,0.09)]"
      >
        {/* ── LEFT PANEL ── Soothing Midnight Slate Luxury Canvas (Zero Eye Strain) ── */}
        <div
          className="hidden md:flex md:w-[44%] flex-col justify-between p-10 lg:p-12 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(155deg, #070c18 0%, #0f172a 50%, #1e293b 100%)' }}
        >
          {/* Subtle Ambient Lighting Overlays (Soothing & Gentle) */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-slate-700/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/[0.06] via-transparent to-transparent pointer-events-none" />

          {/* TOP: Logos + School Brand Name */}
          <div className="relative z-10">
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0 border border-white/90">
                <img src="/images/deped_logo.png" alt="DepEd Logo" className="w-full h-full object-contain" />
              </div>
              <div className="w-px h-9 bg-white/15" />
              <div className="w-12 h-12 rounded-2xl bg-white p-1 shadow-md flex items-center justify-center shrink-0 border border-white/90">
                <img src="/images/sta_maria_school_logo.jpg" alt="School Logo" className="w-full h-full object-cover rounded-xl" />
              </div>
              <div className="flex flex-col leading-tight min-w-0">
                <span className="font-black text-xs sm:text-sm text-white uppercase tracking-wider">STA. MARIA</span>
                <span className="font-black text-xs sm:text-sm text-white uppercase tracking-wider">CENTRAL SCHOOL</span>
                <span className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest mt-0.5">SPED CENTER</span>
              </div>
            </div>
            <div className="h-px bg-white/10 w-full" />
          </div>

          {/* MIDDLE: Main Content */}
          <div className="relative z-10 space-y-5 my-auto py-6">
            {/* Official Portal Pill */}
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/[0.08] text-[10px] font-extrabold uppercase tracking-[0.15em] text-amber-300 backdrop-blur-md shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
              Official Portal
            </span>

            {/* Motto with Crisp Pure White & Ruby Gradient */}
            <h3 className="text-3xl lg:text-4xl font-black leading-tight tracking-tight text-white">
              Believe, Educate,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-rose-400">and Transform</span>
            </h3>

            {/* Subtext */}
            <p className="text-sm text-slate-300 font-medium leading-relaxed max-w-[260px]">
              Sign in to easily manage student records, check grades, and stay connected with the school.
            </p>
          </div>

          {/* BOTTOM: Founded Badge */}
          <div className="relative z-10">
            <div className="h-px bg-white/10 w-full mb-4" />
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md">
              <p className="text-[10px] font-extrabold text-slate-300 uppercase tracking-[0.18em]">Founded Since 1920</p>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── Clean, Soothing Form Canvas ── */}
        <div className="w-full md:w-[56%] bg-white flex flex-col justify-center p-8 sm:p-12 lg:p-14 overflow-y-auto">
          <div className="w-full max-w-sm mx-auto space-y-7">

            {/* Mobile Only Brand Logo */}
            <div className="md:hidden flex items-center gap-2">
              <img src="/images/sta_maria_school_logo.jpg" alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
              <span className="font-extrabold text-xs text-slate-800 tracking-tight">Sta. Maria SPED</span>
            </div>

            {/* Form Header */}
            <div className="space-y-1.5 text-left">
              <h2 className="text-3xl font-black tracking-tight text-slate-950">Welcome Back</h2>
              <p className="text-sm text-slate-500 font-medium">Sign in to your school account portal.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Floating Email */}
              <FloatInput
                id="email"
                type="email"
                label="Email Address *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />

              {/* Floating Password */}
              <FloatInput
                id="password"
                type={showPassword ? 'text' : 'password'}
                label="Password *"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                }
              />

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full h-12 text-sm font-extrabold uppercase tracking-wider rounded-xl text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 border-none mt-2 cursor-pointer shadow-lg shadow-red-500/25 hover:shadow-red-500/40 bg-gradient-to-r from-[#D8232A] to-red-600 hover:from-red-600 hover:to-[#D8232A]"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </>
                )}
              </Button>
            </form>

            {/* Create Account Link & Back to Home Button */}
            <div className="pt-6 border-t border-slate-100 space-y-4 text-center">
              <div className="space-y-3">
                <p className="text-xs text-slate-400 font-semibold">New to Sta. Maria Portal?</p>
                <button
                  type="button"
                  className="w-full h-11 rounded-xl text-xs font-extrabold uppercase tracking-wider border border-slate-200 hover:border-red-200 text-slate-700 hover:text-[#D8232A] hover:bg-red-50/50 transition-all active:scale-[0.98] cursor-pointer"
                  onClick={() => navigate('/signup')}
                >
                  Create parent account
                </button>
              </div>

              {/* Neat Back to Home Link below */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#D8232A] transition-colors cursor-pointer uppercase tracking-wider py-1"
                >
                  <span>← Back to Home Page</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
