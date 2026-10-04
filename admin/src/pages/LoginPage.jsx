import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { ShieldAlert, Lock, Mail, Loader2, KeyRound, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success('Admin authenticated successfully');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdmin = () => {
    setEmail('admin@fixtogether.com');
    setPassword('Admin123!');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-gray-100">
      {/* Background glow accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 text-white">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            FixTogether Command Center
          </h1>
          <p className="text-xs text-gray-400">
            Internal administrative gateway • Restricted security boundary
          </p>
        </div>

        {/* Form Card */}
        <div className="card p-6 sm:p-8 space-y-5 border-gray-800 bg-gray-900/90 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="label">Admin Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fixtogether.com"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label">Admin Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-2.5 text-xs font-bold flex items-center justify-center gap-2 mt-2 shadow-md shadow-emerald-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Authorize Admin Session</span>
                </>
              )}
            </button>
          </form>

          {/* 1-Click Demo Fill */}
          <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Local Testing Credentials?</span>
            <button
              type="button"
              onClick={handleDemoAdmin}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fill Demo Admin</span>
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-600">
          FixTogether Platform Infrastructure • All administrative actions logged to audit trail
        </p>
      </div>
    </div>
  );
}
