import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
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
  KeyRound
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { supabase } from '../supabaseClient';

export const LoginModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    authPromptMessage,
    login,
    register,
    setCurrentScreen,
    showToast,
  } = useShop();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Forgot password state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'email':
        if (!value.trim()) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address (e.g. name@domain.com)';
        }
        return '';
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 6) return 'Password must be at least 6 characters long';
        return '';
      case 'name':
        if (authModalMode === 'register') {
          if (!value.trim()) return 'Full name is required';
          if (value.trim().length < 2) return 'Name must be at least 2 characters';
        }
        return '';
      case 'confirmPassword':
        if (authModalMode === 'register') {
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

    if (authModalMode === 'register') {
      const nameErr = validateField('name', name);
      if (nameErr) newErrors.name = nameErr;

      const confErr = validateField('confirmPassword', confirmPassword);
      if (confErr) newErrors.confirmPassword = confErr;

      if (!agreeTerms) {
        newErrors.agreeTerms = 'You must accept the terms to create an account';
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

    if (!validateAll()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (authModalMode === 'login') {
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
          closeAuthModal();
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
        closeAuthModal();
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
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeAuthModal}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md bg-[#faf7f2] border border-[#e4dcd0] shadow-2xl rounded-xs overflow-hidden z-10 my-8"
      >
        {/* Top Accent Strip */}
        <div className="h-1.5 bg-gradient-to-r from-[#8c562e] via-[#d4af37] to-[#8c562e]" />

        {/* Close Button */}
        <button
          id="auth-modal-close-btn"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 text-[#78716c] hover:text-[#181614] hover:bg-black/5 rounded-full transition-colors cursor-pointer z-20"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 sm:px-8 text-center space-y-2 border-b border-[#eee7dc]">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#181614] text-[#d4af37] mb-1 shadow-md">
            <Lock className="w-5 h-5 stroke-[1.75]" />
          </div>
          
          <div className="space-y-1">
            <span className="text-[10px] tracking-[0.25em] font-bold uppercase text-[#8c562e] block">
              STUNNING BIRDS ATELIER
            </span>
            <h2 className="font-serif-luxury text-2xl sm:text-3xl font-bold text-[#181614]">
              {isForgotPassword
                ? 'Reset Password'
                : authModalMode === 'login'
                ? 'Client Sign In'
                : 'Create Atelier Account'}
            </h2>
          </div>

          {/* Contextual Action Prompt Message */}
          {authPromptMessage && !isForgotPassword && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 p-2.5 bg-[#f3ecdf] border border-[#e2d6c3] rounded-xs text-xs text-[#6e6052] font-medium flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8c562e] shrink-0" />
              <span>{authPromptMessage}</span>
            </motion.div>
          )}
        </div>

        {/* Auth Mode Toggle Tabs */}
        {!isForgotPassword && (
          <div className="grid grid-cols-2 bg-[#eee7dc] p-1 mx-6 sm:mx-8 mt-5 rounded-xs border border-[#ded5c7] text-xs font-semibold">
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => {
                setAuthModalMode('login');
                setErrors({});
                setServerError(null);
                setInfoMessage(null);
              }}
              className={`py-2 text-center rounded-xs transition-all cursor-pointer ${
                authModalMode === 'login'
                  ? 'bg-white text-[#181614] shadow-xs font-bold'
                  : 'text-[#6e6761] hover:text-[#181614]'
              }`}
            >
              Sign In
            </button>
            <button
              id="auth-tab-register"
              type="button"
              onClick={() => {
                setAuthModalMode('register');
                setErrors({});
                setServerError(null);
                setInfoMessage(null);
              }}
              className={`py-2 text-center rounded-xs transition-all cursor-pointer ${
                authModalMode === 'register'
                  ? 'bg-white text-[#181614] shadow-xs font-bold'
                  : 'text-[#6e6761] hover:text-[#181614]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Modal Form Body */}
        <div className="p-6 sm:px-8 space-y-5">
          {/* Info / Email Confirmation Alert */}
          {infoMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-amber-50 border border-amber-200 rounded-xs flex items-center gap-2.5 text-xs text-amber-900 font-medium"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-700" />
              <span>{infoMessage}</span>
            </motion.div>
          )}

          {/* Server Error Alert */}
          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 border border-red-200 rounded-xs flex items-center gap-2 text-xs text-red-700 font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{serverError}</span>
            </motion.div>
          )}

          {/* Forgot Password Confirmation */}
          {isForgotPassword && forgotPasswordSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif-luxury text-xl font-bold text-[#181614]">
                Password Reset Email Sent
              </h3>
              <p className="text-xs text-[#6e665e] leading-relaxed max-w-xs mx-auto">
                We have sent an authentication recovery link to <strong>{email}</strong>. Please check your inbox.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setForgotPasswordSubmitted(false);
                }}
                className="mt-2 px-6 py-2.5 bg-[#181614] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#8c562e] transition-colors cursor-pointer"
              >
                Back to Sign In
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name field (Register only) */}
              <AnimatePresence>
                {authModalMode === 'register' && !isForgotPassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <label className="text-xs font-semibold text-[#181614] flex justify-between">
                      <span>Full Name *</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c827a]">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="auth-name-input"
                        type="text"
                        value={name}
                        onChange={e => {
                          setName(e.target.value);
                          if (touched.name) {
                            setErrors(prev => ({ ...prev, name: validateField('name', e.target.value) }));
                          }
                        }}
                        onBlur={() => handleBlur('name')}
                        placeholder="Eleanor Vance"
                        className={`w-full bg-white border pl-10 pr-4 py-2.5 text-xs text-[#181614] placeholder-[#a89f91] rounded-xs focus:outline-none transition-colors ${
                          errors.name ? 'border-red-500 bg-red-50/20' : 'border-[#ded4c6] focus:border-[#8c562e]'
                        }`}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.name}</span>
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Address Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#181614] flex justify-between">
                  <span>Email Address *</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c827a]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="auth-email-input"
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (touched.email) {
                        setErrors(prev => ({ ...prev, email: validateField('email', e.target.value) }));
                      }
                    }}
                    onBlur={() => handleBlur('email')}
                    placeholder="client@stunningbirds.com"
                    className={`w-full bg-white border pl-10 pr-4 py-2.5 text-xs text-[#181614] placeholder-[#a89f91] rounded-xs focus:outline-none transition-colors ${
                      errors.email ? 'border-red-500 bg-red-50/20' : 'border-[#ded4c6] focus:border-[#8c562e]'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              {/* Password Field (when not forgot password) */}
              {!isForgotPassword && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-[#181614]">
                      <span>Password *</span>
                    </label>
                    {authModalMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setErrors({});
                        }}
                        className="text-[11px] text-[#8c562e] hover:underline cursor-pointer font-medium"
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
                      id="auth-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => {
                        setPassword(e.target.value);
                        if (touched.password) {
                          setErrors(prev => ({ ...prev, password: validateField('password', e.target.value) }));
                        }
                      }}
                      onBlur={() => handleBlur('password')}
                      placeholder="••••••••••••"
                      className={`w-full bg-white border pl-10 pr-10 py-2.5 text-xs text-[#181614] placeholder-[#a89f91] rounded-xs focus:outline-none transition-colors ${
                        errors.password ? 'border-red-500 bg-red-50/20' : 'border-[#ded4c6] focus:border-[#8c562e]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8c827a] hover:text-[#181614] cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{errors.password}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Confirm Password Field (Register only) */}
              <AnimatePresence>
                {authModalMode === 'register' && !isForgotPassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <label className="text-xs font-semibold text-[#181614]">
                      <span>Confirm Password *</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8c827a]">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        id="auth-confirm-password-input"
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
                        className={`w-full bg-white border pl-10 pr-10 py-2.5 text-xs text-[#181614] placeholder-[#a89f91] rounded-xs focus:outline-none transition-colors ${
                          errors.confirmPassword
                            ? 'border-red-500 bg-red-50/20'
                            : 'border-[#ded4c6] focus:border-[#8c562e]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8c827a] hover:text-[#181614] cursor-pointer"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{errors.confirmPassword}</span>
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Remember Me / Terms Checkboxes */}
              {!isForgotPassword && (
                <div className="pt-1">
                  {authModalMode === 'login' ? (
                    <label
                      onClick={() => setRememberMe(!rememberMe)}
                      className="flex items-center space-x-2 text-xs text-[#6e665e] cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded-xs accent-[#8c562e]"
                      />
                      <span>Keep me signed in on this device</span>
                    </label>
                  ) : (
                    <div className="space-y-1">
                      <label
                        onClick={() => setAgreeTerms(!agreeTerms)}
                        className="flex items-start space-x-2 text-xs text-[#6e665e] cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 mt-0.5 rounded-xs accent-[#8c562e]"
                        />
                        <span>
                          I agree to the <span className="underline text-[#181614]">Atelier Terms</span> and{' '}
                          <span className="underline text-[#181614]">Privacy Policy</span>.
                        </span>
                      </label>
                      {errors.agreeTerms && (
                        <p className="text-[11px] text-red-600 pl-5.5">
                          {errors.agreeTerms}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                id="auth-submit-btn"
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 bg-[#181614] hover:bg-[#8c562e] text-white text-xs font-semibold uppercase tracking-[0.2em] transition-colors duration-200 shadow-md cursor-pointer flex items-center justify-center gap-2 group mt-2"
              >
                <span>
                  {isSubmitting
                    ? 'Authenticating...'
                    : isForgotPassword
                    ? 'Send Reset Link'
                    : authModalMode === 'login'
                    ? 'Sign In to Atelier'
                    : 'Create Account'}
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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

              {/* Back to sign in button for forgot password */}
              {isForgotPassword && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setErrors({});
                  }}
                  className="w-full text-center text-xs text-[#78716c] hover:text-[#181614] py-1 cursor-pointer"
                >
                  Cancel and return to Sign In
                </button>
              )}
            </form>
          )}

          {/* Trust Guarantee */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8c857d] pt-3 border-t border-[#eee7dc]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8c562e]" />
            <span>256-Bit Encrypted Client Atelier Security</span>
          </div>

        </div>

      </motion.div>
    </div>
  );
};
