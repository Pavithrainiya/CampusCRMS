import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Mail, Lock, Eye, EyeOff, Activity, User, Phone, CheckCircle, XCircle } from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Real-time password validation criteria
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const isPasswordStrong = Object.values(checks).every(Boolean);

  const validateForm = () => {
    const newErrors = {};
    if (!name) newErrors.name = 'Full name is required';
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10,15}$/.test(phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!isPasswordStrong) {
      newErrors.password = 'Password does not meet the complexity requirements';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const result = await register(name, email, phone, password);
    setIsLoading(false);

    if (result.success) {
      showToast('Registration successful! Please sign in.', 'success');
      navigate('/login');
    } else {
      // Map API errors
      if (result.errors) {
        const fieldErrors = {};
        Object.keys(result.errors).forEach((key) => {
          const val = result.errors[key];
          fieldErrors[key] = Array.isArray(val) ? val[0] : val;
        });
        setErrors(fieldErrors);
        
        // Show general error message
        const generalMessage = fieldErrors.non_field_errors || fieldErrors.error || 'Please correct the highlighted errors.';
        showToast(generalMessage, 'error');
      } else {
        showToast('Registration failed.', 'error');
      }
    }
  };

  const renderCheckIcon = (isTrue) => {
    return isTrue ? (
      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
    ) : (
      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-radial-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-primary-500/10 rounded-xl text-primary-400 border border-primary-500/20 mb-3 shadow-inner">
            <Activity className="w-8 h-8 animate-pulse-subtle" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Campus<span className="text-primary-400">RMS</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Student Account Registration</p>
        </div>

        {/* Panel Card */}
        <div className="glass-panel rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500" />
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <User className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-slate-200 text-sm ${
                      errors.name ? 'border-rose-500/50 focus:border-rose-500' : ''
                    }`}
                    placeholder="John Doe"
                  />
                </div>
                {errors.name && (
                  <span className="text-xs text-rose-400 font-medium mt-1 block">{errors.name}</span>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Phone className="w-5 h-5" />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-slate-200 text-sm ${
                      errors.phone ? 'border-rose-500/50 focus:border-rose-500' : ''
                    }`}
                    placeholder="1234567890"
                  />
                </div>
                {errors.phone && (
                  <span className="text-xs text-rose-400 font-medium mt-1 block">{errors.phone}</span>
                )}
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-slate-200 text-sm ${
                    errors.email ? 'border-rose-500/50 focus:border-rose-500' : ''
                  }`}
                  placeholder="john.doe@university.edu"
                />
              </div>
              {errors.email && (
                <span className="text-xs text-rose-400 font-medium mt-1 block">{errors.email}</span>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-lg glass-input text-slate-200 text-sm ${
                    errors.password ? 'border-rose-500/50 focus:border-rose-500' : ''
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <span className="text-xs text-rose-400 font-medium mt-1 block">{errors.password}</span>
              )}
            </div>

            {/* Password Rules Indicators */}
            <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-800 space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">
                Password Requirements
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  {renderCheckIcon(checks.length)}
                  <span className={checks.length ? 'text-emerald-400' : 'text-slate-400'}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {renderCheckIcon(checks.upper)}
                  <span className={checks.upper ? 'text-emerald-400' : 'text-slate-400'}>
                    One uppercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {renderCheckIcon(checks.lower)}
                  <span className={checks.lower ? 'text-emerald-400' : 'text-slate-400'}>
                    One lowercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {renderCheckIcon(checks.number)}
                  <span className={checks.number ? 'text-emerald-400' : 'text-slate-400'}>
                    One numeric digit
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {renderCheckIcon(checks.special)}
                  <span className={checks.special ? 'text-emerald-400' : 'text-slate-400'}>
                    One special character
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              ) : (
                'Create Student Account'
              )}
            </button>
          </form>

          {/* Login Link Footer */}
          <div className="mt-6 text-center border-t border-slate-800/60 pt-5">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary-400 hover:text-primary-300 font-semibold transition-colors duration-200"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
