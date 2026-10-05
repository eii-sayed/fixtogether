import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { ErrorState, EmptyState, StatusBadge, Pagination, CardSkeleton } from '../../components/ui';
import { toast } from 'sonner';
import {
  ClipboardList,
  Plus,
  Search,
  Calendar,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Clock,
  DollarSign,
  Layers,
  Wrench,
  CheckCircle2,
  Zap,
  X,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { getStatusConfig } from '../../utils/repairStatusConfig';

const OWNER_TABS = [
  { value: 'action_required', label: 'Action Required', icon: Sparkles },
  { value: 'active', label: 'Active Repairs', icon: Clock },
  { value: 'drafts', label: 'Drafts', icon: Layers },
  { value: 'completed', label: 'Completed', icon: CheckCircle2 },
  { value: 'cancelled', label: 'Cancelled', icon: AlertTriangle },
];

const TECHNICIAN_TABS = [
  { value: 'recommended', label: 'Recommended', icon: Sparkles },
  { value: 'nearby', label: 'Nearby', icon: Search },
  { value: 'available', label: 'All Available', icon: Wrench },
  { value: 'invited', label: 'Direct Invitations', icon: Sparkles },
  { value: 'quoted', label: 'My Quotes', icon: DollarSign },
  { value: 'in_progress', label: 'In Progress', icon: Layers },
  { value: 'completed', label: 'Completed', icon: CheckCircle2 },
];

const ADMIN_TABS = [
  { value: 'all', label: 'All Requests', icon: Layers },
  { value: 'recently_published', label: 'Recently Published', icon: Sparkles },
  { value: 'flagged', label: 'Safety Flagged', icon: AlertTriangle },
  { value: 'unassigned', label: 'Unassigned', icon: Clock },
  { value: 'in_progress', label: 'In Progress', icon: Wrench },
  { value: 'disputed', label: 'Disputed', icon: AlertTriangle },
  { value: 'completed', label: 'Completed', icon: CheckCircle2 },
];

export default function RepairRequestsPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const userRole = user?.role || 'owner';
  const defaultTab =
    searchParams.get('tab') ||
    (userRole === 'owner' ? 'action_required' : userRole === 'technician' ? 'available' : 'all');

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // 1-Click Accept Job modal state for technicians
  const [selectedReqForAccept, setSelectedReqForAccept] = useState(null);
  const [acceptForm, setAcceptForm] = useState({ estimatedCost: '', estimatedDays: '3', notes: '' });

  const acceptJobMutation = useMutation({
    mutationFn: ({ requestId, payload }) => api.post(`/repair-requests/${requestId}/accept-job`, payload),
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ['repair-requests'] });
      setSelectedReqForAccept(null);
      toast.success(resp.data?.message || '🎉 Repair job accepted! You are assigned.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to accept repair job'),
  });

  // 300ms debounce on search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  const tabs =
    userRole === 'owner'
      ? OWNER_TABS
      : userRole === 'technician'
      ? TECHNICIAN_TABS
      : ADMIN_TABS;

  const queryKey = ['repair-requests', { role: userRole, tab: activeTab, search: debouncedSearch, page }];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 12, tab: activeTab });
      if (debouncedSearch) params.set('search', debouncedSearch);
      return api.get(`/repair-requests?${params}`).then((r) => r.data.data);
    },
    staleTime: 30000,
  });

  // Socket.IO real-time refresh
  useEffect(() => {
    if (!socket) return;
    const handlePublished = () => {
      queryClient.invalidateQueries({ queryKey: ['repair-requests'] });
    };
    socket.on('repair-request:published', handlePublished);
    return () => socket.off('repair-request:published', handlePublished);
  }, [socket, queryClient]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setPage(1);
    setSearchParams({ tab: newTab });
  };

  return (
    <div className="page-container max-w-6xl px-3 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {userRole === 'owner'
              ? 'Repair Requests Journey'
              : userRole === 'technician'
              ? 'Technician Repair Opportunities'
              : 'Admin Repair Moderation'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {userRole === 'owner'
              ? 'Track, publish, and manage all your item repairs in one place'
              : userRole === 'technician'
              ? 'Discover available repair jobs, respond to invitations, and submit quotes'
              : 'Monitor platform repair requests, safety flags, and disputes'}
          </p>
        </div>

        {userRole === 'owner' && (
          <Link
            to="/repair-requests/new"
            className="btn-primary shrink-0 flex items-center gap-2 shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" /> Request a Repair
          </Link>
        )}
      </div>

      {/* Role Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-4 -mx-1 px-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => handleTabChange(t.value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 active:scale-95 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Input Bar */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="input pl-10 w-full text-xs sm:text-sm"
          placeholder="Search by title, category, description..."
        />
      </div>

      {/* Requests List Grid */}
      {isLoading ? (
        <CardSkeleton count={4} />
      ) : error ? (
        <ErrorState
          error={
            error?.code === 'RATE_LIMIT_EXCEEDED'
              ? { message: `Rate limit reached. Please wait ${error.retryAfter || 5}s.` }
              : error
          }
        />
      ) : data?.repairRequests?.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={`No ${activeTab.replace('_', ' ')} requests found`}
          description={
            userRole === 'owner'
              ? 'You have no repair requests in this category. Start a new repair request anytime!'
              : 'There are no repair requests matching this filter right now.'
          }
          action={
            userRole === 'owner' && (
              <Link to="/repair-requests/new" className="btn-primary text-xs">
                <Plus className="w-4 h-4" /> Request a Repair
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {data?.repairRequests?.map((rr) => {
            const statusCfg = getStatusConfig(rr.requestStatus);
            return (
              <Link
                key={rr._id}
                to={`/repair-requests/${rr._id}`}
                className="card p-4 sm:p-5 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group border border-gray-100 hover:border-primary-200"
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-200 flex items-center justify-center">
                    {rr.item?.images?.length > 0 ? (
                      <img
                        src={rr.item.images[0].url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <ClipboardList className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm sm:text-base text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                        {rr.item?.title || 'Repair Request'}
                      </h3>
                      <StatusBadge status={rr.requestStatus} />
                      {userRole === 'technician' && rr.matchScore !== undefined && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700">
                          {rr.matchScore}% Match
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {rr.problemDescription}
                    </p>

                    {userRole === 'technician' && rr.matchExplanation && (
                      <p className="text-[11px] text-purple-700 font-medium">
                        💡 {rr.matchExplanation}
                      </p>
                    )}

                    <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(rr.createdAt).toLocaleDateString()}
                      </span>
                      {rr.item?.category?.name && (
                        <span className="badge-blue text-[10px]">{rr.item.category.name}</span>
                      )}
                      {rr.budgetMaximum && (
                        <span className="font-semibold text-gray-700">
                          Budget: ৳{rr.budgetMinimum || 0} – ৳{rr.budgetMaximum}
                        </span>
                      )}
                      {rr.safetyFlags?.length > 0 && (
                        <span className="badge-red text-[10px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Safety Warnings
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Action Hint & Arrow */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  {userRole === 'technician' && ['published', 'matching_technicians', 'awaiting_quotations', 'quotations_received'].includes(rr.requestStatus) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedReqForAccept(rr);
                        setAcceptForm({
                          estimatedCost: rr.budgetMaximum || rr.budgetMinimum || '',
                          estimatedDays: '3',
                          notes: '',
                        });
                      }}
                      className="btn-primary btn-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 font-bold shadow-xs active:scale-95 text-[11px] py-1.5 px-3"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                      <span>⚡ Accept Job</span>
                    </button>
                  )}
                  <span className="text-xs font-semibold text-primary-700 sm:hidden">
                    {statusCfg.requiredAction.owner}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-primary-50 text-gray-400 group-hover:text-primary-600 flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}

          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </div>
      )}

      {/* 1-Click Accept Job Modal for Technicians on List Page */}
      {selectedReqForAccept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
                <Zap className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                <span>Accept Repair Job</span>
              </div>
              <button onClick={() => setSelectedReqForAccept(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-primary-50 rounded-xl border border-emerald-200 text-xs space-y-1.5">
              <div className="font-bold text-gray-900 text-sm">{selectedReqForAccept.item?.title || 'Repair Request'}</div>
              <div className="text-gray-600 line-clamp-2">{selectedReqForAccept.problemDescription}</div>
              {selectedReqForAccept.budgetMaximum && (
                <div className="text-emerald-800 font-semibold pt-1">
                  Owner's Budget: ৳{selectedReqForAccept.budgetMinimum || 0} – ৳{selectedReqForAccept.budgetMaximum}
                </div>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="label font-semibold text-gray-700">Your Service Charge (৳) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={acceptForm.estimatedCost}
                    onChange={(e) => setAcceptForm((p) => ({ ...p, estimatedCost: e.target.value }))}
                    className="input pl-7 text-sm font-bold text-gray-900"
                    placeholder={selectedReqForAccept.budgetMaximum ? String(selectedReqForAccept.budgetMaximum) : '1200'}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Estimated total labor/repair charge.</p>
              </div>

              <div>
                <label className="label font-semibold text-gray-700">Estimated Turnaround (Days) *</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={acceptForm.estimatedDays}
                  onChange={(e) => setAcceptForm((p) => ({ ...p, estimatedDays: e.target.value }))}
                  className="input text-sm font-semibold text-gray-900"
                  placeholder="3"
                />
              </div>

              <div>
                <label className="label font-semibold text-gray-700">Note to Owner (Optional)</label>
                <input
                  type="text"
                  value={acceptForm.notes}
                  onChange={(e) => setAcceptForm((p) => ({ ...p, notes: e.target.value }))}
                  className="input text-xs"
                  placeholder="e.g. Can start today, standard diagnostics included..."
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-800 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                You will be immediately assigned to this repair. Competing quotes are closed and you can contact the owner.
              </span>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedReqForAccept(null)}
                className="btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  acceptJobMutation.mutate({
                    requestId: selectedReqForAccept._id,
                    payload: {
                      estimatedCost: acceptForm.estimatedCost ? Number(acceptForm.estimatedCost) : undefined,
                      estimatedDays: Number(acceptForm.estimatedDays) || 3,
                      notes: acceptForm.notes || undefined,
                    },
                  })
                }
                disabled={acceptJobMutation.isPending}
                className="btn-primary btn-sm flex items-center gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 border-emerald-600 shadow-sm"
              >
                {acceptJobMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Accepting Job...</>
                ) : (
                  <><Zap className="w-4 h-4 text-amber-300 fill-amber-300" /> Confirm & Start Job</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

