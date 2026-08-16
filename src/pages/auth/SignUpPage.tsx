import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
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
  Phone,
  Mail,
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  Building,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { normalizeRole } from '../../lib/roles';
import { motion, AnimatePresence } from 'framer-motion';

// Province & City Data for Zamboanga Region
const PROVINCES_CITIES: Record<string, string[]> = {
  'Zamboanga City': ['Zamboanga City'],
  'Zamboanga del Sur': [
    'Pagadian City', 'Aurora', 'Bayog', 'Dimataling', 'Dinas', 'Dumalinao',
    'Dumingag', 'Guipos', 'Josefina', 'Kumalarang', 'Labangan', 'Lakewood',
    'Lapuyan', 'Mahayag', 'Margosatubig', 'Midsalip', 'Molave', 'Pitogo',
    'Ramon Magsaysay', 'San Pablo', 'San Miguel', 'Tabina', 'Tamboulig',
    'Tigbao', 'Tukuran', 'Vincenzo A. Sagun'
  ],
  'Zamboanga del Norte': [
    'Dipolog City', 'Dapitan City', 'Bacungan', 'Baliguian', 'Godod', 'Gutalac',
    'Jose Dalman', 'Kalawit', 'Katipunan', 'La Libertad', 'Labason', 'Leon B. Postigo',
    'Liloy', 'Manukan', 'Mutia', 'Pinan', 'Polanco', 'President Manuel A. Roxas',
    'Rizal', 'Salug', 'Sergio Osmena Sr.', 'Siayan', 'Sibuco', 'Sirawai', 'Siocon'
  ],
  'Zamboanga Sibugay': [
    'Ipil', 'Alicia', 'Buug', 'Diplahan', 'Imelda', 'Kabasalan', 'Mabuhay',
    'Malangas', 'Naga', 'Olutanga', 'Payao', 'Roseller Lim', 'Siay', 'Talusan',
    'Titay', 'Tungawan'
  ]
};

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

export function SignUpPage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [step, setStep] = useState(1);
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
    lastName: '',
    middleName: '',
    suffix: 'None',
    relationship: 'Father',
    contactNumber: '',
    email: '',
    province: 'Zamboanga City',
    city: 'Zamboanga City',
    customProvince: '',
    customCity: '',
    barangay: '',
    streetAddress: '',
    zipCode: '',
    username: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;

    if (id === 'contactNumber') {
      const cleaned = value.replace(/\D/g, '').slice(0, 11);
      setFormData(prev => ({ ...prev, [id]: cleaned }));
      return;
    }

    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id: string, value: string) => {
    if (id === 'province') {
      if (value === 'Others') {
        setFormData(prev => ({
          ...prev,
          province: 'Others',
          city: 'Others'
        }));
        return;
      }

      const availableCities = PROVINCES_CITIES[value] || [];
      setFormData(prev => ({
        ...prev,
        province: value,
        city: availableCities[0] || ''
      }));
      return;
    }

    if (id === 'city') {
      let matchedProvince = formData.province;
      for (const [prov, cities] of Object.entries(PROVINCES_CITIES)) {
        if (cities.includes(value)) {
          matchedProvince = prov;
          break;
        }
      }
      setFormData(prev => ({ ...prev, province: matchedProvince, city: value }));
      return;
    }

    setFormData(prev => ({ ...prev, [id]: value }));
  };

  // Password Validation Rules
  const passLength = formData.password.length >= 8;
  const passUpper = /[A-Z]/.test(formData.password);
  const passNumber = /[0-9]/.test(formData.password);
  const passValid = passLength && passUpper && passNumber;

  const finalProvince = formData.province === 'Others' ? formData.customProvince.trim() : formData.province;
  const finalCity = formData.province === 'Others' ? formData.customCity.trim() : formData.city;

  // Step Validation Logic
  const handleNext = () => {
    setError(null);

    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError('Please enter both your First Name and Last Name.');
        return;
      }
    } else if (step === 3) {
      if (!formData.relationship) {
        setError('Please select your relationship to the student.');
        return;
      }
    } else if (step === 4) {
      if (formData.contactNumber.length !== 11) {
        setError('Mobile number must be exactly 11 digits (e.g. 09123456789).');
        return;
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setError('Please enter a valid email address.');
        return;
      }
    } else if (step === 5) {
      if (formData.province === 'Others') {
        if (!formData.customProvince.trim() || !formData.customCity.trim()) {
          setError('Please enter both your province and city/municipality.');
          return;
        }
      } else {
        if (!formData.province || !formData.city) {
          setError('Please select your province and city/municipality.');
          return;
        }
      }
    } else if (step === 6) {
      if (!formData.barangay.trim()) {
        setError('Please enter your Barangay.');
        return;
      }
      if (!formData.streetAddress.trim()) {
        setError('Please enter your Street Address.');
        return;
      }
    } else if (step === 7) {
      if (!formData.username.trim()) {
        setError('Please choose a Username.');
        return;
      }
      if (!passValid) {
        setError('Password does not meet all security requirements.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setStep(prev => Math.min(prev + 1, 8));
  };

  const handleBack = () => {
    setError(null);
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
        province: finalProvince,
        city: finalCity,
        barangay: formData.barangay,
        streetAddress: formData.streetAddress,
        zipCode: formData.zipCode,
        username: formData.username,
        role: 'parent',
        createdAt: new Date().toISOString()
      });

      navigate('/parent');
    } catch (err: unknown) {
      console.error(err);
      let message = 'Failed to create account. Please try again.';
      const errorObj = err as { code?: string; message?: string };
      if (errorObj.code === 'auth/email-already-in-use') {
        message = 'This email is already registered. Please sign in or use another email.';
      } else if (errorObj.code === 'auth/invalid-email') {
        message = 'Invalid email address format.';
      } else if (errorObj.code === 'auth/weak-password') {
        message = 'Password is too weak. Please use at least 6 characters.';
      } else if (errorObj.message) {
        message = errorObj.message;
      }
      setError(message);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-slate-950">
      {/* Sta. Maria Campus Background with Atmospheric Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src="/images/sta_maria_new.jpg"
          alt="Sta. Maria School Background"
          className="w-full h-full object-cover object-center transform scale-105"
        />
        {/* Soft luxury dark gradient & blur overlay */}
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[3px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/70" />
      </div>

      {/* Floating Centered Split-Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-5xl overflow-hidden flex flex-col md:flex-row bg-white rounded-[2rem] border border-white/30 shadow-[0_25px_80px_rgba(0,0,0,0.45)] my-6"
      >
        {/* ── LEFT PANEL ── Soothing Midnight Slate Luxury Canvas (Zero Eye Strain) ── */}
        <div
          className="hidden md:flex md:w-[38%] flex-col justify-between p-10 lg:p-12 text-white relative overflow-hidden shrink-0"
          style={{ background: 'linear-gradient(155deg, #070c18 0%, #0f172a 50%, #1e293b 100%)' }}
        >
          {/* Subtle Ambient Lighting Overlays */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-slate-700/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/[0.06] via-transparent to-transparent pointer-events-none" />

          {/* TOP: Both logos + school name */}
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

          {/* MIDDLE: Main content */}
          <div className="relative z-10 space-y-5 my-auto py-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/[0.08] text-[10px] font-extrabold uppercase tracking-[0.15em] text-amber-300 backdrop-blur-md shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
              Parent Portal
            </span>
            <h3 className="text-3xl lg:text-4xl font-black leading-tight tracking-tight text-white">
              Create Parent<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-rose-400">Account</span>
            </h3>
            <p className="text-sm text-slate-300 font-medium leading-relaxed max-w-[260px]">
              Join the portal to register students, monitor academic progress, track attendance, and receive school announcements.
            </p>
          </div>

          {/* BOTTOM: Founded */}
          <div className="relative z-10">
            <div className="h-px bg-white/10 w-full mb-4" />
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-md">
              <p className="text-[10px] font-extrabold text-slate-300 uppercase tracking-[0.18em]">Founded Since 1920</p>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: GUIDED ONBOARDING MULTI-STEP CONTENT SECTION ── */}
        <div className="w-full md:w-[62%] bg-white flex flex-col justify-between p-8 sm:p-12 min-h-[520px] overflow-y-auto">
          <div className="w-full max-w-md mx-auto space-y-6 text-left my-auto">

            {/* Mobile logo header (shown only on small screens) */}
            <div className="md:hidden flex items-center gap-2 mb-2">
              <img src="/images/sta_maria_school_logo.jpg" alt="Logo" className="w-7 h-7 rounded-lg object-cover" />
              <span className="font-extrabold text-xs text-slate-800 tracking-tight">Sta. Maria SPED — Parent Account</span>
            </div>

            {/* ── PROGRESS BAR & ESTIMATED TIME ── */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D8232A]">
                  STEP {step} OF 8
                </span>
                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Estimated completion: 2–3 mins
                </span>
              </div>

              {/* Smooth Progress Bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#D8232A] rounded-full"
                  initial={{ width: '12.5%' }}
                  animate={{ width: `${(step / 8) * 100}%` }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                />
              </div>
            </div>

            {/* ── STEP CONTENT WITH ANIMATION ── */}
            <form onSubmit={(e) => e.preventDefault()} className="space-y-6 pt-2">
              <AnimatePresence mode="wait">

                {/* STEP 1 OF 8 */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900">What is your name?</h3>
                      <p className="text-xs text-slate-400">Please enter your legal first and last name.</p>
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <FloatInput
                        id="firstName"
                        label="First Name *"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        autoFocus
                      />
                      <FloatInput
                        id="lastName"
                        label="Last Name *"
                        value={formData.lastName}
                        onChange={handleInputChange}
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 2 OF 8 */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900">Additional Information</h3>
                      <p className="text-xs text-slate-400">Optional name details for your profile.</p>
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <FloatInput
                        id="middleName"
                        label="Middle Initial / Name (Optional)"
                        value={formData.middleName}
                        onChange={handleInputChange}
                        autoFocus
                      />
                      <div className="space-y-1.5 text-left">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Suffix (Optional)</Label>
                        <Select
                          value={formData.suffix}
                          onValueChange={(v) => handleSelectChange('suffix', v)}
                        >
                          <SelectTrigger className="h-14 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 rounded-xl text-sm font-medium text-slate-900">
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
                  </motion.div>
                )}

                {/* STEP 3 OF 8 */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900">What is your relationship to the student?</h3>
                      <p className="text-xs text-slate-400">This helps the school verify student guardianship.</p>
                    </div>

                    <div className="space-y-1.5 pt-2 text-left">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Relationship *</Label>
                      <Select
                        value={formData.relationship}
                        onValueChange={(v) => handleSelectChange('relationship', v)}
                      >
                        <SelectTrigger className="h-14 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 rounded-xl text-sm font-medium text-slate-900">
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="Father">Father</SelectItem>
                          <SelectItem value="Mother">Mother</SelectItem>
                          <SelectItem value="Guardian">Guardian</SelectItem>
                          <SelectItem value="Grandparent">Grandparent</SelectItem>
                          <SelectItem value="Relative">Relative</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4 OF 8 */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900">How can we contact you?</h3>
                      <p className="text-xs text-slate-400">Used for official announcements and emergency notices.</p>
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <FloatInput
                        id="contactNumber"
                        label="Mobile Number *"
                        value={formData.contactNumber}
                        onChange={handleInputChange}
                        icon={<Phone className="h-4 w-4 text-slate-400" />}
                        autoFocus
                      />
                      <FloatInput
                        id="email"
                        type="email"
                        label="Email Address *"
                        value={formData.email}
                        onChange={handleInputChange}
                        icon={<Mail className="h-4 w-4 text-slate-400" />}
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 5 OF 8 */}
                {step === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900">Where do you live?</h3>
                      <p className="text-xs text-slate-400">Select your province and city or municipality.</p>
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <div className="space-y-1.5 text-left">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">Province *</Label>
                        <Select
                          value={formData.province}
                          onValueChange={(v) => handleSelectChange('province', v)}
                        >
                          <SelectTrigger className="h-14 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 rounded-xl text-sm font-medium text-slate-900">
                            <SelectValue placeholder="Select province" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200">
                            {Object.keys(PROVINCES_CITIES).map((prov) => (
                              <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                            ))}
                            <SelectItem value="Others">Others</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.province === 'Others' ? (
                        <>
                          <FloatInput
                            id="customProvince"
                            label="Specify Province *"
                            value={formData.customProvince}
                            onChange={handleInputChange}
                            autoFocus
                          />
                          <FloatInput
                            id="customCity"
                            label="Specify City / Municipality *"
                            value={formData.customCity}
                            onChange={handleInputChange}
                          />
                        </>
                      ) : (
                        <div className="space-y-1.5 text-left">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5">City / Municipality *</Label>
                          <Select
                            value={formData.city}
                            onValueChange={(v) => handleSelectChange('city', v)}
                          >
                            <SelectTrigger className="h-14 bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 rounded-xl text-sm font-medium text-slate-900">
                              <SelectValue placeholder="Select city / municipality" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 max-h-56 overflow-y-auto">
                              {(PROVINCES_CITIES[formData.province] || []).map((ct) => (
                                <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 6 OF 8 */}
                {step === 6 && (
                  <motion.div
                    key="step6"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900">Complete your address</h3>
                      <p className="text-xs text-slate-400">Enter your barangay and street address details.</p>
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <FloatInput
                        id="barangay"
                        label="Barangay *"
                        value={formData.barangay}
                        onChange={handleInputChange}
                        autoFocus
                      />
                      <FloatInput
                        id="streetAddress"
                        label="Street Address *"
                        value={formData.streetAddress}
                        onChange={handleInputChange}
                      />
                      <FloatInput
                        id="zipCode"
                        label="ZIP Code (Optional)"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                      />
                    </div>
                  </motion.div>
                )}

                {/* STEP 7 OF 8 */}
                {step === 7 && (
                  <motion.div
                    key="step7"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900">Create your account</h3>
                      <p className="text-xs text-slate-400">Set up your username and password for future logins.</p>
                    </div>

                    <div className="space-y-3.5 pt-2">
                      <FloatInput
                        id="username"
                        label="Username *"
                        value={formData.username}
                        onChange={handleInputChange}
                        autoFocus
                      />

                      <FloatInput
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        label="Password *"
                        value={formData.password}
                        onChange={handleInputChange}
                        suffix={
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-slate-400 hover:text-slate-600 focus:outline-none"
                          >
                            {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                        }
                      />

                      <FloatInput
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        label="Confirm Password *"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        suffix={
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="text-slate-400 hover:text-slate-600 focus:outline-none"
                          >
                            {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                        }
                      />

                      {/* Live Password Rules Validation */}
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs font-medium transition-all">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          PASSWORD REQUIREMENTS:
                        </p>
                        <div className="flex items-center gap-2 transition-all">
                          {passLength ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span className={passLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                            Minimum 8 characters
                          </span>
                        </div>
                        <div className="flex items-center gap-2 transition-all">
                          {passUpper ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span className={passUpper ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                            At least one uppercase letter (A-Z)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 transition-all">
                          {passNumber ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <span className={passNumber ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                            At least one number (0-9)
                          </span>
                        </div>
                        {formData.confirmPassword.length > 0 && (
                          <div className="flex items-center gap-2 transition-all pt-1 border-t border-slate-200/60">
                            {formData.password === formData.confirmPassword ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            )}
                            <span className={formData.password === formData.confirmPassword ? 'text-emerald-700 font-bold' : 'text-rose-600 font-semibold'}>
                              {formData.password === formData.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 8 OF 8 */}
                {step === 8 && (
                  <motion.div
                    key="step8"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-slate-900">Review and Submit</h3>
                      <p className="text-xs text-slate-400">Please review your information before completing registration.</p>
                    </div>

                    {/* Summary Card */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4 text-xs">

                      {/* Personal Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                          <UserCheck className="w-3.5 h-3.5 text-[#D8232A]" />
                          Personal Information
                        </div>
                        <div className="pl-5 text-slate-600 leading-relaxed">
                          <p><span className="font-semibold text-slate-800">Full Name:</span> {formData.firstName} {formData.middleName ? `${formData.middleName} ` : ''}{formData.lastName} {formData.suffix !== 'None' ? formData.suffix : ''}</p>
                          <p><span className="font-semibold text-slate-800">Relationship:</span> {formData.relationship}</p>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200/70" />

                      {/* Contact Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                          <Phone className="w-3.5 h-3.5 text-[#D8232A]" />
                          Contact Information
                        </div>
                        <div className="pl-5 text-slate-600 leading-relaxed">
                          <p><span className="font-semibold text-slate-800">Mobile Number:</span> {formData.contactNumber}</p>
                          <p><span className="font-semibold text-slate-800">Email Address:</span> {formData.email}</p>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200/70" />

                      {/* Address Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                          <MapPin className="w-3.5 h-3.5 text-[#D8232A]" />
                          Address Information
                        </div>
                        <div className="pl-5 text-slate-600 leading-relaxed">
                          <p><span className="font-semibold text-slate-800">Address:</span> {formData.streetAddress}, Brgy. {formData.barangay}</p>
                          <p><span className="font-semibold text-slate-800">Location:</span> {finalCity}, {finalProvince} {formData.zipCode ? `(${formData.zipCode})` : ''}</p>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200/70" />

                      {/* Account Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                          <Building className="w-3.5 h-3.5 text-[#D8232A]" />
                          Account Information
                        </div>
                        <div className="pl-5 text-slate-600 leading-relaxed">
                          <p><span className="font-semibold text-slate-800">Username:</span> {formData.username}</p>
                        </div>
                      </div>

                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* Error Banner */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-xs font-semibold text-rose-600 text-center bg-rose-50 border border-rose-100 p-3 rounded-xl"
                >
                  {error}
                </motion.div>
              )}

              {/* Navigation Actions */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex gap-3">
                  {step > 1 && (
                    <Button
                      type="button"
                      onClick={handleBack}
                      variant="outline"
                      className="w-1/3 h-12 text-sm font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </Button>
                  )}

                  {step < 8 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className={`${step === 1 ? 'w-full' : 'w-2/3'} h-12 text-sm font-bold rounded-xl text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 border-none`}
                      style={{ background: 'linear-gradient(135deg, #991b1e 0%, #D8232A 100%)', boxShadow: '0 4px 20px rgba(216,35,42,0.35)' }}
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      className="w-2/3 h-12 text-sm font-bold rounded-xl text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 border-none"
                      style={{ background: 'linear-gradient(135deg, #991b1e 0%, #D8232A 100%)', boxShadow: '0 4px 20px rgba(216,35,42,0.35)' }}
                      disabled={isRegistering}
                    >
                      {isRegistering ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <span>Submit Registration</span>
                          <Check className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  type="button"
                  className="w-full h-11 rounded-xl text-sm font-bold border border-slate-200 text-[#D8232A] hover:bg-red-50 hover:border-red-200 transition-all active:scale-[0.98] cursor-pointer"
                  onClick={() => navigate('/login')}
                >
                  Already have an account? Sign In
                </Button>

                {/* Neat Back to Home Link */}
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-[#D8232A] transition-colors cursor-pointer uppercase tracking-wider py-1"
                  >
                    <span>← Back to Home Page</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
