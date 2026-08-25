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
} from 'lucide-react';
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
              ? 'Complete lifecycle management: diagnostics, cost revisions, parts logs, and QA signoffs'
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

                {/* 10-Stage Mini Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                    <span>
                      Stage {currentStageIdx + 1} of 10: <strong>{config.label}</strong>
                    </span>
                    <span className="text-gray-400">
                      {Math.round(((currentStageIdx + 1) / 10) * 100)}% Complete
                    </span>
                  </div>
                  <div className="grid grid-cols-10 gap-1">
                    {ACTIVE_JOB_STAGES.map((st, i) => (
                      <div
                        key={st.id}
                        title={st.label}
                        className={`h-1.5 rounded-full transition-all ${
                          i <= currentStageIdx ? 'bg-primary-600' : 'bg-gray-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-gray-500 italic line-clamp-1">
                    {config.description}
                  </p>

                  <div className="flex items-center gap-2 shrink-0">
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

                    {actionConfig?.primary && (
                      <button
                        type="button"
                        onClick={() => handleActionClick(job, actionConfig.primary.action)}
                        className="btn-primary py-1.5 px-4 text-xs font-semibold shadow-sm shadow-primary-500/20 active:scale-95"
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

      {/* Modals */}
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

