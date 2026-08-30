import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Compass
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { supabase } from '../supabaseClient';

export const LoginScreen: React.FC = () => {
  const {
    login,
    register,
    setCurrentScreen,
    authPromptMessage,
    authModalMode,
    setAuthModalMode,
    showToast,
  } = useShop();

  const [mode, setMode] = useState<'login' | 'register'>(authModalMode || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'email':
        if (!value.trim()) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address (e.g. client@domain.com)';
        }
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters';
        return '';
      case 'name':
        if (mode === 'register') {
          if (!value.trim()) return 'Full name is required';
          if (value.trim().length < 2) return 'Name must be at least 2 characters';
        }
        return '';
      case 'confirmPassword':
        if (mode === 'register') {
          if (!value) return 'Please confirm your password';
          if (value !== password) return 'Passwords do not match';
        }
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const val = field === 'email' ? email : field === 'password' ? password : field === 'name' ? name : confirmPassword;
    const error = validateField(field, val);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (isForgotPassword) {
      const emailErr = validateField('email', email);
      if (emailErr) newErrors.email = emailErr;
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }

    const emailErr = validateField('email', email);
    if (emailErr) newErrors.email = emailErr;

    const passErr = validateField('password', password);
    if (passErr) newErrors.password = passErr;

    if (mode === 'register') {
      const nameErr = validateField('name', name);
      if (nameErr) newErrors.name = nameErr;

      const confErr = validateField('confirmPassword', confirmPassword);
      if (confErr) newErrors.confirmPassword = confErr;

      if (!agreeTerms) {
        newErrors.agreeTerms = 'You must accept the terms to continue';
      }
    }

    setErrors(newErrors);
    setTouched({
      email: true,
      password: true,
      name: true,
      confirmPassword: true,
    });
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setInfoMessage(null);

    if (isForgotPassword) {
      if (!validateField('email', email)) {
        setIsSubmitting(true);
        setTimeout(() => {
          setIsSubmitting(false);
          setForgotPasswordSubmitted(true);
        }, 600);
      }
      return;
    }

    if (!validateAll()) return;

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setServerError(error.message || 'Invalid email or password. Please try again.');
          return;
        }

        // Only redirect when a real session exists after login
        if (data?.session) {
          const displayName = data.user?.user_metadata?.full_name || email.split('@')[0];
          await login(email, password, displayName);
          setCurrentScreen('home');
          window.location.hash = '/';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          setServerError('Could not establish an active session. Please check your credentials.');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              name: name.trim(),
            },
          },
        });

        if (error) {
          if (error.message?.toLowerCase().includes('rate limit')) {
            setServerError('Supabase email rate limit reached (free tier allows 3-4 verification emails/hr). Please wait a few minutes, or disable "Confirm email" in your Supabase Dashboard under Authentication -> Providers -> Email.');
          } else {
            setServerError(error.message || 'Could not create account. Please try again.');
          }
          return;
        }

        // Store profile record if user is returned
        if (data?.user) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              full_name: name.trim(),
              email: email.trim(),
              updated_at: new Date().toISOString(),
            });
          } catch {
            // Non-blocking: profile table or RLS might be managed via database triggers
          }
        }

        // After signUp(), if data.session is null, don’t redirect to the dashboard.
        // Just show: "Check your email and confirm your account before logging in."
        if (!data?.session) {
          setInfoMessage('Check your email and confirm your account before logging in.');
          return;
        }

        // Only redirect when a real session exists
        const displayName = name.trim() || data.user?.user_metadata?.full_name || email.split('@')[0];
        await register(displayName, email, password);
        setCurrentScreen('home');
        window.location.hash = '/';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setServerError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      
      {/* Breadcrumbs */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-xs text-[#8c857d] mb-8 flex items-center space-x-2"
      >
        <span onClick={() => setCurrentScreen('home')} className="hover:text-[#181614] cursor-pointer transition-colors">Home</span>
        <span>›</span>
        <span className="text-[#181614] font-medium">Client Access</span>
      </motion.nav>

      {/* Main Split Layout: Editorial Brand Left, Form Card Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        
        {/* Left Column: Brand Story and Benefits */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 space-y-8"
        >
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#f3ece0] border border-[#e2d6c3] text-[#8c562e] text-[11px] font-semibold tracking-widest uppercase rounded-full">
              <Sparkles className="w-3 h-3 text-[#8c562e]" />
              <span>Atelier Membership</span>
            </div>
            
            <h1 className="font-serif-luxury text-4xl sm:text-5xl font-bold tracking-tight text-[#181614] leading-[1.15]">
              Welcome to the Stunning Birds Atelier
            </h1>
            
            <p className="text-base text-[#5c544d] leading-relaxed">
              Sign in to manage your custom commissions, monitor hand-stitching progress in real time, and maintain your curated collection of admired leather goods.
            </p>
          </div>

          {/* Value props list */}
          <div className="space-y-4 pt-2">
            {[
              { title: 'Live Atelier Commission Tracker', desc: 'Watch your bespoke order move from cutting to saddle-stitching and dispatch.' },
              { title: 'Complimentary Monogram Archive', desc: 'Save preferred initials and foil stamping styles for seamless reorders.' },
              { title: 'Patron Society Points', desc: 'Earn 10 points per ₹100 toward complimentary conditioning balms and priority drops.' },
            ].map((item, idx) => (
              <div key={idx} className="flex space-x-3 items-start p-3 bg-white border border-[#ece4d8] rounded-xs shadow-2xs">
                <div className="w-5 h-5 rounded-full bg-[#f6f2ea] text-[#8c562e] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ✓
                </div>
                <div>
                  <h4 className="font-serif-luxury text-sm font-semibold text-[#181614]">{item.title}</h4>
                  <p className="text-xs text-[#78716c] mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </motion.div>

        {/* Right Column: Form Card */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 bg-white border border-[#ded5c7] rounded-xs shadow-xl p-6 sm:p-10 space-y-6"
        >
          
          <div className="text-center space-y-2 border-b border-[#eee7dc] pb-6">
            <div className="w-12 h-12 rounded-full bg-[#181614] text-[#d4af37] flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <h2 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-[#181614]">
              {isForgotPassword
                ? 'Reset Password'
                : mode === 'login'
                ? 'Client Sign In'
                : 'Create Atelier Account'}
            </h2>
            {authPromptMessage && (
              <p className="text-xs text-[#8c562e] font-medium bg-[#fcf8f2] p-2 border border-[#eddccb] rounded-xs">
                {authPromptMessage}
              </p>
            )}
          </div>

          {/* Mode Switcher */}
          {!isForgotPassword && (
            <div className="grid grid-cols-2 bg-[#eee7dc] p-1 rounded-xs border border-[#ded5c7] text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrors({});
                  setServerError(null);
                  setInfoMessage(null);
                }}
                className={`py-2 text-center rounded-xs transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-[#181614] shadow-xs font-bold'
                    : 'text-[#6e6761] hover:text-[#181614]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrors({});
                  setServerError(null);
                  setInfoMessage(null);
                }}
                className={`py-2 text-center rounded-xs transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-[#181614] shadow-xs font-bold'
                    : 'text-[#6e6761] hover:text-[#181614]'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Info Alert */}
          {infoMessage && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xs flex items-center gap-2.5 text-xs text-amber-900 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-700" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Server Error */}
          {serverError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xs flex items-center gap-2 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Form */}
          {isForgotPassword && forgotPasswordSubmitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif-luxury text-xl font-bold text-[#181614]">
                Reset Link Dispatched
              </h3>
              <p className="text-xs text-[#6e665e] max-w-xs mx-auto">
                We have sent an authentication recovery link to <strong>{email}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setForgotPasswordSubmitted(false);
                }}
                className="mt-2 px-6 py-2.5 bg-[#181614] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#8c562e] transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name for Register */}
              {mode === 'register' && !isForgotPassword && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#181614]">Full Name *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c827a]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={e => {
                        setName(e.target.value);
                        if (touched.name) setErrors(prev => ({ ...prev, name: validateField('name', e.target.value) }));
                      }}
                      onBlur={() => handleBlur('name')}
                      placeholder="Eleanor Vance"
                      className={`w-full bg-[#fbf9f5] border pl-10 pr-4 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none transition-colors ${
                        errors.name ? 'border-red-500 bg-red-50/20' : 'border-[#ded4c6] focus:border-[#8c562e]'
                      }`}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#181614]">Email Address *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c827a]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (touched.email) setErrors(prev => ({ ...prev, email: validateField('email', e.target.value) }));
                    }}
                    onBlur={() => handleBlur('email')}
                    placeholder="client@stunningbirds.com"
                    className={`w-full bg-[#fbf9f5] border pl-10 pr-4 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none transition-colors ${
                      errors.email ? 'border-red-500 bg-red-50/20' : 'border-[#ded4c6] focus:border-[#8c562e]'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              {/* Password */}
              {!isForgotPassword && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-[#181614]">Password *</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setErrors({});
                        }}
                        className="text-[11px] text-[#8c562e] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c827a]">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (touched.password) setErrors(prev => ({ ...prev, password: validateField('password', e.target.value) }));
                      }}
                      onBlur={() => handleBlur('password')}
                      placeholder="••••••••••••"
                      className={`w-full bg-[#fbf9f5] border pl-10 pr-10 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none transition-colors ${
                        errors.password ? 'border-red-500 bg-red-50/20' : 'border-[#ded4c6] focus:border-[#8c562e]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8c827a] hover:text-[#181614] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.password}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Confirm Password */}
              {mode === 'register' && !isForgotPassword && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#181614]">Confirm Password *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c827a]">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => {
                        setConfirmPassword(e.target.value);
                        if (touched.confirmPassword) {
                          setErrors(prev => ({
                            ...prev,
                            confirmPassword: validateField('confirmPassword', e.target.value),
                          }));
                        }
                      }}
                      onBlur={() => handleBlur('confirmPassword')}
                      placeholder="••••••••••••"
                      className={`w-full bg-[#fbf9f5] border pl-10 pr-10 py-2.5 text-xs text-[#181614] rounded-xs focus:outline-none transition-colors ${
                        errors.confirmPassword ? 'border-red-500 bg-red-50/20' : 'border-[#ded4c6] focus:border-[#8c562e]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8c827a] hover:text-[#181614] cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.confirmPassword}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-[#181614] hover:bg-[#8c562e] text-white text-xs font-semibold uppercase tracking-[0.2em] transition-colors duration-200 shadow-md cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                <span>
                  {isSubmitting
                    ? 'Authenticating...'
                    : isForgotPassword
                    ? 'Send Reset Link'
                    : mode === 'login'
                    ? 'Sign In to Client Portal'
                    : 'Create Atelier Account'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>

              {/* Error Message Under Form */}
              {serverError && (
                <p className="text-[11px] text-red-600 flex items-center justify-center gap-1.5 pt-1 text-center font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{serverError}</span>
                </p>
              )}

              {/* Info Message Under Form */}
              {infoMessage && (
                <p className="text-[11px] text-amber-800 flex items-center justify-center gap-1.5 pt-1 text-center font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>{infoMessage}</span>
                </p>
              )}

              {isForgotPassword && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="w-full text-center text-xs text-[#78716c] hover:text-[#181614] py-1 cursor-pointer"
                >
                  Cancel and return to Sign In
                </button>
              )}
            </form>
          )}

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8c857d] pt-4 border-t border-[#eee7dc]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8c562e]" />
            <span>256-Bit Encrypted Client Security</span>
          </div>

        </motion.div>

      </div>

    </div>
  );
};
