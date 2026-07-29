import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Wrench, Eye, EyeOff, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const from = location.state?.from?.pathname || '/dashboard';

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your FixTogether account</p>
        </div>

        <div className="card card-body">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input {...register('email')} type="email" id="email"
                className={`input ${errors.email ? 'input-error' : ''}`} placeholder="you@example.com" />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label" htmlFor="password">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700">Forgot password?</Link>
              </div>
              <div className="relative">
                <input {...register('password')} type={showPassword ? 'text' : 'password'} id="password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="error-text">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign in'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-3 text-center">Demo accounts</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { label: 'Admin', email: 'admin@fixtogether.com', pass: 'Admin123!' },
                { label: 'Owner', email: 'rahim@example.com', pass: 'Owner123!' },
                { label: 'Technician', email: 'sumon@example.com', pass: 'Tech123!' },
                { label: 'Organization', email: 'hope@example.com', pass: 'Org123!' },
              ].map((demo) => (
                <button key={demo.label} type="button" onClick={() => {
                  onSubmit({ email: demo.email, password: demo.pass });
                }}
                  className="border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 text-left transition-colors">
                  <span className="font-medium text-gray-700 block">{demo.label}</span>
                  <span className="text-gray-400 truncate block">{demo.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-500 text-center mt-6">
          Don't have an account? <Link to="/register" className="text-primary-600 font-medium hover:text-primary-700">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
