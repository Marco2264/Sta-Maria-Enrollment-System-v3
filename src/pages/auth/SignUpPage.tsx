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
  ShieldCheck
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
      className="min-h-screen relative flex items-center justify-center overflow-hidden p-4 md:p-8 bg-slate-900 bg-cover bg-top bg-no-repeat"
      style={{ backgroundImage: 'url(/STA_maria_background.jpg)' }}
    >
      {/* Dark Overlay over the background image */}
      <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-md z-0" />
      
      {/* Floating Centered Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-xl bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden border border-white/20"
      >
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Create an Account
            </h1>
            <p className="text-[10px] font-medium text-slate-500 mt-1 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-primary" /> Join the Sta. Maria Community
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <User className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Personal Information</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="firstName" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="middleName" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Middle Name</Label>
                  <Input
                    id="middleName"
                    placeholder="Enter middle name"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="lastName" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Suffix</Label>
                  <Select
                    value={formData.suffix}
                    onValueChange={(v) => handleSelectChange('suffix', v)}>
                    <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm">
                      <SelectValue placeholder="Select suffix" />
                    </SelectTrigger>
                    <SelectContent>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Relationship</Label>
                  <Select
                    value={formData.relationship}
                    onValueChange={(v) => handleSelectChange('relationship', v)}>
                    <SelectTrigger className="h-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Father">Father</SelectItem>
                      <SelectItem value="Mother">Mother</SelectItem>
                      <SelectItem value="Guardian">Guardian</SelectItem>
                      <SelectItem value="Others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contactNumber" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Contact Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="contactNumber"
                      placeholder="09123456789"
                      value={formData.contactNumber}
                      onChange={handleInputChange}
                      required
                      className="h-9 pl-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <Lock className="w-4 h-4 text-primary" />
                <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Account Information</h3>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="h-9 pl-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="h-9 pr-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      className="h-9 pr-9 bg-slate-50/50 border-slate-200 focus:bg-white text-sm" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none">
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
                className="text-[10px] font-semibold text-rose-600 text-center bg-rose-50 border border-rose-100 p-2 rounded-lg"
              >
                {error}
              </motion.div>
            )}

            <div className="pt-4 border-t border-slate-200">
              <Button 
                type="submit" 
                className="w-full h-9 text-sm font-bold rounded-lg shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0 mb-3" 
                disabled={isRegistering}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
              
              <Button
                variant="outline"
                type="button"
                className="w-full h-9 rounded-lg text-sm font-bold border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all"
                onClick={() => navigate('/login')}
              >
                Already have an account? Sign In
              </Button>
            </div>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
