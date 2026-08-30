import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Store, 
  Eye, 
  EyeOff, 
  CheckCircle2,
  KeyRound,
  Sparkles,
  LogOut
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { supabase } from '../supabaseClient';

export const AdminLoginScreen: React.FC = () => {
  const { setCurrentScreen, showToast } = useShop();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentAdminSession, setCurrentAdminSession] = useState<{ id: string; email: string } | null>(null);

  // Check if currently authenticated as admin
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const uid = session.user.id;
        const uEmail = session.user.email || '';
        
        // Verify admin authorization
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', uid)
          .maybeSingle();

        if (profile?.is_admin) {
          setCurrentAdminSession({ id: uid, email: uEmail });
        }
      }
    });
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both admin email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Authenticate with Supabase Auth (email + password)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (authError || !authData.user) {
        setErrorMessage(
          authError?.message || 'Invalid administrator credentials. Please check your email and password.'
        );
        setIsLoading(false);
        return;
      }

      const authUserId = authData.user.id;

      // 2. Verify Database Authorization & RLS profile state
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_admin, full_name, tier')
        .eq('id', authUserId)
        .maybeSingle();

      const hasAdminFlag = Boolean(profileData?.is_admin);

      if (!hasAdminFlag) {
        // Sign out unauthorized user immediately to protect the admin console
        await supabase.auth.signOut();
        setErrorMessage(
          'Access Denied (403): The provided account does not possess administrative privileges in the profiles database.'
        );
        setIsLoading(false);
        return;
      }

      setSuccessMessage('Administrator verified. Transferring to Commerce Console...');
      showToast('Admin access granted. Welcome, Concierge Administrator.');

      setTimeout(() => {
        setCurrentScreen('admin-overview');
        window.location.hash = '/admin-overview';
      }, 700);

    } catch (err: any) {
      console.error('Admin login exception:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during administrative authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOutActiveSession = async () => {
    await supabase.auth.signOut();
    setCurrentAdminSession(null);
    showToast('Administrator session ended.');
  };

  return (
    <div className="min-h-screen bg-[#141210] text-[#f7f3eb] flex flex-col justify-between selection:bg-[#d4af37] selection:text-black">
      
      {/* Top Header Bar */}
      <header className="border-b border-[#2b2724] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xs bg-[#24201c] border border-[#d4af37]/40 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
          </div>
          <div>
            <span className="text-[10px] tracking-[0.25em] text-[#a89f91] uppercase font-mono block">
              STUNNING BIRDS ATELIER
            </span>
            <span className="text-xs font-serif-luxury tracking-wider text-white font-semibold">
              Management Portal
            </span>
          </div>
        </div>

        <button
          id="btn-return-storefront"
          onClick={() => {
            setCurrentScreen('home');
            window.location.hash = '/';
          }}
          className="inline-flex items-center space-x-2 text-xs text-[#a89f91] hover:text-[#d4af37] transition-colors py-1.5 px-3 rounded-xs border border-[#2b2724] hover:border-[#d4af37]/40 cursor-pointer"
        >
          <Store className="w-3.5 h-3.5" />
          <span>Return to Boutique</span>
        </button>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-[#1c1916] border border-[#332e29] rounded-xs p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle gold accent top trim */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />

          {/* Active Session Detected Banner */}
          {currentAdminSession && (
            <div className="mb-6 p-4 bg-[#26211c] border border-[#d4af37]/40 rounded-xs text-xs space-y-3">
              <div className="flex items-center space-x-2 text-[#d4af37] font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Active Administrator Session Detected</span>
              </div>
              <p className="text-[#a89f91] text-[11px] leading-relaxed">
                Logged in as <strong className="text-white">{currentAdminSession.email}</strong> (ID: {currentAdminSession.id.slice(0, 8)}...)
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  id="btn-enter-existing-admin"
                  onClick={() => {
                    setCurrentScreen('admin-overview');
                    window.location.hash = '/admin-overview';
                  }}
                  className="flex-1 py-2 px-3 bg-[#d4af37] hover:bg-[#c29d2e] text-black font-semibold text-xs rounded-xs transition-colors cursor-pointer"
                >
                  Enter Console
                </button>
                <button
                  id="btn-signout-existing-admin"
                  onClick={handleSignOutActiveSession}
                  className="py-2 px-3 bg-[#2b2724] hover:bg-[#38332e] text-[#e0dad1] text-xs rounded-xs border border-[#423c35] transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}

          {/* Form Header */}
          <div className="text-center space-y-2 mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#26221d] border border-[#423c36] text-[#d4af37] mb-2 shadow-inner">
              <KeyRound className="w-5 h-5 stroke-[1.5]" />
            </div>
            <h1 className="font-serif-luxury text-2xl font-bold text-white tracking-wide">
              Administrator Login
            </h1>
            <p className="text-xs text-[#a89f91] max-w-xs mx-auto leading-relaxed">
              Secure authentication for Atelier catalog management, order fulfillment, and inventory control.
            </p>
          </div>

          {/* Error Message Display */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-3.5 bg-[#2c1515] border border-[#6d2525] rounded-xs text-[#fca5a5] text-xs flex items-start space-x-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#ef4444]" />
                <span className="leading-relaxed">{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-3.5 bg-[#142918] border border-[#22542a] rounded-xs text-[#86efac] text-xs flex items-start space-x-2.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#22c55e]" />
                <span className="leading-relaxed">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form onSubmit={handleAdminLogin} className="space-y-5">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label 
                htmlFor="admin-email-input" 
                className="block text-[11px] font-semibold tracking-wider text-[#ded5c7] uppercase"
              >
                Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#736b63]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter administrator email"
                  autoComplete="username"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#12100e] border border-[#38332e] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xs text-sm text-white placeholder-[#5c544d] outline-none transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="admin-password-input" 
                  className="block text-[11px] font-semibold tracking-wider text-[#ded5c7] uppercase"
                >
                  Password
                </label>
                <span className="text-[10px] text-[#736b63] font-mono">
                  Managed via Supabase Auth
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#736b63]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 bg-[#12100e] border border-[#38332e] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] rounded-xs text-sm text-white placeholder-[#5c544d] outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#736b63] hover:text-[#d4af37] transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="admin-submit-login-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-[#d4af37] hover:bg-[#c49e29] active:bg-[#b08d20] disabled:bg-[#4a4235] disabled:text-[#80766a] disabled:cursor-not-allowed text-black font-semibold text-xs tracking-widest uppercase rounded-xs transition-all flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Authenticate & Enter Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-[#292420] text-center">
            <div className="inline-flex items-center space-x-1.5 text-[11px] text-[#736b63]">
              <Sparkles className="w-3 h-3 text-[#d4af37]" />
              <span>Protected by Supabase Row Level Security & RBAC</span>
            </div>
            <p className="text-[10px] text-[#544d46] mt-1">
              Requires administrative profile credentials (<code className="text-[#8c8276]">profiles.is_admin = true</code>)
            </p>
          </div>

        </motion.div>
      </main>

      {/* Footer info */}
      <footer className="py-4 text-center text-[11px] text-[#5c544d] border-t border-[#211e1b]">
        <span>Stunning Birds Atelier © {new Date().getFullYear()} • Concierge Management System</span>
      </footer>

    </div>
  );
};
