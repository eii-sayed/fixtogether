import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { PageLoader, ErrorState, StatusBadge, Pagination } from '../../components/ui';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Key,
  LogOut,
  History,
  MoreVertical,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_TABS = [
  { key: '', label: 'All Roles' },
  { key: 'owner', label: 'Owners' },
  { key: 'technician', label: 'Technicians' },
  { key: 'organization', label: 'Organizations' },
  { key: 'admin', label: 'Administrators' },
];

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  // Moderation Dialog State
  const [modModal, setModModal] = useState(null); // targetUser
  const [modAction, setModAction] = useState('warn');
  const [modReason, setModReason] = useState('');
  const [modInternalNote, setModInternalNote] = useState('');
  const [modDuration, setModDuration] = useState(7);
  const [activeHistoryUser, setActiveHistoryUser] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', page, role, search],
    queryFn: () =>
      api
        .get(
          `/admin/users?page=${page}&limit=20${role ? `&role=${role}` : ''}${
            search ? `&search=${search}` : ''
          }`
        )
        .then((r) => r.data.data),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.post(`/admin/users/${id}/moderate`, payload),
    onSuccess: (res) => {
      setModModal(null);
      setModReason('');
      setModInternalNote('');
      queryClient.invalidateQueries(['admin-users']);
      toast.success(res.data?.message || 'User moderation applied successfully');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Moderation action failed'),
  });

  const handleOpenModeration = (targetUser, initialAction = 'warn') => {
    if (targetUser._id === currentUser?.userId) {
      toast.error('Safeguard: You cannot moderate or suspend your own administrator account.');
      return;
    }
    setModModal(targetUser);
    setModAction(initialAction);
    setModReason('');
    setModInternalNote('');
    setModDuration(7);
  };

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              User Moderation & Access Governance
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              Identity Governance
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manage permissions, issue compliance warnings, enforce temporary/permanent suspensions, and invalidate sessions.
          </p>
        </div>
      </div>

      {/* Role Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {ROLE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setRole(t.key);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                role === t.key
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input pl-9 text-xs py-2 w-full"
            placeholder="Search by name or email..."
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4">Moderation History</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.users?.map((u) => {
                const isSelf = u._id === currentUser?.userId;
                return (
                  <tr key={u._id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900">{u.fullName}</span>
                          {isSelf && (
                            <span className="badge-gray text-[9px] bg-blue-50 text-blue-700">
                              (You)
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-500">{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge-blue capitalize text-[10px]">{u.role}</span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={u.accountStatus} />
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {u.moderationHistory?.length > 0 ? (
                        <button
                          onClick={() => setActiveHistoryUser(u)}
                          className="text-primary-600 hover:text-primary-800 font-semibold text-[11px] flex items-center gap-1"
                        >
                          <History className="w-3 h-3" />
                          {u.moderationHistory.length} Record(s)
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[11px]">Clean</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenModeration(u, 'warn')}
                          disabled={isSelf}
                          className="btn-outline py-1 px-2 text-[11px]"
                          title="Moderate User"
                        >
                          Moderate
                        </button>
                        {u.accountStatus === 'active' ? (
                          <button
                            onClick={() => handleOpenModeration(u, 'temporary_suspension')}
                            disabled={isSelf}
                            className="btn-danger py-1 px-2 text-[11px]"
                            title="Suspend"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              moderateMutation.mutate({
                                id: u._id,
                                payload: { action: 'reactivate' },
                              })
                            }
                            disabled={isSelf}
                            className="btn-primary py-1 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                            title="Reactivate"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination pagination={data?.pagination} onPageChange={setPage} />

      {/* Advanced Moderation Dialog */}
      {modModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-600" /> Moderate User Account
            </h3>
            <p className="text-xs text-gray-600">
              Account: <strong>{modModal.fullName}</strong> ({modModal.email})
            </p>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Moderation Action <span className="text-red-500">*</span>
              </label>
              <select
                value={modAction}
                onChange={(e) => setModAction(e.target.value)}
                className="input text-xs w-full"
              >
                <option value="warn">Issue Official Warning (No lockout)</option>
                <option value="temporary_suspension">Temporary Suspension (Auto-expiring)</option>
                <option value="permanent_suspension">Permanent Account Suspension</option>
                <option value="invalidate_sessions">Invalidate All Active Sessions (Force Re-login)</option>
                <option value="forced_password_reset">Force Password Reset on Next Login</option>
                <option value="revoke_verification">Revoke Verification Badge</option>
              </select>
            </div>

            {modAction === 'temporary_suspension' && (
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Suspension Duration (Days)
                </label>
                <select
                  value={modDuration}
                  onChange={(e) => setModDuration(Number(e.target.value))}
                  className="input text-xs w-full"
                >
                  <option value={3}>3 Days</option>
                  <option value={7}>7 Days (1 Week)</option>
                  <option value={14}>14 Days (2 Weeks)</option>
                  <option value={30}>30 Days (1 Month)</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                User-Facing Reason (Delivered via notification & email){' '}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                placeholder="Violation of community trust, unfulfilled quotation obligations..."
                className="input text-xs w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Internal Administrative Explanation (Audit Trail)
              </label>
              <input
                type="text"
                value={modInternalNote}
                onChange={(e) => setModInternalNote(e.target.value)}
                placeholder="Reviewed chat logs and dispute ticket #1234..."
                className="input text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setModModal(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() =>
                  moderateMutation.mutate({
                    id: modModal._id,
                    payload: {
                      action: modAction,
                      reason: modReason,
                      internalExplanation: modInternalNote,
                      durationDays: modDuration,
                    },
                  })
                }
                disabled={!modReason.trim() || moderateMutation.isPending}
                className="btn-primary text-xs bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                Apply Moderation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Moderation History Drawer */}
      {activeHistoryUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900">Moderation History</h3>
                <p className="text-[11px] text-gray-500">{activeHistoryUser.fullName}</p>
              </div>
              <button
                onClick={() => setActiveHistoryUser(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 divide-y divide-gray-100">
              {(activeHistoryUser.moderationHistory || []).map((h, i) => (
                <div key={i} className="pt-2 text-xs space-y-1">
                  <div className="flex items-center justify-between text-gray-500 text-[10px]">
                    <span className="font-bold uppercase tracking-wider text-red-600">
                      {h.action}
                    </span>
                    <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-800 font-medium">{h.reason}</p>
                  {h.internalNote && (
                    <p className="text-gray-500 bg-gray-50 p-2 rounded text-[11px]">
                      Internal: {h.internalNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
