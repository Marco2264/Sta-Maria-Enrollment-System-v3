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
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-50">
      {/* Dynamic 3D Mesh Background (Navy, Red, Gold) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-[-5%] w-[40%] h-[50%] rounded-full bg-[#0f172a] blur-[140px] opacity-40 mix-blend-multiply" />
        <div className="absolute top-[30%] right-[-5%] w-[45%] h-[55%] rounded-full bg-[#D8232A] blur-[140px] opacity-30 mix-blend-multiply" />
        <div className="absolute bottom-[-5%] left-[20%] w-[50%] h-[40%] rounded-full bg-[#F59E0B] blur-[140px] opacity-30 mix-blend-multiply" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0.5, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-4xl overflow-hidden flex flex-col md:flex-row"
        style={{ borderRadius: '28px', boxShadow: '0 40px 80px rgba(0,0,0,0.55)' }}
      >
        {/* ── LEFT PANEL ── modern deep crimson to red gradient with ambient lighting ── */}
        <div
          className="hidden md:flex md:w-[42%] flex-col justify-between p-10 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #2a0202 0%, #6b0f12 50%, #991b1e 100%)' }}
        >
          {/* Ambient lighting & sleek visual accents */}
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-red-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

          {/* TOP: Both logos + school name */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-13 h-13 rounded-xl bg-white p-1 shadow-md flex items-center justify-center shrink-0" style={{ width: 52, height: 52 }}>
                <img src="/images/deped_logo.png" alt="DepEd Logo" className="w-full h-full object-contain" />
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="w-13 h-13 rounded-xl bg-white p-1 shadow-md flex items-center justify-center shrink-0" style={{ width: 52, height: 52 }}>
                <img src="/images/sta_maria_school_logo.jpg" alt="School Logo" className="w-full h-full object-cover rounded-lg" />
              </div>
              {/* School name */}
              <div className="flex flex-col leading-tight">
                <span className="font-black text-sm text-white uppercase tracking-wide">STA. MARIA</span>
                <span className="font-black text-sm text-white uppercase tracking-wide">CENTRAL SCHOOL</span>
                <span className="text-[11px] font-bold text-red-200 uppercase tracking-widest mt-0.5">SPED Center</span>
              </div>
            </div>
            <div className="h-px bg-white/15 w-full" />
          </div>

          {/* MIDDLE: Main content */}
          <div className="relative z-10 space-y-5 my-auto">
            {/* Official Portal badge */}
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 text-[10px] font-extrabold uppercase tracking-[0.15em] text-amber-300 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
              Official Portal
            </span>

            {/* Motto */}
            <h3 className="text-3xl font-black leading-tight tracking-tight text-white">
              Believe, Educate,<br />
              <span className="text-red-200">and Transform</span>
            </h3>

            <p className="text-sm text-red-100/90 font-medium leading-relaxed max-w-[220px]">
              Sign in to easily manage student records, check grades, and stay connected with the school.
            </p>
          </div>

          {/* BOTTOM: Founded — highlighted without dot */}
          <div className="relative z-10">
            <div className="h-px bg-white/15 w-full mb-4" />
            <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm">
              <p className="text-[10px] font-extrabold text-white uppercase tracking-[0.18em]">Founded Since 1920</p>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="w-full md:w-[58%] bg-white flex flex-col justify-center p-8 sm:p-12 md:p-14 overflow-y-auto">
          <div className="w-full max-w-sm mx-auto space-y-8">

            {/* Mobile logo */}
            <div className="md:hidden flex items-center gap-2 mb-2">
              <img src="/images/sta_maria_school_logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
              <span className="font-extrabold text-xs text-slate-800 tracking-tight">Sta. Maria SPED</span>
            </div>

            {/* Header */}
            <div className="space-y-1.5 text-left">
              <h2 className="text-3xl font-black tracking-tight text-slate-900">Welcome Back</h2>
              <p className="text-sm text-slate-400 font-medium">Sign in to your school account portal.</p>
            </div>

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
                    className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                }
              />

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* Sign In */}
              <Button
                type="submit"
                className="w-full h-12 text-sm font-bold rounded-xl text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 border-none mt-1"
                style={{ background: 'linear-gradient(135deg, #991b1e 0%, #D8232A 100%)', boxShadow: '0 4px 20px rgba(216,35,42,0.35)' }}
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
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Create account */}
            <div className="pt-6 border-t border-slate-100 space-y-3 text-center">
              <p className="text-xs text-slate-400 font-semibold">New to Sta. Maria Portal?</p>
              <Button
                variant="outline"
                type="button"
                className="w-full h-11 rounded-xl text-sm font-bold border border-slate-200 text-[#D8232A] hover:bg-red-50 hover:border-red-200 transition-all active:scale-[0.98]"
                onClick={() => navigate('/signup')}
              >
                Create parent account
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
