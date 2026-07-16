import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
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
      className="min-h-screen relative flex items-center justify-center overflow-hidden p-4 bg-slate-900 bg-cover bg-top bg-no-repeat"
      style={{ backgroundImage: 'url(/STA_maria_background.jpg)' }}
    >
      {/* Dark Overlay over the background image */}
      <div className="absolute inset-0 bg-slate-950/20 z-0" />
      
      {/* Floating Centered Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[320px] bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden border border-white/20 mt-36"
      >
        <div className="p-6 flex flex-col space-y-5">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Sign In
            </h1>
            <p className="text-[10px] font-medium text-slate-500 mt-1 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-primary" /> Secure Portal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-colors text-sm" 
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Password</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white transition-colors pr-9 text-sm" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
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
                className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg text-center"
              >
                {error}
              </motion.div>
            )}

            <Button 
              type="submit" 
              className="w-full h-9 text-sm font-bold rounded-lg shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0" 
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              type="button"
              className="w-full h-9 rounded-lg text-sm font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
              onClick={() => navigate('/signup')}
            >
              Create an Account
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
