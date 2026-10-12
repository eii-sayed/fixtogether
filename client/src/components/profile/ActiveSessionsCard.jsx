import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Laptop,
  Smartphone,
  Globe,
  ShieldCheck,
  LogOut,
  Trash2,
  Loader2,
  AlertCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';

/**
 * Parse human-readable device and browser info from user agent string
 */
function parseDeviceDetails(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') {
    return { browser: 'Web Client', os: 'Unknown OS', type: 'desktop' };
  }

  const ua = userAgent;
  let browser = 'Web Browser';
  let os = 'Unknown OS';
  let type = 'desktop';

  // Detect OS & Device Type
  if (/iPad|Tablet/i.test(ua)) {
    type = 'tablet';
    os = 'iPadOS';
  } else if (/iPhone/i.test(ua)) {
    type = 'mobile';
    os = 'iOS';
  } else if (/Android/i.test(ua)) {
    type = 'mobile';
    os = 'Android';
  } else if (/Windows NT 10.0/i.test(ua)) {
    os = 'Windows 10/11';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  // Detect Browser
  if (/Edg\//i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/Chrome\//i.test(ua) && !/Chromium|Edg/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/Firefox\//i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/Opera|OPR\//i.test(ua)) {
    browser = 'Opera';
  }

  return { browser, os, type };
}

export default function ActiveSessionsCard() {
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: () => api.get('/auth/sessions').then((r) => r.data.data?.sessions || []),
    staleTime: 30000,
  });

  const sessions = data || [];
  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  // Mutation: Revoke single session
  const revokeMutation = useMutation({
    mutationFn: (sessionId) => api.delete(`/auth/sessions/${sessionId}`),
    onSuccess: (res, sessionId) => {
      const isCurrent = res?.data?.data?.isCurrent;
      if (isCurrent) {
        toast.info('Current session ended. Redirecting...');
        window.location.href = '/login';
        return;
      }
      toast.success('Device session revoked successfully');
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to revoke session');
    },
    onSettled: () => {
      setRevokingId(null);
    },
  });

  // Mutation: Revoke all other sessions
  const revokeAllMutation = useMutation({
    mutationFn: () => api.delete('/auth/sessions'),
    onSuccess: () => {
      toast.success('All other devices have been logged out');
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to revoke other sessions');
    },
  });

  const handleRevokeSingle = (session) => {
    const isCurrent = session.isCurrent;
    const msg = isCurrent
      ? 'This is your current device. Revoking it will log you out now. Continue?'
      : 'Are you sure you want to sign out this device?';

    if (window.confirm(msg)) {
      setRevokingId(session._id);
      revokeMutation.mutate(session._id);
    }
  };

  const handleRevokeAllOthers = () => {
    if (
      window.confirm(
        `Are you sure you want to log out all other ${otherSessionsCount} active session(s)? Those devices will need to sign in again.`
      )
    ) {
      revokeAllMutation.mutate();
    }
  };

  return (
    <div className="card card-body">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Active Sessions & Signed-in Devices</h3>
            <p className="text-xs text-gray-500">
              Review browsers and devices currently logged into your account
            </p>
          </div>
        </div>

        {otherSessionsCount > 0 && (
          <button
            type="button"
            onClick={handleRevokeAllOthers}
            disabled={revokeAllMutation.isPending}
            className="btn-outline !text-amber-700 !border-amber-300 hover:!bg-amber-50 text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            {revokeAllMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            Log Out Other Devices ({otherSessionsCount})
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
          <p className="text-xs">Loading active login sessions...</p>
        </div>
      ) : isError ? (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-xs text-danger-700 flex items-center justify-between">
          <span>Failed to load active sessions.</span>
          <button onClick={() => refetch()} className="font-bold underline">
            Retry
          </button>
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-6 text-center text-xs text-gray-400">
          No active sessions detected.
        </div>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {sessions.map((session) => {
            const { browser, os, type } = parseDeviceDetails(session.userAgent);
            const isRevoking = revokingId === session._id;

            return (
              <div
                key={session._id}
                className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  session.isCurrent ? 'bg-primary-50/20' : 'hover:bg-gray-50/60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      session.isCurrent
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {type === 'mobile' ? (
                      <Smartphone className="w-4 h-4" />
                    ) : type === 'desktop' ? (
                      <Laptop className="w-4 h-4" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-gray-900">
                        {browser} on {os}
                      </p>
                      {session.isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          This Device
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        Signed in{' '}
                        {formatDistanceToNow(new Date(session.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      <span>•</span>
                      <span>
                        Expires{' '}
                        {format(new Date(session.expiresAt), 'MMM d, yyyy')}
                      </span>
                    </div>

                    <p
                      className="text-[10px] text-gray-400 font-mono truncate max-w-md pt-0.5"
                      title={session.userAgent}
                    >
                      {session.userAgent || 'Standard Web Browser'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {session.isCurrent ? (
                    <span className="text-[11px] text-gray-400 italic px-2 py-1">
                      Current session
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRevokeSingle(session)}
                      disabled={isRevoking}
                      className="btn-outline !text-danger-600 !border-danger-200 hover:!bg-danger-50 text-xs py-1 px-2.5 flex items-center gap-1 font-semibold"
                      title="Terminate this session"
                    >
                      {isRevoking ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <LogOut className="w-3 h-3" />
                      )}
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
