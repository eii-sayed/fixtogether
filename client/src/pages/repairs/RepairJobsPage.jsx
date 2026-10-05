import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { PageLoader, ErrorState, EmptyState, StatusBadge, Pagination } from '../../components/ui';
import {
  Wrench,
  ArrowRight,
  Calendar,
  Star,
  Search,
  AlertCircle,
  Package,
  CheckSquare,
  PackageCheck,
  Clock,
  Sparkles,
  DollarSign,
  Layers,
  MessageSquare,
  ShieldCheck,
  Zap,
  CheckCircle,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import WriteReviewModal from '../../components/reviews/WriteReviewModal';
import InspectionReportModal from '../../components/jobs/InspectionReportModal';
import CostApprovalModal from '../../components/jobs/CostApprovalModal';
import PartsTrackerModal from '../../components/jobs/PartsTrackerModal';
import QualityCheckModal from '../../components/jobs/QualityCheckModal';
import { ACTIVE_JOB_STAGES, JOB_STATUS_CONFIG } from '../../utils/technicianStatusConfig';

export default function RepairJobsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  // Active modal targets
  const [inspectionJob, setInspectionJob] = useState(null);
  const [costApprovalJob, setCostApprovalJob] = useState(null);
  const [partsJob, setPartsJob] = useState(null);
  const [qualityCheckJob, setQualityCheckJob] = useState(null);
  const [reviewJob, setReviewJob] = useState(null);

  // Quick action states
  const [quickSolveJob, setQuickSolveJob] = useState(null);
  const [quickSolveForm, setQuickSolveForm] = useState({ notes: '', finalCost: '' });

  const isTechnician = user?.role === 'technician';
  const isOwner = user?.role === 'owner';

  const { data, isLoading, error } = useQuery({
    queryKey: ['repair-jobs', { page, status, role: user?.role }],
    queryFn: () =>
      api
        .get(`/repair-jobs?page=${page}&limit=12${status ? `&status=${status}` : ''}`)
        .then((r) => r.data.data),
    staleTime: 30000,
  });

  const quickStartMutation = useMutation({
    mutationFn: (jobId) => api.post(`/repair-jobs/${jobId}/quick-start`),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-jobs']);
      toast.success('Started repair work!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to start repair'),
  });

  const quickSolveMutation = useMutation({
    mutationFn: ({ jobId, payload }) => api.post(`/repair-jobs/${jobId}/quick-solve`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['repair-jobs']);
      setQuickSolveJob(null);
      toast.success('Problem marked solved! Customer notified for collection.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to complete repair'),
  });

  const ownerConfirmMutation = useMutation({
    mutationFn: ({ jobId, receivedConfirmed = true, satisfactionLevel = 'satisfied', notes = 'Item received in working condition.' }) =>
      api.post(`/repair-jobs/${jobId}/confirm-completion`, { receivedConfirmed, satisfactionLevel, notes }),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries(['repair-jobs']);
      toast.success('Repair confirmed completed and warranty activated!');
      const job = data?.jobs?.find((j) => j._id === variables.jobId);
      if (job) {
        setReviewJob(job);
      }
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to confirm completion'),
  });

  const statuses = [
    { value: '', label: 'All Jobs' },
    { value: 'pending_inspection', label: 'Pending Inspection' },
    { value: 'inspecting', label: 'Under Inspection' },
    { value: 'awaiting_approval', label: 'Approval Required' },
    { value: 'waiting_for_parts', label: 'Waiting for Parts' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'quality_check', label: 'Quality Check' },
    { value: 'ready_for_collection', label: 'Ready for Pickup' },
    { value: 'completed', label: 'Completed' },
  ];

  const handleActionClick = (job, actionType) => {
    switch (actionType) {
      case 'open_inspection':
        setInspectionJob(job);
        break;
      case 'open_cost_approval':
      case 'view_cost_approval':
      case 'review_cost_approval':
        setCostApprovalJob(job);
        break;
      case 'open_parts_tracker':
      case 'view_parts':
        setPartsJob(job);
        break;
      case 'open_quality_check':
        setQualityCheckJob(job);
        break;
      case 'write_review':
        setReviewJob(job);
        break;
      default:
        break;
    }
  };

  const getSimplifiedStage = (currentStatus) => {
    if (['ready_for_collection', 'collected', 'completed'].includes(currentStatus)) {
      return { step: 3, label: 'Solved & Ready', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    }
    if (['in_progress', 'waiting_for_parts', 'quality_check'].includes(currentStatus)) {
      return { step: 2, label: 'Repairing & Testing', color: 'text-blue-600 bg-blue-50 border-blue-200' };
    }
    return { step: 1, label: 'Intake & Diagnostics', color: 'text-amber-600 bg-amber-50 border-amber-200' };
  };

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;

  return (
    <div className="page-container max-w-6xl px-3 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {isTechnician ? 'Active Repair Benches & Jobs' : 'My Repair Jobs'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {isTechnician
              ? 'Fast workflows: start repairs, track progress, and mark problems solved'
              : 'Track workshop progress, approve revisions, and verify handover completion'}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => {
              setStatus(s.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              status === s.value
                ? 'bg-primary-600 text-white shadow-sm shadow-primary-500/20'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {data?.repairJobs?.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No repair jobs found"
          description="Repair jobs appear here once a quotation has been accepted."
        />
      ) : (
        <div className="space-y-4">
          {data?.repairJobs?.map((job) => {
            const config = JOB_STATUS_CONFIG[job.currentStatus] || JOB_STATUS_CONFIG.pending_inspection;
            const actionConfig = isTechnician ? config.technicianAction : config.ownerAction;
            const currentStageIdx = config.stageIndex || 0;
            const simplified = getSimplifiedStage(job.currentStatus);
            const isFinished = ['ready_for_collection', 'collected', 'completed', 'cancelled'].includes(job.currentStatus);

            return (
              <div
                key={job._id}
                className="card p-4 sm:p-5 hover:shadow-md transition-all border border-gray-100 space-y-4"
              >
                {/* Top Row: Title, Role Badge, Financial Total */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-sm shrink-0">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/repair-requests/${job.repairRequest?._id}`}
                          className="font-bold text-sm sm:text-base text-gray-900 hover:text-primary-600 transition-colors"
                        >
                          {job.repairRequest?.item?.title || `Job #${job._id.slice(-6)}`}
                        </Link>
                        <span className="badge-gray text-[10px]">#{job._id.slice(-6)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {isTechnician
                          ? `Customer: ${job.owner?.fullName || 'Owner'}`
                          : `Technician: ${job.technician?.fullName || 'Assigned Technician'}`}{' '}
                        • Service: {job.repairRequest?.preferredServiceMethod || 'Standard'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="text-right">
                      <span className="text-[11px] text-gray-400 font-medium">Final Quote / Total</span>
                      <div className="text-sm sm:text-base font-extrabold text-gray-900">
                        ৳{(job.finalTotalCost || job.acceptedQuotation?.estimatedTotalMaximum || 0).toLocaleString()}
                      </div>
                    </div>
                    <StatusBadge status={job.currentStatus} />
                  </div>
                </div>

                {/* Simplified 3-Phase Progress Bar */}
                <div className="space-y-1.5 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${simplified.color}`}>
                        Step {simplified.step} of 3: {simplified.label}
                      </span>
                      <span className="text-gray-500 font-medium text-[11px]">
                        ({config.label})
                      </span>
                    </div>
                    <span className="text-gray-400 text-[11px] font-semibold">
                      {Math.round(((currentStageIdx + 1) / 10) * 100)}%
                    </span>
                  </div>

                  {/* 3 Step Visual Blocks */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        simplified.step >= 1 ? 'bg-primary-500' : 'bg-gray-200'
                      }`}
                      title="Step 1: Diagnostics & Intake"
                    />
                    <div
                      className={`h-2 rounded-full transition-all ${
                        simplified.step >= 2 ? 'bg-primary-500' : 'bg-gray-200'
                      }`}
                      title="Step 2: Repair & Testing"
                    />
                    <div
                      className={`h-2 rounded-full transition-all ${
                        simplified.step >= 3 ? 'bg-emerald-500' : 'bg-gray-200'
                      }`}
                      title="Step 3: Solved & Ready"
                    />
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <p className="text-xs text-gray-500 italic line-clamp-1">
                    {config.description}
                  </p>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Link
                      to={`/chat?repairId=${job.repairRequest?._id}`}
                      className="btn-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                      <span>Chat</span>
                    </Link>

                    {isTechnician && (
                      <button
                        type="button"
                        onClick={() => setPartsJob(job)}
                        className="btn-secondary py-1.5 px-3 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Package className="w-3.5 h-3.5 text-gray-500" />
                        <span>Parts ({job.requiredParts?.length || 0})</span>
                      </button>
                    )}

                    {/* Fast 1-Click Technician Buttons */}
                    {isTechnician && !isFinished && (
                      <>
                        {['pending_inspection', 'inspecting'].includes(job.currentStatus) && (
                          <button
                            type="button"
                            onClick={() => quickStartMutation.mutate(job._id)}
                            disabled={quickStartMutation.isPending}
                            className="btn-secondary py-1.5 px-3 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border-primary-200 flex items-center gap-1.5 active:scale-95"
                          >
                            {quickStartMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Zap className="w-3.5 h-3.5 text-primary-600" />
                            )}
                            <span>Start Repair</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setQuickSolveForm({
                              notes: 'Repaired and verified fully functional.',
                              finalCost: job.finalTotalCost || job.acceptedQuotation?.estimatedTotalMaximum || '',
                            });
                            setQuickSolveJob(job);
                          }}
                          className="btn-primary py-1.5 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 border-emerald-600 shadow-sm shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95 text-white"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                          <span>⚡ Mark Solved</span>
                        </button>
                      </>
                    )}

                    {/* Fast 1-Click Owner Confirm Received Button */}
                    {isOwner && job.currentStatus === 'ready_for_collection' && (
                      <button
                        type="button"
                        disabled={ownerConfirmMutation.isPending}
                        onClick={() => ownerConfirmMutation.mutate({ jobId: job._id })}
                        className="btn-primary py-1.5 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 border-emerald-600 shadow-sm text-white flex items-center gap-1.5 active:scale-95"
                        title="Confirm you have received your fixed item and activate warranty"
                      >
                        {ownerConfirmMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        <span>✅ Confirm Received</span>
                      </button>
                    )}

                    {/* Detailed Secondary Form Action for Advanced Workflows */}
                    {actionConfig?.primary && !isFinished && (
                      <button
                        type="button"
                        onClick={() => handleActionClick(job, actionConfig.primary.action)}
                        className="btn-outline py-1.5 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        {actionConfig.primary.label}
                      </button>
                    )}

                    {isOwner && job.currentStatus === 'completed' && job.ownerAcceptedCompletion && (
                      <button
                        type="button"
                        onClick={() => setReviewJob(job)}
                        className="btn-primary py-1.5 px-3 text-xs font-semibold flex items-center gap-1"
                      >
                        <Star className="w-3.5 h-3.5" /> Write Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: QUICK SOLVE & COMPLETE (1-STEP) */}
      {/* ========================================================================= */}
      {quickSolveJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
                <Zap className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                <span>Mark Problem Solved & Complete</span>
              </div>
              <button
                onClick={() => setQuickSolveJob(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-primary-50 rounded-xl border border-emerald-200 text-xs space-y-1">
              <div className="font-bold text-gray-900 text-sm">
                {quickSolveJob.repairRequest?.item?.title || `Job #${quickSolveJob._id.slice(-6)}`}
              </div>
              <div className="text-gray-600">
                Customer: <span className="font-semibold text-gray-800">{quickSolveJob.owner?.fullName || 'Customer'}</span>
              </div>
              <div className="text-emerald-800 font-medium">
                Accepted Quote: ৳{(quickSolveJob.acceptedQuotation?.estimatedTotalMaximum || 0).toLocaleString()}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="label font-semibold text-gray-700">Final Bill / Total Cost (৳)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={quickSolveForm.finalCost}
                    onChange={(e) => setQuickSolveForm((p) => ({ ...p, finalCost: e.target.value }))}
                    className="input pl-7 text-sm font-bold text-gray-900"
                    placeholder="e.g. 1200"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Will update the final bill for the customer.</p>
              </div>

              <div>
                <label className="label font-semibold text-gray-700">Problem Resolution & Repair Notes</label>
                <textarea
                  rows="3"
                  value={quickSolveForm.notes}
                  onChange={(e) => setQuickSolveForm((p) => ({ ...p, notes: e.target.value }))}
                  className="input text-xs"
                  placeholder="e.g. Cleaned motherboard contacts, replaced blown capacitor, fully tested device working properly."
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-[11px] text-emerald-800 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                This will immediately mark the problem as resolved and notify the customer that their item is ready for pickup/delivery.
              </span>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setQuickSolveJob(null)}
                className="btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  quickSolveMutation.mutate({
                    jobId: quickSolveJob._id,
                    payload: {
                      notes: quickSolveForm.notes,
                      finalCost: quickSolveForm.finalCost ? Number(quickSolveForm.finalCost) : undefined,
                    },
                  })
                }
                disabled={quickSolveMutation.isPending}
                className="btn-primary btn-sm flex items-center gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 border-emerald-600 shadow-sm text-white"
              >
                {quickSolveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving & Notifying...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Mark Solved & Ready
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Modals */}
      {inspectionJob && (
        <InspectionReportModal
          open={!!inspectionJob}
          onClose={() => setInspectionJob(null)}
          repairJob={inspectionJob}
        />
      )}

      {costApprovalJob && (
        <CostApprovalModal
          open={!!costApprovalJob}
          onClose={() => setCostApprovalJob(null)}
          repairJob={costApprovalJob}
        />
      )}

      {partsJob && (
        <PartsTrackerModal
          open={!!partsJob}
          onClose={() => setPartsJob(null)}
          repairJob={partsJob}
        />
      )}

      {qualityCheckJob && (
        <QualityCheckModal
          open={!!qualityCheckJob}
          onClose={() => setQualityCheckJob(null)}
          repairJob={qualityCheckJob}
        />
      )}

      {reviewJob && (
        <WriteReviewModal
          open={!!reviewJob}
          onClose={() => setReviewJob(null)}
          repairJobId={reviewJob._id}
          technicianName={reviewJob.technician?.fullName}
        />
      )}
    </div>
  );
}
