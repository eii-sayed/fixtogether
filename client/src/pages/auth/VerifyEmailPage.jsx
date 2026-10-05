import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2, ShieldCheck } from 'lucide-react';
import api from '../../api/axios';
import SEO from '../../components/common/SEO';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Try to get email from router state (passed from RegisterPage), or allow manual input
  const initialEmail = location.state?.email || '';
  
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !otp) {
      setError('Please enter both your email and the 6-digit code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/verify-email', { email, otp });
      navigate('/login', { 
        state: { message: 'Your email has been verified! You can now log in.' }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <SEO title="Verify Email" description="Enter your 6-digit OTP to verify your account." />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 mb-4 shadow-inner">
          <ShieldCheck className="h-8 w-8 text-primary-600" />
        </div>
        <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
          Verify your email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 px-4">
          We've sent a 6-digit verification code to your email address. Please enter it below.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card py-8 px-4 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                  readOnly={!!initialEmail}
                />
              </div>
            </div>

            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                6-Digit Code
              </label>
              <div className="mt-1">
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Only allow digits
                  className="input text-center text-2xl font-bold tracking-[0.5em]"
                  placeholder="••••••"
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
                disabled={isLoading || otp.length < 6}
                className="btn-primary w-full text-base py-3"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify Account'
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">Didn't receive the code? </span>
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
              Sign up again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
