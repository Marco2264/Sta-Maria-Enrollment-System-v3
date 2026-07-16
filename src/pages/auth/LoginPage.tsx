import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { normalizeRole } from '../../lib/roles';
import { motion } from 'framer-motion';

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
    if (roleParam) {
      setEmail(`${roleParam}@school.edu`);
    }
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedUser = userCredential.user;

      // Fetch user role from Firestore
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
          setError("Invalid user role. Please contact administrator.");
        }
      } else {
        setError("User role not found. Please contact administrator.");
      }
    } catch (err) {
      console.error(err);
      const errorObj = err as Error & { message?: string };
      setError(errorObj.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950 bg-cover bg-center font-sans"
      style={{ backgroundImage: 'url(/STA_maria_background.jpg)' }}
    >
      {/* Glass Backdrop Blur Overlay */}
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[4px] z-0" />

      {/* Floating Centered Split-Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-4xl min-h-[500px] bg-white/95 backdrop-blur-md rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden flex flex-col md:flex-row"
      >
        {/* Left Side: Brand Showcase Panel */}
        <div 
          className="hidden md:flex md:w-[42%] p-10 flex-col justify-between text-white relative overflow-hidden bg-slate-900 bg-cover bg-center"
          style={{ backgroundImage: 'url(/login_img.png)' }}
        >
          {/* Glass Gradient overlay (Just like the second picture) */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c2a50]/85 via-[#103a6c]/90 to-[#1e60aa]/95 z-0" />
          
          {/* Logo Brand Header */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-1.5 bg-white/10 rounded-2xl border border-white/20 shadow-sm shrink-0">
              <img src="/pasted-image.jpg" alt="Logo" className="w-8 h-8 rounded-xl object-cover" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-sm tracking-tight leading-none text-white">Sta. Maria</span>
              <span className="text-[10px] font-bold text-sky-300 uppercase tracking-widest leading-none mt-1">SPED Center</span>
            </div>
          </div>

          {/* Slogan & Values */}
          <div className="relative z-10 space-y-4 my-auto text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/15 text-[9px] font-extrabold uppercase tracking-widest text-sky-200">
              Secure Portal
            </span>
            <h3 className="text-2xl font-black leading-tight tracking-tight text-white">
              Believe, Educate, and Transform
            </h3>
            <p className="text-xs text-slate-200/90 font-medium leading-relaxed">
              Access school modules, encoding dashboards, child records, and attendance logs.
            </p>
          </div>

          {/* Footer details */}
          <div className="relative z-10 text-left">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Founded since 1920</p>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="w-full md:w-[58%] bg-white/70 backdrop-blur-md flex flex-col justify-center p-8 sm:p-12 md:p-14 overflow-y-auto">
          <div className="w-full max-w-sm mx-auto space-y-8">
            {/* Header Text */}
            <div className="text-left space-y-1">
              <div className="md:hidden flex items-center gap-2 mb-4">
                <img src="/pasted-image.jpg" alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
                <span className="font-extrabold text-xs text-slate-800 tracking-tight">Sta. Maria SPED</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Welcome Back</h2>
              <p className="text-sm text-slate-400 font-medium">Sign in to your school account portal.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="email" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 bg-white/60 border-slate-200 focus:border-[#1e60aa] focus:ring-[#1e60aa]/10 transition-colors rounded-xl text-sm" 
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label htmlFor="password" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-11 bg-white/60 border-slate-200 focus:border-[#1e60aa] focus:ring-[#1e60aa]/10 transition-colors pr-10 rounded-xl text-sm" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="text-xs font-semibold text-rose-600 bg-rose-50/80 border border-rose-100 p-3 rounded-xl text-center"
              >
                {error}
              </motion.div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 text-sm font-bold rounded-xl shadow-md bg-gradient-to-r from-[#1e60aa] to-[#2575cd] hover:from-[#195292] hover:to-[#1e63b0] text-white transition-all active:scale-98 flex items-center justify-center gap-1.5 border-none mt-2" 
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Account Creation Block */}
          <div className="pt-6 border-t border-slate-200/60 space-y-3">
            <p className="text-xs text-slate-400 font-semibold text-center">New to Sta. Maria Portal?</p>
            <Button
              variant="outline"
              type="button"
              className="w-full h-11 rounded-xl text-sm font-bold border border-slate-200 text-[#1e60aa] hover:bg-[#1e60aa]/5 hover:border-[#1e60aa]/30 transition-all active:scale-98"
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
