import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import {
  Lock,
  Eye,
  EyeOff,
  Shield,
  Bell,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Activity,
} from 'lucide-react';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must include uppercase, lowercase, and a number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function SecuritySettingsTab({ user }) {
  const queryClient = useQueryClient();
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Privacy state
  const [privacy, setPrivacy] = useState({
    showPhonePublicly: user?.privacySettings?.showPhonePublicly ?? false,
    showEmailPublicly: user?.privacySettings?.showEmailPublicly ?? false,
    showLocationPublicly: user?.privacySettings?.showLocationPublicly ?? true,
    showActivityPublicly: user?.privacySettings?.showActivityPublicly ?? false,
    showAvailabilityPublicly: user?.privacySettings?.showAvailabilityPublicly ?? true,
  });

  // Notification state
  const [notifications, setNotifications] = useState({
    emailAlerts: user?.notificationPreferences?.emailAlerts ?? true,
    inAppAlerts: user?.notificationPreferences?.inAppAlerts ?? true,
    smsAlerts: user?.notificationPreferences?.smsAlerts ?? false,
    marketingUpdates: user?.notificationPreferences?.marketingUpdates ?? false,
  });

  // Password form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const onPasswordSubmit = async (data) => {
    try {
      await api.patch('/users/me/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully! You will remain logged in.');
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    }
  };

  const handlePrivacyToggle = async (key) => {
    const updated = { ...privacy, [key]: !privacy[key] };
    setPrivacy(updated);
    try {
      await api.patch('/users/me/privacy', updated);
      toast.success('Privacy preferences updated');
      queryClient.invalidateQueries(['my-profile']);
    } catch (err) {
      toast.error('Failed to update privacy settings');
      setPrivacy(privacy); // rollback
    }
  };

  const handleNotificationToggle = async (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    try {
      await api.patch('/users/me/notifications', updated);
      toast.success('Notification preferences updated');
      queryClient.invalidateQueries(['my-profile']);
    } catch (err) {
      toast.error('Failed to update notification settings');
      setNotifications(notifications); // rollback
    }
  };

  return (
    <div className="space-y-8">
      {/* Change Password Card */}
      <div className="card card-body">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Change Password</h3>
            <p className="text-xs text-gray-500">Ensure your account is using a strong, unique password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4 max-w-md">
          <div>
            <label className="label" htmlFor="currentPassword">
              Current Password
            </label>
            <div className="relative">
              <input
                {...register('currentPassword')}
                id="currentPassword"
                type={showCurrentPass ? 'text' : 'password'}
                className={`input pr-10 ${errors.currentPassword ? 'input-error' : ''}`}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPass(!showCurrentPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.currentPassword && <p className="error-text">{errors.currentPassword.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="newPassword">
              New Password
            </label>
            <div className="relative">
              <input
                {...register('newPassword')}
                id="newPassword"
                type={showNewPass ? 'text' : 'password'}
                className={`input pr-10 ${errors.newPassword ? 'input-error' : ''}`}
                placeholder="At least 8 chars with uppercase & number"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="error-text">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                {...register('confirmPassword')}
                id="confirmPassword"
                type={showConfirmPass ? 'text' : 'password'}
                className={`input pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder="Re-enter new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="error-text">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Updating...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>

      {/* Privacy Settings Card */}
      <div className="card card-body">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Privacy & Visibility Controls</h3>
            <p className="text-xs text-gray-500">
              Control what information is visible to the public or community members
            </p>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Show Phone Number Publicly</p>
                <p className="text-xs text-gray-500">Allow other users to see your phone number on profile</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={privacy.showPhonePublicly}
              onChange={() => handlePrivacyToggle('showPhonePublicly')}
              className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Show Email Address Publicly</p>
                <p className="text-xs text-gray-500">Display email address on public directories</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={privacy.showEmailPublicly}
              onChange={() => handlePrivacyToggle('showEmailPublicly')}
              className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Show General City / Area</p>
                <p className="text-xs text-gray-500">Help community members identify local repair services</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={privacy.showLocationPublicly}
              onChange={() => handlePrivacyToggle('showLocationPublicly')}
              className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-800">Show Activity Statistics</p>
                <p className="text-xs text-gray-500">Display total repairs and community milestones</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={privacy.showActivityPublicly}
              onChange={() => handlePrivacyToggle('showActivityPublicly')}
              className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Notification Preferences Card */}
      <div className="card card-body">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Notification Preferences</h3>
            <p className="text-xs text-gray-500">Manage where and how you receive platform updates</p>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">In-App Notifications</p>
              <p className="text-xs text-gray-500">Real-time alerts for quotes, messages, and job updates</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.inAppAlerts}
              onChange={() => handleNotificationToggle('inAppAlerts')}
              className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">Email Notifications</p>
              <p className="text-xs text-gray-500">Receive important repair digests and account notices</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.emailAlerts}
              onChange={() => handleNotificationToggle('emailAlerts')}
              className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">SMS Alerts (Urgent)</p>
              <p className="text-xs text-gray-500">Critical updates when a technician arrives or appointment changes</p>
            </div>
            <input
              type="checkbox"
              checked={notifications.smsAlerts}
              onChange={() => handleNotificationToggle('smsAlerts')}
              className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Danger Zone Card */}
      <div className="card card-body border-danger-200 bg-danger-50/30">
        <div className="flex items-center gap-2 mb-2 text-danger-700">
          <AlertTriangle className="w-5 h-5" />
          <h3 className="font-bold">Account Deactivation</h3>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed max-w-xl">
          Deactivating your account will hide your public profile and prevent receiving new quotations or repair
          requests. Existing active jobs and warranties remain accessible to authorized parties.
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Are you sure you want to deactivate your FixTogether account?')) {
              toast.info('Account deactivation request logged. Contact support to finalize.');
            }
          }}
          className="btn-outline !text-danger-600 !border-danger-300 hover:!bg-danger-50 btn-sm mt-4 w-fit"
        >
          Deactivate Account
        </button>
      </div>
    </div>
  );
}
