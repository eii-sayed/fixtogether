import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2, ShieldCheck, RefreshCw, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/axios';
import SEO from '../../components/common/SEO';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve initial email from location state, search query, or sessionStorage
  const getInitialEmail = () => {
    if (location.state?.email) return location.state.email;
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('email')) return searchParams.get('email');
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('pendingVerificationEmail') || '';
    }
    return '';
  };

  const [email, setEmail] = useState(getInitialEmail);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isJustRegistered = !!location.state?.justRegistered;
  const [cooldown, setCooldown] = useState(isJustRegistered ? 60 : 0);
  const [canResend, setCanResend] = useState(!isJustRegistered);
  const inputRefs = useRef([]);

  // Auto focus first OTP input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Sync email to sessionStorage so page refresh doesn't wipe it
  useEffect(() => {
    if (email && typeof window !== 'undefined') {
      sessionStorage.setItem('pendingVerificationEmail', email);
    }
  }, [email]);

  // Cooldown countdown timer
  useEffect(() => {
    let interval;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const otp = otpDigits.join('');

  const fillOtp = (code) => {
    if (!code) return;
    const clean = String(code).trim().replace(/\D/g, '').slice(0, 6);
    const updated = ['', '', '', '', '', ''];
    for (let i = 0; i < clean.length; i++) {
      updated[i] = clean[i] || '';
    }
    setOtpDigits(updated);
    const focusIndex = Math.min(clean.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleDigitChange = (index, value) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const updated = [...otpDigits];
      updated[index] = '';
      setOtpDigits(updated);
      return;
    }

    const updated = [...otpDigits];
    updated[index] = clean.slice(-1);
    setOtpDigits(updated);

    if (index < 5 && clean) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      fillOtp(pasted);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || otp.length < 6) {
      setError('Please enter both your email address and the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/auth/verify-email', { email: cleanEmail, otp });
      setSuccess('Email verified successfully! Redirecting to login...');
      toast.success(res?.data?.message || 'Email verified successfully!');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pendingVerificationEmail');
      }
      setTimeout(() => {
        navigate('/login', {
          state: { message: 'Your email has been verified! You can now log in.' },
        });
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid verification code. Please check and try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please provide your email address to resend verification code.');
      return;
    }
    if (!canResend || isResending) return;

    setIsResending(true);
    setError('');

    try {
      const res = await api.post('/auth/resend-verification', { email: cleanEmail });
      toast.success(res?.data?.message || 'A new 6-digit verification code has been sent to your email.');
      setCooldown(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend code. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50/60">
      <SEO title="Verify Email" description="Enter your 6-digit verification code to activate your FixTogether account." />

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-3xl bg-primary-100/70 border border-primary-200 mb-4 shadow-xs">
          <ShieldCheck className="h-8 w-8 text-primary-600" />
        </div>
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
          Verify your email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 px-4">
          Enter the 6-digit code sent to{' '}
          <span className="font-semibold text-gray-800">{email || 'your email'}</span>
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card py-8 px-5 sm:px-10 border border-gray-200/80 shadow-md">
          {success && (
            <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs leading-relaxed">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field (Editable if user needs to correct typos) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Email Address
                </label>
                {!email && (
                  <span className="text-[11px] text-gray-400">Where we sent the code</span>
                )}
              </div>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input text-sm pl-9"
                  placeholder="you@example.com"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Accessible 6-Digit OTP Box Grid */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                6-Digit Verification Code
              </label>
              <div
                className="grid grid-cols-6 gap-2 sm:gap-2.5"
                onPaste={handlePaste}
                role="group"
                aria-label="6-digit verification code"
              >
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    disabled={isLoading}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-full h-13 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-xs transition-all disabled:opacity-50"
                    aria-label={`Digit ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Verify CTA Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="btn-primary w-full text-sm font-bold py-3 shadow-sm flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <span>Verify Account</span>
                )}
              </button>
            </div>
          </form>

          {/* Resend OTP Section with Countdown */}
          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span>Didn't receive the email?</span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={!canResend || isResending}
                className="font-bold text-primary-600 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : canResend ? (
                  <span>Resend Code</span>
                ) : (
                  <span>Resend in {cooldown}s</span>
                )}
              </button>
            </div>

            <p className="text-[11px] text-gray-400 text-center leading-normal">
              Can't find the email? Please check your <strong>Spam</strong> or <strong>Junk</strong> folder.
            </p>

            <Link
              to="/login"
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors mt-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
