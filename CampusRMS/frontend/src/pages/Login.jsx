import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { Mail, Lock, Eye, EyeOff, Activity, ArrowRight } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      showToast('Welcome to CampusRMS!', 'success');
      navigate('/dashboard');
    } else {
      showToast(result.error, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-radial-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-primary-500/10 rounded-xl text-primary-400 border border-primary-500/20 mb-3 shadow-inner">
            <Activity className="w-8 h-8 animate-pulse-subtle" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Campus<span className="text-primary-400">RMS</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Resource Management System Login</p>
        </div>

        {/* Login Form Panel */}
        <div className="glass-panel rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500" />
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
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
                  className={`w-full pl-10 pr-4 py-3 rounded-lg glass-input text-slate-200 text-sm ${
                    errors.email ? 'border-rose-500/50 focus:border-rose-500' : ''
                  }`}
                  placeholder="name@university.edu"
                />
              </div>
              {errors.email && (
                <span className="text-xs text-rose-400 font-medium mt-1 block">{errors.email}</span>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-10 py-3 rounded-lg glass-input text-slate-200 text-sm ${
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200"
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Link Footer */}
          <div className="mt-8 text-center border-t border-slate-800/60 pt-6">
            <p className="text-xs text-slate-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-primary-400 hover:text-primary-300 font-semibold transition-colors duration-200"
              >
                Create student account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
