import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader, ErrorState, EmptyState } from '../../components/ui';
import {
  ClipboardList,
  AlertTriangle,
  Shield,
  Clock,
  UserCheck,
  CheckCircle2,
  Lock,
  Unlock,
  MessageSquare,
  ArrowRight,
  Filter,
  Search,
  CheckSquare,
  Square,
  RotateCw,
  Send,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_PRIORITIES, REVIEW_QUEUE_STATES, formatSLACountdown } from '../../utils/adminStatusConfig';

const QUEUE_TABS = [
  { key: 'all', label: 'All Items' },
  { key: 'critical', label: 'Critical Escalations', icon: AlertTriangle },
  { key: 'safety', label: 'Safety Flags', icon: AlertTriangle },
  { key: 'verifications', label: 'Verifications', icon: Shield },
  { key: 'disputes', label: 'Disputes', icon: MessageSquare },
  { key: 'users', label: 'User Appeals', icon: UserCheck },
  { key: 'requests', label: 'Stalled Requests', icon: Clock },
];

export default function AdminReviewQueuePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all';

  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [activeNoteDrawer, setActiveNoteDrawer] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [takeoverModal, setTakeoverModal] = useState(null); // item
  const [takeoverReason, setTakeoverReason] = useState('');
  const [snoozeModal, setSnoozeModal] = useState(null); // item
  const [snoozeDays, setSnoozeDays] = useState(3);
  const [errorMsg, setErrorMsg] = useState('');

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-review-queue', { tab: activeTab, search }],
    queryFn: () =>
      api.get(`/admin/review-queue?tab=${activeTab}&search=${search}`).then((r) => r.data.data),
    refetchInterval: 20000,
  });

  // Acquire Lock Mutation
  const lockMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/review-queue/${id}/lock`),
    onSuccess: () => queryClient.invalidateQueries(['admin-review-queue']),
    onError: (err) => setErrorMsg(err.response?.data?.message || 'Failed to acquire review lock.'),
  });

  // Release Lock Mutation
  const releaseLockMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/review-queue/${id}/lock`),
    onSuccess: () => queryClient.invalidateQueries(['admin-review-queue']),
  });

  // Takeover Lock Mutation
  const takeoverMutation = useMutation({
    mutationFn: ({ id, reason }) => api.post(`/admin/review-queue/${id}/takeover`, { reason }),
    onSuccess: () => {
      setTakeoverModal(null);
      setTakeoverReason('');
      queryClient.invalidateQueries(['admin-review-queue']);
    },
    onError: (err) => setErrorMsg(err.response?.data?.message || 'Failed to take over review lock.'),
  });

  // Assign Mutation
  const assignMutation = useMutation({
    mutationFn: ({ id, adminId }) => api.post(`/admin/review-queue/${id}/assign`, { adminId }),
    onSuccess: () => queryClient.invalidateQueries(['admin-review-queue']),
  });

  // Add Note Mutation
  const noteMutation = useMutation({
    mutationFn: ({ id, note }) => api.post(`/admin/review-queue/${id}/notes`, { note }),
    onSuccess: (res) => {
      setNewNote('');
      queryClient.invalidateQueries(['admin-review-queue']);
      if (activeNoteDrawer) {
        setActiveNoteDrawer((prev) => ({
          ...prev,
          internalNotes: res.data.data?.internalNotes || prev.internalNotes,
        }));
      }
    },
  });

  // State update mutation
  const updateStateMutation = useMutation({
    mutationFn: ({ id, reviewState, snoozedUntil, expectedVersion }) =>
      api.patch(`/admin/review-queue/${id}/state`, { reviewState, snoozedUntil, expectedVersion }),
    onSuccess: () => {
      setSnoozeModal(null);
      queryClient.invalidateQueries(['admin-review-queue']);
    },
    onError: (err) => {
      if (err.response?.data?.code === 'RESOURCE_VERSION_CONFLICT') {
        setErrorMsg('Version conflict: This item was updated by another administrator. Reloading...');
        queryClient.invalidateQueries(['admin-review-queue']);
      } else {
        setErrorMsg(err.response?.data?.message || 'State update failed.');
      }
    },
  });

  // Bulk action mutation
  const bulkMutation = useMutation({
    mutationFn: ({ action, snoozedUntil }) =>
      api.post('/admin/review-queue/bulk', { itemIds: selectedItems, action, snoozedUntil }),
    onSuccess: () => {
      setSelectedItems([]);
      queryClient.invalidateQueries(['admin-review-queue']);
    },
    onError: (err) => setErrorMsg(err.response?.data?.message || 'Bulk operation failed.'),
  });

  const items = data?.items || [];

  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) setSelectedItems([]);
    else setSelectedItems(items.map((i) => i._id));
  };

  const toggleSelectItem = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
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
              Unified Admin Review Queue
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {items.length} Active Items
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Consolidated SLA queue for safety flags, credential verifications, dispute arbitrations, and appeals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-outline text-xs flex items-center gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="font-bold underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200 scrollbar-none">
        {QUEUE_TABS.map((t) => {
          const isActive = activeTab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => {
                setSelectedItems([]);
                setSearchParams({ tab: t.key });
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search & Bulk Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search queue by title or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 text-xs py-2 w-full"
          />
        </div>

        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-xl border border-primary-200">
            <span className="text-xs font-bold text-primary-900">
              {selectedItems.length} selected
            </span>
            <button
              onClick={() => bulkMutation.mutate({ action: 'assign_to_me' })}
              className="btn-primary py-1 px-2.5 text-xs"
            >
              Assign to Me
            </button>
            <button
              onClick={() => {
                const snoozeUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                bulkMutation.mutate({ action: 'snooze', snoozedUntil: snoozeUntil });
              }}
              className="btn-secondary py-1 px-2.5 text-xs"
            >
              Snooze 3d
            </button>
          </div>
        )}
      </div>

      {/* Queue Items List */}
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => {
            const priorityCfg = ADMIN_PRIORITIES[item.priority] || ADMIN_PRIORITIES.medium;
            const sla = formatSLACountdown(item.slaDeadline);
            const isLockedByOther =
              item.lock?.lockedBy &&
              item.lock.lockedBy._id !== user?.userId &&
              new Date(item.lock.expiresAt) > new Date();
            const isLockedByMe =
              item.lock?.lockedBy && item.lock.lockedBy._id === user?.userId;
            const isSelected = selectedItems.includes(item._id);

            return (
              <div
                key={item._id}
                className={`card p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isLockedByMe ? 'ring-2 ring-primary-500/30 bg-primary-50/10' : ''
                }`}
              >
                {/* Checkbox & Details */}
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => toggleSelectItem(item._id)}
                    className="mt-0.5 text-gray-400 hover:text-primary-600"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-primary-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${priorityCfg.bg}`}>
                        {priorityCfg.label}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          sla.isBreached
                            ? 'bg-red-100 text-red-700 font-bold'
                            : sla.isUrgent
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        ⏱ {sla.text}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                    <p className="text-xs text-gray-600 line-clamp-2">{item.reason}</p>

                    {/* Lock and Assignment Meta */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 pt-1">
                      {item.assignedAdmin ? (
                        <span className="flex items-center gap-1 font-medium text-gray-700">
                          <UserCheck className="w-3.5 h-3.5 text-primary-600" />
                          Assigned: {item.assignedAdmin.fullName}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">Unassigned</span>
                      )}

                      {isLockedByOther && (
                        <span className="flex items-center gap-1 text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3" />
                          Locked by {item.lock.lockedBy.fullName}
                        </span>
                      )}

                      {isLockedByMe && (
                        <span className="flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                          <Unlock className="w-3 h-3" />
                          Locked by you (Review in progress)
                        </span>
                      )}

                      <button
                        onClick={() => setActiveNoteDrawer(item)}
                        className="text-primary-600 hover:text-primary-800 font-semibold flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        {item.internalNotes?.length || 0} Notes
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary & Secondary Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
                  <div className="flex items-center gap-2">
                    {item.entityType === 'verification' && (
                      <Link
                        to="/admin/verifications"
                        className="btn-primary py-1.5 px-3 text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        Review Docs <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    {item.entityType === 'safety_flag' && (
                      <Link
                        to="/admin/safety"
                        className="btn-primary py-1.5 px-3 text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        Inspect Flag <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    {item.entityType === 'dispute' && (
                      <Link
                        to="/admin/disputes"
                        className="btn-primary py-1.5 px-3 text-xs font-semibold flex items-center gap-1 shadow-xs"
                      >
                        Mediate Case <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>

                  {/* Lock / Takeover controls */}
                  <div className="flex items-center gap-1.5">
                    {!isLockedByMe && !isLockedByOther && (
                      <button
                        onClick={() => lockMutation.mutate(item._id)}
                        className="text-xs text-gray-500 hover:text-primary-600 font-medium px-2 py-1"
                      >
                        Lock for Review
                      </button>
                    )}
                    {isLockedByMe && (
                      <button
                        onClick={() => releaseLockMutation.mutate(item._id)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1"
                      >
                        Release Lock
                      </button>
                    )}
                    {isLockedByOther && (
                      <button
                        onClick={() => setTakeoverModal(item)}
                        className="text-xs text-red-600 hover:text-red-800 font-semibold px-2 py-1"
                      >
                        Take Over Lock
                      </button>
                    )}
                    <button
                      onClick={() => setSnoozeModal(item)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                    >
                      Snooze
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            title="Review Queue is Clear"
            description="No pending items in this queue category. Great job!"
            icon={CheckCircle2}
          />
        )}
      </div>

      {/* Internal Notes Drawer */}
      {activeNoteDrawer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900">Internal Review Notes</h3>
                <p className="text-[11px] text-gray-500">{activeNoteDrawer.title}</p>
              </div>
              <button
                onClick={() => setActiveNoteDrawer(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 divide-y divide-gray-100">
              {(activeNoteDrawer.internalNotes || []).length > 0 ? (
                activeNoteDrawer.internalNotes.map((n, i) => (
                  <div key={i} className="pt-2 text-xs space-y-0.5">
                    <div className="flex items-center justify-between text-gray-500 text-[10px]">
                      <span className="font-semibold text-gray-800">
                        {n.admin?.fullName || 'Administrator'}
                      </span>
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-700 bg-gray-50 p-2.5 rounded-lg">{n.note}</p>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-gray-400">
                  No internal notes recorded for this item yet.
                </div>
              )}
            </div>

            <div className="space-y-2 pt-3 border-t border-gray-100">
              <textarea
                rows={3}
                placeholder="Write an internal note or observation..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="input text-xs w-full resize-none"
              />
              <button
                onClick={() =>
                  noteMutation.mutate({ id: activeNoteDrawer._id, note: newNote })
                }
                disabled={!newNote.trim() || noteMutation.isPending}
                className="btn-primary w-full py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" /> Post Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Takeover Modal */}
      {takeoverModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">Authorized Lock Takeover</h3>
            <p className="text-xs text-gray-600">
              This item is currently locked by{' '}
              <strong>{takeoverModal.lock?.lockedBy?.fullName || 'another admin'}</strong>.
              Taking over will notify the acting administrator and log an audit event.
            </p>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Reason for Takeover <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={takeoverReason}
                onChange={(e) => setTakeoverReason(e.target.value)}
                placeholder="Urgent SLA breach / shift handover / escalation..."
                className="input text-xs w-full"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setTakeoverModal(null)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  takeoverMutation.mutate({
                    id: takeoverModal._id,
                    reason: takeoverReason,
                  })
                }
                disabled={!takeoverReason.trim() || takeoverMutation.isPending}
                className="btn-primary text-xs bg-red-600 hover:bg-red-700 text-white"
              >
                Confirm Takeover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snooze Modal */}
      {snoozeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">Snooze Review Item</h3>
            <p className="text-xs text-gray-600">
              Temporarily hide this item from the active queue while waiting for third-party responses.
            </p>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Snooze Duration (Days)
              </label>
              <select
                value={snoozeDays}
                onChange={(e) => setSnoozeDays(Number(e.target.value))}
                className="input text-xs w-full"
              >
                <option value={1}>1 Day</option>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setSnoozeModal(null)} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                onClick={() => {
                  const snoozedUntil = new Date(
                    Date.now() + snoozeDays * 24 * 60 * 60 * 1000
                  );
                  updateStateMutation.mutate({
                    id: snoozeModal._id,
                    reviewState: 'snoozed',
                    snoozedUntil,
                    expectedVersion: snoozeModal.version,
                  });
                }}
                className="btn-primary text-xs"
              >
                Apply Snooze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
