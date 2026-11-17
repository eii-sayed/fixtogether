import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import api from '../../api/axios';
import SEO from '../../components/common/SEO';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [emailDeliveryFailed, setEmailDeliveryFailed] = useState(false);
  const [emailSimulated, setEmailSimulated] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      const resetToken = data?.data?.resetToken;
      if (import.meta.env.DEV && resetToken) {
        setResetLink(`${window.location.origin}/reset-password?token=${encodeURIComponent(resetToken)}`);
      }
      setEmailDeliveryFailed(Boolean(data?.data?.emailDeliveryFailed));
      setEmailSimulated(Boolean(data?.data?.emailSimulated));
      setIsSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <SEO title="Forgot Password" description="Reset your FixTogether password." />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
            return to login
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card py-8 px-4 sm:px-10">
          {isSuccess ? (
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Check your email</h3>
              <p className="text-sm text-gray-500 mb-6">
                If an account exists for <span className="font-medium text-gray-900">{email.trim()}</span>, a reset link has been sent. Check your inbox and spam folder.
              </p>
              {import.meta.env.DEV && resetLink && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 text-left">
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    {emailDeliveryFailed ? 'Email could not be sent' : emailSimulated ? 'Local email simulation' : 'Development reset link'}
                  </p>
                  <p className="text-xs text-amber-800 mb-3">
                    {emailDeliveryFailed
                      ? 'Use this one-time link to finish resetting your password.'
                      : 'Use this link to reset your password in this development session.'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <a href={resetLink} className="btn-primary flex-1 justify-center text-sm">
                      <ExternalLink className="w-4 h-4 mr-2" /> Open reset page
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(resetLink);
                          setCopied(true);
                        } catch {
                          setCopied(false);
                        }
                      }}
                      className="btn-secondary flex-1 justify-center text-sm"
                    >
                      <Copy className="w-4 h-4 mr-2" /> {copied ? 'Copied' : 'Copy link'}
                    </button>
                  </div>
                </div>
              )}
              <Link to="/login" className="btn-primary w-full">
                Return to Login
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setResetLink('');
                  setError('');
                  setCopied(false);
                }}
                className="mt-3 w-full text-sm text-primary-700 hover:text-primary-800 font-medium"
              >
                Try another email
              </button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <p className="text-sm text-gray-600 text-center mb-6">
                Enter the email address associated with your account and we'll send you a link to reset your password.
              </p>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-danger-50 p-4 border border-danger-100">
                  <div className="text-sm text-danger-700">{error}</div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full text-base py-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Sending link...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
