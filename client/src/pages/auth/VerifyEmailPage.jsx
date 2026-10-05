import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import api from '../../../api/axios';
import SEO from '../../common/SEO';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  
  // Prevent double-fetching in React StrictMode
  const hasAttempted = useRef(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('Invalid verification link. The token is missing.');
        return;
      }

      if (hasAttempted.current) return;
      hasAttempted.current = true;

      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setErrorMessage(err.response?.data?.message || 'Verification failed. The link may have expired or is invalid.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-gray-50">
      <SEO title="Verify Email" description="Verifying your FixTogether email address." />
      
      <div className="card w-full max-w-md p-8 text-center relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-100 rounded-full blur-2xl opacity-50 pointer-events-none" />
        
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-6 border border-primary-100">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email...</h1>
            <p className="text-gray-500">Please wait while we confirm your email address.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
            <p className="text-gray-500 mb-8">
              Your email has been successfully verified. You now have full access to FixTogether.
            </p>
            <Link to="/login" className="btn-primary w-full">
              Continue to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-danger-50 rounded-full flex items-center justify-center mb-6 border border-danger-100">
              <XCircle className="w-8 h-8 text-danger-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-500 mb-8 max-w-sm">
              {errorMessage}
            </p>
            <Link to="/login" className="btn-outline w-full mb-3">
              Back to Login
            </Link>
            <div className="text-sm text-gray-500">
              Need a new link? <Link to="/register" className="text-primary-600 hover:underline">Sign up again</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
