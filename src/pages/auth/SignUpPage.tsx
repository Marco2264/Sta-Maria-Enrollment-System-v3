import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/Select';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  Loader2,
  Eye,
  EyeOff,
  User,
  Phone,
  Mail,
  Lock,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { normalizeRole } from '../../lib/roles';
import { motion } from 'framer-motion';

export function SignUpPage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  React.useEffect(() => {
    if (user && role) {
      const normalizedRole = normalizeRole(role);
      if (normalizedRole === 'subadmin' || normalizedRole === 'admin') {
        navigate('/admin');
      } else if (normalizedRole) {
        navigate(`/${normalizedRole}`);
      }
    }
  }, [user, role, navigate]);

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: 'None',
    relationship: 'Father',
    contactNumber: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    
    // Contact number validation (11 digits only)
    if (id === 'contactNumber') {
      const cleaned = value.replace(/\D/g, '').slice(0, 11);
      setFormData(prev => ({ ...prev, [id]: cleaned }));
      return;
    }

    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.contactNumber.length !== 11) {
      setError("Contact number must be exactly 11 digits.");
      return;
    }

    setIsRegistering(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const newUser = userCredential.user;

      await setDoc(doc(db, 'users', newUser.uid), {
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        suffix: formData.suffix,
        relationship: formData.relationship,
        contactNumber: formData.contactNumber,
        email: formData.email,
        role: 'parent',
        createdAt: new Date().toISOString()
      });

      navigate('/parent');
    } catch (err: unknown) {
      console.error(err);
      let message = "Failed to create account. Please try again.";
      
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered. Please use another or sign in.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Invalid email address format.";
      } else if (error.code === 'auth/weak-password') {
        message = "Password is too weak. Please use at least 6 characters.";
      } else if (error.code === 'auth/network-request-failed') {
        message = "Connection error. Please check your internet.";
      } else if (error.message) {
        message = error.message;
      }
      
      setError(message);
    } finally {
      setIsRegistering(false);
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
        className="relative z-10 w-full max-w-5xl bg-white/95 backdrop-blur-md rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden flex flex-col md:flex-row my-6"
      >
        {/* Left Side: Brand Showcase Panel */}
        <div 
          className="hidden md:flex md:w-[38%] p-10 flex-col justify-between text-white relative overflow-hidden bg-slate-900 bg-cover bg-center"
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
              Parent Portal
            </span>
            <h3 className="text-2xl font-black leading-tight tracking-tight text-white">
              Believe, Educate, and Transform
            </h3>
            <p className="text-xs text-slate-200/90 font-medium leading-relaxed">
              Access student portals, request quick online enrollments, and check academic progress grade cards.
            </p>
          </div>

          {/* Footer details */}
          <div className="relative z-10 text-left">
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Founded since 1920</p>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="w-full md:w-[62%] bg-white/70 backdrop-blur-md flex flex-col justify-center p-8 sm:p-12 overflow-y-auto max-h-[90vh]">
          <div className="w-full max-w-md mx-auto space-y-6 text-left">
            {/* Header Text */}
            <div className="text-left space-y-1">
              <div className="md:hidden flex items-center gap-2 mb-4">
                <img src="/pasted-image.jpg" alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
                <span className="font-extrabold text-xs text-slate-800 tracking-tight">Sta. Maria SPED</span>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Create Parent Account</h2>
              <p className="text-xs text-slate-400 font-medium">Join the portal to register and track student enrollment updates.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Personal Info Grid */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Personal Details</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="firstName" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="h-10 bg-white/80 border-slate-200 focus:border-[#1e60aa] focus:ring-[#1e60aa]/10 transition-colors rounded-xl text-sm" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="middleName" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Middle Name</Label>
                    <Input
                      id="middleName"
                      placeholder="Middle name"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      className="h-10 bg-white/80 border-slate-200 focus:border-[#1e60aa] focus:ring-[#1e60aa]/10 transition-colors rounded-xl text-sm" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="lastName" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="h-10 bg-white/80 border-slate-200 focus:border-[#1e60aa] focus:ring-[#1e60aa]/10 transition-colors rounded-xl text-sm" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Suffix</Label>
                    <Select
                      value={formData.suffix}
                      onValueChange={(v) => handleSelectChange('suffix', v)}>
                      <SelectTrigger className="h-10 bg-white/80 border-slate-200 focus:border-[#1e60aa] focus:ring-[#1e60aa]/10 transition-colors rounded-xl text-sm text-slate-700">
                        <SelectValue placeholder="Select suffix" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Jr.">Jr.</SelectItem>
                        <SelectItem value="Sr.">Sr.</SelectItem>
                        <SelectItem value="II">II</SelectItem>
                        <SelectItem value="III">III</SelectItem>
                        <SelectItem value="IV">IV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Relationship</Label>
                    <Select
                      value={formData.relationship}
                      onValueChange={(v) => handleSelectChange('relationship', v)}>
                      <SelectTrigger className="h-10 bg-white/80 border-slate-200 focus:border-[#1e60aa] focus:ring-[#1e60aa]/10 transition-colors rounded-xl text-sm text-slate-700">
                        <SelectValue placeholder="Select relation" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        <SelectItem value="Father">Father</SelectItem>
                        <SelectItem value="Mother">Mother</SelectItem>
                        <SelectItem value="Guardian">Guardian</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="contactNumber" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Contact Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="contactNumber"
                        placeholder="09123456789"
                        value={formData.contactNumber}
                        onChange={handleInputChange}
                        required
                        className="h-10 pl-10 bg-white/80 border-slate-200 focus:border-[#1e60aa] focus:ring-[#1e60aa]/10 transition-colors rounded-xl text-sm" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Credentials */}
              <div className="space-y-3.5 pt-1">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Account Credentials</h3>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="email" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="h-10 pl-10 bg-white/80 border-slate-200 focus:border-[#1e60aa] focus:ring-[#1e60aa]/10 transition-colors rounded-xl text-sm" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="h-10 pr-10 bg-white/80 border-slate-200 focus:border-[#1e60aa] focus:ring-[#1e60aa]/10 transition-colors rounded-xl text-sm" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        className="h-10 pr-10 bg-white/80 border-slate-200 focus:border-[#1e60aa] focus:ring-[#1e60aa]/10 transition-colors rounded-xl text-sm" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-xs font-semibold text-rose-600 text-center bg-rose-50 border border-rose-100 p-3 rounded-xl"
                >
                  {error}
                </motion.div>
              )}

              <div className="pt-4 border-t border-slate-200/60 space-y-3">
                <Button 
                  type="submit" 
                  className="w-full h-11 text-sm font-bold rounded-xl shadow-md bg-gradient-to-r from-[#1e60aa] to-[#2575cd] hover:from-[#195292] hover:to-[#1e63b0] text-white transition-all active:scale-98 flex items-center justify-center gap-1.5 border-none" 
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  type="button"
                  className="w-full h-11 rounded-xl text-sm font-bold border border-slate-200 text-[#1e60aa] hover:bg-[#1e60aa]/5 hover:border-[#1e60aa]/30 transition-all active:scale-98"
                  onClick={() => navigate('/login')}
                >
                  Already have an account? Sign In
                </Button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
