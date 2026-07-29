import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { Wrench, Eye, EyeOff, Loader2 } from 'lucide-react';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase, and a number'),
  confirmPassword: z.string(),
  role: z.enum(['owner', 'technician', 'organization']),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match', path: ['confirmPassword'],
});

const roles = [
  { value: 'owner', label: 'Item Owner', desc: 'I need things fixed or want to donate' },
  { value: 'technician', label: 'Technician', desc: 'I can repair items professionally' },
  { value: 'organization', label: 'Organization', desc: 'We accept donations or handle recycling' },
];

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const defaultRole = searchParams.get('role') || 'owner';

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: defaultRole },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await registerUser(data);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
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
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Join the FixTogether community</p>
        </div>

        <div className="card card-body">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Role Selection */}
            <div>
              <label className="label">I am a</label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => (
                  <label key={r.value}
                    className={`flex flex-col items-center p-3 border-2 rounded-xl cursor-pointer transition-all text-center ${selectedRole === r.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input {...register('role')} type="radio" value={r.value} className="sr-only" />
                    <span className={`text-sm font-medium ${selectedRole === r.value ? 'text-primary-700' : 'text-gray-700'}`}>{r.label}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">{r.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label" htmlFor="fullName">Full Name</label>
              <input {...register('fullName')} id="fullName" className={`input ${errors.fullName ? 'input-error' : ''}`} placeholder="Your full name" />
              {errors.fullName && <p className="error-text">{errors.fullName.message}</p>}
            </div>

            <div>
              <label className="label" htmlFor="email">Email</label>
              <input {...register('email')} type="email" id="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="you@example.com" />
              {errors.email && <p className="error-text">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label" htmlFor="password">Password</label>
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

            <div>
              <label className="label" htmlFor="confirmPassword">Confirm Password</label>
              <input {...register('confirmPassword')} type="password" id="confirmPassword"
                className={`input ${errors.confirmPassword ? 'input-error' : ''}`} placeholder="••••••••" />
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-sm text-gray-500 text-center mt-6">
          Already have an account? <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
